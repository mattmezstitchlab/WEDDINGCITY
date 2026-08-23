import { useState } from 'react';
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/brand';
import { HealthCheck, ProbeStatus, RepairOutcome, PROBE_STATUS_GLYPH, PROBE_STATUS_LABEL } from '../../types/health';
import { systemNerveEngine } from '../../game/systemNerveEngine';

// ---------------------------------------------------------------------------
// Module detail panel.
//
// Surfaces the FULL HealthCheck contract — status, lastCheck, dependencies,
// errors, warnings, evidence, repairable, repairAction — and presents each
// issue as CAUSE → IMPACT → SOLUTION → ACTION.
//
// The three actions are deliberately distinct:
//   [ANALYSER]  re-runs the probe and shows the evidence it collected
//   [RETESTER]  re-runs the probe to confirm a status is still current
//   [RÉPARER]   runs the repair AND re-measures; the verdict comes from the
//               re-measurement, never from the action claiming success.
//
// Styling reuses the existing BRAND_* tokens only — no new visual identity.
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<ProbeStatus, string> = {
  VERIFIED: '#10b981',
  PARTIAL: BRAND_ACCENT,
  MOCK: '#eab308',
  ERROR: '#f43f5e',
  NOT_IMPLEMENTED: BRAND_TEXT_MUTED,
  UNKNOWN: '#64748b',
};

