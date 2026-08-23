import { getStoredProjects } from '../../game/persistence';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import {
  IconWorld,
  IconCeremonie,
  IconPlus,
  IconDocument,
  IconSparkles,
  IconUser,
  IconShare,
  IconDancefloor,
} from './Icons';

interface BrandMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrandMenuModal({ isOpen, onClose }: BrandMenuModalProps) {
  const store = weddingStore;
  const project = store.currentProject;
  const activeAccount = store.activeAccount;

  if (!isOpen) return null;

  const handleAction = (cb: () => void) => {
    onClose();
    cb();
  };

  // MEASURED IN THE BROWSER (multi-project acceptance): a second wedding could
  // be created, but nothing in the interface could ever open it again — the
  // only way back was "Basculer vers le Mode Démo". Every stored project is
  // now listed, and switching is one click.
  const projects = getStoredProjects();

  return (
    <div style={dropdownBackdropStyle} onClick={onClose}>
      <div style={dropdownCardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Active Project Header */}
        <div style={projectHeaderBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: BRAND_ACCENT }}>◇</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
                {project.title}
              </div>
              <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, marginTop: 1 }}>
                {project.isDemo ? 'Mode Démo Vivant' : 'Projet Réel Persistant'} • {project.inviteCode}
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px' }}>
          <button
            onClick={() => handleAction(() => {
              store.worldLabModalOpen = true;
            })}
            style={{
              ...menuItemBtnStyle,
              background: 'rgba(226, 180, 72, 0.12)',
              border: `1px solid ${BRAND_ACCENT}`,
              color: BRAND_ACCENT,
              fontWeight: 700,
            }}
          >
            <IconSparkles size={14} color={BRAND_ACCENT} />
            <span>✨ + Créer un Nouveau Monde (World Lab)</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.cameraTargetPos = [0, 2, 0];
              store.setViewMode('world');
            })}
            style={menuItemBtnStyle}
          >
            <IconWorld size={14} color="#ffffff" />
            <span>Accueil (Worldmap 3D)</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.projectSettingsModalOpen = true;
            })}
            style={menuItemBtnStyle}
          >
            <IconCeremonie size={14} color={BRAND_ACCENT} />
            <span>Mon Projet (Paramètres & Résumé)</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.createWeddingModalOpen = true;
            })}
            style={menuItemBtnStyle}
          >
            <IconPlus size={14} color="#ffffff" />
            <span>Créer un Mariage (Wedding City)</span>
          </button>

          {/* --- the projects that really exist in this browser --- */}
          {projects.length > 1 && (
            <div style={projectListStyle}>
              <div style={projectListLabelStyle}>Mes mariages · {projects.length}</div>
              {projects.map((p) => {
                const isActive = p.id === project.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleAction(() => {
                      if (!isActive) store.loadProject(p.id);
                    })}
                    aria-current={isActive ? 'true' : undefined}
                    style={{
                      ...menuItemBtnStyle,
                      background: isActive ? 'rgba(226,180,72,0.10)' : 'transparent',
                      color: isActive ? BRAND_ACCENT : BRAND_TEXT_PRIMARY,
                    }}
                    title={isActive ? 'Mariage actuellement ouvert' : `Ouvrir ${p.coupleNames}`}
                  >
                    <span style={{ width: 14, textAlign: 'center' }}>{isActive ? '◆' : '◇'}</span>
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.coupleNames || p.title}
                      {p.isDemo ? ' · démo' : ''}
                    </span>
                    {isActive && <span style={{ fontSize: 9, color: BRAND_TEXT_MUTED }}>ouvert</span>}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => handleAction(() => {
              store.systemNerveModalOpen = true;
            })}
            style={{
              ...menuItemBtnStyle,
              color: '#38bdf8',
            }}
          >
            <span>⚡</span>
            <span>System Nerve Center (Santé & Autodiagnostic)</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.connectorsModalOpen = true;
            })}
            style={menuItemBtnStyle}
          >
            <span>🔌</span>
            <span>Connecteurs Hub (Google, Drive, Calendar, Spotify...)</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.setDjBoothOpen(true);
            })}
            style={menuItemBtnStyle}
          >
            <IconDancefloor size={14} color={BRAND_ACCENT} />
            <span>DJ Zone & Playlist Collaborative</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.inviteModalOpen = true;
            })}
            style={menuItemBtnStyle}
          >
            <IconShare size={14} color="#ffffff" />
            <span>Inviter des Invités / Prestataires</span>
          </button>

          <div style={dividerStyle} />

          <button
            onClick={() => handleAction(() => {
              store.guideDocModalOpen = true;
            })}
            style={menuItemBtnStyle}
          >
            <IconDocument size={14} color="#cbd5e1" />
            <span>Mode d’Emploi & Guide Interactif</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.landingPageModalOpen = true;
            })}
            style={menuItemBtnStyle}
          >
            <IconSparkles size={14} color={BRAND_ACCENT} />
            <span>Landing Page & Vitrine Produit</span>
          </button>

          <button
            onClick={() => handleAction(() => {
              store.showIdentityModal = true;
            })}
            style={menuItemBtnStyle}
          >
            <IconUser size={14} color="#ffffff" />
            <span>Mon Profil ({store.userIdentity.name})</span>
          </button>

          <div style={dividerStyle} />

          {project.isDemo ? (
            <button
              onClick={() => handleAction(() => {
                store.createWeddingModalOpen = true;
              })}
              style={{ ...menuItemBtnStyle, color: BRAND_ACCENT }}
            >
              <span>✨</span>
              <span>Passer en Mode Réel (Créer mon mariage)</span>
            </button>
          ) : (
            <button
              onClick={() => handleAction(() => {
                store.switchToDemoWedding();
              })}
              style={menuItemBtnStyle}
            >
              <span>🎲</span>
              <span>Basculer vers le Mode Démo</span>
            </button>
          )}

          {activeAccount ? (
            <button
              onClick={() => handleAction(() => {
                store.logout();
              })}
              style={{ ...menuItemBtnStyle, color: '#f43f5e' }}
            >
              <span>🚪</span>
              <span>Se Déconnecter ({activeAccount.email})</span>
            </button>
          ) : (
            <button
              onClick={() => handleAction(() => {
                store.authModalOpen = true;
              })}
              style={{ ...menuItemBtnStyle, color: '#ffffff' }}
            >
              <span>👤</span>
              <span>Connexion / Inscription</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const dropdownBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 120,
  background: 'rgba(0, 0, 0, 0.4)',
};

const dropdownCardStyle: React.CSSProperties = {
  position: 'absolute',
  top: 60,
  left: 20,
  width: 320,
  background: 'rgba(18, 21, 30, 0.96)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 18,
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.75)',
  overflow: 'hidden',
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const projectHeaderBoxStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(255, 255, 255, 0.03)',
  borderBottom: `1px solid ${BRAND_BORDER}`,
};

const projectListStyle: React.CSSProperties = {
  display: 'grid', gap: 2, padding: '6px 0',
  borderTop: `1px solid ${BRAND_BORDER}`, borderBottom: `1px solid ${BRAND_BORDER}`,
  margin: '4px 0',
};

const projectListLabelStyle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: BRAND_TEXT_MUTED, fontWeight: 700, padding: '4px 12px 2px',
};

const menuItemBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderRadius: 10,
  padding: '9px 12px',
  color: '#f8fafc',
  fontSize: 12,
  fontWeight: 500,
  textAlign: 'left',
  cursor: 'pointer',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255, 255, 255, 0.06)',
  margin: '4px 8px',
};
