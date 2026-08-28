/**
 * PROJECTION SCHEMA SYSTEM
 *
 * Formalize how each projection reads/writes AIME MEMORY
 * A projection is a different lens on the same memory
 * - Timeline projection: chronological view
 * - Finance projection: budget/money view
 * - Documents projection: contracts/devis/factures
 * - Persons projection: relationships view
 * - Tasks projection: checklist view
 *
 * Key principle: One memory, many projections
 * Change once in memory, update everywhere automatically
 */

import type { AIMemoryEntity } from './aiMemory'

/**
 * Projection Schema interface
 */
export interface ProjectionSchema {
  // Identity
  name: string // "Timeline" | "Finance" | "Documents" | "Persons" | "Tasks"
  domain: string // "wedding" | "monde_aime" | "artists"

  // Read rules: which entities matter for this projection
  readRules: (entities: AIMemoryEntity[]) => ProjectedData

  // Write rules: what cascades when UI changes data
  writeRules: (change: Mutation) => CascadeInstruction[]

  // Computed fields: aggregations, totals, derived data
  computedFields: (entities: AIMemoryEntity[]) => ComputedField[]

  // Validation: projection-specific rules
  validations: (data: ProjectedData) => ValidationResult

  // Can UI mutate back to memory?
  bidirectional: boolean
}

/**
 * What gets returned by a projection
 */
export type ProjectedData = {
  projection_name: string
  domain: string
  timestamp: Date
  entities: AIMemoryEntity[]
  computed_fields: Record<string, any>
  validation_status: 'valid' | 'invalid' | 'warning'
  warnings: string[]
  provenance?: {
    sources: string[]
    confidence_summary: 'confirmed' | 'mixed' | 'estimated'
  }
}

/**
 * When UI makes a change
 */
export type Mutation = {
  entity_id: string
  entity_type: string
  field_changed: string
  old_value: any
  new_value: any
  reason: string
  validated_by: string
  timestamp: Date
  confidence_before?: number
  confidence_after?: number
}

/**
 * What cascades as result
 */
export type CascadeInstruction = {
  target_entity_id: string
  target_entity_type: string
  field_to_change: string
  new_value: any
  reason: string
  source_projection: string
  validated: boolean
}

/**
 * Computed field (aggregate, total, derived)
 */
export type ComputedField = {
  name: string
  value: any
  computed_at: Date
  based_on: string[] // which entities
}

/**
 * Validation result
 */
export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * TIMELINE PROJECTION
 * Chronological view: what happens when
 */
export const TimelineProjection: ProjectionSchema = {
  name: 'Timeline',
  domain: 'wedding',

  readRules: (entities: AIMemoryEntity[]) => {
    const moments = entities.filter(
      (e) => (e.type === 'entity' || e.type === 'fact') && e.tags.includes('moment')
    )

    const sorted = moments.sort((a, b) => {
      const dateA = a.content.scheduled_date ? new Date(a.content.scheduled_date).getTime() : 0
      const dateB = b.content.scheduled_date ? new Date(b.content.scheduled_date).getTime() : 0
      return dateA - dateB
    })

    return {
      projection_name: 'Timeline',
      domain: 'wedding',
      timestamp: new Date(),
      entities: sorted,
      computed_fields: {},
      validation_status: 'valid',
      warnings: [],
    }
  },

  writeRules: (change: Mutation): CascadeInstruction[] => {
    const cascades: CascadeInstruction[] = []

    // If a vendor date changes, timeline needs review
    if (change.entity_type === 'vendor' && change.field_changed === 'scheduled_date') {
      cascades.push({
        target_entity_id: change.entity_id,
        target_entity_type: 'vendor',
        field_to_change: 'needs_timeline_review',
        new_value: true,
        reason: `Vendor date changed from ${change.old_value} to ${change.new_value}`,
        source_projection: 'Timeline',
        validated: false,
      })
    }

    return cascades
  },

  computedFields: (entities: AIMemoryEntity[]) => {
    const moments = entities.filter((e) => e.tags.includes('moment'))

    return [
      {
        name: 'total_moments',
        value: moments.length,
        computed_at: new Date(),
        based_on: moments.map((m) => m.id),
      },
      {
        name: 'earliest_date',
        value: Math.min(
          ...moments
            .map((m) => (m.content.scheduled_date ? new Date(m.content.scheduled_date).getTime() : Infinity))
            .filter((d) => d !== Infinity)
        ),
        computed_at: new Date(),
        based_on: moments.map((m) => m.id),
      },
      {
        name: 'latest_date',
        value: Math.max(
          ...moments
            .map((m) => (m.content.scheduled_date ? new Date(m.content.scheduled_date).getTime() : 0))
            .filter((d) => d !== 0)
        ),
        computed_at: new Date(),
        based_on: moments.map((m) => m.id),
      },
    ]
  },

  validations: (data: ProjectedData): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for duplicate moments
    const momentNames = data.entities.map((e) => e.content.name)
    const duplicates = momentNames.filter((name, index) => momentNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      warnings.push(`Duplicate moment names found: ${duplicates.join(', ')}`)
    }

    // Check for moments without dates
    const undatedMoments = data.entities.filter((e) => !e.content.scheduled_date)
    if (undatedMoments.length > 0) {
      warnings.push(
        `${undatedMoments.length} moments have no scheduled date. Timeline view may be incomplete.`
      )
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  },

  bidirectional: true,
}

