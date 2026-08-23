import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BRAND_ACCENT } from '../../game/weddingStore';

interface AtmosphereAndEffectsProps {
  time: number;
  cameraFlashing: boolean;
  sparklersActive: boolean;
  fireworksActive: boolean;
}

export function AtmosphereAndEffects({
  time,
  cameraFlashing,
  sparklersActive,
  fireworksActive,
}: AtmosphereAndEffectsProps) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const petalsRef = useRef<THREE.InstancedMesh>(null);
  const fireworksRef = useRef<THREE.Group>(null);

  // Lighting computation matching time of day with architectural subtlety
  const lightingParams = useMemo(() => {
    if (time < 13.0) {
      // Crisp Morning
      return {
        sunColor: '#fff8eb',
        sunIntensity: 1.5,
        sunPos: [16, 22, 14] as [number, number, number],
        ambientColor: '#dbe4f0',
        ambientIntensity: 0.6,
      };
    } else if (time < 16.5) {
      // Afternoon
      return {
        sunColor: '#ffffff',
        sunIntensity: 1.6,
        sunPos: [14, 24, 10] as [number, number, number],
        ambientColor: '#e2ebf5',
        ambientIntensity: 0.65,
      };
    } else if (time < 19.5) {
      // Golden Hour (17h - 19h30)
      return {
        sunColor: '#f5b562',
        sunIntensity: 1.7,
        sunPos: [-18, 14, 16] as [number, number, number],
        ambientColor: '#ebd5be',
        ambientIntensity: 0.55,
      };
    } else if (time < 22.5) {
      // Twilight / Reception
      return {
        sunColor: '#a78bfa',
        sunIntensity: 1.0,
        sunPos: [-12, 12, -12] as [number, number, number],
        ambientColor: '#38324a',
        ambientIntensity: 0.45,
      };
    } else {
      // Night Party
      return {
        sunColor: '#818cf8',
        sunIntensity: 0.7,
        sunPos: [0, 18, -16] as [number, number, number],
        ambientColor: '#1e2138',
        ambientIntensity: 0.4,
      };
    }
  }, [time]);

  // Subtle floating white petal particles
  const petalCount = 60;
  const petalData = useMemo(() => {
    return Array.from({ length: petalCount }).map(() => ({
      x: (Math.random() - 0.5) * 36,
      y: 0.5 + Math.random() * 8,
      z: (Math.random() - 0.5) * 36,
      rotX: Math.random() * Math.PI,
      rotY: Math.random() * Math.PI,
      speedY: 0.25 + Math.random() * 0.45,
      speedRot: 0.8 + Math.random() * 1.5,
      scale: 0.1 + Math.random() * 0.08,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (petalsRef.current) {
      petalData.forEach((p, i) => {
        p.y -= p.speedY * delta;
        p.rotX += p.speedRot * delta;
        p.rotY += p.speedRot * 0.6 * delta;
        p.x += Math.sin(state.clock.elapsedTime * 0.8 + i) * 0.008;

        if (p.y < 0.1) {
          p.y = 7 + Math.random() * 2;
        }

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rotX, p.rotY, 0);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.updateMatrix();
        petalsRef.current!.setMatrixAt(i, dummy.matrix);
      });
      petalsRef.current.instanceMatrix.needsUpdate = true;
    }

    if (flashLightRef.current) {
      flashLightRef.current.intensity = cameraFlashing ? 10.0 : 0;
    }

    if (fireworksRef.current && fireworksActive) {
      fireworksRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const speed = 1.8 + idx * 0.4;
        mesh.position.y = 8 + (Math.sin(state.clock.elapsedTime * speed) + 1) * 3.5;
        mesh.scale.setScalar(0.7 + Math.sin(state.clock.elapsedTime * 5 + idx) * 0.3);
      });
    }
  });

  return (
    <group>
      {/* Universal Hemisphere Fill */}
      <hemisphereLight args={['#e8edf5', '#2a3342', 0.4]} />

      {/* Ambient Light */}
      <ambientLight intensity={0.6} color="#ffffff" />

      {/* Key Directional Sun Light */}
      <directionalLight
        ref={dirLightRef}
        position={lightingParams.sunPos}
        intensity={lightingParams.sunIntensity}
        color={lightingParams.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-camera-near={0.5}
        shadow-camera-far={90}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Subtle Warm Rim Light for Silhouette Definition */}
      <directionalLight
        position={[-lightingParams.sunPos[0], 12, -lightingParams.sunPos[2]]}
        intensity={0.35}
        color={BRAND_ACCENT}
      />

      {/* Camera Flash Point Light */}
      <pointLight ref={flashLightRef} position={[-8, 3, 2]} color="#ffffff" distance={25} decay={2} />

      {/* Floating Peony Petals */}
      <instancedMesh ref={petalsRef} args={[undefined, undefined, petalCount]}>
        <planeGeometry args={[0.8, 0.6]} />
        <meshStandardMaterial
          color="#f8fafc"
          side={THREE.DoubleSide}
          roughness={0.7}
          transparent
          opacity={0.8}
        />
      </instancedMesh>

      {/* Cold Sparkler Fountains on Stage */}
      {sparklersActive && (
        <group position={[2, 0, -16]}>
          {[-2.5, 2.5].map((spx, idx) => (
            <mesh key={idx} position={[spx, 1.8, 0]}>
              <cylinderGeometry args={[0.06, 0.28, 3.2, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      )}

      {/* Subtle Night Sky Spark Lights */}
      {fireworksActive && (
        <group ref={fireworksRef} position={[0, 12, -22]}>
          {[-8, -2, 4, 10].map((fx, idx) => (
            <mesh key={idx} position={[fx, 10, 0]}>
              <sphereGeometry args={[0.6, 10, 10]} />
              <meshBasicMaterial color={['#ffffff', BRAND_ACCENT, '#f8fafc', BRAND_ACCENT][idx]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
