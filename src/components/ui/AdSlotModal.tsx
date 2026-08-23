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
import { AdContentCategory } from '../../types/wedding';
import { IconSparkles, IconCheck } from './Icons';

interface AdSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotId: string | null;
}

export function AdSlotModal({ isOpen, onClose, slotId }: AdSlotModalProps) {
  const store = weddingStore;
  const slot = store.adSlots.find((s) => s.id === (slotId || store.selectedAdSlotId));

  const [isEditing, setIsEditing] = useState(false);
  const [adTitle, setAdTitle] = useState(slot?.currentCampaign.title || '');
  const [adSubtitle, setAdSubtitle] = useState(slot?.currentCampaign.subtitle || '');
  const [advertiser, setAdvertiser] = useState(slot?.currentCampaign.advertiserName || '');
  const [category, setCategory] = useState<AdContentCategory>(slot?.currentCampaign.category || 'wedding_program');
  const [isSponsored, setIsSponsored] = useState(slot?.currentCampaign.isSponsored || false);
  const [sponsorName, setSponsorName] = useState(slot?.currentCampaign.sponsorName || '');
  const [ctaText, setCtaText] = useState(slot?.currentCampaign.ctaText || 'En savoir plus →');

  if (!isOpen || !slot) return null;

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim()) return;
    store.claimAdSlot(slot.id, {
      title: adTitle,
      subtitle: adSubtitle,
      category,
      advertiserName: advertiser || 'Annonceur Officiel',
      ctaText,
      isSponsored,
      sponsorName: isSponsored ? (sponsorName || 'Partenaire Officiel') : undefined,
    });
    setIsEditing(false);
  };

  const camp = slot.currentCampaign;

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              ADVERTISING GRID • ESPACE D'AFFICHAGE 3D
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              {slot.title.toUpperCase()}
            </h2>
            <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
              Emplacement : {slot.locationZone} • Format : {slot.slotType.replace('_', ' ').toUpperCase()} ({slot.size[0]}m × {slot.size[1]}m)
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Live 3D Screen Billboard Visualizer */}
        <div style={billboardScreenBoxStyle(camp.isSponsored)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={categoryBadgeStyle(camp.isSponsored)}>
              {camp.badgeLabel}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace" }}>
              ANNONCEUR : {camp.advertiserName}
            </span>
          </div>

          <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em', margin: '12px 0 4px' }}>
            {camp.title}
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            {camp.subtitle}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 11, color: BRAND_ACCENT, fontWeight: 700 }}>
              {camp.ctaText}
            </span>
            {camp.isSponsored && camp.sponsorName && (
              <span style={{ fontSize: 10, color: '#ffd700', fontWeight: 600 }}>
                ★ Sponsorisé par {camp.sponsorName}
              </span>
            )}
          </div>
        </div>

        {/* Claim / Edit Campaign Drawer */}
        {isEditing ? (
          <form onSubmit={handleSaveCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
              REVENDIQUER CET EMPLACEMENT & PROGRAMMER UNE CAMPAGNE
            </div>

            <div>
              <label style={fieldLabelStyle}>TITRE DE L'ANNONCE :</label>
              <input
                type="text"
                required
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                placeholder="Ex: MAISON GOURMET • DÉGUSTATION COCKTAIL"
                style={spatialInputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>SOUS-TITRE / MESSAGE :</label>
              <input
                type="text"
                value={adSubtitle}
                onChange={(e) => setAdSubtitle(e.target.value)}
                placeholder="Ex: Bar à huîtres & Champagne servi en terrasse d'honneur"
                style={spatialInputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={fieldLabelStyle}>NOM DE L'ANNONCEUR :</label>
                <input
                  type="text"
                  value={advertiser}
                  onChange={(e) => setAdvertiser(e.target.value)}
                  placeholder="Ex: Chef Antoine"
                  style={spatialInputStyle}
                />
              </div>

              <div>
                <label style={fieldLabelStyle}>CATÉGORIE :</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AdContentCategory)}
                  style={spatialSelectStyle}
                >
                  <option value="wedding_program">Programme Officiel du Mariage</option>
                  <option value="vendor_showcase">Enseigne Prestataire Vérifié</option>
                  <option value="sponsor_official">Partenaire / Sponsor Officiel</option>
                  <option value="photo_contest">Concours Photo & Hashtag</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                id="checkSponsored"
                checked={isSponsored}
                onChange={(e) => setIsSponsored(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: BRAND_ACCENT }}
              />
              <label htmlFor="checkSponsored" style={{ fontSize: 11, color: BRAND_TEXT_PRIMARY, cursor: 'pointer' }}>
                Identifier clairement comme contenu sponsorisé / partenaire
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => setIsEditing(false)} style={cancelBtnStyle}>
                Annuler
              </button>
              <button type="submit" style={submitBtnStyle}>
                Valider & Déployer sur la Grille 3D →
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED }}>
              Affiché en temps réel dans le décor 3D de Wedding City
            </div>
            <button
              onClick={() => setIsEditing(true)}
              style={claimActionBtnStyle}
            >
              <IconSparkles size={12} color="#08090d" />
              <span>Revendiquer & Personnaliser cet Espace</span>
            </button>
          </div>
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

const billboardScreenBoxStyle = (isSponsored: boolean): React.CSSProperties => ({
  marginTop: 14,
  background: isSponsored
    ? 'linear-gradient(135deg, #1c1822 0%, #2a2033 100%)'
    : 'linear-gradient(135deg, #161c28 0%, #1e2536 100%)',
  border: `1px solid ${isSponsored ? '#ffd700' : BRAND_ACCENT}`,
  borderRadius: 14,
  padding: '16px 18px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
});

const categoryBadgeStyle = (isSponsored: boolean): React.CSSProperties => ({
  background: isSponsored ? 'rgba(255, 215, 0, 0.15)' : 'rgba(226, 180, 72, 0.15)',
  color: isSponsored ? '#ffd700' : BRAND_ACCENT,
  border: `1px solid ${isSponsored ? '#ffd700' : BRAND_ACCENT}`,
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 9,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
});

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
  borderRadius: 6,
  padding: '8px 10px',
  color: '#ffffff',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
};

const spatialSelectStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: '#12151e',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '8px 10px',
  color: '#ffffff',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 11,
  cursor: 'pointer',
  padding: '6px 10px',
};

const submitBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

const claimActionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};
