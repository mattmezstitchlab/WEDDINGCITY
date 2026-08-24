// ---------------------------------------------------------------------------
// Wedding City — Design System Constants (Apple Vision Pro / Spatial)
// ---------------------------------------------------------------------------
// This module is deliberately DEPENDENCY-FREE.
//
// It exists to break the module cycle that used to crash the app at startup:
//
//   weddingStore.ts  --imports INITIAL_AD_SLOTS-->  advertisingEngine.ts
//   advertisingEngine.ts  --imports BRAND_ACCENT-->  weddingStore.ts
//
// Under native ESM semantics (which Vite uses in dev), `advertisingEngine`
// was evaluated BEFORE the body of `weddingStore`, so reading `BRAND_ACCENT`
// at module-evaluation time threw:
//
//   ReferenceError: Cannot access 'BRAND_ACCENT' before initialization
//
// Production only appeared to work because esbuild's minifier inlined the
// string literal, making the binding disappear. Any change to the build
// config would have re-broken production.
//
// RULE: this file must never import from anything inside the app.
// Enforced by `scripts/check-cycles.mjs`.
// ---------------------------------------------------------------------------

export const BRAND_ACCENT = '#e2b448'; // Refined Champagne Titanium / Warm Light
export const BRAND_BG = '#08090d';
export const BRAND_SURFACE = '#12151e';
export const BRAND_SURFACE_HOVER = '#181c28';
export const BRAND_BORDER = 'rgba(255, 255, 255, 0.09)';
export const BRAND_BORDER_ACTIVE = 'rgba(226, 180, 72, 0.6)';
export const BRAND_TEXT_MUTED = '#717684';
export const BRAND_TEXT_PRIMARY = '#f5f5f7';
export const BRAND_TEXT_SECONDARY = '#9ba1b0';
