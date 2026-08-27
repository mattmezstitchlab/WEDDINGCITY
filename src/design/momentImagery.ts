// ---------------------------------------------------------------------------
// MOMENT IMAGERY — product pictures, never the wedding's own photographs.
// ---------------------------------------------------------------------------
// A moment of the day deserves a real image, not a grey rectangle. These are
// PRODUCT assets shipped in /public/editorial/moments: they belong to the
// application the way a typeface does, and they are chosen from the moment's
// own name — a pure function of data the couple typed.
//
// THREE RULES, enforced by tests:
//   1. nothing here is ever written into a wedding's data. A moment picture is
//      resolved at render time; the project keeps `media: 0` until a real
//      photograph is imported.
//   2. as soon as the couple attaches their OWN image to a moment, that image
//      wins — see momentImage(). The product picture is a placeholder for a
//      day that has not happened yet, not a fake memory.
//   3. this module imports nothing from the engine, so it cannot leak.
// ---------------------------------------------------------------------------

export interface MomentAsset {
  /** Absolute path served statically. */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Archetype key, also used as the caption of the imagery credit. */
  key: MomentArchetype;
}

export type MomentArchetype =
  | 'preparatifs' | 'ceremonie' | 'dejeuner' | 'cocktail' | 'diner'
  | 'discours' | 'bal' | 'soiree' | 'after' | 'moment';

const A = (key: MomentArchetype, alt: string): MomentAsset => ({
  key,
  src: `/editorial/moments/${key}.jpg`,
  alt,
  width: 1376,
  height: 768,
});

export const MOMENT_ASSETS: Record<MomentArchetype, MomentAsset> = {
  preparatifs: A('preparatifs', 'Chambre de préparation : la robe, le miroir, la lumière du matin'),
  ceremonie: A('ceremonie', 'Allée de cérémonie bordée de chaises, arche végétale au bout'),
  dejeuner: A('dejeuner', 'Déjeuner sous une pergola, lumière de midi filtrée par les oliviers'),
  cocktail: A('cocktail', 'Coupes de champagne dans un jardin à l’heure dorée'),
  diner: A('diner', 'Longue table de dîner dressée sous une orangerie, à la bougie'),
  discours: A('discours', 'Un discours au micro pendant le dîner, à la lueur des bougies'),
  bal: A('bal', 'Première danse au centre d’une salle sombre'),
  soiree: A('soiree', 'Piste de danse en fin de soirée, silhouettes et guirlandes'),
  after: A('after', 'Cour au petit matin, premières lueurs et guirlandes encore allumées'),
  moment: A('moment', 'Deux alliances posées près d’un déroulé écrit à la main'),
};

/**
 * Which archetype a moment belongs to, from what the couple wrote.
 * Order matters: the most specific words are tested first.
 */
const RULES: { key: MomentArchetype; words: RegExp }[] = [
  { key: 'preparatifs', words: /pr[ée]paratif|coiffure|maquillage|habillage|getting ready|apprêt|essayage/i },
  { key: 'ceremonie', words: /c[ée]r[ée]monie|mairie|[ée]glise|temple|va[uœ]x|vœu|alliance|engagement|la[iï]que|civil/i },
  { key: 'dejeuner', words: /d[ée]jeuner|midi|lunch|brunch/i },
  { key: 'after', words: /after|petit matin|aube|fin de (la )?nuit|clôture/i },
  { key: 'cocktail', words: /cocktail|vin d.honneur|ap[ée]ritif|apéro|photo de groupe|brunch/i },
  { key: 'diner', words: /d[îi]ner|repas|banquet|table|traiteur|entr[ée]e|dessert|g[âa]teau|pi[èe]ce mont[ée]e/i },
  { key: 'discours', words: /discours|toast|remerciement|prise de parole|micro/i },
  { key: 'bal', words: /ouverture de bal|premi[èe]re danse|bal|valse|danse des mari/i },
  { key: 'soiree', words: /soir[ée]e|dance ?floor|piste|dj|party|f[êe]te|feu d.artifice|nuit/i },
];

export function archetypeForMoment(name: string): MomentArchetype {
  const text = name ?? '';
  for (const rule of RULES) if (rule.words.test(text)) return rule.key;
  return 'moment';
}

/**
 * The picture to show for a moment.
 *
 * `ownMediaSource` is the couple's own image when they attached one: it always
 * wins, and in that case `isProductAsset` is false so the interface can say
 * whose picture it is.
 */
/**
 * When the moment name does not match a wedding archetype, the event type
 * still needs a real product picture — never a grey void. These pools only
 * reuse shipped editorial assets; nothing is invented as a fake memory.
 */
const EVENT_TYPE_DEFAULTS: Record<string, MomentArchetype[]> = {
  mariage: ['ceremonie', 'cocktail', 'diner', 'bal', 'soiree', 'preparatifs'],
  corporate: ['discours', 'dejeuner', 'moment', 'cocktail'],
  seminaire: ['discours', 'dejeuner', 'moment', 'cocktail'],
  festival: ['soiree', 'bal', 'after', 'moment'],
  concert: ['soiree', 'bal', 'after', 'moment'],
  spectacle: ['soiree', 'bal', 'discours', 'moment'],
  gala: ['diner', 'discours', 'bal', 'soiree', 'cocktail'],
  associatif: ['discours', 'dejeuner', 'moment', 'cocktail'],
  culturel: ['discours', 'moment', 'cocktail', 'soiree'],
  anniversaire: ['soiree', 'diner', 'cocktail', 'bal', 'after'],
  journee: ['moment', 'dejeuner', 'discours'],
  mission: ['moment', 'preparatifs', 'discours'],
  voyage: ['moment', 'after', 'preparatifs'],
  autre: ['moment', 'cocktail', 'diner'],
  fete: ['soiree', 'diner', 'cocktail', 'bal'],
  soiree: ['soiree', 'bal', 'after', 'cocktail'],
  convention: ['discours', 'dejeuner', 'moment', 'cocktail'],
};

