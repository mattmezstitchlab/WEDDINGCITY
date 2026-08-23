// ---------------------------------------------------------------------------
// Soft Spatial UI — procedural studio environment.
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------
// The visual audit found the single biggest cause of the "video game" look:
// there was NO image-based lighting at all. Every material was lit only by
// point/directional lights, so the 17 metallic surfaces had nothing to
// reflect and rendered near-black and hard.
//
// WHY NOT `<Environment preset="studio" />`
// -----------------------------------------
// drei presets download an HDRI from a CDN at runtime. That would add a
// network dependency to an app we are deliberately keeping offline, would
// fail in the sandbox, and would inflate load time.
//
// Instead this builds the environment PROCEDURALLY from Lightformers, which
// drei renders into an off-screen cube map. No fetch, no asset, deterministic.
//
// The layout is a soft studio: a broad top key, two cool side fills, a warm
// champagne rim, and a dim floor bounce. Reference: an architectural model
// photographed on a light table — not a spectacular HDRI.
// ---------------------------------------------------------------------------

import { Environment, Lightformer } from '@react-three/drei';
import { BRAND_ACCENT } from '../../design/tokens';

interface StudioEnvironmentProps {
  /** 0 = night, 1 = full day. Modulates the key light only, never the fills. */
  daylight?: number;
  /** Cube map resolution. 128 is plenty for soft, low-frequency lighting. */
  resolution?: number;
}

export function StudioEnvironment({ daylight = 1, resolution = 128 }: StudioEnvironmentProps) {
  const key = 0.55 + daylight * 0.5;

  return (
    <Environment resolution={resolution} frames={1}>
      {/* Broad overhead softbox — the main source of diffuse light. */}
      <Lightformer
        form="rect"
        intensity={key}
        color="#fdfbf6"
        position={[0, 8, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[16, 16, 1]}
      />

      {/* Cool side fills: they open up the shadows instead of leaving them black. */}
      <Lightformer
        form="rect"
        intensity={0.34}
        color="#dbe6f5"
        position={[-9, 3, 4]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[12, 8, 1]}
      />
      <Lightformer
        form="rect"
        intensity={0.28}
        color="#e6ecf7"
        position={[9, 3, -4]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[12, 8, 1]}
      />

      {/* Warm champagne rim — keeps the brand accent in the reflections. */}
      <Lightformer
        form="ring"
        intensity={0.5}
        color={BRAND_ACCENT}
        position={[4, 5, -10]}
        scale={[5, 5, 1]}
      />

      {/* Floor bounce: stops undersides from going pure black. */}
      <Lightformer
        form="rect"
        intensity={0.16}
        color="#8a93a6"
        position={[0, -4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[18, 18, 1]}
      />
    </Environment>
  );
}
