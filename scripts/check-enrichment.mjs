#!/usr/bin/env node
/**
 * AIME — music enrichment guard (Phase F.2).
 *
 * The pipeline is tested with an INJECTED provider, so every rule is proven
 * without touching the network: matching, ambiguity refusal, persistence,
 * manual priority, removal and reload.
 *
 * The real iTunes provider ships DISABLED because the audit could not reach a
 * single music host from the build environment. Tests assert that a default
 * build performs no request at all.
 */

import { readFileSync } from 'node:fs';
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
  console.log('\n[1/6] Default build: no provider, no request');
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
  console.log('\n[2/6] Exact match vs ambiguity');
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
  console.log('\n[3/6] Confirmation persists as ordinary MediaAssets');
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
  console.log('\n[4/6] Manual data always wins');
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
  console.log('\n[5/6] Artwork without preview, and the reverse');
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
  console.log('\n[6/6] Caching, no render-time requests, and reload');
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

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll enrichment checks passed.\u001b[0m\n');
