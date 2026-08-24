// ---------------------------------------------------------------------------
// EVENT TYPES — the same engine, a different vocabulary.
// ---------------------------------------------------------------------------
// A wedding, a festival and a corporate day are all a DAY: moments on a scale,
// people attached to hours, vendors, documents, music. The engine never
// changes. What changes is what the product ASKS and what it CALLS things.
//
// The rule this file enforces: a corporate event is never asked who the bride
// is. Every question below belongs to exactly one type, and the intake reads
// only that type's vocabulary.
//
// It also carries the SKELETON of each kind of day: the hours a first draft can
// be built from when the user gave none. Those hours are conventions, not
// facts — every one of them is written into the timeline as ESTIMÉ and says so
// on the card until a human decides otherwise.
// ---------------------------------------------------------------------------

export type EventTypeId =
  | 'mariage' | 'corporate' | 'seminaire' | 'festival' | 'concert' | 'spectacle'
  | 'gala' | 'associatif' | 'culturel' | 'anniversaire'
  // CHRONOS: the same engine, at another scale of life. A « tournée » is not a
  // type of its own — it is several events of the kinds above, read together in
  // the calendar. Creating a type for it would duplicate Mission and Voyage.
  | 'journee' | 'mission' | 'voyage'
  | 'autre'
  // Legacy ids: kept so projects created before this pass keep their
  // vocabulary. They are resolvable, they are simply no longer offered.
  | 'fete' | 'convention' | 'soiree';

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
  /**
   * A FIRST DAY, proposed when nothing could be read. Conventional hours for
   * this kind of event — never facts. Empty means: propose nothing.
   */
  skeleton: { label: string; startHour: number; endHour: number }[];
  /** Retired from the selector, still resolvable for existing projects. */
  legacy?: boolean;
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

/**
 * A STAGE DAY — the words of those who build the moment before the public
 * arrives. Written from the vocabulary already used by Person.craft.
 */
const STAGE_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /montage|installation|load[- ]?in/i, label: 'Montage' },
  { re: /accueil (?:des )?artistes?|arriv[ée]e (?:des )?artistes?/i, label: 'Accueil artistes' },
  { re: /balance|sound ?check|r[ée]glages?/i, label: 'Balance' },
  { re: /r[ée]p[ée]tition|filage/i, label: 'Répétition' },
  { re: /catering|repas [ée]quipe|loges?/i, label: 'Catering' },
  { re: /ouverture (?:des )?portes?|accueil (?:du )?public/i, label: 'Ouverture des portes' },
  { re: /premi[èe]re partie|support/i, label: 'Première partie' },
  { re: /plateau|set|concert|repr[ée]sentation|spectacle/i, label: 'Plateau' },
  { re: /entracte/i, label: 'Entracte' },
  { re: /rappel/i, label: 'Rappel' },
  { re: /d[ée]montage|load[- ]?out/i, label: 'Démontage' },
  { re: /after|dj/i, label: 'After' },
];

const FESTIVAL_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /montage|installation|load[- ]?in/i, label: 'Montage' },
  { re: /brief(?:ing)? [ée]quipes?|brief s[ée]curit[ée]/i, label: 'Briefing équipes' },
  { re: /balance|sound ?check/i, label: 'Balances' },
  { re: /ouverture (?:des )?portes?|accueil (?:du )?public/i, label: 'Ouverture des portes' },
  { re: /sc[èe]ne \w+|plateau|set|concert/i, label: 'Plateau' },
  { re: /changement de plateau|change ?over/i, label: 'Changement de plateau' },
  { re: /restauration|food/i, label: 'Restauration' },
  { re: /fermeture|fin de site/i, label: 'Fermeture' },
  { re: /d[ée]montage|load[- ]?out/i, label: 'Démontage' },
];

const CIVIC_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /installation|mise en place/i, label: 'Installation' },
  { re: /accueil|[ée]margement/i, label: 'Accueil' },
  { re: /assembl[ée]e|ag |assembl[ée]e g[ée]n[ée]rale/i, label: 'Assemblée' },
  { re: /rapport|bilan|comptes/i, label: 'Rapport' },
  { re: /vote|[ée]lection/i, label: 'Vote' },
  { re: /interventions?|prise de parole|discours/i, label: 'Intervention' },
  { re: /pause|caf[ée]/i, label: 'Pause' },
  { re: /repas|buffet|d[ée]jeuner|d[îi]ner/i, label: 'Repas' },
  { re: /cl[ôo]ture|remerciements?/i, label: 'Clôture' },
  { re: /rangement|d[ée]montage/i, label: 'Rangement' },
];

