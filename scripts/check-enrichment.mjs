#!/usr/bin/env node
/**
 * AIME — music enrichment guard (Phase F.2).
 *
 * The pipeline is tested with an INJECTED provider, so every rule is proven
 * without touching the network: matching, ambiguity refusal, persistence,
 * manual priority, removal and reload.
 *
 * Phase F.3 adds the activation layer: the real iTunes provider may now be
 * switched on, but stays OFF by default and is only reached through a dynamic
 * import. Sections 7-9 exercise the REAL provider against a stubbed `fetch`,
 * which proves the parsing, the flag, the unreachable path and the offline
 * Mirror — without contacting Apple, which this environment cannot reach.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — music enrichment guard\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

const storage = createMemoryStorage();
let boots = 0;
async function boot(fresh = false) {
  installBrowserGlobals(storage);
  const un = silence();
  const m = await harness.load('weddingStore', fresh ? `en${++boots}` : undefined);
  un();
  return m.weddingStore;
}

/** A provider we fully control: no network, deterministic answers. */
function fakeProvider(results) {
  let calls = 0;
  return {
    provider: {
      id: 'itunes', // same id so it REPLACES the real one in the registry
      name: 'Fake provider',
      attribution: 'Source de test.',
      isEnabled: () => true,
      async search(query) {
        calls++;
        return (results[query.title] ?? []).map((c) => ({
          providerId: 'itunes', album: undefined, durationMs: undefined,
          externalUrl: undefined, confidence: 0, ...c,
        }));
      },
    },
    calls: () => calls,
  };
}

