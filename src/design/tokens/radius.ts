// ---------------------------------------------------------------------------
// Soft Spatial UI — Radius scale.
// ---------------------------------------------------------------------------
// The audit measured 114 corner radii of 8px or less (58×8, 40×6, 16×4), which
// is what makes the interface read as "boxy". This scale replaces ad-hoc values
// for NEW surfaces. Existing inline styles are untouched and keep working.
// ---------------------------------------------------------------------------

export const radius = {
  /** Chips, badges, inline controls. */
  xs: 8,
  /** Inputs, small data objects. */
  sm: 12,
  /** Cards, list rows. */
  md: 16,
  /** Panels, editorial surfaces. */
  lg: 22,
  /** Full-bleed composition surfaces. */
  xl: 28,
  /** Dots, pills, avatars. */
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
