// ---------------------------------------------------------------------------
// AIME — music enrichment pipeline.
// ---------------------------------------------------------------------------
// NOT_ENRICHED → (search) → PROPOSED → (human confirms) → ENRICHED
//                        ↘ NOT_FOUND / UNAVAILABLE
//
// Design rules, all enforced by tests:
//
//  · NEVER auto-confirm an ambiguous match. If two candidates are close, or
//    the best one is below the exact-match threshold, a human decides.
//  · NEVER overwrite manual data. A MediaAsset uploaded by the user always
//    wins over an enriched one.
//  · NEVER search during a render. Enrichment is an explicit user action; the
//    result is cached per songId for the session.
//  · NO parallel music database: a confirmed result is persisted as ordinary
//    MediaAssets attached to the song, so Mirror, Timeline and Canvas pick it
//    up through the existing projection with no new plumbing.
// ---------------------------------------------------------------------------

import { weddingStore } from '../weddingStore';
import { MediaProvenance } from '../../types/identity';
import {
  AMBIGUITY_MARGIN, EnrichmentCandidate, EnrichmentProvider, EnrichmentQuery,
  EnrichmentState, EXACT_MATCH_CONFIDENCE, scoreCandidate,
} from './types';
import { isItunesEnabled } from './activation';

export * from './types';
export {
  isItunesEnabled, setItunesEnabled, resetItunesActivation,
  getActivationSource, describeActivation, ITUNES_ACTIVATION_STORAGE_KEY,
} from './activation';
export type { ActivationSource } from './activation';

// --- provider registry ------------------------------------------------------
//
// The registry starts EMPTY. The iTunes provider is not imported statically:
// it is pulled in by a dynamic import the first time a search runs while the
// flag is on (see `ensureProvidersReady`). Two benefits:
//
//   · its code stays out of the initial bundle (own chunk, loaded on demand);
//   · a default build never even evaluates the module that owns `fetch`.

const providers: EnrichmentProvider[] = [];

/** Set once the real provider module has been dynamically imported. */
let itunesLoadPromise: Promise<void> | null = null;

export function getProviders(): readonly EnrichmentProvider[] {
  return providers;
}

export function getEnabledProviders(): EnrichmentProvider[] {
  return providers.filter((p) => p.isEnabled());
}

/** Test seam / extension point. Replaces a provider with the same id. */
export function registerProvider(provider: EnrichmentProvider): void {
  const i = providers.findIndex((p) => p.id === provider.id);
  if (i >= 0) providers[i] = provider;
  else providers.push(provider);
}

export function resetProviders(): void {
  providers.length = 0;
  itunesLoadPromise = null;
}

/**
 * Whether an enrichment search can be attempted at all.
 *
 * Synchronous and provider-free on purpose: the Canvas asks this on every
 * render, and rendering must never load, let alone run, provider code.
 */
export function isEnrichmentAvailable(): boolean {
  return providers.some((p) => p.isEnabled()) || isItunesEnabled();
}

/**
 * Load the flag-protected provider, if and only if it is switched on and not
 * already present (an injected provider with the same id always wins).
 *
 * Awaited by `searchEnrichment` — never at import time, never during a render.
 */
export async function ensureProvidersReady(): Promise<void> {
  if (!isItunesEnabled()) return;
  if (providers.some((p) => p.id === 'itunes')) return;
  if (!itunesLoadPromise) {
    itunesLoadPromise = import('./itunesProvider')
      .then((mod) => { registerProvider(mod.itunesProvider); })
      .catch(() => {
        // A chunk that fails to load must not break the Canvas: the UI simply
        // keeps reporting that automatic enrichment is unavailable.
        itunesLoadPromise = null;
      });
  }
  await itunesLoadPromise;
}

// --- session cache: one search per track, never per render ------------------

export type UnavailableReason =
  | 'no_provider'          // nothing is switched on
  | 'provider_unreachable'; // switched on, but the service did not answer

