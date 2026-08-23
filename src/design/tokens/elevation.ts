// ---------------------------------------------------------------------------
// Soft Spatial UI — Elevation scale (6 levels).
// ---------------------------------------------------------------------------
// Before: 38 box-shadows dominated by `0 24px 64px rgba(0,0,0,0.8)` — a single
// heavy, opaque black drop. That reads as "pasted on top", not as depth.
//
// After: layered shadows at 10–18 % opacity. Depth becomes a language:
// each level means something, instead of every panel shouting equally.
// ---------------------------------------------------------------------------

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface ElevationSpec {
  level: ElevationLevel;
  name: string;
  /** Meaning of this level, so it is used consistently. */
  intent: string;
  /** For dark (World) surfaces. */
  shadowWorld: string;
  /** For light (Composition) surfaces. */
  shadowComposition: string;
}

export const elevation: Record<ElevationLevel, ElevationSpec> = {
  0: {
    level: 0, name: 'background', intent: 'Fond de scène ou de page. Jamais d’ombre.',
    shadowWorld: 'none',
    shadowComposition: 'none',
  },
  1: {
    level: 1, name: 'surface', intent: 'Élément éditorial quasi plat, posé sur le fond.',
    shadowWorld: '0 1px 2px rgba(0, 0, 0, 0.28)',
    shadowComposition: '0 1px 2px rgba(24, 20, 14, 0.06)',
  },
  2: {
    level: 2, name: 'data-object', intent: 'Carte ou statistique légèrement surélevée.',
    shadowWorld: '0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.20)',
    shadowComposition: '0 4px 16px rgba(24, 20, 14, 0.08), 0 1px 3px rgba(24, 20, 14, 0.05)',
  },
  3: {
    level: 3, name: 'spatial-object', intent: 'Maquette, visualisation, objet spatial.',
    shadowWorld: '0 12px 32px rgba(0, 0, 0, 0.34), 0 2px 8px rgba(0, 0, 0, 0.20)',
    shadowComposition: '0 12px 32px rgba(24, 20, 14, 0.10), 0 2px 8px rgba(24, 20, 14, 0.05)',
  },
  4: {
    level: 4, name: 'focus', intent: 'Élément actuellement sélectionné.',
    shadowWorld: '0 20px 48px rgba(0, 0, 0, 0.40), 0 3px 12px rgba(0, 0, 0, 0.24)',
    shadowComposition: '0 20px 48px rgba(24, 20, 14, 0.13), 0 3px 12px rgba(24, 20, 14, 0.06)',
  },
  5: {
    level: 5, name: 'world', intent: 'Immersion 3D : la profondeur est réelle, pas simulée.',
    shadowWorld: 'none',
    shadowComposition: 'none',
  },
};

/** Shadow for a level on a given surface family. */
export function shadowFor(level: ElevationLevel, on: 'world' | 'composition' = 'world'): string {
  const spec = elevation[level];
  return on === 'world' ? spec.shadowWorld : spec.shadowComposition;
}