try {
  const store = await boot();
  const proj = await harness.loadPath('projections/worldModel');
  const enrich = await harness.loadPath('game/enrichment/index');
  const un = silence();

  const song = store.tracks[0];

  // -------------------------------------------------------------------------
  console.log('\n[1/9] Default build: no provider, no request');
  // -------------------------------------------------------------------------
  {
    enrich.resetProviders();
    r.check(enrich.getEnabledProviders().length === 0,
      'no enrichment provider is enabled by default');
    r.check(enrich.isItunesEnabled() === false, 'the iTunes provider is off');

    const result = await enrich.searchEnrichment(song.id);
    r.check(result.state === 'unavailable',
      'searching reports "unavailable" rather than pretending', result.state);
    r.check(result.candidates.length === 0, 'and returns no candidate');
    r.check(enrich.getEnrichmentState(song.id) === 'unavailable', 'the state reflects it');

    const provSrc = readFileSync(path.join(SRC, 'game', 'enrichment', 'itunesProvider.ts'), 'utf8');
    r.check(/UNVERIFIED/.test(provSrc), 'the provider documents that it is unverified');
  }

  // -------------------------------------------------------------------------
  console.log('\n[2/9] Exact match vs ambiguity');
  // -------------------------------------------------------------------------
  {
    // A clear, unique match.
    const exact = fakeProvider({
      [song.title]: [{
        externalId: 'x:1', title: song.title, artist: song.artist,
        artworkUrl: 'https://example.test/a.jpg', previewUrl: 'https://example.test/a.m4a',
      }],
    });
    enrich.resetProviders();
    enrich.registerProvider(exact.provider);
    enrich.clearEnrichmentCache();

    let res = await enrich.searchEnrichment(song.id);
    r.check(res.state === 'proposed', 'a match moves the track to "proposed"', res.state);
    r.check(res.exact !== null, 'an unambiguous match is flagged as exact');
    r.check(res.candidates[0].confidence > 0.9, 'confidence is computed, not assumed',
      String(res.candidates[0].confidence));

    // Two near-identical candidates ⇒ refuse to choose.
    const ambiguous = fakeProvider({
      [song.title]: [
        { externalId: 'x:1', title: song.title, artist: song.artist, artworkUrl: 'https://example.test/a.jpg', previewUrl: null },
        { externalId: 'x:2', title: song.title, artist: song.artist, artworkUrl: 'https://example.test/b.jpg', previewUrl: null },
      ],
    });
    enrich.resetProviders();
    enrich.registerProvider(ambiguous.provider);
    enrich.clearEnrichmentCache();

    res = await enrich.searchEnrichment(song.id);
    r.check(res.state === 'proposed' && res.exact === null,
      'two equally good candidates are NEVER auto-selected');
    r.check(res.candidates.length === 2, 'both are offered for a human to choose');

    // A wrong artist must not be accepted as the same track.
    const wrongArtist = fakeProvider({
      [song.title]: [{ externalId: 'x:9', title: song.title, artist: 'Quelqu’un d’autre', artworkUrl: null, previewUrl: null }],
    });
    enrich.resetProviders();
    enrich.registerProvider(wrongArtist.provider);
    enrich.clearEnrichmentCache();
    res = await enrich.searchEnrichment(song.id);
    r.check(res.exact === null, 'a matching title by the wrong artist is not an exact match');

    // No result at all.
    enrich.resetProviders();
    enrich.registerProvider(fakeProvider({}).provider);
    enrich.clearEnrichmentCache();
    res = await enrich.searchEnrichment(song.id);
    r.check(res.state === 'not_found', 'no candidate yields "not_found"', res.state);
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/9] Confirmation persists as ordinary MediaAssets');
  // -------------------------------------------------------------------------
  {
    const p = fakeProvider({
      [song.title]: [{
        externalId: 'x:1', title: song.title, artist: song.artist,
        artworkUrl: 'https://example.test/cover.jpg',
        previewUrl: 'https://example.test/preview.m4a',
        durationMs: 215000,
      }],
    });
    enrich.resetProviders();
    enrich.registerProvider(p.provider);
    enrich.clearEnrichmentCache();
    await enrich.searchEnrichment(song.id);

    const outcome = enrich.confirmEnrichment(song.id, 'x:1');
    r.check(outcome.ok && outcome.artworkAdded && outcome.previewAdded,
      'confirming attaches both artwork and preview', JSON.stringify(outcome));
    r.check(enrich.getEnrichmentState(song.id) === 'enriched', 'the state becomes "enriched"');

    const media = store.getMediaFor('song', song.id);
    r.check(media.length === 2, 'exactly two MediaAssets were created');
    r.check(media.every((m) => m.origin === 'research'), 'they are marked as enrichment media');
    r.check(store.media.filter((m) => m.ownerId === song.id).length === 2,
      'no parallel music store was created — they live in the media registry');

    // Mirror and Timeline pick it up with no extra plumbing.
    const music = proj.projectMusic().songs.find((s) => s.songId === song.id);
    r.check(music.coverSource === 'https://example.test/cover.jpg', 'MIRROR shows the artwork');
    r.check(music.audioSource === 'https://example.test/preview.m4a', 'MIRROR exposes the preview');
    const moment = proj.projectProgramme().moments.find((m) => m.songs.some((s) => s.songId === song.id));
    r.check(moment?.songs.find((s) => s.songId === song.id).coverSource === music.coverSource,
      'TIMELINE shows the same artwork, same songId');

    // Re-confirming replaces rather than accumulating.
    enrich.confirmEnrichment(song.id, 'x:1');
    r.check(store.getMediaFor('song', song.id).length === 2, 're-confirming does not duplicate media');
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/9] Manual data always wins');
  // -------------------------------------------------------------------------
  {
    enrich.removeEnrichment(song.id);
    r.check(store.getMediaFor('song', song.id).length === 0, 'enrichment can be removed');

    // The user uploads their own artwork AND audio.
    const manualCover = store.addMedia({
      kind: 'image', source: 'data:image/png;base64,MANUAL',
      ownerKind: 'song', ownerId: song.id, title: 'Ma pochette',
    });
    const manualAudio = store.addMedia({
      kind: 'audio', source: 'data:audio/mpeg;base64,MANUAL',
      ownerKind: 'song', ownerId: song.id, title: 'Mon extrait',
    });

    enrich.clearEnrichmentCache();
    await enrich.searchEnrichment(song.id);
    const outcome = enrich.confirmEnrichment(song.id, 'x:1');
    r.check(outcome.ok === false || (!outcome.artworkAdded && !outcome.previewAdded),
      'enrichment adds nothing when both sides are already manual',
      JSON.stringify(outcome));
    r.check(outcome.keptManualArtwork && outcome.keptManualPreview,
      'and it reports that the manual files were preserved');

    const music = proj.projectMusic().songs.find((s) => s.songId === song.id);
    r.check(music.coverSource === 'data:image/png;base64,MANUAL',
      'the MANUAL artwork is what the Mirror displays');
    r.check(music.audioSource === 'data:audio/mpeg;base64,MANUAL',
      'the MANUAL audio is what plays');

    // Manual artwork only: enrichment may fill the missing audio.
    store.removeMedia(manualAudio.id);
    enrich.clearEnrichmentCache();
    await enrich.searchEnrichment(song.id);
    const partial = enrich.confirmEnrichment(song.id, 'x:1');
    r.check(partial.ok && partial.previewAdded && !partial.artworkAdded,
      'enrichment fills only the missing side', JSON.stringify(partial));
    const after = proj.projectMusic().songs.find((s) => s.songId === song.id);
    r.check(after.coverSource === 'data:image/png;base64,MANUAL',
      'the manual artwork is still preferred over the enriched one');

    store.removeMedia(manualCover.id);
    enrich.removeEnrichment(song.id);
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/9] Artwork without preview, and the reverse');
  // -------------------------------------------------------------------------
  {
    // Artwork only ⇒ cover shown, but NO Play control.
    enrich.resetProviders();
    enrich.registerProvider(fakeProvider({
      [song.title]: [{ externalId: 'a:1', title: song.title, artist: song.artist, artworkUrl: 'https://example.test/only.jpg', previewUrl: null }],
    }).provider);
    enrich.clearEnrichmentCache();
    await enrich.searchEnrichment(song.id);
    enrich.confirmEnrichment(song.id, 'a:1');

    let music = proj.projectMusic().songs.find((s) => s.songId === song.id);
    r.check(music.coverSource !== null && music.audioSource === null,
      'artwork without preview: cover shown, no playable source');
    enrich.removeEnrichment(song.id);

    // Preview only ⇒ typographic tile, but playable.
    enrich.resetProviders();
    enrich.registerProvider(fakeProvider({
      [song.title]: [{ externalId: 'b:1', title: song.title, artist: song.artist, artworkUrl: null, previewUrl: 'https://example.test/only.m4a' }],
    }).provider);
    enrich.clearEnrichmentCache();
    await enrich.searchEnrichment(song.id);
    enrich.confirmEnrichment(song.id, 'b:1');

    music = proj.projectMusic().songs.find((s) => s.songId === song.id);
    r.check(music.coverSource === null && music.audioSource !== null,
      'preview without artwork: typographic tile, still playable');
  }

  // -------------------------------------------------------------------------
  console.log('\n[6/9] Caching, no render-time requests, and reload');
  // -------------------------------------------------------------------------
  {
    const p = fakeProvider({
      [song.title]: [{ externalId: 'c:1', title: song.title, artist: song.artist, artworkUrl: 'https://example.test/c.jpg', previewUrl: null }],
    });
    enrich.resetProviders();
    enrich.registerProvider(p.provider);
    enrich.clearEnrichmentCache();
    enrich.removeEnrichment(song.id);

    await enrich.searchEnrichment(song.id);
    const afterFirst = p.calls();
    // Re-deriving the projection many times must never trigger a lookup.
    for (let i = 0; i < 5; i++) proj.projectWorldModel();
    enrich.getEnrichmentState(song.id);
    enrich.getCachedResult(song.id);
    r.check(p.calls() === afterFirst,
      'rendering never triggers a network lookup', `${p.calls()} vs ${afterFirst}`);

    enrich.confirmEnrichment(song.id, 'c:1');
    store.saveCurrentState();

    const reloaded = await boot(true);
    const persisted = reloaded.getMediaFor('song', song.id);
    r.check(persisted.length === 1 && persisted[0].origin === 'research',
      'the enrichment survives a reload as a persisted MediaAsset');
    r.check(persisted[0].source === 'https://example.test/c.jpg', 'with its real source');

    // Cleanup so other suites see a pristine store.
    for (const m of reloaded.getMediaFor('song', song.id)) reloaded.removeMedia(m.id);
    enrich.resetProviders();
    enrich.clearEnrichmentCache();
  }


  // -------------------------------------------------------------------------
  console.log('\n[7/9] Phase F.3 — activation flag and lazy provider');
  // -------------------------------------------------------------------------
  {
    enrich.resetProviders();
    enrich.resetItunesActivation();

    r.check(enrich.isItunesEnabled() === false, 'the flag resolves to OFF by default');
    r.check(enrich.getActivationSource() === 'default', 'and the source is the default, not a choice');
    r.check(enrich.isEnrichmentAvailable() === false,
      'the Canvas therefore reports enrichment as unavailable');

    // A default build must not even reach for the provider module.
    let fetches = 0;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url) => { fetches++; throw new Error(`unexpected request to ${url}`); };

    await enrich.ensureProvidersReady();
    r.check(enrich.getProviders().length === 0,
      'while OFF, the provider module is never even loaded');
    let res = await enrich.searchEnrichment(song.id);
    r.check(res.state === 'unavailable' && res.reason === 'no_provider',
      'searching while OFF reports "no provider", not a failure', `${res.state}/${res.reason}`);
    r.check(fetches === 0, 'and performs ZERO network requests', String(fetches));

    // Rendering the Mirror must never trigger a request either.
    for (let i = 0; i < 5; i++) proj.projectWorldModel();
    proj.projectMusic();
    proj.projectProgramme();
    r.check(fetches === 0, 'rendering the Mirror performs ZERO network requests', String(fetches));

    // --- explicit activation ------------------------------------------------
    enrich.setItunesEnabled(true, { persist: false });
    r.check(enrich.isItunesEnabled() === true, 'the provider can be activated explicitly');
    r.check(enrich.isEnrichmentAvailable() === true, 'the Canvas now offers the search');
    r.check(fetches === 0, 'activation alone still performs no request', String(fetches));

    await enrich.ensureProvidersReady();
    const loaded = enrich.getProviders().find((pr) => pr.id === 'itunes');
    r.check(Boolean(loaded), 'the real provider is loaded on demand (dynamic import)');
    r.check(loaded?.name === 'iTunes Search', 'and it is the real one, not a stub', loaded?.name);
    r.check(fetches === 0, 'loading the module still performs no request', String(fetches));

    // Persisted preference survives a reset of the module state.
    enrich.setItunesEnabled(true);
    r.check(storage.getItem(enrich.ITUNES_ACTIVATION_STORAGE_KEY) === 'on',
      'an explicit choice is persisted for later sessions');
    enrich.resetItunesActivation();
    r.check(enrich.isItunesEnabled() === false, 'and can be reset back to the default');

    globalThis.fetch = realFetch;
    enrich.resetProviders();
  }

  // -------------------------------------------------------------------------
  console.log('\n[8/9] Phase F.3 — the REAL provider against a stubbed transport');
  // -------------------------------------------------------------------------
  {
    const realFetch = globalThis.fetch;
    let lastUrl = null;
    let calls = 0;

    const itunesPayload = {
      results: [{
        trackId: 1440857781,
        trackName: song.title,
        artistName: song.artist,
        collectionName: 'Un album réel',
        artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/xyz/100x100bb.jpg',
        previewUrl: 'https://audio-ssl.itunes.apple.com/xyz/preview.m4a',
        trackTimeMillis: 221000,
        trackViewUrl: 'https://music.apple.com/fr/album/xyz',
      }],
    };

    // A) unreachable transport ⇒ "unavailable", never "not_found".
    enrich.resetProviders();
    enrich.clearEnrichmentCache();
    enrich.setItunesEnabled(true, { persist: false });
    globalThis.fetch = async (url) => { calls++; lastUrl = String(url); throw new TypeError('Failed to fetch'); };

    let res = await enrich.searchEnrichment(song.id);
    r.check(calls === 1, 'an explicit search performs exactly one request', String(calls));
    r.check(lastUrl.startsWith('https://itunes.apple.com/search?term='),
      'it queries the documented iTunes Search endpoint', lastUrl);
    r.check(decodeURIComponent(lastUrl).includes(song.title) && decodeURIComponent(lastUrl).includes(song.artist),
      'with BOTH the title and the artist of the real track');
    r.check(res.state === 'unavailable' && res.reason === 'provider_unreachable',
      'a dead network is reported as unreachable, not as "no match"', `${res.state}/${res.reason}`);
    r.check(res.candidates.length === 0, 'and nothing is invented to fill the gap');

    // B) a real-shaped payload ⇒ parsed, scored, proposed — never auto-applied.
    calls = 0;
    enrich.clearEnrichmentCache();
    // Start from a genuinely empty song, so "attaches nothing" means nothing.
    for (const m of store.getMediaFor('song', song.id)) store.removeMedia(m.id);
    globalThis.fetch = async (url) => {
      calls++; lastUrl = String(url);
      return { ok: true, status: 200, json: async () => itunesPayload };
    };

    res = await enrich.searchEnrichment(song.id);
    r.check(res.state === 'proposed', 'a real-shaped answer produces a proposal', res.state);
    const cand = res.candidates[0];
    r.check(cand.artworkUrl === 'https://is1-ssl.mzstatic.com/image/thumb/xyz/600x600bb.jpg',
      'the 100px thumbnail is upscaled to 600px', cand.artworkUrl);
    r.check(cand.previewUrl === itunesPayload.results[0].previewUrl, 'the real preview URL is kept');
    r.check(cand.album === 'Un album réel' && cand.durationMs === 221000,
      'album and duration are carried through');
    r.check(cand.externalId === 'itunes:1440857781', 'the external id is provider-scoped');
    r.check(res.exact !== null, 'an unambiguous match is flagged, but still not applied');
    r.check(store.getMediaFor('song', song.id).length === 0,
      'searching alone attaches NOTHING — the human confirms');

    // C) confirmation persists provenance.
    const outcome = enrich.confirmEnrichment(song.id, cand.externalId);
    r.check(outcome.ok && outcome.artworkAdded && outcome.previewAdded,
      'confirming attaches artwork and preview', JSON.stringify(outcome));
    const persisted = store.getMediaFor('song', song.id);
    r.check(persisted.every((m) => m.origin === 'research'), 'both are marked as enriched');
    const prov = persisted[0].provenance;
    r.check(prov?.providerId === 'itunes' && prov?.providerName === 'iTunes Search',
      'provenance records WHICH provider produced the asset', JSON.stringify(prov));
    r.check(prov?.externalUrl === 'https://music.apple.com/fr/album/xyz',
      'and the public page it came from');
    r.check(Boolean(prov?.attribution) && Boolean(prov?.fetchedAt),
      'plus the attribution required by the provider and when it was fetched');

    // D) it shows up immediately in 05 MUSIQUE and in 01 PROGRAMME.
    const music = proj.projectMusic().songs.find((sg) => sg.songId === song.id);
    r.check(music.coverSource === cand.artworkUrl, '05 MUSIQUE shows the confirmed artwork');
    r.check(music.audioSource === cand.previewUrl, '05 MUSIQUE exposes the confirmed preview');
    const moment = proj.projectProgramme().moments.find((m) => m.songs.some((sg) => sg.songId === song.id));
    r.check(moment?.songs.find((sg) => sg.songId === song.id).coverSource === music.coverSource,
      '01 PROGRAMME shows the SAME artwork for the same songId');

    // E) provenance is a Canvas concern: the Mirror components never read it.
    // Comments may DISCUSS provenance; what matters is that no Mirror component
    // reads the field to render it.
    const mirrorDir = path.join(SRC, 'components', 'mirror');
    const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const leaks = readdirSync(mirrorDir)
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => /\bprovenance\b/i.test(stripComments(readFileSync(path.join(mirrorDir, f), 'utf8'))));
    r.check(leaks.length === 0, 'no Mirror component displays provenance', leaks.join(', '));

    // F) a manual upload still wins over the confirmed enrichment.
    const manual = store.addMedia({
      kind: 'image', source: 'data:image/png;base64,MINE', ownerKind: 'song', ownerId: song.id,
      title: 'Ma pochette',
    });
    r.check(manual.origin === 'manual' && manual.provenance === undefined,
      'an upload is manual and carries no external provenance');
    const afterManual = proj.projectMusic().songs.find((sg) => sg.songId === song.id);
    r.check(afterManual.coverSource === 'data:image/png;base64,MINE',
      'the manual artwork immediately takes priority over the enriched one');
    store.removeMedia(manual.id);

    globalThis.fetch = realFetch;
  }

  // -------------------------------------------------------------------------
  console.log('\n[9/9] Phase F.3 — reload, and a Mirror that survives without network');
  // -------------------------------------------------------------------------
  {
    store.saveCurrentState();
    const reloaded = await boot(true);
    const persisted = reloaded.getMediaFor('song', song.id);
    r.check(persisted.length === 2, 'the confirmed enrichment survives a reload', String(persisted.length));
    r.check(persisted.every((m) => m.origin === 'research' && m.provenance?.providerId === 'itunes'),
      'with its origin AND its provenance intact');

    // No transport at all: the Mirror must keep working from persisted data.
    const realFetch = globalThis.fetch;
    globalThis.fetch = undefined;
    const music = proj.projectMusic().songs.find((sg) => sg.songId === song.id);
    r.check(music.coverSource !== null && music.audioSource !== null,
      'with no network available, the Mirror still resolves cover and audio');
    r.check(proj.projectWorldModel().hero !== undefined,
      'and the rest of the Mirror derives normally');
    globalThis.fetch = realFetch;

    // Enrichment can be removed; nothing else is touched.
    // (removeEnrichment acts on the live store instance the module imported,
    // which is `store` — `reloaded` is a deliberately separate boot.)
    r.check(enrich.removeEnrichment(song.id) === true, 'an enrichment can be removed');
    r.check(store.getMediaFor('song', song.id).length === 0, 'and leaves no residue');

    // The TrackArt contract: Play only when a real audio source exists.
    const trackArt = readFileSync(path.join(SRC, 'components', 'mirror', 'TrackArt.tsx'), 'utf8');
    r.check(/\{audioSource && \(/.test(trackArt),
      'the Play control is rendered only when an audio source exists');
    r.check(/onError=\{\(\) => setBroken\(true\)\}/.test(trackArt),
      'a remote cover that fails to load falls back to the typographic tile');
    const player = readFileSync(path.join(SRC, 'game', 'musicPlayer.ts'), 'utf8');
    r.check(/preload\s*=\s*'none'/.test(player),
      'audio is lazy: nothing is downloaded before an explicit Play');

    enrich.resetProviders();
    enrich.resetItunesActivation();
    enrich.clearEnrichmentCache();
    // Leave a pristine store behind for the other suites.
    for (const m of reloaded.getMediaFor('song', song.id)) reloaded.removeMedia(m.id);
    store.saveCurrentState();
  }

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll enrichment checks passed.\u001b[0m\n');
