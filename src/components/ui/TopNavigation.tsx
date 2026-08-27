import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { weddingAudio } from '../../game/audio';
import {
  IconWorld,
  IconClock,
  IconPlus,
  IconAlert,
  IconCheck,
  IconSparkles,
} from './Icons';

interface TopNavigationProps {
  onOpenImport: () => void;
  onOpenConflicts: () => void;
}

export function TopNavigation({ onOpenImport, onOpenConflicts }: TopNavigationProps) {
  const store = weddingStore;
  const metrics = store.getBudgetMetrics();
  const currentPhase = store.getActivePhase();
  const isMuted = weddingAudio.getMuted();

  const formatHour = (h: number) => {
    const hours = Math.floor(h) % 24;
    const mins = Math.floor((h % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div style={navWrapperStyle}>
      {/* 1. Left Pill: Brand Identity & Menu Dropdown */}
      <div
        style={{ ...pillContainerStyle, cursor: 'pointer' }}
        onClick={() => {
          store.brandMenuOpen = !store.brandMenuOpen;
          weddingAudio.playClick();
          store.notify();
        }}
        title="Ouvrir le menu principal Wedding City"
      >
        <div style={brandIconBoxStyle}>
          <span style={{ fontSize: 13, color: BRAND_ACCENT }}>◇</span>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.04em', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>LE GRAND JOUR</span>
            <span style={{ fontSize: 14, color: BRAND_ACCENT }}>▼</span>
          </div>
          <div style={{ fontSize: 9, color: BRAND_TEXT_MUTED, letterSpacing: '0.06em', fontWeight: 600 }}>
            {store.currentProject.coupleNames || 'SIMCITY DU MARIAGE'}
          </div>
        </div>
      </div>

      {/* 2. Center Pill: Mode Switcher & Time Island */}
      <div style={{ ...pillContainerStyle, gap: 8, padding: '5px 8px' }}>
        <div style={segmentedTrackStyle}>
          <button
            onClick={() => store.setViewMode('world')}
            style={segmentedBtnStyle(store.viewMode === 'world')}
          >
            <IconWorld size={12} color={store.viewMode === 'world' ? '#08090d' : BRAND_TEXT_SECONDARY} />
            <span>WORLDMAP 3D</span>
          </button>
          <button
            onClick={() => store.setViewMode('timeline')}
            style={segmentedBtnStyle(store.viewMode === 'timeline')}
          >
            <IconClock size={12} color={store.viewMode === 'timeline' ? '#08090d' : BRAND_TEXT_SECONDARY} />
            <span>TIMELINE</span>
          </button>
        </div>

        <div style={hairlineDividerStyle} />

        {/* Clock & Phase Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: BRAND_ACCENT }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
            {formatHour(store.time)}
          </div>
          <div style={{ fontSize: 11, color: BRAND_TEXT_SECONDARY, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {currentPhase
              ? (currentPhase.name.split('—')[1]?.trim() || currentPhase.name)
              : 'Journée à composer'}
          </div>
        </div>
      </div>

      {/* 3. Right Pill: Nerve Center, Connectors Hub, World Lab, Chaos Importer, DJ Playlist, Research, AI Agent & Metrics */}
      <div style={{ ...pillContainerStyle, gap: 5 }}>
        {/* System Nerve Center Button */}
        <button
          onClick={() => {
            store.systemNerveModalOpen = true;
            store.notify();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.04)',
            color: '#cbd5e1',
            border: `1px solid ${BRAND_BORDER}`,
            borderRadius: 8,
            padding: '5px 8px',
            fontSize: 10.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Ouvrir le System Nerve Center (Autodiagnostic technique)"
        >
          <span>⚡</span>
          <span>NERVE CENTER</span>
        </button>

        {/* Connectors Hub Button */}
        <button
          onClick={() => {
            store.connectorsModalOpen = true;
            store.notify();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.04)',
            color: '#cbd5e1',
            border: `1px solid ${BRAND_BORDER}`,
            borderRadius: 8,
            padding: '5px 8px',
            fontSize: 10.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Connecter vos outils (Google, Drive, Calendar, Gmail, Spotify...)"
        >
          <span>🔌</span>
          <span>CONNECTEURS</span>
        </button>

        {/* World Lab Button */}
        <button
          onClick={() => {
            store.worldLabModalOpen = true;
            store.notify();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'linear-gradient(135deg, rgba(226, 180, 72, 0.25), rgba(226, 180, 72, 0.1))',
            color: '#ffffff',
            border: `1px solid ${BRAND_ACCENT}`,
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 0 16px rgba(226, 180, 72, 0.2)',
          }}
          title="Créer n’importe quel monde (Voyage, Concert, Événement, Entreprise...)"
        >
          <span>✨</span>
          <span>WORLD LAB</span>
        </button>

        {/* World Web Research */}
        <button
          onClick={() => {
            store.worldResearchModalOpen = true;
            store.notify();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            border: `1px solid ${BRAND_BORDER}`,
            borderRadius: 8,
            padding: '5px 9px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Rechercher des prestataires réels sur le Web"
        >
          <IconWorld size={12} color={BRAND_ACCENT} />
          <span>RECHERCHE WEB</span>
        </button>

        {/* Spatial AI Copilot Agent */}
        <button
          onClick={() => {
            store.spatialAgentDrawerOpen = !store.spatialAgentDrawerOpen;
            store.notify();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: store.spatialAgentDrawerOpen ? BRAND_ACCENT : 'rgba(226, 180, 72, 0.12)',
            color: store.spatialAgentDrawerOpen ? '#08090d' : BRAND_ACCENT,
            border: `1px solid ${BRAND_ACCENT}`,
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Ouvrir l’Agent Spatial Copilot"
        >
          <IconSparkles size={12} color={store.spatialAgentDrawerOpen ? '#08090d' : BRAND_ACCENT} />
          <span>AGENT SPATIAL</span>
        </button>

        {/* DJ Playlist Button */}
        <button
          onClick={() => store.setDjBoothOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.04)',
            color: '#cbd5e1',
            border: `1px solid ${BRAND_BORDER}`,
            borderRadius: 8,
            padding: '5px 9px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>🎵</span>
          <span>DJ</span>
        </button>

        {/* Importer CTA */}
        <button onClick={onOpenImport} style={importActionBtnStyle}>
          <IconPlus size={12} color="#ffffff" />
          <span>IMPORTER</span>
        </button>

        <button onClick={onOpenConflicts} style={statusPillStyle(metrics.unresolvedConflicts > 0)}>
          {metrics.unresolvedConflicts > 0 ? (
            <IconAlert size={12} color="#f43f5e" />
          ) : (
            <IconCheck size={12} color="#10b981" />
          )}
          <span>{metrics.unresolvedConflicts > 0 ? `${metrics.unresolvedConflicts} Conflit(s)` : 'Harmonisé'}</span>
        </button>

        <div style={metricBoxStyle}>
          <div style={{ fontSize: 8, color: BRAND_TEXT_MUTED, fontWeight: 700, letterSpacing: '0.06em' }}>BUDGET</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: '#ffffff' }}>
            {metrics.totalCommitted.toLocaleString('fr-FR')} €
          </div>
        </div>

        <button
          onClick={() => {
            weddingAudio.toggleMute();
            store.notify();
          }}
          style={audioToggleBtnStyle}
          title={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? 'MUTE' : 'SON'}
        </button>
      </div>
    </div>
  );
}

const navWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  top: 14,
  left: 16,
  right: 16,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  // MEASURED IN THE BROWSER (journey acceptance): the three groups were laid
  // out on one unbreakable line, so the tool pills ran past the right edge —
  // the mute control was already outside the viewport at 1440, and eight
  // controls were unreachable at 768. The band now wraps instead of
  // overflowing, and each group wraps inside itself.
  flexWrap: 'wrap',
  gap: 8,
  zIndex: 50,
  pointerEvents: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const pillContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  maxWidth: '100%',
  gap: 10,
  background: 'rgba(18, 21, 30, 0.92)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 16,
  padding: '6px 14px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
  pointerEvents: 'auto',
};

const brandIconBoxStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const segmentedTrackStyle: React.CSSProperties = {
  display: 'flex',
  background: 'rgba(0, 0, 0, 0.3)',
  borderRadius: 10,
  padding: 2,
  gap: 2,
};

const segmentedBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: active ? '#ffffff' : 'transparent',
  color: active ? '#08090d' : BRAND_TEXT_SECONDARY,
  border: 'none',
  borderRadius: 8,
  padding: '5px 12px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const hairlineDividerStyle: React.CSSProperties = {
  width: 1,
  height: 16,
  background: 'rgba(255, 255, 255, 0.08)',
};

const importActionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(255, 255, 255, 0.04)',
  color: '#ffffff',
  border: `1px solid ${BRAND_ACCENT}`,
  borderRadius: 10,
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  cursor: 'pointer',
};

const statusPillStyle = (hasConflict: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: hasConflict ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.1)',
  border: `1px solid ${hasConflict ? 'rgba(244, 63, 94, 0.6)' : 'rgba(16, 185, 129, 0.4)'}`,
  color: hasConflict ? '#f43f5e' : '#10b981',
  borderRadius: 8,
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const metricBoxStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
};

const audioToggleBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '5px 8px',
  color: BRAND_TEXT_MUTED,
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
};
