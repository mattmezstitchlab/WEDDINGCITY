import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { EVENT_TYPES, eventType } from '../../../design/eventTypes';
import { CERTAINTY } from '../../../design/certainty';
import { PanelSection } from './PanelSection';
import { formatHour } from './TimelineStudio';
import './timeline.css';

// ---------------------------------------------------------------------------
// THE EVENT PANEL — what belongs to the whole day, and nothing else.
// ---------------------------------------------------------------------------
// The right-hand panel has two contexts, one shell, one folding mechanism:
//
//   a card  → the MOMENT   (its hours, its people, its documents…)
//   the head→ the EVENT    (its name, its nature, its date, its main place)
//
// AUDITED before writing this: since the World surfaces were closed, the name,
// the date and the main place of an event were editable NOWHERE in the product
// — a couple could not fix a typo in their own date. This panel is the single
// door to those four fields; nothing here belongs to a moment, and nothing a
// moment owns is duplicated here.
// ---------------------------------------------------------------------------

export function EventPanel({ onClose }: { onClose: () => void }) {
  const store = weddingStore;
  const project = store.currentProject;
  const phases = [...store.phases].sort((a, b) => a.startHour - b.startHour);
  const schema = eventType(project.eventTypeId);
  const unconfirmed = phases.filter((p) => p.confidence && p.confidence !== 'confirmed');
  const scenarios = store.scenarios;

  return (
    <div className="wc-hub" role="dialog" aria-modal="true" aria-label="L’événement" data-jourj="event-panel">
      <div className="wc-hub-event-head">
        <div>
          <div style={eyebrow}>L’événement</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6 }}>
            {project.coupleNames || project.title}
          </div>
        </div>
        <button onClick={onClose} style={ghost} data-jourj="event-close">Fermer</button>
      </div>

      <PanelSection
        title="L’événement"
        summary={[
          schema.label,
          project.weddingDate || 'date à confirmer',
          project.locationName || 'lieu à confirmer',
        ].join(' · ')}
        defaultOpen
        testId="event"
      >
        <Field
          label={schema.principalsLabel ?? 'Intitulé'}
          value={project.coupleNames}
          placeholder={schema.fields[0].placeholder}
          onCommit={(v) => store.updateEvent({ coupleNames: v })}
          testId="event-name"
        />
        <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          <span style={eyebrow}>Nature</span>
          <select
            value={schema.id}
            onChange={(e) => store.updateEvent({ eventTypeId: e.target.value })}
            style={select}
            data-jourj="event-type"
          >
            {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <Field
          label="Date"
          value={project.weddingDate}
          placeholder="AAAA-MM-JJ"
          onCommit={(v) => store.updateEvent({ weddingDate: v })}
          testId="event-date"
          hint="Vide tant qu’elle n’est pas décidée. Rien ne sera deviné."
        />
        <Field
          label="Lieu principal"
          value={project.locationName}
          placeholder="Domaine, salle, scène…"
          onCommit={(v) => store.updateEvent({ locationName: v })}
          testId="event-place"
          hint="Le lieu d’un moment précis se règle sur ce moment, pas ici."
        />
        <Field
          label={schema.headcountLabel === 'participants' ? 'Participants attendus' : 'Personnes attendues'}
          value={project.guestCountTarget ? String(project.guestCountTarget) : ''}
          placeholder="120"
          onCommit={(v) => store.updateEvent({ guestCountTarget: Number(v) || 0 })}
          testId="event-headcount"
        />
      </PanelSection>

      <PanelSection
        title="La journée"
        summary={[
          `${phases.length} moment${phases.length > 1 ? 's' : ''}`,
          unconfirmed.length
            ? `${unconfirmed.length} horaire${unconfirmed.length > 1 ? 's' : ''} à confirmer`
            : 'tous les horaires confirmés',
        ].join(' · ')}
        testId="day"
      >
        {phases.length === 0 ? (
          <p style={muted}>Aucun moment n’est encore posé sur cette journée.</p>
        ) : (
          <>
            <p style={muted}>
              De {formatHour(phases[0].startHour)} à {formatHour(phases[phases.length - 1].endHour)}.
              Chaque moment se règle depuis sa propre carte : c’est là que vivent son
              heure, son lieu et tout ce qu’il porte.
            </p>
            <ul style={list}>
              {phases.map((p) => (
                <li key={p.id} style={line}>
                  <button
                    style={lineBtn}
                    onClick={() => { store.openMoment(p.id); onClose(); }}
                    data-jourj="event-open-moment"
                  >
                    <span style={{ fontFamily: typography.family.mono, fontSize: 12 }}>
                      {formatHour(p.startHour)}
                    </span>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.confidence && p.confidence !== 'confirmed' && (
                      <span style={{ fontSize: 10, letterSpacing: '0.14em', color: CERTAINTY[p.confidence].color }}>
                        {CERTAINTY[p.confidence].label}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanelSection>

      <PanelSection
        title="Plans B & imprévus"
        summary={scenarios.length
          ? `${scenarios.length} scénario${scenarios.length > 1 ? 's' : ''} créé${scenarios.length > 1 ? 's' : ''}`
          : 'aucun scénario'}
        testId="scenarios"
      >
        <p style={muted}>
          Un plan B est une branche de cette journée : elle se compare ligne à ligne
          et ne s’applique que si vous le décidez. Elle se crée depuis le moment
          concerné, ou depuis la propagation quand vous déplacez une heure.
        </p>
        {scenarios.length > 0 && (
          <ul style={list}>
            {scenarios.map((sc) => (
              <li key={sc.id} style={line}>
                <span style={{ fontWeight: 600 }}>{sc.name}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          style={{ ...linkBtn, marginTop: 12 }}
          onClick={() => {
            onClose();
            document.getElementById('organisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          data-jourj="event-scenarios"
        >
          Comparer les scénarios dans Organisation
        </button>
      </PanelSection>

      <PanelSection
        title="Calendrier"
        summary={project.weddingDate
          ? `${project.weddingDate} · ${store.longDayLabel(project.weddingDate).split(' ')[0]}`
          : 'date à confirmer'}
        testId="calendar"
      >
        <p style={muted}>
          Le Calendrier situe cette journée parmi vos autres événements. Il ne
          contient aucune copie : il lit cette même journée.
        </p>
        <button
          style={{ ...linkBtn, marginTop: 12 }}
          onClick={() => {
            onClose();
            // Calendar is a navigation action, not a top-level edit surface.
            // ProductNav owns the existing modal; this event keeps the two
            // contexts decoupled without adding another store flag.
            window.dispatchEvent(new Event('wc-open-calendar'));
          }}
          data-jourj="event-calendar"
        >
          Ouvrir le calendrier
        </button>
      </PanelSection>

      <div className="wc-hub-dim" style={{ paddingBottom: 40 }}>
        <p style={muted}>
          Ce panneau ne contient que ce qui appartient à la journée entière. Tout ce
          qui appartient à un moment — heure, lieu, personnes, prestataires,
          documents, musique, budget — se règle sur ce moment.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, onCommit, testId, hint }: {
  label: string; value: string; placeholder: string;
  onCommit: (v: string) => void; testId: string; hint?: string;
}) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
      <span style={eyebrow}>{label}</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== (value ?? '')) onCommit(draft.trim()); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={field}
        data-jourj={testId}
      />
      {hint && <span style={{ ...muted, fontSize: 11 }}>{hint}</span>}
    </label>
  );
}

// --- styles ------------------------------------------------------------------

const eyebrow: React.CSSProperties = {
  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
  fontWeight: 700, color: 'rgba(246,245,243,0.6)',
};

const muted: React.CSSProperties = {
  fontSize: 12, color: 'rgba(246,245,243,0.66)', lineHeight: 1.6, margin: 0,
};

const field: React.CSSProperties = {
  background: '#101114', color: '#f6f5f3', border: '1px solid rgba(246,245,243,0.18)',
  borderRadius: 4, padding: '10px 12px', fontSize: 13,
  fontFamily: typography.family.sans, outline: 'none', boxSizing: 'border-box', width: '100%',
};

const select: React.CSSProperties = { ...field, cursor: 'pointer', appearance: 'none' };

const list: React.CSSProperties = { listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8 };

const line: React.CSSProperties = { fontSize: 12 };

const lineBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: 'inherit',
  border: 'none', padding: 0, font: 'inherit', textAlign: 'left',
  display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap',
};

const ghost: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '8px 14px', fontSize: 12, fontFamily: typography.family.sans, flex: '0 0 auto',
};

const linkBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent',
  color: '#f6f5f3', border: 'none', borderBottom: '1px solid rgba(246,245,243,0.4)',
  padding: 0, fontSize: 11, fontFamily: typography.family.sans,
};
