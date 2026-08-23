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
  /**
   * EDITORIAL scale — the Mirror.
   *
   * The `size` scale above is the dense World HUD, and the file always said so.
   * The Mirror was nevertheless consuming it, which is why an editorial site
   * ended up with 9px eyebrows and 12px body copy: readable on a 27" screen
   * from 40cm, small everywhere else, and well under any comfortable reading
   * size on a phone.
   *
   * These are the same steps, expressed fluidly between a 360px and a 1280px
   * viewport, with a floor that stays legible on a phone. Same mechanism as
   * fluid() in MirrorPrimitives — no second type system, no arbitrary values.
   */
  editorial: {
    micro: 'clamp(10px, calc(10px + 1 * ((100vw - 360px) / 920)), 11px)',
    caption: 'clamp(12px, calc(12px + 1 * ((100vw - 360px) / 920)), 13px)',
    body: 'clamp(14px, calc(14px + 2 * ((100vw - 360px) / 920)), 16px)',
    bodyLg: 'clamp(16px, calc(16px + 2 * ((100vw - 360px) / 920)), 18px)',
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
