/**
 * WEDDING DOMAIN ADAPTER
 *
 * Defines how the wedding domain uses AIME MEMORY
 * - Entity factory functions
 * - Cascade rules (what changes when)
 * - Validations (domain-specific business rules)
 */

import type { AIMemoryEntity } from './aiMemory'

/**
 * Create a Vendor entity
 */
export function createVendor(data: {
  id: string
  name: string
  role: string
  amount: number
  deposit?: number
  contact?: string
  company?: string
  category?: string
  scheduled_date?: Date
  notes?: string
  certainty?: number
}): AIMemoryEntity {
  return {
    id: data.id,
    type: 'entity', // Abstract type: this is an entity
    domain: 'wedding',
    created_at: new Date(),
    updated_at: new Date(),
    certainty: data.certainty || 0.9,
    reason_for_certainty: 'Wedding vendor confirmed',
    tags: ['wedding', 'vendor', data.role.toLowerCase()],
    source: {
      validated_by: 'system',
      timestamp: new Date(),
    },
    content: {
      entity_type: 'vendor', // Domain-specific type
      name: data.name,
      role: data.role,
      amount: data.amount,
      deposit: data.deposit,
      contact: data.contact,
      company: data.company,
      category: data.category,
      scheduled_date: data.scheduled_date,
      notes: data.notes,
    },
    decision_trail: [
      {
        timestamp: new Date(),
        sequence_number: 0,
        validated_by: 'system',
        original_extraction: {
          facts: {
            name: data.name,
            role: data.role,
            amount: data.amount,
          },
          certainty: data.certainty || 0.9,
          reasoning: 'Wedding vendor created',
        },
        impact_analysis: {
          changed_at: new Date(),
          changed_by: 'system',
          affected_projections: ['timeline', 'finance', 'persons'],
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
 * Create a Guest entity
 */
export function createGuest(data: {
  id: string
  name: string
  email?: string
  phone?: string
  plus_ones?: number
  dietary_restrictions?: string
  rsvp_status?: 'pending' | 'accepted' | 'declined'
  notes?: string
}): AIMemoryEntity {
  return {
    id: data.id,
    type: 'entity',
    domain: 'wedding',
    created_at: new Date(),
    updated_at: new Date(),
    certainty: 0.8,
    reason_for_certainty: 'Wedding guest added',
    tags: ['wedding', 'guest'],
    source: {
      validated_by: 'system',
      timestamp: new Date(),
    },
    content: {
      entity_type: 'guest',
      name: data.name,
      email: data.email,
      phone: data.phone,
      plus_ones: data.plus_ones,
      dietary_restrictions: data.dietary_restrictions,
      rsvp_status: data.rsvp_status || 'pending',
      notes: data.notes,
    },
    decision_trail: [
      {
        timestamp: new Date(),
        sequence_number: 0,
        validated_by: 'system',
        original_extraction: {
          facts: { name: data.name, rsvp_status: data.rsvp_status || 'pending' },
          certainty: 0.8,
          reasoning: 'Wedding guest added',
        },
        impact_analysis: {
          changed_at: new Date(),
          changed_by: 'system',
          affected_projections: ['persons', 'timeline'],
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
 * Create a Budget Line entity
 */
export function createBudgetLine(data: {
  id: string
  name: string
  amount: number
  category?: string
  vendor_id?: string
  status?: string
}): AIMemoryEntity {
  return {
    id: data.id,
    type: 'entity',
    domain: 'wedding',
    created_at: new Date(),
    updated_at: new Date(),
    certainty: 0.9,
    reason_for_certainty: 'Budget line confirmed',
    tags: ['wedding', 'budget', data.category || 'other'],
    source: {
      validated_by: 'system',
      timestamp: new Date(),
    },
    content: {
      entity_type: 'budget_line',
      name: data.name,
      amount: data.amount,
      category: data.category || 'other',
      vendor_id: data.vendor_id,
      status: data.status || 'estimated',
    },
    decision_trail: [
      {
        timestamp: new Date(),
        sequence_number: 0,
        validated_by: 'system',
        original_extraction: {
          facts: { name: data.name, amount: data.amount },
          certainty: 0.9,
          reasoning: 'Budget line created',
        },
        impact_analysis: {
          changed_at: new Date(),
          changed_by: 'system',
          affected_projections: ['finance'],
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
 * Create a Document entity
 */
export function createDocument(data: {
  id: string
  title: string
  type: string
  content: string
  related_entity_id?: string
  status?: string
}): AIMemoryEntity {
  return {
    id: data.id,
    type: 'entity',
    domain: 'wedding',
    created_at: new Date(),
    updated_at: new Date(),
    certainty: 0.95,
    reason_for_certainty: 'Document confirmed',
    tags: ['wedding', 'document', data.type],
    source: {
      validated_by: 'system',
      timestamp: new Date(),
    },
    content: {
      entity_type: 'document',
      title: data.title,
      type: data.type,
      content: data.content,
      related_entity_id: data.related_entity_id,
      status: data.status || 'draft',
    },
    decision_trail: [
      {
        timestamp: new Date(),
        sequence_number: 0,
        validated_by: 'system',
        original_extraction: {
          facts: { title: data.title, type: data.type },
          certainty: 0.95,
          reasoning: 'Document created',
        },
        impact_analysis: {
          changed_at: new Date(),
          changed_by: 'system',
          affected_projections: ['documents'],
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
 * Wedding cascade rules
 * Defines what changes when a vendor/budget/date changes
 */
export const WEDDING_CASCADE_RULES = [
  {
    trigger: 'vendor.amount_changed',
    cascades_to: ['timeline_review', 'finance_recalculation', 'budget_cascade'],
    description: 'When vendor cost changes, review date conflicts, update budget, recalc totals',
  },
  {
    trigger: 'vendor.scheduled_date_changed',
    cascades_to: ['timeline_conflict_check', 'guest_notification', 'logistics_review'],
    description: 'When vendor date changes, check conflicts, notify guests, review logistics',
  },
  {
    trigger: 'budget_line.amount_changed',
    cascades_to: ['finance_totals', 'timeline_cash_flow', 'vendor_review'],
    description: 'When budget changes, recalc finance, check cash flow, vendor impact',
  },
  {
    trigger: 'guest.rsvp_changed',
    cascades_to: ['timeline_headcount', 'catering_impact', 'venue_check'],
    description: 'When guest RSVPs, update headcount, recalc catering, check venue capacity',
  },
  {
    trigger: 'document.status_changed_to_signed',
    cascades_to: ['finance_confirmed', 'vendor_confirmed', 'timeline_locked'],
    description: 'When contract signed, confirm finance, lock timeline, vendor confirmed',
  },
] as const

/**
 * Wedding domain validations
 */
export function validateWeddingEntity(entity: AIMemoryEntity): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const entityType = entity.content.entity_type

  if (entityType === 'vendor') {
    if (!entity.content.name) errors.push('Vendor must have a name')
    if (!entity.content.role) errors.push('Vendor must have a role')
    if (typeof entity.content.amount !== 'number' || entity.content.amount < 0)
      errors.push('Vendor amount must be a positive number')
  }

  if (entityType === 'guest') {
    if (!entity.content.name) errors.push('Guest must have a name')
    if (entity.content.plus_ones !== undefined && entity.content.plus_ones < 0)
      errors.push('Plus ones cannot be negative')
  }

  if (entityType === 'budget_line') {
    if (!entity.content.name) errors.push('Budget line must have a name')
    if (typeof entity.content.amount !== 'number' || entity.content.amount < 0)
      errors.push('Budget line amount must be a positive number')
  }

  if (entityType === 'document') {
    if (!entity.content.title) errors.push('Document must have a title')
    if (!entity.content.type) errors.push('Document must have a type')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Wedding terminology mapping
 * Maps system concepts to user-facing language
 */
export const WEDDING_TERMINOLOGY = {
  vendor: 'Prestataire',
  guest: 'Invité',
  budget_line: 'Poste budgétaire',
  document: 'Document',
  moment: 'Moment clé',

  confirmed: 'Confirmé',
  pending: 'En attente',
  paid: 'Payé',
  draft: 'Brouillon',
  signed: 'Signé',

  finance: 'Bureau Financier',
  timeline: 'Chronologie',
  persons: 'Personnes',
  documents: 'Documents',
} as const

/**
 * Common wedding domains that can reuse this adapter
 */
export type ApplicableDomain =
  | 'wedding'
  | 'event'
  | 'festival'
  | 'conference'
  | 'corporate_event'
  | 'private_party'
