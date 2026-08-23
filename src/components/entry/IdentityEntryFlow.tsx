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
import { AgentRole, UserIdentity, DmcColor, DmcSymbol } from '../../types/wedding';
import { DMC_PALETTE, DMC_SYMBOLS, DEFAULT_DMC_IDENTITY } from '../../game/dmcPalette';
import { weddingAudio } from '../../game/audio';

interface IdentityEntryFlowProps {
  onComplete: () => void;
}

type EntryStep = 'hero' | 'role_select' | 'dmc_color_select' | 'symbol_select' | 'join_modal';

const ROLES_LIST: { role: AgentRole; title: string; subtitle: string; icon: string; defaultName: string }[] = [
  {
    role: 'wedding_planner',
    title: 'Wedding Planner',
    subtitle: 'Chef d’orchestre & supervision globale du Jour J',
    icon: '📋',
    defaultName: 'Sophie Étoile',
  },
  {
    role: 'bride',
    title: 'La Mariée',
    subtitle: 'Création du projet, scénographie & vœux',
    icon: '👰',
    defaultName: 'Clara Dubois',
  },
  {
    role: 'groom',
    title: 'Le Marié',
    subtitle: 'Coordination, prestataires & logistique',
    icon: '🤵',
    defaultName: 'Alexandre Meyer',
  },
  {
    role: 'photographer',
    title: 'Photographe Scénographe',
    subtitle: 'Captation visuelle, lumière & golden hour',
    icon: '📷',
    defaultName: 'Julien Renard',
  },
  {
    role: 'chef',
    title: 'Chef Traiteur',
    subtitle: 'Cocktail dînatoire & dîner gastronomique',
    icon: '👨‍🍳',
    defaultName: 'Antoine Gourmet',
  },
  {
    role: 'dj',
    title: 'Sound Designer / DJ',
    subtitle: 'Scénographie sonore & ouverture de bal',
    icon: '🎧',
    defaultName: 'Lucas SoundWave',
  },
];

