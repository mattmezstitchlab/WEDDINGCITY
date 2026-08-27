/**
 * DUAL-WRITE ADAPTER
 *
 * Bridges AIME MEMORY (new universal system) with legacy storage systems (weddingStore).
 *
 * Migration strategy:
 * 1. During 2-week parallel run, ALL mutations written to both systems
 * 2. Query layer reads preferentially from new system (with fallback to legacy)
 * 3. At cutover, legacy storage becomes read-only; aiMemory becomes source of truth
 * 4. Legacy systems preserved as backup for 90 days
 *
 * This enables zero data loss and safe rollback if needed.
 */

import type { AIMemoryEntity } from './aiMemory'
import type { WeddingProject } from '../types/wedding'

/**
 * Sync status tracking
 */
export type DualWriteSyncStatus = {
  entity_id: string
  last_sync_timestamp: Date
  last_sync_direction: 'aime_to_legacy' | 'legacy_to_aime'
  sync_status: 'in_sync' | 'diverged' | 'pending'
  sync_errors: string[]
  last_error_timestamp?: Date
}

/**
 * Dual-write manager: Keeps both systems synchronized
 */
export class DualWriteAdapter {
  private syncLog: Map<string, DualWriteSyncStatus> = new Map()
  private cutoverTimestamp?: Date
  private isReadOnly = false

  constructor(
    private aiMemory: Map<string, AIMemoryEntity>,
    private legacyStore: Map<string, any> // Generic legacy store (could be weddingStore, etc)
  ) {}

