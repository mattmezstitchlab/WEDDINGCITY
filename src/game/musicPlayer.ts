// ---------------------------------------------------------------------------
// AIME — global music player.
// ---------------------------------------------------------------------------
// WHAT THIS IS NOT
// ----------------
// Not a streaming client. There is no Spotify integration, no iTunes lookup,
// no network call anywhere in this app (verified by scripts/check-health.mjs).
// A track is playable if — and only if — a real MediaAsset of kind 'audio' has
// been attached to it. Nothing is simulated: when there is no source, the UI
// must not offer a Play button at all.
//
// WHY A SINGLE MODULE
// -------------------
// Exactly one track can sound at a time, whether Play was pressed in the
// Timeline (01) or in the Music section (05). Both call this. There is no
// second player, and no per-section playback state.
//
// LOADING: the <audio> element is created on the FIRST real play request and
// its source is set only then, so opening the Mirror never downloads audio.
//
// Dependency-free leaf, like brand.ts and the tokens.
// ---------------------------------------------------------------------------

import { reportDiagnostic } from './diagnostics';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface PlayerState {
  /** Stable songId of the active track, or null. */
  songId: string | null;
  status: PlaybackStatus;
  /** Populated only on a real failure. */
  error: string | null;
}

let state: PlayerState = { songId: null, status: 'idle', error: null };
let element: HTMLAudioElement | null = null;
let currentSource: string | null = null;

const listeners = new Set<(s: PlayerState) => void>();

function emit(next: Partial<PlayerState>): void {
  state = { ...state, ...next };
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (error) {
      // A broken subscriber must not break playback, but it must not vanish
      // either — same rule as everywhere else in the app.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'player_listener_failed', error });
    }
  }
}

export function subscribePlayer(fn: (s: PlayerState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPlayerState(): PlayerState {
  return state;
}

export function isPlaying(songId: string): boolean {
  return state.songId === songId && state.status === 'playing';
}

export function isBusy(songId: string): boolean {
  return state.songId === songId && state.status === 'loading';
}

/** Lazily created: no audio element exists until someone actually presses Play. */
function ensureElement(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (element) return element;

  element = new Audio();
  element.preload = 'none';

  element.addEventListener('playing', () => emit({ status: 'playing', error: null }));
  element.addEventListener('pause', () => {
    if (state.status !== 'idle') emit({ status: 'paused' });
  });
  element.addEventListener('ended', () => emit({ songId: null, status: 'idle' }));
  element.addEventListener('error', () => {
    emit({ status: 'error', error: 'Source audio illisible.' });
  });

  return element;
}

/**
 * Play, or pause if this track is already playing.
 *
 * `source` must be a real, resolvable audio source. Callers are expected to
 * omit the Play affordance entirely when they have none — this function
 * refuses rather than pretending.
 */
export async function togglePlay(songId: string, source: string | null): Promise<boolean> {
  if (!source) {
    emit({ songId, status: 'error', error: 'Aucune source audio pour ce morceau.' });
    return false;
  }

  const el = ensureElement();
  if (!el) {
    emit({ songId, status: 'error', error: 'Lecture audio non disponible dans ce contexte.' });
    return false;
  }

  // Same track, currently sounding → pause.
  if (state.songId === songId && state.status === 'playing') {
    el.pause();
    emit({ status: 'paused' });
    return true;
  }

  // Switching track: the previous one stops. Only one can sound at a time.
  if (currentSource !== source) {
    el.pause();
    el.src = source;
    currentSource = source;
    el.load();
  }

  emit({ songId, status: 'loading', error: null });
  try {
    await el.play();
    emit({ songId, status: 'playing', error: null });
    return true;
  } catch (err) {
    emit({
      songId,
      status: 'error',
      error: err instanceof Error ? err.message : 'Lecture refusée par le navigateur.',
    });
    return false;
  }
}

export function stopPlayback(): void {
  if (element) element.pause();
  emit({ songId: null, status: 'idle', error: null });
}

/** Test seam: reset module state between runs. */
export function __resetPlayer(): void {
  if (element) {
    try {
      element.pause();
    } catch (error) {
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'player_reset_failed', error });
    }
  }
  element = null;
  currentSource = null;
  state = { songId: null, status: 'idle', error: null };
  listeners.clear();
}
