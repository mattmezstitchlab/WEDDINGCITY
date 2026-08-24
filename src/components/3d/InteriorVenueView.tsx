import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { weddingStore, BRAND_ACCENT } from '../../game/weddingStore';
import { PlacedObject } from '../../types/wedding';
import { installInput, moveAxes } from '../../game/input';

interface InteriorVenueViewProps {
  venueId: string;
}

export function InteriorVenueView({ venueId }: InteriorVenueViewProps) {
  const store = weddingStore;
  const venue = store.reconstructedVenues.find((v) => v.id === venueId) || store.reconstructedVenues[0];
  const objects = store.placedObjects.filter((o) => o.venueId === venueId || !o.venueId);

  const avatarRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  // Keyboard state for avatar movement.
  //
  // This used to be a local `keys` ref that NOTHING ever wrote to, so WASD was
  // silently inert. The project already shipped a correct, well-tested input
  // module (game/input.ts) that was never mounted — we install it here rather
  // than re-implementing key handling.
  useEffect(() => installInput(), []);

  useFrame((state, delta) => {
    // 1. WASD movement of player avatar inside the venue
    // moveAxes() is already normalized (diagonals clamped to length 1) and
    // supports both WASD and the arrow keys. y = forward, scene forward = -Z.
    const axes = moveAxes();
    const moveX = axes.x;
    const moveZ = -axes.y;

    const isWalking = moveX !== 0 || moveZ !== 0;

    if (isWalking) {
      const speed = 7.0 * delta;
      const targetX = THREE.MathUtils.clamp(store.avatarPos[0] + moveX * speed, -13, 13);
      const targetZ = THREE.MathUtils.clamp(store.avatarPos[2] + moveZ * speed, -13, 13);
      store.avatarPos = [targetX, 0, targetZ];
      store.avatarRot = Math.atan2(moveX, moveZ);

      // Walk cycle
      const t = state.clock.getElapsedTime() * 12;
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t) * 0.6;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t) * 0.6;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t) * 0.5;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t) * 0.5;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }

    if (avatarRef.current) {
      avatarRef.current.position.set(store.avatarPos[0], store.avatarPos[1], store.avatarPos[2]);
      avatarRef.current.rotation.y = store.avatarRot;
    }
  });

  return (
    <group>
      {/* 0. Interior Flooring (Parquet de chêne massif blanchi) */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 28]} />
        <meshStandardMaterial
          color="#332a24"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Grid helper on floor for construction alignment */}
      {store.constructionMode && (
        <gridHelper args={[28, 28, BRAND_ACCENT, 'rgba(255,255,255,0.15)']} position={[0, 0.02, 0]} />
      )}

      {/* 1. Architectural Perimeter Walls with Glass Windows & Door Portals */}
      {/* Back Wall */}
      <RoundedBox args={[30, 8, 0.4]} radius={0.045} smoothness={3} position={[0, 4, -14]} receiveShadow>
        <meshStandardMaterial color="#ded7cb" roughness={0.7} />
      </RoundedBox>
      {/* Front Entrance Wall */}
      <RoundedBox args={[12, 8, 0.4]} radius={0.045} smoothness={3} position={[-9, 4, 14]} receiveShadow>
        <meshStandardMaterial color="#ded7cb" roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[12, 8, 0.4]} radius={0.045} smoothness={3} position={[9, 4, 14]} receiveShadow>
        <meshStandardMaterial color="#ded7cb" roughness={0.7} />
      </RoundedBox>
      {/* Left Wall */}
      <RoundedBox args={[28, 8, 0.4]} radius={0.045} smoothness={3} position={[-15, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <meshStandardMaterial color="#ded7cb" roughness={0.7} />
      </RoundedBox>
      {/* Right Wall */}
      <RoundedBox args={[28, 8, 0.4]} radius={0.045} smoothness={3} position={[15, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <meshStandardMaterial color="#ded7cb" roughness={0.7} />
      </RoundedBox>

      {/* 2. Steel & Timber Vaulted Ceiling with Skylights */}
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 28]} />
        <meshStandardMaterial color="#1a202c" roughness={0.5} wireframe />
      </mesh>

      {/* 3. Warm Ambient Pendant Chandeliers */}
      {[-8, 0, 8].map((cx, i) =>
        [-6, 2].map((cz, j) => (
          <group key={`${i}_${j}`} position={[cx, 6.2, cz]}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
              <meshStandardMaterial color="#e2b448" metalness={0.55} /*tok:brass*/ />
            </mesh>
            <mesh position={[0, -0.9, 0]}>
              <sphereGeometry args={[0.3, 12, 12]} />
              <meshStandardMaterial color="#ffe8be" emissive="#ffc46b" emissiveIntensity={0.42} />
            </mesh>
            <pointLight intensity={1.5} distance={14} color="#ffeed4" />
          </group>
        ))
      )}

      {/* 4. Placed Interactive Objects & Furniture */}
      {objects.map((obj) => (
        <SinglePlacedObject3D
          key={obj.id}
          obj={obj}
          isSelected={store.selectedObjectId === obj.id}
          isConstruction={store.constructionMode}
        />
      ))}

      {/* 5. Player Animated Avatar inside Venue */}
      <group
        ref={avatarRef}
        position={[store.avatarPos[0], store.avatarPos[1], store.avatarPos[2]]}
      >
        {/* Selection / Position Ring */}
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.58, 24]} />
          <meshBasicMaterial color={BRAND_ACCENT} side={THREE.DoubleSide} />
        </mesh>

        {/* Torso */}
        <RoundedBox args={[0.44, 0.54, 0.26]} radius={0.04} position={[0, 0.7, 0]} castShadow>
          <meshStandardMaterial color={store.userIdentity.outfitColor || BRAND_ACCENT} />
        </RoundedBox>

        {/* Head */}
        <group position={[0, 1.22, 0]}>
          <RoundedBox args={[0.36, 0.36, 0.34]} radius={0.05} castShadow>
            <meshStandardMaterial color="#e8cbb1" />
          </RoundedBox>
          <RoundedBox args={[0.4, 0.18, 0.38]} radius={0.05} position={[0, 0.14, 0]}>
            <meshStandardMaterial color="#2b231c" />
          </RoundedBox>
        </group>

        {/* Arms */}
        <RoundedBox ref={leftArmRef} args={[0.11, 0.4, 0.11]} radius={0.02} position={[-0.28, 0.7, 0]}>
          <meshStandardMaterial color={store.userIdentity.outfitColor || BRAND_ACCENT} />
        </RoundedBox>
        <RoundedBox ref={rightArmRef} args={[0.11, 0.4, 0.11]} radius={0.02} position={[0.28, 0.7, 0]}>
          <meshStandardMaterial color={store.userIdentity.outfitColor || BRAND_ACCENT} />
        </RoundedBox>

        {/* Legs */}
        <RoundedBox args={[0.13, 0.42, 0.13]} radius={0.036} smoothness={3} ref={leftLegRef} position={[-0.11, 0.22, 0]}>
          <meshStandardMaterial color="#111520" />
        </RoundedBox>
        <RoundedBox args={[0.13, 0.42, 0.13]} radius={0.036} smoothness={3} ref={rightLegRef} position={[0.11, 0.22, 0]}>
          <meshStandardMaterial color="#111520" />
        </RoundedBox>
      </group>
    </group>
  );
}

