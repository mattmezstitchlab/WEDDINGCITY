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
import { WORLD_ARCHETYPES } from '../../game/worldEngine';
import { WorldType } from '../../types/wedding';
import { IconWorld, IconSparkles, IconPlus } from './Icons';

interface WorldLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorldLabModal({ isOpen, onClose }: WorldLabModalProps) {
  const store = weddingStore;

  const [promptInput, setPromptInput] = useState('');
  const [selectedType, setSelectedType] = useState<WorldType>('travel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  if (!isOpen) return null;

  const handleGenerateAi = (customPrompt?: string, targetType?: WorldType) => {
    const finalPrompt = customPrompt || promptInput || 'Nouveau monde vivant connecté et orchestré';
    const finalType = targetType || selectedType;

    setIsGenerating(true);
    setGenerationStep('Compréhension du projet & extraction des entités...');

    setTimeout(() => {
      setGenerationStep('Génération des pôles géolocalisés & architecture 3D...');
      setTimeout(() => {
        setGenerationStep('Interconnexion du réseau, de la timeline et des flux...');
        setTimeout(() => {
          store.createWorldWithAi({
            prompt: finalPrompt,
            worldType: finalType,
            title: finalPrompt.slice(0, 40),
          });
          setIsGenerating(false);
          onClose();
        }, 500);
      }, 500);
    }, 600);
  };

  const handleSelectArchetype = (typeId: WorldType) => {
    const arch = WORLD_ARCHETYPES.find((a) => a.id === typeId);
    if (!arch) return;
    setSelectedType(typeId);
    setPromptInput(arch.samplePrompt);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={brandBadgeStyle}>
              <span style={{ fontSize: 18, color: BRAND_ACCENT }}>◇</span>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.12em' }}>
                WORLD ENGINE • WORLD LAB
              </div>
              <h1 style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Quel monde voulez-vous créer ?
              </h1>
              <div style={{ fontSize: 12, color: BRAND_TEXT_SECONDARY, marginTop: 2 }}>
                Transformez n’importe quel projet en monde vivant, connecté et orchestré.
              </div>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Primary Method 1: Describe My Project with AI (Hero Card) */}
        <div style={aiHeroCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconSparkles size={16} color={BRAND_ACCENT} />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
              ✨ CRÉER AVEC L’IA (DÉCRIRE MON PROJET)
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Ex: Roadtrip de 2 semaines au Japon avec 4 amis, budget 8000€, Tokyo, Kyoto, Mont Fuji..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAi()}
              style={aiInputStyle}
            />
            <button
              onClick={() => handleGenerateAi()}
              disabled={isGenerating}
              style={generateAiBtnStyle}
            >
              {isGenerating ? 'GÉNÉRATION...' : 'Générer mon Monde →'}
            </button>
          </div>

          {/* Real-time Generation Progress Status */}
          {isGenerating && (
            <div style={generationStatusBannerStyle}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND_ACCENT, animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 600 }}>
                {generationStep}
              </span>
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {[
              { label: '✈️ Roadtrip Japon 2 semaines', type: 'travel' as WorldType, prompt: 'Roadtrip 2 semaines au Japon : Tokyo, Kyoto, Mont Fuji, Shinkansen et Ryokan, budget 6500€.' },
              { label: '🎸 Tournée Live SoundWave', type: 'concert' as WorldType, prompt: 'Tournée de 5 concerts : balances son, scènes 10kW, loges artistes, billetterie et merchandising.' },
              { label: '🎪 Séminaire Entreprise 200 pax', type: 'event' as WorldType, prompt: 'Séminaire annuel 200 personnes : plénière le matin, 4 ateliers, dîner de gala et hébergement.' },
              { label: '🎬 Tournage Court-Métrage', type: 'production' as WorldType, prompt: 'Production court-métrage 3 jours : repérages extérieurs, plateau studio, équipe de 15 personnes.' },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  setSelectedType(chip.type);
                  setPromptInput(chip.prompt);
                  handleGenerateAi(chip.prompt, chip.type);
                }}
                style={chipPromptBtnStyle}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* 11 World Archetype Big Cards Grid */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_TEXT_MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            OU CHOISIR UN TYPE DE MONDE (ARCHETYPES UNIVERSELS) :
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
            {WORLD_ARCHETYPES.map((arch) => {
              const isSelected = selectedType === arch.id;
              return (
                <div
                  key={arch.id}
                  onClick={() => handleSelectArchetype(arch.id)}
                  style={{
                    ...archetypeCardStyle,
                    borderColor: isSelected ? BRAND_ACCENT : BRAND_BORDER,
                    background: isSelected ? 'rgba(226, 180, 72, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{arch.icon}</span>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: isSelected ? BRAND_ACCENT : '#ffffff' }}>
                        {arch.title.split('(')[0].trim()}
                      </div>
                    </div>
                    <span style={archetypeBadgeStyle}>{arch.badge}</span>
                  </div>

                  <p style={{ fontSize: 10.5, color: BRAND_TEXT_SECONDARY, margin: '6px 0', lineHeight: 1.4 }}>
                    {arch.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: `1px solid ${BRAND_BORDER}` }}>
                    <span style={{ fontSize: 9.5, color: BRAND_TEXT_MUTED }}>
                      Budget : {arch.defaultBudget.toLocaleString('fr-FR')} €
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateAi(arch.samplePrompt, arch.id);
                      }}
                      style={cardSelectBtnStyle(isSelected)}
                    >
                      Lancer →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 9, 13, 0.92)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 140,
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 880,
  maxHeight: '94vh',
  overflowY: 'auto',
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 24,
  padding: '28px 32px',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)',
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const brandBadgeStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
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

const aiHeroCardStyle: React.CSSProperties = {
  marginTop: 16,
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_ACCENT}`,
  borderRadius: 16,
  padding: '16px 20px',
  boxShadow: '0 0 24px rgba(226, 180, 72, 0.15)',
};

const aiInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(0, 0, 0, 0.4)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const generateAiBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 14px rgba(255, 255, 255, 0.2)',
};

const generationStatusBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(226, 180, 72, 0.12)',
  border: `1px solid ${BRAND_ACCENT}`,
  borderRadius: 6,
  padding: '6px 12px',
  marginTop: 8,
};

const chipPromptBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '3px 8px',
  color: BRAND_TEXT_SECONDARY,
  fontSize: 10,
  cursor: 'pointer',
};

const archetypeCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const archetypeBadgeStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 8.5,
  fontFamily: "'JetBrains Mono', monospace",
  color: BRAND_TEXT_MUTED,
};

const cardSelectBtnStyle = (selected: boolean): React.CSSProperties => ({
  background: selected ? BRAND_ACCENT : 'rgba(255, 255, 255, 0.06)',
  color: selected ? '#08090d' : '#ffffff',
  border: 'none',
  borderRadius: 5,
  padding: '3px 7px',
  fontSize: 9.5,
  fontWeight: 700,
  cursor: 'pointer',
});
