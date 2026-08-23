import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { weddingStore } from '../../game/weddingStore';
import { EntityType, GridWave, NeuralPulse } from '../../types/wedding';

interface NeuralConnectionsProps {
  selectedEntity: {
    type: EntityType;
    id: string;
  } | null;
  gridWaves: GridWave[];
  neuralPulses: NeuralPulse[];
}

export function NeuralConnections({ selectedEntity, gridWaves, neuralPulses }: NeuralConnectionsProps) {
  // Compute the connection lines between selected entity and all linked entities
  const connectionLines = useMemo(() => {
    if (!selectedEntity) return [];

    const originPos = weddingStore.getEntityPosition(selectedEntity.type, selectedEntity.id);
    if (!originPos) return [];

    const lines: {
      from: [number, number, number];
      to: [number, number, number];
      color: string;
      label: string;
    }[] = [];

    if (selectedEntity.type === 'agent') {
      const agent = weddingStore.agents.find((a) => a.id === selectedEntity.id);
      if (agent) {
        // Connect to connected Places
        agent.connectedPlaceIds.forEach((pid) => {
          const p = weddingStore.places.find((x) => x.id === pid);
          if (p) {
            lines.push({
              from: originPos,
              to: p.pos,
              color: '#00ffff',
              label: p.name,
            });
          }
        });
        // Connect to other Agents
        agent.connectedAgentIds.forEach((aid) => {
          const a = weddingStore.agents.find((x) => x.id === aid);
          if (a) {
            lines.push({
              from: originPos,
              to: a.currentPos,
              color: '#ff4d88',
              label: a.name,
            });
          }
        });
      }
    } else if (selectedEntity.type === 'place') {
      const place = weddingStore.places.find((p) => p.id === selectedEntity.id);
      if (place) {
        place.connectedAgentIds.forEach((aid) => {
          const a = weddingStore.agents.find((x) => x.id === aid);
          if (a) {
            lines.push({
              from: originPos,
              to: a.currentPos,
              color: '#00e5ff',
              label: a.name,
            });
          }
        });
      }
    } else if (selectedEntity.type === 'document') {
      const doc = weddingStore.docs.find((d) => d.id === selectedEntity.id);
      if (doc) {
        doc.connectedAgentIds.forEach((aid) => {
          const a = weddingStore.agents.find((x) => x.id === aid);
          if (a) {
            lines.push({
              from: originPos,
              to: a.currentPos,
              color: '#ffd700',
              label: a.name,
            });
          }
        });
        doc.connectedPlaceIds.forEach((pid) => {
          const p = weddingStore.places.find((x) => x.id === pid);
          if (p) {
            lines.push({
              from: originPos,
              to: p.pos,
              color: '#00ffaa',
              label: p.name,
            });
          }
        });
      }
    } else if (selectedEntity.type === 'task') {
      const task = weddingStore.tasks.find((t) => t.id === selectedEntity.id);
      if (task) {
        task.connectedAgentIds.forEach((aid) => {
          const a = weddingStore.agents.find((x) => x.id === aid);
          if (a) {
            lines.push({
              from: originPos,
              to: a.currentPos,
              color: '#ffaa00',
              label: a.name,
            });
          }
        });
      }
    } else if (selectedEntity.type === 'conflict') {
      const conflict = weddingStore.conflicts.find((c) => c.id === selectedEntity.id);
      if (conflict) {
        conflict.impactedEntityIds.forEach((eid) => {
          const target =
            weddingStore.getEntityPosition('agent', eid) ||
            weddingStore.getEntityPosition('place', eid) ||
            weddingStore.getEntityPosition('document', eid);
          if (target) {
            lines.push({
              from: originPos,
              to: target,
              color: '#ff0055',
              label: 'Impact Conflit',
            });
          }
        });
      }
    }

    return lines;
  }, [selectedEntity]);

  return (
    <group>
      {/* 1. Curved Glowing Neural Cable Arcs */}
      {connectionLines.map((line, idx) => (
        <NeuralArc key={idx} from={line.from} to={line.to} color={line.color} />
      ))}

      {/* 2. Traveling Photon Pulses along Connections */}
      {neuralPulses.map((pulse) => (
        <TravelingPhoton key={pulse.id} pulse={pulse} />
      ))}

      {/* 3. Expanding Grid Waves / Propagation Ripples */}
      {gridWaves.map((wave) => (
        <SingleGridWave key={wave.id} wave={wave} />
      ))}
    </group>
  );
}

// 3D Quadratic Bezier Arc between two points
function NeuralArc({
  from,
  to,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const lineObject = useMemo(() => {
    const start = new THREE.Vector3(from[0], from[1] + 0.8, from[2]);
    const end = new THREE.Vector3(to[0], to[1] + 0.8, to[2]);
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    const dist = start.distanceTo(end);
    mid.y += Math.max(1.5, dist * 0.25); // Arch height

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(24);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.85 });
    return new THREE.Line(geo, mat);
  }, [from, to, color]);

  return (
    <group>
      {/* Laser line primitive */}
      <primitive object={lineObject} />
      {/* Glowing End Nodes */}
      <mesh position={[to[0], to[1] + 0.8, to[2]]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// Single Traveling Photon Particle
function TravelingPhoton({ pulse }: { pulse: NeuralPulse }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const progress = pulse.progress;
    const start = new THREE.Vector3(pulse.from[0], pulse.from[1] + 0.8, pulse.from[2]);
    const end = new THREE.Vector3(pulse.to[0], pulse.to[1] + 0.8, pulse.to[2]);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 2.0;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pt = curve.getPoint(Math.min(1, Math.max(0, progress)));
    ref.current.position.copy(pt);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.22, 8, 8]} />
      <meshBasicMaterial color={pulse.color} />
    </mesh>
  );
}

// Expanding 3D Ripple Ring on the Grid Ground
function SingleGridWave({ wave }: { wave: GridWave }) {
  const outerR = Math.max(0.3, wave.radius);
  const innerR = Math.max(0.05, outerR * 0.85);

  return (
    <mesh
      position={[wave.center[0], 0.08, wave.center[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[innerR, outerR, 32]} />
      <meshBasicMaterial
        color={wave.color}
        transparent
        opacity={wave.strength * 0.75}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
