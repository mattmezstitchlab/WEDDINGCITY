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

interface CreateWeddingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWeddingModal({ isOpen, onClose }: CreateWeddingModalProps) {
  const store = weddingStore;

  const [coupleNames, setCoupleNames] = useState('');
  const [weddingDate, setWeddingDate] = useState('2025-09-20');
  const [locationName, setLocationName] = useState('Domaine d’Exception & Orangerie');
  const [userRole, setUserRole] = useState<AgentRole>('wedding_planner');
  const [userName, setUserName] = useState('');
  const [budgetTarget, setBudgetTarget] = useState('25000');
  const [guestCountTarget, setGuestCountTarget] = useState('120');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!coupleNames.trim()) return;
    store.createRealWedding({
      coupleNames,
      weddingDate,
      locationName: locationName || 'Domaine du Mariage',
      userRole,
      userName: userName || coupleNames.split('&')[0].trim(),
      budgetTarget: parseInt(budgetTarget, 10) || 25000,
      guestCountTarget: parseInt(guestCountTarget, 10) || 120,
    });
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              NOUVEL ESPACE DE MARIAGE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              CRÉER MON MARIAGE SUR WEDDING CITY
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <p style={{ margin: '10px 0 16px', fontSize: 12, color: '#9ba1b0', lineHeight: 1.5 }}>
          Créez votre monde interactif en temps réel. Les prestataires, documents, tâches et invités
          seront automatiquement synchronisés sur la grille spatiale.
        </p>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabelStyle}>NOMS DES MARIÉS (OBLIGATOIRE) :</label>
            <input
              type="text"
              placeholder="Ex: Sophie & Julien"
              value={coupleNames}
              onChange={(e) => setCoupleNames(e.target.value)}
              style={spatialInputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={fieldLabelStyle}>DATE DU MARIAGE :</label>
              <input
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                style={spatialInputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>LIEU / DOMAINE PRINCIPAL :</label>
              <input
                type="text"
                placeholder="Ex: Domaine de Chantilly"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                style={spatialInputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={fieldLabelStyle}>VOTRE RÔLE :</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as AgentRole)}
                style={spatialSelectStyle}
              >
                <option value="wedding_planner">Wedding Planner (Cheffe d’Orchestre)</option>
                <option value="bride">La Mariée</option>
                <option value="groom">Le Marié</option>
                <option value="witness">Témoin / Famille</option>
                <option value="photographer">Prestataire Photographe</option>
                <option value="caterer">Prestataire Traiteur</option>
                <option value="dj">Prestataire DJ</option>
              </select>
            </div>

            <div>
              <label style={fieldLabelStyle}>VOTRE PRÉNOM / IDENTITÉ :</label>
              <input
                type="text"
                placeholder="Ex: Sophie"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={spatialInputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={fieldLabelStyle}>BUDGET PRÉVISIONNEL ESTIMÉ (€) :</label>
              <input
                type="number"
                placeholder="25000"
                value={budgetTarget}
                onChange={(e) => setBudgetTarget(e.target.value)}
                style={spatialInputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>NOMBRE D'INVITÉS ESTIMÉ (PAX) :</label>
              <input
                type="number"
                placeholder="120"
                value={guestCountTarget}
                onChange={(e) => setGuestCountTarget(e.target.value)}
                style={spatialInputStyle}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtnStyle}>
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!coupleNames.trim()}
            style={{
              ...submitBtnStyle,
              opacity: coupleNames.trim() ? 1 : 0.5,
              cursor: coupleNames.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Générer le Monde & Commencer →
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
  padding: '26px 28px',
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

const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  padding: '8px 14px',
};

const submitBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 700,
};
