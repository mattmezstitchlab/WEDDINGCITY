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
import { IconShare } from './Icons';

interface InviteShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteShareModal({ isOpen, onClose }: InviteShareModalProps) {
  const store = weddingStore;
  const project = store.currentProject;

  const [role, setRole] = useState<'guest' | 'vendor' | 'planner'>('guest');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}/?code=${project.inviteCode}&role=${role}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              COLLABORATION & PARTAGE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              INVITER SUR {project.title.toUpperCase()}
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <p style={{ margin: '8px 0 16px', fontSize: 12, color: BRAND_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Partagez l'accès au monde interactif de votre mariage. Chaque rôle dispose de permissions adaptées.
        </p>

        {/* Role Type Selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabelStyle}>TYPE D'INVITATION :</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {[
              { id: 'guest', label: 'Invité (Table & DJ)' },
              { id: 'vendor', label: 'Prestataire (Fiche & Zone)' },
              { id: 'planner', label: 'Co-Organisateur (Accès Complet)' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id as any)}
                style={roleSelectBtnStyle(role === r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Invite Code & Link Box */}
        <div style={linkBoxContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, fontWeight: 700 }}>CODE D'ACCÈS DU MARIAGE :</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: BRAND_ACCENT, fontSize: 13 }}>
              {project.inviteCode}
            </div>
          </div>

          <input
            type="text"
            readOnly
            value={inviteUrl}
            style={readonlyInputStyle}
          />
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={cancelBtnStyle}>
            Fermer
          </button>
          <button onClick={handleCopy} style={copyActionBtnStyle}>
            <IconShare size={13} color="#08090d" />
            <span>{copied ? '✓ Lien Copié dans le Presse-papier' : 'Copier le Lien d’Invitation'}</span>
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
  maxWidth: 540,
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 22,
  padding: '24px 26px',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
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

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: BRAND_TEXT_MUTED,
  letterSpacing: '0.06em',
};

const roleSelectBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${active ? BRAND_ACCENT : BRAND_BORDER}`,
  borderRadius: 8,
  padding: '7px 8px',
  color: active ? '#ffffff' : BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const linkBoxContainerStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.35)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
};

const readonlyInputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '8px 10px',
  color: '#cbd5e1',
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 12,
  cursor: 'pointer',
  padding: '8px 14px',
};

const copyActionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 10,
  padding: '9px 18px',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
};