// 3D Visualizer for each Placed Object inside the Venue
function SinglePlacedObject3D({
  obj,
  isSelected,
  isConstruction,
}: {
  obj: PlacedObject;
  isSelected: boolean;
  isConstruction: boolean;
}) {
  const store = weddingStore;

  const handleClick = (e: any) => {
    e.stopPropagation();
    store.selectedObjectId = obj.id;
    store.selectEntity('object', obj.id);
  };

  return (
    <group
      position={obj.pos}
      rotation={[0, obj.rotY, 0]}
      scale={obj.scale}
      onClick={handleClick}
    >
      {/* Highlight bounding ring in construction mode or when selected */}
      {(isSelected || isConstruction) && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.35, 32]} />
          <meshBasicMaterial color={isSelected ? BRAND_ACCENT : 'rgba(255,255,255,0.2)'} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Render object geometry by category */}
      {obj.category === 'table' ? (
        <group>
          {/* Table Top & Linen */}
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.8, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* Table Runner & Candle */}
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.2, 0.15, 0.25, 8]} />
            <meshStandardMaterial color="#ffe8be" emissive="#ffc46b" emissiveIntensity={0.42} />
          </mesh>
          {/* Chairs surrounding table */}
          {Array.from({ length: obj.tableCapacity || 8 }).map((_, cIdx) => {
            const angle = (cIdx / (obj.tableCapacity || 8)) * Math.PI * 2;
            const cx = Math.cos(angle) * 1.5;
            const cz = Math.sin(angle) * 1.5;
            return (
              <RoundedBox args={[0.4, 0.65, 0.4]} radius={0.045} smoothness={3} key={cIdx} position={[cx, 0.32, cz]} rotation={[0, -angle + Math.PI / 2, 0]} castShadow>
                <meshStandardMaterial color="#7a624a" roughness={0.7} />
              </RoundedBox>
            );
          })}
        </group>
      ) : obj.category === 'bar' ? (
        <group>
          <RoundedBox args={[3.6, 1.1, 1.0]} position={[0, 0.55, 0]} castShadow>
            <meshStandardMaterial color="#111520" roughness={0.3} metalness={0.08} /*tok:matte*/ />
          </RoundedBox>
          <RoundedBox args={[3.8, 0.08, 1.1]} radius={0.022} smoothness={3} position={[0, 1.12, 0]}>
            <meshStandardMaterial color={BRAND_ACCENT} metalness={0.55} /*tok:brass*/ roughness={0.32} />
          </RoundedBox>
        </group>
      ) : obj.category === 'stage' ? (
        <group>
          <RoundedBox args={[4.5, 0.5, 3.0]} radius={0.045} smoothness={3} position={[0, 0.25, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#1a202c" roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 1.1, -0.8]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
            <meshStandardMaterial color={BRAND_ACCENT} metalness={0.55} /*tok:brass*/ />
          </mesh>
        </group>
      ) : obj.category === 'lounge' ? (
        <group>
          <RoundedBox args={[2.2, 0.65, 0.9]} position={[0, 0.35, 0]} radius={0.1} castShadow>
            <meshStandardMaterial color="#2d3b30" roughness={0.8} />
          </RoundedBox>
          <RoundedBox args={[2.2, 0.45, 0.3]} position={[0, 0.75, -0.3]} radius={0.08} castShadow>
            <meshStandardMaterial color="#2d3b30" roughness={0.8} />
          </RoundedBox>
        </group>
      ) : (
        <RoundedBox args={[0.8, 1.0, 0.8]} position={[0, 0.5, 0]} castShadow>
          <meshStandardMaterial color={BRAND_ACCENT} />
        </RoundedBox>
      )}
    </group>
  );
}
