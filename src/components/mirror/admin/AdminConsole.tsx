import { useMemo, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { siteRequests, setSiteRequestStatus, type SiteRequestStatus } from '../../../game/siteRequests';

// ---------------------------------------------------------------------------
// ADMINISTRATION — a control desk, not a dashboard.
// ---------------------------------------------------------------------------
// This surface exists for the people who pilot SEVERAL events: a planner, a
// producer, an artist who works twenty weddings a year. It answers three
// questions and refuses to answer any others:
//
//   • où en est chaque événement ?
//   • qu’est-ce qui attend une décision humaine ?
//   • où se trouve cette personne, ce document, ce moment ?
//
// WHAT IT IS NOT, deliberately: a grid of cards, a wall of counters, a chart, a
// second product. There are no statistics here that nobody would act on.
//
// WHAT IT NEVER DOES: hold data. Every line is READ from the events already
// stored in this browser (store.adminEvents / adminAlerts / searchAcrossEvents
// / personDossier). The truth of an event stays inside that event; the timeline
// remains the single source of truth. Opening an event from here simply loads
// it — there is nothing to synchronise, because nothing was copied.
// ---------------------------------------------------------------------------

type Filter = 'tout' | 'evenements' | 'personnes' | 'prestataires' | 'moments' | 'documents' | 'taches';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'tout', label: 'Tout' },
  { id: 'evenements', label: 'Événements' },
  { id: 'personnes', label: 'Personnes' },
  { id: 'prestataires', label: 'Prestataires' },
  { id: 'moments', label: 'Moments' },
  { id: 'documents', label: 'Documents' },
  { id: 'taches', label: 'Tâches' },
];

const KIND_OF_FILTER: Record<Filter, string[]> = {
  tout: [],
  evenements: ['event'],
  personnes: ['person'],
  prestataires: ['vendor'],
  moments: ['moment'],
  documents: ['document'],
  taches: ['task'],
};

