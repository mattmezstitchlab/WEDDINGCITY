// ---------------------------------------------------------------------------
// EVENT TYPES — the same engine, a different vocabulary.
// ---------------------------------------------------------------------------
// A wedding, a birthday and a corporate day are all a DAY: moments on a scale,
// people attached to hours, vendors, documents, music. The engine never
// changes. What changes is what the product ASKS and what it CALLS things.
//
// The rule this file enforces: a corporate event is never asked who the bride
// is. Every question below belongs to exactly one type, and the intake reads
// only that type's vocabulary.
// ---------------------------------------------------------------------------

export type EventTypeId =
  | 'mariage' | 'anniversaire' | 'corporate' | 'seminaire' | 'soiree' | 'bapteme' | 'autre';

export interface EventTypeSchema {
  id: EventTypeId;
  label: string;
  /** How the product names the two-or-more people at the centre, if any. */
  principalsLabel: string | null;
  /** The question asked when the principals are unknown. Null = never asked. */
  principalsQuestion: string | null;
  /** The fields the review screen shows, in order. */
  fields: { key: 'principals' | 'date' | 'place' | 'headcount'; label: string; placeholder: string }[];
  /** Words that name a moment for THIS kind of day. */
  momentWords: { re: RegExp; label: string }[];
  /** What the count of people is called. */
  headcountLabel: string;
  /** One line describing the ingestion, shown in the intake. */
  intakeLine: string;
}

const WEDDING_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /pr[ée]paratifs?/i, label: 'Préparatifs' },
  { re: /coiffure/i, label: 'Coiffure' },
  { re: /habillage/i, label: 'Habillage' },
  { re: /first ?look/i, label: 'First look' },
  { re: /c[ée]r[ée]monie(?: civile| la[ïi]que| religieuse)?/i, label: 'Cérémonie' },
  { re: /mairie/i, label: 'Mairie' },
  { re: /[ée]glise|temple/i, label: 'Église' },
  { re: /photos? de groupe/i, label: 'Photos de groupe' },
  { re: /vin d.honneur/i, label: 'Vin d’honneur' },
  { re: /cocktail/i, label: 'Cocktail' },
  { re: /d[ée]jeuner/i, label: 'Déjeuner' },
  { re: /d[îi]ner/i, label: 'Dîner' },
  { re: /discours/i, label: 'Discours' },
  { re: /g[âa]teau|pi[èe]ce mont[ée]e/i, label: 'Gâteau' },
  { re: /ouverture de bal|premi[èe]re danse/i, label: 'Première danse' },
  { re: /soir[ée]e|party/i, label: 'Soirée' },
  { re: /brunch/i, label: 'Brunch' },
  { re: /after/i, label: 'After' },
];

const PRO_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /accueil|check-?in|[ée]margement/i, label: 'Accueil' },
  { re: /petit[- ]d[ée]jeuner|caf[ée] d.accueil/i, label: 'Petit-déjeuner' },
  { re: /pl[ée]ni[èe]re|keynote|ouverture/i, label: 'Plénière' },
  { re: /atelier|workshop|session|table ronde/i, label: 'Atelier' },
  { re: /pause/i, label: 'Pause' },
  { re: /d[ée]jeuner|buffet/i, label: 'Déjeuner' },
  { re: /d[ée]monstration|d[ée]mo|pitch/i, label: 'Démonstration' },
  { re: /cocktail|networking/i, label: 'Cocktail' },
  { re: /d[îi]ner|gala/i, label: 'Dîner' },
  { re: /cl[ôo]ture|conclusion|remerciements?/i, label: 'Clôture' },
  { re: /soir[ée]e|after/i, label: 'Soirée' },
];

const PARTY_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /accueil|arriv[ée]e/i, label: 'Accueil' },
  { re: /ap[ée]ritif|ap[ée]ro|cocktail/i, label: 'Apéritif' },
  { re: /d[ée]jeuner/i, label: 'Déjeuner' },
  { re: /d[îi]ner|repas|buffet/i, label: 'Dîner' },
  { re: /g[âa]teau|bougies/i, label: 'Gâteau' },
  { re: /discours|toast/i, label: 'Discours' },
  { re: /cadeaux?/i, label: 'Cadeaux' },
  { re: /danse|dj|musique|piste/i, label: 'Danse' },
  { re: /soir[ée]e|party|after/i, label: 'Soirée' },
];

