import { useState } from 'react';
import {
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
  IconClock,
  IconDancefloor,
  IconUser,
  IconPlus,
} from './Icons';

interface GuideDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'worldmap' | 'data' | 'import' | 'orchestration' | 'dj' | 'roles';

export function GuideDocModal({ isOpen, onClose }: GuideDocModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('worldmap');

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              DOCUMENTATION OFFICIELLE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              MODE D’EMPLOI DE WEDDING CITY
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 6, margin: '14px 0', borderBottom: `1px solid ${BRAND_BORDER}`, paddingBottom: 8, overflowX: 'auto' }}>
          {[
            { id: 'worldmap', label: '1. Worldmap 3D', icon: <IconWorld size={12} color="#ffffff" /> },
            { id: 'data', label: '2. Données & Liens', icon: <IconDocument size={12} color="#ffffff" /> },
            { id: 'import', label: '3. Importer le Chaos', icon: <IconPlus size={12} color="#ffffff" /> },
            { id: 'orchestration', label: '4. Orchestration & Timeline', icon: <IconClock size={12} color="#ffffff" /> },
            { id: 'dj', label: '5. DJ Zone & Playlist', icon: <IconDancefloor size={12} color="#ffffff" /> },
            { id: 'roles', label: '6. Rôles & Invités', icon: <IconUser size={12} color="#ffffff" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as GuideTab)}
              style={tabBtnStyle(activeTab === tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={contentBoxStyle}>
          {activeTab === 'worldmap' && (
            <div>
              <h3 style={sectionHeadingStyle}>Navigation sur la Worldmap Spatiale</h3>
              <p style={paragraphStyle}>
                Wedding City organise le mariage sur un territoire géolocalisé comprenant 12 pôles interconnectés :
                l’Hôtel de Ville, la Gare TGV, l’Hôtel des Invités, le Manoir, l’Arche Laïque, le Belvédère Cocktail,
                l’Orangerie de Banquet et la Scène DJ.
              </p>
              <ul style={listStyle}>
                <li><b>Clic & Glisser</b> : Déplacez la caméra 3D librement autour du domaine.</li>
                <li><b>Molette / Pincement</b> : Zoomez de la vue satellite globale jusqu’aux détails des tables.</li>
                <li><b>Bulles Spatiales</b> : Cliquez sur une bulle de lieu pour centrer la caméra et inspecter ses données.</li>
                <li><b>Dock Inférieur</b> : Utilisez les raccourcis de zone pour voyager instantanément.</li>
              </ul>
            </div>
          )}

          {activeTab === 'data' && (
            <div>
              <h3 style={sectionHeadingStyle}>Le Pixel est une Donnée Vivante</h3>
              <p style={paragraphStyle}>
                Aucun élément n'est une simple décoration visuelle. Chaque personnage (mariés, témoins, invités, chef, photographe, DJ)
                est relié en temps réel à des contrats, des horaires de présence, des acomptes à régler et des tables attribuées.
              </p>
              <ul style={listStyle}>
                <li><b>Faisceaux Laser Neuronaux</b> : À la sélection d'un personnage ou d'un devis, les liens vers les autres acteurs et lieux s'illuminent sur la grille 3D.</li>
                <li><b>Tiroir d’Inspection</b> : Consultez en direct les coordonnées de contact, la satisfaction et les tâches associées.</li>
                <li><b>Suivi de Trajectoire</b> : Cliquez sur "Localiser" pour suivre un invité ou prestataire sur la carte.</li>
              </ul>
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              <h3 style={sectionHeadingStyle}>Importer le Chaos (Extraction OCR & IA)</h3>
              <p style={paragraphStyle}>
                Wedding City comprend les documents bruts de votre mariage sans nécessiter de classement manuel :
              </p>
              <ul style={listStyle}>
                <li><b>Formats acceptés</b> : PDF (Devis, Factures, Contrats), Tableurs Excel / CSV (Plan de table, Régimes), Textes & SMS de prestataires, Images.</li>
                <li><b>Extraction Automatique</b> : Le système extrait les montants, acomptes dus, horaires de livraison et crée immédiatement la tâche dans le planning.</li>
                <li><b>Propagation d'Onde</b> : Dès qu'un fichier est importé, une onde lumineuse traverse la grille pour actualiser les pôles concernés.</li>
              </ul>
            </div>
          )}

          {activeTab === 'orchestration' && (
            <div>
              <h3 style={sectionHeadingStyle}>L’Orchestration du Jour J & la Timeline</h3>
              <p style={paragraphStyle}>
                Le bouton <b>▶ ORCHESTRER</b> fait vivre le mariage en temps réel :
              </p>
              <ul style={listStyle}>
                <li><b>Horloge Vivante</b> : De 10h00 (Préparatifs au Manoir) à 02h00 (Soirée Clubbing), les véhicules et personnages convergent physiquement vers les lieux prévus.</li>
                <li><b>Projection Timeline</b> : La Timeline émerge automatiquement de la simulation spatiale. Cliquez sur un moment pour focaliser le monde 3D.</li>
                <li><b>Résolution des Conflits</b> : Si un contrat ne correspond pas à l'horaire de cérémonie, le système détecte l'anomalie et permet de la résoudre en 1 clic.</li>
              </ul>
            </div>
          )}

          {activeTab === 'dj' && (
            <div>
              <h3 style={sectionHeadingStyle}>La DJ Zone & la Playlist Collaborative</h3>
              <p style={paragraphStyle}>
                La cabine DJ et la piste de danse constituent le centre musical vivant de Wedding City :
              </p>
              <ul style={listStyle}>
                <li><b>Cellules Musicales 3D</b> : Les morceaux apparaissent sous forme de disques holographiques autour du DJ Booth.</li>
                <li><b>Votes Collaboratifs</b> : Les invités peuvent voter pour leurs morceaux préférés (`❤️ 14 votes`).</li>
                <li><b>Harmonisation par l'IA</b> : L'algorithme réorganise la playlist pour créer une courbe d'énergie harmonieuse (Acoustique → Jazz Cocktail → Dîner → Ouverture de Bal → Soirée Club).</li>
              </ul>
            </div>
          )}

          {activeTab === 'roles' && (
            <div>
              <h3 style={sectionHeadingStyle}>Gestion des Rôles & Collaboration Partagée</h3>
              <p style={paragraphStyle}>
                Partagez l'accès à Wedding City avec tous les acteurs du mariage :
              </p>
              <ul style={listStyle}>
                <li><b>Les Mariés</b> : Contrôle total sur le budget, la validation des prestataires et les morceaux du bal.</li>
                <li><b>Wedding Planner</b> : Coordination du master planning, gestion des navettes et résolution des conflits.</li>
                <li><b>Prestataires</b> : Accès direct à leur pôle d'intervention et à leurs fiches techniques.</li>
                <li><b>Invités</b> : Consultation de leur table, signalement des allergies et propositions musicales.</li>
              </ul>
            </div>
          )}
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
  maxWidth: 740,
  maxHeight: '90vh',
  overflowY: 'auto',
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

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  border: `1px solid ${active ? BRAND_ACCENT : 'transparent'}`,
  borderRadius: 8,
  padding: '6px 12px',
  color: active ? '#ffffff' : BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const contentBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '16px 20px',
  marginTop: 6,
};

const sectionHeadingStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 14,
  fontWeight: 700,
  color: BRAND_ACCENT,
};

const paragraphStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 12,
  color: BRAND_TEXT_SECONDARY,
  lineHeight: 1.6,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 12,
  color: '#cbd5e1',
  lineHeight: 1.7,
};
