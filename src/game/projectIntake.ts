// ---------------------------------------------------------------------------
// PROJECT INTAKE — « Importez votre chaos. Nous construisons votre journée. »
// ---------------------------------------------------------------------------
// This is the reading step of the product: a free description typed by the
// couple, plus whatever files they had lying around, turned into a PROPOSAL
// they can correct before anything is created.
//
// WHAT IT REALLY DOES, AND NOTHING ELSE:
//   • it reads text — the description, and the text the browser could decode
//     from each file (plain text, CSV, notes, and always the file name);
//   • it extracts what is literally written: hours, a date, moment names,
//     a guest count, people, vendors, places, tracks, amounts;
//   • it marks what it had to infer (an end hour, a duration) as ESTIMATED;
//   • it asks a question rather than inventing an answer.
//
// WHAT IT NEVER DOES: invent a guest, a vendor, a venue, a price or an hour
// that is not in the text. There is no AI, no network, no OCR. A PDF that
// cannot be decoded is reported as unreadable — see documentIntelligence.
//
// Everything below is pure: same input, same output, no store, no storage.
// ---------------------------------------------------------------------------

import { extractDocumentFacts, type DocumentFacts } from './documentIntelligence';
import { eventType, type EventTypeId } from '../design/eventTypes';

export type IntakeConfidence = 'read' | 'estimated';

export interface IntakeMoment {
  label: string;
  startHour: number;
  endHour: number;
  /** 'read' when both hours were written; 'estimated' when the end was not. */
  confidence: IntakeConfidence;
  /** The exact fragment this came from, shown to the user. */
  evidence: string;
  keep: boolean;
}

export interface IntakeEntity {
  name: string;
  evidence: string;
  keep: boolean;
}

export interface IntakeTrack {
  title: string;
  artist: string;
  evidence: string;
  keep: boolean;
}

export interface IntakeDocument {
  fileName: string;
  facts: DocumentFacts;
  /** Index of the proposed moment in `moments`, or null. */
  momentIndex: number | null;
  keep: boolean;
}

export interface IntakePlan {
  /** Which kind of day this is. Decides the vocabulary AND the questions. */
  eventTypeId: EventTypeId;
  /** The people at the centre: the couple, the child, the company… or none. */
  coupleNames: string | null;
  weddingDate: string | null;
  locationName: string | null;
  guestCountTarget: number | null;
  moments: IntakeMoment[];
  people: IntakeEntity[];
  vendors: IntakeEntity[];
  places: IntakeEntity[];
  tracks: IntakeTrack[];
  documents: IntakeDocument[];
  amounts: number[];
  /** What the reading could not settle. Shown as questions, never guessed. */
  questions: string[];
}

export interface IntakeSource {
  fileName: string;
  /** Whatever text the browser managed to read. May be just the file name. */
  text: string;
}

// --- vocabulary --------------------------------------------------------------

/**
 * Kept for reference and for tests: the wedding vocabulary. The live list is
 * the one carried by the chosen event type (see design/eventTypes).
 */
export const MOMENT_WORDS: { re: RegExp; label: string }[] = [
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

const VENDOR_WORDS = /(traiteur|photographe|vid[ée]aste|dj|fleuriste|wedding planner|officiant|musicien|orchestre|coiffeur|maquilleuse|location|transport|photobooth)/i;
const PLACE_WORDS = /(ch[âa]teau|domaine|manoir|salle|orangerie|jardin|mairie|[ée]glise|ferme|grange|h[ôo]tel|bastide|mas|villa)/i;

const MONTHS: Record<string, number> = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
};

// --- helpers -----------------------------------------------------------------

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const titleCase = (s: string) => s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1));

function toDecimal(h: string, m?: string): number {
  return Number(h) + (m ? Number(m) / 60 : 0);
}

/** All hours in a fragment, with their position. */
function hoursIn(text: string): { hour: number; index: number; raw: string }[] {
  const out: { hour: number; index: number; raw: string }[] = [];
  const re = /\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/g;
  for (const m of text.matchAll(re)) {
    out.push({ hour: toDecimal(m[1], m[2]), index: m.index ?? 0, raw: m[0] });
  }
  return out;
}

// --- the reading -------------------------------------------------------------

