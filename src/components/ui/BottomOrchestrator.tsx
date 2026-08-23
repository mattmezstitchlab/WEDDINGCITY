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

  // MEASURED IN THE BROWSER (multi-project acceptance): these were eight
  // hardcoded milestones and six hardcoded zones — the demo's day and the
  // demo's venue — displayed under EVERY project, including a brand-new
  // wedding with no programme at all. They now derive from the active project.
  const milestones = [...store.phases]
    .sort((a, b) => a.startHour - b.startHour)
    .map((phase) => ({
      hour: phase.startHour,
      label: phase.name.replace(/^\s*\d{1,2}\s*[:h]\s*\d{0,2}\s*[—–-]\s*/, '').trim() || phase.name,
      placeId: phase.primaryPlaceId,
    }));

  // Zones are the real places of this project, in their own order.
  const zones = store.places.slice(0, 8).map((place) => ({ id: place.id, label: place.name }));

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

        {zones.length === 0 && (
          <span style={{ fontSize: 10.5, color: BRAND_TEXT_MUTED, padding: '0 6px' }}>
            Aucun espace dans ce mariage
          </span>
        )}

        {zones.map((zone) => {
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

        {/* Seven moment labels cannot share 300px: on a phone the strip
            scrolls instead of pushing the dock past the screen. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 6, overflowX: 'auto' }}>
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
  // The bottom lane belongs to the projection capsule (see ProjectionSwitcher);
  // the dock starts above it so the two never share a pixel.
  bottom: 68,
  left: 16,
  right: 16,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  // MEASURED IN THE BROWSER (journey acceptance): on one unbreakable line the
  // dock ran past the right edge below ~1100px — at 768 the whole milestone
  // strip and the play controls were outside the viewport.
  flexWrap: 'wrap',
  gap: 12,
  zIndex: 50,
  pointerEvents: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const dockPillStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  maxWidth: '100%',
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
  whiteSpace: 'nowrap',
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
