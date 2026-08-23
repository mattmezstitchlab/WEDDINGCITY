// Damped third-person chase camera. Point it at the player's Object3D via a ref;
// it trails behind at `offset` and looks slightly ahead. Uses maath's damp3 for
// framerate-independent smoothing. Disable SceneShell's OrbitControls
// (controls={false}) while this drives the camera.

import { useRef, type RefObject } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { damp3 } from 'maath/easing';
import * as THREE from 'three';

interface ChaseCameraProps {
  target: RefObject<THREE.Object3D | null>;
  offset?: [number, number, number];
  smoothing?: number; // seconds to close ~63% of the gap; lower = snappier
  lookAhead?: number;
}

export default function ChaseCamera({
  target,
  offset = [0, 5, 9],
  smoothing = 0.25,
  lookAhead = 2,
}: ChaseCameraProps) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const offsetVec = useRef(new THREE.Vector3(...offset));

  useFrame((_s, delta) => {
    const t = target.current;
    if (!t) return;
    desired.current.copy(t.position).add(offsetVec.current);
    damp3(camera.position, desired.current, smoothing, delta);
    lookTarget.current.set(t.position.x, t.position.y + lookAhead, t.position.z);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
