import { useEffect, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows, SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, SMAA, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Geometry diagnostics exposed to the preview harness as
// window.__agon_geometry.inspect() -> { collisions, floating }. A 2D frame shows
// neither depth nor grounding, so these give the agent objective feedback a
// screenshot cannot. On a global separate from __agon_preview so it never
// affects ready/shot detection. Meshes tagged userData.agonScaffold (the
// ground) are excluded.
const COLLISION_OVERLAP_THRESHOLD = 0.25; // deep overlap: fraction of the smaller mesh's volume
const FLOAT_MIN_GAP_FRACTION = 0.15; // a hover gap must exceed this x the object's own size...
const FLOAT_MAX_GAP_FRACTION = 3.0;  // ...and stay under this (a far gap reads as an intentional floater)
const MAX_REPORTED_ITEMS = 12;

interface BoxInfo { label: string; box: THREE.Box3; vol: number; maxDim: number }

function collectBoxes(scene: THREE.Object3D): BoxInfo[] {
  const size = new THREE.Vector3();
  const out: BoxInfo[] = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh || !o.visible || o.userData?.agonScaffold) return;
    const box = new THREE.Box3().setFromObject(o);
    if (box.isEmpty()) return;
    box.getSize(size);
    const vol = size.x * size.y * size.z;
    if (vol <= 1e-6) return;
    const c = box.getCenter(new THREE.Vector3());
    const label = `${o.name || mesh.geometry?.type || 'Mesh'}@(${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)})`;
    out.push({ label, box, vol, maxDim: Math.max(size.x, size.y, size.z) });
  });
  return out;
}

// Objects should touch, not sink into one another; a shallow contact overlap (a
// roof sitting ON a wall) is ignored, a deep one (a roof sunk INTO it) flagged.
function reportCollisions(boxes: BoxInfo[]) {
  const size = new THREE.Vector3();
  const inter = new THREE.Box3();
  const hits: { a: string; b: string; pct: number }[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i];
      const B = boxes[j];
      if (!A.box.intersectsBox(B.box)) continue;
      inter.copy(A.box).intersect(B.box);
      inter.getSize(size);
      const overlap = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
      const frac = overlap / Math.min(A.vol, B.vol);
      if (frac >= COLLISION_OVERLAP_THRESHOLD) hits.push({ a: A.label, b: B.label, pct: Math.round(frac * 100) });
    }
  }
  hits.sort((x, y) => y.pct - x.pct);
  return hits.slice(0, MAX_REPORTED_ITEMS);
}

// An object "hovers" when a larger object sits directly under its footprint with
// a vertical gap that is small relative to the object — it looks like it should
// rest on that surface but does not. A far gap (bird, cloud, floating island) is
// left alone, and an object with nothing beneath it is never flagged.
function reportFloating(boxes: BoxInfo[]) {
  const ca = new THREE.Vector3();
  const hits: { a: string; b: string; gap: number }[] = [];
  for (const A of boxes) {
    A.box.getCenter(ca);
    let supportTop = -Infinity;
    let supportLabel = '';
    for (const B of boxes) {
      if (B === A || B.vol <= A.vol) continue;
      if (ca.x < B.box.min.x || ca.x > B.box.max.x || ca.z < B.box.min.z || ca.z > B.box.max.z) continue;
      if (B.box.max.y > A.box.min.y + 1e-4) continue;
      if (B.box.max.y > supportTop) { supportTop = B.box.max.y; supportLabel = B.label; }
    }
    if (supportTop === -Infinity) continue;
    const gap = A.box.min.y - supportTop;
    if (gap > FLOAT_MIN_GAP_FRACTION * A.maxDim && gap < FLOAT_MAX_GAP_FRACTION * A.maxDim) {
      hits.push({ a: A.label, b: supportLabel, gap: Math.round(gap * 100) / 100 });
    }
  }
  hits.sort((x, y) => y.gap - x.gap);
  return hits.slice(0, MAX_REPORTED_ITEMS);
}