const CULTURAL_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /montage|accrochage|installation/i, label: 'Installation' },
  { re: /visite (?:de )?presse|presse/i, label: 'Presse' },
  { re: /vernissage|inauguration/i, label: 'Vernissage' },
  { re: /ouverture (?:au )?public|accueil/i, label: 'Ouverture au public' },
  { re: /visite guid[ée]e|m[ée]diation/i, label: 'Visite guidée' },
  { re: /conf[ée]rence|rencontre|lecture/i, label: 'Rencontre' },
  { re: /projection|s[ée]ance/i, label: 'Projection' },
  { re: /concert|performance/i, label: 'Performance' },
  { re: /cl[ôo]ture|fermeture/i, label: 'Clôture' },
  { re: /d[ée]crochage|d[ée]montage/i, label: 'Démontage' },
];

/** An ordinary day — personal or professional. The words one really uses. */
const DAY_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /r[ée]veil|lever/i, label: 'Réveil' },
  { re: /d[ée]part/i, label: 'Départ' },
  { re: /trajet|route|trajet retour/i, label: 'Trajet' },
  { re: /rendez-?vous|rdv/i, label: 'Rendez-vous' },
  { re: /r[ée]union|point|call|visio/i, label: 'Réunion' },
  { re: /d[ée]jeuner|midi/i, label: 'Déjeuner' },
  { re: /pause|caf[ée]/i, label: 'Pause' },
  { re: /travail|bureau|atelier/i, label: 'Travail' },
  { re: /retour/i, label: 'Retour' },
  { re: /d[îi]ner|soir/i, label: 'Dîner' },
];

/** A mission: a period organised around one objective. */
const MISSION_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /brief(?:ing)?|point de d[ée]part/i, label: 'Briefing' },
  { re: /d[ée]part/i, label: 'Départ' },
  { re: /trajet|route|train|avion|vol/i, label: 'Trajet' },
  { re: /arriv[ée]e/i, label: 'Arrivée' },
  { re: /installation|montage|mise en place/i, label: 'Installation' },
  { re: /rep[ée]rage|visite technique/i, label: 'Repérage' },
  { re: /intervention|prestation|mission|plateau/i, label: 'Intervention' },
  { re: /r[ée]union|point/i, label: 'Point' },
  { re: /d[ée]montage|rangement/i, label: 'Démontage' },
  { re: /restitution|d[ée]brief/i, label: 'Restitution' },
  { re: /retour/i, label: 'Retour' },
];

/** A journey: getting there, sleeping there, coming back. */
const TRIP_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /d[ée]part/i, label: 'Départ' },
  { re: /enregistrement|check-?in a[ée]roport/i, label: 'Enregistrement' },
  { re: /vol|avion/i, label: 'Vol' },
  { re: /train|tgv|gare/i, label: 'Train' },
  { re: /route|voiture|trajet/i, label: 'Route' },
  { re: /arriv[ée]e/i, label: 'Arrivée' },
  { re: /h[ôo]tel|check-?in|nuit|logement|h[ée]bergement/i, label: 'Hébergement' },
  { re: /visite|balade|activit[ée]/i, label: 'Visite' },
  { re: /d[ée]jeuner|d[îi]ner|repas/i, label: 'Repas' },
  { re: /check-?out|lib[ée]ration/i, label: 'Départ de l’hébergement' },
  { re: /retour/i, label: 'Retour' },
];

/** Kept for a christening-like day: still reachable through « Autre ». */
const CEREMONY_MOMENTS: EventTypeSchema['momentWords'] = [
  { re: /accueil/i, label: 'Accueil' },
  { re: /c[ée]r[ée]monie|bapt[êe]me|b[ée]n[ée]diction|[ée]glise|temple/i, label: 'Cérémonie' },
  { re: /photos?/i, label: 'Photos' },
  { re: /vin d.honneur|ap[ée]ritif/i, label: 'Vin d’honneur' },
  { re: /d[ée]jeuner|repas|d[îi]ner/i, label: 'Repas' },
  { re: /g[âa]teau/i, label: 'Gâteau' },
  { re: /go[ûu]ter/i, label: 'Goûter' },
];

