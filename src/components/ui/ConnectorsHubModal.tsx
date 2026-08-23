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
import {
  connectorEngine,
} from '../../game/connectorEngine';
import { ConnectorEntity, ExternalSyncItem, ConnectorServiceId } from '../../types/wedding';
import {
  IconCalendar,
  IconDrive,
  IconMail,
  IconSpotify,
  IconWorld,
  IconRefresh,
  IconCheck,
  IconAlert,
  IconPlus,
  IconSparkles,
  IconTransport,
} from './Icons';

interface ConnectorsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectorsHubModal({ isOpen, onClose }: ConnectorsHubModalProps) {
  const store = weddingStore;
  const connectors = connectorEngine.getConnectors();
  const syncItems = connectorEngine.getSyncItems();

  const [activeTab, setActiveTab] = useState<'all' | 'detected_imports' | 'changes'>('all');
  const [selectedConnector, setSelectedConnector] = useState<ConnectorEntity | null>(null);

  if (!isOpen) return null;

  const getServiceIcon = (iconCode: string) => {
    switch (iconCode) {
      case 'calendar': return <IconCalendar size={16} color={BRAND_ACCENT} />;
      case 'drive': return <IconDrive size={16} color={BRAND_ACCENT} />;
      case 'mail': return <IconMail size={16} color={BRAND_ACCENT} />;
      case 'spotify': return <IconSpotify size={16} color="#10b981" />;
      case 'maps': return <IconTransport size={16} color={BRAND_ACCENT} />;
      default: return <IconWorld size={16} color={BRAND_ACCENT} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span style={statusBadgeStyle('#10b981', 'rgba(16, 185, 129, 0.15)')}>✓ CONNECTÉ</span>;
      case 'auth_required':
        return <span style={statusBadgeStyle(BRAND_ACCENT, 'rgba(226, 180, 72, 0.15)')}>⚡ AUTORISATION REQUISE</span>;
      case 'syncing':
        return <span style={statusBadgeStyle('#38bdf8', 'rgba(56, 189, 248, 0.15)')}>SYNC EN COURS...</span>;
      default:
        return <span style={statusBadgeStyle(BRAND_TEXT_MUTED, 'rgba(255, 255, 255, 0.05)')}>○ NON CONNECTÉ</span>;
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.1em' }}>
              CONNECTORS HUB • INTERCONNECTIVITÉ NUMÉRIQUE
            </div>
            <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Connectez votre monde
            </h1>
            <div style={{ fontSize: 12, color: BRAND_TEXT_SECONDARY, marginTop: 2 }}>
              Reliez les outils que vous utilisez déjà. Wedding City comprend, organise et connecte leurs informations.
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px', borderBottom: `1px solid ${BRAND_BORDER}`, paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setActiveTab('all')}
              style={tabBtnStyle(activeTab === 'all')}
            >
              <span>Connecteurs ({connectors.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('detected_imports')}
              style={tabBtnStyle(activeTab === 'detected_imports')}
            >
              <span>📥 Import Intelligent ({syncItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('changes')}
              style={tabBtnStyle(activeTab === 'changes')}
            >
              <span>⚡ Changements Détectés (1)</span>
            </button>
          </div>

          <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔒 OAuth 2.0 PKCE • Zéro mot de passe stocké</span>
          </div>
        </div>

        {/* Tab 1: All Connectors Grid */}
        {activeTab === 'all' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
            {connectors.map((connector) => {
              const isConnected = connector.status === 'connected';
              return (
                <div key={connector.id} style={connectorCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={connectorIconBoxStyle}>
                        {getServiceIcon(connector.icon)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>{connector.name}</div>
                        <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, marginTop: 1 }}>
                          Source : {connector.sourceLabel}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(connector.status)}
                  </div>

                  <p style={{ fontSize: 11, color: BRAND_TEXT_SECONDARY, margin: '8px 0', lineHeight: 1.4 }}>
                    {connector.description}
                  </p>

                  {connector.detectedSummary && (
                    <div style={detectedSummaryBoxStyle}>
                      <span style={{ color: BRAND_ACCENT }}>✓</span> {connector.detectedSummary}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1px solid ${BRAND_BORDER}` }}>
                    <span style={{ fontSize: 9.5, color: BRAND_TEXT_MUTED }}>
                      {connector.lastSyncAt ? `Dernière synchro : ${connector.lastSyncAt}` : 'Non synchronisé'}
                    </span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => connectorEngine.syncConnector(connector.id)}
                            style={syncBtnStyle}
                            title="Lancer une synchronisation en direct"
                          >
                            <IconRefresh size={11} color="#ffffff" />
                            <span>Synchroniser</span>
                          </button>
                          <button
                            onClick={() => connectorEngine.disconnectService(connector.id)}
                            style={disconnectBtnStyle}
                          >
                            Déconnecter
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => connectorEngine.connectService(connector.id)}
                          style={connectBtnStyle}
                        >
                          <span>Connecter (OAuth) →</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Intelligent Ingestion Queue */}
        {activeTab === 'detected_imports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
            <div style={infoBannerStyle}>
              💡 <b>Import Intelligent</b> : Wedding City a détecté ces éléments autorisés sur vos comptes connectés. Cliquez sur "Analyser & Importer" pour les intégrer au monde 3D sans modifier vos fichiers originaux.
            </div>

            {syncItems.map((item) => (
              <div key={item.id} style={syncItemCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>{item.title}</span>
                      <span style={typePillStyle}>{item.connectorId.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
                      {item.senderOrLocation} • {item.dateOrAmount}
                    </div>
                  </div>

                  <span style={item.status === 'imported' ? statusBadgeStyle('#10b981', 'rgba(16, 185, 129, 0.15)') : statusBadgeStyle(BRAND_ACCENT, 'rgba(226, 180, 72, 0.15)')}>
                    {item.status === 'imported' ? '✓ DÉJÀ INTÉGRÉ' : 'PRÊT À L’IMPORT'}
                  </span>
                </div>

                <p style={{ fontSize: 11, color: BRAND_TEXT_SECONDARY, margin: '6px 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                  "{item.sourceSnippet}"
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: `1px solid ${BRAND_BORDER}` }}>
                  <div style={{ fontSize: 10, color: BRAND_ACCENT }}>
                    ⚡ Impact : {item.impactDescription}
                  </div>

                  {item.status !== 'imported' && (
                    <button
                      onClick={() => connectorEngine.ingestItem(item)}
                      style={ingestActionBtnStyle}
                    >
                      <span>＋ Analyser & Importer</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Detected External Changes */}
        {activeTab === 'changes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...syncItemCardStyle, borderColor: BRAND_ACCENT, background: 'rgba(226, 180, 72, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconAlert size={14} color={BRAND_ACCENT} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
                    Changement Détecté dans Google Calendar
                  </span>
                </div>
                <span style={statusBadgeStyle(BRAND_ACCENT, 'rgba(226, 180, 72, 0.2)')}>MODIFICATION EXTERNE</span>
              </div>

              <p style={{ margin: '8px 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                Le rendez-vous avec le photographe <b>Julien Renard</b> a été modifié dans votre calendrier externe :
                passage de <b>14h00</b> à <b>14h30</b>.
              </p>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: BRAND_TEXT_SECONDARY }}>
                ⚡ <b>Conséquence sur Wedding City :</b> Synchronise l'arrivée du photographe sur le parvis à 14h30 et résout le décalage avec la cérémonie laïque.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    const item = syncItems.find((i) => i.id === 'sync_gcal_photo_shift');
                    if (item) connectorEngine.propagateExternalChange(item);
                  }}
                  style={propagateBtnStyle}
                >
                  ⚡ Valider & Propager la Modification sur le Monde 3D
                </button>
              </div>
            </div>
          </div>
        )}
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
  maxWidth: 820,
  maxHeight: '92vh',
  overflowY: 'auto',
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 24,
  padding: '26px 30px',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)',
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
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  border: `1px solid ${active ? BRAND_ACCENT : 'transparent'}`,
  borderRadius: 6,
  padding: '5px 10px',
  color: active ? '#ffffff' : BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const connectorCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '12px 14px',
};

const connectorIconBoxStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const statusBadgeStyle = (color: string, bg: string): React.CSSProperties => ({
  background: bg,
  border: `1px solid ${color}`,
  color,
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 8.5,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
});

const detectedSummaryBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 10,
  color: '#cbd5e1',
  margin: '4px 0',
};

const syncBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255, 255, 255, 0.06)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '4px 8px',
  color: '#ffffff',
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
};

const disconnectBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#f43f5e',
  fontSize: 10,
  cursor: 'pointer',
};

const connectBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
};

const infoBannerStyle: React.CSSProperties = {
  background: 'rgba(226, 180, 72, 0.08)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 11,
  color: '#cbd5e1',
  lineHeight: 1.5,
};

const syncItemCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
};

const typePillStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 8.5,
  fontFamily: "'JetBrains Mono', monospace",
  color: BRAND_TEXT_MUTED,
};

const ingestActionBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
};

const propagateBtnStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};