function PreviewBridge() {
  const { scene } = useThree();
  useEffect(() => {
    const w = window as unknown as { __agon_geometry?: { inspect: () => unknown } };
    w.__agon_geometry = {
      inspect: () => {
        const boxes = collectBoxes(scene);
        return { collisions: reportCollisions(boxes), floating: reportFloating(boxes) };
      },
    };
  }, [scene]);
  return null;
}

/**
 * SceneShell — a correct-by-default render pipeline and camera controls; the look
 * is left to the caller.
 *
 * Baked in: ACES tone mapping, sRGB, MSAA + SMAA, logarithmicDepthBuffer, dpr
 * [1,2], and damped OrbitControls with the standard drag/zoom mapping.
 *
 * Neutral / opt-in (design these per scene): lighting defaults to a plain fill so
 * the stage is visible; environment (IBL), ground + contact shadows, fog and the
 * post chain (bloom/vignette) are off by default.
 *
 * During PLAY, pass controls={false} and drive the camera yourself (ChaseCamera,
 * a cockpit rig, or your own useFrame). OrbitControls is for the title screen and
 * your own inspection shots, not gameplay.
 *
 * Override via props (e.g. `<SceneShell environment ground post lights={false}
 * background="#000" camera={{ position:[6,4,8] }} />`), by editing this file, or
 * by replacing it with your own <Canvas>. Scene content goes in `children`.
 */
export interface SceneShellProps {
  children: ReactNode;
  background?: string | null;
  fog?: [string, number, number] | null;
  camera?: { position?: [number, number, number]; fov?: number };
  controls?: boolean | { target?: [number, number, number]; minDistance?: number; maxDistance?: number; autoRotate?: boolean };
  lights?: boolean;
  environment?: boolean;
  ground?: boolean;
  post?: boolean;
}

export default function SceneShell({
  children,
  background = '#161616',
  fog = null,
  camera,
  controls = true,
  lights = true,
  environment = false,
  ground = false,
  post = false,
}: SceneShellProps) {
  const cam = { fov: camera?.fov ?? 45, position: camera?.position ?? ([6, 4, 8] as [number, number, number]) };
  const c = typeof controls === 'object' ? controls : {};
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={cam}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
        logarithmicDepthBuffer: true,
      }}
    >
      {background != null && <color attach="background" args={[background]} />}
      {fog != null && <fog attach="fog" args={fog} />}

      {/* Neutral visibility light ONLY — REPLACE with your scene's real lighting
          (colour, direction, mood, rim, IBL). This is not a look, just "not black". */}
      {lights && (
        <>
          <SoftShadows size={24} samples={12} focus={0.9} />
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[6, 9, 5]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
            shadow-camera-near={0.5}
            shadow-camera-far={80}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />
        </>
      )}

      {environment && (
        <Environment resolution={256}>
          <Lightformer intensity={2} position={[0, 5, -8]} scale={[12, 7, 1]} color="#fff4e6" />
          <Lightformer intensity={0.8} position={[-8, 3, 3]} scale={[7, 7, 1]} color="#8fb4ff" />
        </Environment>
      )}

      {children}

      <PreviewBridge />

      {ground && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ agonScaffold: true }}>
            <planeGeometry args={[400, 400]} />
            <meshStandardMaterial color="#15162b" roughness={0.95} metalness={0} />
          </mesh>
          <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={60} blur={2.6} far={14} resolution={1024} />
        </>
      )}

      {controls && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={c.target ?? [0, 1, 0]}
          minDistance={c.minDistance ?? 1.5}
          maxDistance={c.maxDistance ?? 120}
          autoRotate={c.autoRotate ?? false}
        />
      )}

      {/* multisampling={8} is REQUIRED: EffectComposer disables Canvas antialias,
          so without MSAA/SMAA edges go jagged. Bloom threshold is high + smoothed
          so it does not strobe. */}
      {post && (
        <EffectComposer multisampling={8}>
          <SMAA />
          <Bloom intensity={0.55} luminanceThreshold={0.95} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