/** Stable pick inside a pool so the same title always lands on the same image. */
function pickFromPool(name: string, pool: MomentArchetype[]): MomentArchetype {
  if (pool.length === 0) return 'moment';
  let hash = 0;
  const text = name || 'moment';
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

/**
 * The picture to show for a moment.
 *
 * `ownMediaSource` is the couple's own image when they attached one: it always
 * wins, and in that case `isProductAsset` is false so the interface can say
 * whose picture it is.
 *
 * `eventTypeId` only steers the product fallback when the moment name does not
 * match a known archetype — it never overrides a real user media.
 */
export function momentImage(
  name: string,
  ownMediaSource?: string | null,
  eventTypeId?: string | null,
): {
  src: string; alt: string; width: number; height: number; isProductAsset: boolean;
} {
  if (ownMediaSource) {
    return { src: ownMediaSource, alt: name || 'Photographie du moment', width: 1376, height: 768, isProductAsset: false };
  }
  let key = archetypeForMoment(name);
  if (key === 'moment' && eventTypeId) {
    const pool = EVENT_TYPE_DEFAULTS[eventTypeId] ?? EVENT_TYPE_DEFAULTS.autre;
    key = pickFromPool(name, pool);
  }
  const asset = MOMENT_ASSETS[key];
  return { src: asset.src, alt: asset.alt, width: asset.width, height: asset.height, isProductAsset: true };
}

/** Public navigation entries of the mini-site, adapted to the event kind. */
export type MiniSiteNavAction = 'programme' | 'rsvp' | 'ticketing' | 'artists' | 'participants' | 'speakers' | 'travelers' | 'infos';

export function miniSiteNavigation(eventTypeId?: string | null): { label: string; action: MiniSiteNavAction }[] {
  const kind = eventTypeId ?? 'mariage';
  if (kind === 'mariage' || kind === 'anniversaire' || kind === 'fete' || kind === 'soiree') {
    return [
      { label: 'Programme', action: 'programme' },
      { label: 'RSVP', action: 'rsvp' },
      { label: 'Infos pratiques', action: 'infos' },
    ];
  }
  if (kind === 'spectacle' || kind === 'concert' || kind === 'festival') {
    return [
      { label: 'Programme', action: 'programme' },
      { label: 'Billetterie', action: 'ticketing' },
      { label: 'Artistes', action: 'artists' },
      { label: 'Infos pratiques', action: 'infos' },
    ];
  }
  if (['corporate', 'seminaire', 'convention', 'gala', 'associatif', 'culturel'].includes(kind)) {
    return [
      { label: 'Programme', action: 'programme' },
      { label: 'Participants', action: 'participants' },
      { label: 'Intervenants', action: 'speakers' },
      { label: 'Infos pratiques', action: 'infos' },
    ];
  }
  if (kind === 'voyage') {
    return [
      { label: 'Itinéraire', action: 'programme' },
      { label: 'Voyageurs', action: 'travelers' },
      { label: 'Infos pratiques', action: 'infos' },
    ];
  }
  return [
    { label: 'Programme', action: 'programme' },
    { label: 'Participants', action: 'participants' },
    { label: 'Infos pratiques', action: 'infos' },
  ];
}

/**
 * The moments a couple can start from. These are TEMPLATES the user picks one
 * by one — nothing is ever injected automatically (see the empty state).
 * Hours are the usual French wedding rhythm; every one of them is editable the
 * second it exists.
 */
export const MOMENT_TEMPLATES: { label: string; startHour: number; durationHours: number }[] = [
  { label: 'Préparatifs', startHour: 9, durationHours: 3 },
  { label: 'Cérémonie', startHour: 15, durationHours: 1 },
  { label: 'Cocktail', startHour: 16.5, durationHours: 2.5 },
  { label: 'Dîner', startHour: 19.5, durationHours: 2 },
  { label: 'Soirée', startHour: 22.5, durationHours: 3 },
];

// ---------------------------------------------------------------------------
// THE PUBLIC FACE
// ---------------------------------------------------------------------------

/** The cover of the product. A product asset, like the moment pictures. */
export const GRAND_JOUR_HERO: MomentAsset = {
  key: 'moment',
  src: '/editorial/grandjour-hero.jpg',
  alt: 'Un couple s’avance vers un château à l’heure dorée, vu de dos',
  width: 1568,
  height: 656,
};

/**
 * The day shown on the public page.
 *
 * IMPORTANT — this is a DEMONSTRATION of the product, and it is labelled as
 * one everywhere it appears. It contains no couple, no guest, no vendor, no
 * venue and no price: only the shape of a day, so a visitor can see and
 * manipulate the film before creating anything. It is never written to
 * storage and never becomes a wedding's data.
 */
export const DEMO_DAY: { hour: number; endHour: number; label: string; key: MomentArchetype }[] = [
  { hour: 8.5, endHour: 11, label: 'Préparatifs', key: 'preparatifs' },
  { hour: 11, endHour: 12.5, label: 'Cérémonie', key: 'ceremonie' },
  { hour: 13, endHour: 16, label: 'Déjeuner', key: 'dejeuner' },
  { hour: 17.5, endHour: 19.5, label: 'Cocktail', key: 'cocktail' },
  { hour: 19.5, endHour: 21, label: 'Dîner', key: 'diner' },
  { hour: 21, endHour: 21.5, label: 'Première danse', key: 'bal' },
  { hour: 23.5, endHour: 27, label: 'Party', key: 'soiree' },
  { hour: 27, endHour: 28.5, label: 'After', key: 'after' },
];
