#!/usr/bin/env node
/**
 * AIME — portraits & music player guard (Phase F.1).
 *
 * Two promises to keep honest:
 *   · a person shows a REAL photo when one is attached, initials otherwise;
 *   · a track is playable only when a REAL audio MediaAsset exists — the Play
 *     control must not exist at all without one.
 *
 * No streaming service, no lookup, no fabricated URL: the audit found zero
 * audio/artwork fields and zero network calls in the codebase, so the only
 * truthful source is the MediaAsset registry.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — portraits & music guard\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

try {
  installBrowserGlobals(createMemoryStorage());
  const un = silence();
  const { weddingStore: store } = await harness.load('weddingStore');
  un();
  const proj = await harness.loadPath('projections/worldModel');

  // -------------------------------------------------------------------------
  console.log('\n[1/5] Portraits resolve from real MediaAssets only');
  // -------------------------------------------------------------------------
  {
    const person = store.persons[0];
    r.check(store.getPortraitFor(person.id) === null,
      'with no media, a person has no portrait (initials fallback)');

    const photo = store.addMedia({
      kind: 'image', source: 'data:image/png;base64,AAAA',
      ownerKind: 'person', ownerId: person.id, title: 'Portrait',
    });
    r.check(!!photo, 'a real photo can be attached to a person');
    r.check(store.getPortraitFor(person.id)?.id === photo.id,
      'the portrait now resolves to that exact MediaAsset');

    // Deterministic priority: portraitMediaId wins when valid.
    const second = store.addMedia({
      kind: 'image', source: 'data:image/png;base64,BBBB',
      ownerKind: 'person', ownerId: person.id, title: 'Autre',
    });
    person.portraitMediaId = second.id;
    r.check(store.getPortraitFor(person.id)?.id === second.id,
      'portraitMediaId takes priority when it is valid');
    person.portraitMediaId = 'media_ghost';
    r.check(store.getPortraitFor(person.id)?.id === photo.id,
      'an invalid portraitMediaId falls back to the first attached image');
    person.portraitMediaId = undefined;

    store.removeMedia(second.id);
    store.removeMedia(photo.id);
    r.check(store.getPortraitFor(person.id) === null,
      'removing the media returns the person to initials');

    const people = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorPeople.tsx'), 'utf8');
    r.check(/store\.getPortraitFor\(guest\.personId\)/.test(people),
      'Mirror reads the portrait from the store, never a local copy');
    r.check(/initialsOf\(guest\.displayName\)/.test(people), 'initials remain the fallback');
    r.check(/loading="lazy"/.test(people) && /decoding="async"/.test(people),
      'portraits are lazy-loaded and decoded off the main thread');
    r.check(/prefers-reduced-motion/.test(people),
      'the initials → photo transition respects reduced motion');
  }

  // -------------------------------------------------------------------------
  console.log('\n[2/5] A track is playable only with a real audio asset');
  // -------------------------------------------------------------------------
  {
    const song = store.tracks[0];
    let music = proj.projectMusic();
    let projected = music.songs.find((s) => s.songId === song.id);
    r.check(projected.audioSource === null, 'with no media, a track exposes no audio source');
    r.check(projected.coverSource === null, 'and no cover source');
    r.check(music.counts.playable === 0, 'the playable count is zero, not assumed');

    const cover = store.addMedia({
      kind: 'image', source: 'data:image/png;base64,CCCC',
      ownerKind: 'song', ownerId: song.id, title: 'Pochette',
    });
    const audio = store.addMedia({
      kind: 'audio', source: 'data:audio/mpeg;base64,DDDD',
      ownerKind: 'song', ownerId: song.id, title: 'Extrait',
    });
    r.check(!!cover && !!audio, 'real artwork and audio can be attached to a track');

    music = proj.projectMusic();
    projected = music.songs.find((s) => s.songId === song.id);
    r.check(projected.coverSource === 'data:image/png;base64,CCCC', 'the cover is projected');
    r.check(projected.audioSource === 'data:audio/mpeg;base64,DDDD', 'the audio source is projected');
    r.check(music.counts.playable === 1, 'the playable count reflects reality');

    // The timeline carries the same sources, so both use one player.
    const moment = proj.projectProgramme().moments.find((m) => m.songs.some((s) => s.songId === song.id));
    if (moment) {
      const inTimeline = moment.songs.find((s) => s.songId === song.id);
      r.check(inTimeline.audioSource === projected.audioSource,
        'the Timeline exposes the same audio source as the Music section');
      r.check(inTimeline.coverSource === projected.coverSource,
        'and the same cover');
    } else {
      r.check(false, 'expected the track to belong to a moment');
    }

    store.removeMedia(cover.id);
    store.removeMedia(audio.id);
    r.check(proj.projectMusic().songs.find((s) => s.songId === song.id).audioSource === null,
      'removing the audio removes the playable source');
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/5] The player: one track at a time, no fake state');
  // -------------------------------------------------------------------------
  {
    const player = await harness.load('musicPlayer');
    player.__resetPlayer();

    // Refuses to pretend when there is no source.
    const refused = await player.togglePlay('trk_a', null);
    r.check(refused === false, 'play is refused when no source exists');
    r.check(player.getPlayerState().status === 'error',
      'the state says error, never "playing"', player.getPlayerState().status);
    r.check(player.isPlaying('trk_a') === false, 'nothing is reported as playing');

    // Headless: no Audio constructor, so a real source still cannot lie.
    player.__resetPlayer();
    const noAudioEnv = await player.togglePlay('trk_a', 'data:audio/mpeg;base64,AAAA');
    r.check(noAudioEnv === false && player.getPlayerState().status === 'error',
      'without a browser audio element, playback reports failure honestly');

    // Subscription contract used by the UI.
    player.__resetPlayer();
    let notified = 0;
    const unsub = player.subscribePlayer(() => { notified++; });
    await player.togglePlay('trk_b', null);
    unsub();
    r.check(notified > 0, 'subscribers are notified of state changes');

    player.__resetPlayer();
    r.check(player.getPlayerState().songId === null && player.getPlayerState().status === 'idle',
      'reset returns the player to idle');

    const src = readFileSync(path.join(SRC, 'game', 'musicPlayer.ts'), 'utf8');
    r.check(/preload = 'none'/.test(src), 'audio is never preloaded');
    r.check(/el\.pause\(\)/.test(src), 'starting a track pauses the previous one');
    // Strip BOTH comment styles: the header explains what is deliberately not
    // done ("no Spotify, no iTunes"), which would otherwise trip this regex.
    const playerCode = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    r.check(!/fetch\(|itunes|spotify/i.test(playerCode),
      'the player performs no network lookup');
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/5] The UI never offers a control it cannot honour');
  // -------------------------------------------------------------------------
  {
    const art = readFileSync(path.join(SRC, 'components', 'mirror', 'TrackArt.tsx'), 'utf8');
    r.check(/\{audioSource && \(/.test(art),
      'the Play control is rendered only when a real audio source exists');
    r.check(/loading="lazy"/.test(art) && /decoding="async"/.test(art),
      'artwork is lazy-loaded');
    r.check(/title\.trim\(\)\.charAt\(0\)/.test(art),
      'a track without artwork falls back to typography, not an image');
    r.check(/togglePlay\(songId, audioSource\)/.test(art), 'it uses the shared global player');

    // One player, used by both sections.
    const timeline = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorTimeline.tsx'), 'utf8');
    const sections = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorSections.tsx'), 'utf8');
    r.check(/<TrackArt/.test(timeline) && /<TrackArt/.test(sections),
      'Timeline and Music render the same TrackArt component');
    r.check(!/new Audio\(/.test(timeline) && !/new Audio\(/.test(sections),
      'no section creates its own audio element');
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/5] Still no fabricated media anywhere');
  // -------------------------------------------------------------------------
  {
    const dir = path.join(SRC, 'components', 'mirror');
    const all = readdirSync(dir).filter((f) => f.endsWith('.tsx'))
      .map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    r.check(!/https?:\/\/[^"'`]*\.(jpg|jpeg|png|webp|avif|gif|mp3|m4a|ogg)/i.test(all),
      'no remote image or audio asset is referenced');
    r.check(!/unsplash|picsum|dummyimage|placekitten|soundhelix/i.test(all),
      'no placeholder media service is used');
    r.check(store.media.length === 0, 'the store holds no seeded media after the tests');

    // Canvas and Mirror share one media pipeline.
    const core = readFileSync(path.join(SRC, 'components', 'canvas', 'CanvasCore.tsx'), 'utf8');
    r.check(/ownerKind="song"/.test(core), 'the Canvas attaches artwork/audio to a song');
    r.check(/audio\/\*/.test(core), 'the Canvas accepts real audio files for tracks');
    r.check(/store\.addMedia\(/.test(core), 'it reuses the existing media mutation');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll portrait & music checks passed.\u001b[0m\n');
