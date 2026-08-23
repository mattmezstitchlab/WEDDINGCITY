import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { TimelinePhase } from '../../types/wedding';
import {
  IconMairie,
  IconManoir,
  IconCeremonie,
  IconCocktail,
  IconBanquet,
  IconDancefloor,
  IconUser,
} from './Icons';

export function LivingTimelineView() {
  const store = weddingStore;
  const phases = store.phases;
  const currentHour = store.time;

  const getPhaseIcon = (iconCode: string) => {
    switch (iconCode) {
      case 'mairie': return <IconMairie size={15} color={BRAND_ACCENT} />;
      case 'manoir': return <IconManoir size={15} color={BRAND_ACCENT} />;
      case 'ceremonie': return <IconCeremonie size={15} color={BRAND_ACCENT} />;
      case 'cocktail': return <IconCocktail size={15} color={BRAND_ACCENT} />;
      case 'banquet': return <IconBanquet size={15} color={BRAND_ACCENT} />;
      case 'dancefloor': return <IconDancefloor size={15} color={BRAND_ACCENT} />;
      default: return <IconCeremonie size={15} color={BRAND_ACCENT} />;
    }
  };

  const handleSelectPhase = (phase: TimelinePhase) => {
    store.setTime(phase.startHour + 0.1);
    store.focusPlace(phase.primaryPlaceId);
    store.setViewMode('world');
  };

  const handleSelectEntity = (type: 'agent' | 'document' | 'task' | 'place', id: string) => {
    store.selectEntity(type, id);
    store.setViewMode('world');
  };

  return (
    <div style={timelineViewWrapperStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
            PROJECTION TEMPORELLE
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
            TIMELINE VIVANTE DU JOUR J
          </h2>
        </div>

        <button
          onClick={() => store.setViewMode('world')}
          style={backToWorldBtnStyle}
        >
          Retour à la Worldmap 3D
        </button>
      </div>

      {/* Grid of Phase Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {phases.map((phase) => {
          const isActive = currentHour >= phase.startHour && currentHour < phase.endHour;
          const isPassed = currentHour >= phase.endHour;
          const primaryPlace = store.places.find((p) => p.id === phase.primaryPlaceId);
          const phaseTasks = store.tasks.filter((t) => t.dueHour >= phase.startHour && t.dueHour < phase.endHour);

          return (
            <div
              key={phase.id}
              style={{
                border: `1px solid ${isActive ? BRAND_ACCENT : BRAND_BORDER}`,
                background: isActive
                  ? 'rgba(226, 180, 72, 0.04)'
                  : 'rgba(255, 255, 255, 0.02)',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getPhaseIcon(phase.icon)}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? BRAND_ACCENT : BRAND_TEXT_PRIMARY }}>
                      {phase.name}
                    </div>
                    <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>{phase.subtitle}</div>
                  </div>
                </div>

                <span
                  style={{
                    background: isActive ? BRAND_ACCENT : isPassed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? '#08090d' : isPassed ? '#10b981' : BRAND_TEXT_MUTED,
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {isActive ? 'EN COURS' : isPassed ? 'TERMINÉ' : 'À VENIR'}
                </span>
              </div>

              {primaryPlace && (
                <div style={{ fontSize: 11, color: BRAND_TEXT_SECONDARY }}>
                  <span style={{ color: BRAND_TEXT_MUTED }}>Lieu :</span>{' '}
                  <button onClick={() => handleSelectEntity('place', primaryPlace.id)} style={badgeLinkStyle}>
                    {primaryPlace.name}
                  </button>
                </div>
              )}

              {/* Key Agents */}
              <div>
                <div style={categoryTitleStyle}>PRESTATAIRES & ACTEURS :</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {phase.keyAgentIds.map((aid) => {
                    const agent = store.agents.find((x) => x.id === aid);
                    if (!agent) return null;
                    return (
                      <button key={aid} onClick={() => handleSelectEntity('agent', agent.id)} style={badgeLinkStyle}>
                        <IconUser size={11} color="#ffffff" />
                        <span>{agent.name}</span>
                        {agent.isConflict && <span style={{ color: '#f43f5e' }}>!</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tasks */}
              <div>
                <div style={categoryTitleStyle}>ACTIONS ({phaseTasks.length}) :</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                  {phaseTasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '4px 8px',
                        borderRadius: 5,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: t.isDone ? BRAND_TEXT_MUTED : BRAND_TEXT_PRIMARY, textDecoration: t.isDone ? 'line-through' : 'none' }}>
                        {t.isDone ? '✓ ' : '• '}{t.title}
                      </span>
                      {t.cost && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: BRAND_ACCENT, fontSize: 10, fontWeight: 700 }}>
                          {t.cost} €
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectPhase(phase)}
                style={projectIn3DBtnStyle(isActive)}
              >
                Projeter sur la Worldmap 3D
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const timelineViewWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  top: 70,
  left: 16,
  right: 16,
  bottom: 80,
  background: 'rgba(18, 21, 30, 0.94)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 20,
  padding: '22px 26px',
  overflowY: 'auto',
  zIndex: 45,
  color: BRAND_TEXT_PRIMARY,
  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const backToWorldBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '7px 14px',
  fontWeight: 700,
  fontSize: 11,
  cursor: 'pointer',
};

const categoryTitleStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: BRAND_TEXT_MUTED,
  letterSpacing: '0.06em',
};

const badgeLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 5,
  padding: '3px 6px',
  color: BRAND_TEXT_PRIMARY,
  fontSize: 10,
  fontWeight: 500,
  cursor: 'pointer',
};

const projectIn3DBtnStyle = (active: boolean): React.CSSProperties => ({
  marginTop: 'auto',
  background: active ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
  color: active ? '#08090d' : BRAND_TEXT_SECONDARY,
  border: 'none',
  borderRadius: 8,
  padding: '7px 12px',
  fontWeight: 600,
  fontSize: 11,
  cursor: 'pointer',
});