export function IdentityEntryFlow({ onComplete }: IdentityEntryFlowProps) {
  const [step, setStep] = useState<EntryStep>('hero');
  const [selectedRole, setSelectedRole] = useState(ROLES_LIST[0]);
  const [userName, setUserName] = useState(ROLES_LIST[0].defaultName);
  const [selectedDmc, setSelectedDmc] = useState<DmcColor>(DMC_PALETTE[0]);
  const [selectedSymbol, setSelectedSymbol] = useState<DmcSymbol>(DMC_SYMBOLS[0]);
  const [joinCode, setJoinCode] = useState('');

  const handleCreateWeddingClick = () => {
    weddingAudio.playClick();
    setStep('role_select');
  };

  const handleSelectRole = (roleItem: typeof ROLES_LIST[0]) => {
    weddingAudio.playClick();
    setSelectedRole(roleItem);
    setUserName(roleItem.defaultName);
    setStep('dmc_color_select');
  };

  const handleFinalizeIdentity = () => {
    weddingAudio.playWeddingChimes();
    const identity: UserIdentity = {
      role: selectedRole.role,
      name: userName || selectedRole.defaultName,
      roleTitle: selectedRole.title,
      outfitColor: selectedDmc.hex,
      accessory: selectedSymbol.glyph,
      avatarIcon: selectedSymbol.glyph,
      isCreated: true,
    };

    weddingStore.setUserDmcIdentity({
      dmcCode: selectedDmc.code,
      dmcName: selectedDmc.name,
      dmcColor: selectedDmc.hex,
      symbolId: selectedSymbol.id,
      symbolGlyph: selectedSymbol.glyph,
      symbolName: selectedSymbol.name,
      customBadgeText: userName || selectedRole.defaultName,
    });

    weddingStore.setUserIdentity(identity);
    weddingStore.startIntroCinematic();
    onComplete();
  };

  const handleQuickEnter = () => {
    weddingAudio.playClick();
    weddingStore.startIntroCinematic();
    onComplete();
  };

  return (
    <div style={spatialOverlayStyle}>
      {/* ---------------- STEP 1: HERO SCREEN ---------------- */}
      {step === 'hero' && (
        <div style={spatialCardStyle(520)}>
          {/* Minimalist Titanium Monogram */}
          <div style={monogramContainerStyle}>
            <span style={{ fontSize: 20, color: BRAND_ACCENT }}>◇</span>
          </div>

          <h1 style={titleStyle}>
            WEDDING CITY
          </h1>

          <div style={subtitleStyle}>
            SIMULATION & ORCHESTRATION SPATIALE DU JOUR J
          </div>

          <p style={descriptionStyle}>
            Un monde vivant en pixel art contemporain où chaque personne, devis, contrat,
            lieu et horaire forme un réseau architectural interconnecté en temps réel.
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, margin: '0 auto' }}>
            <button onClick={handleCreateWeddingClick} style={primaryActionBtnStyle}>
              CRÉER MON MARIAGE
            </button>

            <button onClick={() => setStep('join_modal')} style={secondaryActionBtnStyle}>
              REJOINDRE UN MARIAGE
            </button>

            <button onClick={handleQuickEnter} style={ghostActionBtnStyle}>
              Continuer sans compte (Mode Démo) →
            </button>
          </div>
        </div>
      )}

      {/* ---------------- STEP 2: QUI ÊTES-VOUS ? ---------------- */}
      {step === 'role_select' && (
        <div style={spatialCardStyle(680)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={stepTagStyle}>ÉTAPE 1 / 3</div>
              <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: BRAND_TEXT_PRIMARY, letterSpacing: '-0.015em' }}>
                QUI ÊTES-VOUS ?
              </h2>
            </div>
            <button onClick={() => setStep('hero')} style={backNavBtnStyle}>
              ← Retour
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ROLES_LIST.map((roleItem) => (
              <div
                key={roleItem.role}
                onClick={() => handleSelectRole(roleItem)}
                style={roleCardStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={roleIconBoxStyle}>{roleItem.icon}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: BRAND_TEXT_PRIMARY }}>{roleItem.title}</div>
                    <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2, lineHeight: 1.3 }}>
                      {roleItem.subtitle}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- STEP 3: CHOISISSEZ VOTRE COULEUR (DMC ID) ---------------- */}
      {step === 'dmc_color_select' && (
        <div style={spatialCardStyle(620)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={stepTagStyle}>ÉTAPE 2 / 3 • DMC ID</div>
              <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: BRAND_TEXT_PRIMARY, letterSpacing: '-0.015em' }}>
                CHOISISSEZ VOTRE COULEUR DMC
              </h2>
              <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
                Inspiré du nuancier de fils d’art textile DMC. Votre couleur identifie le haut de votre avatar.
              </div>
            </div>
            <button onClick={() => setStep('role_select')} style={backNavBtnStyle}>
              ← Retour
            </button>
          </div>

          {/* Real-time DMC Color Palette Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0' }}>
            {DMC_PALETTE.map((dmc) => {
              const isSelected = selectedDmc.code === dmc.code;
              return (
                <div
                  key={dmc.code}
                  onClick={() => {
                    setSelectedDmc(dmc);
                    weddingAudio.playClick();
                  }}
                  style={{
                    ...dmcChipCardStyle,
                    borderColor: isSelected ? BRAND_ACCENT : 'rgba(255, 255, 255, 0.1)',
                    background: isSelected ? 'rgba(226, 180, 72, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: dmc.hex,
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: isSelected ? BRAND_ACCENT : '#ffffff' }}>
                        {dmc.code}
                      </div>
                      <div style={{ fontSize: 10, color: BRAND_TEXT_SECONDARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                        {dmc.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Name Field */}
          <div style={{ marginBottom: 16, textAlign: 'left' }}>
            <label style={fieldLabelStyle}>NOM OU TITRE DE L'AVATAR :</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ex: Sophie Étoile"
              style={spatialInputStyle}
            />
          </div>

          <button onClick={() => setStep('symbol_select')} style={primaryActionBtnStyle}>
            Continuer vers le Choix du Symbole →
          </button>
        </div>
      )}

      {/* ---------------- STEP 4: CHOISISSEZ VOTRE SYMBOLE (DMC SYMBOL) ---------------- */}
      {step === 'symbol_select' && (
        <div style={spatialCardStyle(540)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={stepTagStyle}>ÉTAPE 3 / 3 • SYMBOLE PERSISTANT</div>
              <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: BRAND_TEXT_PRIMARY, letterSpacing: '-0.015em' }}>
                CHOISISSEZ VOTRE SYMBOLE
              </h2>
              <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
                Gravé sur votre avatar et visible sur toutes vos créations.
              </div>
            </div>
            <button onClick={() => setStep('dmc_color_select')} style={backNavBtnStyle}>
              ← Retour
            </button>
          </div>

          {/* Final Avatar Identity Preview Badge */}
          <div style={previewBadgeContainerStyle}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: selectedDmc.hex,
                border: '2px solid rgba(255, 255, 255, 0.3)',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              {selectedSymbol.glyph}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                {userName || selectedRole.defaultName}
              </span>
              <span style={dmcCodeBadgeStyle}>
                {selectedDmc.code} • {selectedSymbol.glyph}
              </span>
            </div>

            <div style={{ fontSize: 11, color: BRAND_ACCENT, marginTop: 2 }}>
              {selectedRole.title} • {selectedDmc.name}
            </div>
          </div>

          {/* Symbol Selection Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, margin: '14px 0 20px' }}>
            {DMC_SYMBOLS.map((sym) => {
              const isSelected = selectedSymbol.id === sym.id;
              return (
                <button
                  key={sym.id}
                  onClick={() => {
                    setSelectedSymbol(sym);
                    weddingAudio.playClick();
                  }}
                  title={`${sym.name} (${sym.meaning})`}
                  style={{
                    ...symbolBtnStyle,
                    borderColor: isSelected ? BRAND_ACCENT : 'rgba(255, 255, 255, 0.1)',
                    background: isSelected ? 'rgba(226, 180, 72, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{sym.glyph}</span>
                  <span style={{ fontSize: 8.5, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
                    {sym.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <button onClick={handleFinalizeIdentity} style={primaryActionBtnStyle}>
            ENTRER DANS WEDDING CITY AVEC MON DMC ID →
          </button>
        </div>
      )}

      {/* ---------------- JOIN MODAL ---------------- */}
      {step === 'join_modal' && (
        <div style={spatialCardStyle(440)}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: BRAND_TEXT_PRIMARY }}>
            REJOINDRE UN MARIAGE
          </h2>
          <p style={{ margin: '0 0 18px', fontSize: 12, color: BRAND_TEXT_SECONDARY }}>
            Entrez le code d’invitation transmis par les mariés ou la wedding planner.
          </p>

          <input
            type="text"
            placeholder="CODE-JOUR-J"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{
              ...spatialInputStyle,
              textAlign: 'center',
              letterSpacing: 2,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
            }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep('hero')} style={secondaryActionBtnStyle}>
              Annuler
            </button>
            <button onClick={handleQuickEnter} style={primaryActionBtnStyle}>
              Accéder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const spatialOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 9, 13, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 150,
  padding: 20,
};

