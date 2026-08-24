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
const PHONE_RE = /\b(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}\b/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g;
const ACTION_RE = /^\s*(?:[-•*]\s*)?(pr[ée]voir|confirmer|envoyer|r[ée]server|payer|livrer|installer|rappeler|relancer|apporter|commander)\b.*/gim;

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

  const uniqueSorted = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);

  return {
    dates: [...new Set([...source.matchAll(DATE_RE)].map((m) => m[1]))],
    hours: uniqueSorted(hours),
    amounts: uniqueSorted(amounts),
    phones: [...new Set([...source.matchAll(PHONE_RE)].map((m) => m[0].trim()))],
    emails: [...new Set([...source.matchAll(EMAIL_RE)].map((m) => m[0]))],
    actions: [...new Set([...source.matchAll(ACTION_RE)].map((m) => m[0].trim()))].slice(0, 8),
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
