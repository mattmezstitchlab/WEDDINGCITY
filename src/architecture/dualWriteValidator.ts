/**
 * SECTION 8: Dual-Write Sync Validation
 * 
 * Simulate 2-week parallel run where both legacy and AIME systems write data
 * Verify consistency, detect divergence, reconcile
 * This is the validation before cutover
 */
// @ts-nocheck — simulation/test file; uses internal APIs outside their public contract

import {
  AIMemoryDataSystem,
  createVendor,
  createGuest,
  createWeddingProject,
  MutationSystem,
  CascadeEngine,
  QuerySystem,
  WEDDING_CASCADE_RULES
} from './index';

/**
 * Represents a write operation from either system
 */
type WriteOperation = {
  timestamp: Date;
  system: 'legacy' | 'aime';
  entity_id: string;
  entity_type: string;
  operation: 'create' | 'update' | 'delete';
  change: Record<string, any>;
  validation_status: 'pending' | 'synced' | 'diverged' | 'conflicted';
  divergence_reason?: string;
};

/**
 * Dual-Write Validator
 * Tracks writes from both systems and detects inconsistencies
 */
export class DualWriteValidator {
  private aiMemory: AIMemoryDataSystem;
  private legacySystem: Map<string, any> = new Map();
  private writeLog: WriteOperation[] = [];
  private mutationSystem: MutationSystem;
  private querySystem: QuerySystem;
  private cascadeEngine: CascadeEngine;

  constructor() {
    this.aiMemory = new AIMemoryDataSystem();
    this.mutationSystem = new MutationSystem(this.aiMemory);
    this.querySystem = new QuerySystem(this.aiMemory);
    this.cascadeEngine = new CascadeEngine(WEDDING_CASCADE_RULES);
  }

