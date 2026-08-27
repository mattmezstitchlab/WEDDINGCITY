import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { EVENT_TYPES, eventType } from '../../../design/eventTypes';
import './timeline.css';

// ---------------------------------------------------------------------------
// THE EVENT SURFACE — what belongs to the whole day, and nothing else.
// ---------------------------------------------------------------------------
// Name, nature, date, main place, expected headcount. No moment list, no
// calendar, no plan B: those already live on the film, the landing Agenda,
// and Organisation. Visually distinct from the moment surface (warm paper
// band under the day head, not the dark hub shell of a moment).
// ---------------------------------------------------------------------------

export function EventPanel({ onClose, inline = false }: { onClose: () => void; inline?: boolean }) {
  const store = weddingStore;
  const project = store.currentProject;
  const schema = eventType(project.eventTypeId);

  return (
    <div
      className={`wc-event-surface${inline ? ' is-inline' : ''}`}
      role="region"
      aria-label="Informations de l’événement"
      data-jourj="event-panel"
      data-editor-location={inline ? 'timeline' : 'panel'}
    >
      <div className="wc-event-surface-head">
        <div>
          <div style={eyebrow}>L’événement</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6, color: '#141414' }}>
            {project.coupleNames || project.title || 'Sans titre'}
          </div>
          <p style={lead}>
            Identité de la journée entière. Chaque moment se règle sur sa propre
            carte, sur la pellicule.
          </p>
        </div>
        <button onClick={onClose} style={ghost} data-jourj="event-close">Fermer</button>
      </div>

      <div className="wc-event-surface-body">
        <Field
          label={schema.principalsLabel ?? 'Intitulé'}
          value={project.coupleNames}
          placeholder={schema.fields[0].placeholder}
          onCommit={(v) => store.updateEvent({ coupleNames: v })}
          testId="event-name"
        />
        <label style={{ display: 'grid', gap: 6, marginTop: 16 }}>
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
    <label style={{ display: 'grid', gap: 6, marginTop: 16 }}>
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

const eyebrow: React.CSSProperties = {
  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
  fontWeight: 700, color: 'rgba(20,20,20,0.48)',
};

const lead: React.CSSProperties = {
  margin: '10px 0 0', maxWidth: 520, fontSize: 13, lineHeight: 1.55,
  color: 'rgba(20,20,20,0.58)',
};

const muted: React.CSSProperties = {
  fontSize: 12, color: 'rgba(20,20,20,0.55)', lineHeight: 1.55, margin: 0,
};

const field: React.CSSProperties = {
  background: '#fff', color: '#141414', border: '1px solid rgba(20,20,20,0.16)',
  borderRadius: 4, padding: '10px 12px', fontSize: 13,
  fontFamily: typography.family.sans, outline: 'none', boxSizing: 'border-box', width: '100%',
};

const select: React.CSSProperties = { ...field, cursor: 'pointer', appearance: 'none' };

const ghost: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#141414',
  border: '1px solid rgba(20,20,20,0.22)', borderRadius: 999,
  padding: '8px 14px', fontSize: 12, fontFamily: typography.family.sans, flex: '0 0 auto',
};
