import { useState } from 'react';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSettingsModal({ isOpen, onClose }: ProjectSettingsModalProps) {
  const store = weddingStore;
  const project = store.currentProject;
  const metrics = store.getBudgetMetrics();

  const [title, setTitle] = useState(project.title);
  const [coupleNames, setCoupleNames] = useState(project.coupleNames);
  const [weddingDate, setWeddingDate] = useState(project.weddingDate);
  const [locationName, setLocationName] = useState(project.locationName);
  const [budgetTarget, setBudgetTarget] = useState(project.budgetTarget.toString());
  const [guestCountTarget, setGuestCountTarget] = useState(project.guestCountTarget.toString());

  if (!isOpen) return null;

  const handleSave = () => {
    store.currentProject = {
      ...project,
      title,
      coupleNames,
      weddingDate,
      locationName,
      budgetTarget: parseInt(budgetTarget, 10) || project.budgetTarget,
      guestCountTarget: parseInt(guestCountTarget, 10) || project.guestCountTarget,
    };
    store.saveCurrentState();
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              PARAMÈTRES DU MARIAGE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              {project.title.toUpperCase()}
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Live Metrics Summary */}
        <div style={metricsSummaryGridStyle}>
          <div style={metricBoxStyle}>
            <div style={metricLabelStyle}>BUDGET ENGAGÉ</div>
            <div style={metricValueStyle}>{metrics.totalCommitted.toLocaleString('fr-FR')} €</div>
          </div>
          <div style={metricBoxStyle}>
            <div style={metricLabelStyle}>BUDGET CIBLE</div>
            <div style={{ ...metricValueStyle, color: BRAND_ACCENT }}>{project.budgetTarget.toLocaleString('fr-FR')} €</div>
          </div>
          <div style={metricBoxStyle}>
            <div style={metricLabelStyle}>TÂCHES VALIDÉES</div>
            <div style={metricValueStyle}>{metrics.completedTasks} / {metrics.totalTasks} ({metrics.completionRate}%)</div>
          </div>
          <div style={metricBoxStyle}>
            <div style={metricLabelStyle}>CONFLITS ACTIFS</div>
            <div style={{ ...metricValueStyle, color: metrics.unresolvedConflicts > 0 ? '#f43f5e' : '#10b981' }}>
              {metrics.unresolvedConflicts}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <div>
            <label style={fieldLabelStyle}>NOM DU PROJET :</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={spatialInputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={fieldLabelStyle}>NOMS DES MARIÉS :</label>
              <input
                type="text"
                value={coupleNames}
                onChange={(e) => setCoupleNames(e.target.value)}
                style={spatialInputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>DATE DU JOUR J :</label>
              <input
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                style={spatialInputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={fieldLabelStyle}>LIEU / DOMAINE :</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                style={spatialInputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>OBJECTIF INVITÉS (PAX) :</label>
              <input
                type="number"
                value={guestCountTarget}
                onChange={(e) => setGuestCountTarget(e.target.value)}
                style={spatialInputStyle}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={cancelBtnStyle}>
            Fermer
          </button>
          <button onClick={handleSave} style={saveBtnStyle}>
            Enregistrer les Modifications
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 9, 13, 0.88)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 140,
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 580,
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 22,
  padding: '24px 26px',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 14,
  cursor: 'pointer',
};

const metricsSummaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 8,
  marginTop: 14,
};

const metricBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '8px 10px',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 700,
  color: BRAND_TEXT_MUTED,
};

const metricValueStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  fontSize: 12,
  color: '#ffffff',
  marginTop: 2,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: BRAND_TEXT_MUTED,
  letterSpacing: '0.06em',
};

const spatialInputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: 'rgba(0, 0, 0, 0.4)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '9px 12px',
  color: '#ffffff',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 12,
  cursor: 'pointer',
  padding: '8px 14px',
};

const saveBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 10,
  padding: '9px 18px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
