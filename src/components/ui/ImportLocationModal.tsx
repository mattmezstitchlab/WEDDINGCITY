import { useState, useRef } from 'react';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { IconPhoto, IconPlus, IconSparkles } from './Icons';

interface ImportLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_REAL_LOCATIONS = [
  {
    name: 'Château de Bellevue — Salle des Glaces',
    style: 'chateau' as const,
    photoLabel: 'chateau_bellevue_hall.jpg',
    confidenceScore: 94,
    detectedTables: 10,
    description: 'Château XVIIIe siècle, lustres en cristal, parquet de chêne massif et grandes baies vitrées.',
  },
  {
    name: 'Grange Rénovée en Pierres & Poutres',
    style: 'grange' as const,
    photoLabel: 'grange_seculaire_normandie.jpg',
    confidenceScore: 89,
    detectedTables: 8,
    description: 'Murs en pierre de taille, charpente apparente en chêne, guirlandes guinguette et scène.',
  },
  {
    name: 'Domaine Contemporain & Verrière Panoramique',
    style: 'verriere' as const,
    photoLabel: 'orangerie_moderne_verriere.jpg',
    confidenceScore: 92,
    detectedTables: 12,
    description: 'Structure contemporaine en acier noir et verre, vue à 360° sur les jardins et bar en laiton.',
  },
  {
    name: 'Bastide Provençale & Jardin des Oliviers',
    style: 'jardin' as const,
    photoLabel: 'bastide_provencale_terrasse.jpg',
    confidenceScore: 88,
    detectedTables: 9,
    description: 'Terrasse pavée en travertin sous pergola fleurie, fontaine en pierre et éclairage chaleureux.',
  },
];

export function ImportLocationModal({ isOpen, onClose }: ImportLocationModalProps) {
  const store = weddingStore;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [locationName, setLocationName] = useState('');
  const [style, setStyle] = useState<'chateau' | 'grange' | 'verriere' | 'jardin' | 'moderne'>('verriere');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_REAL_LOCATIONS[0]) => {
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            store.importRealLocationFromPhotos({
              name: preset.name,
              style: preset.style,
              photoName: preset.photoLabel,
              confidenceScore: preset.confidenceScore,
              detectedTables: preset.detectedTables,
              description: preset.description,
            });
            setIsScanning(false);
            onClose();
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            store.importRealLocationFromPhotos({
              name: locationName || file.name.split('.')[0].replace(/_/g, ' '),
              style,
              photoName: file.name,
              confidenceScore: 88,
              detectedTables: 8,
              description: `Lieu reconstruit à partir de la photo réelle : ${file.name}`,
            });
            setIsScanning(false);
            onClose();
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              REAL WORLD → 3D WORLD
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              RECONSTITUER UN LIEU RÉEL EN 3D
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <p style={{ margin: '8px 0 16px', fontSize: 12, color: BRAND_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Photographiez votre salle de réception, château, grange ou jardin. Notre IA analyse l'architecture,
          les murs, ouvertures, tables et éclairages pour générer un environnement 3D explorable.
        </p>

        {/* Real Photo Upload Dropzone */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleCustomUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <div style={dropzoneStyle} onClick={() => fileInputRef.current?.click()}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <IconPhoto size={24} color={BRAND_ACCENT} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#ffffff' }}>
            {isScanning ? `⚡ Scan IA & Reconstruction Spatiale (${scanProgress}%)` : 'Cliquez pour importer des photos de votre vrai lieu'}
          </div>
          <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
            Photos grand angle, plans architecturaux ou vidéo panoramique
          </div>
        </div>

        {/* Presets List */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_TEXT_MUTED, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            OU SÉLECTIONNER UN LIEU TYPE RÉEL :
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            {PRESET_REAL_LOCATIONS.map((preset) => (
              <div
                key={preset.name}
                onClick={() => !isScanning && handleSelectPreset(preset)}
                style={presetCardStyle}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#ffffff' }}>{preset.name}</div>
                  <span style={confidenceBadgeStyle}>{preset.confidenceScore}% IA</span>
                </div>

                <p style={{ margin: '6px 0 8px', fontSize: 11, color: BRAND_TEXT_SECONDARY, lineHeight: 1.4 }}>
                  {preset.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: BRAND_ACCENT }}>
                    ⚡ {preset.detectedTables} tables • Scène & Bar
                  </div>
                  <button
                    type="button"
                    // This button had NO onClick: only the parent card carried
                    // the handler, so the visibly-clickable target did nothing
                    // by itself and was unreachable by keyboard. It now owns
                    // the action, and stops propagation so the card handler
                    // does not fire the same import twice.
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isScanning) handleSelectPreset(preset);
                    }}
                    disabled={isScanning}
                    aria-label={`Reconstruire ${preset.name}`}
                    style={{ ...reconstructBtnStyle, cursor: isScanning ? 'default' : 'pointer', opacity: isScanning ? 0.5 : 1 }}
                  >
                    <IconSparkles size={11} color="#08090d" />
                    <span>Reconstruire →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
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
  maxHeight: '92vh',
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

const dropzoneStyle: React.CSSProperties = {
  border: `1px dashed ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '18px 20px',
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.02)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const presetCardStyle: React.CSSProperties = {
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
  cursor: 'pointer',
  background: 'rgba(255, 255, 255, 0.02)',
  transition: 'all 0.15s ease',
};

const confidenceBadgeStyle: React.CSSProperties = {
  background: 'rgba(226, 180, 72, 0.15)',
  color: BRAND_ACCENT,
  borderRadius: 4,
  padding: '2px 5px',
  fontSize: 9,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
};

const reconstructBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
};