const CEREMONY_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /accueil/i, label: 'Accueil' },
  { re: /c[ée]r[ée]monie|bapt[êe]me|b[ée]n[ée]diction|[ée]glise|temple/i, label: 'Cérémonie' },
  { re: /photos?/i, label: 'Photos' },
  { re: /vin d.honneur|ap[ée]ritif/i, label: 'Vin d’honneur' },
  { re: /d[ée]jeuner|repas|d[îi]ner/i, label: 'Repas' },
  { re: /g[âa]teau/i, label: 'Gâteau' },
  { re: /go[ûu]ter/i, label: 'Goûter' },
];

export const EVENT_TYPES: EventTypeSchema[] = [
  {
    id: 'mariage',
    label: 'Mariage',
    principalsLabel: 'Les mariés',
    principalsQuestion: 'Qui se marie ? Deux prénoms n’ont pas été reconnus dans votre phrase — écrivez-les, ils ne seront pas devinés.',
    fields: [
      { key: 'principals', label: 'Les mariés', placeholder: 'Prénom & Prénom' },
      { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' },
      { key: 'place', label: 'Lieu principal', placeholder: 'Domaine, château…' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '120' },
    ],
    momentWords: WEDDING_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Contrats, liste d’invités, playlist, plan de salle : tout ce que vous avez déjà.',
  },
  {
    id: 'anniversaire',
    label: 'Anniversaire',
    principalsLabel: 'La personne fêtée',
    principalsQuestion: 'Qui fête son anniversaire ? Le prénom n’a pas été reconnu — écrivez-le, il ne sera pas deviné.',
    fields: [
      { key: 'principals', label: 'La personne fêtée', placeholder: 'Prénom' },
      { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' },
      { key: 'place', label: 'Lieu', placeholder: 'Maison, salle, restaurant…' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '40' },
    ],
    momentWords: PARTY_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Liste d’invités, devis du traiteur, playlist, photos de repérage.',
  },
  {
    id: 'corporate',
    label: 'Événement corporate',
    principalsLabel: 'L’entreprise',
    principalsQuestion: 'Quelle entreprise organise cet événement ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’entreprise', placeholder: 'Nom de l’entreprise' },
      { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' },
      { key: 'place', label: 'Lieu', placeholder: 'Siège, centre de conférences…' },
      { key: 'headcount', label: 'Participants', placeholder: '250' },
    ],
    momentWords: PRO_MOMENTS,
    headcountLabel: 'participants',
    intakeLine: 'Programme, liste des participants, contrats prestataires, plan de salle.',
  },
  {
    id: 'seminaire',
    label: 'Séminaire',
    principalsLabel: 'L’organisation',
    principalsQuestion: 'Qui organise ce séminaire ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’organisation', placeholder: 'Nom de l’organisation' },
      { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' },
      { key: 'place', label: 'Lieu', placeholder: 'Domaine, hôtel, campus…' },
      { key: 'headcount', label: 'Participants', placeholder: '60' },
    ],
    momentWords: PRO_MOMENTS,
    headcountLabel: 'participants',
    intakeLine: 'Programme des sessions, intervenants, restauration, transport.',
  },
  {
    id: 'soiree',
    label: 'Soirée',
    principalsLabel: 'L’hôte',
    principalsQuestion: 'Qui reçoit ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’hôte', placeholder: 'Nom ou prénom' },
      { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' },
      { key: 'place', label: 'Lieu', placeholder: 'Lieu de la soirée' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '80' },
    ],
    momentWords: PARTY_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Playlist, liste d’invités, devis, plan du lieu.',
  },
  {
    id: 'bapteme',
    label: 'Baptême',
    principalsLabel: 'L’enfant',
    principalsQuestion: 'Qui est baptisé ? Le prénom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’enfant', placeholder: 'Prénom' },
      { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' },
      { key: 'place', label: 'Lieu', placeholder: 'Église, mairie, maison…' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '50' },
    ],
    momentWords: CEREMONY_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Liste d’invités, traiteur, photographe, livret de cérémonie.',
  },
  {
    id: 'autre',
    label: 'Autre',
    principalsLabel: null,
    principalsQuestion: null,
    fields: [
      { key: 'principals', label: 'Nom de l’événement', placeholder: 'Comment l’appelez-vous ?' },
      { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' },
      { key: 'place', label: 'Lieu', placeholder: 'Où cela se passe-t-il ?' },
      { key: 'headcount', label: 'Personnes attendues', placeholder: '30' },
    ],
    momentWords: [...PARTY_MOMENTS, ...PRO_MOMENTS],
    headcountLabel: 'personnes',
    intakeLine: 'Tout document décrivant le déroulé, les personnes ou les prestataires.',
  },
];

export function eventType(id: EventTypeId | string): EventTypeSchema {
  return EVENT_TYPES.find((t) => t.id === id) ?? EVENT_TYPES[0];
}
