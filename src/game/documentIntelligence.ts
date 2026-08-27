// ---------------------------------------------------------------------------
// DOCUMENT INTELLIGENCE — reading what a document actually says.
// ---------------------------------------------------------------------------
// A wedding arrives as a pile of PDFs, quotes, screenshots and text messages.
// The point of this module is that such a file should not land in a folder: it
// should land ON THE MOMENT it concerns.
//
// WHAT IT DOES TODAY, HONESTLY: pure, local, deterministic extraction from the
// text the browser can actually read (plain text, the file name, anything the
// caller managed to decode). It recognises hours, dates, amounts, phone
// numbers and e-mail addresses with regular expressions, and proposes the
// moment whose time window is closest to an hour found in the text.
//
// WHAT IT DOES NOT DO: there is no AI here, no network call, no OCR, and it
// never decides on its own — `suggestMoments` returns candidates with the
// reason for each, and the human confirms. When nothing can be read (a binary
// PDF), it says so instead of pretending.
//
// The shape below is the extension point: the day an engine can read a PDF or
// summarise a contract, it fills the SAME DocumentFacts and everything
// downstream keeps working.
// ---------------------------------------------------------------------------

export interface DocumentFacts {
  /** ISO-like dates found in the text, as written. */
  dates: string[];
  /** Hours in decimal form (14.5 = 14:30), sorted. */
  hours: number[];
  /** Amounts in euros. */
  amounts: number[];
  phones: string[];
  emails: string[];
  /** Lines that read like a task ("prévoir…", "à confirmer…"). */
  actions: string[];
  /** Detected person names (heuristic). */
  people: string[];
  /** Detected place names or addresses (heuristic). */
  places: string[];
  /** Detected music references (URLs or keywords). */
  music: string[];
  /** Detected resource lines: vendor + amount pairs. */
  resources: { who: string | null; amount: number }[];
  /** Detected event types / keywords (mariage, dîner, cocktail...). */
  events: string[];
  /** True when there was no readable text at all. */
  unreadable: boolean;
}

export interface MomentCandidate {
  phaseId: string;
  label: string;
  /** Plain sentence, shown to the user as-is. */
  reason: string;
  /** 0..1, from the evidence. Never presented as a certainty. */
  confidence: number;
}

