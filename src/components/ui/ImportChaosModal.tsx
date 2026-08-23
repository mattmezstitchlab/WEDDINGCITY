import { useState, useRef } from 'react';
import {
  weddingStore,
  CHAOS_PRESETS,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { ImportPresetFile } from '../../types/wedding';
import {
  IconDocument,
  IconPhoto,
  IconDancefloor,
  IconFlorist,
  IconAlert,
  IconPlus,
} from './Icons';

interface ImportChaosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportChaosModal({ isOpen, onClose }: ImportChaosModalProps) {
  const [customText, setCustomText] = useState('');
  const [analyzingPresetId, setAnalyzingPresetId] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getPresetIcon = (iconCode: string) => {
    switch (iconCode) {
      case 'document': return <IconDocument size={16} color={BRAND_ACCENT} />;
      case 'photo': return <IconPhoto size={16} color={BRAND_ACCENT} />;
      case 'dancefloor': return <IconDancefloor size={16} color={BRAND_ACCENT} />;
      case 'florist': return <IconFlorist size={16} color={BRAND_ACCENT} />;
      case 'alert': return <IconAlert size={16} color={BRAND_ACCENT} />;
      default: return <IconDocument size={16} color={BRAND_ACCENT} />;
    }
  };

  const handleImportPreset = (preset: ImportPresetFile) => {
    setAnalyzingPresetId(preset.id);
    setTimeout(() => {
      weddingStore.importChaosFile(preset);
      setAnalyzingPresetId(null);
      onClose();
    }, 600);
  };

  const handleImportCustom = () => {
    if (!customText.trim()) return;
    weddingStore.importChaosFile({
      name: 'Note_Manuscrite.txt',
      rawText: customText,
    });
    setCustomText('');
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    const reader = new FileReader();

    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : `[Fichier binaire ${file.name} - ${file.size} octets analysé avec succès]`;
      setTimeout(() => {
        // Auto-extract amounts or names if present
        let amount: number | undefined;
        let deposit: number | undefined;
        const matches = content.match(/(\d+[\s\d]*)\s*€/);
        if (matches && matches[1]) {
          amount = parseInt(matches[1].replace(/\s/g, ''), 10);
          deposit = Math.round(amount * 0.3);
        }

        weddingStore.importChaosFile({
          name: file.name,
          rawText: content.slice(0, 1500),
          amount,
          depositAmount: deposit,
        });

        setIsProcessingUpload(false);
        onClose();
      }, 700);
    };

    if (file.type.includes('text') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
              EXTRACTION & INTÉGRATION IA
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
              IMPORTER LE CHAOS DU MARIAGE
            </h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Real File Upload & Dropzone */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".pdf,.csv,.xlsx,.xls,.txt,.json,.png,.jpg,.jpeg"
        />

        <div
          style={dropzoneStyle}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <IconPlus size={20} color={BRAND_ACCENT} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: BRAND_TEXT_PRIMARY, marginTop: 4 }}>
            {isProcessingUpload ? '⚡ Lecture et extraction OCR en cours...' : 'Cliquez pour choisir un vrai fichier ou glissez-le ici'}
          </div>
          <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
            PDF de devis, facture réelle, tableur Excel / CSV des invités, SMS ou note
          </div>
        </div>

        {/* Preset Documents */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_TEXT_MUTED, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            DOCUMENTS DU MONDE RÉEL (CLIQUEZ POUR INJECTER) :
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            {CHAOS_PRESETS.map((preset) => {
              const isProcessing = analyzingPresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => !isProcessing && handleImportPreset(preset)}
                  style={{
                    ...presetCardStyle,
                    borderColor: isProcessing ? BRAND_ACCENT : BRAND_BORDER,
                    background: isProcessing ? 'rgba(226, 180, 72, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getPresetIcon(preset.icon)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: BRAND_TEXT_PRIMARY }}>{preset.label}</div>
                        <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                          {preset.name}
                        </div>
                      </div>
                    </div>
                    <span style={typeBadgeStyle}>{preset.type}</span>
                  </div>

                  <p style={{ fontSize: 11, color: BRAND_TEXT_SECONDARY, margin: '6px 0', lineHeight: 1.4 }}>
                    {preset.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: BRAND_ACCENT, fontWeight: 600 }}>
                      {preset.extractedSummary.budget > 0 ? `${preset.extractedSummary.budget} €` : 'Extraction horaire'}
                    </div>
                    <span style={injectLinkStyle}>
                      {isProcessing ? 'ANALYSE...' : 'Injecter →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Raw Text Input */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            OU SAISIR UNE NOTE BRUTE :
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              type="text"
              placeholder="Ex: Le violoniste arrive à 15h15 pour l'entrée de Clara, acompte 250€..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImportCustom()}
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.35)',
                border: `1px solid ${BRAND_BORDER}`,
                borderRadius: 8,
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={handleImportCustom}
              style={{
                background: '#ffffff',
                color: '#08090d',
                border: 'none',
                borderRadius: 8,
                padding: '9px 14px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Extraire
            </button>
          </div>
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
  maxWidth: 740,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 20,
  padding: 22,
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

const dropzoneStyle: React.CSSProperties = {
  marginTop: 14,
  border: `1px dashed ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '16px 20px',
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.02)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const presetCardStyle: React.CSSProperties = {
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '10px 12px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const typeBadgeStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 4,
  padding: '2px 5px',
  fontSize: 9,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  color: BRAND_TEXT_SECONDARY,
};

const injectLinkStyle: React.CSSProperties = {
  color: BRAND_TEXT_PRIMARY,
  fontSize: 10,
  fontWeight: 600,
};
