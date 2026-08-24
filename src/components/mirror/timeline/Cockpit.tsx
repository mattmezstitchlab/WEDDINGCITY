import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { IconAlert, IconCheck } from '../../ui/Icons';
import { formatHour } from './TimelineStudio';
import './timeline.css';

// ---------------------------------------------------------------------------
// MON GRAND JOUR — where this day stands, in four sentences.
// ---------------------------------------------------------------------------
// NOT a dashboard. No cards, no gauges, no coloured tiles: a band of type above
// the film, which one reads in three seconds and then forgets.
//
// The honest part is the number. « 68 % préparé » means nothing unless the
// ruler is visible, so the product counts EIGHT markers and shows every one of
// them with its own answer — held or not, and why. Nothing is weighted in
// secret, nothing is estimated: a marker nobody answered counts as not held.
//
// It stores nothing. Everything comes from store.readiness(), a projection.
// ---------------------------------------------------------------------------

export function Cockpit() {
  const store = weddingStore;
  const [open, setOpen] = useState(false);
  const r = store.readiness();
  const percent = Math.round((r.score / r.total) * 100);

  return (
    <section className="wc-cockpit" data-jourj="cockpit">
      <div className="wc-cockpit-row">
        {/* ---- how far ---- */}
        <button
          className="wc-cockpit-score"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          data-jourj="cockpit-score"
        >
          <span className="wc-cockpit-percent">{percent}<span className="wc-cockpit-unit">%</span></span>
          <span className="wc-cockpit-legend">
            {r.score} repère{r.score > 1 ? 's' : ''} sur {r.total}
            <span className="wc-cockpit-more">{open ? ' — masquer' : ' — lesquels ?'}</span>
          </span>
        </button>

        {/* ---- what to do next ---- */}
        <div className="wc-cockpit-cell" data-jourj="cockpit-next">
          <span className="wc-cockpit-label">La prochaine chose</span>
          <span className="wc-cockpit-value">
            {r.nextAction ? r.nextAction.title : 'Rien ne manque à cette journée.'}
          </span>
          {r.nextAction && <span className="wc-cockpit-detail">{r.nextAction.detail}</span>}
        </div>

        {/* ---- what is wrong ---- */}
        <div className="wc-cockpit-cell" data-jourj="cockpit-alerts">
          <span className="wc-cockpit-label">À vérifier</span>
          <span className="wc-cockpit-value">
            {r.conflicts === 0 ? (
              <><IconCheck size={13} color="#a9c6a2" /> Aucun conflit</>
            ) : (
              <><IconAlert size={13} color="#e0736a" /> {r.conflicts} conflit{r.conflicts > 1 ? 's' : ''}</>
            )}
          </span>
        </div>

        {/* ---- what comes next ---- */}
        <div className="wc-cockpit-cell" data-jourj="cockpit-moment">
          <span className="wc-cockpit-label">Prochain moment</span>
          <span className="wc-cockpit-value">
            {r.nextMoment
              ? `${formatHour(r.nextMoment.startHour)} · ${r.nextMoment.name}`
              : 'aucun moment posé'}
          </span>
        </div>
      </div>

      {/* THE RULER, shown on demand. A percentage nobody can audit is a claim,
          not a measure — so here are the eight markers, with their answers. */}
      {open && (
        <ul className="wc-cockpit-markers" data-jourj="cockpit-markers">
          {r.markers.map((m) => (
            <li
              key={m.id}
              className={m.done ? 'is-done' : ''}
              data-jourj="cockpit-marker"
              data-done={m.done ? 'yes' : 'no'}
            >
              {m.done
                ? <IconCheck size={13} color="#a9c6a2" />
                : <IconAlert size={13} color="rgba(246,245,243,0.4)" />}
              <span className="wc-cockpit-marker-label">{m.label}</span>
              <span className="wc-cockpit-marker-detail">{m.detail}</span>
            </li>
          ))}
          <li className="wc-cockpit-rule" data-jourj="cockpit-rule">
            Ces huit repères sont toute la règle : aucun n’est pondéré, aucun n’est
            deviné. Un repère sans réponse compte comme non tenu.
          </li>
        </ul>
      )}
    </section>
  );
}
