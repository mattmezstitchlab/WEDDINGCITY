import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Agent } from '../../types/wedding';
import { weddingStore, BRAND_ACCENT } from '../../game/weddingStore';
import { materials } from '../../design/tokens';

interface VoxelAgentsProps {
  agents: Agent[];
  selectedId: string | null;
  hoveredId: string | null;
}

export function VoxelAgents({ agents, selectedId, hoveredId }: VoxelAgentsProps) {
  return (
    <group>
      {agents.map((agent) => (
        <SingleVoxelAgent
          key={agent.id}
          agent={agent}
          isSelected={selectedId === agent.id}
          isHovered={hoveredId === agent.id}
        />
      ))}
    </group>
  );
}

function SingleVoxelAgent({
  agent,
  isSelected,
  isHovered,
}: {
  agent: Agent;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    groupRef.current.position.set(agent.currentPos[0], agent.currentPos[1], agent.currentPos[2]);
    groupRef.current.rotation.y = agent.rotation;

    const t = state.clock.getElapsedTime();
    const isMoving =
      Math.hypot(
        agent.targetPos[0] - agent.currentPos[0],
        agent.targetPos[2] - agent.currentPos[2]
      ) > 0.1;

    if (isMoving) {
      const walkFreq = 11;
      groupRef.current.position.y = agent.currentPos[1] + Math.abs(Math.sin(t * walkFreq)) * 0.12;
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * walkFreq) * 0.55;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * walkFreq) * 0.55;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * walkFreq) * 0.45;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * walkFreq) * 0.45;
    } else {
      const isDancing = agent.assignedPlaceId === 'place_dancefloor' && weddingStore.time >= 22.5;
      const idleSpeed = isDancing ? 7 : 2.0;
      const bob = Math.sin(t * idleSpeed + agent.id.charCodeAt(agent.id.length - 1)) * (isDancing ? 0.1 : 0.03);
      groupRef.current.position.y = agent.currentPos[1] + (bob > 0 ? bob : 0);

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * 1.2 + agent.id.charCodeAt(0)) * 0.15;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = isDancing ? Math.sin(t * 6) * 0.6 : 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = isDancing ? -Math.sin(t * 6) * 0.6 : 0;
    }
  });

  const skinColor = '#e8cbb1';
  let bodyColor = agent.avatarColor;
  let hairColor = '#2b231c';

  if (agent.role === 'bride') {
    bodyColor = '#ffffff';
    hairColor = '#b89467';
  } else if (agent.role === 'groom') {
    bodyColor = '#171b26';
    hairColor = '#1a1917';
  } else if (agent.role === 'photographer') {
    bodyColor = '#1e2433';
    hairColor = '#2d3342';
  } else if (agent.role === 'videographer') {
    bodyColor = '#293245';
    hairColor = '#1f2430';
  } else if (agent.role === 'dj') {
    bodyColor = '#1c1f2e';
    hairColor = '#3a4157';
  } else if (agent.role === 'chef' || agent.role === 'caterer') {
    bodyColor = '#f8fafc';
    hairColor = '#334155';
  } else if (agent.role === 'florist') {
    bodyColor = '#2d3b30';
    hairColor = '#4a3224';
  } else if (agent.role === 'wedding_planner') {
    bodyColor = '#1e2330';
    hairColor = '#1b1b1f';
  }

  const highlightRingColor = agent.isConflict
    ? '#f43f5e'
    : isSelected
    ? BRAND_ACCENT
    : isHovered
    ? '#ffffff'
    : null;

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        weddingStore.selectEntity('agent', agent.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        weddingStore.setHoveredEntity(agent.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        weddingStore.setHoveredEntity(null);
      }}
    >
      {/* Selection / Active Halo Ring */}
      {highlightRingColor && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.58, 24]} />
          <meshBasicMaterial color={highlightRingColor} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating Status Beacon */}
      {agent.isConflict && (
        <mesh position={[0, 2.1, 0]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>
      )}

      {/* ---------------- VOXEL AGENT SILHOUETTE ---------------- */}

      {/* Torso with DMC Color on upper chest */}
      <RoundedBox args={[0.44, 0.54, 0.26]} radius={0.04} smoothness={2} position={[0, 0.7, 0]} castShadow>
        <meshStandardMaterial
          color={weddingStore.isCurrentUserAgent(agent.id) ? weddingStore.userDmcIdentity.dmcColor : bodyColor}
          roughness={0.6}
          emissive={isSelected ? BRAND_ACCENT : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </RoundedBox>

      {/* Micro Embroidered DMC Badge / Emblem on Chest */}
      {/* Identity is bound by PERSON ID, not by role: two people sharing a
          role used to both render as the connected user. */}
      {weddingStore.isCurrentUserAgent(agent.id) && (
        <RoundedBox args={[0.08, 0.08, 0.02]} radius={0.006} smoothness={3} position={[0.1, 0.8, 0.14]}>
          <meshStandardMaterial color={BRAND_ACCENT} emissive={BRAND_ACCENT} emissiveIntensity={0.42} />
        </RoundedBox>
      )}

      {/* RSVP state, projected onto the character itself.
          A guest is no longer just a row in a list: pending and declined
          answers are visible in the world. Uses the existing voxel vocabulary
          (a small emissive marker), not a new visual language. */}
      {(() => {
        const person = weddingStore.getPersonForAgent(agent.id);
        const guest = person ? weddingStore.getGuestForPerson(person.id) : null;
        if (!guest || guest.rsvp.status === 'accepted') return null;
        const color =
          guest.rsvp.status === 'declined' ? '#f43f5e'
            : guest.rsvp.status === 'tentative' ? '#38bdf8'
              : '#eab308';
        return (
          <mesh position={[0, 1.72, 0]}>
            <octahedronGeometry args={[0.07, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.42} />
          </mesh>
        );
      })()}

      {/* Head & Hair */}
      <group ref={headRef} position={[0, 1.22, 0]}>
        <RoundedBox args={[0.36, 0.36, 0.34]} radius={0.05} smoothness={2} castShadow>
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </RoundedBox>
        <RoundedBox args={[0.4, 0.18, 0.38]} radius={0.05} position={[0, 0.14, 0]}>
          <meshStandardMaterial color={hairColor} roughness={0.8} />
        </RoundedBox>
        <mesh position={[-0.08, 0, 0.18]}>
          <planeGeometry args={[0.04, 0.04]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.08, 0, 0.18]}>
          <planeGeometry args={[0.04, 0.04]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>

        {/* Bride Veil */}
        {agent.role === 'bride' && (
          <group position={[0, 0.15, 0]}>
            <mesh position={[0, -0.38, -0.2]} rotation={[0.15, 0, 0]}>
              <planeGeometry args={[0.48, 0.85]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.65} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* Chef Toque */}
        {(agent.role === 'chef' || agent.role === 'caterer') && (
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.22, 0.18, 0.4, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
        )}

        {/* DJ Headphones */}
        {agent.role === 'dj' && (
          <group position={[0, 0, 0]}>
            <mesh position={[-0.2, 0, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={BRAND_ACCENT} />
            </mesh>
            <mesh position={[0.2, 0, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={BRAND_ACCENT} />
            </mesh>
          </group>
        )}
      </group>

      {/* Arms */}
      <RoundedBox ref={leftArmRef} args={[0.11, 0.4, 0.11]} radius={0.02} position={[-0.28, 0.7, 0]} castShadow>
        <meshStandardMaterial color={bodyColor} />
      </RoundedBox>
      <RoundedBox ref={rightArmRef} args={[0.11, 0.4, 0.11]} radius={0.02} position={[0.28, 0.7, 0]} castShadow>
        <meshStandardMaterial color={bodyColor} />
      </RoundedBox>

      {/* Role Props */}
      {agent.role === 'bride' && (
        <group position={[0, 0.6, 0.22]}>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </group>
      )}

      {agent.role === 'photographer' && (
        <group position={[0, 0.7, 0.22]}>
          <RoundedBox args={[0.22, 0.14, 0.16]} radius={0.039} smoothness={3} castShadow>
            <meshStandardMaterial color="#111520" metalness={0.08} /*tok:matte*/ />
          </RoundedBox>
          <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
            <meshStandardMaterial color={BRAND_ACCENT} emissive={BRAND_ACCENT} emissiveIntensity={0.42} />
          </mesh>
        </group>
      )}

      {/* Pre-existing bug found while bevelling: the geometry and material
          were direct children of a <group>, which renders NOTHING in R3F.
          The wedding planner's clipboard has never actually been visible. */}
      {agent.role === 'wedding_planner' && (
        <group position={[0, 0.7, 0.2]} rotation={[0.3, 0, 0]}>
          <RoundedBox args={[0.18, 0.26, 0.02]} radius={0.006} smoothness={3} castShadow>
            <meshStandardMaterial color="#e2e8f0" roughness={materials.matte.roughness} metalness={materials.matte.metalness} />
          </RoundedBox>
        </group>
      )}

      {/* Legs */}
      <RoundedBox args={[0.13, 0.42, 0.13]} radius={0.036} smoothness={3} ref={leftLegRef} position={[-0.11, 0.22, 0]} castShadow>
        <meshStandardMaterial color="#111520" />
      </RoundedBox>
      <RoundedBox args={[0.13, 0.42, 0.13]} radius={0.036} smoothness={3} ref={rightLegRef} position={[0.11, 0.22, 0]} castShadow>
        <meshStandardMaterial color="#111520" />
      </RoundedBox>
    </group>
  );
}
