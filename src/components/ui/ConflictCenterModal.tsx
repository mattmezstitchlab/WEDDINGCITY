import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { IconAlert, IconCheck } from './Icons';

interface ConflictCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConflictCenterModal({ isOpen, onClose }: ConflictCenterModalProps) {
  const store = weddingStore;
  const conflicts = store.conflicts;
  const unresolved = conflicts.filter((c) => !c.isResolved);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              SYSTÈME NERVEUX & SYNCHRONISATION
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              DÉTECTION DES CONFLITS
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Conflicts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {conflicts.map((conflict) => {
            return (
              <div
                key={conflict.id}
                style={{
                  border: `1px solid ${conflict.isResolved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.5)'}`,
                  background: conflict.isResolved ? 'rgba(16, 185, 129, 0.03)' : 'rgba(244, 63, 94, 0.05)',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {conflict.isResolved ? (
                      <IconCheck size={14} color="#10b981" />
                    ) : (
                      <IconAlert size={14} color="#f43f5e" />
                    )}
                    <span style={{ fontWeight: 600, fontSize: 13, color: conflict.isResolved ? '#10b981' : BRAND_TEXT_PRIMARY }}>
                      {conflict.title}
                    </span>
                  </div>

                  <span
                    style={{
                      background: conflict.isResolved ? '#10b981' : '#f43f5e',
                      color: '#ffffff',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {conflict.isResolved ? 'RÉSOLU' : 'EN ATTENTE'}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 11, color: BRAND_TEXT_SECONDARY, lineHeight: 1.4 }}>
                  {conflict.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    marginTop: 2,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                    <span style={{ color: BRAND_ACCENT, fontWeight: 600 }}>Résolution :</span> {conflict.suggestedSolution}
                  </div>

                  {!conflict.isResolved && (
                    <button
                      onClick={() => store.resolveConflict(conflict.id)}
                      style={{
                        background: '#ffffff',
                        color: '#08090d',
                        border: 'none',
                        borderRadius: 6,
                        padding: '5px 10px',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Résoudre & Propager
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 9, 13, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 640,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 18,
  padding: 20,
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
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
