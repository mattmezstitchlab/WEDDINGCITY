import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { SeatingPlan } from './SeatingPlan';
import { CrewPanel } from './CrewPanel';
import { IconAlert, IconCheck } from '../../ui/Icons';

// ---------------------------------------------------------------------------
// ORGANISATION — the part of the day that is not an hour.
// ---------------------------------------------------------------------------
// Plan de table, prestataires, documents, and the LAB: what is missing and
// what contradicts itself. All of it reads the same store as the timeline —
// no second source of truth, no duplicated entity list.
// ---------------------------------------------------------------------------

export function OrganisationSection() {
  const store = weddingStore;
  const [findings, setFindings] = useState<ReturnType<typeof store.projectFindings> | null>(null);

  const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  const documentsByMoment = store.phases
    .map((p) => ({ phase: p, media: store.media.filter((m) => m.ownerKind === 'event' && m.ownerId === p.id) }))
    .filter((x) => x.media.length > 0);
  const loose = store.media.filter((m) => m.ownerKind !== 'event');

  return (
    <section id="organisation" style={section} aria-label="Organisation">
      <h2 style={h2}>Organisation</h2>

      {/* ---- LAB: read the project, say what it lacks ---- */}
      <div style={block}>
        <h3 style={h3}>Lab · l’état réel du projet</h3>
        <p style={muted}>
          Le Lab lit vos données — il n’imagine rien et n’appelle aucun service
          extérieur. Il dit ce qui manque, ce qui se contredit, ce qui reste à
          confirmer.
        </p>
        <button onClick={() => setFindings(store.projectFindings())} style={btn} data-org="lab-run">
          Analyser ma journée
        </button>
        {findings && (
          <ul style={list} data-org="lab-findings">
            {findings.map((f, i) => (
              <li key={i} style={{ ...listItem, borderLeft: `2px solid ${f.level === 'conflict' ? '#e0736a' : f.level === 'ok' ? '#7fb08a' : 'rgba(246,245,243,0.3)'}` }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                  {f.level === 'conflict'
                    ? <IconAlert size={13} color="currentColor" />
                    : f.level === 'ok'
                      ? <IconCheck size={13} color="currentColor" />
                      : null}
                  {f.title}
                </span>
                <span style={muted}>{f.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- those who make the moment happen ---- */}
      <div style={block} id="equipe">
        <h3 style={h3}>Artistes &amp; techniciens</h3>
        <CrewPanel />
      </div>

      {/* Scenarios are driven from the Timeline and its SimulationBar. This
          section only acknowledges the existing branches; it is not a second
          scenario editor. */}
      <div style={block} id="scenarios">
        <h3 style={h3}>Scénarios</h3>
        <p style={muted}>
          Les variantes se créent depuis « Et si… » ou depuis le moment concerné,
          puis restent comparables sans quitter la journée.
          {store.scenarios.length > 0
            ? ` ${store.scenarios.length} scénario${store.scenarios.length > 1 ? 's' : ''} existe${store.scenarios.length > 1 ? 'nt' : ''}.`
            : ' Aucun scénario pour l’instant.'}
        </p>
      </div>

      {/* ---- seating ---- */}
      <div style={block}>
        <h3 style={h3}>Plan de table</h3>
        <SeatingPlan />
      </div>

      {/* ---- vendors, across the day ---- */}
      <div style={block}>
        <h3 style={h3}>Prestataires</h3>
        {store.vendors.length === 0 ? (
          <p style={muted}>Aucun prestataire n’est encore rattaché à ce mariage.</p>
        ) : (
          <ul style={list}>
            {store.vendors.map((v) => {
              const covers = store.phases
                .filter((p) => (p.vendorIds ?? []).includes(v.id))
                .sort((a, b) => a.startHour - b.startHour);
              return (
                <li key={v.id} style={listItem} data-org="vendor">
                  <span style={{ fontWeight: 600 }}>{v.companyName} <span style={muted}>· {v.category}</span></span>
                  <span style={muted}>
                    {covers.length > 0
                      ? `${clock(covers[0].startHour)} → ${clock(covers[covers.length - 1].endHour)} · ${covers.map((c) => c.name).join(', ')}`
                      : 'aucun moment couvert — ouvrez un moment pour l’y rattacher'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---- documents, by moment ---- */}
      <div style={block}>
        <h3 style={h3}>Documents</h3>
        {documentsByMoment.length === 0 && loose.length === 0 ? (
          <p style={muted}>
            Aucun document n’a encore été importé. Un fichier s’importe depuis le
            moment qu’il concerne — c’est là qu’il servira.
          </p>
        ) : (
          <ul style={list}>
            {documentsByMoment.map(({ phase, media }) => (
              <li key={phase.id} style={listItem} data-org="documents-moment">
                <span style={{ fontWeight: 600 }}>{clock(phase.startHour)} · {phase.name}</span>
                <span style={muted}>{media.map((m) => m.title || m.fileName || 'document').join(' · ')}</span>
              </li>
            ))}
            {loose.length > 0 && (
              <li style={listItem}>
                <span style={{ fontWeight: 600 }}>Non rattachés</span>
                <span style={muted}>{loose.map((m) => m.title || m.fileName || 'document').join(' · ')}</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

const section: React.CSSProperties = {
  padding: 'clamp(40px, 7vw, 90px) clamp(18px, 5vw, 64px)',
  borderTop: '1px solid rgba(246,245,243,0.12)',
  background: '#08090b', color: '#f6f5f3',
};

const h2: React.CSSProperties = {
  margin: 0, fontSize: 'clamp(26px, 4.6vw, 56px)', letterSpacing: '-0.035em',
  fontWeight: typography.weight.semibold, lineHeight: 1.02,
};

const h3: React.CSSProperties = {
  margin: '0 0 10px', fontSize: 'clamp(15px, 1.5vw, 19px)',
  letterSpacing: '0.02em', fontWeight: typography.weight.semibold,
};

const block: React.CSSProperties = { marginTop: 'clamp(26px, 4vw, 48px)', maxWidth: 1080 };

const muted: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: 'rgba(246,245,243,0.66)', lineHeight: 1.6,
};

const btn: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer', background: '#f6f5f3', color: '#08090b',
  borderRadius: 999, padding: '10px 18px', marginTop: 10,
  fontSize: typography.editorial.caption, fontWeight: typography.weight.semibold,
  fontFamily: typography.family.sans,
};

const list: React.CSSProperties = { listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 10 };

const listItem: React.CSSProperties = {
  display: 'grid', gap: 4, paddingLeft: 12,
  borderLeft: '2px solid rgba(246,245,243,0.18)',
  fontSize: typography.editorial.caption,
};
