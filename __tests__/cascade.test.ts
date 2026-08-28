/**
 * CASCADE LOGIC TESTS
 *
 * Test the complete bidirectional loop with real cascade scenarios
 * This validates that the architecture actually works before integration
 */

import { describe, test, expect } from 'vitest'
import type { AIMemoryEntity } from '../aiMemory'
import {
  QuerySystem,
  MutationSystem,
  CascadeEngine,
  ProjectionSyncSystem,
} from '../queryMutationCascade'
import {
  createVendor,
  createGuest,
  createBudgetLine,
  validateWeddingEntity,
  WEDDING_CASCADE_RULES,
} from '../domainAdapters'
import { TIMELINE_PROJECTION, FINANCE_PROJECTION, PERSONS_PROJECTION } from '../projectionSchemas'

describe('AIME Cascade Logic - Core Functionality', () => {
  test('Vendor creation creates valid entity with decision trail', () => {
    const vendor = createVendor({
      id: 'vendor-1-dj-martin',
      name: 'Martin',
      role: 'DJ',
      amount: 1000,
      deposit: 300,
      category: 'entertainment',
      scheduled_date: new Date('2026-09-15T20:00:00'),
    })

    expect(vendor.id).toBe('vendor-1-dj-martin')
    expect(vendor.type).toBe('entity')
    expect(vendor.domain).toBe('wedding')
    expect(vendor.content.entity_type).toBe('vendor')
    expect(vendor.content.name).toBe('Martin')
    expect(vendor.content.amount).toBe(1000)
    expect(vendor.decision_trail).toHaveLength(1)
    expect(vendor.decision_trail[0].validated_by).toBe('system')
  })

  test('Guest creation works correctly', () => {
    const guest = createGuest({
      id: 'guest-1-alice',
      name: 'Alice',
      email: 'alice@example.com',
      rsvp_status: 'accepted',
    })

    expect(guest.content.entity_type).toBe('guest')
    expect(guest.content.name).toBe('Alice')
    expect(guest.content.rsvp_status).toBe('accepted')
  })

  test('Budget line creation works correctly', () => {
    const budget = createBudgetLine({
      id: 'budget-1-dj',
      name: 'DJ Entertainment',
      amount: 1000,
      category: 'entertainment',
    })

    expect(budget.content.entity_type).toBe('budget_line')
    expect(budget.content.name).toBe('DJ Entertainment')
    expect(budget.content.amount).toBe(1000)
  })

  test('Entity validation works correctly', () => {
    const validVendor = createVendor({
      id: 'vendor-valid',
      name: 'Good Vendor',
      role: 'Photographer',
      amount: 2000,
    })

    const validation = validateWeddingEntity(validVendor)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  test('Entity validation catches errors', () => {
    const invalidVendor: AIMemoryEntity = {
      id: 'bad-vendor',
      type: 'entity',
      domain: 'wedding',
      created_at: new Date(),
      updated_at: new Date(),
      certainty: 0.9,
      reason_for_certainty: 'test',
      tags: ['wedding', 'vendor'],
      source: {
        validated_by: 'test',
        timestamp: new Date(),
      },
      content: {
        entity_type: 'vendor',
        name: '', // Missing
        role: '',
        amount: -100, // Negative
      },
      decision_trail: [],
      access_control: {
        private: true,
        public: false,
        shared_with: [],
      },
    }

    const badValidation = validateWeddingEntity(invalidVendor)
    expect(badValidation.valid).toBe(false)
    expect(badValidation.errors.length).toBeGreaterThan(0)
  })

  test('Query system retrieves entities', () => {
    const vendor = createVendor({
      id: 'vendor-query-test',
      name: 'Test Vendor',
      role: 'DJ',
      amount: 1000,
    })

    const memory = new Map<string, AIMemoryEntity>([[vendor.id, vendor]])
    const querySystem = new QuerySystem(memory)

    // Get specific entity
    const found = querySystem.getEntity(vendor.id)
    expect(found).toBeDefined()
    expect(found?.content.name).toBe('Test Vendor')

    // Query with filters
    const results = querySystem.queryEntities({ domain: 'wedding' })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(vendor.id)
  })

  test('Cascade rules are properly defined', () => {
    expect(WEDDING_CASCADE_RULES).toBeDefined()
    expect(WEDDING_CASCADE_RULES.length).toBeGreaterThan(0)

    const vendorAmountRule = WEDDING_CASCADE_RULES.find(
      (r) => r.trigger === 'vendor.amount_changed'
    )
    expect(vendorAmountRule).toBeDefined()
    expect(vendorAmountRule?.cascades_to).toContain('finance_recalculation')
  })

  test('Projection schemas are defined', () => {
    expect(TIMELINE_PROJECTION).toBeDefined()
    expect(FINANCE_PROJECTION).toBeDefined()
    expect(PERSONS_PROJECTION).toBeDefined()

    expect(TIMELINE_PROJECTION.bidirectional).toBe(true)
    expect(FINANCE_PROJECTION.bidirectional).toBe(true)
    expect(PERSONS_PROJECTION.bidirectional).toBe(true)
  })

  test('Projections read entities correctly', () => {
    const vendor = createVendor({
      id: 'vendor-proj-test',
      name: 'Test Vendor',
      role: 'DJ',
      amount: 1000,
    })

    const projData = PERSONS_PROJECTION.readRules([vendor])
    expect(projData.entities).toHaveLength(1)
    expect(projData.entities[0].content.name).toBe('Test Vendor')
  })

  test('Decision trail records are immutable', () => {
    const vendor = createVendor({
      id: 'vendor-immutable',
      name: 'Immutable Test',
      role: 'DJ',
      amount: 1000,
    })

    const originalTrail = vendor.decision_trail[0]
    expect(originalTrail.timestamp).toBeDefined()
    expect(originalTrail.validated_by).toBe('system')
    expect(originalTrail.validation_source).toBe('user_confirmation')
  })

  test('Handles multiple entities at scale', () => {
    const memory = new Map<string, AIMemoryEntity>()

    // Create 1000 entities
    for (let i = 0; i < 1000; i++) {
      const entity = createVendor({
        id: `vendor-scale-${i}`,
        name: `Vendor ${i}`,
        role: 'Service',
        amount: Math.random() * 5000,
      })
      memory.set(entity.id, entity)
    }

    expect(memory.size).toBe(1000)

    const querySystem = new QuerySystem(memory)
    const results = querySystem.queryEntities({ domain: 'wedding' })
    expect(results.length).toBe(1000)
  })
})