// --- the proposed first days -------------------------------------------------
// Hours here are conventions of the trade, nothing else. They exist so a day is
// never empty at the start, and they are labelled ESTIMÉ everywhere they appear.

const WEDDING_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Préparatifs', startHour: 8.5, endHour: 10.5 },
  { label: 'Installation', startHour: 10.5, endHour: 11 },
  { label: 'Cérémonie', startHour: 11, endHour: 12.5 },
  { label: 'Photos', startHour: 12.5, endHour: 13 },
  { label: 'Déjeuner', startHour: 13, endHour: 15.5 },
  { label: 'Cocktail', startHour: 17, endHour: 19.5 },
  { label: 'Dîner', startHour: 19.5, endHour: 21 },
  { label: 'Première danse', startHour: 21, endHour: 21.5 },
  { label: 'Soirée', startHour: 21.5, endHour: 24.5 },
  { label: 'Fin / démontage', startHour: 24.5, endHour: 25.5 },
];

const PRO_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Installation', startHour: 7.5, endHour: 8.5 },
  { label: 'Accueil', startHour: 8.5, endHour: 9 },
  { label: 'Plénière', startHour: 9, endHour: 10.5 },
  { label: 'Pause', startHour: 10.5, endHour: 11 },
  { label: 'Ateliers', startHour: 11, endHour: 12.5 },
  { label: 'Déjeuner', startHour: 12.5, endHour: 14 },
  { label: 'Sessions', startHour: 14, endHour: 17 },
  { label: 'Clôture', startHour: 17, endHour: 17.5 },
  { label: 'Cocktail', startHour: 18, endHour: 20 },
];

const STAGE_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Montage', startHour: 10, endHour: 14 },
  { label: 'Accueil artistes', startHour: 14, endHour: 15 },
  { label: 'Balance', startHour: 15, endHour: 17 },
  { label: 'Catering', startHour: 18, endHour: 19 },
  { label: 'Ouverture des portes', startHour: 19.5, endHour: 20 },
  { label: 'Première partie', startHour: 20, endHour: 20.75 },
  { label: 'Plateau', startHour: 21, endHour: 22.5 },
  { label: 'Rappel', startHour: 22.5, endHour: 22.75 },
  { label: 'Démontage', startHour: 23, endHour: 25 },
];

const FESTIVAL_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Montage', startHour: 7, endHour: 12 },
  { label: 'Briefing équipes', startHour: 12, endHour: 13 },
  { label: 'Balances', startHour: 13, endHour: 16 },
  { label: 'Ouverture des portes', startHour: 17, endHour: 17.5 },
  { label: 'Plateau', startHour: 18, endHour: 24 },
  { label: 'Fermeture', startHour: 24, endHour: 25 },
  { label: 'Démontage', startHour: 25, endHour: 29 },
];

const PARTY_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Installation', startHour: 16, endHour: 18 },
  { label: 'Accueil', startHour: 19, endHour: 19.5 },
  { label: 'Apéritif', startHour: 19.5, endHour: 20.5 },
  { label: 'Dîner', startHour: 20.5, endHour: 22 },
  { label: 'Gâteau', startHour: 22, endHour: 22.5 },
  { label: 'Danse', startHour: 22.5, endHour: 25 },
];

const CIVIC_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Installation', startHour: 8, endHour: 9 },
  { label: 'Accueil', startHour: 9, endHour: 9.5 },
  { label: 'Assemblée', startHour: 9.5, endHour: 11.5 },
  { label: 'Vote', startHour: 11.5, endHour: 12 },
  { label: 'Repas', startHour: 12.5, endHour: 14 },
  { label: 'Clôture', startHour: 14, endHour: 15 },
  { label: 'Rangement', startHour: 15, endHour: 16 },
];

const CULTURAL_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Installation', startHour: 9, endHour: 13 },
  { label: 'Presse', startHour: 15, endHour: 16 },
  { label: 'Ouverture au public', startHour: 17, endHour: 17.5 },
  { label: 'Vernissage', startHour: 18, endHour: 20 },
  { label: 'Performance', startHour: 20, endHour: 21.5 },
  { label: 'Clôture', startHour: 22, endHour: 23 },
];

const GALA_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Installation', startHour: 14, endHour: 17 },
  { label: 'Balance', startHour: 17, endHour: 18 },
  { label: 'Accueil', startHour: 19, endHour: 19.5 },
  { label: 'Cocktail', startHour: 19.5, endHour: 20.5 },
  { label: 'Dîner', startHour: 20.5, endHour: 22 },
  { label: 'Prises de parole', startHour: 22, endHour: 22.5 },
  { label: 'Spectacle', startHour: 22.5, endHour: 23.5 },
  { label: 'Soirée', startHour: 23.5, endHour: 26 },
];

