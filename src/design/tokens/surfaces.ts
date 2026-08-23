// ---------------------------------------------------------------------------
// Soft Spatial UI — Surfaces.
// ---------------------------------------------------------------------------
// Two families, ONE system (see PHASE-A §2). A global dark→ivory inversion
// would have meant rewriting ~540 inline styles and re-balancing the whole 3D
// light rig. Instead:
//
//   WORLD       — dark, immersive, where the 3D scene lives (unchanged)
//   COMPOSITION — ivory, editorial, projected ON TOP of the world
//
// Composition is deliberately not a separate design system: it shares radius,
// elevation and DMC tokens with the world.
// ---------------------------------------------------------------------------

export const surfaces = {
  world: {
    bg: '#08090d',
    surface: '#12151e',
    surfaceHover: '#181c28',
    /** Hairline, 9 % — kept from the existing language. */
    line: 'rgba(255, 255, 255, 0.09)',
    textPrimary: '#f5f5f7',
    textSecondary: '#9ba1b0',
    textMuted: '#717684',
  },
  composition: {
    /** Warm ivory, not pure white: paper, not screen. */
    bg: '#F7F5F0',
    surface: '#FFFDFA',
    surfaceHover: '#FBF8F3',
    /** Milky veil over the world. No backdrop blur: the audit found zero, and
     *  we are explicitly not adding glassmorphism. */
    veil: 'rgba(255, 253, 250, 0.94)',
    /** 8 % ink instead of a 100 % rule. */
    line: 'rgba(16, 18, 24, 0.08)',
    lineStrong: 'rgba(16, 18, 24, 0.14)',
    textPrimary: '#16181d',
    textSecondary: '#4b5059',
    textMuted: '#8a8f99',
  },
} as const;

export type SurfaceFamily = keyof typeof surfaces;
