// Game flow (phase machine) + the sim tick, both OUTSIDE React state where it
// matters. Phase transitions ARE discrete, so they live in React state via
// useGamePhase. The per-frame sim runs in useGameFrame and must write to refs,
// never setState — setState from useFrame re-renders 60x/s and tanks the frame
// rate.

import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { clearPresses } from './input';

export type GamePhase = 'menu' | 'playing' | 'gameover';

// Longest sim step we ever apply. A backgrounded tab or a GC pause can hand
// useFrame a huge delta; clamping stops the player teleporting through walls.
const MAX_STEP_S = 1 / 20;

type Listener = (phase: GamePhase) => void;

const state = { phase: 'menu' as GamePhase };
const listeners = new Set<Listener>();
const resetHooks = new Set<() => void>();

function emit() {
  for (const l of listeners) l(state.phase);
}

/** Register per-run state to be wiped on startRun() (positions, score, timers). */
export function resettable(reset: () => void): void {
  resetHooks.add(reset);
}

function runResets() {
  for (const r of resetHooks) r();
}

/** menu/gameover -> playing. Wipes all resettable state first (full restart). */
export function startRun(): void {
  runResets();
  state.phase = 'playing';
  emit();
}

/** playing -> gameover. */
export function endRun(): void {
  if (state.phase !== 'playing') return;
  state.phase = 'gameover';
  emit();
}

/** playing/gameover -> menu. */
export function toMenu(): void {
  state.phase = 'menu';
  emit();
}

export function getPhase(): GamePhase {
  return state.phase;
}

/** Subscribe a React component to phase changes (drives overlays). */
export function useGamePhase(): GamePhase {
  const [phase, setPhase] = useState<GamePhase>(state.phase);
  useEffect(() => {
    listeners.add(setPhase);
    setPhase(state.phase);
    return () => {
      listeners.delete(setPhase);
    };
  }, []);
  return phase;
}

/**
 * A delta-clamped sim tick that ONLY runs while phase === 'playing'. Scale every
 * movement by dt. Presses are cleared automatically after your callback.
 */
export function useGameFrame(cb: (dt: number, t: number) => void): void {
  useFrame((s, delta) => {
    if (state.phase !== 'playing') return;
    cb(Math.min(delta, MAX_STEP_S), s.clock.elapsedTime);
    clearPresses();
  });
}
