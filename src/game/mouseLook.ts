// Pointer-lock mouse look. Request the lock from a user gesture (the Start
// button counts), then drain the accumulated movement once per frame with
// consumeLookDelta. No smoothing, no acceleration — raw movementX/Y.
//
// Games where the mouse is a TOOL (builders, pickers, puzzle panels) should NOT
// use this; they use ordinary pointer events and never lock the cursor.

let dx = 0;
let dy = 0;
let installed = false;

export function installMouseLook(): () => void {
  if (installed) return () => {};
  installed = true;
  const onMove = (e: MouseEvent) => {
    if (document.pointerLockElement) {
      dx += e.movementX;
      dy += e.movementY;
    }
  };
  document.addEventListener('mousemove', onMove);
  return () => {
    document.removeEventListener('mousemove', onMove);
    installed = false;
  };
}

/** Request pointer lock on the given element (default: the WebGL canvas). */
export function lockPointer(el?: HTMLElement | null): void {
  const target = el ?? document.querySelector('canvas');
  target?.requestPointerLock?.();
}

export function isPointerLocked(): boolean {
  return !!document.pointerLockElement;
}

/** Returns accumulated look movement since the last call, then resets it. */
export function consumeLookDelta(): { dx: number; dy: number } {
  const out = { dx, dy };
  dx = 0;
  dy = 0;
  return out;
}