const DAY_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Départ', startHour: 8, endHour: 8.5 },
  { label: 'Rendez-vous', startHour: 9.5, endHour: 11 },
  { label: 'Déjeuner', startHour: 12.5, endHour: 13.5 },
  { label: 'Travail', startHour: 14, endHour: 17 },
  { label: 'Retour', startHour: 18, endHour: 19 },
];

const MISSION_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Briefing', startHour: 8, endHour: 9 },
  { label: 'Départ', startHour: 9, endHour: 9.5 },
  { label: 'Trajet', startHour: 9.5, endHour: 12 },
  { label: 'Installation', startHour: 14, endHour: 16 },
  { label: 'Intervention', startHour: 17, endHour: 19 },
  { label: 'Démontage', startHour: 19, endHour: 20 },
  { label: 'Retour', startHour: 20, endHour: 22 },
];

const TRIP_SKELETON: EventTypeSchema['skeleton'] = [
  { label: 'Départ', startHour: 7, endHour: 7.5 },
  { label: 'Trajet', startHour: 7.5, endHour: 11 },
  { label: 'Arrivée', startHour: 11, endHour: 12 },
  { label: 'Hébergement', startHour: 15, endHour: 16 },
  { label: 'Repas', startHour: 20, endHour: 21.5 },
];

const DATE_FIELD = { key: 'date', label: 'Date', placeholder: 'AAAA-MM-JJ' } as const;

