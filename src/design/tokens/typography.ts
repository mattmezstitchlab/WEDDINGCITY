// ---------------------------------------------------------------------------
// Soft Spatial UI — Typography.
// ---------------------------------------------------------------------------
// No new font is introduced: the app already uses a system stack plus
// JetBrains Mono for data. This only formalises the editorial scale, so
// Composition surfaces can breathe with larger type than the dense World HUD.
// ---------------------------------------------------------------------------

export const typography = {
  family: {
    sans: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  /** World HUD stays dense; Composition uses the editorial end of the scale. */
  size: {
    micro: 9,
    caption: 10.5,
    body: 12,
    bodyLg: 13.5,
    title: 18,
    display: 28,
    hero: 42,
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  tracking: {
    /** Uppercase eyebrow labels. */
    label: '0.1em',
    normal: '0',
    /** Large editorial titles read better slightly tightened. */
    tight: '-0.015em',
  },
  leading: { tight: 1.25, normal: 1.5, relaxed: 1.65 },
} as const;
