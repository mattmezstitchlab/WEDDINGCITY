// ---------------------------------------------------------------------------
// iTunes Search provider — IMPLEMENTED BUT DISABLED BY DEFAULT.
// ---------------------------------------------------------------------------
// STATUS: UNVERIFIED. Read this before enabling it.
//
// The Phase F.2 audit established that iTunes Search is the best candidate on
// paper: public, no API key, no user authentication, returns both
// `artworkUrl100` and a 30-second `previewUrl`.
//
// It could NOT be verified. Every music metadata host is unreachable from the
// build environment (itunes.apple.com, api.spotify.com, musicbrainz.org,
// coverartarchive.org, api.deezer.com all fail to connect, while
// registry.npmjs.org and github.com return 200 — i.e. an egress allowlist).
//
// So the following are ASSUMED FROM DOCUMENTATION, not measured:
//   · the response shape
//   · CORS headers permitting a browser call
//   · preview availability per track
//   · rate limits (Apple documents roughly 20 calls/minute)
//
// Because of that, `isEnabled()` returns false unless it is explicitly turned
// on. Nothing here runs, and no network call is made, until someone who can
// actually reach the service flips the switch and confirms the behaviour.
//
// TO ENABLE: call setItunesEnabled(true) — ideally after checking the four
// points above in a real browser.
// ---------------------------------------------------------------------------

import {
  EnrichmentCandidate, EnrichmentProvider, EnrichmentQuery, scoreCandidate,
} from './types';

let enabled = false;

/** Opt-in switch. Off by default: the integration is unverified. */
export function setItunesEnabled(value: boolean): void {
  enabled = value;
}

export function isItunesEnabled(): boolean {
  return enabled;
}

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

export const itunesProvider: EnrichmentProvider = {
  id: 'itunes',
  name: 'iTunes Search',
  attribution: 'Métadonnées et extraits fournis par Apple / iTunes Search.',

  isEnabled: () => enabled,

  async search(query: EnrichmentQuery, signal?: AbortSignal): Promise<EnrichmentCandidate[]> {
    if (!enabled) return [];

    const term = `${query.title} ${query.artist}`.trim();
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}`
      + '&entity=song&limit=5';

    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return [];
      const data = (await response.json()) as { results?: ItunesResult[] };

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
    } catch {
      // Network failure, CORS rejection, malformed payload: all mean
      // "no candidates". Enrichment must never break the product.
      return [];
    }
  },
};
