// ---------------------------------------------------------------------------
// Soft Spatial UI — Relationship lines.
// ---------------------------------------------------------------------------
// Links must appear WHEN THEY CARRY MEANING, and stay quiet otherwise.
// Straight saturated segments (#00ffff, #ff4d88) read as a technical network;
// thin curves with progressive opacity read as proximity.
// ---------------------------------------------------------------------------

export const relationships = {
  /** Sub-pixel hairline: present, never loud. */
  hairline: 0.75,
  width: { hair: 0.75, thin: 1, active: 1.5 },
  opacity: {
    /** Visible but recessive. */
    rest: 0.18,
    hover: 0.32,
    /** Selected relation. */
    active: 0.45,
    /** Beyond ~2 hops. */
    distant: 0.08,
  },
  /** Curvature as a fraction of the chord length. Never a straight segment. */
  curvature: 0.18,
  /** Amplitude of the breathing on an active link. Deliberately tiny. */
  pulse: { amplitude: 0.08, periodMs: 2600 },
  /** Opacity multiplier per additional hop from the origin. */
  depthFalloff: 0.55,
} as const;
