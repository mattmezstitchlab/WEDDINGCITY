import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import {
  IconWorld,
  IconDocument,
  IconDancefloor,
  IconClock,
  IconPlus,
} from './Icons';

interface LandingPageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LandingPageModal({ isOpen, onClose }: LandingPageModalProps) {
  const store = weddingStore;

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={brandBadgeStyle}>
              <span style={{ fontSize: 16, color: BRAND_ACCENT }}>◇</span>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.1em' }}>
                VITRINE OFFICIELLE & CONCEPT
              </div>
              <h1 style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                WEDDING CITY — LE SIMCITY DU MARIAGE
              </h1>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Hero Tagline */}
        <div style={heroBannerStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>
            Le premier monde spatial simulant réellement le Jour J.
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
            Ce n’est pas un simple agenda, ni un logiciel SaaS classique. Chaque devis, contrat,
            prestataire, tâche, horaire et invité possède une existence dans une grille pixel art interconnectée.
          </p>
        </div>

        {/* 4 Feature Pillars Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
          <div style={featureCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconWorld size={16} color={BRAND_ACCENT} />
              <div style={featureTitleStyle}>1. Une Seule Worldmap pour Tout le Mariage</div>
            </div>
            <p style={featureDescStyle}>
              12 pôles géolocalisés (Hôtel de Ville, Manoir, Arche, Belvédère, Orangerie, DJ Booth, Gare).
              Les véhicules et invités se déplacent physiquement sur les routes en temps réel.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconDocument size={16} color={BRAND_ACCENT} />
              <div style={featureTitleStyle}>2. Le Pixel est une Donnée Réelle</div>
            </div>
            <p style={featureDescStyle}>
              Chaque personnage voxel est relié à son devis, contrat, paiement d’acompte, régime alimentaire,
              table et horaires de présence. Les liens laser s’illuminent à la sélection.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconPlus size={16} color={BRAND_ACCENT} />
              <div style={featureTitleStyle}>3. Importer le Chaos (OCR & IA)</div>
            </div>
            <p style={featureDescStyle}>
              Glissez-déposez n’importe quel devis traiteur, facture photographe ou SMS de prestataire.
              Le système extrait les données et crée automatiquement les tâches associées.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconDancefloor size={16} color={BRAND_ACCENT} />
              <div style={featureTitleStyle}>4. DJ Zone & Playlist Collaborative</div>
            </div>
            <p style={featureDescStyle}>
              Les mariés et les invités proposent et votent pour les morceaux en direct.
              L’IA harmonise le tempo (BPM) et l’énergie de la soirée selon les moments de la journée.
            </p>
          </div>
        </div>

        {/* CTA Bar */}
        <div style={ctaBarContainerStyle}>
          <button
            onClick={() => {
              onClose();
              store.switchToDemoWedding();
            }}
            style={demoCtaBtnStyle}
          >
            Explorer le Mariage Démo
          </button>

          <button
            onClick={() => {
              onClose();
              store.createWeddingModalOpen = true;
            }}
            style={primaryCtaBtnStyle}
          >
            Créer Mon Mariage Gratuitement →
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 9, 13, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 140,
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 780,
  maxHeight: '92vh',
  overflowY: 'auto',
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 24,
  padding: '28px 30px',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const brandBadgeStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 14,
  cursor: 'pointer',
};

const heroBannerStyle: React.CSSProperties = {
  marginTop: 16,
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 16,
  padding: '18px 20px',
};

const featureCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '14px 16px',
};

const featureTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  color: '#ffffff',
};

const featureDescStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: 11,
  color: BRAND_TEXT_SECONDARY,
  lineHeight: 1.5,
};

const ctaBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 22,
  paddingTop: 16,
  borderTop: `1px solid ${BRAND_BORDER}`,
};

const demoCtaBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#f8fafc',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 10,
  padding: '10px 18px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const primaryCtaBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 10,
  padding: '10px 22px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(255, 255, 255, 0.15)',
};
