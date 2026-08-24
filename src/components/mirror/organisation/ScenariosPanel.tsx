import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';

// ---------------------------------------------------------------------------
// SCÉNARIOS — two rails, one truth.
// ---------------------------------------------------------------------------
// The top rail is the day as it stands. The bottom rail is the branch. What
// differs is highlighted, written out in minutes, and applied only when the
// couple says so — entirely, or one line at a time.
//
// This surface owns NO arithmetic: every calculation comes from the store
// (createScenario, scenarioShiftPhase, scenarioDiff, applyScenario), which is
// the same engine the real timeline uses.
// ---------------------------------------------------------------------------

const DAY_START = 7;
const DAY_END = 27;

const clock = (h: number) => {
  const t = Math.round(h * 60);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export function ScenariosPanel() {
  const store = weddingStore;
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const scenarios = store.scenarios;
  const active = scenarios.find((s) => s.id === store.activeScenarioId) ?? null;
  const diff = active ? store.scenarioDiff(active.id) : [];
  const changed = diff.filter((d) => d.changed);

  const railFor = (phases: { id: string; name: string; startHour: number; endHour: number }[], changedIds: Set<string>) => {
    const span = DAY_END - DAY_START;
    return (
      <div style={rail} data-scenario="rail">
        {phases.map((p) => {
          const left = ((p.startHour - DAY_START) / span) * 100;
          const width = Math.max(((p.endHour - p.startHour) / span) * 100, 6);
          return (
            <span
              key={p.id}
              style={{
                ...railBlock,
                left: `${left}%`,
                width: `${width}%`,
                background: changedIds.has(p.id) ? '#f6f5f3' : 'rgba(246,245,243,0.16)',
                color: changedIds.has(p.id) ? '#08090b' : '#f6f5f3',
                borderColor: changedIds.has(p.id) ? '#f6f5f3' : 'rgba(246,245,243,0.24)',
              }}
              title={`${p.name} · ${clock(p.startHour)} → ${clock(p.endHour)}`}
            >
              <span style={railHour}>{clock(p.startHour)}</span>
              <span style={railName}>{p.name}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const changedIds = new Set(changed.map((c) => c.phaseId));

  return (
    <div data-scenario="panel">
      <p style={muted}>
        Un scénario est une journée parallèle : la pluie, un retard, une salle
        changée. Rien n’est modifié dans votre journée tant que vous ne
        l’appliquez pas.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !draft.trim()) return;
            if (store.createScenario(draft.trim())) { setDraft(''); setNote(null); }
          }}
          placeholder="Nom du scénario — « Pluie », « Retard +30 min »…"
          style={{ ...field, flex: '1 1 240px' }}
          data-scenario="name"
        />
        <button
          onClick={() => {
            if (!draft.trim()) return;
            if (store.phases.length === 0) { setNote('Il faut au moins un moment pour brancher un scénario.'); return; }
            if (store.createScenario(draft.trim())) { setDraft(''); setNote(null); }
          }}
          style={btn}
          data-scenario="create"
        >
          Créer un scénario
        </button>
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => store.setActiveScenario(s.id === store.activeScenarioId ? null : s.id)}
            style={{
              ...chip,
              background: s.id === store.activeScenarioId ? '#f6f5f3' : 'transparent',
              color: s.id === store.activeScenarioId ? '#08090b' : '#f6f5f3',
            }}
            data-scenario="tab"
          >
            {s.name}
          </button>
        ))}
      </div>
      {note && <p style={{ ...muted, marginTop: 10 }} data-scenario="note">{note}</p>}

      {active && (
        <div style={{ marginTop: 22 }} data-scenario="compare">
          {/* ---- the two rails ---- */}
          <div style={railLabel}>Votre journée</div>
          {railFor(store.phases, new Set())}
          <div style={{ ...railLabel, marginTop: 18 }}>
            {active.name}
            <span style={{ ...muted, marginLeft: 10 }}>
              {changed.length === 0
                ? 'identique pour l’instant'
                : `${changed.length} moment${changed.length > 1 ? 's' : ''} différent${changed.length > 1 ? 's' : ''}`}
            </span>
          </div>
          {railFor(active.phases, changedIds)}

          {/* ---- what to change inside the branch ---- */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
            {active.phases.map((p) => (
              <span key={p.id} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <button
                  onClick={() => store.scenarioShiftPhase(active.id, p.id, 0.5, true)}
                  style={smallBtn}
                  data-scenario="shift"
                  data-phase-id={p.id}
                  title={`Décaler ${p.name} et la suite de 30 minutes dans ce scénario`}
                >
                  {p.name} +30 min
                </button>
              </span>
            ))}
          </div>

          {/* ---- the difference, in words ---- */}
          {changed.length > 0 && (
            <ul style={list} data-scenario="diff">
              {changed.map((c) => (
                <li key={c.phaseId} style={listItem}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={mono}>
                    {clock(c.fromStart)} → {clock(c.toStart)}
                    {c.deltaMinutes !== 0 && ` (${c.deltaMinutes > 0 ? '+' : '−'}${Math.abs(c.deltaMinutes)} min)`}
                  </span>
                  <button
                    onClick={() => {
                      const r = store.applyScenario(active.id, [c.phaseId]);
                      setNote(r ? `« ${c.name} » appliqué à votre journée.` : 'Cette ligne ne peut pas être appliquée.');
                    }}
                    style={smallBtn}
                    data-scenario="apply-one"
                  >
                    Appliquer cette ligne
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
            <button
              onClick={() => {
                const r = store.applyScenario(active.id);
                setNote(r ? `${r.applied.length} moment(s) appliqué(s) à votre journée.` : 'Ce scénario ne peut pas être appliqué tel quel.');
              }}
              style={btn}
              data-scenario="apply-all"
            >
              Appliquer tout le scénario
            </button>
            <button
              onClick={() => { store.discardScenario(active.id); setNote('Scénario abandonné — votre journée n’a pas bougé.'); }}
              style={ghost}
              data-scenario="discard"
            >
              Abandonner
            </button>
          </div>
        </div>
      )}

      {scenarios.length === 0 && (
        <p style={{ ...muted, marginTop: 14 }} data-scenario="empty">
          Aucun scénario. Nommez-en un pour explorer une variante sans toucher à
          votre journée.
        </p>
      )}
    </div>
  );
}

// --- styles ------------------------------------------------------------------

const muted: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: 'rgba(246,245,243,0.66)', lineHeight: 1.6, margin: 0,
};

const mono: React.CSSProperties = { fontFamily: typography.family.mono, fontSize: 12, color: '#f6f5f3' };

const field: React.CSSProperties = {
  background: '#101114', color: '#f6f5f3', border: '1px solid rgba(246,245,243,0.18)',
  borderRadius: 4, padding: '10px 12px', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans, outline: 'none',
};

const btn: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer', background: '#f6f5f3', color: '#08090b',
  borderRadius: 999, padding: '10px 18px', fontSize: typography.editorial.caption,
  fontWeight: typography.weight.semibold, fontFamily: typography.family.sans,
};

const smallBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '7px 13px', fontSize: 12, fontFamily: typography.family.sans, whiteSpace: 'nowrap',
};

const ghost: React.CSSProperties = { ...smallBtn, padding: '10px 18px' };

const chip: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', border: '1px solid rgba(246,245,243,0.28)',
  borderRadius: 999, padding: '9px 16px', fontSize: 12, fontFamily: typography.family.sans,
};

const railLabel: React.CSSProperties = {
  fontSize: typography.editorial.micro, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: 'rgba(246,245,243,0.6)', marginBottom: 8, fontWeight: typography.weight.bold,
};

const rail: React.CSSProperties = {
  position: 'relative', height: 64, borderTop: '1px solid rgba(246,245,243,0.14)',
  borderBottom: '1px solid rgba(246,245,243,0.14)',
};

const railBlock: React.CSSProperties = {
  position: 'absolute', top: 8, bottom: 8, borderRadius: 3,
  border: '1px solid rgba(246,245,243,0.24)', padding: '6px 8px',
  overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2,
  transition: 'left 400ms cubic-bezier(.2,.7,.2,1), background 260ms ease',
};

const railHour: React.CSSProperties = { fontFamily: typography.family.mono, fontSize: 11, fontWeight: 700 };
const railName: React.CSSProperties = { fontSize: 11, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' };

const list: React.CSSProperties = { listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 10 };

const listItem: React.CSSProperties = {
  display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
  paddingLeft: 12, borderLeft: '2px solid #f6f5f3',
  fontSize: typography.editorial.caption,
};