export const EVENT_TYPES: EventTypeSchema[] = [
  {
    id: 'mariage',
    label: 'Mariage',
    principalsLabel: 'Les mariés',
    principalsQuestion: 'Qui se marie ? Deux prénoms n’ont pas été reconnus dans votre phrase — écrivez-les, ils ne seront pas devinés.',
    fields: [
      { key: 'principals', label: 'Les mariés', placeholder: 'Prénom & Prénom' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu principal', placeholder: 'Domaine, château…' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '120' },
    ],
    momentWords: WEDDING_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Contrats, liste d’invités, playlist, plan de salle : tout ce que vous avez déjà.',
    skeleton: WEDDING_SKELETON,
  },
  {
    id: 'corporate',
    label: 'Événement corporate',
    principalsLabel: 'L’entreprise',
    principalsQuestion: 'Quelle entreprise organise cet événement ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’entreprise', placeholder: 'Nom de l’entreprise' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Siège, centre des congrès, hôtel…' },
      { key: 'headcount', label: 'Participants', placeholder: '250' },
    ],
    momentWords: PRO_MOMENTS,
    headcountLabel: 'participants',
    intakeLine: 'Programme, intervenants, contrats prestataires, plan de salle, restauration.',
    skeleton: PRO_SKELETON,
  },
  {
    id: 'seminaire',
    label: 'Séminaire',
    principalsLabel: 'L’organisation',
    principalsQuestion: 'Qui organise ce séminaire ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’organisation', placeholder: 'Nom de l’organisation' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Domaine, hôtel, campus…' },
      { key: 'headcount', label: 'Participants', placeholder: '60' },
    ],
    momentWords: PRO_MOMENTS,
    headcountLabel: 'participants',
    intakeLine: 'Programme des sessions, intervenants, restauration, transport.',
    skeleton: PRO_SKELETON,
  },
  {
    id: 'festival',
    label: 'Festival',
    principalsLabel: 'L’organisateur',
    principalsQuestion: 'Qui organise ce festival ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’organisateur', placeholder: 'Structure organisatrice' },
      DATE_FIELD,
      { key: 'place', label: 'Site', placeholder: 'Site, parc, salle…' },
      { key: 'headcount', label: 'Public attendu', placeholder: '3000' },
    ],
    momentWords: FESTIVAL_MOMENTS,
    headcountLabel: 'personnes attendues',
    intakeLine: 'Programmation, fiches techniques, contrats artistes, planning des scènes, plan de site.',
    skeleton: FESTIVAL_SKELETON,
  },
  {
    id: 'concert',
    label: 'Concert',
    principalsLabel: 'L’artiste ou le groupe',
    principalsQuestion: 'Qui joue ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’artiste ou le groupe', placeholder: 'Nom d’artiste' },
      DATE_FIELD,
      { key: 'place', label: 'Salle', placeholder: 'Salle, club, scène…' },
      { key: 'headcount', label: 'Jauge', placeholder: '400' },
    ],
    momentWords: STAGE_MOMENTS,
    headcountLabel: 'places',
    intakeLine: 'Fiche technique, contrat de cession, plan de feu, planning de montage, catering.',
    skeleton: STAGE_SKELETON,
  },
  {
    id: 'spectacle',
    label: 'Spectacle',
    principalsLabel: 'La compagnie',
    principalsQuestion: 'Quelle compagnie joue ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'La compagnie', placeholder: 'Compagnie, collectif…' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Théâtre, salle, chapiteau…' },
      { key: 'headcount', label: 'Jauge', placeholder: '300' },
    ],
    momentWords: STAGE_MOMENTS,
    headcountLabel: 'places',
    intakeLine: 'Fiche technique, contrat de cession, feuille de route, planning de montage.',
    skeleton: STAGE_SKELETON,
  },
  {
    id: 'gala',
    label: 'Gala',
    principalsLabel: 'L’organisation',
    principalsQuestion: 'Qui donne ce gala ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’organisation', placeholder: 'Nom de l’organisation' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Salle de réception, hôtel…' },
      { key: 'headcount', label: 'Convives', placeholder: '400' },
    ],
    momentWords: [...PRO_MOMENTS, ...STAGE_MOMENTS],
    headcountLabel: 'convives',
    intakeLine: 'Plan de table, devis traiteur, contrats artistes, déroulé protocolaire.',
    skeleton: GALA_SKELETON,
  },
  {
    id: 'associatif',
    label: 'Événement associatif',
    principalsLabel: 'L’association',
    principalsQuestion: 'Quelle association organise ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’association', placeholder: 'Nom de l’association' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Salle, foyer, extérieur…' },
      { key: 'headcount', label: 'Participants', placeholder: '80' },
    ],
    momentWords: CIVIC_MOMENTS,
    headcountLabel: 'participants',
    intakeLine: 'Convocation, ordre du jour, liste des bénévoles, conventions, budget.',
    skeleton: CIVIC_SKELETON,
  },
  {
    id: 'culturel',
    label: 'Événement culturel',
    principalsLabel: 'La structure',
    principalsQuestion: 'Quelle structure porte cet événement ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'La structure', placeholder: 'Musée, médiathèque, collectif…' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Lieu d’exposition, salle…' },
      { key: 'headcount', label: 'Public attendu', placeholder: '150' },
    ],
    momentWords: CULTURAL_MOMENTS,
    headcountLabel: 'personnes attendues',
    intakeLine: 'Programme, conventions, fiches techniques, plan d’accrochage, médiation.',
    skeleton: CULTURAL_SKELETON,
  },
  {
    id: 'anniversaire',
    label: 'Anniversaire / célébration',
    principalsLabel: 'La personne fêtée',
    principalsQuestion: 'Qui fête son anniversaire ? Le prénom n’a pas été reconnu — écrivez-le, il ne sera pas deviné.',
    fields: [
      { key: 'principals', label: 'La personne fêtée', placeholder: 'Prénom' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Maison, salle, restaurant…' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '40' },
    ],
    momentWords: PARTY_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Liste d’invités, devis du traiteur, playlist, photos de repérage.',
    skeleton: PARTY_SKELETON,
  },
  {
    id: 'journee',
    label: 'Journée',
    principalsLabel: 'Cette journée',
    principalsQuestion: 'Comment appelez-vous cette journée ? Elle ne sera pas nommée à votre place.',
    fields: [
      { key: 'principals', label: 'Cette journée', placeholder: 'Journée de tournage, déménagement…' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu principal', placeholder: 'Où cela se passe-t-il ?' },
      { key: 'headcount', label: 'Personnes concernées', placeholder: '4' },
    ],
    momentWords: DAY_MOMENTS,
    headcountLabel: 'personnes',
    intakeLine: 'Un planning, un billet, une convocation, une liste de rendez-vous.',
    skeleton: DAY_SKELETON,
  },
  {
    id: 'mission',
    label: 'Mission',
    principalsLabel: 'L’objet de la mission',
    principalsQuestion: 'Quel est l’objet de cette mission ? Il ne sera pas deviné.',
    fields: [
      { key: 'principals', label: 'L’objet de la mission', placeholder: 'Prestation, tournage, installation…' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Où se déroule-t-elle ?' },
      { key: 'headcount', label: 'Personnes engagées', placeholder: '6' },
    ],
    momentWords: MISSION_MOMENTS,
    headcountLabel: 'personnes',
    intakeLine: 'Ordre de mission, fiche technique, contrat, planning, billets.',
    skeleton: MISSION_SKELETON,
  },
  {
    id: 'voyage',
    label: 'Voyage',
    principalsLabel: 'Le voyage',
    principalsQuestion: 'Comment appelez-vous ce voyage ? Il ne sera pas nommé à votre place.',
    fields: [
      { key: 'principals', label: 'Le voyage', placeholder: 'Lille → Barcelone' },
      DATE_FIELD,
      { key: 'place', label: 'Destination', placeholder: 'Ville, adresse…' },
      { key: 'headcount', label: 'Voyageurs', placeholder: '2' },
    ],
    momentWords: TRIP_MOMENTS,
    headcountLabel: 'voyageurs',
    intakeLine: 'Billets, réservation d’hôtel, itinéraire, convocation, contrat.',
    skeleton: TRIP_SKELETON,
  },
  {
    id: 'autre',
    label: 'Autre',
    principalsLabel: null,
    principalsQuestion: null,
    fields: [
      { key: 'principals', label: 'Nom de l’événement', placeholder: 'Comment l’appelez-vous ?' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Où cela se passe-t-il ?' },
      { key: 'headcount', label: 'Personnes attendues', placeholder: '30' },
    ],
    momentWords: [...PARTY_MOMENTS, ...PRO_MOMENTS, ...CEREMONY_MOMENTS, ...STAGE_MOMENTS, ...TRIP_MOMENTS],
    headcountLabel: 'personnes',
    intakeLine: 'Tout document décrivant le déroulé, les personnes ou les prestataires.',
    // Nothing is proposed for an event whose nature is unknown: a conventional
    // hour would be a pure invention here.
    skeleton: [],
  },
];

/**
 * Retired types. A project created before this pass keeps its own vocabulary,
 * so nothing a user already built changes meaning. They are never offered.
 */
const LEGACY_EVENT_TYPES: EventTypeSchema[] = [
  {
    id: 'fete', label: 'Fête', legacy: true,
    principalsLabel: 'L’hôte',
    principalsQuestion: 'Qui reçoit ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’hôte', placeholder: 'Nom ou prénom' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Maison, salle, jardin…' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '60' },
    ],
    momentWords: PARTY_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Liste d’invités, playlist, devis du traiteur, plan du lieu.',
    skeleton: PARTY_SKELETON,
  },
  {
    id: 'soiree', label: 'Soirée', legacy: true,
    principalsLabel: 'L’hôte',
    principalsQuestion: 'Qui reçoit ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’hôte', placeholder: 'Nom ou prénom' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Lieu de la soirée' },
      { key: 'headcount', label: 'Invités attendus', placeholder: '80' },
    ],
    momentWords: PARTY_MOMENTS,
    headcountLabel: 'invités',
    intakeLine: 'Playlist, liste d’invités, devis, plan du lieu.',
    skeleton: PARTY_SKELETON,
  },
  {
    id: 'convention', label: 'Convention', legacy: true,
    principalsLabel: 'L’organisation',
    principalsQuestion: 'Quelle organisation tient cette convention ? Le nom n’a pas été reconnu — écrivez-le.',
    fields: [
      { key: 'principals', label: 'L’organisation', placeholder: 'Nom de l’entreprise ou de l’organisation' },
      DATE_FIELD,
      { key: 'place', label: 'Lieu', placeholder: 'Centre des congrès, siège…' },
      { key: 'headcount', label: 'Participants', placeholder: '250' },
    ],
    momentWords: PRO_MOMENTS,
    headcountLabel: 'participants',
    intakeLine: 'Programme, liste des participants, contrats prestataires, plan de salle.',
    skeleton: PRO_SKELETON,
  },
];

/** Every schema the product can resolve — offered ones first. */
export const ALL_EVENT_TYPES: EventTypeSchema[] = [...EVENT_TYPES, ...LEGACY_EVENT_TYPES];

export function eventType(id: EventTypeId | string | undefined | null): EventTypeSchema {
  return ALL_EVENT_TYPES.find((t) => t.id === id) ?? EVENT_TYPES[0];
}
