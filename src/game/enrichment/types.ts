// ---------------------------------------------------------------------------
// AIME — music enrichment: provider contract.
// ---------------------------------------------------------------------------
// A track already knows its title and artist. Enrichment tries to find the
// matching artwork and, when one legally exists, a real audio preview.
//
// The pipeline is provider-agnostic on purpose: the matching, confirmation,
// persistence and priority rules are fully testable without any network, and a
// real provider can be dropped in as a single file.
//
// Dependency-free leaf.
// ---------------------------------------------------------------------------

/** Where a track stands in the enrichment flow. */
export type EnrichmentState =
  | 'not_enriched'   // nothing attached, never searched
  | 'proposed'       // candidates found, awaiting human confirmation
  | 'enriched'       // a candidate was confirmed and persisted
  | 'not_found'      // searched, nothing matched — an answer, not a failure
  | 'unavailable';   // no provider is enabled

export interface EnrichmentCandidate {
  /** Provider-scoped id, e.g. 'itunes:1440857781'. */
  externalId: string;
  providerId: string;
  title: string;
  artist: string;
  album?: string;
  /** Remote artwork URL. Null when the provider returned none. */
  artworkUrl: string | null;
  /** Real, playable preview URL. Null when the provider offers none. */
  previewUrl: string | null;
  durationMs?: number;
  /** Public page for the track, usable as an attribution link. */
  externalUrl?: string;
  /** 0..1 — how confident the match is. Never used to auto-confirm. */
  confidence: number;
}

export interface EnrichmentQuery {
  songId: string;
  title: string;
  artist: string;
  durationMs?: number;
}

export interface EnrichmentProvider {
  id: string;
  name: string;
  /** Attribution text, when the terms of use require one. */
  attribution?: string;
  /**
   * Whether this provider may perform network calls right now.
   * Disabled providers are never invoked — the pipeline reports 'unavailable'.
   */
  isEnabled(): boolean;
  /**
   * Returns the candidates it found, possibly none.
   *
   * It MAY throw `ProviderUnreachableError` when the service could not be
   * reached at all — that is a different answer from "no match", and the
   * pipeline reports it differently. Any other throw is swallowed by the
   * pipeline and treated as "no candidates": enrichment never breaks the app.
   */
  search(query: EnrichmentQuery, signal?: AbortSignal): Promise<EnrichmentCandidate[]>;
}

/**
 * The provider could not be reached (offline, refused, CORS, bad payload).
 *
 * Distinguished from an empty result on purpose: telling a user "aucune
 * correspondance" when the truth is "je n'ai pas pu demander" would be a lie.
 */
export class ProviderUnreachableError extends Error {
  readonly providerId: string;
  readonly cause?: unknown;

  constructor(providerId: string, cause?: unknown) {
    super(`enrichment provider "${providerId}" is unreachable`);
    this.name = 'ProviderUnreachableError';
    this.providerId = providerId;
    this.cause = cause;
  }
}

/**
 * Confidence threshold above which a single candidate is considered an exact
 * match. Below it, or when several candidates are close, the pipeline REFUSES
 * to choose and asks a human.
 */
export const EXACT_MATCH_CONFIDENCE = 0.92;

/** Two candidates within this distance are considered ambiguous. */
export const AMBIGUITY_MARGIN = 0.08;

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Drop the usual noise: "(Remastered 2011)", "- Radio Edit", "feat. X"
    .replace(/\((?:remaster|remastered|live|radio edit|single version)[^)]*\)/g, '')
    .replace(/\s*-\s*(?:remaster|remastered|radio edit|single version).*$/g, '')
    .replace(/\bfeat\.?\b.*$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Deterministic similarity in 0..1. No randomness, no fuzzy library. */
export function similarity(a: string, b: string): number {
  const x = normalise(a);
  const y = normalise(b);
  if (!x || !y) return 0;
  if (x === y) return 1;

  const xs = new Set(x.split(' '));
  const ys = new Set(y.split(' '));
  let shared = 0;
  for (const t of xs) if (ys.has(t)) shared++;
  const jaccard = shared / (xs.size + ys.size - shared);

  // Containment helps for "Lover" vs "Lover (Remix)".
  const contains = x.includes(y) || y.includes(x) ? 0.15 : 0;
  return Math.min(1, jaccard + contains);
}

/** Score a candidate against what the project already knows. */
export function scoreCandidate(query: EnrichmentQuery, c: EnrichmentCandidate): number {
  const titleScore = similarity(query.title, c.title);
  const artistScore = similarity(query.artist, c.artist);
  // Both must match: a right title by the wrong artist is not our track.
  let score = titleScore * 0.6 + artistScore * 0.4;
  if (titleScore < 0.5 || artistScore < 0.5) score = Math.min(score, 0.55);
  return Math.round(score * 1000) / 1000;
}