/**
 * FINANCE PROJECTION
 * Budget view: money flow
 *
 * CRITICAL FIX: Budget is SINGLE SOURCE in AIME MEMORY
 * Finance projection reads from it, no duplication
 */
export const FinanceProjection: ProjectionSchema = {
  name: 'Finance',
  domain: 'wedding',

  readRules: (entities: AIMemoryEntity[]) => {
    const budgetLines = entities.filter(
      (e) => (e.type === 'entity' || e.type === 'fact') && e.tags.includes('budget')
    )

    const vendors = entities.filter(
      (e) => (e.type === 'entity' || e.type === 'fact') && e.tags.includes('vendor')
    )

    return {
      projection_name: 'Finance',
      domain: 'wedding',
      timestamp: new Date(),
      entities: [...budgetLines, ...vendors],
      computed_fields: {},
      validation_status: 'valid',
      warnings: [],
    }
  },

  writeRules: (change: Mutation): CascadeInstruction[] => {
    const cascades: CascadeInstruction[] = []

    // If amount changes, budget needs recalculation
    if (change.field_changed === 'amount' || change.field_changed === 'deposit') {
      cascades.push({
        target_entity_id: change.entity_id,
        target_entity_type: change.entity_type,
        field_to_change: 'budget_needs_recalc',
        new_value: true,
        reason: `Amount changed from ${change.old_value} to ${change.new_value}`,
        source_projection: 'Finance',
        validated: false,
      })
    }

    return cascades
  },

  computedFields: (entities: AIMemoryEntity[]) => {
    const budgetLines = entities.filter((e) => e.tags.includes('budget'))
    const vendors = entities.filter((e) => e.tags.includes('vendor'))

    const totalVendorCosts = vendors.reduce((sum, v) => sum + (v.content.amount || 0), 0)
    const totalBudgetLines = budgetLines.reduce((sum, b) => sum + (b.content.amount || 0), 0)

    // Budget is SINGLE SOURCE in memory, aggregated here
    const totalBudget = Math.max(totalVendorCosts, totalBudgetLines)

    return [
      {
        name: 'total_budget',
        value: totalBudget,
        computed_at: new Date(),
        based_on: budgetLines.map((b) => b.id),
      },
      {
        name: 'total_spent',
        value: budgetLines
          .filter((b) => b.content.status === 'paid')
          .reduce((sum, b) => sum + b.content.amount, 0),
        computed_at: new Date(),
        based_on: budgetLines.filter((b) => b.content.status === 'paid').map((b) => b.id),
      },
      {
        name: 'remaining_budget',
        value:
          totalBudget -
          budgetLines
            .filter((b) => b.content.status === 'paid')
            .reduce((sum, b) => sum + b.content.amount, 0),
        computed_at: new Date(),
        based_on: budgetLines.map((b) => b.id),
      },
      {
        name: 'budget_by_category',
        value: budgetLines.reduce(
          (acc: Record<string, number>, b) => {
            const cat = b.content.category || 'other'
            acc[cat] = (acc[cat] || 0) + b.content.amount
            return acc
          },
          {}
        ),
        computed_at: new Date(),
        based_on: budgetLines.map((b) => b.id),
      },
    ]
  },

  validations: (data: ProjectedData): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for negative amounts
    const negativeAmounts = data.entities.filter((e) => e.content.amount < 0)
    if (negativeAmounts.length > 0) {
      errors.push(`Found ${negativeAmounts.length} budget items with negative amounts`)
    }

    // Check for missing budget lines
    const vendors = data.entities.filter((e) => e.tags.includes('vendor'))
    const budgetLines = data.entities.filter((e) => e.tags.includes('budget'))
    const vendorWithoutBudget = vendors.filter(
      (v) => !budgetLines.some((b) => b.content.vendor_id === v.id)
    )
    if (vendorWithoutBudget.length > 0) {
      warnings.push(`${vendorWithoutBudget.length} vendors have no budget line`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  },

  bidirectional: true,
}

/**
 * DOCUMENTS PROJECTION
 * Contracts, devis, factures, justificatifs
 */
export const DocumentsProjection: ProjectionSchema = {
  name: 'Documents',
  domain: 'wedding',

  readRules: (entities: AIMemoryEntity[]) => {
    const documents = entities.filter(
      (e) => (e.type === 'entity' || e.type === 'fact') && e.tags.includes('document')
    )

    return {
      projection_name: 'Documents',
      domain: 'wedding',
      timestamp: new Date(),
      entities: documents,
      computed_fields: {},
      validation_status: 'valid',
      warnings: [],
    }
  },

  writeRules: (change: Mutation): CascadeInstruction[] => {
    const cascades: CascadeInstruction[] = []

    // If vendor info changes, documents might need update
    if (change.entity_type === 'vendor') {
      cascades.push({
        target_entity_id: change.entity_id,
        target_entity_type: 'document',
        field_to_change: 'status',
        new_value: 'needs_review',
        reason: `Vendor updated, related documents need review`,
        source_projection: 'Documents',
        validated: false,
      })
    }

    return cascades
  },

  computedFields: (entities: AIMemoryEntity[]) => {
    const documents = entities.filter((e) => e.tags.includes('document'))

    const byStatus = documents.reduce(
      (acc: Record<string, number>, d) => {
        const status = d.content.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {}
    )

    const byType = documents.reduce(
      (acc: Record<string, number>, d) => {
        const type = d.content.type || 'other'
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {}
    )

    return [
      {
        name: 'total_documents',
        value: documents.length,
        computed_at: new Date(),
        based_on: documents.map((d) => d.id),
      },
      {
        name: 'documents_by_status',
        value: byStatus,
        computed_at: new Date(),
        based_on: documents.map((d) => d.id),
      },
      {
        name: 'documents_by_type',
        value: byType,
        computed_at: new Date(),
        based_on: documents.map((d) => d.id),
      },
    ]
  },

  validations: (data: ProjectedData): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for unsigned documents
    const unsigned = data.entities.filter((e) => e.content.status !== 'signed')
    if (unsigned.length > 0) {
      warnings.push(`${unsigned.length} documents not yet signed`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  },

  bidirectional: true,
}

/**
 * PERSONS PROJECTION
 * Who is involved: vendors, guests, key contacts
 */
export const PersonsProjection: ProjectionSchema = {
  name: 'Persons',
  domain: 'wedding',

  readRules: (entities: AIMemoryEntity[]) => {
    const persons = entities.filter(
      (e) =>
        (e.type === 'entity' || e.type === 'fact') && (e.tags.includes('vendor') || e.tags.includes('guest'))
    )

    return {
      projection_name: 'Persons',
      domain: 'wedding',
      timestamp: new Date(),
      entities: persons,
      computed_fields: {},
      validation_status: 'valid',
      warnings: [],
    }
  },

  writeRules: (change: Mutation): CascadeInstruction[] => {
    return []
  },

  computedFields: (entities: AIMemoryEntity[]) => {
    const vendors = entities.filter((e) => e.tags.includes('vendor'))
    const guests = entities.filter((e) => e.tags.includes('guest'))

    return [
      {
        name: 'total_vendors',
        value: vendors.length,
        computed_at: new Date(),
        based_on: vendors.map((v) => v.id),
      },
      {
        name: 'total_guests',
        value: guests.length,
        computed_at: new Date(),
        based_on: guests.map((g) => g.id),
      },
      {
        name: 'vendors_by_role',
        value: Object.fromEntries(
          Array.from(
            vendors.reduce((acc, v) => {
              const role = v.content.role || 'unknown'
              acc.set(role, (acc.get(role) || 0) + 1)
              return acc
            }, new Map<string, number>())
          )
        ),
        computed_at: new Date(),
        based_on: vendors.map((v) => v.id),
      },
    ]
  },

  validations: (data: ProjectedData): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for persons without contact info
    const noContact = data.entities.filter((e) => !e.content.email && !e.content.phone)
    if (noContact.length > 0) {
      warnings.push(`${noContact.length} persons have no contact information`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  },

  bidirectional: true,
}

/**
 * Projection registry
 */
export const PROJECTION_SCHEMAS = {
  Timeline: TimelineProjection,
  Finance: FinanceProjection,
  Documents: DocumentsProjection,
  Persons: PersonsProjection,
} as const

export type ProjectionName = keyof typeof PROJECTION_SCHEMAS
