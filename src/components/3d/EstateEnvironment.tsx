import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';
import { weddingStore, BRAND_ACCENT } from '../../game/weddingStore';
import {
  IconMairie,
  IconManoir,
  IconChapelle,
  IconCeremonie,
  IconCocktail,
  IconBanquet,
  IconDancefloor,
  IconHotel,
  IconTransport,
  IconBrunch,
  IconFlorist,
  IconPhoto,
} from '../ui/Icons';

/**
 * The places this hand-built estate actually depicts.
 *
 * MEASURED IN THE BROWSER (multi-project acceptance): this decor is written in
 * JSX, not derived from the store, so a brand-new wedding — with zero places —
 * still showed the demo estate: "Gare TGV & Navettes", "Manoir d'Honneur",
 * "Chapelle & Oliviers"… The World was showing somebody else's venue.
 *
 * The decor is not rebuilt here (out of scope, and it is a real piece of
 * craft): it simply stops claiming to represent places the active project does
 * not have. Below three of them, the estate is not rendered at all and the
 * World shows its ground and whatever the project really contains.
 */
export const ESTATE_PLACE_IDS = [
  'place_parking', 'place_manoir', 'place_ceremonie', 'place_mairie',
  'place_cocktail', 'place_reception', 'place_dancefloor', 'place_chapelle',
];