  /**
   * Write to both AIME MEMORY and legacy system
   * If one fails, log error but continue (prefer AIME success)
   */
  async dualWrite(
    entityId: string,
    aiEntity: AIMemoryEntity,
    legacyData: Record<string, any>
  ): Promise<{
    aiMemorySuccess: boolean
    legacySuccess: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // Write to AIME MEMORY (primary)
    let aiMemorySuccess = false
    try {
      this.aiMemory.set(entityId, aiEntity)
      aiMemorySuccess = true
    } catch (error) {
      const msg = `AIME write failed for ${entityId}: ${error instanceof Error ? error.message : String(error)}`
      errors.push(msg)
    }

    // Write to legacy system (secondary)
    let legacySuccess = false
    try {
      if (!this.isReadOnly) {
        this.legacyStore.set(entityId, legacyData)
        legacySuccess = true
      }
    } catch (error) {
      const msg = `Legacy write failed for ${entityId}: ${error instanceof Error ? error.message : String(error)}`
      errors.push(msg)
    }

    // Track sync status
    this.updateSyncStatus(entityId, aiMemorySuccess, legacySuccess, errors)

    return { aiMemorySuccess, legacySuccess, errors }
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(
    entityId: string,
    aiSuccess: boolean,
    legacySuccess: boolean,
    errors: string[]
  ): void {
    let status: 'in_sync' | 'diverged' | 'pending' = 'in_sync'
    if (errors.length > 0) {
      status = aiSuccess && legacySuccess ? 'pending' : 'diverged'
    }

    this.syncLog.set(entityId, {
      entity_id: entityId,
      last_sync_timestamp: new Date(),
      last_sync_direction: 'legacy_to_aime',
      sync_status: status,
      sync_errors: errors,
      last_error_timestamp: errors.length > 0 ? new Date() : undefined,
    })
  }

  /**
   * Seed AIME MEMORY from legacy system
   * Converts existing legacy entities to universal format
   */
  async seedFromLegacy(): Promise<{
    total_seeded: number
    errors: string[]
  }> {
    const errors: string[] = []
    let seeded = 0

    for (const [legacyId, legacyData] of this.legacyStore.entries()) {
      try {
        // Convert legacy data to AIME entity
        // This is a generic converter; specific domains override this
        const aiEntity = this.convertLegacyToAIMemory(legacyId, legacyData)

        // Seed AIME MEMORY
        this.aiMemory.set(aiEntity.id, aiEntity)

        // Mark as synced
        this.syncLog.set(aiEntity.id, {
          entity_id: aiEntity.id,
          last_sync_timestamp: new Date(),
          last_sync_direction: 'legacy_to_aime',
          sync_status: 'in_sync',
          sync_errors: [],
        })

        seeded++
      } catch (error) {
        const msg = `Failed to seed legacy entity ${legacyId}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(msg)
      }
    }

    return { total_seeded: seeded, errors }
  }

  /**
   * Generic legacy-to-AIME converter
   * Override in domain-specific adapters for better results
   */
  protected convertLegacyToAIMemory(legacyId: string, legacyData: any): AIMemoryEntity {
    return {
      id: `legacy-${legacyId}`,
      type: 'entity',
      domain: 'wedding',
      created_at: legacyData.createdAt ? new Date(legacyData.createdAt) : new Date(),
      updated_at: legacyData.updatedAt ? new Date(legacyData.updatedAt) : new Date(),
      certainty: 0.85,
      reason_for_certainty: 'Migrated from legacy system',
      tags: ['migrated', 'legacy'],
      source: {
        validated_by: 'migration_system',
        timestamp: new Date(),
      },
      content: {
        ...legacyData,
        original_legacy_id: legacyId,
      },
      decision_trail: [
        {
          timestamp: new Date(),
          sequence_number: 0,
          validated_by: 'migration_system',
          original_extraction: {
            facts: {
              id: legacyId,
              source: 'legacy_system',
            },
            certainty: 0.85,
            reasoning: 'Migrated from legacy system',
          },
          impact_analysis: {
            changed_at: new Date(),
            changed_by: 'migration_system',
            affected_projections: [],
            changes: [],
            cascaded_to: [],
          },
          validation_source: 'user_confirmation',
          is_reversible: true,
        },
      ],
      access_control: {
        private: true,
        public: false,
        shared_with: [],
      },
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(entityId: string): DualWriteSyncStatus | null {
    return this.syncLog.get(entityId) || null
  }

  /**
   * Get all diverged entities (need manual review)
   */
  getDivergedEntities(): string[] {
    const diverged: string[] = []
    for (const [entityId, status] of this.syncLog.entries()) {
      if (status.sync_status === 'diverged') {
        diverged.push(entityId)
      }
    }
    return diverged
  }

  /**
   * Verify bidirectional sync consistency
   */
  verifySyncConsistency(): {
    consistent: boolean
    total_entities: number
    in_sync: number
    diverged: number
    pending: number
    errors_found: number
  } {
    let in_sync = 0
    let diverged = 0
    let pending = 0
    let errors_found = 0

    for (const status of this.syncLog.values()) {
      switch (status.sync_status) {
        case 'in_sync':
          in_sync++
          break
        case 'diverged':
          diverged++
          break
        case 'pending':
          pending++
          break
      }
      errors_found += status.sync_errors.length
    }

    return {
      consistent: diverged === 0 && errors_found === 0,
      total_entities: this.syncLog.size,
      in_sync,
      diverged,
      pending,
      errors_found,
    }
  }

  /**
   * Perform cutover: Make legacy system read-only
   * After verification passes, switch to AIME-only writes
   */
  async performCutover(): Promise<{
    success: boolean
    timestamp: Date
    verification: {
      consistent: boolean
      total_entities: number
      in_sync: number
      diverged: number
    }
  }> {
    const verification = this.verifySyncConsistency()

    if (!verification.consistent) {
      return {
        success: false,
        timestamp: new Date(),
        verification,
      }
    }

    // Make legacy system read-only
    this.isReadOnly = true
    this.cutoverTimestamp = new Date()

    return {
      success: true,
      timestamp: this.cutoverTimestamp,
      verification,
    }
  }

  /**
   * Check if we're in read-only (post-cutover) mode
   */
  isPostCutover(): boolean {
    return this.isReadOnly
  }

  /**
   * Get cutover timestamp (if cutover performed)
   */
  getCutoverTimestamp(): Date | undefined {
    return this.cutoverTimestamp
  }
}