export function AdminConsole({ onClose }: { onClose: () => void }) {
  const store = weddingStore;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('tout');
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [webRequests, setWebRequests] = useState(() => siteRequests());
  // CHRONOS: the same calendar projection, used here as a filter. No second
  // date arithmetic, no second source — store.calendarRange() decides what
  // « cette semaine » means, once, for the whole product.
  const [when, setWhen] = useState<'tout' | 'today' | 'week' | 'month' | 'next'>('tout');

  const allEvents = useMemo(() => store.adminEvents(), [store.version]);
  const today = store.today();
  const nextDate = useMemo(
    () => allEvents.map((e) => e.project.weddingDate).filter((d) => d && d >= today).sort()[0] ?? null,
    [allEvents, today],
  );
  const events = useMemo(() => {
    if (when === 'tout') return allEvents;
    if (when === 'next') return allEvents.filter((e) => e.project.weddingDate === nextDate);
    const range = store.calendarRange(when === 'today' ? 'day' : when, today);
    return allEvents.filter((e) => {
      const d = e.project.weddingDate;
      return Boolean(d) && d >= range.from && d <= range.to;
    });
  }, [allEvents, when, today, nextDate, store.version]);
  const alerts = useMemo(() => store.adminAlerts(), [store.version]);
  const results = useMemo(() => store.searchAcrossEvents(query), [query, store.version]);
  const shown = filter === 'tout' ? results : results.filter((r) => KIND_OF_FILTER[filter].includes(r.kind));

  const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Administration" data-admin="console">
      <div style={surface}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <span style={eyebrow}>Administration</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={ghost} data-admin="close">Fermer</button>
        </div>

        <h2 style={title}>Ce qui attend une décision.</h2>
        <p style={{ ...muted, maxWidth: 620, marginTop: 12 }}>
          Une seule ligne de recherche, et la liste de ce qui n’est pas réglé.
          Rien n’est stocké ici : tout est lu dans vos événements, qui restent la
          seule source de vérité.
        </p>

        <section style={block} data-admin="site-requests">
          <div style={eyebrow}>Demandes de création de site · {webRequests.length}</div>
          {webRequests.length === 0 ? (
            <p style={{ ...muted, marginTop: 10 }}>Aucune demande enregistrée sur cette installation.</p>
          ) : (
            <ul style={list}>
              {webRequests.map((request) => (
                <li key={request.id} style={line}>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <strong>{request.name}{request.organisation ? ` · ${request.organisation}` : ''}</strong>
                    <span style={muted}>{new Date(request.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div style={{ ...muted, marginTop: 5 }}>{request.websiteNeed} · {request.eventType} · {request.budget || 'budget à définir'}</div>
                  <p style={{ ...muted, color: '#f6f5f3', whiteSpace: 'pre-wrap' }}>{request.message}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href={`mailto:${request.email}?subject=${encodeURIComponent(`Votre projet de site — ${request.websiteNeed}`)}`} style={linkBtn}>Répondre</a>
                    <button onClick={() => window.print()} style={linkBtn}>Imprimer le dossier</button>
                    <select value={request.status} onChange={(event) => { setSiteRequestStatus(request.id, event.target.value as SiteRequestStatus); setWebRequests(siteRequests()); }} style={chip} aria-label={`Statut de ${request.name}`}>
                      <option value="nouvelle">Nouvelle</option><option value="qualification">Qualification</option><option value="devis">Devis</option><option value="acceptée">Acceptée</option><option value="archivée">Archivée</option>
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p style={{ ...muted, marginTop: 12 }}>Réception locale active. La réception centralisée et privée nécessite le service serveur authentifié prévu pour la mise en production.</p>
        </section>

        {/* ---------------------------------------------------------- SEARCH */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une personne, un événement, un document…"
          aria-label="Recherche universelle"
          style={search}
          data-admin="search"
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ ...chip, opacity: filter === f.id ? 1 : 0.5, borderColor: filter === f.id ? '#f6f5f3' : 'rgba(246,245,243,0.24)' }}
              data-admin="filter"
              data-filter={f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        {query.trim().length >= 2 && (
          <section style={block} data-admin="results">
            <div style={eyebrow}>{shown.length} résultat{shown.length > 1 ? 's' : ''}</div>
            {shown.length === 0 && (
              <p style={{ ...muted, marginTop: 10 }}>Rien de ce nom dans vos événements.</p>
            )}
            <ul style={list}>
              {shown.map((r) => (
                <li key={`${r.projectId}-${r.kind}-${r.id}`} style={line} data-admin="result" data-kind={r.kind}>
                  <button
                    style={lineBtn}
                    onClick={() => {
                      if (r.kind === 'person' && r.projectId === store.currentProject.id) setOpenPersonId(r.id);
                      else if (r.projectId !== store.currentProject.id) store.loadProject(r.projectId);
                    }}
                  >
                    <span style={kindTag}>{r.kind}</span>
                    <span style={{ fontWeight: 600 }}>{r.label}</span>
                    <span style={muted}>{r.projectName} · {r.context}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------- TO SETTLE */}
        <section style={block} data-admin="alerts">
          <div style={eyebrow}>À vérifier</div>
          {alerts.length === 0 ? (
            <p style={{ ...muted, marginTop: 10 }} data-admin="alerts-empty">
              Rien à signaler dans vos événements : aucun conflit d’horaire, aucun
              contrat manquant, aucune tâche en attente.
            </p>
          ) : (
            <ul style={list}>
              {alerts.map((a, i) => (
                <li
                  key={i}
                  style={{ ...line, borderLeft: `2px solid ${a.kind === 'conflict' ? '#e0736a' : '#e0a06a'}`, paddingLeft: 12 }}
                  data-admin="alert"
                  data-kind={a.kind}
                >
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <div style={{ ...muted, marginTop: 3 }}>{a.detail}</div>
                  <button
                    style={{ ...linkBtn, marginTop: 6 }}
                    onClick={() => {
                      if (a.projectId !== store.currentProject.id) store.loadProject(a.projectId);
                      onClose();
                    }}
                    data-admin="alert-open"
                  >
                    Ouvrir {a.projectName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------------------------------------- EVENTS */}
        <section style={block} data-admin="events">
          <div style={eyebrow}>Événements</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {([
              ['tout', 'Tout'], ['today', 'Aujourd’hui'], ['week', 'Cette semaine'],
              ['month', 'Ce mois'], ['next', 'Prochain événement'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setWhen(id)}
                style={{ ...chip, opacity: when === id ? 1 : 0.5, borderColor: when === id ? '#f6f5f3' : 'rgba(246,245,243,0.24)' }}
                data-admin="when"
                data-when={id}
                aria-pressed={when === id}
              >
                {label}
              </button>
            ))}
          </div>
          {events.length === 0 && (
            <p style={{ ...muted, marginTop: 12 }} data-admin="events-empty">
              Aucun événement sur cette période.
            </p>
          )}
          <ul style={list}>
            {events.map((e) => (
              <li key={e.project.id} style={line} data-admin="event" data-current={e.isCurrent ? 'yes' : 'no'}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: typography.family.mono, fontSize: 12 }}>
                    {e.project.weddingDate || 'date à confirmer'}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: typography.editorial.body }}>
                    {e.project.coupleNames || e.project.title}
                  </span>
                  <span style={kindTag}>{e.typeLabel}</span>
                  {e.isCurrent && <span style={{ ...kindTag, borderColor: '#f6f5f3' }}>ouvert</span>}
                  {e.isDemo && (
                    <span style={{ ...kindTag, borderColor: '#e0a06a', color: '#e0a06a' }} data-admin="demo-tag">
                      démonstration
                    </span>
                  )}
                </div>
                <div style={{ ...muted, marginTop: 4 }}>
                  {e.moments} moment{e.moments > 1 ? 's' : ''} · {e.people} personne{e.people > 1 ? 's' : ''}
                  {e.crew > 0 && ` · ${e.crew} métier${e.crew > 1 ? 's' : ''} déclaré${e.crew > 1 ? 's' : ''}`}
                  {' '}· {e.documents} document{e.documents > 1 ? 's' : ''}
                  {e.openTasks > 0 && ` · ${e.openTasks} tâche${e.openTasks > 1 ? 's' : ''} en attente`}
                  {e.estimatedHours > 0 && ` · ${e.estimatedHours} horaire${e.estimatedHours > 1 ? 's' : ''} non confirmé${e.estimatedHours > 1 ? 's' : ''}`}
                </div>
                {!e.isCurrent && (
                  <button
                    style={{ ...linkBtn, marginTop: 6 }}
                    onClick={() => { store.loadProject(e.project.id); onClose(); }}
                    data-admin="event-open"
                  >
                    Ouvrir
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------- PEOPLE */}
        <section style={block} data-admin="people">
          <div style={eyebrow}>Personnes de l’événement ouvert</div>
          {store.persons.length === 0 ? (
            <p style={{ ...muted, marginTop: 10 }}>Aucune personne dans cet événement.</p>
          ) : (
            <ul style={list}>
              {store.persons.map((p) => (
                <li key={p.id} style={line} data-admin="person">
                  <button style={lineBtn} onClick={() => setOpenPersonId(p.id)} data-admin="person-open">
                    <span style={{ fontWeight: 600 }}>{p.displayName}</span>
                    <span style={muted}>
                      {p.craft?.role ?? 'métier non déclaré'}
                      {p.craft?.status ? ` · ${p.craft.status}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {openPersonId && (() => {
          const dossier = store.personDossier(openPersonId);
          if (!dossier) return null;
          return (
            <section style={{ ...block, borderTop: '1px solid rgba(246,245,243,0.3)' }} data-admin="dossier">
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.02em' }}>{dossier.person.displayName}</h3>
                <span style={muted}>{dossier.role ?? 'métier non déclaré'}</span>
                <span style={{ flex: 1 }} />
                <button onClick={() => setOpenPersonId(null)} style={ghost}>Refermer</button>
              </div>

              <div style={{ ...muted, marginTop: 10 }}>
                {dossier.events.length} événement{dossier.events.length > 1 ? 's' : ''}
                {dossier.nextDate ? ` · prochain le ${dossier.nextDate}` : ' · aucune date à venir'}
                {' '}· {dossier.documents.length} document{dossier.documents.length > 1 ? 's' : ''}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={eyebrow}>Événements</div>
                <ul style={list}>
                  {dossier.events.map((e) => (
                    <li key={e.projectId} style={line} data-admin="dossier-event">
                      <div style={{ fontWeight: 600 }}>
                        {e.projectName}
                        <span style={{ ...muted, marginLeft: 8 }}>{e.date || 'date à confirmer'}</span>
                      </div>
                      <div style={{ ...muted, marginTop: 3 }}>
                        {e.moments.length
                          ? e.moments.map((m) => `${m.name} ${clock(m.startHour)}`).join(' · ')
                          : 'aucun moment'}
                      </div>
                      {e.matchedByName && (
                        <div style={{ ...muted, marginTop: 3, color: '#e0a06a' }} data-admin="name-match">
                          Rapprochement fait sur le nom seul — à confirmer : rien ne
                          prouve ici qu’il s’agit de la même personne.
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {dossier.documents.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={eyebrow}>Documents</div>
                  <ul style={list}>
                    {dossier.documents.map((d) => (
                      <li key={d.id} style={line} data-admin="dossier-document">
                        <span style={{ fontWeight: 600 }}>{d.title}</span>
                        <span style={muted}> · {d.projectName}</span>
                        {(() => {
                          // A document attached to a moment opens that moment.
                          const asset = store.media.find((m) => m.id === d.id);
                          if (!asset || asset.ownerKind !== 'event') return null;
                          if (!store.phases.some((p) => p.id === asset.ownerId)) return null;
                          return (
                            <button
                              style={{ ...linkBtn, marginLeft: 10 }}
                              onClick={() => { store.openMoment(asset.ownerId); onClose(); }}
                              data-admin="document-open-moment"
                            >
                              ouvrir le moment
                            </button>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dossier.missions.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={eyebrow}>Missions</div>
                  <ul style={list}>
                    {dossier.missions.map((m) => (
                      <li key={m.id} style={line} data-admin="dossier-mission">
                        <span style={{ fontWeight: 600 }}>{m.title}</span>
                        <span style={muted}> · {m.status ?? (m.isDone ? 'done' : 'todo')}</span>
                        {/* A mission belongs to a moment: it opens it, rather
                            than leaving the reader to look for it. */}
                        {m.phaseId && store.phases.some((p) => p.id === m.phaseId) && (
                          <button
                            style={{ ...linkBtn, marginLeft: 10 }}
                            onClick={() => { store.openMoment(m.phaseId!); onClose(); }}
                            data-admin="mission-open-moment"
                          >
                            ouvrir le moment
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p style={{ ...muted, marginTop: 18 }}>
                La feuille de route de cette personne se lit dans « Spectacle », sur
                la journée ouverte : elle est dérivée de la pellicule et se recalcule
                seule. Les documents se produisent depuis le moment concerné.
              </p>
            </section>
          );
        })()}

        <p style={{ ...muted, marginTop: 40, maxWidth: 640 }} data-admin="honesty">
          La recherche d’une entreprise ou d’une association sur le Web n’est pas
          disponible dans cet environnement, et l’envoi d’un document non plus :
          aucun accès réseau n’est connecté. Ces deux fonctions ne sont pas
          simulées.
        </p>
      </div>
    </div>
  );
}

// --- styles ------------------------------------------------------------------

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1500, background: '#08090b',
  overflowY: 'auto', color: '#f6f5f3', fontFamily: typography.family.sans,
};

const surface: React.CSSProperties = {
  maxWidth: 980, margin: '0 auto', padding: 'clamp(24px, 5vw, 64px) clamp(18px, 5vw, 48px) 100px',
};

const eyebrow: React.CSSProperties = {
  fontSize: typography.editorial.micro, letterSpacing: '0.18em', textTransform: 'uppercase',
  fontWeight: typography.weight.bold, color: 'rgba(246,245,243,0.6)',
};

const title: React.CSSProperties = {
  margin: '18px 0 0', fontSize: 'clamp(30px, 5vw, 58px)', letterSpacing: '-0.035em',
  fontWeight: typography.weight.semibold, lineHeight: 1.03,
};

const muted: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: 'rgba(246,245,243,0.66)', lineHeight: 1.6,
};

const search: React.CSSProperties = {
  marginTop: 28, width: '100%', boxSizing: 'border-box',
  background: 'transparent', color: '#f6f5f3',
  border: 'none', borderBottom: '1px solid rgba(246,245,243,0.32)',
  padding: '14px 0', fontSize: 'clamp(16px, 2.2vw, 22px)',
  fontFamily: typography.family.sans, outline: 'none',
};

const block: React.CSSProperties = { marginTop: 44 };

const list: React.CSSProperties = { listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 14 };

const line: React.CSSProperties = { fontSize: typography.editorial.caption };

const lineBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: 'inherit',
  border: 'none', padding: 0, textAlign: 'left', font: 'inherit',
  display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline',
};

const chip: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.24)', borderRadius: 999,
  padding: '7px 14px', fontSize: 11, fontFamily: typography.family.sans,
};

const kindTag: React.CSSProperties = {
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '2px 9px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
};

const ghost: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '9px 16px', fontSize: 12, fontFamily: typography.family.sans,
};

const linkBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent',
  color: '#f6f5f3', border: 'none', borderBottom: '1px solid rgba(246,245,243,0.4)',
  padding: 0, fontSize: 11, fontFamily: typography.family.sans,
};
