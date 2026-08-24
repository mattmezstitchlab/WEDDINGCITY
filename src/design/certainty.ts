// ---------------------------------------------------------------------------
// CERTAINTY — one vocabulary for « what do we actually know? »
// ---------------------------------------------------------------------------
// The product reads sentences and documents written by humans. Some of what it
// finds is written black on white; some is deduced; some is proposed so the day
// can start; some is doubtful; some is simply absent.
//
// Before this file, the intake had two levels (« lu » / « estimé ») and the
// generated documents had a third convention (« À CONFIRMER »). Three places,
// three vocabularies. This is the only one now — the intake, the timeline and
// the documents all read from here.
//
// The rule it enforces: a proposed hour must NEVER look like a decided hour.
// ---------------------------------------------------------------------------

import type { Certainty } from '../types/wedding';

export type { Certainty };

export const CERTAINTY_ORDER: Certainty[] = [
  'confirmed', 'inferred', 'estimated', 'to_confirm', 'missing',
];

export const CERTAINTY: Record<Certainty, {
  /** The word shown to the user, in capitals, as the brief asks. */
  label: string;
  /** One line explaining what the level really means. */
  meaning: string;
  /** A single glyph, for a dense card. */
  mark: string;
  /** Ivory when settled, amber when proposed, rust when doubtful. */
  color: string;
}> = {
  confirmed: {
    label: 'CONFIRMÉ',
    meaning: 'Écrit par vous, ou lu tel quel dans un document.',
    mark: '✓',
    color: '#a9c6a2',
  },
  inferred: {
    label: 'DÉDUIT',
    meaning: 'Déduit d’une autre information certaine — vérifiable en un coup d’œil.',
    mark: '≈',
    color: '#cfc6b4',
  },
  estimated: {
    label: 'ESTIMÉ',
    meaning: 'Proposé par le produit pour vous permettre de commencer. Modifiable.',
    mark: '~',
    color: '#e0a06a',
  },
  to_confirm: {
    label: 'À CONFIRMER',
    meaning: 'Lu quelque part, mais incertain ou contredit ailleurs.',
    mark: '?',
    color: '#e0a06a',
  },
  missing: {
    label: 'MANQUANT',
    meaning: 'Rien n’a été trouvé, et rien n’a été inventé.',
    mark: '—',
    color: '#e0736a',
  },
};

/** The word alone, for a document or a dense line. */
export function certaintyLabel(level: Certainty | undefined): string {
  return CERTAINTY[level ?? 'confirmed'].label;
}

/** True when the value can be acted upon without checking it first. */
export function isSettled(level: Certainty | undefined): boolean {
  return (level ?? 'confirmed') === 'confirmed' || level === 'inferred';
}
