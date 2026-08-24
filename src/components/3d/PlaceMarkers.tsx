import { Html } from '@react-three/drei';
import { weddingStore, BRAND_ACCENT } from '../../game/weddingStore';
import { ESTATE_PLACE_IDS } from './EstateEnvironment';

// ---------------------------------------------------------------------------
// PLACE MARKERS — the spatial projection of places the estate does not depict.
// ---------------------------------------------------------------------------
// MEASURED IN THE BROWSER (World Lab acceptance): the 3D scene is hand-built
// JSX for the demo venue and NOTHING reads store.places. A generated world —
// six real places with real coordinates: Tokyo, Mont Fuji, Kyoto… — therefore
// rendered as an empty ground, while the HUD listed all six. The data existed
// and the World simply did not show it.
//
// This is deliberately NOT a redesign of the World: no architecture, no
// materials, no lighting. It is the smallest honest representation of a place
// that really exists — its footprint at its own coordinates, its own colour,
// its name, and the same click-to-focus behaviour as the estate hubs.
//
// Places the estate already draws are skipped, so the demo is untouched.
// ---------------------------------------------------------------------------

export function PlaceMarkers() {
  const store = weddingStore;
  const places = store.places.filter((p) => !ESTATE_PLACE_IDS.includes(p.id));
  if (places.length === 0) return null;

  return (
    <group>
      {places.map((place) => {
        const selected = store.selectedEntity?.type === 'place' && store.selectedEntity.id === place.id;
        const colour = place.themeColor || BRAND_ACCENT;
        return (
          <group
            key={place.id}
            position={place.pos}
            onClick={(e) => {
              e.stopPropagation();
              store.focusPlace(place.id);
            }}
          >
            {/* Footprint: the place occupies ground, nothing more is claimed. */}
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[7.5, 7.5]} />
              <meshStandardMaterial
                color={colour}
                transparent
                opacity={selected ? 0.26 : 0.13}
                roughness={0.9}
                metalness={0.05}
              />
            </mesh>

            {/* A low marker, so the eye finds it from the regional view. */}
            <mesh position={[0, 0.9, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 1.8, 10]} />
              <meshStandardMaterial color={colour} roughness={0.6} metalness={0.08} />
            </mesh>

            <Html position={[0, 2.6, 0]} center distanceFactor={24}>
              <div style={markerBadgeStyle(selected)}>{place.name}</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

const markerBadgeStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 9px',
  borderRadius: 8,
  background: selected ? BRAND_ACCENT : 'rgba(18, 21, 30, 0.92)',
  color: selected ? '#08090d' : '#ffffff',
  border: `1px solid ${selected ? BRAND_ACCENT : 'rgba(255,255,255,0.14)'}`,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.02em',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  userSelect: 'none',
  pointerEvents: 'auto',
  transform: 'scale(0.85)',
});
