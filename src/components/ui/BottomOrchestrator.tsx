import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { IconWorld } from './Icons';

export function BottomOrchestrator() {
  const store = weddingStore;
  const isPlaying = store.isPlaying;
  const speed = store.speed;
  const currentTime = store.time;

  const milestones = [
    { hour: 10.0, label: 'Préparatifs', placeId: 'place_manoir' },
    { hour: 13.5, label: 'Mairie', placeId: 'place_mairie' },
    { hour: 15.5, label: 'Cérémonie', placeId: 'place_ceremonie' },
    { hour: 17.0, label: 'Cocktail', placeId: 'place_cocktail' },
    { hour: 18.5, label: 'Photos', placeId: 'place_photo_spot' },
    { hour: 19.5, label: 'Banquet', placeId: 'place_reception' },
    { hour: 22.5, label: 'Ouverture Bal', placeId: 'place_dancefloor' },
    { hour: 24.0, label: 'Soirée', placeId: 'place_dancefloor' },
  ];

  const formatHour = (h: number) => {
    const hours = Math.floor(h) % 24;
    const mins = Math.floor((h % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleGlobalWorldmap = () => {
    store.cameraTargetPos = [0, 2, 0];
    store.clearSelection();
  };

  return (
    <div style={dockWrapperStyle}>
      {/* 1. Spatial Regional Zone Shortcuts */}
      <div style={dockPillStyle}>
        <button
          onClick={handleGlobalWorldmap}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${BRAND_ACCENT}`,
            borderRadius: 8,
            padding: '5px 9px',
            color: BRAND_ACCENT,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Vue Régionale Globale"
        >
          <IconWorld size={12} color={BRAND_ACCENT} />
          <span>WORLDMAP</span>
        </button>

        {[
          { id: 'place_mairie', label: 'Mairie' },
          { id: 'place_manoir', label: 'Manoir' },
          { id: 'place_ceremonie', label: 'Cérémonie' },
          { id: 'place_cocktail', label: 'Cocktail' },
          { id: 'place_reception', label: 'Orangerie' },
          { id: 'place_dancefloor', label: 'Bal / DJ' },
        ].map((zone) => {
          const isSelected = store.selectedEntity?.type === 'place' && store.selectedEntity.id === zone.id;
          return (
            <button
              key={zone.id}
              onClick={() => store.focusPlace(zone.id)}
              style={zoneChipBtnStyle(isSelected)}
            >
              {zone.label}
            </button>
          );
        })}
      </div>

      {/* 2. Central Timeline Scrubber Dock */}
      <div style={{ ...dockPillStyle, flex: 1, maxWidth: 540, flexDirection: 'column', gap: 4, padding: '8px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, fontWeight: 700, letterSpacing: '0.08em' }}>
            DÉROULEMENT DU JOUR J
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: BRAND_ACCENT, fontWeight: 700 }}>
            {formatHour(currentTime)}
          </div>
        </div>

        <input
          type="range"
          min={10.0}
          max={26.5}
          step={0.1}
          value={currentTime}
          onChange={(e) => store.setTime(parseFloat(e.target.value))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: BRAND_ACCENT,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {milestones.map((m) => {
            const isActive = Math.abs(currentTime - m.hour) < 1.0;
            return (
              <button
                key={m.hour}
                onClick={() => {
                  store.setTime(m.hour);
                  store.focusPlace(m.placeId);
                }}
                style={milestoneBtnStyle(isActive)}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Speed & Orchestration Trigger */}
      <div style={dockPillStyle}>
        <div style={speedTrackStyle}>
          {[1, 5, 20].map((s) => (
            <button
              key={s}
              onClick={() => store.setSpeed(s)}
              style={speedBtnStyle(speed === s)}
            >
              {s}x
            </button>
          ))}
        </div>

        <button
          onClick={() => store.toggleOrchestration()}
          style={orchestrateBtnStyle(isPlaying)}
        >
          <span>{isPlaying ? '⏸' : '▶'}</span>
          <span>{isPlaying ? 'PAUSE' : 'ORCHESTRER'}</span>
        </button>
      </div>
    </div>
  );
}

const dockWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 14,
  left: 16,
  right: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  zIndex: 50,
  pointerEvents: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const dockPillStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(18, 21, 30, 0.92)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 16,
  padding: '6px 10px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
  pointerEvents: 'auto',
};

const zoneChipBtnStyle = (selected: boolean): React.CSSProperties => ({
  background: selected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
  border: `1px solid ${selected ? BRAND_ACCENT : 'transparent'}`,
  borderRadius: 8,
  padding: '5px 8px',
  color: selected ? '#ffffff' : BRAND_TEXT_SECONDARY,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const milestoneBtnStyle = (active: boolean): React.CSSProperties => ({
  background: 'transparent',
  border: 'none',
  color: active ? BRAND_ACCENT : BRAND_TEXT_MUTED,
  fontSize: 9,
  fontWeight: active ? 700 : 500,
  cursor: 'pointer',
  padding: '1px 3px',
});

const speedTrackStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  background: 'rgba(0,0,0,0.3)',
  padding: 2,
  borderRadius: 8,
};

const speedBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#ffffff' : 'transparent',
  color: active ? '#08090d' : BRAND_TEXT_MUTED,
  border: 'none',
  borderRadius: 6,
  padding: '4px 7px',
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  fontSize: 10,
  cursor: 'pointer',
});

const orchestrateBtnStyle = (isPlaying: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: isPlaying ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
  color: isPlaying ? '#ffffff' : '#08090d',
  border: `1px solid ${isPlaying ? BRAND_ACCENT : '#ffffff'}`,
  borderRadius: 10,
  padding: '8px 16px',
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  boxShadow: isPlaying ? 'none' : '0 2px 14px rgba(255, 255, 255, 0.15)',
});
