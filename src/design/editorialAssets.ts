// ---------------------------------------------------------------------------
// EDITORIAL ASSETS — pictures that belong to the PRODUCT, not to a wedding.
// ---------------------------------------------------------------------------
// There are two completely separate kinds of image in this application, and
// they must never be confused:
//
//   1. MediaAsset — a real file attached to a real entity of a real wedding.
//      Created by a user in the Canvas (or confirmed from an enrichment), it
//      lives in weddingStore.media, it is persisted per project, it appears in
//      the gallery and in the counters. NOTHING is ever seeded there.
//
//   2. Editorial assets — the images below. They illustrate the landing page,
//      the way a brochure illustrates a product. They are static files served
//      from /public/editorial, they are NEVER written to the store, never
//      attached to a project, never counted, never persisted.
//
// HONESTY: these are generated illustrations made for this product page. They
// do not depict a real wedding, they are not stock photography of real people,
// and no face is identifiable in any of them. They are never presented as
// somebody's wedding photographs — a project with no media still says so.
//
// This module deliberately imports nothing from the game engine, so it is
// structurally impossible for it to reach the store.
// ---------------------------------------------------------------------------

export interface EditorialAsset {
  /** Public URL of the static file. */
  src: string;
  /** Real alternative text — describes the illustration, claims nothing else. */
  alt: string;
  /** Intrinsic size, so the browser can reserve the space before loading. */
  width: number;
  height: number;
}

export const EDITORIAL_ASSETS = {
  hero: {
    src: '/editorial/hero.jpg',
    alt: 'Longue table dressée sous la verrière d’une orangerie, en fin de journée',
    width: 1408,
    height: 768,
  },
  matter: {
    src: '/editorial/matter.jpg',
    alt: 'Lin froissé, deux alliances et une branche d’eucalyptus, lumière rasante',
    width: 1408,
    height: 768,
  },
  world: {
    src: '/editorial/world.jpg',
    alt: 'Vue aérienne d’un domaine au crépuscule : jardins, chapelle et pavillon de verre',
    width: 1408,
    height: 768,
  },
  mirror: {
    src: '/editorial/mirror.jpg',
    alt: 'Programme imprimé et livret de papier ivoire posés sur une table de pierre',
    width: 1408,
    height: 768,
  },
  canvas: {
    src: '/editorial/canvas.jpg',
    alt: 'Composition florale en cours sur une table claire : tiges, ciseaux, serviettes de lin',
    width: 1408,
    height: 768,
  },
  immersive: {
    src: '/editorial/immersive.jpg',
    alt: 'Cortège lointain traversant une grande prairie à la lumière du soir',
    width: 1584,
    height: 672,
  },
} as const satisfies Record<string, EditorialAsset>;

/** Every editorial file, for the isolation guard. */
export const EDITORIAL_SRCS = Object.values(EDITORIAL_ASSETS).map((a) => a.src);

/** True when a source is one of the product's own illustrations. */
export function isEditorialAsset(source: string): boolean {
  return EDITORIAL_SRCS.some((src) => source === src || source.endsWith(src));
}
