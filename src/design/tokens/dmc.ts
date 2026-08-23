// ---------------------------------------------------------------------------
// Soft Spatial UI — DMC as a SIGNAL, never decoration.
// ---------------------------------------------------------------------------
// THE RULE (PHASE-A §8, enforced by scripts/check-dataviz.mjs):
//
//   A DMC colour may only appear as a dot, a rule, a halo, a badge or a
//   border. It must NEVER fill a container background, and must never cover
//   more than ~15 % of a component's surface.
//
// The point is scarcity: when almost everything is neutral, a colour means
// something the instant it appears.
// ---------------------------------------------------------------------------

export const dmcSignal = {
  /** Maximum share of a component's area a DMC colour may occupy. */
  maxSurfaceRatio: 0.15,

  dot: { size: 8, ring: 1 },
  /** Left/top colour slice on a card. */
  slice: { thickness: 3, length: '38%' },
  badge: { paddingX: 7, paddingY: 3, radius: 999, alpha: 0.16, borderAlpha: 0.42 },
  /** Soft presence halo around an entity. */
  halo: { blur: 14, spread: 0, alpha: 0.22 },
  line: { width: 1.25, alpha: 0.5 },
} as const;

/** Tint of a DMC colour, for badges and halos. Never a solid fill. */
export function dmcTint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(226, 180, 72, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Neutral fallback when a person has NO DMC identity.
 * Deliberately grey: absence of identity must read as absence, not as a
 * randomly assigned colour that would fabricate meaning.
 */
export const DMC_NEUTRAL = '#6b7280';

/**
 * The ONLY approved way for a DMC colour to reach a `background`.
 *
 * A raw `background: dmcColor` is forbidden by scripts/check-dataviz.mjs
 * because a static checker cannot tell an 8px dot from a full-bleed panel.
 * Routing every legitimate case through these helpers keeps the rule
 * enforceable while making the intent explicit at the call site.
 */
export function dmcDotStyle(color: string, size = dmcSignal.dot.size) {
  return {
    width: size,
    height: size,
    borderRadius: 999,
    background: color,
    flex: '0 0 auto',
  } as const;
}

/** Thin colour slice on the edge of a card. Never a fill. */
export function dmcSliceStyle(color: string, side: 'left' | 'top' = 'left') {
  return side === 'left'
    ? { width: dmcSignal.slice.thickness, height: dmcSignal.slice.length, background: color, borderRadius: 999 } as const
    : { height: dmcSignal.slice.thickness, width: dmcSignal.slice.length, background: color, borderRadius: 999 } as const;
}
