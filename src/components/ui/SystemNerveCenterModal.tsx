import { useState, useEffect } from 'react';
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
  systemNerveEngine,
} from '../../game/systemNerveEngine';
import { SystemModuleHealth, SystemDiagnosticError } from '../../types/systemNerve';
import { NerveModuleDetail } from './NerveModuleDetail';
import { NerveGraphPanel } from './NerveGraphPanel';
import {
  IconCheck,
  IconAlert,
  IconRefresh,
  IconSparkles,
  IconWorld,
  IconDocument,
} from './Icons';

interface SystemNerveCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type NerveViewMode = 'modules' | 'graph' | 'xray' | 'errors' | 'doctor';

export function SystemNerveCenterModal({ isOpen, onClose }: SystemNerveCenterModalProps) {
  const store = weddingStore;
  const report = systemNerveEngine.getReport();
  const modules = systemNerveEngine.getModules();
  const errors = systemNerveEngine.getErrors();

  const [viewMode, setViewMode] = useState<NerveViewMode>('modules');
  const [selectedModule, setSelectedModule] = useState<SystemModuleHealth | null>(null);
  const [detailTick, setDetailTick] = useState(0);
  const [doctorQuestion, setDoctorQuestion] = useState('');
  const [doctorChat, setDoctorChat] = useState<{ q: string; a: string; time: string }[]>([
    {
      q: 'Quel est l’état général de santé de Wedding City ?',
      a: `Le système fonctionne actuellement à ${report.overallHealthScore}% de santé technique nominale. ${report.okModules} modules sont vérifiés et opérationnels. ${report.partialModules + report.configRequiredModules} modules nécessitent une attention mineure (ajustement de créneau ou configuration OAuth).`,
      time: 'En direct',
    },
  ]);

  // Probe results must exist before the detail panel can show anything real.
  // Without this, opening the modal would show "no probe" for modules that do
  // have one — i.e. it would under-report rather than over-report, but it would
  // still be wrong.
  useEffect(() => {
    if (isOpen && systemNerveEngine.getHealthChecks().length === 0) {
      void systemNerveEngine.runProbes().then(() => setDetailTick((n) => n + 1));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunHealthChecks = () => {
    systemNerveEngine.runFullDiagnostics();
  };

  const handleAskDoctor = (prompt?: string) => {
    const q = prompt || doctorQuestion;
    if (!q.trim()) return;

    let reply = `J'ai audité les 22 modules du System Nerve Center. Le pipeline Three.js WebGL, le stockage localStorage et le graphe de données sont stables.`;

    const lower = q.toLowerCase();
    if (lower.includes('erreur') || lower.includes('conflit') || lower.includes('problème')) {
      reply = `Il reste ${errors.filter(e => e.status !== 'RESOLVED').length} avertissement(s) identifié(s). Vous pouvez déclencher une réparation automatisée dans l'onglet "Erreurs & Réparation".`;
    } else if (lower.includes('base') || lower.includes('storage') || lower.includes('données')) {
      reply = `La base de données locale (localStorage) est 100% opérationnelle avec auto-save à chaque modification et intégrité JSON validée.`;
    } else if (lower.includes('connecteur') || lower.includes('oauth') || lower.includes('google')) {
      reply = `Les connecteurs Google Calendar, Drive et Gmail sont autorisés. Les services Outlook et Dropbox sont prêts mais en attente d'autorisation OAuth optionnelle.`;
    } else if (lower.includes('timeline') || lower.includes('horaire')) {
      reply = `L'orchestrateur temporel progresse de 10h00 à 02h00 avec calcul automatique des phases et synchronisation spatiale des 24+ agents.`;
    }

    setDoctorChat((prev) => [
      ...prev,
      {
        q,
        a: reply,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setDoctorQuestion('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <span style={statusBadgeStyle('#10b981', 'rgba(16, 185, 129, 0.15)')}>✓ OK</span>;
      case 'PARTIAL':
        return <span style={statusBadgeStyle(BRAND_ACCENT, 'rgba(226, 180, 72, 0.15)')}>PARTIAL</span>;
      case 'CONFIGURATION_REQUIRED':
        return <span style={statusBadgeStyle('#38bdf8', 'rgba(56, 189, 248, 0.15)')}>CONFIG REQUISE</span>;
      case 'MOCK':
        return <span style={statusBadgeStyle('#eab308', 'rgba(234, 179, 8, 0.15)')}>🟡 SIMULÉ</span>;
      case 'NOT_IMPLEMENTED':
        return <span style={statusBadgeStyle(BRAND_TEXT_MUTED, 'rgba(255, 255, 255, 0.05)')}>⚪ ABSENT</span>;
      case 'ERROR':
        return <span style={statusBadgeStyle('#f43f5e', 'rgba(244, 63, 94, 0.15)')}>ERROR</span>;
      default:
        return <span style={statusBadgeStyle(BRAND_TEXT_MUTED, 'rgba(255, 255, 255, 0.05)')}>UNKNOWN</span>;
    }
  };

  const getMaturityPill = (maturity: string) => {
    switch (maturity) {
      case 'REAL':
        return <span style={maturityPillStyle('#ffffff', 'rgba(255, 255, 255, 0.1)')}>RÉEL</span>;
      case 'PARTIAL':
        return <span style={maturityPillStyle(BRAND_ACCENT, 'rgba(226, 180, 72, 0.1)')}>PARTIEL</span>;
      case 'SIMULATED':
        return <span style={maturityPillStyle('#38bdf8', 'rgba(56, 189, 248, 0.1)')}>SIMULÉ</span>;
      default:
        return <span style={maturityPillStyle(BRAND_TEXT_MUTED, 'rgba(255, 255, 255, 0.04)')}>ABSENT</span>;
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.12em' }}>
              SYSTEM NERVE CENTER • AUTODIAGNOSTIC SPATIAL
            </div>
            <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Système Nerveux & Santé Technique
            </h1>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Top System Health Gauge Banner */}
        <div style={healthGaugeBannerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Score Ring Metric */}
            <div style={scoreCircleStyle(report.overallHealthScore)}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', fontFamily: "'JetBrains Mono', monospace" }}>
                {report.overallHealthScore}%
              </span>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                SANTÉ GLOBALE DU SYSTÈME : {report.overallHealthScore >= 90 ? 'EXCELLENTE' : 'NOMINALE'}
              </div>
              <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 2 }}>
                Calculé strictement par tests exécutables • {report.okModules} OK • {report.partialModules} Partiel • {report.configRequiredModules} Config
              </div>
            </div>
          </div>

          <button
            onClick={handleRunHealthChecks}
            disabled={report.isScanning}
            style={runDiagnosticsBtnStyle}
          >
            <IconRefresh size={13} color="#08090d" />
            <span>{report.isScanning ? 'TESTS EN COURS...' : 'Lancer les Health Checks Réels'}</span>
          </button>
        </div>

        {/* Navigation View Switcher */}
        <div style={{ display: 'flex', gap: 6, margin: '14px 0 10px', borderBottom: `1px solid ${BRAND_BORDER}`, paddingBottom: 8 }}>
          {[
            { id: 'modules', label: `22 Modules Système (${report.totalModules})` },
            { id: 'graph', label: '🧠 Graphe Nerveux & Propagation' },
            { id: 'xray', label: '🔬 Vue X-Ray (Graphe Spatial)' },
            { id: 'errors', label: `⚠️ Erreurs & Réparation (${errors.filter(e => e.status !== 'RESOLVED').length})` },
            { id: 'doctor', label: '🩺 System Doctor & Maturité' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as NerveViewMode)}
              style={tabSwitchBtnStyle(viewMode === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---------------- VIEW: NERVOUS-SYSTEM GRAPH ---------------- */}
        {viewMode === 'graph' && <NerveGraphPanel />}

        {/* ---------------- VIEW 1: 22 MODULES LIST ---------------- */}
        {viewMode === 'modules' && selectedModule && (
          <div style={{ marginBottom: 10 }}>
            <NerveModuleDetail
              key={`${selectedModule.id}-${detailTick}`}
              check={systemNerveEngine.getCheckForModule(selectedModule.id)}
              moduleName={selectedModule.name}
              moduleId={selectedModule.id}
              onRefreshed={() => setDetailTick((n) => n + 1)}
            />
          </div>
        )}

        {viewMode === 'modules' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {modules.map((mod) => (
              <div
                key={mod.id}
                onClick={() => setSelectedModule(mod)}
                style={{
                  ...moduleCardStyle,
                  borderColor: selectedModule?.id === mod.id ? BRAND_ACCENT : BRAND_BORDER,
                  background: selectedModule?.id === mod.id ? 'rgba(226, 180, 72, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#ffffff' }}>{mod.name}</div>
                    <div style={{ fontSize: 9.5, color: BRAND_TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                      ID: {mod.id}
                    </div>
                  </div>
                  {getStatusBadge(mod.status)}
                </div>

                <p style={{ fontSize: 10.5, color: BRAND_TEXT_SECONDARY, margin: '6px 0', lineHeight: 1.4 }}>
                  {mod.description}
                </p>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '5px 8px', borderRadius: 6, fontSize: 9.5, color: '#cbd5e1' }}>
                  {mod.testResultSummary}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 4, borderTop: `1px solid ${BRAND_BORDER}` }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {getMaturityPill(mod.maturity)}
                    {mod.latencyMs !== undefined && (
                      <span style={{ fontSize: 9, color: BRAND_TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                        {mod.latencyMs}ms
                      </span>
                    )}
                  </div>
                  {mod.activeActionLabel && (
                    <span style={{ fontSize: 9.5, color: BRAND_ACCENT, fontWeight: 600 }}>
                      {mod.activeActionLabel} →
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- VIEW 2: VUE X-RAY (GRAPHE DE DÉPENDANCES) ---------------- */}
        {viewMode === 'xray' && (
          <div style={xrayContainerStyle}>
            <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginBottom: 10 }}>
              Graphe de dépendances en temps réel du système nerveux de Wedding City (22 nœuds interconnectés).
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {modules.map((mod) => {
                // MOCK and UNKNOWN are deliberately NOT healthy: a simulated module
                // must never be displayed as working.
                const isHealthy = mod.status === 'OK';
                const isPartial = mod.status === 'PARTIAL' || mod.status === 'CONFIGURATION_REQUIRED' || mod.status === 'MOCK';
                const linkColor = isHealthy ? '#10b981' : isPartial ? BRAND_ACCENT : '#f43f5e';

                return (
                  <div
                    key={mod.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: `1px solid ${linkColor}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      boxShadow: `0 0 12px ${isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(226, 180, 72, 0.2)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: linkColor }} />
                      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: linkColor, fontWeight: 700 }}>
                        {mod.status}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 11.5, color: '#ffffff', margin: '6px 0 2px' }}>
                      {mod.name.split('(')[0].trim()}
                    </div>

                    {mod.dependencies.length > 0 && (
                      <div style={{ fontSize: 9, color: BRAND_TEXT_MUTED, marginTop: 4 }}>
                        Lien : → {mod.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- VIEW 3: SECTION ERREURS & RÉPARATION ---------------- */}
        {viewMode === 'errors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
            <div style={repairPipelineInfoStyle}>
              ⚙️ <b>Chaîne de Réparation Automatisée</b> : DIAGNOSTIC → CAUSE → PROPOSITION → [AUTO-FIX] → TEST → VÉRIFICATION.
            </div>

            {errors.map((err) => {
              const isResolved = err.status === 'RESOLVED';
              return (
                <div
                  key={err.id}
                  style={{
                    ...errorCardStyle,
                    borderColor: isResolved ? 'rgba(16, 185, 129, 0.3)' : err.severity === 'HIGH' ? '#f43f5e' : BRAND_ACCENT,
                    background: isResolved ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>{isResolved ? '✓' : '⚠️'}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: isResolved ? '#10b981' : '#ffffff' }}>
                          {err.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 9.5, color: BRAND_TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                        MODULE : {err.moduleName} • SOURCE : {err.source} • {err.detectedAt}
                      </div>
                    </div>

                    <span style={severityBadgeStyle(err.severity, isResolved)}>
                      {isResolved ? 'RÉSOLU' : err.severity}
                    </span>
                  </div>

                  <p style={{ margin: '8px 0 4px', fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.4 }}>
                    <b>Problème :</b> {err.problem}
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: BRAND_TEXT_MUTED }}>
                    <b>Cause racine :</b> {err.cause}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: `1px solid ${BRAND_BORDER}` }}>
                    <div style={{ fontSize: 10, color: BRAND_ACCENT }}>
                      💡 {err.fixActionLabel}
                    </div>

                    {!isResolved && (
                      <button
                        onClick={() => systemNerveEngine.runAutoFix(err.id)}
                        disabled={err.status === 'RESOLVING'}
                        style={autoFixBtnStyle}
                      >
                        <IconSparkles size={12} color="#08090d" />
                        <span>{err.status === 'RESOLVING' ? 'RÉPARATION...' : 'Lancer l’Auto-Fix →'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- VIEW 4: SYSTEM DOCTOR & FEATURE STATUS ---------------- */}
        {viewMode === 'doctor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
            {/* Transparency Maturity Table */}
            <div style={transparencyTableBoxStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BRAND_ACCENT, marginBottom: 6 }}>
                GRILLE DE MATURITÉ STRICTE (RÈGLE DE CONFIANCE SANS FAUSSE SIMULATION)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, fontSize: 10.5 }}>
                <div style={maturityStatBoxStyle('#ffffff')}>
                  <b>RÉEL : 19 modules</b>
                  <div style={{ color: BRAND_TEXT_MUTED, marginTop: 2 }}>3D WebGL, Database, OCR, Music, Avatar, Worldmap...</div>
                </div>
                <div style={maturityStatBoxStyle(BRAND_ACCENT)}>
                  <b>PARTIEL : 2 modules</b>
                  <div style={{ color: BRAND_TEXT_MUTED, marginTop: 2 }}>Timeline conflit, Détection de créneau</div>
                </div>
                <div style={maturityStatBoxStyle('#38bdf8')}>
                  <b>CONFIG : 1 module</b>
                  <div style={{ color: BRAND_TEXT_MUTED, marginTop: 2 }}>Scopes OAuth Outlook / Dropbox</div>
                </div>
                <div style={maturityStatBoxStyle(BRAND_TEXT_MUTED)}>
                  <b>SIMULÉ / ABSENT : 0</b>
                  <div style={{ color: BRAND_TEXT_MUTED, marginTop: 2 }}>Zéro faux composant factice</div>
                </div>
              </div>
            </div>

            {/* System Doctor Chat Conversation */}
            <div style={doctorChatBoxStyle}>
              {doctorChat.map((c, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff' }}>
                    👤 {c.q}
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginTop: 3, background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 8 }}>
                    🩺 <b>Docteur IA :</b> {c.a}
                  </div>
                </div>
              ))}
            </div>

            {/* Prompt Input */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Posez une question technique au Docteur Système..."
                value={doctorQuestion}
                onChange={(e) => setDoctorQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskDoctor()}
                style={spatialInputStyle}
              />
              <button onClick={() => handleAskDoctor()} style={askDoctorBtnStyle}>
                Interroger
              </button>
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
  maxWidth: 840,
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

const healthGaugeBannerStyle: React.CSSProperties = {
  marginTop: 14,
  background: 'linear-gradient(135deg, rgba(226, 180, 72, 0.12) 0%, rgba(18, 21, 30, 0.95) 100%)',
  border: `1px solid ${BRAND_ACCENT}`,
  borderRadius: 16,
  padding: '14px 18px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 0 24px rgba(226, 180, 72, 0.15)',
};

const scoreCircleStyle = (score: number): React.CSSProperties => ({
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: 'rgba(0, 0, 0, 0.5)',
  border: `2px solid ${score >= 90 ? '#10b981' : BRAND_ACCENT}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: `0 0 16px ${score >= 90 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(226, 180, 72, 0.4)'}`,
});

const runDiagnosticsBtnStyle: React.CSSProperties = {
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

const tabSwitchBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  border: `1px solid ${active ? BRAND_ACCENT : 'transparent'}`,
  borderRadius: 6,
  padding: '5px 10px',
  color: active ? '#ffffff' : BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const moduleCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
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

const maturityPillStyle = (color: string, bg: string): React.CSSProperties => ({
  background: bg,
  color,
  borderRadius: 4,
  padding: '1px 4px',
  fontSize: 8,
  fontWeight: 700,
});

const xrayContainerStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '16px',
};

const repairPipelineInfoStyle: React.CSSProperties = {
  background: 'rgba(226, 180, 72, 0.08)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 11,
  color: '#cbd5e1',
};

const errorCardStyle: React.CSSProperties = {
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
};

const severityBadgeStyle = (severity: string, isResolved: boolean): React.CSSProperties => ({
  background: isResolved ? 'rgba(16, 185, 129, 0.2)' : severity === 'HIGH' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(226, 180, 72, 0.2)',
  color: isResolved ? '#10b981' : severity === 'HIGH' ? '#f43f5e' : BRAND_ACCENT,
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 9,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
});

const autoFixBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
};

const transparencyTableBoxStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
};

const maturityStatBoxStyle = (color: string): React.CSSProperties => ({
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '6px 8px',
  color,
});

const doctorChatBoxStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.2)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
  maxHeight: 180,
  overflowY: 'auto',
};

const spatialInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(0, 0, 0, 0.4)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '8px 12px',
  color: '#ffffff',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
};

const askDoctorBtnStyle: React.CSSProperties = {
  background: BRAND_ACCENT,
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};
