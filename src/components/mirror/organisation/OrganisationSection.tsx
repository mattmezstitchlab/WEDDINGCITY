import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { CrewPanel } from './CrewPanel';
import { ScenariosPanel } from './ScenariosPanel';
import { SeatingPlan } from './SeatingPlan';

// ---------------------------------------------------------------------------
// ORGANISATION — an action launcher, not another dashboard.
// ---------------------------------------------------------------------------
// Every capability used to be expanded at once below the film. The page looked
// like five products stacked together. This surface now asks one question and
// reveals one tool only after a deliberate choice. Each tool still reads and
// writes the same store; no workflow was duplicated.
// ---------------------------------------------------------------------------

type Action = 'analyse' | 'crew' | 'scenario' | 'seating' | 'events' | null;

const ACTIONS: { id: Exclude<Action, null>; index: string; title: string; detail: string }[] = [
  { id: 'analyse', index: '01', title: 'Analyser ma journée', detail: 'Voir ce qui manque, se contredit ou reste à confirmer.' },
  { id: 'crew', index: '02', title: 'Ajouter une personne de métier', detail: 'Artiste, technicien, photographe, DJ ou autre intervenant.' },
  { id: 'scenario', index: '03', title: 'Préparer un scénario', detail: 'Comparer un plan B sans modifier la journée principale.' },
  { id: 'seating', index: '04', title: 'Organiser les invités', detail: 'Composer le plan de table à partir des personnes existantes.' },
  { id: 'events', index: '05', title: 'Vérifier mes autres événements', detail: 'Repérer une même personne attendue ailleurs au même moment.' },
];

export function OrganisationSection() {
  const store = weddingStore;
  const [action, setAction] = useState<Action>(null);
  const findings = action === 'analyse' ? store.projectFindings() : [];
  const conflicts = action === 'events' ? store.crossEventConflicts() : [];

  return (
    <section id="organisation" className="wc-org-choice" aria-label="Organisation">
      <header className="wc-org-choice-head">
        <span>Organisation</span>
        <h2>Que voulez-vous faire&nbsp;?</h2>
        <p>Choisissez une action. Un seul outil s’ouvre à la fois, puis se referme pour vous rendre la journée.</p>
      </header>

      <div className="wc-org-actions">
        {ACTIONS.map((item) => (
          <button
            key={item.id}
            onClick={() => setAction(action === item.id ? null : item.id)}
            className={action === item.id ? 'is-active' : ''}
            aria-expanded={action === item.id}
            data-org-action={item.id}
          >
            <span>{item.index}</span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <i aria-hidden>{action === item.id ? '−' : '→'}</i>
          </button>
        ))}
      </div>

      {action && (
        <div className="wc-org-tool" data-org={`tool-${action}`}>
          <div className="wc-org-tool-head">
            <div><span>Action en cours</span><h3>{ACTIONS.find((item) => item.id === action)?.title}</h3></div>
            <button onClick={() => setAction(null)}>Fermer</button>
          </div>

          {action === 'analyse' && (
            <ul className="wc-org-findings" data-org="lab-findings">
              {findings.map((finding, index) => (
                <li key={`${finding.title}-${index}`} data-level={finding.level}>
                  <span>{finding.level === 'ok' ? '✓' : finding.level === 'conflict' ? '!' : '·'}</span>
                  <div><strong>{finding.title}</strong><p>{finding.detail}</p></div>
                </li>
              ))}
            </ul>
          )}

          {action === 'crew' && <div id="equipe"><CrewPanel /></div>}
          {action === 'scenario' && <div id="scenarios"><ScenariosPanel /></div>}
          {action === 'seating' && <SeatingPlan />}

          {action === 'events' && (
            <div className="wc-org-cross-events">
              <p className="wc-org-honesty">La correspondance entre événements utilise le nom de la personne. Elle signale une piste à vérifier, jamais une identité certaine.</p>
              {conflicts.length === 0 ? (
                <div className="wc-org-empty">Aucun chevauchement détecté avec les événements conservés dans ce navigateur.</div>
              ) : (
                <ul>{conflicts.map((conflict, index) => (
                  <li key={`${conflict.personName}-${index}`}>
                    <strong>{conflict.personName}</strong>
                    <span>{conflict.here}</span>
                    <span>{conflict.otherProjectName} · {conflict.there}</span>
                  </li>
                ))}</ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