export interface EnrichmentResult {
  songId: string;
  state: EnrichmentState;
  candidates: EnrichmentCandidate[];
  /** Set only when exactly one candidate is unambiguously the track. */
  exact: EnrichmentCandidate | null;
  searchedAt: string;
  attribution?: string;
  /** Why the search could not happen. Only set when state = 'unavailable'. */
  reason?: UnavailableReason;
}

const cache = new Map<string, EnrichmentResult>();

export function getCachedResult(songId: string): EnrichmentResult | null {
  return cache.get(songId) ?? null;
}

export function clearEnrichmentCache(songId?: string): void {
  if (songId) cache.delete(songId);
  else cache.clear();
}

// --- state ------------------------------------------------------------------

/**
 * Current state of a track, derived from real data.
 * A track counts as ENRICHED when it carries media produced by enrichment.
 */
export function getEnrichmentState(songId: string): EnrichmentState {
  const media = weddingStore.getMediaFor('song', songId);
  if (media.some((m) => m.origin === 'research')) return 'enriched';

  const cached = cache.get(songId);
  if (cached) return cached.state;

  return isEnrichmentAvailable() ? 'not_enriched' : 'unavailable';
}

// --- search -----------------------------------------------------------------

/**
 * Look for candidates. Explicit user action only.
 *
 * Returns 'unavailable' when no provider is enabled — which is the default
 * state of this build, because the only implemented provider could not be
 * verified from the build environment.
 */
export async function searchEnrichment(songId: string): Promise<EnrichmentResult> {
  const track = weddingStore.tracks.find((t) => t.id === songId);
  if (!track) {
    return { songId, state: 'not_found', candidates: [], exact: null, searchedAt: new Date().toISOString() };
  }

  // Loads the flag-protected provider chunk, only if the flag is on.
  await ensureProvidersReady();

  const enabled = getEnabledProviders();
  if (enabled.length === 0) {
    const result: EnrichmentResult = {
      songId, state: 'unavailable', candidates: [], exact: null,
      searchedAt: new Date().toISOString(), reason: 'no_provider',
    };
    cache.set(songId, result);
    return result;
  }

  const query: EnrichmentQuery = { songId, title: track.title, artist: track.artist };

  const found: EnrichmentCandidate[] = [];
  let unreachable = 0;
  for (const provider of enabled) {
    try {
      const list = await provider.search(query);
      for (const c of list) {
        found.push({ ...c, confidence: c.confidence || scoreCandidate(query, c) });
      }
    } catch (error) {
      // Reaching nobody is not the same answer as finding nothing.
      // (Compared by name: the error may cross module instances.)
      if ((error as { name?: string })?.name === 'ProviderUnreachableError') unreachable++;
      // Any other failure yields nothing; it must not break the pipeline.
    }
  }

  // Every enabled provider failed to answer ⇒ say "indisponible", not
  // "aucune correspondance". The Canvas then offers the manual import.
  if (found.length === 0 && unreachable > 0 && unreachable === enabled.length) {
    const result: EnrichmentResult = {
      songId, state: 'unavailable', candidates: [], exact: null,
      searchedAt: new Date().toISOString(), reason: 'provider_unreachable',
    };
    cache.set(songId, result);
    return result;
  }

  found.sort((a, b) => b.confidence - a.confidence);

  // Ambiguity refusal: a human decides unless the best match is clearly ahead
  // AND above the exact threshold.
  const best = found[0] ?? null;
  const runnerUp = found[1] ?? null;
  const clear = Boolean(
    best
    && best.confidence >= EXACT_MATCH_CONFIDENCE
    && (!runnerUp || best.confidence - runnerUp.confidence > AMBIGUITY_MARGIN),
  );

  const result: EnrichmentResult = {
    songId,
    state: found.length === 0 ? 'not_found' : 'proposed',
    candidates: found.slice(0, 5),
    exact: clear ? best : null,
    searchedAt: new Date().toISOString(),
    attribution: enabled.find((p) => p.attribution)?.attribution,
  };
  cache.set(songId, result);
  return result;
}

