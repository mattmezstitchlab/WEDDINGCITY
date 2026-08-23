import { useState } from 'react';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
} from '../../game/weddingStore';
import { AgentRole } from '../../types/wedding';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const store = weddingStore;
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AgentRole>('wedding_planner');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    store.loginUser(email, name || email.split('@')[0], role);
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              MODE RÉEL • WEDDING CITY
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              {isRegister ? 'CRÉER UN COMPTE' : 'CONNEXION'}
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <p style={{ margin: '8px 0 16px', fontSize: 12, color: '#9ba1b0', lineHeight: 1.5 }}>
          Sauvegardez vos mariages et synchronisez les prestataires en temps réel sur la worldmap.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={fieldLabelStyle}>ADRESSE EMAIL :</label>
            <input
              type="email"
              required
              placeholder="sophie@weddingcity.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={spatialInputStyle}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>VOTRE NOM / PSEUDO :</label>
            <input
              type="text"
              placeholder="Sophie Étoile"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={spatialInputStyle}
            />
          </div>

          <div>
            <label style={fieldLabelStyle}>VOTRE RÔLE PRINCIPAL :</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AgentRole)}
              style={spatialSelectStyle}
            >
              <option value="wedding_planner">Wedding Planner</option>
              <option value="bride">La Mariée</option>
              <option value="groom">Le Marié</option>
              <option value="photographer">Photographe / Vidéaste</option>
              <option value="chef">Chef Traiteur</option>
              <option value="dj">DJ / Sound Designer</option>
              <option value="witness">Témoin / Invité</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              style={switchModeBtnStyle}
            >
              {isRegister ? 'Déjà un compte ? Se connecter' : 'Nouveau ? Créer un compte'}
            </button>

            <button type="submit" style={submitBtnStyle}>
              {isRegister ? 'Créer mon Compte →' : 'Se Connecter →'}
            </button>
          </div>
        </form>
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
  maxWidth: 460,
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 20,
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
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const spatialSelectStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: '#12151e',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '9px 12px',
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const switchModeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 10,
  padding: '9px 18px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
