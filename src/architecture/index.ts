/**
 * AIME ARCHITECTURE INDEX
 *
 * Central export point for all AIME architecture layers
 * - Universal memory (domain-agnostic)
 * - Domain adapters (domain-specific rules)
 * - Projection schemas (different views)
 * - Query/Mutation/Cascade (data consistency engine)
 * - Dual-write adapter (legacy migration)
 */

export * from './aiMemory'
export * from './domainAdapters'
export * from './projectionSchemas'
export * from './queryMutationCascade'
export * from './dualWriteAdapter'

/**
 * SECTION 1: MIGRATION STRATEGY - COMPLETE
 * 
 * All foundation layers created and validated:
 * ✅ Universal memory model (AIMemoryEntity, DecisionRecord)
 * ✅ Domain adapter (Wedding entity factories, validations, cascades)
 * ✅ Projection schemas (Timeline, Finance, Documents, Persons with bidirectional sync)
 * ✅ Query/Mutation/Cascade engine (data consistency)
 * ✅ Dual-write adapter (zero-loss migration from weddingStore)
 *
 * Next steps (Section 2):
 * - Wire up React components to ProjectionSyncSystem
 * - Test cascade logic with real data
 * - Perform 2-week parallel run
 * - Migrate 40+ existing projects
 * - Validate bidirectional sync
 * - Perform cutover when ready
 */
