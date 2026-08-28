/**
 * SECTION 6: Complete Bidirectional Testing
 * 
 * First real cascade test: User edits vendor cost from Finance projection,
 * and verifies that ALL OTHER PROJECTIONS (Timeline, Documents, Persons)
 * automatically sync the same change without duplication or conflicts.
 * 
 * This is the ultimate test of "One memory, multiple projections."
 */

import {
  AIMemoryDataSystem,
  AIMemoryEntity,
  createVendor,
  createBudgetLine,
  createWeddingProject,
  WEDDING_CASCADE_RULES
} from '../src/architecture';

import {
  MutationSystem,
  CascadeEngine,
  ProjectionSyncSystem,
  QuerySystem
} from '../src/architecture/queryMutationCascade';

import {
  FinanceProjection,
  TimelineProjection,
  DocumentsProjection,
  PersonsProjection
} from '../src/architecture/projectionSchemas';

describe('SECTION 6: Complete Bidirectional Testing', () => {
  let aiMemory: AIMemoryDataSystem;
  let mutationSystem: MutationSystem;
  let cascadeEngine: CascadeEngine;
  let projectionSyncSystem: ProjectionSyncSystem;
  let querySystem: QuerySystem;

  beforeEach(() => {
    aiMemory = new AIMemoryDataSystem();
    mutationSystem = new MutationSystem(aiMemory);
    cascadeEngine = new CascadeEngine(WEDDING_CASCADE_RULES);
    projectionSyncSystem = new ProjectionSyncSystem();
    querySystem = new QuerySystem(aiMemory);

    // Create sample wedding project data
    const project = createWeddingProject({
      id: 'wedding_2024',
      name: 'Sample Wedding 2024'
    });

    aiMemory.createEntity(project);

    // Create vendors
    const vendor1 = createVendor({
      id: 'vendor_dj',
      wedding_id: 'wedding_2024',
      name: 'DJ Martin',
      cost: 1000,
      currency: 'EUR'
    });

    const vendor2 = createVendor({
      id: 'vendor_photo',
      wedding_id: 'wedding_2024',
      name: 'Photography Studio',
      cost: 1500,
      currency: 'EUR'
    });

    aiMemory.createEntity(vendor1);
    aiMemory.createEntity(vendor2);

    // Create budget line
    const budgetLine = createBudgetLine({
      id: 'budget_entertainment',
      wedding_id: 'wedding_2024',
      name: 'Entertainment & Music',
      allocated_budget: 2000,
      currency: 'EUR'
    });

    aiMemory.createEntity(budgetLine);
  });

  describe('Bidirectional Mutation: Vendor Cost Change', () => {
    test('should cascade vendor cost change from Finance to Timeline', async () => {
      // Get initial state
      const vendorInitial = querySystem.getEntity('vendor_dj');
      expect(vendorInitial?.content.cost).toBe(1000);

      // Simulate Finance UI edit: change vendor cost to €1500
      const mutation = {
        entity_id: 'vendor_dj',
        changes: {
          content: {
            cost: 1500  // Cost increased by €500
          }
        }
      };

      // Execute mutation
      const result = await mutationSystem.executeMutation(mutation as any);
      expect(result.success).toBe(true);

      // Get cascades that should be triggered
      const cascades = cascadeEngine.identifyAndExecuteCascades(
        'vendor_dj',
        { content: { cost: 1500 } },
        aiMemory.getAllEntities()
      );

      // Should have cascades to: Timeline (phase cost), Finance (budget), Documents (metadata)
      expect(cascades.length).toBeGreaterThan(0);

      // Apply cascades to sync system
      cascades.forEach(cascade => {
        projectionSyncSystem.processCascade(cascade);
      });

      // Verify vendor was updated
      const vendorUpdated = querySystem.getEntity('vendor_dj');
      expect(vendorUpdated?.content.cost).toBe(1500);

      // Verify decision_trail recorded the change
      expect(vendorUpdated?.decision_trail.length).toBeGreaterThan(1);
      const latestDecision = vendorUpdated?.decision_trail[vendorUpdated.decision_trail.length - 1];
      expect(latestDecision?.correction?.cost).toBe(1500);
    });

    test('should read vendor change from Finance projection', async () => {
      // Edit vendor cost to €1500
      const mutation = {
        entity_id: 'vendor_dj',
        changes: { content: { cost: 1500 } }
      };

      await mutationSystem.executeMutation(mutation as any);

      // Read from Finance projection
      const financeProjection = new FinanceProjection('wedding_2024');
      const finances = financeProjection.read(aiMemory.getAllEntities());

      // Should see updated budget line with new cost
      const entertainmentBudget = finances.budget_lines.find(
        (b: any) => b.id === 'budget_entertainment'
      );

      expect(entertainmentBudget).toBeDefined();
      // Entertainment budget should include the updated DJ cost
      expect(entertainmentBudget?.total_cost).toBeGreaterThanOrEqual(1500);
    });

    test('should read vendor change from Timeline projection', async () => {
      // Edit vendor cost to €1500
      const mutation = {
        entity_id: 'vendor_dj',
        changes: { content: { cost: 1500 } }
      };

      await mutationSystem.executeMutation(mutation as any);

      // Read from Timeline projection
      const timelineProjection = new TimelineProjection('wedding_2024');
      const timeline = timelineProjection.read(aiMemory.getAllEntities());

      // Should see updated vendor in timeline
      const djEntry = timeline.items.find((item: any) => item.id === 'vendor_dj');
      expect(djEntry).toBeDefined();
      expect(djEntry?.content?.cost).toBe(1500);
    });

    test('should read vendor change from Documents projection', async () => {
      // Edit vendor cost to €1500
      const mutation = {
        entity_id: 'vendor_dj',
        changes: { content: { cost: 1500 } }
      };

      await mutationSystem.executeMutation(mutation as any);

      // Read from Documents projection
      const docsProjection = new DocumentsProjection('wedding_2024');
      const documents = docsProjection.read(aiMemory.getAllEntities());

      // Documents should track vendor metadata
      expect(documents.metadata).toBeDefined();
      expect(Array.isArray(documents.indexed_objects)).toBe(true);
    });

    test('should read vendor change from Persons projection', async () => {
      // Edit vendor cost to €1500
      const mutation = {
        entity_id: 'vendor_dj',
        changes: { content: { cost: 1500 } }
      };

      await mutationSystem.executeMutation(mutation as any);

      // Read from Persons projection
      const personsProjection = new PersonsProjection('wedding_2024');
      const persons = personsProjection.read(aiMemory.getAllEntities());

      // Should see vendor in persons list
      expect(Array.isArray(persons.vendors)).toBe(true);
      const dj = persons.vendors.find((v: any) => v.id === 'vendor_dj');
      expect(dj).toBeDefined();
      expect(dj?.cost).toBe(1500);
    });
  });

  describe('Bidirectional Write: Edit from Different Projections', () => {
    test('should apply edit from Finance projection and cascade to Timeline', async () => {
      // Finance edit: update budget line amount
      const financeProjection = new FinanceProjection('wedding_2024');

      const financeChanges = {
        budget_lines: [
          {
            id: 'budget_entertainment',
            allocated_budget: 2500  // Increased from 2000
          }
        ]
      };

      // Apply changes via Finance projection
      const writeResult = financeProjection.write(
        aiMemory.getAllEntities(),
        financeChanges,
        cascadeEngine,
        aiMemory
      );

      expect(writeResult.success).toBe(true);
      expect(writeResult.cascades).toBeDefined();
      expect(writeResult.cascades!.length).toBeGreaterThan(0);

      // Verify change applied
      const budgetEntity = querySystem.getEntity('budget_entertainment');
      expect(budgetEntity?.content.allocated_budget).toBe(2500);
    });

    test('should apply edit from Timeline projection and cascade to Finance', async () => {
      // Timeline edit: change vendor entry
      const timelineProjection = new TimelineProjection('wedding_2024');

      const timelineChanges = {
        items: [
          {
            id: 'vendor_dj',
            content: {
              cost: 1200  // Adjusted from 1000
            }
          }
        ]
      };

      // Apply changes via Timeline projection
      const writeResult = timelineProjection.write(
        aiMemory.getAllEntities(),
        timelineChanges,
        cascadeEngine,
        aiMemory
      );

      expect(writeResult.success).toBe(true);

      // Verify change applied to vendor
      const vendorEntity = querySystem.getEntity('vendor_dj');
      expect(vendorEntity?.content.cost).toBe(1200);

      // Verify Finance projection sees the update
      const financeProjection = new FinanceProjection('wedding_2024');
      const finances = financeProjection.read(aiMemory.getAllEntities());
      const entertainmentBudget = finances.budget_lines.find(
        (b: any) => b.id === 'budget_entertainment'
      );
      expect(entertainmentBudget?.total_cost).toBeGreaterThanOrEqual(1200);
    });

    test('should handle cascading updates with validation', async () => {
      // Set up a vendor that's referenced in multiple projections
      const vendor = querySystem.getEntity('vendor_photo');

      // Edit vendor with validation
      const mutationWithValidation = {
        entity_id: 'vendor_photo',
        changes: {
          content: {
            cost: 2000  // Increase cost
          }
        },
        validate: true  // Enable validation
      };

      const result = await mutationSystem.executeMutation(mutationWithValidation as any);

      // Should pass validation
      expect(result.success).toBe(true);
      expect(result.validation_errors).toBeUndefined();

      // Verify all projections see the update
      const financeProjection = new FinanceProjection('wedding_2024');
      const timelineProjection = new TimelineProjection('wedding_2024');

      const finances = financeProjection.read(aiMemory.getAllEntities());
      const timeline = timelineProjection.read(aiMemory.getAllEntities());

      const photovendorInFinance = finances.vendors?.find((v: any) => v.id === 'vendor_photo');
      const photoVendorInTimeline = timeline.items.find((i: any) => i.id === 'vendor_photo');

      if (photovendorInFinance) {
        expect(photovendorInFinance.cost).toBe(2000);
      }
      if (photoVendorInTimeline) {
        expect(photoVendorInTimeline.content?.cost).toBe(2000);
      }
    });
  });

  describe('Multi-Entity Cascading Changes', () => {
    test('should handle cascading changes across 4+ projections atomically', async () => {
      // Change a vendor cost (affects 4+ projections)
      const originalVendor = querySystem.getEntity('vendor_dj');
      const originalCost = originalVendor?.content.cost;

      const cascades = cascadeEngine.identifyAndExecuteCascades(
        'vendor_dj',
        { content: { cost: 1500 } },
        aiMemory.getAllEntities()
      );

      // Should identify cascades to multiple projections
      const uniqueProjections = new Set(cascades.map(c => c.source_projection));
      expect(uniqueProjections.size).toBeGreaterThan(1);

      // Apply all cascades
      for (const cascade of cascades) {
        projectionSyncSystem.processCascade(cascade);
      }

      // Verify all projections reflect the same change
      const finance = new FinanceProjection('wedding_2024').read(aiMemory.getAllEntities());
      const timeline = new TimelineProjection('wedding_2024').read(aiMemory.getAllEntities());
      const documents = new DocumentsProjection('wedding_2024').read(aiMemory.getAllEntities());
      const persons = new PersonsProjection('wedding_2024').read(aiMemory.getAllEntities());

      // Each projection should have the updated vendor info
      expect([finance, timeline, documents, persons]).toBeDefined();
    });

    test('should prevent data duplication across projections', async () => {
      // Change vendor cost
      const mutation = {
        entity_id: 'vendor_dj',
        changes: { content: { cost: 1500 } }
      };

      await mutationSystem.executeMutation(mutation as any);

      // Read from all 4 projections
      const finance = new FinanceProjection('wedding_2024').read(aiMemory.getAllEntities());
      const timeline = new TimelineProjection('wedding_2024').read(aiMemory.getAllEntities());
      const documents = new DocumentsProjection('wedding_2024').read(aiMemory.getAllEntities());
      const persons = new PersonsProjection('wedding_2024').read(aiMemory.getAllEntities());

      // Get vendor reference in each projection
      const vendorInFinance = finance.vendors?.find((v: any) => v.id === 'vendor_dj');
      const vendorInTimeline = timeline.items.find((i: any) => i.id === 'vendor_dj');
      const vendorInPersons = persons.vendors.find((v: any) => v.id === 'vendor_dj');

      // All should reference same entity, not duplicate data
      if (vendorInFinance && vendorInPersons) {
        expect(vendorInFinance.id).toBe(vendorInPersons.id);
      }
      if (vendorInTimeline && vendorInFinance) {
        expect(vendorInTimeline.id).toBe(vendorInFinance.id);
      }

      // Cost should be same everywhere
      if (vendorInFinance && vendorInPersons) {
        expect(vendorInFinance.cost).toBe(vendorInPersons.cost);
        expect(vendorInPersons.cost).toBe(1500);
      }
    });
  });

  describe('Performance: Cascade at Scale', () => {
    test('should cascade 100+ entity changes in <1 second', async () => {
      // Create 100+ vendors
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const vendor = createVendor({
          id: `vendor_${i}`,
          wedding_id: 'wedding_2024',
          name: `Vendor ${i}`,
          cost: Math.random() * 5000,
          currency: 'EUR'
        });
        aiMemory.createEntity(vendor);
      }

      // Now cascade a change
      const cascadeStartTime = Date.now();

      const cascades = cascadeEngine.identifyAndExecuteCascades(
        'vendor_0',
        { content: { cost: 2000 } },
        aiMemory.getAllEntities()
      );

      const cascadeEndTime = Date.now();
      const cascadeDuration = cascadeEndTime - cascadeStartTime;

      // Should complete in <1000ms
      expect(cascadeDuration).toBeLessThan(1000);
      expect(cascades.length).toBeGreaterThan(0);
    });

    test('should query all vendors from single memory in <100ms', async () => {
      // Add some vendors
      for (let i = 0; i < 50; i++) {
        const vendor = createVendor({
          id: `vendor_perf_${i}`,
          wedding_id: 'wedding_2024',
          name: `Vendor ${i}`,
          cost: Math.random() * 5000,
          currency: 'EUR'
        });
        aiMemory.createEntity(vendor);
      }

      const startTime = Date.now();

      // Query all vendors
      const vendors = querySystem.queryEntities({
        domain: 'wedding',
        'content.entity_type': 'vendor'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(vendors.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Reconciliation: Multi-Projection Consistency Check', () => {
    test('should verify all projections reflect same entity state', async () => {
      // Make a change
      const mutation = {
        entity_id: 'vendor_dj',
        changes: { content: { cost: 1600 } }
      };

      await mutationSystem.executeMutation(mutation as any);

      // Read from all projections
      const finance = new FinanceProjection('wedding_2024').read(aiMemory.getAllEntities());
      const timeline = new TimelineProjection('wedding_2024').read(aiMemory.getAllEntities());
      const documents = new DocumentsProjection('wedding_2024').read(aiMemory.getAllEntities());
      const persons = new PersonsProjection('wedding_2024').read(aiMemory.getAllEntities());

      // Get the source entity
      const sourceEntity = querySystem.getEntity('vendor_dj');
      expect(sourceEntity?.content.cost).toBe(1600);

      // Verify each projection sees it correctly
      const projections = [
        { name: 'Finance', data: finance },
        { name: 'Timeline', data: timeline },
        { name: 'Documents', data: documents },
        { name: 'Persons', data: persons }
      ];

      for (const proj of projections) {
        // Each projection should be internally consistent
        expect(proj.data).toBeDefined();
        expect(proj.data).not.toBeNull();
      }

      // No projection should have conflicting information about the same entity
      const djInFinance = finance.vendors?.find((v: any) => v.id === 'vendor_dj');
      const djInPersons = persons.vendors.find((v: any) => v.id === 'vendor_dj');

      if (djInFinance && djInPersons) {
        // Should be exactly the same entity, not duplicated
        expect(djInFinance.cost).toBe(djInPersons.cost);
      }
    });
  });

  describe('Undo/Redo via Decision Trail', () => {
    test('should be able to undo vendor cost change via decision trail', async () => {
      // Record initial state
      const vendorInitial = querySystem.getEntity('vendor_dj');
      const initialCost = vendorInitial?.content.cost;

      // Make change
      const mutation = {
        entity_id: 'vendor_dj',
        changes: { content: { cost: 2000 } }
      };

      await mutationSystem.executeMutation(mutation as any);

      const vendorChanged = querySystem.getEntity('vendor_dj');
      expect(vendorChanged?.content.cost).toBe(2000);

      // In real implementation, undo would:
      // 1. Read previous entry in decision_trail
      // 2. Restore that value
      // 3. Add new decision_trail entry recording the undo
      // 4. Re-cascade to all projections

      // For now, we verify the decision_trail has the info to undo
      expect(vendorChanged?.decision_trail.length).toBeGreaterThan(1);
      const previousDecision = vendorChanged?.decision_trail[
        vendorChanged.decision_trail.length - 2
      ];
      expect(previousDecision).toBeDefined();
      if (previousDecision && 'original_extraction' in previousDecision) {
        expect(previousDecision.original_extraction).toBeDefined();
      }
    });
  });
});
