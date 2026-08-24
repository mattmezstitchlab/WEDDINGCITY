import { useMemo, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { IconAlert, IconCheck, IconClock } from '../../ui/Icons';
import { formatHour } from './TimelineStudio';
import './timeline.css';

// ---------------------------------------------------------------------------
// « ET SI… » — THE SIMULATION LIVES IN THE FILM, NEVER ON ANOTHER PAGE.
// ---------------------------------------------------------------------------
// Two questions a day always asks: what if we run late, and what if it rains.
//
// WHAT THIS REALLY DOES: it calls the engine that already exists.
//   • the delay calls store.propagationImpact() — the very function the drag
//     gesture uses — so the names, the vendors and the conflicts it shows are
//     the real ones, computed on the real moments;
//   • the weather reads store.weatherImpact(), which lists only the moments a
//     HUMAN declared as happening outside.
//
// WHAT IT NEVER DOES: change the day. Nothing here writes until one of the
// explicit actions is clicked. And there is no weather service: the condition
// is a slider the user moves, the page says so, and no forecast is displayed.
// ---------------------------------------------------------------------------

export function SimulationBar({ onOpenMoment }: { onOpenMoment: (phaseId: string) => void }) {
  const store = weddingStore;
  const phases = useMemo(
    () => [...store.phases].sort((a, b) => a.startHour - b.startHour),
    [store.version],
  );

  const [open, setOpen] = useState(false);
  const [phaseId, setPhaseId] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [rain, setRain] = useState(0);
  const [hour, setHour] = useState(() => (phases.length ? Math.round(phases[0].startHour) : 15));

  // MEASURED: this early return used to sit HERE, before the two useMemo below
  // — a conditional hook. The day starts empty, so the first moment created
  // changed the number of hooks and React tore the whole timeline down: five
  // moments were typed, one survived. Every hook now runs on every render, and
  // the component decides what to draw at the very end.
  const target = phases.find((p) => p.id === phaseId) ?? phases[0] ?? null;
  const impact = useMemo(
    () => (target ? store.propagationImpact(target.id, minutes / 60) : null),
    [target?.id, minutes, store.version],
  );
  const weather = useMemo(() => store.weatherImpact(hour), [hour, store.version]);
  const raining = rain >= 50;

  if (phases.length === 0 || !target) return null;

  const planB = (name: string, shift: boolean) => {
    const scenario = store.createScenario(name);
    if (!scenario) return;
    if (shift) store.scenarioShiftPhase(scenario.id, target.id, minutes / 60, true);
    store.setActiveScenario(scenario.id);
    document.getElementById('organisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className={`wc-sim${raining ? ' is-raining' : ''}`} data-jourj="simulation" data-rain={raining ? 'yes' : 'no'}>
      <button
        className="wc-sim-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        data-jourj="sim-toggle"
      >
        <span className="wc-sim-title">Et si…</span>
        <span className="wc-sim-sub">
          {open
            ? 'Rien n’est appliqué tant que vous ne le demandez pas.'
            : 'Un retard, une averse : voir les conséquences avant qu’elles arrivent.'}
        </span>
        <span className={`wc-hub-chevron${open ? ' is-open' : ''}`} aria-hidden>▾</span>
      </button>

      {open && (
        <div className="wc-sim-body">
          {/* ------------------------------------------------------- RETARD */}
          <div className="wc-sim-block" data-jourj="sim-delay">
            <div className="wc-sim-block-head">
              <IconClock size={15} color="rgba(246,245,243,0.7)" />
              <span>Un retard</span>
            </div>

            <div className="wc-sim-controls">
              <select
                value={target.id}
                onChange={(e) => setPhaseId(e.target.value)}
                className="wc-sim-select"
                aria-label="Quel moment prend du retard"
                data-jourj="sim-phase"
              >
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>{formatHour(p.startHour)} — {p.name}</option>
                ))}
              </select>
              <input
                type="range"
                min={5}
                max={90}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="wc-sim-range"
                aria-label="Minutes de retard"
                data-jourj="sim-minutes"
              />
              <span className="wc-sim-value" data-jourj="sim-minutes-value">+{minutes} min</span>
            </div>

            {impact && (
              <div className="wc-sim-out" data-jourj="sim-consequences">
                <p className="wc-sim-line">
                  <strong>{impact.moment.name}</strong> passerait de {formatHour(impact.moment.from)} à{' '}
                  <strong>{formatHour(impact.moment.to)}</strong>.
                </p>

                {impact.followers.length > 0 && (
                  <p className="wc-sim-line" data-jourj="sim-followers">
                    {impact.followers.length} moment{impact.followers.length > 1 ? 's' : ''} suivrai
                    {impact.followers.length > 1 ? 'ent' : 't'} :{' '}
                    {impact.followers.map((f) => `${f.name} ${formatHour(f.to)}`).join(', ')}.
                  </p>
                )}

                {(impact.people.length > 0 || impact.vendors.length > 0) && (
                  <p className="wc-sim-line" data-jourj="sim-people">
                    {[...impact.people.map((p) => (p.role ? `${p.name} (${p.role})` : p.name)),
                      ...impact.vendors.map((v) => v.name)].join(', ')}
                    {' '}— {impact.people.length + impact.vendors.length} concerné
                    {impact.people.length + impact.vendors.length > 1 ? 's' : ''}.
                  </p>
                )}

                {impact.conflicts.length === 0 ? (
                  <p className="wc-sim-line wc-sim-ok" data-jourj="sim-noconflict">
                    <IconCheck size={13} color="#a9c6a2" /> Aucun conflit créé par ce décalage.
                  </p>
                ) : (
                  <ul className="wc-sim-conflicts" data-jourj="sim-conflicts">
                    {impact.conflicts.map((c, i) => (
                      <li key={i} data-jourj="sim-conflict">
                        <IconAlert size={13} color="#e0736a" /> <strong>{c.title}</strong> — {c.detail}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="wc-sim-actions">
                  <button
                    onClick={() => { store.shiftPhaseAndFollowing(target.id, target.startHour + minutes / 60); }}
                    className="wc-sim-primary"
                    data-jourj="sim-apply"
                  >
                    Décaler pour de vrai
                  </button>
                  <button
                    onClick={() => planB(`Plan B — ${target.name} +${minutes} min`, true)}
                    className="wc-sim-ghost"
                    data-jourj="sim-planb"
                  >
                    Créer un plan B
                  </button>
                  <button onClick={() => onOpenMoment(target.id)} className="wc-sim-ghost" data-jourj="sim-open">
                    Ouvrir ce moment
                  </button>
                  <button onClick={() => setMinutes(15)} className="wc-sim-ghost" data-jourj="sim-reset">
                    Ne rien changer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------- MÉTÉO */}
          <div className="wc-sim-block" data-jourj="sim-weather">
            <div className="wc-sim-block-head">
              <span aria-hidden>☀</span>
              <span>Une averse</span>
            </div>

            <div className="wc-sim-controls">
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={rain}
                onChange={(e) => setRain(Number(e.target.value))}
                className="wc-sim-range"
                aria-label="Du beau temps à la pluie"
                data-jourj="sim-rain"
              />
              <span aria-hidden>☔</span>
              <input
                type="range"
                min={Math.floor(phases[0].startHour)}
                max={Math.ceil(phases[phases.length - 1].endHour)}
                step={1}
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="wc-sim-range"
                aria-label="À quelle heure"
                data-jourj="sim-hour"
              />
              <span className="wc-sim-value" data-jourj="sim-hour-value">{formatHour(hour)}</span>
            </div>

            <div className="wc-sim-out" data-jourj="sim-weather-out">
              <p className="wc-sim-note" data-jourj="sim-weather-honesty">
                Aucune météo réelle n’est disponible ici : ce curseur est une hypothèse
                que vous posez, pas une prévision. Seuls les moments que vous avez
                déclarés en extérieur sont concernés — le produit ne le devine jamais.
              </p>

              {!raining ? (
                <p className="wc-sim-line wc-sim-ok">
                  <IconCheck size={13} color="#a9c6a2" /> Beau temps à {formatHour(hour)} : rien à prévoir.
                </p>
              ) : weather.exposed.length === 0 ? (
                <p className="wc-sim-line" data-jourj="sim-weather-none">
                  À {formatHour(hour)}, aucun moment n’est déclaré en extérieur.
                  {weather.undeclared > 0
                    && ` ${weather.undeclared} moment${weather.undeclared > 1 ? 's' : ''} n’${weather.undeclared > 1 ? 'ont' : 'a'} rien déclaré : ouvrez-le${weather.undeclared > 1 ? 's' : ''} pour le dire.`}
                </p>
              ) : (
                <>
                  <ul className="wc-sim-conflicts" data-jourj="sim-exposed">
                    {weather.exposed.map((m) => (
                      <li key={m.id} data-jourj="sim-exposed-moment">
                        <IconAlert size={13} color="#e0a06a" /> <strong>{m.name}</strong>{' '}
                        {formatHour(m.startHour)} — déclaré en extérieur, sous la pluie simulée.
                      </li>
                    ))}
                  </ul>
                  <div className="wc-sim-actions">
                    <button
                      onClick={() => planB(`Plan B — pluie à ${formatHour(hour)}`, false)}
                      className="wc-sim-primary"
                      data-jourj="sim-weather-planb"
                    >
                      Créer un plan B pluie
                    </button>
                    <button
                      onClick={() => onOpenMoment(weather.exposed[0].id)}
                      className="wc-sim-ghost"
                      data-jourj="sim-weather-open"
                    >
                      Ouvrir {weather.exposed[0].name}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