interface Props {
  check: HealthCheck | null;
  moduleName: string;
  /** Legacy module id, when the selected card has no probe. */
  moduleId: string;
  onRefreshed?: () => void;
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'jamais';
  const d = new Date(iso);
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 5) return 'à l’instant';
  if (secs < 60) return `il y a ${secs} s`;
  if (secs < 3600) return `il y a ${Math.round(secs / 60)} min`;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function NerveModuleDetail({ check, moduleName, moduleId, onRefreshed }: Props) {
  const [busy, setBusy] = useState<null | 'analyse' | 'retest' | 'repair'>(null);
  const [outcome, setOutcome] = useState<RepairOutcome | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  if (!check) {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: 11, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
          {moduleName}
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: BRAND_TEXT_SECONDARY, lineHeight: 1.6 }}>
          ⚫ <strong>UNKNOWN</strong> — aucune sonde ne mesure ce module ({moduleId}).
          Son état réel n’est pas connu et n’est volontairement pas présenté comme fonctionnel.
        </div>
      </div>
    );
  }

  const run = async (mode: 'analyse' | 'retest') => {
    setBusy(mode);
    setOutcome(null);
    await systemNerveEngine.runSingleProbe(check.id);
    setLastAction(mode === 'analyse' ? 'Analyse terminée' : 'Nouveau test effectué');
    setBusy(null);
    onRefreshed?.();
  };

  const repair = async () => {
    if (!check.repairAction) return;
    setBusy('repair');
    setLastAction(null);
    const result = await systemNerveEngine.repairFromProbe(check.id, check.repairAction.id);
    setOutcome(result);
    setBusy(null);
    onRefreshed?.();
  };

  const color = STATUS_COLOR[check.status];
  const issues = [
    ...check.errors.map((e) => ({ ...e, severity: 'error' as const })),
    ...check.warnings.map((w) => ({ ...w, severity: 'warning' as const })),
  ];

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: BRAND_TEXT_PRIMARY }}>{check.name}</div>
          <div style={{ fontSize: 9.5, color: BRAND_TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            SONDE: {check.id} · CATÉGORIE: {check.category}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
          color, background: `${color}22`, border: `1px solid ${color}55`, whiteSpace: 'nowrap',
        }}>
          {PROBE_STATUS_GLYPH[check.status]} {PROBE_STATUS_LABEL[check.status]}
        </span>
      </div>

      <p style={{ margin: '10px 0', fontSize: 11.5, color: BRAND_TEXT_SECONDARY, lineHeight: 1.55 }}>
        {check.summary}
      </p>

      {/* Contract fields */}
      <div style={metaGridStyle}>
        <Meta label="LAST CHECK" value={formatWhen(check.lastCheck)} />
        <Meta label="DURÉE" value={check.durationMs !== undefined ? `${check.durationMs} ms` : '—'} />
        <Meta label="ERRORS" value={String(check.errors.length)} tone={check.errors.length ? '#f43f5e' : undefined} />
        <Meta label="WARNINGS" value={String(check.warnings.length)} tone={check.warnings.length ? BRAND_ACCENT : undefined} />
        <Meta label="REPAIRABLE" value={check.repairable ? 'oui' : 'non'} />
        <Meta label="DEPENDENCIES" value={check.dependencies.length ? check.dependencies.join(', ') : 'aucune'} />
      </div>

      {/* EVIDENCE */}
      <Section title={`EVIDENCE (${check.evidence.length})`}>
        {check.evidence.length === 0 ? (
          <div style={{ fontSize: 10.5, color: BRAND_TEXT_MUTED }}>
            Aucune preuve collectée — c’est pourquoi ce module ne peut pas être déclaré vérifié.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 3 }}>
            {check.evidence.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 10.5, padding: '3px 0' }}>
                <span style={{ color: BRAND_TEXT_MUTED }}>{e.label}</span>
                <span style={{ color: '#cbd5e1', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{e.value}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* CAUSE → IMPACT → SOLUTION → ACTION */}
      {issues.length > 0 && (
        <Section title={`DIAGNOSTIC (${issues.length})`}>
          <div style={{ display: 'grid', gap: 8 }}>
            {issues.map((issue, i) => {
              const tone = issue.severity === 'error' ? '#f43f5e' : BRAND_ACCENT;
              return (
                <div key={i} style={{ border: `1px solid ${tone}33`, background: `${tone}0d`, borderRadius: 8, padding: '9px 11px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tone, fontFamily: "'JetBrains Mono', monospace" }}>
                    {issue.severity === 'error' ? '🔴' : '🟠'} {issue.code}
                  </div>
                  <div style={{ fontSize: 11, color: BRAND_TEXT_PRIMARY, margin: '5px 0 7px', lineHeight: 1.45 }}>
                    {issue.message}
                  </div>
                  <Line label="CAUSE" value={issue.cause} />
                  <Line label="IMPACT" value={issue.impact} />
                  <Line label="SOLUTION" value={issue.solution} />
                  <Line
                    label="ACTION"
                    value={check.repairable && check.repairAction
                      ? `${check.repairAction.label} — ${check.repairAction.description}`
                      : 'Aucune réparation automatique disponible : correction manuelle requise.'}
                  />
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => run('analyse')} disabled={busy !== null} style={actionBtnStyle(false, busy !== null)}>
          {busy === 'analyse' ? 'ANALYSE…' : '[ ANALYSER ]'}
        </button>
        <button onClick={() => run('retest')} disabled={busy !== null} style={actionBtnStyle(false, busy !== null)}>
          {busy === 'retest' ? 'TEST…' : '[ RETESTER ]'}
        </button>
        <button
          onClick={repair}
          disabled={busy !== null || !check.repairable}
          title={check.repairable ? check.repairAction?.description : 'Aucune réparation automatique pour ce module'}
          style={actionBtnStyle(true, busy !== null || !check.repairable)}
        >
          {busy === 'repair' ? 'RÉPARATION…' : '[ RÉPARER ]'}
        </button>
      </div>

      {lastAction && !outcome && (
        <div style={{ marginTop: 9, fontSize: 10.5, color: BRAND_TEXT_SECONDARY }}>
          ✓ {lastAction} — {check.evidence.length} preuve(s) relevées à {formatWhen(check.lastCheck)}.
        </div>
      )}

      {/* Repair verdict — decided by re-measurement, not by the action */}
      {outcome && (
        <div style={{
          marginTop: 10, padding: '9px 11px', borderRadius: 8, fontSize: 10.8, lineHeight: 1.5,
          border: `1px solid ${outcome.verified ? '#10b98155' : '#f43f5e55'}`,
          background: outcome.verified ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
          color: outcome.verified ? '#a7f3d0' : '#fecdd3',
        }}>
          <strong>{outcome.verified ? '✓ RÉPARATION VÉRIFIÉE' : '✗ RÉPARATION NON CONFIRMÉE'}</strong>
          <div style={{ marginTop: 4 }}>{outcome.message}</div>
          <div style={{ marginTop: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, opacity: 0.85 }}>
            exécutée: {String(outcome.executed)} · vérifiée: {String(outcome.verified)} ·
            {' '}{outcome.beforeStatus} → {outcome.afterStatus} ·
            {' '}erreurs {outcome.beforeErrors} → {outcome.afterErrors}
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 8.5, color: BRAND_TEXT_MUTED, letterSpacing: '0.09em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: tone ?? '#cbd5e1', marginTop: 2, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BRAND_BORDER}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: BRAND_TEXT_MUTED, letterSpacing: '0.1em', marginBottom: 7 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 7, fontSize: 10.3, lineHeight: 1.45, marginTop: 3 }}>
      <span style={{ minWidth: 62, color: BRAND_TEXT_MUTED, fontWeight: 700, fontSize: 9, letterSpacing: '0.07em', paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ color: BRAND_TEXT_SECONDARY, flex: 1 }}>{value}</span>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '13px 15px',
  background: 'rgba(255, 255, 255, 0.02)',
};

const metaGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 8,
  padding: '9px 0',
  borderTop: `1px solid ${BRAND_BORDER}`,
  borderBottom: `1px solid ${BRAND_BORDER}`,
};

const actionBtnStyle = (primary: boolean, disabled: boolean): React.CSSProperties => ({
  padding: '7px 12px',
  borderRadius: 8,
  fontSize: 10,
  fontWeight: 700,
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: '0.05em',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
  border: primary ? 'none' : `1px solid ${BRAND_BORDER}`,
  background: primary ? BRAND_ACCENT : 'transparent',
  color: primary ? '#08090d' : BRAND_TEXT_PRIMARY,
});