const spatialCardStyle = (maxWidth: number): React.CSSProperties => ({
  width: '100%',
  maxWidth,
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 24,
  padding: '32px 30px',
  textAlign: 'center',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
  color: BRAND_TEXT_PRIMARY,
});

const monogramContainerStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  margin: '0 auto 16px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 800,
  letterSpacing: '0.04em',
  color: '#ffffff',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: BRAND_ACCENT,
  letterSpacing: '0.12em',
  marginTop: 6,
  textTransform: 'uppercase',
};

const descriptionStyle: React.CSSProperties = {
  margin: '18px 0 26px',
  fontSize: 13,
  color: BRAND_TEXT_SECONDARY,
  lineHeight: 1.6,
  maxWidth: 420,
  marginLeft: 'auto',
  marginRight: 'auto',
};

const primaryActionBtnStyle: React.CSSProperties = {
  width: '100%',
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 12,
  padding: '12px 20px',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(255, 255, 255, 0.12)',
};

const secondaryActionBtnStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.04)',
  color: BRAND_TEXT_PRIMARY,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 20px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const ghostActionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  padding: '6px 0',
};

const stepTagStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: BRAND_ACCENT,
  letterSpacing: '0.08em',
};

const backNavBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const roleCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '12px 14px',
  cursor: 'pointer',
};

const roleIconBoxStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  flexShrink: 0,
};

const dmcChipCardStyle: React.CSSProperties = {
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 10,
  padding: '8px 10px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const previewBadgeContainerStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 16,
  padding: '16px',
  textAlign: 'center',
};

const dmcCodeBadgeStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 10,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  color: BRAND_ACCENT,
};

const symbolBtnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 10,
  padding: '8px 4px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: BRAND_TEXT_MUTED,
  letterSpacing: '0.06em',
};

const spatialInputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 6,
  background: 'rgba(0, 0, 0, 0.35)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 10,
  padding: '10px 12px',
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
};