const HOUR_RE = /\b([01]?\d|2[0-3])\s*[h:]\s*([0-5]\d)?\b/g;
const DATE_RE = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
const AMOUNT_RE = /(\d[\d\s.,]{0,12}\d|\d)\s*(?:€|EUR\b|euros?\b)/gi;
// permissive phone detection: international and national formats
const PHONE_RE = /(\+?\d[\d\s.\-()]{6,}\d)/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g;
const ACTION_RE = /^\s*(?:[-•*]\s*)?(pr[ée]voir|confirmer|envoyer|r[ée]server|payer|livrer|installer|rappeler|relancer|apporter|commander)\b.*/gim;
// Heuristics
const PERSON_CONTEXT_RE = /(?:avec|rdv avec|rdv|rencontre|rencontrer|contact[:\s])\s*([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ\-']+(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ\-']+){0,2})/gi;
const NAME_RE = /\b([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ\-']{2,})(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ\-']{2,}){0,2}\b/g;
const PLACE_KEYWORDS = /\b(Chateau|Château|domaine|salle|restaurant|hôtel|hotel|lieu|avenue|rue|place|domaine|parc|château)\b/i;
const MUSIC_URL_RE = /https?:\/\/(?:open\.spotify\.com|youtube\.com|music\.apple\.com|deezer\.com)\/[\w\-/?.=&%]*/gi;
const RESOURCE_LINE_RE = /([A-ZÀ-Ö][\w\s'\-.]{1,60}?)\s+([\d\s.,]+)\s*(?:€|EUR|euros?)/gi;
const EVENT_KEYWORDS = /\b(mariage|dîner|diner|cocktail|cérémonie|reception|r[ée]ception|fiançailles|anniversaire)\b/ig;

/** Parse "14h30", "14:30", "14 h" into 14.5 / 14. */
function toDecimalHour(h: string, m?: string): number {
  return Number(h) + (m ? Number(m) / 60 : 0);
}

export function extractDocumentFacts(text: string): DocumentFacts {
  const source = (text ?? '').replace(/\u00a0/g, ' ');
  const readable = source.replace(/[^\x20-\x7E\u00C0-\u017F\n]/g, '').trim();

  const hours: number[] = [];
  for (const m of source.matchAll(HOUR_RE)) hours.push(toDecimalHour(m[1], m[2]));

  const amounts: number[] = [];
  for (const m of source.matchAll(AMOUNT_RE)) {
    const n = Number(m[1].replace(/[\s.]/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) amounts.push(n);
  }

  // People (heuristic): look for contexts like 'avec Sophie' or capitalized names
  const peopleSet = new Set<string>();
  for (const m of source.matchAll(PERSON_CONTEXT_RE)) {
    if (m[1]) peopleSet.add(m[1].trim());
  }
  // Fallback capitalized name detection but avoid common words
  const commonWords = new Set(['Rue','Avenue','Place','Le','La','Les','Du','De','Des','Et','Ou','Au','Aux']);
  for (const m of source.matchAll(NAME_RE)) {
    const name = m[0].trim();
    if (!commonWords.has(name.split(/\s+/)[0])) peopleSet.add(name);
  }

  // Places
  const placesSet = new Set<string>();
  if (PLACE_KEYWORDS.test(source)) {
    // try to extract phrase around keyword
    const parts = source.split(/[\.\n]/);
    for (const p of parts) {
      if (PLACE_KEYWORDS.test(p) && p.trim().length > 3) placesSet.add(p.trim());
    }
  }
  // Address-like lines
  const addrMatch = source.match(/\d{1,4}\s+([A-Za-zÀ-ÖÙ-Ý\.\-\s]{3,80}),?\s*\d{5}?\s*[A-Za-zÀ-ÖÙ-Ý]{0,50}/g);
  if (addrMatch) addrMatch.forEach((a) => placesSet.add(a.trim()));

  // Music
  const musicSet = new Set<string>();
  for (const m of source.matchAll(MUSIC_URL_RE)) musicSet.add(m[0]);
  // also detect keywords like 'playlist Spotify'
  if (/playlist\s+spotify/i.test(source)) musicSet.add('playlist:spotify');

  // Resources: look for lines like 'DJ Martin 1 200 €'
  const resources: { who: string | null; amount: number }[] = [];
  for (const m of source.matchAll(RESOURCE_LINE_RE)) {
    try {
      const who = m[1].trim();
      const n = Number(m[2].replace(/[\s.]/g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) resources.push({ who: who || null, amount: n });
    } catch (e) { /* ignore */ }
  }

  // Events
  const eventsSet = new Set<string>();
  if (EVENT_KEYWORDS.test(source)) {
    for (const m of source.matchAll(EVENT_KEYWORDS)) eventsSet.add(m[0]);
  }

  const uniqueSorted = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);

  return {
    dates: [...new Set([...source.matchAll(DATE_RE)].map((m) => m[1]))],
    hours: uniqueSorted(hours),
    amounts: uniqueSorted(amounts),
    phones: [...new Set([...source.matchAll(PHONE_RE)].map((m) => m[0].trim()))],
    emails: [...new Set([...source.matchAll(EMAIL_RE)].map((m) => m[0]))],
    actions: [...new Set([...source.matchAll(ACTION_RE)].map((m) => m[0].trim()))].slice(0, 8),
    people: [...peopleSet].slice(0, 10),
    places: [...placesSet].slice(0, 8),
    music: [...musicSet].slice(0, 8),
    resources,
    events: [...eventsSet].slice(0, 8),
    // Under ~24 readable characters there is nothing to reason about: a PDF
    // read as bytes, or an image. The interface must say so, not invent.
    unreadable: readable.length < 24,
  };
}

/**
 * Which moment this document seems to concern.
 *
 * Two kinds of evidence, both explainable in one sentence:
 *   • an hour written in the document falls inside a moment's window;
 *   • a word of the document matches a word of the moment's title.
 */
export function suggestMoments(
  facts: DocumentFacts,
  text: string,
  moments: { id: string; name: string; startHour: number; endHour: number }[],
): MomentCandidate[] {
  const candidates = new Map<string, MomentCandidate>();
  const keep = (c: MomentCandidate) => {
    const existing = candidates.get(c.phaseId);
    if (!existing || existing.confidence < c.confidence) candidates.set(c.phaseId, c);
  };

  const fmt = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

  for (const hour of facts.hours) {
    for (const m of moments) {
      if (hour >= m.startHour && hour <= m.endHour) {
        keep({
          phaseId: m.id,
          label: m.name,
          reason: `L’heure ${fmt(hour)} lue dans le document tombe pendant « ${m.name} » (${fmt(m.startHour)}–${fmt(m.endHour)}).`,
          confidence: 0.8,
        });
      }
    }
  }

  const words = (text ?? '').toLowerCase().match(/[\p{L}]{4,}/gu) ?? [];
  const wordSet = new Set(words);
  for (const m of moments) {
    const titleWords = (m.name.toLowerCase().match(/[\p{L}]{4,}/gu) ?? []);
    const hit = titleWords.find((w) => wordSet.has(w));
    if (hit) {
      keep({
        phaseId: m.id,
        label: m.name,
        reason: `Le mot « ${hit} » apparaît dans le document et dans le titre du moment.`,
        confidence: 0.55,
      });
    }
  }

  return [...candidates.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/** One sentence describing what was really read. No jargon, no promises. */
export interface Relation {
  subject: string;
  predicate: string;
  object: string;
  confidence: number; // 0..1
  reason: string;
}

export function describeFacts(facts: DocumentFacts): string {
  if (facts.unreadable) {
    return 'Ce fichier n’est pas lisible comme du texte ici : il est conservé tel quel, et vous choisissez le moment auquel il se rattache.';
  }
  const parts: string[] = [];
  if (facts.hours.length) parts.push(`${facts.hours.length} horaire${facts.hours.length > 1 ? 's' : ''}`);
  if (facts.dates.length) parts.push(`${facts.dates.length} date${facts.dates.length > 1 ? 's' : ''}`);
  if (facts.amounts.length) parts.push(`${facts.amounts.length} montant${facts.amounts.length > 1 ? 's' : ''}`);
  if (facts.phones.length) parts.push(`${facts.phones.length} téléphone${facts.phones.length > 1 ? 's' : ''}`);
  if (facts.emails.length) parts.push(`${facts.emails.length} e-mail${facts.emails.length > 1 ? 's' : ''}`);
  if (facts.actions.length) parts.push(`${facts.actions.length} action${facts.actions.length > 1 ? 's' : ''}`);
  if (parts.length === 0) return 'Aucune information exploitable n’a été trouvée dans ce document.';
  return `Lu dans ce document : ${parts.join(', ')}.`;
}

/**
 * Heuristic relations extraction.
 * Returns array of Relations linking detected entities.
 */
export function extractRelations(text: string, facts: DocumentFacts): Relation[] {
  const src = (text ?? '').replace(/\u00a0/g, ' ');
  const rels: Relation[] = [];

  // Helper to add relation
  const add = (s: string, p: string, o: string, confidence: number, reason: string) => {
    rels.push({ subject: s, predicate: p, object: o, confidence, reason });
  };

  // Context: if marriage-related keywords present, tag context
  const contextIsMarriage = /\b(mariage|noces|wedding)\b/i.test(src);

  // 1) Person -> Event relation via verbs like 'confirme', 'réserve', 'réserver', 'confirmer' near person+place+date
  // pattern: "Sophie confirme le Château de la Motte pour le 12 septembre"
  const personConfirmRe = /([A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ'\-]+(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ'\-]+){0,2})\s+(?:confirme|confirmer|réserve|reserve|réserver|valide)\s+(?:le\s+|la\s+|l'\s+)?([\wÀ-ÖÙ-Ý\s'\-]{3,80}?)\s+(?:pour|le|pour le|pour la)\s+([0-3]?\d(?:[/.-][0-3]?\d[/.-]\d{2,4}|\s+\w+){0,2})/i;
  const mpc = src.match(personConfirmRe);
  if (mpc) {
    const person = mpc[1].trim();
    const place = mpc[2].trim();
    const date = mpc[3].trim();
    add(person, 'confirms', `event at ${place}`, 0.85, `Person ${person} confirms an event at ${place} on ${date}`);
    add(`event at ${place}`, 'has_place', place, 0.9, `Place detected from confirmation phrase`);
    add(`event at ${place}`, 'has_date', date, 0.8, `Date parsed near confirmation phrase`);
    if (contextIsMarriage) add(`event at ${place}`, 'context', 'mariage', 0.6, 'Document mentions marriage keywords');
  }

  // 2) Link RDV / appointment time to nearest person or event mention: 'RDV à 14h30' or 'RDV avec Sophie ... 14h30'
  const rdvRe = /\bRDV\b\s*(?:avec\s*([A-ZÀ-ÖÙ-Ý][\w\s'\-]{1,40})\s*)?(?:à|a)\s*([01]?\d|2[0-3])\s*[h:]\s*([0-5]\d)/i;
  const rdv = src.match(rdvRe);
  if (rdv) {
    const person = rdv[1] ? rdv[1].trim() : null;
    const hour = toDecimalHour(rdv[2], rdv[3]);
    if (person) {
      add(person, 'has_appointment_at', `${hour}`, 0.8, `Appointment time extracted near 'RDV'`);
      if (contextIsMarriage) add(person, 'context', 'mariage', 0.5, 'Document mentions marriage keywords');
    } else {
      add('document', 'mentions_appointment_at', `${hour}`, 0.6, "RDV time without explicit person");
    }
  }

  // 3) Resources: link vendor/person to amount when they appear in same line like 'DJ Martin 1 200 €.'
  for (const r of facts.resources) {
    // try to find text snippet with the vendor name
    if (r.who) {
      add(r.who, 'charges', `${r.amount}`, 0.9, `Amount ${r.amount} found next to ${r.who}`);
      // if person matches known people, link them as vendor
      const personMatch = facts.people.find((p) => r.who && p && r.who.toLowerCase().includes(p.toLowerCase()));
      if (personMatch) add(personMatch, 'is_vendor', r.who, 0.85, 'Resource line links person to vendor role');
    } else {
      add('unknown_vendor', 'charges', `${r.amount}`, 0.5, 'Amount found without named vendor');
    }
  }

  // 4) Music: if music detected and event keywords present, link music -> event
  if (facts.music.length) {
    for (const m of facts.music) {
      if (contextIsMarriage) {
        add(m, 'related_to', 'mariage', 0.7, 'Music mentioned in a marriage context');
      }
      // also try to attach to a vendor if resource who contains DJ
      for (const r of facts.resources) {
        if (r.who && /dj|disc ?jockey|dj\b/i.test(r.who)) {
          add(r.who, 'provides_music', m, 0.8, `Music ${m} likely provided by ${r.who}`);
        }
      }
    }
  }

  // 5) Event keywords -> create event node and attach dates/hours/places if present
  if (facts.events.length) {
    for (const ev of facts.events) {
      const evNode = ev;
      // attach place if only one place present
      if (facts.places.length === 1) add(evNode, 'has_place', facts.places[0], 0.7, 'Single place in document');
      // attach dates
      for (const d of facts.dates) add(evNode, 'has_date', d, 0.8, 'Date appears in document');
      for (const h of facts.hours) add(evNode, 'has_hour', `${h}`, 0.7, 'Hour appears in document');
      if (contextIsMarriage) add(evNode, 'context', 'mariage', 0.6, 'Event appears in marriage context');
    }
  }

  // 6) Generic: connect detected people to context
  for (const p of facts.people) {
    if (contextIsMarriage) add(p, 'context', 'mariage', 0.4, 'Document mentions marriage keywords');
  }

  return rels;
}
