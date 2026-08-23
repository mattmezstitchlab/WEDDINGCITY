import { useState } from 'react';
import {
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { WebVendorResult } from '../../types/wedding';
import { weddingAudio } from '../../game/audio';
import { IconCheck } from './Icons';

interface ClaimVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: WebVendorResult | null;
}

export function ClaimVendorModal({ isOpen, onClose, vendor }: ClaimVendorModalProps) {
  const [businessName, setBusinessName] = useState(vendor?.name || '');
  const [siren, setSiren] = useState('');
  const [contactEmail, setContactEmail] = useState(vendor?.email || '');
  const [contactPhone, setContactPhone] = useState(vendor?.phone || '');
  const [claimedSuccess, setClaimedSuccess] = useState(false);

  if (!isOpen || !vendor) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    vendor.isClaimed = true;
    vendor.claimedBusinessName = businessName || vendor.name;
    vendor.verification = 'claimed_vendor';
    weddingAudio.playResolveSuccess();
    setClaimedSuccess(true);
    setTimeout(() => {
      setClaimedSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              REVENDICATION OFFICIELLE DE FICHE ENTREPRISE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              REVENDIQUER : {vendor.name.toUpperCase()}
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {claimedSuccess ? (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <IconCheck size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
              Fiche Entreprise Revendiquée avec Succès !
            </div>
            <div style={{ fontSize: 12, color: BRAND_TEXT_MUTED, marginTop: 4 }}>
              Votre badge de prestataire vérifié a été activé sur la worldmap Wedding City.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: BRAND_TEXT_SECONDARY, lineHeight: 1.5 }}>
              Vous êtes le gérant ou représentant officiel de cette entreprise ? Revendiquez votre fiche
              pour gérer directement vos réservations, vos devis et vos interactions sur Wedding City.
            </p>

            <div>
              <label style={fieldLabelStyle}>NOM OFFICIEL DE LA STRUCTURE :</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={spatialInputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={fieldLabelStyle}>NUMÉRO SIREN / SIRET :</label>
                <input
                  type="text"
                  placeholder="Ex: 582 052 822"
                  value={siren}
                  onChange={(e) => setSiren(e.target.value)}
                  style={spatialInputStyle}
                />
              </div>

              <div>
                <label style={fieldLabelStyle}>TÉLÉPHONE DIRECT :</label>
                <input
                  type="tel"
                  required
                  placeholder="+33 6 ..."
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={spatialInputStyle}
                />
              </div>
            </div>

            <div>
              <label style={fieldLabelStyle}>EMAIL PROFESSIONNEL DE VALIDATION (OPT-IN) :</label>
              <input
                type="email"
                required
                placeholder="contact@entreprise.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                style={spatialInputStyle}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={onClose} style={cancelBtnStyle}>
                Annuler
              </button>
              <button type="submit" style={submitBtnStyle}>
                Valider la Revendication →
              </button>
            </div>
          </form>
        )}
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
  zIndex: 150,
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
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
  padding: '8px 11px',
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
  padding: '6px 12px',
};

const submitBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
