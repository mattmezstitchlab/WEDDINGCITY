// ---------------------------------------------------------------------------
// Soft Spatial UI — 3D material tokens.
// ---------------------------------------------------------------------------
// Audit findings this replaces:
//   · 17 surfaces at metalness >= 0.7 → hard speculars with nothing to reflect
//   · 8 surfaces at roughness <= 0.3  → glossy, the opposite of the matte brief
//   · emissiveIntensity up to 1.2     → neon, not material
//
// Reference: a premium architectural model photographed in a studio.
// Metal is now RESERVED for elements where it carries meaning.
// ---------------------------------------------------------------------------

export interface MaterialToken {
  roughness: number;
  metalness: number;
  /** Cap for emissive intensity when this material glows. */
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

export const materials = {
  /** Default for architecture, ground, furniture. Plaster / matte model. */
  matte: { roughness: 0.88, metalness: 0.02 },
  /** Slightly reactive surfaces: fabric, foliage, painted wood. */
  soft: { roughness: 0.72, metalness: 0.05 },
  /** Skin / voxel character bodies. */
  skin: { roughness: 0.78, metalness: 0.0 },
  /** Milky translucency — glazing, canopies, soft panels. */
  milk: { roughness: 0.55, metalness: 0.0, transparent: true, opacity: 0.42 },
  /** Water, polished floors: reflective WITHOUT being metallic. */
  polished: { roughness: 0.28, metalness: 0.08 },
  /** The only true metal left: brass fittings, signage frames. */
  brass: { roughness: 0.42, metalness: 0.55 },
  /** Active / selected state. Emissive is a SIGNAL, capped low. */
  signal: { roughness: 0.6, metalness: 0.0, emissiveIntensity: 0.3 },
} as const satisfies Record<string, MaterialToken>;

export type MaterialName = keyof typeof materials;

/** Hard ceiling applied when softening legacy materials. */
export const MATERIAL_LIMITS = {
  maxMetalness: 0.55,
  minRoughness: 0.28,
  maxEmissiveIntensity: 0.45,
} as const;