// --- confirm ----------------------------------------------------------------

export interface ConfirmOutcome {
  ok: boolean;
  reason?: 'unknown_song' | 'unknown_candidate' | 'nothing_usable';
  artworkAdded: boolean;
  previewAdded: boolean;
  /** True when manual media was found and deliberately left untouched. */
  keptManualArtwork: boolean;
  keptManualPreview: boolean;
}

/**
 * Persist a confirmed candidate as ordinary MediaAssets on the song.
 *
 * Manual assets are never replaced: if the user already uploaded artwork or
 * audio, that stays and only the missing side is filled in.
 */
export function confirmEnrichment(songId: string, externalId: string): ConfirmOutcome {
  const base: ConfirmOutcome = {
    ok: false, artworkAdded: false, previewAdded: false,
    keptManualArtwork: false, keptManualPreview: false,
  };

  const track = weddingStore.tracks.find((t) => t.id === songId);
  if (!track) return { ...base, reason: 'unknown_song' };

  const cached = cache.get(songId);
  const candidate = cached?.candidates.find((c) => c.externalId === externalId);
  if (!candidate) return { ...base, reason: 'unknown_candidate' };

  const existing = weddingStore.getMediaFor('song', songId);
  const manualImage = existing.find((m) => m.kind === 'image' && m.origin === 'manual');
  const manualAudio = existing.find((m) => m.kind === 'audio' && m.origin === 'manual');

  const outcome: ConfirmOutcome = {
    ...base,
    keptManualArtwork: Boolean(manualImage),
    keptManualPreview: Boolean(manualAudio),
  };

  // Remove any PREVIOUS enrichment for this song, so re-confirming replaces
  // rather than accumulating. Manual assets are untouched.
  for (const m of existing) {
    if (m.origin === 'research') weddingStore.removeMedia(m.id);
  }

  // Provenance travels WITH the asset: an externally sourced cover must always
  // be traceable back to its provider and its public page.
  const provenance: MediaProvenance = {
    providerId: candidate.providerId,
    providerName: getProviders().find((p) => p.id === candidate.providerId)?.name,
    externalId: candidate.externalId,
    externalUrl: candidate.externalUrl,
    attribution: cached?.attribution,
    fetchedAt: new Date().toISOString(),
  };

  if (candidate.artworkUrl && !manualImage) {
    const asset = weddingStore.addMedia({
      kind: 'image',
      source: candidate.artworkUrl,
      ownerKind: 'song',
      ownerId: songId,
      title: `${candidate.title} — pochette`,
      caption: candidate.album,
      origin: 'research',
      provenance,
    });
    if (asset) outcome.artworkAdded = true;
  }

  if (candidate.previewUrl && !manualAudio) {
    const asset = weddingStore.addMedia({
      kind: 'audio',
      source: candidate.previewUrl,
      ownerKind: 'song',
      ownerId: songId,
      title: `${candidate.title} — extrait`,
      origin: 'research',
      provenance,
    });
    if (asset) outcome.previewAdded = true;
  }

  if (!outcome.artworkAdded && !outcome.previewAdded) {
    return { ...outcome, reason: 'nothing_usable' };
  }

  // Record the duration when the project did not have one.
  if (!track.duration && candidate.durationMs) {
    const total = Math.round(candidate.durationMs / 1000);
    track.duration = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  weddingStore.saveCurrentState();
  weddingStore.notify();

  cache.set(songId, {
    songId, state: 'enriched', candidates: cached?.candidates ?? [],
    exact: candidate, searchedAt: new Date().toISOString(), attribution: cached?.attribution,
  });

  return { ...outcome, ok: true };
}

/** Remove enrichment media. Manual uploads are preserved. */
export function removeEnrichment(songId: string): boolean {
  const enriched = weddingStore.getMediaFor('song', songId).filter((m) => m.origin === 'research');
  if (enriched.length === 0) return false;
  for (const m of enriched) weddingStore.removeMedia(m.id);
  cache.delete(songId);
  weddingStore.notify();
  return true;
}
