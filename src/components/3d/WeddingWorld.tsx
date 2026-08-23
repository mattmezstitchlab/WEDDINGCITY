import { useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { damp3 } from 'maath/easing';

import { weddingStore } from '../../game/weddingStore';
import { EstateEnvironment } from './EstateEnvironment';
import { VoxelAgents } from './VoxelAgents';
import { NeuralConnections } from './NeuralConnections';
import { AtmosphereAndEffects } from './AtmosphereAndEffects';
import { InteriorVenueView } from './InteriorVenueView';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { StudioEnvironment } from './StudioEnvironment';
import { sampleFrame, setRenderContext, markDegraded } from '../../game/perfMonitor';

function PreviewAndSimRig() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame((state, delta) => {
    // Real measurement, fed to the System Nerve RENDER_3D probe.
    sampleFrame(delta);
    if (state.clock.elapsedTime % 1 < delta) {
      setRenderContext({
        dpr: state.gl.getPixelRatio(),
        triangles: state.gl.info.render.triangles,
        calls: state.gl.info.render.calls,
        geometries: state.gl.info.memory.geometries,
        textures: state.gl.info.memory.textures,
      });
    }
    weddingStore.tick(delta);

    if (controlsRef.current) {
      if (weddingStore.interiorMode) {
        const av = weddingStore.avatarPos;
        damp3(controlsRef.current.target, new THREE.Vector3(av[0], 1.2, av[2]), 0.25, delta);
      } else {
        const target = weddingStore.cameraTargetPos;
        damp3(controlsRef.current.target, new THREE.Vector3(target[0], target[1], target[2]), 0.25, delta);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      target={[-8, 1, 4]}
      minDistance={2}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={Math.PI / 8}
    />
  );
}

function WeddingWorldCanvas() {
  const store = weddingStore;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      <Canvas
        id="wedding-canvas"
        // Percentage-closer soft shadows: the penumbra spreads with distance
        // instead of the previous hard-edged stencil.
        shadows={{ type: THREE.PCFSoftShadowMap }}
        // Was dpr={1}: the edges were literally aliased, which the audit found
        // to be a major contributor to the perceived "hardness".
        // [1, 2] lets R3F pick, and AdaptiveDpr below drops it back down if
        // the frame rate suffers.
        dpr={[1, 2]}
        camera={{ position: [-18, 18, 24], fov: 45 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          // Slightly lifted: with IBL the midtones sit lower, and we want
          // volumes that are soft rather than crushed to black.
          toneMappingExposure: 1.08,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color attach="background" args={['#0c0f17']} />

        {/* Automatic quality fallback. If the frame rate drops, DPR is lowered
            before anything visual is removed — quality degrades gracefully
            instead of the scene stuttering. */}
        <PerformanceMonitor
          onDecline={() => markDegraded('DPR réduit automatiquement : images/s sous le seuil.')}
          onIncline={() => markDegraded(null)}
        />
        <AdaptiveDpr pixelated={false} />

        <Suspense fallback={null}>
          {/* Procedural studio IBL — no HDRI download. This is the single
              biggest softening lever identified by the audit. */}
          <StudioEnvironment daylight={store.time > 7 && store.time < 21 ? 1 : 0.55} />

          {/* Wide, low-opacity grounding shadow. Objects sit in the scene
              instead of floating above a hard directional shadow. */}
          {!store.interiorMode && (
            <ContactShadows
              position={[0, 0.02, 0]}
              scale={90}
              resolution={512}
              far={14}
              blur={3.2}
              opacity={0.34}
              color="#05070c"
              frames={1}
            />
          )}

          {/* Dynamic Regional Lighting & Weather */}
          <AtmosphereAndEffects
            time={store.time}
            cameraFlashing={store.specialFx.cameraFlashing}
            sparklersActive={store.specialFx.sparklersActive}
            fireworksActive={store.specialFx.fireworksActive}
          />

          {store.interiorMode ? (
            <InteriorVenueView venueId={store.activeVenueId || 'venue_orangerie'} />
          ) : (
            <>
              <EstateEnvironment />
              <VoxelAgents
                agents={store.agents}
                selectedId={store.selectedEntity?.type === 'agent' ? store.selectedEntity.id : null}
                hoveredId={store.hoveredEntityId}
              />
              <NeuralConnections
                selectedEntity={store.selectedEntity}
                gridWaves={store.gridWaves}
                neuralPulses={store.neuralPulses}
              />
            </>
          )}

          <PreviewAndSimRig />
        </Suspense>
      </Canvas>
    </div>
  );
}

/**
 * The 3D scene is the single heaviest failure surface (WebGL context loss,
 * driver issues, shader compilation). Scoping a boundary here means a 3D
 * failure degrades to a readable background instead of taking the entire
 * interface — timeline, documents, budget — down with it.
 *
 * The fallback keeps the canvas container's own layout (fixed, z-index 0) so
 * the surrounding UI stays interactive and unchanged.
 */
export function WeddingWorld() {
  return (
    <ErrorBoundary
      label="Monde 3D"
      source="render"
      inline
      fallbackWrapperStyle={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        zIndex: 0,
        background: '#0c0f17',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <WeddingWorldCanvas />
    </ErrorBoundary>
  );
}