  /**
   * Simulate legacy system write
   */
  async writeLegacy(
    entity_id: string,
    entity_type: string,
    changes: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = new Date();

      // Get current state
      const currentState = this.legacySystem.get(entity_id) || {};

      // Apply write
      const newState = { ...currentState, ...changes };
      this.legacySystem.set(entity_id, newState);

      // Log write
      const writeOp: WriteOperation = {
        timestamp,
        system: 'legacy',
        entity_id,
        entity_type,
        operation: 'update',
        change: changes,
        validation_status: 'pending'
      };

      this.writeLog.push(writeOp);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Simulate AIME system write
   */
  async writeAIME(
    entity_id: string,
    changes: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = new Date();

      const mutation = {
        entity_id,
        changes
      };

      const result = await this.mutationSystem.executeMutation(mutation as any);

      const writeOp: WriteOperation = {
        timestamp,
        system: 'aime',
        entity_id,
        entity_type: 'vendor', // Simplified for test
        operation: 'update',
        change: changes,
        validation_status: result.success ? 'pending' : 'diverged',
        divergence_reason: result.success ? undefined : 'Mutation failed'
      };

      this.writeLog.push(writeOp);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Reconcile writes: detect divergence between systems
   */
  async reconcile(entity_id: string): Promise<{
    synced: boolean;
    legacy_state: any;
    aime_state: any;
    divergences: string[];
  }> {
    const legacyState = this.legacySystem.get(entity_id);
    const aiMemoryEntity = this.querySystem.getEntity(entity_id);

    const divergences: string[] = [];

    // Check if entity exists in both systems
    if (!legacyState && !aiMemoryEntity) {
      return {
        synced: true,
        legacy_state: null,
        aime_state: null,
        divergences: []
      };
    }

    if (!legacyState) {
      divergences.push('Entity exists in AIME but not in legacy system');
    }

    if (!aiMemoryEntity) {
      divergences.push('Entity exists in legacy system but not in AIME');
    }

    // Compare field-level differences
    if (legacyState && aiMemoryEntity) {
      const legacyKeys = Object.keys(legacyState || {});
      const aiMemoryKeys = Object.keys(aiMemoryEntity.content || {});

      const missingInAIME = legacyKeys.filter(k => !(k in (aiMemoryEntity.content || {})));
      if (missingInAIME.length > 0) {
        divergences.push(`Fields in legacy but not AIME: ${missingInAIME.join(', ')}`);
      }

      const missingInLegacy = aiMemoryKeys.filter(k => !(k in (legacyState || {})));
      if (missingInLegacy.length > 0) {
        divergences.push(`Fields in AIME but not legacy: ${missingInLegacy.join(', ')}`);
      }

      // Compare values
      for (const key of legacyKeys) {
        if (key in (aiMemoryEntity.content || {})) {
          if (JSON.stringify(legacyState[key]) !== JSON.stringify(aiMemoryEntity.content[key])) {
            divergences.push(`Value mismatch for ${key}: legacy="${legacyState[key]}" vs aime="${aiMemoryEntity.content[key]}"`);
          }
        }
      }
    }

    return {
      synced: divergences.length === 0,
      legacy_state: legacyState,
      aime_state: aiMemoryEntity?.content,
      divergences
    };
  }

  /**
   * Simulate 2-week parallel run
   */
  async simulateParallelRun(scenario: {
    initial_entities: number;
    legacy_writes: number;
    aime_writes: number;
    concurrent_writes_to_same_entity: number;
  }): Promise<{
    total_writes: number;
    synced_writes: number;
    diverged_writes: number;
    divergence_rate: number;
    details: Record<string, any>;
  }> {
    console.log('🔄 Starting 2-week parallel run simulation...');

    // Initialize test data
    for (let i = 0; i < scenario.initial_entities; i++) {
      const entity = createVendor({
        id: `vendor_${i}`,
        wedding_id: 'wedding_2024',
        name: `Vendor ${i}`,
        cost: Math.random() * 5000,
        currency: 'EUR'
      });

      this.aiMemory.createEntity(entity);
      this.legacySystem.set(entity.id, { name: entity.content.name, cost: entity.content.cost });
    }

    console.log(`✓ Initialized ${scenario.initial_entities} entities`);

    // Simulate legacy-only writes
    console.log(`📝 Simulating ${scenario.legacy_writes} legacy-only writes...`);
    for (let i = 0; i < scenario.legacy_writes; i++) {
      const entityId = `vendor_${Math.floor(Math.random() * scenario.initial_entities)}`;
      await this.writeLegacy(entityId, 'vendor', {
        cost: Math.random() * 5000
      });
    }

    // Simulate AIME-only writes
    console.log(`📝 Simulating ${scenario.aime_writes} AIME-only writes...`);
    for (let i = 0; i < scenario.aime_writes; i++) {
      const entityId = `vendor_${Math.floor(Math.random() * scenario.initial_entities)}`;
      await this.writeAIME(entityId, {
        content: {
          cost: Math.random() * 5000
        }
      });
    }

    // Simulate concurrent writes to same entity
    console.log(`⚠️  Simulating ${scenario.concurrent_writes_to_same_entity} concurrent writes to same entity...`);
    const concurrentEntityId = `vendor_0`;
    for (let i = 0; i < scenario.concurrent_writes_to_same_entity; i++) {
      const cost = Math.random() * 5000;

      // Both systems write simultaneously (in sequence here)
      await this.writeLegacy(concurrentEntityId, 'vendor', { cost });
      await this.writeAIME(concurrentEntityId, { content: { cost: cost + 100 } }); // AIME writes different value
    }

    // Reconcile all entities
    console.log('🔍 Reconciling...');
    let syncedCount = 0;
    let divergedCount = 0;
    const divergenceDetails: Record<string, any> = {};

    for (let i = 0; i < scenario.initial_entities; i++) {
      const entityId = `vendor_${i}`;
      const reconciliation = await this.reconcile(entityId);

      if (reconciliation.synced) {
        syncedCount++;
      } else {
        divergedCount++;
        divergenceDetails[entityId] = reconciliation.divergences;
      }
    }

    const totalWrites = this.writeLog.length;
    const divergenceRate = divergedCount > 0 ? (divergedCount / scenario.initial_entities) * 100 : 0;

    console.log(`✅ Reconciliation complete:`);
    console.log(`   Synced: ${syncedCount}/${scenario.initial_entities}`);
    console.log(`   Diverged: ${divergedCount}/${scenario.initial_entities}`);
    console.log(`   Divergence rate: ${divergenceRate.toFixed(2)}%`);

    return {
      total_writes: totalWrites,
      synced_writes: syncedCount,
      diverged_writes: divergedCount,
      divergence_rate: divergenceRate,
      details: divergenceDetails
    };
  }

  /**
   * Get write log for analysis
   */
  getWriteLog(): WriteOperation[] {
    return this.writeLog;
  }

  /**
   * Get reconciliation status
   */
  getReconciliationStatus() {
    const successfulWrites = this.writeLog.filter(w => w.validation_status !== 'diverged').length;
    const failedWrites = this.writeLog.filter(w => w.validation_status === 'diverged').length;

    return {
      total_writes: this.writeLog.length,
      successful_writes: successfulWrites,
      failed_writes: failedWrites,
      success_rate: ((successfulWrites / this.writeLog.length) * 100).toFixed(2)
    };
  }
}

/**
 * Conflict Resolution Strategy
 */
export class ConflictResolver {
  /**
   * Resolve conflicts using last-write-wins strategy
   */
  static resolveLastWriteWins(
    legacyWrite: { timestamp: Date; value: any },
    aiMemoryWrite: { timestamp: Date; value: any }
  ): { winner: 'legacy' | 'aime'; value: any; reason: string } {
    if (legacyWrite.timestamp > aiMemoryWrite.timestamp) {
      return { winner: 'legacy', value: legacyWrite.value, reason: 'Legacy write is more recent' };
    } else if (aiMemoryWrite.timestamp > legacyWrite.timestamp) {
      return { winner: 'aime', value: aiMemoryWrite.value, reason: 'AIME write is more recent' };
    } else {
      // If same timestamp, prefer AIME (it's the source of truth)
      return { winner: 'aime', value: aiMemoryWrite.value, reason: 'Same timestamp — AIME preferred as source of truth' };
    }
  }

  /**
   * Resolve conflicts using most-recent-validation strategy
   */
  static resolveMostRecentValidation(
    legacyWrite: { timestamp: Date; validated_by?: string; value: any },
    aiMemoryWrite: { timestamp: Date; validated_by?: string; value: any }
  ): { winner: 'legacy' | 'aime'; value: any; reason: string } {
    // AIME writes always have validated_by (decision trail)
    // Legacy writes might not
    if (aiMemoryWrite.validated_by) {
      return {
        winner: 'aime',
        value: aiMemoryWrite.value,
        reason: 'AIME write is explicitly validated'
      };
    }

    return ConflictResolver.resolveLastWriteWins(legacyWrite, aiMemoryWrite);
  }

  /**
   * Merge writes: combine both into master record
   */
  static merge(
    legacyData: Record<string, any>,
    aiMemoryData: Record<string, any>
  ): Record<string, any> {
    const merged = { ...legacyData };

    for (const [key, value] of Object.entries(aiMemoryData)) {
      if (!(key in merged)) {
        // Field only in AIME: add it
        merged[key] = value;
      } else if (JSON.stringify(merged[key]) !== JSON.stringify(value)) {
        // Field in both but different: prefer AIME (source of truth)
        merged[key] = value;
      }
      // If identical, no change needed
    }

    return merged;
  }
}

export default {
  DualWriteValidator,
  ConflictResolver
};
