import { useMemo, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { formatHour } from './TimelineStudio';
import './timeline.css';

type Mode = 'weather' | 'delay' | 'cancel' | 'budget' | null;

const CloudIcon = () => <svg viewBox="0 0 48 48" aria-hidden><path d="M13 34h23a8 8 0 0 0 1-15.9A13 13 0 0 0 12.7 21 6.5 6.5 0 0 0 13 34Z" fill="none" stroke="currentColor" strokeWidth="2"/></svg>;
const ClockIcon = () => <svg viewBox="0 0 48 48" aria-hidden><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M24 14v11l8 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CancelIcon = () => <svg viewBox="0 0 48 48" aria-hidden><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m17 17 14 14m0-14L17 31" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const BudgetIcon = () => <svg viewBox="0 0 48 48" aria-hidden><path d="M31 14c-2-2-4-3-7-3-5 0-9 5-9 13s4 13 9 13c3 0 5-1 7-3M11 21h16m-16 6h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;

export function SimulationBar({ onOpenMoment }: { onOpenMoment: (phaseId: string) => void }) {
  const store = weddingStore;
  const phases = useMemo(() => [...store.phases].sort((a, b) => a.startHour - b.startHour), [store.version]);
  const [mode, setMode] = useState<Mode>(null);
  const [phaseId, setPhaseId] = useState('');
  const [minutes, setMinutes] = useState(30);
  const target = phases.find((phase) => phase.id === phaseId) ?? phases[0] ?? null;
  const impact = target ? store.propagationImpact(target.id, minutes / 60) : null;
  const weather = store.weatherImpact(target?.startHour ?? 12);
  const budget = phases.reduce((sum, phase) => sum + (phase.budget?.amount ?? 0), 0);

  if (!target) return null;

  const createDelayPlan = () => {
    const scenario = store.createScenario(`Plan B — ${target.name} +${minutes} min`);
    if (!scenario) return;
    store.scenarioShiftPhase(scenario.id, target.id, minutes / 60, true);
    store.setActiveScenario(scenario.id);
    document.getElementById('organisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="wc-command" data-jourj="simulation">
      <header className="wc-command-head">
        <div><span>Command center</span><h2>Et si quelque chose change&nbsp;?</h2></div>
        <p>Explorez une conséquence sans modifier la journée.</p>
      </header>

      <div className="wc-command-menu">
        <button onClick={() => setMode(mode === 'weather' ? null : 'weather')} className={mode === 'weather' ? 'is-active' : ''} data-jourj="sim-weather">
          <CloudIcon /><span>Météo</span><strong>{weather.exposed.length} moment{weather.exposed.length > 1 ? 's' : ''} dehors</strong>
        </button>
        <button onClick={() => setMode(mode === 'delay' ? null : 'delay')} className={mode === 'delay' ? 'is-active' : ''} data-jourj="sim-delay">
          <ClockIcon /><span>Retard</span><strong>+15 · +30 · +60 min</strong>
        </button>
        <button onClick={() => setMode(mode === 'cancel' ? null : 'cancel')} className={mode === 'cancel' ? 'is-active' : ''}>
          <CancelIcon /><span>Annulation</span><strong>Préparer une alternative</strong>
        </button>
        <button onClick={() => setMode(mode === 'budget' ? null : 'budget')} className={mode === 'budget' ? 'is-active' : ''}>
          <BudgetIcon /><span>Budget</span><strong>{budget > 0 ? `${budget.toLocaleString('fr-FR')} € déclarés` : 'À renseigner'}</strong>
        </button>
      </div>

      {mode && (
        <div className="wc-command-detail">
          <div className="wc-command-context">
            <label>Moment
              <select value={target.id} onChange={(event) => setPhaseId(event.target.value)} data-jourj="sim-phase">
                {phases.map((phase) => <option key={phase.id} value={phase.id}>{formatHour(phase.startHour)} — {phase.name}</option>)}
              </select>
            </label>
            <button onClick={() => setMode(null)}>Fermer</button>
          </div>

          {mode === 'delay' && impact && (
            <div data-jourj="sim-consequences">
              <div className="wc-command-presets" aria-label="Durée du retard">
                {[15, 30, 60].map((value) => <button key={value} onClick={() => setMinutes(value)} className={minutes === value ? 'is-active' : ''} data-jourj="sim-minutes">+{value} min</button>)}
              </div>
              <p><strong>{impact.moment.name}</strong> passerait à {formatHour(impact.moment.to)}. {impact.followers.length} moment{impact.followers.length > 1 ? 's' : ''} suivrai{impact.followers.length > 1 ? 'ent' : 't'}.</p>
              <p>{impact.conflicts.length ? `${impact.conflicts.length} conflit(s) à examiner.` : 'Aucun conflit détecté avec les informations connues.'}</p>
              <div className="wc-command-actions">
                <button onClick={() => store.shiftPhaseAndFollowing(target.id, target.startHour + minutes / 60)} data-jourj="sim-apply">Appliquer le décalage</button>
                <button onClick={createDelayPlan} data-jourj="sim-planb">Créer un plan B</button>
                <button onClick={() => onOpenMoment(target.id)} data-jourj="sim-open">Ouvrir le moment</button>
              </div>
            </div>
          )}

          {mode === 'weather' && (
            <div data-jourj="sim-weather-out">
              <div className="wc-command-weather"><CloudIcon /><strong>Averse hypothétique</strong><span>Pas de météo réelle connectée</span></div>
              {weather.exposed.length ? <p>{weather.exposed.map((moment) => moment.name).join(', ')} {weather.exposed.length > 1 ? 'sont déclarés' : 'est déclaré'} en extérieur autour de cette heure.</p> : <p>Aucun moment n’est déclaré en extérieur autour de {formatHour(target.startHour)}.</p>}
              <div className="wc-command-actions"><button onClick={() => onOpenMoment(target.id)}>Vérifier l’abri de ce moment</button></div>
            </div>
          )}

          {mode === 'cancel' && (
            <div><p>Une annulation ne doit jamais supprimer silencieusement un moment. Ouvrez-le pour préparer une alternative, déplacer ses personnes ou créer un scénario.</p><div className="wc-command-actions"><button onClick={() => onOpenMoment(target.id)}>Préparer l’alternative</button></div></div>
          )}

          {mode === 'budget' && (
            <div><p>{target.budget?.amount ? `${target.budget?.amount.toLocaleString('fr-FR')} € sont déclarés sur ce moment.` : 'Aucun budget n’est encore déclaré sur ce moment.'} Le total connu de la journée est de {budget.toLocaleString('fr-FR')} €.</p><div className="wc-command-actions"><button onClick={() => onOpenMoment(target.id)}>Modifier le budget du moment</button></div></div>
          )}
        </div>
      )}
    </section>
  );
}
