/**
 * AIME MEMORY / UNIVERSAL WORLD MODEL
 *
 * This is the foundation of AIME: a universal, domain-agnostic memory system
 * that stores all facts, decisions, corrections, and their complete audit trail.
 *
 * NOT domain-specific. NOT weddingStore-dependent.
 *
 * Layers above this:
 * - DomainAdapter (wedding-specific rules)
 * - ProjectionSchema (different ways to view the memory)
 * - QueryMutationCascade (automatic synchronization)
 * - UI Components (dumb subscribers)
 *
 * Architecture principle: ME → AI → validation → MEMORY → cascade → projections
 */

/**
 * Core entity type in AIME MEMORY
 */
export type AIMemoryEntity = {
  // Identity
  id: string
  type: 'fact' | 'entity' | 'relation' | 'decision'
  domain: 'wedding' | 'monde_aime' | 'artists' | 'events' | 'finance' | 'files'

  // Content
  content: Record<string, any>

  // Source tracking
  source: {
    extracted_from?: string // document name, text fragment
    source_kind: 'user' | 'document' | 'import' | 'system' | 'cascade'
    source_confidence: 'confirmed' | 'probable' | 'estimated' | 'missing'
    validated_by: string // user ID who confirmed this
    timestamp: Date
  }

  // Certainty + reasoning
  certainty: number // 0.0-1.0
  confidence_level: 'confirmed' | 'inferred' | 'estimated' | 'missing'
  reason_for_certainty: string // "User confirmed", "Mentioned with €", etc

  // Complete decision trail (the crucial part)
  decision_trail: DecisionRecord[]

  // Access control (privacy by design)
  access_control: {
    private: boolean // only project owner sees
    public: boolean // shared publicly
    shared_with: string[] // specific user IDs
  }

  // Created/updated tracking
  created_at: Date
  updated_at: Date

  // Tags for querying
  tags: string[]

  // Metadata for compliance
  metadata?: {
    retention_policy?: 'keep' | 'archive_after_months' | 'delete_after_months'
    fiscal_entity?: boolean // relevant for tax/audit
    contract_document?: boolean // legally binding
    provenance_notes?: string
  }
}

/**
 * Decision record: What happened when this fact was validated/corrected
 *
 * This is the "decision memorization" mechanism: NOT autonomous learning,
 * but explicit user decision with full audit trail.
 */
export type DecisionRecord = {
  // When
  timestamp: Date
  sequence_number: number // order of decisions in trail

  // Who
  validated_by: string // user ID

  // What was the original extraction
  original_extraction: {
    facts: Record<string, any>
    certainty: number
    reasoning: string
  }

  // What did the user correct/confirm
  correction?: {
    fields_corrected: string[] // which fields changed
    corrected_values: Record<string, any>
    reason?: string // why did user change it
  }

  // What were the consequences
  impact_analysis: ImpactRecord

  // For compliance/transparency
  validation_source: 'user_confirmation' | 'correction' | 'cascade_decision'
  is_reversible: boolean
  confidence_before: number
  confidence_after: number
}

/**
 * Impact record: What changed as result of decision
 */
export type ImpactRecord = {
  changed_at: Date
  changed_by: string

  // Which projections were affected
  affected_projections: string[] // "Timeline", "Finance", "Documents", "Persons"

  // What changed
  changes: {
    projection: string
    before: any
    after: any
    reason: string
  }[]

  // Cascade details
  cascaded_to: {
    entity_id: string
    entity_type: string
    field_changed: string
  }[]
}

/**
 * Extraction result from documentIntelligence
 * This is what AI produces BEFORE user validation
 */
export type ExtractionResult = {
  extracted_at: Date
  extracted_from_document?: string
  extracted_from_text?: string

  facts: {
    key: string
    value: any
    certainty: number
    reasoning: string
  }[]

  relations: {
    entity_a: string
    entity_b: string
    relation_type: string
    certainty: number
  }[]

  questions: {
    what: string
    why: string
    severity: 'critical' | 'important' | 'minor'
  }[]
}

/**
 * Validation input from user (ME layer)
 * This is what user provides to validate/correct AI extraction
 */
export type ValidationInput = {
  from_extraction: ExtractionResult

  // User decision
  user_id: string
  validated_at: Date

  // Corrections to the extraction
  corrections?: {
    fact_key: string
    corrected_value: any
    reason?: string
  }[]

  // Answers to AI questions
  answers?: {
    question: string
    answer: string
  }[]

  // Questions for AI
  follow_up_questions?: string[]
}

/**
 * Mutation instruction: When a fact changes, what cascades
 */
/**
 * Cascade instruction (moved to projectionSchemas.ts to avoid duplication)
 * Imported from projectionSchemas for type checking
 */
import type { CascadeInstruction } from './projectionSchemas'

export type { CascadeInstruction }

/**
 * Factory functions
 */

