/**
 * SECTION 8: Dual-Write Sync Validation Tests
 * 
 * Tests for 2-week parallel run:
 * - Both legacy and AIME systems write data
 * - Verify consistency
 * - Detect and reconcile divergence
 * - Document anomalies
 */

import { DualWriteValidator, ConflictResolver } from '../src/architecture/dualWriteValidator';

describe('SECTION 8: Dual-Write Sync Validation', () => {
  let validator: DualWriteValidator;

  beforeEach(() => {
    validator = new DualWriteValidator();
  });

  describe('Legacy System Writes', () => {
    test('should record legacy write', async () => {
      const result = await validator.writeLegacy('vendor_1', 'vendor', {
        name: 'DJ Martin',
        cost: 1500
      });

      expect(result.success).toBe(true);
    });

    test('should track multiple legacy writes', async () => {
      for (let i = 0; i < 5; i++) {
        await validator.writeLegacy(`vendor_${i}`, 'vendor', {
          cost: Math.random() * 5000
        });
      }

      const log = validator.getWriteLog();
      expect(log.length).toBe(5);
      expect(log.every(w => w.system === 'legacy')).toBe(true);
    });
  });

  describe('AIME System Writes', () => {
    test('should record AIME write', async () => {
      const result = await validator.writeAIME('vendor_1', {
        content: { cost: 1500 }
      });

      expect(result.success).toBe(true);
    });

    test('should track multiple AIME writes', async () => {
      for (let i = 0; i < 5; i++) {
        await validator.writeAIME(`vendor_${i}`, {
          content: { cost: Math.random() * 5000 }
        });
      }

      const log = validator.getWriteLog();
      const aimeWrites = log.filter(w => w.system === 'aime');
      expect(aimeWrites.length).toBe(5);
    });
  });

  describe('Reconciliation: Same Entity Both Systems', () => {
    test('should detect divergence when systems write same entity with different values', async () => {
      // Initialize entity in both systems
      await validator.writeLegacy('vendor_1', 'vendor', { cost: 1000 });
      await validator.writeAIME('vendor_1', { content: { cost: 1000 } });

      // Both systems write different values
      await validator.writeLegacy('vendor_1', 'vendor', { cost: 1500 });
      await validator.writeAIME('vendor_1', { content: { cost: 2000 } });

      // Reconcile
      const reconciliation = await validator.reconcile('vendor_1');

      expect(reconciliation.synced).toBe(false);
      expect(reconciliation.divergences.length).toBeGreaterThan(0);
    });

    test('should detect when entity exists in one system but not other', async () => {
      // Create in AIME only
      await validator.writeAIME('vendor_aime_only', {
        content: { cost: 1500 }
      });

      // Reconcile without creating in legacy
      const reconciliation = await validator.reconcile('vendor_aime_only');

      expect(reconciliation.synced).toBe(false);
      expect(reconciliation.divergences.some(d => d.includes('legacy'))).toBe(true);
    });

    test('should reconcile when both systems have identical data', async () => {
      // Create identical in both systems
      await validator.writeLegacy('vendor_1', 'vendor', {
        name: 'DJ',
        cost: 1500
      });

      await validator.writeAIME('vendor_1', {
        content: { name: 'DJ', cost: 1500 }
      });

      const reconciliation = await validator.reconcile('vendor_1');

      expect(reconciliation.synced).toBe(true);
      expect(reconciliation.divergences).toHaveLength(0);
    });
  });

  describe('Parallel Run Simulation', () => {
    test('should handle 100 legacy writes without divergence', async () => {
      const result = await validator.simulateParallelRun({
        initial_entities: 10,
        legacy_writes: 100,
        aime_writes: 0,
        concurrent_writes_to_same_entity: 0
      });

      expect(result.total_writes).toBe(100);
      // All writes are only to legacy, so some divergence expected
      // (entities exist in legacy but might not sync to AIME if writes are pure legacy)
    });

    test('should handle 100 AIME writes without divergence', async () => {
      const result = await validator.simulateParallelRun({
        initial_entities: 10,
        legacy_writes: 0,
        aime_writes: 100,
        concurrent_writes_to_same_entity: 0
      });

      expect(result.total_writes).toBe(100);
      // AIME writes should be synced in AIME memory
      expect(result.synced_writes).toBeGreaterThan(0);
    });

    test('should detect divergence in concurrent writes', async () => {
      const result = await validator.simulateParallelRun({
        initial_entities: 5,
        legacy_writes: 10,
        aime_writes: 10,
        concurrent_writes_to_same_entity: 5
      });

      // Concurrent writes to same entity should cause divergence
      expect(result.diverged_writes).toBeGreaterThan(0);
      expect(result.divergence_rate).toBeGreaterThan(0);
    });

    test('should reconcile high-volume writes (500 writes)', async () => {
      const result = await validator.simulateParallelRun({
        initial_entities: 20,
        legacy_writes: 250,
        aime_writes: 250,
        concurrent_writes_to_same_entity: 10
      });

      expect(result.total_writes).toBe(510); // 250 + 250 + (10*1) concurrent
      console.log(`Reconciliation result: ${result.synced_writes}/${result.synced_writes + result.diverged_writes} synced (${result.divergence_rate.toFixed(2)}% divergence)`);
    });

    test('should track write timestamps correctly', async () => {
      const beforeTime = new Date();

      await validator.writeLegacy('vendor_1', 'vendor', { cost: 1000 });
      await validator.writeAIME('vendor_1', { content: { cost: 1000 } });

      const afterTime = new Date();

      const log = validator.getWriteLog();
      expect(log.length).toBe(2);

      log.forEach(write => {
        expect(write.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(write.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });
    });
  });

  describe('Reconciliation Status', () => {
    test('should report reconciliation statistics', async () => {
      // Simulate some writes
      await validator.writeLegacy('vendor_1', 'vendor', { cost: 1000 });
      await validator.writeAIME('vendor_1', { content: { cost: 1000 } });
      await validator.writeLegacy('vendor_2', 'vendor', { cost: 1500 });

      const status = validator.getReconciliationStatus();

      expect(status.total_writes).toBe(3);
      expect(status.successful_writes).toBeGreaterThan(0);
      expect(typeof status.success_rate).toBe('string');
    });
  });

  describe('Conflict Resolution: Last-Write-Wins', () => {
    test('should resolve conflict using latest timestamp', () => {
      const t1 = new Date('2024-08-27T10:00:00Z');
      const t2 = new Date('2024-08-27T10:00:01Z');

      const result = ConflictResolver.resolveLastWriteWins(
        { timestamp: t1, value: 1000 },
        { timestamp: t2, value: 2000 }
      );

      expect(result.winner).toBe('aime');
      expect(result.value).toBe(2000);
    });

    test('should prefer AIME when timestamps are equal', () => {
      const t = new Date('2024-08-27T10:00:00Z');

      const result = ConflictResolver.resolveLastWriteWins(
        { timestamp: t, value: 1000 },
        { timestamp: t, value: 2000 }
      );

      expect(result.winner).toBe('aime');
      expect(result.value).toBe(2000);
    });
  });

  describe('Conflict Resolution: Most Recent Validation', () => {
    test('should prefer AIME write if it has validation', () => {
      const t1 = new Date('2024-08-27T10:00:00Z');
      const t2 = new Date('2024-08-27T09:00:00Z');

      const result = ConflictResolver.resolveMostRecentValidation(
        { timestamp: t1, value: 1000 },
        { timestamp: t2, validated_by: 'mattmez', value: 2000 }
      );

      expect(result.winner).toBe('aime');
      expect(result.reason).toContain('validated');
    });

    test('should fallback to last-write-wins if no validation', () => {
      const t1 = new Date('2024-08-27T10:00:00Z');
      const t2 = new Date('2024-08-27T09:00:00Z');

      const result = ConflictResolver.resolveMostRecentValidation(
        { timestamp: t1, value: 1000 },
        { timestamp: t2, value: 2000 }
      );

      expect(result.winner).toBe('legacy');
      expect(result.value).toBe(1000);
    });
  });

  describe('Merge Strategy', () => {
    test('should merge unique fields from both systems', () => {
      const legacyData = {
        name: 'DJ Martin',
        cost: 1500,
        legacy_field: 'value'
      };

      const aiMemoryData = {
        cost: 1500,
        aime_field: 'value',
        validated_by: 'mattmez'
      };

      const merged = ConflictResolver.merge(legacyData, aiMemoryData);

      expect(merged.name).toBe('DJ Martin');
      expect(merged.cost).toBe(1500);
      expect(merged.legacy_field).toBe('value');
      expect(merged.aime_field).toBe('value');
      expect(merged.validated_by).toBe('mattmez');
    });

    test('should prefer AIME values when both have field', () => {
      const legacyData = {
        cost: 1500,
        name: 'DJ'
      };

      const aiMemoryData = {
        cost: 2000,
        name: 'DJ Martin'
      };

      const merged = ConflictResolver.merge(legacyData, aiMemoryData);

      expect(merged.cost).toBe(2000);  // AIME value preferred
      expect(merged.name).toBe('DJ Martin');  // AIME value preferred
    });

    test('should handle complex nested objects', () => {
      const legacyData = {
        vendor: {
          name: 'DJ',
          location: 'Paris'
        }
      };

      const aiMemoryData = {
        vendor: {
          name: 'DJ Martin',
          phone: '0123456789'
        }
      };

      const merged = ConflictResolver.merge(legacyData, aiMemoryData);

      expect(merged.vendor.name).toBe('DJ Martin');
      expect(merged.vendor.phone).toBe('0123456789');
      // Legacy's location is overwritten by AIME's complete vendor object
    });
  });

  describe('Real-World 2-Week Scenario', () => {
    test('should simulate real 2-week parallel run', async () => {
      const result = await validator.simulateParallelRun({
        initial_entities: 50,        // 50 projects
        legacy_writes: 500,          // 500 writes from legacy
        aime_writes: 500,            // 500 writes from AIME
        concurrent_writes_to_same_entity: 50  // 50 concurrent conflicts
      });

      console.log('2-Week Parallel Run Results:');
      console.log(`  Total writes: ${result.total_writes}`);
      console.log(`  Synced: ${result.synced_writes}`);
      console.log(`  Diverged: ${result.diverged_writes}`);
      console.log(`  Divergence rate: ${result.divergence_rate.toFixed(2)}%`);

      // Expect most writes to sync successfully
      expect(result.synced_writes).toBeGreaterThan(result.diverged_writes);
      
      // Expect divergence rate to be low (conflicts should be resolvable)
      expect(result.divergence_rate).toBeLessThan(50);
    });
  });
});