export function analyseIntake(input: {
  description?: string;
  sources?: IntakeSource[];
  /** Defaults to a wedding, because that is what the product is for. */
  eventTypeId?: EventTypeId;
}): IntakePlan {
  const description = input.description ?? '';
  const sources = input.sources ?? [];
  const type = eventType(input.eventTypeId ?? 'mariage');
  const all = [description, ...sources.map((s) => `${s.fileName}\n${s.text}`)].join('\n');

  const questions: string[] = [];

  // --- the couple -----------------------------------------------------------
  // MEASURED: read from every document, « Traiteur : Table & Feu » became the
  // couple. Two first names are only a couple when the PERSON writing the
  // brief says so — so this is read from the description, and only there.
  let coupleNames: string | null = null;
  if (type.id === 'mariage') {
    const couple = /\b([A-ZÉÈÀÂÎÔÛ][\p{Ll}'-]{2,})\s*(?:&|et)\s*([A-ZÉÈÀÂÎÔÛ][\p{Ll}'-]{2,})\b/u.exec(description);
    if (couple) coupleNames = `${couple[1]} & ${couple[2]}`;
  } else if (type.id === 'convention' || type.id === 'seminaire') {
    const company = /\b(?:pour|chez|avec|société|entreprise)\s+([A-ZÉÈÀÂÎÔÛ][\p{L}&'-]+(?:\s+[A-ZÉÈÀÂÎÔÛ][\p{L}&'-]+){0,2})/u.exec(description);
    if (company) coupleNames = company[1].trim();
  } else {
    const person = /\b(?:anniversaire|bapt[êe]me|f[êe]te)\s+(?:de|d’|d')\s*([A-ZÉÈÀÂÎÔÛ][\p{L}'-]+)/iu.exec(description);
    if (person) coupleNames = person[1].trim();
  }

  // --- the date -------------------------------------------------------------
  let weddingDate: string | null = null;
  const dText = /\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\b/i.exec(all);
  const dNum = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/.exec(all);
  const dIso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(all);
  if (dText) {
    const month = MONTHS[dText[2].toLowerCase()];
    weddingDate = `${dText[3]}-${String(month).padStart(2, '0')}-${String(Number(dText[1])).padStart(2, '0')}`;
  } else if (dIso) {
    weddingDate = `${dIso[1]}-${dIso[2]}-${dIso[3]}`;
  } else if (dNum) {
    weddingDate = `${dNum[3]}-${String(Number(dNum[2])).padStart(2, '0')}-${String(Number(dNum[1])).padStart(2, '0')}`;
  } else {
    questions.push('Quelle est la date du mariage ? Elle n’apparaît nulle part dans ce que vous avez donné.');
  }
  if (!coupleNames && type.principalsQuestion) {
    questions.push(type.principalsQuestion);
  }

  // --- guests ---------------------------------------------------------------
  let guestCountTarget: number | null = null;
  const guests = /\b(?:environ\s+)?(\d{2,4})\s+(?:invit[ée]s?|convives?|personnes?|participants?|collaborateurs?)\b/i.exec(all);
  if (guests) guestCountTarget = Number(guests[1]);

  // --- moments --------------------------------------------------------------
  // A moment exists when a KNOWN moment word and an hour appear in the same
  // fragment. Nothing else becomes a moment.
  const moments: IntakeMoment[] = [];
  const fragments = all.split(/[\n;,.]| puis | ensuite | et (?=[a-zéèà]{3,}\s+(?:à|a)\s*\d)/i);
  for (const fragment of fragments) {
    const f = clean(fragment);
    if (!f) continue;
    const found = type.momentWords.find((w) => w.re.test(f));
    if (!found) continue;
    const hs = hoursIn(f);
    if (hs.length === 0) continue;
    const start = hs[0].hour;
    const explicitEnd = hs.length > 1 && hs[1].hour > start ? hs[1].hour : null;
    if (moments.some((m) => m.label === found.label)) continue;
    moments.push({
      label: found.label,
      startHour: start,
      endHour: explicitEnd ?? start + 1.5,
      confidence: explicitEnd ? 'read' : 'estimated',
      evidence: f.slice(0, 120),
      keep: true,
    });
  }
  moments.sort((a, b) => a.startHour - b.startHour);
  // Chain estimated ends onto the next start when they would overlap: still an
  // estimate, and marked as one.
  for (let i = 0; i < moments.length - 1; i++) {
    if (moments[i].confidence === 'estimated' && moments[i].endHour > moments[i + 1].startHour) {
      moments[i].endHour = moments[i + 1].startHour;
    }
  }
  if (moments.some((m) => m.confidence === 'estimated')) {
    questions.push('Certaines heures de fin ont été estimées : vérifiez-les avant de générer la journée.');
  }

  // --- people, vendors, places, tracks, amounts -----------------------------
  const people: IntakeEntity[] = [];
  const vendors: IntakeEntity[] = [];
  const places: IntakeEntity[] = [];
  const tracks: IntakeTrack[] = [];
  const seen = new Set<string>();

  const pushOnce = (list: { name: string }[], name: string, evidence: string, target: IntakeEntity[]) => {
    const key = `${target === people ? 'p' : target === vendors ? 'v' : 'l'}:${name.toLowerCase()}`;
    if (!name || seen.has(key)) return;
    seen.add(key);
    target.push({ name, evidence: evidence.slice(0, 120), keep: true });
  };

  for (const source of sources) {
    for (const rawLine of source.text.split(/\r?\n/)) {
      const line = clean(rawLine);
      if (!line || line.length > 160) continue;

      // « Photographe : Studio Lumière » / « Traiteur - Maison X »
      // MEASURED: VENDOR_WORDS carries its own group, so the company name is
      // the LAST capture, not the second — the list used to read
      // « Photographe », « Traiteur », « DJ » instead of their names.
      const vendorLine = new RegExp(`^(?:[-•*]\\s*)?(?:${VENDOR_WORDS.source})\\s*[:\\-–]\\s*(.+)$`, 'i').exec(line);
      if (vendorLine) {
        const company = clean(vendorLine[vendorLine.length - 1]).replace(/[;].*$/, '');
        pushOnce(vendors, company, line, vendors);
        continue;
      }

      // « Titre — Artiste » (music lists)
      const trackLine = /^(?:[-•*]\s*)?(.{2,80}?)\s+[—–]\s+(.{2,60})$/.exec(line);
      if (trackLine && /playlist|musique|morceau|chanson|track/i.test(source.fileName + source.text.slice(0, 200))) {
        const key = `t:${trackLine[1].toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          tracks.push({ title: clean(trackLine[1]), artist: clean(trackLine[2]), evidence: line, keep: true });
        }
        continue;
      }

      // A guest list: one or two words per line, no digits, no ':'.
      const isNameLine = /^[\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){0,2}$/u.test(line)
        && !/\d|:/.test(line) && !type.momentWords.some((w) => w.re.test(line))
        && !PLACE_WORDS.test(line) && !VENDOR_WORDS.test(line);
      if (isNameLine && /invit|guest|liste|convive/i.test(source.fileName + source.text.slice(0, 120))) {
        pushOnce(people, line, `${source.fileName} : ${line}`, people);
        continue;
      }

      // CSV guest list: « Nom;Prénom;… » or « Nom,Prénom,… »
      const cells = line.split(/[;,\t]/).map(clean).filter(Boolean);
      const isHeader = cells.some((c) => /^(nom|pr[ée]nom|name|first ?name|last ?name|email|e-mail|t[ée]l[ée]phone|phone|table|groupe)$/i.test(c));
      if (!isHeader && cells.length >= 2 && cells.length <= 6
        && /invit|guest|liste|convive/i.test(source.fileName)
        && cells.every((c) => !/\d/.test(c)) && /^[\p{Lu}]/u.test(cells[0])) {
        pushOnce(people, `${cells[0]} ${cells[1]}`, line, people);
        continue;
      }
    }
  }

  // Places named in the description or in any document. MEASURED: the keyword
  // group of PLACE_WORDS was counted twice and produced « Château Château ».
  const placeRe = new RegExp(
    `\\b(ch[âa]teau|domaine|manoir|salle|orangerie|jardin|mairie|[ée]glise|ferme|grange|h[ôo]tel|bastide|mas|villa)`
    + `\\s+((?:de |du |des |d’|d')?[\\p{Lu}][\\p{L}'-]+(?:\\s+[\\p{Lu}][\\p{L}'-]+){0,2})`,
    'giu',
  );
  for (const m of all.matchAll(placeRe)) {
    const keyword = clean(m[1]);
    const proper = clean(m[2]);
    const name = `${keyword[0].toUpperCase()}${keyword.slice(1).toLowerCase()} ${proper}`;
    pushOnce(places, name, clean(m[0]), places);
  }

  // --- documents ------------------------------------------------------------
  const documents: IntakeDocument[] = sources.map((s) => {
    const facts = extractDocumentFacts(`${s.fileName}\n${s.text}`);
    // Which moment does the document fall into, if any hour matches.
    let momentIndex: number | null = null;
    for (const hour of facts.hours) {
      const i = moments.findIndex((m) => hour >= m.startHour && hour <= m.endHour);
      if (i >= 0) { momentIndex = i; break; }
    }
    return { fileName: s.fileName, facts, momentIndex, keep: true };
  });

  const amounts = [...new Set(documents.flatMap((d) => d.facts.amounts))].sort((a, b) => a - b);

  // --- the venue ------------------------------------------------------------
  const locationName = places[0]?.name ?? null;
  if (!locationName) questions.push('Où se déroule la journée ? Aucun lieu n’a été reconnu.');
  if (moments.length === 0) {
    questions.push('Aucun horaire n’a été reconnu : décrivez au moins un moment (« cérémonie à 15h »), ou ajoutez-les ensuite sur la pellicule.');
  }
  if (documents.some((d) => d.facts.unreadable)) {
    questions.push('Certains fichiers ne sont pas lisibles comme du texte ici : ils sont conservés tels quels et rattachés à la main.');
  }

  return {
    eventTypeId: type.id,
    coupleNames, weddingDate, locationName, guestCountTarget,
    moments, people, vendors, places, tracks, documents, amounts, questions,
  };
}

/** One line summarising what was really found. */
export function summariseIntake(plan: IntakePlan): { label: string; count: number }[] {
  return [
    { label: 'moments', count: plan.moments.filter((m) => m.keep).length },
    { label: 'personnes', count: plan.people.filter((p) => p.keep).length },
    { label: 'prestataires', count: plan.vendors.filter((v) => v.keep).length },
    { label: 'lieux', count: plan.places.filter((p) => p.keep).length },
    { label: 'documents', count: plan.documents.filter((d) => d.keep).length },
    { label: 'morceaux', count: plan.tracks.filter((t) => t.keep).length },
  ].filter((x) => x.count > 0);
}
