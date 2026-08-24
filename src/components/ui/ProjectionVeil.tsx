import { useEffect, useState } from 'react';
import './projectionTransition.css';

// ---------------------------------------------------------------------------
// PROJECTION VEIL — the crossing between WORLD and MIRROR.
// ---------------------------------------------------------------------------
// Two surfaces, one wedding. Moving between them should feel deliberate, not
// spectacular, so the transition is a single short fade in the colour of the
// destination surface.
//
// WHY A VEIL RATHER THAN ANIMATING THE SURFACES
// The 3D World must NOT be remounted to be re-animated — that would rebuild
// the whole scene and drop the WebGL context. The veil is one absolutely
// positioned div with `pointer-events: none`; it never touches either
// projection, costs one composited layer, and disappears on its own.
//
// It is skipped entirely under prefers-reduced-motion (see the stylesheet).
// ---------------------------------------------------------------------------

export function ProjectionVeil({ projection }: { projection: 'world' | 'mirror' }) {
  const [crossing, setCrossing] = useState<number | null>(null);
  const [previous, setPrevious] = useState(projection);

  useEffect(() => {
    if (projection === previous) return;
    setPrevious(projection);
    // A new number replays the animation without remounting anything else.
    setCrossing(Date.now());
  }, [projection, previous]);

  useEffect(() => {
    if (crossing === null) return;
    const timer = window.setTimeout(() => setCrossing(null), 420);
    return () => window.clearTimeout(timer);
  }, [crossing]);

  if (crossing === null) return null;

  return (
    <div
      key={crossing}
      aria-hidden
      className="wc-projection-veil"
      style={{ background: projection === 'mirror' ? '#F7F5F0' : '#08090d' }}
    />
  );
}
