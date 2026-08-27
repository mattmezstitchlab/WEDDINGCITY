/**
 * QUERY / MUTATION / CASCADE SYSTEM
 *
 * The critical layer that ensures data consistency
 * - Query: Ask for data canonically (no duplication)
 * - Mutation: Change one fact, cascade everywhere
 * - Cascade: All projections auto-sync
 *
 * This is what prevents the "3 sources of budget truth" problem
 */

import type { AIMemoryEntity, DecisionRecord } from './aiMemory'
import type { ProjectionSchema, Mutation, CascadeInstruction, ProjectedData } from './projectionSchemas'

/**
 * Query system: Ask for data canonically
 * Always returns from single source (AIME MEMORY), never duplicated
 */
export class QuerySystem {
  constructor(private memory: Map<string, AIMemoryEntity>) {}

  /**
   * Get single entity by ID
   */
  getEntity(id: string): AIMemoryEntity | null {
    return this.memory.get(id) || null
  }

  /**
   * Query entities with filters
   */
  queryEntities(filters: Partial<AIMemoryEntity>): AIMemoryEntity[] {
    return Array.from(this.memory.values()).filter((entity) => {
      // Match all provided filters
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'content') {
          // For content, check if all filters are present
          const contentFilters = value as Record<string, any>
          for (const [cKey, cValue] of Object.entries(contentFilters)) {
            if (entity.content[cKey] !== cValue) {
              return false
            }
          }
        } else {
          // Direct property match
          if ((entity as any)[key] !== value) {
            return false
          }
        }
      }
      return true
    })
  }

  /**
   * Get all entities for a projection
   * The projection decides which are relevant via readRules
   */
  getAllEntities(): AIMemoryEntity[] {
    return Array.from(this.memory.values())
  }

  /**
   * Get decision trail for entity
   */
  getDecisionTrail(entity_id: string): DecisionRecord[] {
    const entity = this.getEntity(entity_id)
    return entity ? entity.decision_trail : []
  }
}

/**
 * Mutation system: Change one fact, cascade everywhere
 */
export class MutationSystem {
  constructor(
    private memory: Map<string, AIMemoryEntity>,
    private cascadeEngine: CascadeEngine
  ) {}

  /**
   * Update an entity (this triggers cascades)
   */
  async updateEntity(
    entity_id: string,
    change: { field: string; old_value: any; new_value: any },
    validatedBy: string,
    reason: string
  ): Promise<{ success: boolean; cascades: CascadeInstruction[] }> {
    const entity = this.memory.get(entity_id)
    if (!entity) {
      return { success: false, cascades: [] }
    }

    // Update the entity
    const field_parts = change.field.split('.')
    let target: any = entity.content
    for (let i = 0; i < field_parts.length - 1; i++) {
      target = target[field_parts[i]]
    }
    target[field_parts[field_parts.length - 1]] = change.new_value

    // Record decision
    const decision: DecisionRecord = {
      timestamp: new Date(),
      sequence_number: entity.decision_trail.length,
      validated_by: validatedBy,
      original_extraction: {
        facts: { [change.field]: change.old_value },
        certainty: entity.certainty,
        reasoning: 'Previous value',
      },
      correction: {
        fields_corrected: [change.field],
        corrected_values: { [change.field]: change.new_value },
        reason,
      },
      impact_analysis: {
        changed_at: new Date(),
        changed_by: validatedBy,
        affected_projections: [],
        changes: [],
        cascaded_to: [],
      },
      validation_source: 'correction',
      is_reversible: true,
    }

    entity.decision_trail.push(decision)
    entity.updated_at = new Date()

    // Save back to memory
    this.memory.set(entity_id, entity)

    // Trigger cascades
    const mutation: Mutation = {
      entity_id,
      entity_type: entity.type,
      field_changed: change.field,
      old_value: change.old_value,
      new_value: change.new_value,
      reason,
      validated_by: validatedBy,
      timestamp: new Date(),
    }

    const cascades = await this.cascadeEngine.identifyAndExecuteCascades(mutation)

    return {
      success: true,
      cascades,
    }
  }

  /**
   * Batch update entities (multiple changes at once)
   */
  async batchUpdate(
    updates: { entity_id: string; field: string; new_value: any }[],
    validatedBy: string
  ): Promise<void> {
    for (const update of updates) {
      const entity = this.memory.get(update.entity_id)
      if (entity) {
        const field_parts = update.field.split('.')
        let target: any = entity.content
        for (let i = 0; i < field_parts.length - 1; i++) {
          target = target[field_parts[i]]
        }
        const oldValue = target[field_parts[field_parts.length - 1]]
        target[field_parts[field_parts.length - 1]] = update.new_value

        // Record decision
        const decision: DecisionRecord = {
          timestamp: new Date(),
          sequence_number: entity.decision_trail.length,
          validated_by: validatedBy,
          original_extraction: {
            facts: { [update.field]: oldValue },
            certainty: entity.certainty,
            reasoning: 'Batch update',
          },
          impact_analysis: {
            changed_at: new Date(),
            changed_by: validatedBy,
            affected_projections: [],
            changes: [],
            cascaded_to: [],
          },
          validation_source: 'cascade_decision',
          is_reversible: true,
        }

        entity.decision_trail.push(decision)
        entity.updated_at = new Date()
        this.memory.set(update.entity_id, entity)
      }
    }
  }
}

/**
 * Cascade engine: Identify and execute cascading changes
 */
export class CascadeEngine {
  constructor(
    private memory: Map<string, AIMemoryEntity>,
    private projectionSchemas: Map<string, ProjectionSchema>
  ) {}

