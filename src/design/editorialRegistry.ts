// ---------------------------------------------------------------------------
// EDITORIAL REGISTRY — the product's own pictures, and nothing else.
// ---------------------------------------------------------------------------
// THE DISTINCTION THIS FILE EXISTS TO ENFORCE
//
//   A. EDITORIAL ASSETS (this file) belong to the PRODUCT, like its typeface.
//      They dress the public page, the demonstrations and the examples. They
//      may show a face, a sleeve, a record cover — anything that makes the
//      product legible.
//
//   B. USER DATA (the store) belongs to a couple. It stays strictly honest:
//      nothing here may ever be copied into a project, persisted in a
//      MediaAsset, or created by the act of creating an event.
//
// The separation is STRUCTURAL, not a matter of discipline:
//   · this module imports nothing from `src/game` — it cannot reach the store;
//   · it exports plain paths under /editorial, and the persistence tests fail
//     if that string ever appears in a project snapshot;
//   · every demonstration that uses it is labelled as a demonstration.
//
// So the landing can be spectacular, and a new wedding still starts empty.
// ---------------------------------------------------------------------------

export interface EditorialAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Portraits used by the public demonstration. Never a real guest. */
export const EDITORIAL_PEOPLE: {
  id: string;
  role: string;
  /** A first name for the demonstration — never a real guest of yours. */
  firstName: string;
  name: string;
  portrait: EditorialAsset;
  /** The thread this person follows through the demonstration day. */
  thread: { hour: string; moment: string }[];
}[] = [
  {
    id: 'demo_mariee',
    role: 'la mariée',
    firstName: 'Émilie',
    name: 'Portrait de démonstration',
    portrait: {
      src: '/editorial/people/mariee.jpg',
      alt: 'Portrait éditorial d’une mariée près d’une fenêtre, lumière du matin',
      width: 1024, height: 1024,
    },
    thread: [
      { hour: '08:30', moment: 'Préparatifs' },
      { hour: '11:00', moment: 'Cérémonie' },
      { hour: '17:30', moment: 'Cocktail' },
      { hour: '21:00', moment: 'Première danse' },
    ],
  },
  {
    id: 'demo_temoin',
    role: 'témoin',
    firstName: 'Camille',
    name: 'Portrait de démonstration',
    portrait: {
      src: '/editorial/people/temoin.jpg',
      alt: 'Portrait éditorial d’un témoin en robe olive, lumière d’après-midi',
      width: 1024, height: 1024,
    },
    thread: [
      { hour: '11:00', moment: 'Cérémonie' },
      { hour: '20:15', moment: 'Discours' },
      { hour: '21:00', moment: 'Première danse' },
    ],
  },
  {
    id: 'demo_photographe',
    role: 'photographe',
    firstName: 'Paul',
    name: 'Portrait de démonstration',
    portrait: {
      src: '/editorial/people/photographe.jpg',
      alt: 'Portrait éditorial d’un photographe avec son appareil, fin de journée',
      width: 1024, height: 1024,
    },
    thread: [
      { hour: '08:30', moment: 'Préparatifs' },
      { hour: '11:00', moment: 'Cérémonie' },
      { hour: '17:30', moment: 'Cocktail' },
    ],
  },
];

/**
 * Record sleeves for the music demonstration.
 *
 * They are ABSTRACT artworks made for this product — not the covers of real
 * records, and not attributed to any artist. The demonstration therefore shows
 * how the music layer looks without claiming a catalogue it does not have.
 */
export const EDITORIAL_COVERS: EditorialAsset[] = [
  { src: '/editorial/covers/cover-01.jpg', alt: 'Pochette de démonstration — sphère ambrée', width: 1024, height: 1024 },
  { src: '/editorial/covers/cover-02.jpg', alt: 'Pochette de démonstration — soie ivoire', width: 1024, height: 1024 },
  { src: '/editorial/covers/cover-03.jpg', alt: 'Pochette de démonstration — lumières de piste', width: 1024, height: 1024 },
];

/** The music demonstration: three tracks that really occupy time. */
export const EDITORIAL_TRACKS: {
  id: string;
  title: string;
  artist: string;
  /** Seconds — the demonstration recomputes the hours from these. */
  seconds: number;
  cover: EditorialAsset;
  moment: string;
}[] = [
  { id: 'demo_track_1', title: 'Ouverture', artist: 'Démonstration', seconds: 225, cover: EDITORIAL_COVERS[0], moment: 'Première danse' },
  { id: 'demo_track_2', title: 'Second souffle', artist: 'Démonstration', seconds: 198, cover: EDITORIAL_COVERS[1], moment: 'Première danse' },
  { id: 'demo_track_3', title: 'Plein feu', artist: 'Démonstration', seconds: 252, cover: EDITORIAL_COVERS[2], moment: 'Party' },
];

/** The one sentence every demonstration surface must be able to show. */
export const EDITORIAL_DISCLAIMER =
  'Démonstration : images et morceaux appartiennent au produit, jamais à votre événement.';

// ---------------------------------------------------------------------------
// SPECTACLE — those who make the moment happen.
// ---------------------------------------------------------------------------
// Product photographs again: a stage, a control desk, a beam of light. They
// illustrate the crafts, they are never a real supplier of yours.

export const SPECTACLE_VISUALS: Record<'danseuse' | 'musicien' | 'regie' | 'coulisses', EditorialAsset> = {
  danseuse: {
    src: '/editorial/spectacle/danseuse.jpg',
    alt: 'Une danseuse en mouvement dans un faisceau de lumière, scène noire',
    width: 1376, height: 768,
  },
  musicien: {
    src: '/editorial/spectacle/musicien.jpg',
    alt: 'Un saxophoniste sur scène, halo ambré dans la fumée',
    width: 1376, height: 768,
  },
  regie: {
    src: '/editorial/spectacle/regie.jpg',
    alt: 'Une console son et lumière de nuit, mains sur les faders',
    width: 1376, height: 768,
  },
  coulisses: {
    src: '/editorial/spectacle/coulisses.jpg',
    alt: 'Coulisses avant le spectacle : câbles, pied de projecteur, ouverture de scène éclairée',
    width: 1376, height: 768,
  },
};

/** The crafts the product knows how to name. Vocabulary, not data. */
export const SPECTACLE_CRAFTS: string[] = [
  'Danseuse', 'Musicien', 'Saxophoniste', 'Chanteur', 'DJ',
  'Éclairagiste', 'Technicien son', 'Technicienne lumière', 'Régisseur',
  'Vidéaste', 'Photographe', 'Performer', 'Artiste circassien',
  'Comédien', 'Scénographe', 'Stage manager',
];