export function createEntity(
  type: AIMemoryEntity['type'],
  domain: AIMemoryEntity['domain'],
  content: Record<string, any>,
  validated_by: string
): AIMemoryEntity {
  const now = new Date()
  return {
    id: `${domain}-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    domain,
    content,
    source: {
      validated_by,
      timestamp: now,
      source_kind: 'user',
      source_confidence: 'confirmed',
    },
    certainty: 0.5,
    confidence_level: 'estimated',
    reason_for_certainty: 'Initial creation',
    decision_trail: [
      {
        timestamp: now,
        sequence_number: 0,
        validated_by,
        original_extraction: {
          facts: content,
          certainty: 0.5,
          reasoning: 'Initial creation',
        },
        impact_analysis: {
          changed_at: now,
          changed_by: validated_by,
          affected_projections: [],
          changes: [],
          cascaded_to: [],
        },
        validation_source: 'user_confirmation',
        is_reversible: true,
        confidence_before: 0.5,
        confidence_after: 0.5,
      },
    ],
    access_control: {
      private: true,
      public: false,
      shared_with: [],
    },
    created_at: now,
    updated_at: now,
    tags: [],
  }
}

export function addDecisionToTrail(
  entity: AIMemoryEntity,
  decision: DecisionRecord
): AIMemoryEntity {
  const trail = [...entity.decision_trail]
  trail.push({
    ...decision,
    sequence_number: trail.length,
  })

  return {
    ...entity,
    decision_trail: trail,
    updated_at: new Date(),
    confidence_level: decision.confidence_after >= 0.8 ? 'confirmed' : decision.confidence_after >= 0.5 ? 'inferred' : 'estimated',
    certainty: decision.confidence_after,
  }
}

export function getDecisionHistory(entity: AIMemoryEntity): DecisionRecord[] {
  return entity.decision_trail.sort((a, b) => a.sequence_number - b.sequence_number)
}

export function wasEntityCorrectedBy(entity: AIMemoryEntity, user_id: string): boolean {
  return entity.decision_trail.some(
    (d) => d.validation_source === 'correction' && d.validated_by === user_id
  )
}

/**
 * Memory store interface
 * This will be implemented by both old and new systems during migration
 */
export interface AIMemoryStore {
  // Queries
  getEntity(id: string): Promise<AIMemoryEntity | null>
  queryEntities(filters: Partial<AIMemoryEntity>): Promise<AIMemoryEntity[]>
  getDecisionTrail(entity_id: string): Promise<DecisionRecord[]>

  // Mutations
  createEntity(entity: AIMemoryEntity): Promise<string> // returns ID
  updateEntity(id: string, updates: Partial<AIMemoryEntity>): Promise<void>
  addDecision(entity_id: string, decision: DecisionRecord): Promise<void>

  // Transactions
  batchUpdate(updates: { id: string; changes: Partial<AIMemoryEntity> }[]): Promise<void>
}

/**
 * Dual-write adapter implementation
 * During migration, writes go to BOTH old system (weddingStore) AND new system (aiMemory)
 * This ensures zero data loss and allows rollback
 */
export class DualWriteMemoryAdapter implements AIMemoryStore {
  private legacyStore: AIMemoryStore
  private newStore: AIMemoryStore

  constructor(legacyStore: AIMemoryStore, newStore: AIMemoryStore) {
    this.legacyStore = legacyStore
    this.newStore = newStore
  }

  async getEntity(id: string): Promise<AIMemoryEntity | null> {
    // Try new store first, fallback to legacy
    const newEntity = await this.newStore.getEntity(id)
    if (newEntity) return newEntity

    const legacyEntity = await this.legacyStore.getEntity(id)
    if (legacyEntity) {
      // Keep new store synchronized
      await this.newStore.createEntity(legacyEntity)
    }
    return legacyEntity
  }

  async queryEntities(filters: Partial<AIMemoryEntity>): Promise<AIMemoryEntity[]> {
    // Query new store primarily
    return this.newStore.queryEntities(filters)
  }

  async getDecisionTrail(entity_id: string): Promise<DecisionRecord[]> {
    return this.newStore.getDecisionTrail(entity_id)
  }

  async createEntity(entity: AIMemoryEntity): Promise<string> {
    // Write to both systems
    const newId = await this.newStore.createEntity(entity)
    try {
      await this.legacyStore.createEntity({ ...entity, id: newId })
    } catch (err) {
      console.error('Failed to write to legacy store, but new store succeeded', err)
      // Don't fail, new store is the source of truth during migration
    }
    return newId
  }

  async updateEntity(id: string, updates: Partial<AIMemoryEntity>): Promise<void> {
    // Write to both systems
    await this.newStore.updateEntity(id, updates)
    try {
      await this.legacyStore.updateEntity(id, updates)
    } catch (err) {
      console.error('Failed to write to legacy store, but new store succeeded', err)
    }
  }

  async addDecision(entity_id: string, decision: DecisionRecord): Promise<void> {
    // Write to both systems
    await this.newStore.addDecision(entity_id, decision)
    try {
      await this.legacyStore.addDecision(entity_id, decision)
    } catch (err) {
      console.error('Failed to write to legacy store, but new store succeeded', err)
    }
  }

  async batchUpdate(updates: { id: string; changes: Partial<AIMemoryEntity> }[]): Promise<void> {
    await this.newStore.batchUpdate(updates)
    try {
      await this.legacyStore.batchUpdate(updates)
    } catch (err) {
      console.error('Failed to write to legacy store in batch, but new store succeeded', err)
    }
  }
}
