import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { IconWorld, IconSliders } from './Icons';

export function InteriorHUD() {
  const store = weddingStore;
  const venue = store.reconstructedVenues.find((v) => v.id === store.activeVenueId) || store.reconstructedVenues[0];

  if (!store.interiorMode) return null;

  return (
    <div style={hudWrapperStyle}>
      {/* 1. Left: Venue Title & Room Indicator */}
      <div style={pillContainerStyle}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND_ACCENT }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
            {venue?.name || 'Grand Pavillon de Réception'}
          </div>
          <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, marginTop: 1 }}>
            Reconstruction 3D • {venue?.confidenceScore || 91}% Précision IA
          </div>
        </div>
      </div>

      {/* 2. Center: WASD Controls Guide */}
      <div style={{ ...pillContainerStyle, gap: 8, padding: '6px 14px' }}>
        <div style={keyBadgeStyle}>Z</div>
        <div style={keyBadgeStyle}>Q</div>
        <div style={keyBadgeStyle}>S</div>
        <div style={keyBadgeStyle}>D</div>
        <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500, marginLeft: 2 }}>
          Déplacer votre avatar à l’intérieur
        </span>
      </div>

      {/* 3. Right: Construction Mode & Exit Buttons */}
      <div style={{ ...pillContainerStyle, gap: 8 }}>
        <button
          onClick={() => store.toggleConstructionMode()}
          style={constructionToggleBtnStyle(store.constructionMode)}
        >
          <IconSliders size={13} color={store.constructionMode ? '#08090d' : '#ffffff'} />
          <span>{store.constructionMode ? 'Mode Construction Activé' : 'Mode Construction (#)'}</span>
        </button>

        <button
          onClick={() => store.exitVenue()}
          style={exitVenueBtnStyle}
        >
          <IconWorld size={13} color="#ffffff" />
          <span>Sortir sur la Worldmap</span>
        </button>
      </div>
    </div>
  );
}

const hudWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  top: 14,
  left: 16,
  right: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  zIndex: 50,
  pointerEvents: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const pillContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(18, 21, 30, 0.92)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 16,
  padding: '6px 14px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
  pointerEvents: 'auto',
};

const keyBadgeStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 4,
  padding: '2px 5px',
  fontSize: 10,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  color: '#ffffff',
};

const constructionToggleBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: active ? BRAND_ACCENT : 'rgba(255, 255, 255, 0.05)',
  color: active ? '#08090d' : '#ffffff',
  border: `1px solid ${active ? BRAND_ACCENT : BRAND_BORDER}`,
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
});

const exitVenueBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};
