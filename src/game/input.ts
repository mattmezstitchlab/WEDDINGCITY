// Keyboard input — held keys live in a module-level Set, read from useFrame.
// NEVER drive movement from the keydown event itself (that gives you OS
// key-repeat timing). Subscribe once, read the ref every frame.

const held = new Set<string>();
const pressed = new Set<string>();
let installed = false;

function norm(code: string): string {
  return code.toLowerCase();
}

/** Install the global key listeners once. Call from a top-level effect. */
export function installInput(): () => void {
  if (installed) return () => {};
  installed = true;
  const down = (e: KeyboardEvent) => {
    const k = norm(e.code || e.key);
    if (!held.has(k)) pressed.add(k);
    held.add(k);
    // Stop the page scrolling when the game uses arrows / space.
    if (k === 'space' || k.startsWith('arrow')) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => held.delete(norm(e.code || e.key));
  const blur = () => held.clear();
  window.addEventListener('keydown', down, { passive: false });
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    installed = false;
  };
}

/** True while any of the given key codes is held (e.g. isDown('keyw','arrowup')). */
export function isDown(...codes: string[]): boolean {
  return codes.some((c) => held.has(norm(c)));
}

/** True exactly once per physical press. Drains the press, so call once/frame. */
export function consumePress(...codes: string[]): boolean {
  for (const c of codes) {
    const k = norm(c);
    if (pressed.has(k)) {
      pressed.delete(k);
      return true;
    }
  }
  return false;
}

/** Clear the one-frame press buffer. Call at the END of your sim tick. */
export function clearPresses(): void {
  pressed.clear();
}

/**
 * WASD + arrow keys as a normalized 2D axis. x = right(+)/left(-),
 * y = forward(+)/back(-). Diagonals are length-clamped to 1.
 */
export function moveAxes(): { x: number; y: number } {
  let x = 0;
  let y = 0;
  if (isDown('keyw', 'arrowup')) y += 1;
  if (isDown('keys', 'arrowdown')) y -= 1;
  if (isDown('keyd', 'arrowright')) x += 1;
  if (isDown('keya', 'arrowleft')) x -= 1;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}
