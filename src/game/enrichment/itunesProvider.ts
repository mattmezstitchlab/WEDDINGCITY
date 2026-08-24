// ---------------------------------------------------------------------------
// iTunes Search provider — ACTIVATED IN PHASE F.3, STILL FLAG-PROTECTED.
// ---------------------------------------------------------------------------
// STATUS: IMPLEMENTED · ENABLED ONLY ON DEMAND · RESPONSE SHAPE UNVERIFIED HERE
//
// Phase F.2 established iTunes Search as the right provider on paper: public,
// no API key, no user account, returns both `artworkUrl100` and a 30-second
// `previewUrl`.
//
// Phase F.3 takes the product decision to allow it to run. What did NOT change:
// this build environment still cannot reach a single music host
// (itunes.apple.com, api.spotify.com, musicbrainz.org, coverartarchive.org,
// api.deezer.com all refuse the TCP connection, while registry.npmjs.org and
// github.com answer 200 — an egress allowlist).
//
// So the following remain ASSUMED FROM APPLE'S DOCUMENTATION, not measured
// from here:
//   · the exact response shape
//   · CORS headers permitting a browser call
//   · preview availability per track
//   · rate limits (Apple documents roughly 20 calls/minute)
//
// Consequences, deliberately kept:
//   · the switch is OFF by default (see ./activation.ts);
//   · this module is loaded through a DYNAMIC IMPORT, so its code is not in
//     the initial bundle and never evaluates in a default build;
//   · a failed request reports `ProviderUnreachableError`, which the pipeline
//     turns into "enrichissement automatique indisponible" — never into a
//     fabricated "no match found".
//
// TERMS OF USE — why a preview may be persisted:
// Apple's iTunes Search API is published for the discovery of content on the
// Apple ecosystem; the returned `previewUrl` is Apple's own 30-second sample,
// served from Apple's CDN. We store the URL, never a copy of the audio, and we
// keep the provider attribution plus the public `trackViewUrl` alongside it
// (see MediaProvenance). Nothing is re-hosted, nothing is rewritten.
// ---------------------------------------------------------------------------

import {
  EnrichmentCandidate, EnrichmentProvider, EnrichmentQuery, ProviderUnreachableError,
  scoreCandidate,
} from './types';
import { isItunesEnabled } from './activation';

interface ItunesResult {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
}

/** Ask for a larger artwork than the default 100px thumbnail. */
function upscaleArtwork(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1');
}

export const ITUNES_ENDPOINT = 'https://itunes.apple.com/search';

export const itunesProvider: EnrichmentProvider = {
  id: 'itunes',
  name: 'iTunes Search',
  attribution: 'Métadonnées et extraits fournis par Apple / iTunes Search.',

  // The single source of truth for the switch lives in ./activation.ts, a
  // network-free leaf, so the UI can read it without loading this file.
  isEnabled: () => isItunesEnabled(),

  async search(query: EnrichmentQuery, signal?: AbortSignal): Promise<EnrichmentCandidate[]> {
    // Belt and braces: even if this module were loaded, a disabled provider
    // performs no request whatsoever.
    if (!isItunesEnabled()) return [];

    const term = `${query.title} ${query.artist}`.trim();
    const url = `${ITUNES_ENDPOINT}?term=${encodeURIComponent(term)}`
      + '&entity=song&limit=5';

    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      // DNS failure, refused connection, CORS rejection, offline browser.
      // This is NOT "no match": say so, so the UI can stay honest.
      throw new ProviderUnreachableError('itunes', error);
    }
    if (!response.ok) {
      throw new ProviderUnreachableError('itunes', `HTTP ${response.status}`);
    }

    let data: { results?: ItunesResult[] };
    try {
      data = (await response.json()) as { results?: ItunesResult[] };
    } catch (error) {
      throw new ProviderUnreachableError('itunes', error);
    }

    return (data.results ?? [])
      .filter((r) => r.trackName && r.artistName)
      .map((r) => {
        const candidate: EnrichmentCandidate = {
          externalId: `itunes:${r.trackId ?? r.trackName}`,
          providerId: 'itunes',
          title: r.trackName as string,
          artist: r.artistName as string,
          album: r.collectionName,
          artworkUrl: upscaleArtwork(r.artworkUrl100),
          // Only a real preview URL counts. Absent ⇒ null ⇒ no Play control.
          previewUrl: r.previewUrl ?? null,
          durationMs: r.trackTimeMillis,
          externalUrl: r.trackViewUrl,
          confidence: 0,
        };
        candidate.confidence = scoreCandidate(query, candidate);
        return candidate;
      })
      .sort((a, b) => b.confidence - a.confidence);
  },
};

export default itunesProvider;