export function EstateEnvironment() {
  const fountainWaterRef = useRef<THREE.Mesh>(null);
  const depictedPlaces = weddingStore.places
    .filter((p) => ESTATE_PLACE_IDS.includes(p.id)).length;
  const dancefloorRef = useRef<THREE.Group>(null);
  const lightsGroupRef = useRef<THREE.Group>(null);

  // Animated elements
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (fountainWaterRef.current) {
      fountainWaterRef.current.rotation.y = t * 0.25;
      const mat = fountainWaterRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.roughness = 0.15 + Math.sin(t * 2) * 0.05;
      }
    }

    if (dancefloorRef.current) {
      dancefloorRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const m = mesh.material as THREE.MeshStandardMaterial;
          const pulse = (Math.sin(t * 3 + i * 0.4) + 1) * 0.5;
          m.emissiveIntensity = 0.2 + pulse * 0.6;
        }
      });
    }

    if (lightsGroupRef.current) {
      lightsGroupRef.current.children.forEach((child, i) => {
        const light = child as THREE.Mesh;
        if (light.material) {
          const m = light.material as THREE.MeshStandardMaterial;
          const intensity = 0.6 + Math.sin(t * 2 + i) * 0.3;
          m.emissiveIntensity = intensity;
        }
      });
    }
  });

  // Expansive 4X Regional Grid Tiles (X: -54 to 54, Z: -44 to 44)
  const gridTiles = useMemo(() => {
    const tiles: { pos: [number, number, number]; color: string; emissive: string; type: string }[] = [];
    for (let x = -54; x <= 54; x += 3) {
      for (let z = -44; z <= 44; z += 3) {
        let color = '#1a2233';
        let emissive = '#0c101c';
        let type = 'countryside';

        // Road network connecting all 12 hubs across the 4X map
        const isHighwayMainX = (z >= 4 && z <= 8) && (x >= -48 && x <= 42);
        const isHighwaySouthX = (z >= -24 && z <= -20) && (x >= -48 && x <= 42);
        const isHighwayWestZ = (x >= -44 && x <= -40) && (z >= -40 && z <= 36);
        const isHighwayMidWestZ = (x >= -14 && x <= -10) && (z >= -36 && z <= 16);
        const isHighwayMidEastZ = (x >= 8 && x <= 12) && (z >= -38 && z <= 18);
        const isHighwayEastZ = (x >= 30 && x <= 34) && (z >= -24 && z <= 26);

        if (isHighwayMainX || isHighwaySouthX || isHighwayWestZ || isHighwayMidWestZ || isHighwayMidEastZ || isHighwayEastZ) {
          color = '#252a3a';
          emissive = '#11141e';
          type = 'road';
        }
        else if (x <= -34 && z >= 20) {
          color = '#2c3345';
          emissive = '#141824';
          type = 'square';
        }
        else if (x <= -34 && z >= 4 && z <= 16) {
          color = '#242b3b';
          emissive = '#111620';
          type = 'station';
        }
        else if (x <= -34 && z >= -18 && z <= -4) {
          color = '#283144';
          emissive = '#131826';
          type = 'hotel';
        }
        else if (x >= -34 && x <= -22 && z >= -28 && z <= -16) {
          color = '#2a3548';
          emissive = '#141a28';
          type = 'chapel';
        }
        else if (x >= -18 && x <= -6 && z <= -16) {
          color = '#333b52';
          emissive = '#161c2b';
          type = 'manor';
        }
        else if (x >= -6 && x <= 2 && z <= -26) {
          color = '#263b2c';
          emissive = '#102214';
          type = 'serre';
        }
        else if (x >= -18 && x <= -6 && z >= 0 && z <= 14) {
          if (x >= -13 && x <= -11) {
            color = '#f1ebe2';
            emissive = '#382f22';
            type = 'aisle';
          } else {
            color = '#2a4530';
            emissive = '#122617';
            type = 'meadow';
          }
        }
        else if (x >= 4 && x <= 16 && z >= 2 && z <= 14) {
          color = '#382e45';
          emissive = '#1c1524';
          type = 'cocktail';
        }
        else if (x >= 18 && x <= 30 && z >= 22) {
          color = '#3b3428';
          emissive = '#1e1a12';
          type = 'photospot';
        }
        else if (x >= 24 && x <= 40 && z >= -18 && z <= -6) {
          color = '#2d3b52';
          emissive = '#141d2c';
          type = 'banquet';
        }
        else if (x >= 8 && x <= 20 && z <= -26) {
          color = '#352545';
          emissive = '#1a1024';
          type = 'dancefloor';
        }
        else if (x >= 24 && x <= 40 && z >= 12 && z <= 24) {
          color = '#353026';
          emissive = '#1c1810';
          type = 'brunch';
        }

        tiles.push({ pos: [x, -0.1, z], color, emissive, type });
      }
    }
    return tiles;
  }, []);

  const spatialBadgeStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: selected ? 'rgba(226, 180, 72, 0.95)' : 'rgba(18, 21, 30, 0.9)',
    border: `1px solid ${selected ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'}`,
    borderRadius: 999,
    padding: '3px 8px',
    color: selected ? '#08090d' : '#f8fafc',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.02em',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    pointerEvents: 'auto',
    transform: 'scale(0.85)',
    transition: 'all 0.15s ease',
  });


  // The estate depicts SPECIFIC places. When the active project does not have
  // them, its buildings and badges are not drawn — but the ground is: it
  // belongs to every world, and removing it left a generated world floating in
  // pure black (measured in the browser during the World Lab acceptance).
  if (depictedPlaces < 3) {
    return (
      <group>
        <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[260, 220]} />
          <meshStandardMaterial color="#121624" roughness={0.9} metalness={0.05} />
        </mesh>
        <gridHelper args={[120, 40, BRAND_ACCENT, '#28324a']} position={[0, 0.02, 0]} />
      </group>
    );
  }

  return (
    <group>
      {/* 0. Expansive Base Terrain Plane (240x200 units) */}
      <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 220]} />
        <meshStandardMaterial
          color="#121624"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* 1. Regional Worldmap Grid Tiles */}
      {gridTiles.map((tile, i) => (
        <mesh key={i} position={tile.pos} receiveShadow>
          <boxGeometry args={[2.9, 0.2, 2.9]} />
          <meshStandardMaterial
            color={tile.color}
            emissive={tile.emissive}
            emissiveIntensity={0.2}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Thin GPS Worldmap Grid Helper */}
      <gridHelper
        args={[120, 40, BRAND_ACCENT, '#28324a']}
        position={[0, 0.02, 0]}
      />

      {/* ---------------------------------------------------- */}
      {/* HUB 1: HÔTEL DE VILLE / MAIRIE (-42, 0, 28)          */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-42, 0, 28]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_mairie');
        }}
      >
        <RoundedBox args={[8.5, 5.0, 5.0]} radius={0.12} position={[0, 2.5, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#ded7cb" roughness={0.7} />
        </RoundedBox>
        <mesh position={[0, 6.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[5.2, 2.2, 4]} />
          <meshStandardMaterial color="#1e2330" roughness={0.4} />
        </mesh>
        <mesh position={[0, 7.8, 0]}>
          <cylinderGeometry args={[0.8, 0.9, 1.6, 8]} />
          <meshStandardMaterial color="#ded7cb" />
        </mesh>

        <Html position={[0, 8.8, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_mairie')}>
            <IconMairie size={12} color={weddingStore.selectedEntity?.id === 'place_mairie' ? '#08090d' : BRAND_ACCENT} />
            <span>Mairie • Vœux Civils</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 2: STATION GARE & PARKING (-42, 0, 10)           */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-42, 0, 10]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_parking');
        }}
      >
        <mesh position={[0, 2.4, 0]} castShadow>
          <boxGeometry args={[7.5, 0.15, 4.2]} />
          <meshStandardMaterial color="#2c3345" metalness={0.08} /*tok:matte*/ />
        </mesh>
        {[-3, 3].map((px, idx) => (
          <mesh key={idx} position={[px, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.08} /*tok:matte*/ />
          </mesh>
        ))}

        <Html position={[0, 3.8, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_parking')}>
            <IconTransport size={12} color={weddingStore.selectedEntity?.id === 'place_parking' ? '#08090d' : '#ffffff'} />
            <span>Gare TGV & Navettes</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 2B: CONNECT CENTER & PORTAILS NUMÉRIQUES (-28, 0, 10) */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-28, 0, 10]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.connectorsModalOpen = true;
          weddingStore.notify();
        }}
      >
        {/* Modern Titanium & Glass Pavilion */}
        <RoundedBox args={[6.5, 3.8, 4.8]} radius={0.12} position={[0, 1.9, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#1a2233" transparent opacity={0.6} roughness={0.32} metalness={0.08} /*tok:matte*/ />
        </RoundedBox>

        {/* 6 Hologram Portal Rings for Connected Services */}
        {[-2, 0, 2].map((gx, idx) => (
          <group key={idx} position={[gx, 2.2, 2.5]}>
            <mesh rotation={[0, 0, 0]}>
              <ringGeometry args={[0.22, 0.3, 16]} />
              <meshBasicMaterial color={BRAND_ACCENT} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}

        <Html position={[0, 4.2, 0]} center distanceFactor={80}>
          <div style={spatialBadgeStyle(weddingStore.connectorsModalOpen)}>
            <span style={{ fontSize: 11 }}>🔌</span>
            <span>Connect Center • 11 Outils</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 3: HÔTEL DES INVITÉS & LODGES (-42, 0, -10)      */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-42, 0, -10]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_hotel');
        }}
      >
        <RoundedBox args={[7.2, 4.8, 4.8]} radius={0.1} position={[0, 2.4, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#d4cbd8" roughness={0.6} />
        </RoundedBox>
        <mesh position={[0, 5.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[4.8, 1.8, 4]} />
          <meshStandardMaterial color="#222838" />
        </mesh>

        <Html position={[0, 6.8, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_hotel')}>
            <IconHotel size={12} color={weddingStore.selectedEntity?.id === 'place_hotel' ? '#08090d' : '#ffffff'} />
            <span>Hôtel des Invités</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 4: CHAPELLE HISTORIQUE (-28, 0, -22)             */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-28, 0, -22]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_chapelle');
        }}
      >
        <RoundedBox args={[5.8, 4.6, 4.2]} radius={0.12} position={[0, 2.3, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c8bfae" roughness={0.8} />
        </RoundedBox>
        <mesh position={[0, 5.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[3.8, 2.6, 4]} />
          <meshStandardMaterial color="#1e2433" />
        </mesh>

        <Html position={[0, 7.2, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_chapelle')}>
            <IconChapelle size={12} color={weddingStore.selectedEntity?.id === 'place_chapelle' ? '#08090d' : '#ffffff'} />
            <span>Chapelle & Oliviers</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 5: MANOIR D'HONNEUR & LOGES (-12, 0, -22)        */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-12, 0, -22]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_manoir');
        }}
      >
        <RoundedBox args={[9.5, 5.4, 5.4]} radius={0.15} position={[0, 2.7, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#ded7cb" roughness={0.7} />
        </RoundedBox>
        <mesh position={[0, 6.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[5.8, 2.4, 4]} />
          <meshStandardMaterial color="#1e2330" roughness={0.4} />
        </mesh>
        <RoundedBox args={[4.0, 1.2, 1.2]} position={[0, 3.0, 2.8]} castShadow>
          <meshStandardMaterial color="#ece5d8" roughness={0.6} />
        </RoundedBox>

        <Html position={[0, 7.8, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_manoir')}>
            <IconManoir size={12} color={weddingStore.selectedEntity?.id === 'place_manoir' ? '#08090d' : BRAND_ACCENT} />
            <span>Manoir d’Honneur</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 6: ATELIER FLORAL & SERRE (-2, 0, -32)           */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-2, 0, -32]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_serre');
        }}
      >
        <RoundedBox args={[6.2, 3.2, 4.2]} radius={0.08} position={[0, 1.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#2d3b30" roughness={0.6} transparent opacity={0.7} />
        </RoundedBox>

        <Html position={[0, 4.0, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_serre')}>
            <IconFlorist size={12} color={weddingStore.selectedEntity?.id === 'place_serre' ? '#08090d' : '#ffffff'} />
            <span>Atelier Floral</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 7: GRAND PARC & ALLÉE LAÏQUE (-12, 0, 6)         */}
      {/* ---------------------------------------------------- */}
      <group
        position={[-12, 0, 6]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_ceremonie');
        }}
      >
        <group position={[0, 0, -3]}>
          <RoundedBox args={[0.3, 3.8, 0.3]} position={[-1.6, 1.9, 0]} castShadow>
            <meshStandardMaterial color="#5c4a38" roughness={0.8} />
          </RoundedBox>
          <RoundedBox args={[0.3, 3.8, 0.3]} position={[1.6, 1.9, 0]} castShadow>
            <meshStandardMaterial color="#5c4a38" roughness={0.8} />
          </RoundedBox>
          <RoundedBox args={[3.6, 0.3, 0.3]} position={[0, 3.8, 0]} castShadow>
            <meshStandardMaterial color="#5c4a38" roughness={0.8} />
          </RoundedBox>
          <RoundedBox args={[4.0, 0.6, 0.6]} position={[0, 3.9, 0]}>
            <meshStandardMaterial color="#3a5335" roughness={0.9} />
          </RoundedBox>
          <mesh position={[0, 2.5, -0.05]}>
            <planeGeometry args={[2.8, 2.6]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {[-2.8, -1.8, 1.8, 2.8].map((cx, cIdx) => (
          <group key={cIdx}>
            {[0, 1.8, 3.6, 5.4].map((cz, rIdx) => (
              <RoundedBox key={rIdx} args={[0.6, 0.65, 0.6]} position={[cx, 0.32, cz]} castShadow>
                <meshStandardMaterial color="#7a624a" roughness={0.7} />
              </RoundedBox>
            ))}
          </group>
        ))}

        <Html position={[0, 4.8, -3]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_ceremonie')}>
            <IconCeremonie size={12} color={weddingStore.selectedEntity?.id === 'place_ceremonie' ? '#08090d' : BRAND_ACCENT} />
            <span>Cérémonie Laïque</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 8: BELVÉDÈRE COCKTAIL & FONTAINE (10, 0, 8)      */}
      {/* ---------------------------------------------------- */}
      <group
        position={[10, 0, 8]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_cocktail');
        }}
      >
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.6, 2.8, 0.6, 16]} />
          <meshStandardMaterial color="#788291" roughness={0.7} />
        </mesh>
        <mesh ref={fountainWaterRef} position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.4, 16]} />
          <meshStandardMaterial color="#0099cc" emissive="#004466" emissiveIntensity={0.4} roughness={0.28} />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.4, 1.3, 12]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>

        {/* Stretch Nomad Tent & Bar */}
        <group position={[4.5, 0, 1]}>
          <mesh position={[0, 3.2, 0]} rotation={[0.04, 0, -0.04]} castShadow>
            <coneGeometry args={[4.6, 1.4, 4]} />
            <meshStandardMaterial color="#e8ded1" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          <RoundedBox args={[3.4, 1.1, 0.9]} position={[0, 0.55, 0.2]} castShadow>
            <meshStandardMaterial color="#111520" roughness={0.4} />
          </RoundedBox>
        </group>

        <Html position={[0, 4.6, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_cocktail')}>
            <IconCocktail size={12} color={weddingStore.selectedEntity?.id === 'place_cocktail' ? '#08090d' : BRAND_ACCENT} />
            <span>Belvédère & Cocktail</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 9: STUDIO PHOTO & SPOT GOLDEN HOUR (24, 0, 28)   */}
      {/* ---------------------------------------------------- */}
      <group
        position={[24, 0, 28]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_photo_spot');
        }}
      >
        <RoundedBox args={[5.2, 1.2, 3.8]} position={[0, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#3b3428" roughness={0.7} />
        </RoundedBox>

        <Html position={[0, 3.0, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_photo_spot')}>
            <IconPhoto size={12} color={weddingStore.selectedEntity?.id === 'place_photo_spot' ? '#08090d' : '#ffffff'} />
            <span>Spot Golden Hour</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 10: GRAND PAVILLON ORANGERIE & BANQUET (32, 0, -12) */}
      {/* ---------------------------------------------------- */}
      <group
        position={[32, 0, -12]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_reception');
        }}
      >
        <RoundedBox args={[12.5, 4.8, 9.5]} radius={0.08} position={[0, 2.4, 0]} receiveShadow>
          <meshStandardMaterial color="#0b0f19" transparent opacity={0.35} roughness={0.28} metalness={0.08} /*tok:matte*/ />
        </RoundedBox>
        <mesh position={[0, 4.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[7.8, 1.8, 4]} />
          <meshStandardMaterial color="#171b26" wireframe />
        </mesh>

        <RoundedBox args={[4.4, 0.75, 1.4]} position={[0, 0.38, -3.4]} castShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </RoundedBox>

        {[
          [-3.5, 0, -1],
          [0, 0, -0.5],
          [3.5, 0, -1],
          [-3.5, 0, 2.4],
          [0, 0, 2.8],
          [3.5, 0, 2.4],
        ].map((tabPos, tabIdx) => (
          <group key={tabIdx} position={tabPos as [number, number, number]}>
            <mesh position={[0, 0.4, 0]} castShadow>
              <cylinderGeometry args={[1.3, 1.3, 0.8, 16]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.2, 0.15, 0.25, 8]} />
              <meshStandardMaterial color="#ffe8be" emissive="#ffc46b" emissiveIntensity={0.42} />
            </mesh>
          </group>
        ))}

        <Html position={[0, 6.2, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_reception')}>
            <IconBanquet size={12} color={weddingStore.selectedEntity?.id === 'place_reception' ? '#08090d' : BRAND_ACCENT} />
            <span>Grand Pavillon & Banquet</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 11: PISTE CLUBBING & SCÈNE DJ (14, 0, -32)       */}
      {/* ---------------------------------------------------- */}
      <group
        position={[14, 0, -32]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_dancefloor');
          weddingStore.setDjBoothOpen(true);
        }}
      >
        <group ref={dancefloorRef} position={[0, 0.05, 0]}>
          {[-2, -1, 0, 1, 2].map((dx, ix) =>
            [-2, -1, 0, 1, 2].map((dz, iz) => (
              <mesh key={`${ix}_${iz}`} position={[dx * 1.2, 0, dz * 1.2]}>
                <boxGeometry args={[1.1, 0.08, 1.1]} />
                <meshStandardMaterial
                  color="#151722"
                  emissive={BRAND_ACCENT}
                  emissiveIntensity={0.25}
                  roughness={0.3}
                />
              </mesh>
            ))
          )}
        </group>

        <RoundedBox args={[4.2, 1.2, 1.2]} position={[0, 0.6, -3.4]} castShadow>
          <meshStandardMaterial color="#0d0f18" roughness={0.3} metalness={0.08} /*tok:matte*/ />
        </RoundedBox>
        <mesh position={[0, 0.6, -2.78]}>
          <planeGeometry args={[3.8, 0.7]} />
          <meshStandardMaterial color={BRAND_ACCENT} emissive={BRAND_ACCENT} emissiveIntensity={0.42} />
        </mesh>

        {/* 3D Floating Hologram Music Cells in an Arc */}
        {weddingStore.tracks.slice(0, 6).map((track, tIdx) => {
          const angle = (tIdx / 5) * Math.PI - Math.PI / 2;
          const radius = 3.6;
          const hx = Math.sin(angle) * radius;
          const hz = Math.cos(angle) * radius - 1.5;
          const isPlayingThis = track.id === weddingStore.getActiveTrack().id;

          return (
            <group
              key={track.id}
              position={[hx, 2.2 + Math.sin(tIdx * 1.2) * 0.3, hz]}
              onClick={(e) => {
                e.stopPropagation();
                weddingStore.setDjBoothOpen(true);
              }}
            >
              <mesh rotation={[Math.PI / 6, 0, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.04, 16]} />
                <meshStandardMaterial
                  color={isPlayingThis ? BRAND_ACCENT : '#242b3b'}
                  emissive={isPlayingThis ? BRAND_ACCENT : '#111620'}
                  emissiveIntensity={isPlayingThis ? 0.8 : 0.2}
                  metalness={0.55} /*tok:brass*/
                  roughness={0.32}
                />
              </mesh>
            </group>
          );
        })}

        {/* SoundWave Line-Array Speakers */}
        {[-3.0, 3.0].map((sx, sIdx) => (
          <group key={sIdx} position={[sx, 0, -3.4]}>
            <RoundedBox args={[0.8, 3.2, 0.8]} position={[0, 1.6, 0]} castShadow>
              <meshStandardMaterial color="#1e2433" roughness={0.4} />
            </RoundedBox>
            <mesh position={[0, 2.4, 0.42]}>
              <circleGeometry args={[0.26, 16]} />
              <meshBasicMaterial color={BRAND_ACCENT} />
            </mesh>
            <mesh position={[0, 1.2, 0.42]}>
              <circleGeometry args={[0.32, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}

        <Html position={[0, 5.4, 0]} center distanceFactor={24}>
          <div
            style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_dancefloor')}
            onClick={() => weddingStore.setDjBoothOpen(true)}
          >
            <IconDancefloor size={12} color={BRAND_ACCENT} />
            <span>DJ Booth • Playlist ({weddingStore.tracks.length})</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* HUB 12: BRUNCH & LOUNGE DU LENDEMAIN (32, 0, 18)     */}
      {/* ---------------------------------------------------- */}
      <group
        position={[32, 0, 18]}
        onClick={(e) => {
          e.stopPropagation();
          weddingStore.focusPlace('place_brunch');
        }}
      >
        <RoundedBox args={[7.5, 2.2, 5.2]} position={[0, 1.1, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#4a4234" roughness={0.7} />
        </RoundedBox>

        <Html position={[0, 3.8, 0]} center distanceFactor={24}>
          <div style={spatialBadgeStyle(weddingStore.selectedEntity?.id === 'place_brunch')}>
            <IconBrunch size={12} color={weddingStore.selectedEntity?.id === 'place_brunch' ? '#08090d' : '#ffffff'} />
            <span>Brunch du Lendemain</span>
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* MOVING TRANSIT VEHICLES ALONG WORLDMAP ROADS         */}
      {/* ---------------------------------------------------- */}
      {weddingStore.vehicles.map((veh) => (
        <group key={veh.id} position={veh.pos} rotation={[0, veh.rotation, 0]}>
          {veh.type === 'wedding_car' ? (
            <group>
              <RoundedBox args={[3.8, 0.75, 1.6]} position={[0, 0.55, 0]} radius={0.15} castShadow>
                <meshStandardMaterial color="#e2b448" metalness={0.55} /*tok:brass*/ roughness={0.32} />
              </RoundedBox>
              <mesh position={[0.2, 0.85, 0]}>
                <boxGeometry args={[1.4, 0.35, 1.2]} />
                <meshStandardMaterial color="#111520" />
              </mesh>
            </group>
          ) : veh.type === 'shuttle_bus' ? (
            <group>
              <RoundedBox args={[5.2, 1.8, 1.9]} position={[0, 1.0, 0]} radius={0.15} castShadow>
                <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
              </RoundedBox>
            </group>
          ) : (
            <group>
              <RoundedBox args={[4.6, 1.9, 1.9]} position={[0, 1.05, 0]} castShadow>
                <meshStandardMaterial color="#1e293b" />
              </RoundedBox>
            </group>
          )}
        </group>
      ))}

      {/* ---------------------------------------------------- */}
      {/* ADVERTISING GRID: 3D BILLBOARDS, TOTEMS & VITRINES   */}
      {/* ---------------------------------------------------- */}
      {weddingStore.adSlots.map((slot) => {
        const camp = slot.currentCampaign;
        return (
          <group
            key={slot.id}
            position={slot.pos}
            rotation={[0, slot.rotY, 0]}
            onClick={(e) => {
              e.stopPropagation();
              weddingStore.openAdSlot(slot.id);
            }}
          >
            {slot.slotType === 'billboard_3d' ? (
              <group>
                {/* 2 Metal Support Pillars */}
                {[-2.2, 2.2].map((px, idx) => (
                  <mesh key={idx} position={[px, 1.8, 0]} castShadow>
                    <cylinderGeometry args={[0.08, 0.08, 3.6, 8]} />
                    <meshStandardMaterial color="#334155" metalness={0.08} /*tok:matte*/ />
                  </mesh>
                ))}
                {/* Billboard Board & Frame */}
                <RoundedBox args={[slot.size[0], slot.size[1], 0.2]} position={[0, 4.2, 0]} radius={0.08} castShadow receiveShadow>
                  <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.08} /*tok:matte*/ />
                </RoundedBox>
                {/* Backlit Screen */}
                <mesh position={[0, 4.2, 0.12]}>
                  <planeGeometry args={[slot.size[0] - 0.2, slot.size[1] - 0.2]} />
                  <meshStandardMaterial
                    color={camp.isSponsored ? '#ffd700' : BRAND_ACCENT}
                    emissive={camp.isSponsored ? '#ffd700' : BRAND_ACCENT}
                    emissiveIntensity={0.42}
                    roughness={0.32}
                  />
                </mesh>
              </group>
            ) : slot.slotType === 'led_totem' ? (
              <group>
                {/* Vertical Monolith Totem */}
                <RoundedBox args={[slot.size[0], slot.size[1], 0.35]} position={[0, slot.size[1] / 2, 0]} radius={0.06} castShadow receiveShadow>
                  <meshStandardMaterial color="#080b12" roughness={0.32} metalness={0.08} /*tok:matte*/ />
                </RoundedBox>
                {/* Vertical LED Screen */}
                <mesh position={[0, slot.size[1] / 2, 0.19]}>
                  <planeGeometry args={[slot.size[0] - 0.2, slot.size[1] - 0.4]} />
                  <meshStandardMaterial
                    color={camp.isSponsored ? '#ffd700' : BRAND_ACCENT}
                    emissive={camp.isSponsored ? '#ffd700' : BRAND_ACCENT}
                    emissiveIntensity={0.42}
                  />
                </mesh>
              </group>
            ) : slot.slotType === 'shop_window' ? (
              <group>
                {/* Glass Vitrine */}
                <RoundedBox args={[slot.size[0], slot.size[1], 0.4]} position={[0, slot.size[1] / 2, 0]} radius={0.06} castShadow>
                  <meshStandardMaterial color="#1e293b" metalness={0.08} /*tok:matte*/ />
                </RoundedBox>
                <mesh position={[0, slot.size[1] / 2, 0.22]}>
                  <planeGeometry args={[slot.size[0] - 0.3, slot.size[1] - 0.3]} />
                  <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.42} />
                </mesh>
              </group>
            ) : (
              <group>
                {/* Overhead Lighting Truss Banner */}
                <mesh position={[0, 3.6, 0]} castShadow>
                  <boxGeometry args={[slot.size[0], slot.size[1], 0.15]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.08} /*tok:matte*/ />
                </mesh>
                <mesh position={[0, 3.6, 0.09]}>
                  <planeGeometry args={[slot.size[0] - 0.2, slot.size[1] - 0.1]} />
                  <meshStandardMaterial color={BRAND_ACCENT} emissive={BRAND_ACCENT} emissiveIntensity={0.42} />
                </mesh>
              </group>
            )}

            {/* Spatial Floating Ad Badge */}
            <Html position={[0, (slot.slotType === 'billboard_3d' ? 6.2 : slot.size[1] + 1.2), 0]} center distanceFactor={28}>
              <div style={spatialBadgeStyle(weddingStore.selectedAdSlotId === slot.id)}>
                <span style={{ fontSize: 10 }}>📢</span>
                <span>{camp.badgeLabel}</span>
              </div>
            </Html>
          </group>
        );
      })}

      {/* ---------------------------------------------------- */}
      {/* MEDITERRANEAN CYPRESS TREES ACROSS REGION            */}
      {/* ---------------------------------------------------- */}
      {[
        [-50, 0, 24],
        [-50, 0, -20],
        [-36, 0, 20],
        [-36, 0, -18],
        [-20, 0, -30],
        [-4, 0, -36],
        [20, 0, -36],
        [36, 0, -26],
        [36, 0, 10],
        [-4, 0, 16],
        [20, 0, 16],
      ].map((tp, idx) => (
        <group key={idx} position={tp as [number, number, number]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 1.6, 8]} />
            <meshStandardMaterial color="#38291e" />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow>
            <coneGeometry args={[1.4, 5.0, 8]} />
            <meshStandardMaterial color="#1a2e20" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