  /**
   * Identify which projections are affected by a mutation
   */
  identifyAffectedProjections(mutation: Mutation): string[] {
    const affected: Set<string> = new Set()

    // For each projection, see if it cares about this entity/field
    for (const [projName, schema] of this.projectionSchemas) {
      // Query which entities the projection would include
      const allEntities = Array.from(this.memory.values())
      const projData = schema.readRules(allEntities)

      // Check if the mutated entity is in this projection
      if (projData.entities.some((e) => e.id === mutation.entity_id)) {
        affected.add(projName)
      }

      // Also check if cascade rules apply
      const cascades = schema.writeRules(mutation)
      if (cascades.length > 0) {
        affected.add(projName)
      }
    }

    return Array.from(affected)
  }

  /**
   * Execute cascading changes (all affected projections get updated)
   */
  async identifyAndExecuteCascades(mutation: Mutation): Promise<CascadeInstruction[]> {
    const allCascades: CascadeInstruction[] = []

    // Ask each projection what cascades it wants
    for (const [projName, schema] of this.projectionSchemas) {
      if (!schema.bidirectional) continue // Only bidirectional projections can trigger cascades

      const cascades = schema.writeRules(mutation)
      for (const cascade of cascades) {
        cascade.source_projection = projName
        allCascades.push(cascade)
      }
    }

    // Execute each cascade
    for (const cascade of allCascades) {
      const targetEntity = this.memory.get(cascade.target_entity_id)
      if (targetEntity) {
        // Apply the cascade
        const field_parts = cascade.field_to_change.split('.')
        let target: any = targetEntity.content
        for (let i = 0; i < field_parts.length - 1; i++) {
          target = target[field_parts[i]]
        }
        target[field_parts[field_parts.length - 1]] = cascade.new_value

        targetEntity.updated_at = new Date()
        this.memory.set(cascade.target_entity_id, targetEntity)
      }
    }

    return allCascades
  }
}

/**
 * Projection sync system: Keeps all projections up-to-date
 */
export class ProjectionSyncSystem {
  private projectionCache: Map<string, ProjectedData> = new Map()
  private lastSyncTimestamp: Map<string, Date> = new Map()

  constructor(
    private querySystem: QuerySystem,
    private projectionSchemas: Map<string, ProjectionSchema>
  ) {}

  /**
   * Get projection data (updates cache if needed)
   */
  getProjection(projectionName: string): ProjectedData | null {
    const schema = this.projectionSchemas.get(projectionName)
    if (!schema) return null

    // Always recalculate (no cache expiry for now)
    const allEntities = this.querySystem.getAllEntities()
    const projData = schema.readRules(allEntities)

    // Add computed fields
    projData.computed_fields = Object.fromEntries(
      schema.computedFields(allEntities).map((f) => [f.name, f.value])
    )

    // Run validations
    const validation = schema.validations(projData)
    projData.validation_status = validation.valid ? 'valid' : 'invalid'
    projData.warnings = validation.warnings

    // Cache it
    this.projectionCache.set(projectionName, projData)
    this.lastSyncTimestamp.set(projectionName, new Date())

    return projData
  }

  /**
   * Get all projections
   */
  getAllProjections(): Record<string, ProjectedData> {
    const result: Record<string, ProjectedData> = {}

    for (const projName of this.projectionSchemas.keys()) {
      const proj = this.getProjection(projName)
      if (proj) {
        result[projName] = proj
      }
    }

    return result
  }

  /**
   * Invalidate a projection (force refresh next time)
   */
  invalidateProjection(projectionName: string): void {
    this.projectionCache.delete(projectionName)
  }

  /**
   * Invalidate all projections
   */
  invalidateAll(): void {
    this.projectionCache.clear()
  }
}

/**
 * Complete data consistency system
 */
export class AIMemoryDataSystem {
  private memory: Map<string, AIMemoryEntity>
  private querySystem: QuerySystem
  private cascadeEngine: CascadeEngine
  private mutationSystem: MutationSystem
  private projectionSyncSystem: ProjectionSyncSystem

  constructor(projectionSchemas: Map<string, ProjectionSchema>) {
    this.memory = new Map()
    this.querySystem = new QuerySystem(this.memory)
    this.cascadeEngine = new CascadeEngine(this.memory, projectionSchemas)
    this.mutationSystem = new MutationSystem(this.memory, this.cascadeEngine)
    this.projectionSyncSystem = new ProjectionSyncSystem(this.querySystem, projectionSchemas)
  }

  // Public APIs
  getQuerySystem(): QuerySystem {
    return this.querySystem
  }

  getMutationSystem(): MutationSystem {
    return this.mutationSystem
  }

  getProjectionSyncSystem(): ProjectionSyncSystem {
    return this.projectionSyncSystem
  }

  /**
   * Add entity to memory
   */
  addEntity(entity: AIMemoryEntity): void {
    this.memory.set(entity.id, entity)
    this.projectionSyncSystem.invalidateAll()
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    total_entities: number
    by_type: Record<string, number>
    by_domain: Record<string, number>
    by_certainty: { high: number; medium: number; low: number }
  } {
    const entities = Array.from(this.memory.values())

    const byType: Record<string, number> = {}
    const byDomain: Record<string, number> = {}
    let highCertainty = 0
    let mediumCertainty = 0
    let lowCertainty = 0

    for (const entity of entities) {
      byType[entity.type] = (byType[entity.type] || 0) + 1
      byDomain[entity.domain] = (byDomain[entity.domain] || 0) + 1

      if (entity.certainty >= 0.8) highCertainty++
      else if (entity.certainty >= 0.5) mediumCertainty++
      else lowCertainty++
    }

    return {
      total_entities: entities.length,
      by_type: byType,
      by_domain: byDomain,
      by_certainty: {
        high: highCertainty,
        medium: mediumCertainty,
        low: lowCertainty,
      },
    }
  }
}
