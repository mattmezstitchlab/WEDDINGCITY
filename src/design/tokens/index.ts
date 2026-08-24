// ---------------------------------------------------------------------------
// Soft Spatial UI — token entry point.
// ---------------------------------------------------------------------------
// COMPATIBILITY CONTRACT
// ----------------------
// `src/game/brand.ts` stays exactly as it is: the 540 existing inline styles
// keep importing BRAND_* from it (directly or re-exported via weddingStore)
// and are NOT migrated in this phase.
//
// This module is the entry point for NEW surfaces. It re-exports the BRAND_*
// constants too, so a component can pull everything from one place without
// anything old breaking.
//
// DEPENDENCY RULE: tokens must stay a leaf group. They may import `brand.ts`
// (itself a leaf) and nothing else from the app. Enforced by
// scripts/check-startup.mjs.
// ---------------------------------------------------------------------------

export * from './radius';
export * from './elevation';
export * from './surfaces';
export * from './materials';
export * from './relationships';
export * from './dmc';
export * from './typography';

// Legacy colour constants, re-exported so new code has a single import site.
export {
  BRAND_ACCENT,
  BRAND_BG,
  BRAND_SURFACE,
  BRAND_SURFACE_HOVER,
  BRAND_BORDER,
  BRAND_BORDER_ACTIVE,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/brand';
