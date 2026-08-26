import { useMemo, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import './calendar.css';

// ---------------------------------------------------------------------------
// CHRONOS — THE CALENDAR. A projection of the same time, seen from further away.
// ---------------------------------------------------------------------------
// The Timeline answers HOW a day happens. The Calendar answers WHEN it happens.
// They are the same data: a project carries the date, its moments carry the
// hours. This surface holds NOTHING — no state of its own beyond the scale you
// are looking at, no stored day, no copied hour. Change a moment on the film
// and this page changes, because it never had a copy.
//
// DELIBERATELY NOT A GRID OF CELLS. A month is not a spreadsheet: it is a
// short list of the days that carry something, and a discreet rail showing
// where they fall. An empty day says so in words, and offers to be filled.
//
// Zoom on time: ANNÉE → MOIS → SEMAINE → JOUR → (la pellicule).
// ---------------------------------------------------------------------------

type Scale = 'year' | 'month' | 'week' | 'day';

const SCALES: { id: Scale; label: string }[] = [
  { id: 'year', label: 'Année' },
  { id: 'month', label: 'Mois' },
  { id: 'week', label: 'Semaine' },
  { id: 'day', label: 'Jour' },
];

const STEP: Record<Scale, number> = { day: 1, week: 7, month: 30, year: 365 };

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const clock = (h: number | null) => (h === null
  ? '—'
  : `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`);

export function CalendarStudio({ onClose }: { onClose: () => void }) {
  const store = weddingStore;
  const [scale, setScale] = useState<Scale>('month');
  const [anchor, setAnchor] = useState<string>(() => {
    // Open where the user's life is: their next event, or today.
    const today = store.today();
    const next = store.adminEvents()
      .map((e) => e.project.weddingDate)
      .filter((d) => d && d >= today)
      .sort()[0];
    return next || today;
  });
  const [personId, setPersonId] = useState('');

  const range = useMemo(() => store.calendarRange(scale, anchor), [scale, anchor, store.version]);
  const days = useMemo(() => store.calendarDays(range.from, range.to), [range.from, range.to, store.version]);
  const busy = days.filter((d) => d.entries.length > 0);
  const agenda = useMemo(
    () => (personId ? store.personCalendar(personId, range.from, range.to) : []),
    [personId, range.from, range.to, store.version],
  );

  const move = (dir: -1 | 1) => {
    if (scale === 'month') {
      const [y, m] = anchor.split('-').map(Number);
      const nm = m + dir;
      const ny = nm < 1 ? y - 1 : nm > 12 ? y + 1 : y;
      const mm = nm < 1 ? 12 : nm > 12 ? 1 : nm;
      setAnchor(`${ny}-${String(mm).padStart(2, '0')}-01`);
      return;
    }
    if (scale === 'year') {
      const [y, m, d] = anchor.split('-');
      setAnchor(`${Number(y) + dir}-${m}-${d}`);
      return;
    }
    setAnchor(store.shiftDay(anchor, dir * STEP[scale]));
  };

  /** Open the day itself: load its event if needed, then go to the film. */
  const openDay = (projectId: string) => {
    if (projectId !== store.currentProject.id) store.loadProject(projectId);
    onClose();
    requestAnimationFrame(() => {
      document.getElementById('jour-j')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const zoomTo = (nextScale: Scale, date: string) => { setAnchor(date); setScale(nextScale); };

  return (
    <div className="wc-calendar-studio" style={overlay} role="dialog" aria-modal="true" aria-label="Calendrier" data-cal="studio">
      <div className="wc-calendar-surface" style={surface}>
        <div className="wc-calendar-head" style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <span style={eyebrow}>Calendrier</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={ghost} data-cal="close">Fermer</button>
        </div>

        {/* ------------------------------------------------------ THE SCALE */}
        <div style={headRow}>
          <button onClick={() => move(-1)} style={arrow} aria-label="Période précédente" data-cal="prev">←</button>
          <h2 style={title} data-cal="label">{range.label}</h2>
          <button onClick={() => move(1)} style={arrow} aria-label="Période suivante" data-cal="next">→</button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 18 }}>
          {SCALES.map((s) => (
            <button
              key={s.id}
              onClick={() => setScale(s.id)}
              style={{ ...chip, opacity: scale === s.id ? 1 : 0.5, borderColor: scale === s.id ? '#f6f5f3' : 'rgba(246,245,243,0.24)' }}
              data-cal="scale"
              data-scale={s.id}
              aria-pressed={scale === s.id}
            >
              {s.label}
            </button>
          ))}
          <button onClick={() => setAnchor(store.today())} style={chip} data-cal="today">Aujourd’hui</button>
        </div>

        <p style={{ ...muted, marginTop: 14, maxWidth: 620 }}>
          {busy.length === 0
            ? 'Rien n’est prévu sur cette période.'
            : `${busy.length} jour${busy.length > 1 ? 's' : ''} occupé${busy.length > 1 ? 's' : ''} sur cette période. Ouvrez-en un pour voir sa pellicule.`}
        </p>

        {/* ------------------------------------------------------- THE YEAR */}
        {scale === 'year' && (
          <section style={block} data-cal="year">
            <ul style={list}>
              {MONTHS.map((name, i) => {
                const month = `${range.from.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`;
                const inMonth = busy.filter((d) => d.date.startsWith(month));
                const events = new Set(inMonth.flatMap((d) => d.entries.map((e) => e.projectId)));
                return (
                  <li key={name} style={monthRow} data-cal="month-row" data-month={month}>
                    <button
                      style={rowBtn}
                      onClick={() => zoomTo('month', `${month}-01`)}
                      data-cal="open-month"
                    >
                      <span style={monthName}>{name}</span>
                      <span style={muted}>
                        {events.size === 0
                          ? 'rien de prévu'
                          : `${events.size} événement${events.size > 1 ? 's' : ''} · ${inMonth.length} jour${inMonth.length > 1 ? 's' : ''}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------ THE MONTH */}
        {scale === 'month' && (
          <section style={block} data-cal="month">
            {/* A discreet rail: every day of the month, the occupied ones lit.
                Not a grid of cells — a ruler, like the film's own scale. */}
            <div className="wc-cal-rail" data-cal="rail">
              {days.map((d) => (
                <button
                  key={d.date}
                  className={`wc-cal-tick${d.entries.length ? ' is-busy' : ''}${d.isToday ? ' is-today' : ''}`}
                  onClick={() => zoomTo('day', d.date)}
                  title={`${store.longDayLabel(d.date)}${d.entries.length ? ` — ${d.entries.map((e) => e.projectName).join(', ')}` : ''}`}
                  data-cal="tick"
                  data-busy={d.entries.length ? 'yes' : 'no'}
                >
                  <span>{Number(d.date.slice(8, 10))}</span>
                </button>
              ))}
            </div>

            {busy.length === 0 ? (
              <EmptyDay label="Ce mois-ci" />
            ) : (
              <ul style={list}>
                {busy.map((d) => (
                  <DayRow key={d.date} day={d} onOpen={openDay} onZoom={() => zoomTo('day', d.date)} />
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ------------------------------------------------------- THE WEEK */}
        {scale === 'week' && (
          <section style={block} data-cal="week">
            <ul style={list}>
              {days.map((d) => (
                <li key={d.date} style={weekRow} data-cal="week-day" data-date={d.date}>
                  <div style={weekHead}>
                    <span style={{ ...weekName, opacity: d.isToday ? 1 : 0.72 }}>
                      {WEEKDAYS[d.weekday - 1]}
                    </span>
                    <span style={{ ...muted, fontFamily: typography.family.mono }}>
                      {Number(d.date.slice(8, 10))} {MONTHS[Number(d.date.slice(5, 7)) - 1]}
                      {d.isToday && ' · aujourd’hui'}
                    </span>
                  </div>
                  {d.entries.length === 0 ? (
                    <div style={{ ...muted, paddingLeft: 2 }} data-cal="empty-day">Rien de prévu.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {d.entries.map((e) => (
                        <Entry key={`${e.projectId}-${e.part}`} entry={e} onOpen={openDay} />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* -------------------------------------------------------- THE DAY */}
        {scale === 'day' && (
          <section style={block} data-cal="day">
            {days[0]?.entries.length ? (
              <div style={{ display: 'grid', gap: 16 }}>
                {days[0].entries.map((e) => (
                  <Entry key={`${e.projectId}-${e.part}`} entry={e} onOpen={openDay} big />
                ))}
              </div>
            ) : (
              <EmptyDay label="Cette journée" />
            )}
          </section>
        )}

        {/* --------------------------------------------- ONE PERSON'S WEEKS */}
        <section style={{ ...block, borderTop: '1px solid rgba(246,245,243,0.16)', paddingTop: 34 }} data-cal="agenda">
          <div style={eyebrow}>L’agenda d’une personne</div>
          <p style={{ ...muted, marginTop: 8, maxWidth: 620 }}>
            Dérivé de la pellicule, jamais saisi deux fois. Entre deux événements, la
            même personne est reconnue <strong>par son nom</strong> : ces lignes-là
            sont à confirmer.
          </p>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            style={select}
            aria-label="Choisir une personne"
            data-cal="person"
          >
            <option value="">Choisir une personne…</option>
            {store.persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.craft?.role ? `${p.displayName} · ${p.craft.role}` : p.displayName}
              </option>
            ))}
          </select>

          {personId && (
            agenda.length === 0 ? (
              <p style={{ ...muted, marginTop: 14 }} data-cal="agenda-empty">
                Cette personne n’est attendue nulle part sur cette période.
              </p>
            ) : (
              <ul style={list}>
                {agenda.map((row) => (
                  <li key={`${row.projectId}-${row.date}`} style={agendaRow} data-cal="agenda-row">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: typography.family.mono, fontSize: 12 }}>{row.date}</span>
                      <span style={{ fontWeight: 600 }}>{row.projectName}</span>
                      <span style={muted}>{clock(row.firstHour)} → {clock(row.lastHour)}</span>
                    </div>
                    <div style={{ ...muted, marginTop: 4 }}>
                      {row.moments.map((m) => `${clock(m.startHour)} ${m.name}`).join(' · ')}
                    </div>
                    {row.matchedByName && (
                      <div style={{ ...muted, marginTop: 4, color: '#e0a06a' }} data-cal="agenda-name-match">
                        Autre événement, rapproché sur le nom seul — à confirmer.
                      </div>
                    )}
                    <button style={{ ...linkBtn, marginTop: 6 }} onClick={() => openDay(row.projectId)}>
                      Ouvrir cette journée
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </section>

        <p style={{ ...muted, marginTop: 40, maxWidth: 640 }} data-cal="honesty">
          Le Calendrier ne conserve aucune heure : il lit vos événements et leurs
          moments. Une journée se construit sur la pellicule, et se relit ici.
        </p>
      </div>
    </div>
  );
}

/** One day of a month list: the date, then what it carries. */
function DayRow({ day, onOpen, onZoom }: {
  day: ReturnType<typeof weddingStore.calendarDays>[number];
  onOpen: (projectId: string) => void;
  onZoom: () => void;
}) {
  const store = weddingStore;
  return (
    <li style={dayRow} data-cal="day-row" data-date={day.date}>
      <button style={dayHead} onClick={onZoom} data-cal="open-day-scale">
        <span style={dayNumber}>{Number(day.date.slice(8, 10))}</span>
        <span style={{ ...muted, textTransform: 'capitalize' }}>
          {store.longDayLabel(day.date).split(' ')[0]}
          {day.isToday && ' · aujourd’hui'}
        </span>
      </button>
      <div style={{ display: 'grid', gap: 10, flex: 1 }}>
        {day.entries.map((e) => <Entry key={`${e.projectId}-${e.part}`} entry={e} onOpen={onOpen} />)}
      </div>
    </li>
  );
}

/** One event on one day — and the door to its film. */
function Entry({ entry, onOpen, big }: {
  entry: ReturnType<typeof weddingStore.calendarDays>[number]['entries'][number];
  onOpen: (projectId: string) => void;
  big?: boolean;
}) {
  return (
    <article style={big ? entryBig : entryCard} data-cal="entry" data-project={entry.projectId} data-part={entry.part}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: typography.family.mono, fontSize: big ? 16 : 12 }}>
          {clock(entry.firstHour)}
        </span>
        <span style={{ fontWeight: 600, fontSize: big ? 26 : typography.editorial.body, letterSpacing: '-0.01em' }}>
          {entry.projectName}
        </span>
        <span style={kindTag}>{entry.typeLabel}</span>
        {entry.isCurrent && <span style={{ ...kindTag, borderColor: '#f6f5f3' }}>ouvert</span>}
        {entry.isDemo && <span style={{ ...kindTag, borderColor: '#e0a06a', color: '#e0a06a' }}>démonstration</span>}
        {entry.part === 'overnight' && (
          <span style={{ ...kindTag, borderColor: '#e0a06a', color: '#e0a06a' }} data-cal="overnight">
            suite de la veille
          </span>
        )}
      </div>
      <div style={{ ...muted, marginTop: 6 }}>
        {entry.headline ? `${entry.headline} · ` : ''}
        {entry.moments} moment{entry.moments > 1 ? 's' : ''}
        {entry.people > 0 && ` · ${entry.people} personne${entry.people > 1 ? 's' : ''}`}
        {entry.place && ` · ${entry.place}`}
        {entry.unconfirmedHours > 0 && ` · ${entry.unconfirmedHours} horaire${entry.unconfirmedHours > 1 ? 's' : ''} à confirmer`}
      </div>
      <button style={{ ...openBtn, marginTop: 10 }} onClick={() => onOpen(entry.projectId)} data-cal="open-timeline">
        Ouvrir la journée <span aria-hidden>→</span>
      </button>

      {/* CALENDRIER → 18 JUILLET → CÉRÉMONIE → le moment lui-même.
          Only for the event already open: reading another event's moments would
          mean loading it, and a list should never do that behind one's back. */}
      {big && entry.isCurrent && entry.moments > 0 && (
        <ul style={momentList} data-cal="day-moments">
          {weddingStore.phases
            .slice()
            .sort((a, b) => a.startHour - b.startHour)
            .map((phase) => (
              <li key={phase.id}>
                <button
                  style={momentBtn}
                  onClick={() => {
                    weddingStore.openMoment(phase.id, entry.projectId);
                    onOpen(entry.projectId);
                  }}
                  data-cal="open-moment"
                  data-phase={phase.id}
                >
                  <span style={{ fontFamily: typography.family.mono, fontSize: 12 }}>
                    {clock(phase.startHour)}
                  </span>
                  <span>{phase.name}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </article>
  );
}

function EmptyDay({ label }: { label: string }) {
  const store = weddingStore;
  return (
    <div style={emptyBox} data-cal="empty">
      <div style={{ fontSize: typography.editorial.body, fontWeight: 600 }}>{label}, rien n’est prévu.</div>
      <p style={{ ...muted, marginTop: 8 }}>
        Une journée vide n’a pas à le rester : décrivez ce que vous devez organiser et
        le produit vous proposera une première structure, entièrement marquée ESTIMÉ.
      </p>
      <button style={{ ...openBtn, marginTop: 12 }} onClick={() => store.startWeddingCreation()} data-cal="create">
        Organiser une journée <span aria-hidden>→</span>
      </button>
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

const headRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap',
};

const title: React.CSSProperties = {
  margin: 0, fontSize: 'clamp(28px, 5vw, 58px)', letterSpacing: '-0.035em',
  fontWeight: typography.weight.semibold, lineHeight: 1.03, textTransform: 'capitalize',
};

const muted: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: 'rgba(246,245,243,0.66)', lineHeight: 1.6,
};

const block: React.CSSProperties = { marginTop: 34 };

const list: React.CSSProperties = { listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 18 };

const monthRow: React.CSSProperties = { borderBottom: '1px solid rgba(246,245,243,0.12)', paddingBottom: 14 };

const monthName: React.CSSProperties = {
  fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: typography.weight.semibold,
  letterSpacing: '-0.02em', textTransform: 'capitalize',
};

const rowBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: 'inherit',
  border: 'none', padding: 0, font: 'inherit', width: '100%', textAlign: 'left',
  display: 'flex', gap: 14, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap',
};

const dayRow: React.CSSProperties = { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' };

const dayHead: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: 'inherit',
  border: 'none', padding: 0, font: 'inherit', textAlign: 'left',
  display: 'grid', gap: 2, minWidth: 92,
};

const dayNumber: React.CSSProperties = {
  fontSize: 34, fontWeight: typography.weight.semibold, letterSpacing: '-0.03em',
  fontFamily: typography.family.mono, lineHeight: 1,
};

const weekRow: React.CSSProperties = {
  borderTop: '1px solid rgba(246,245,243,0.12)', paddingTop: 14, display: 'grid', gap: 10,
};

const weekHead: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' };

const weekName: React.CSSProperties = {
  fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: typography.weight.semibold,
  letterSpacing: '-0.02em', textTransform: 'capitalize',
};

const entryCard: React.CSSProperties = {
  borderLeft: '2px solid rgba(246,245,243,0.3)', paddingLeft: 14,
};

const entryBig: React.CSSProperties = {
  borderLeft: '3px solid #f6f5f3', paddingLeft: 18,
};

const agendaRow: React.CSSProperties = {
  borderLeft: '2px solid rgba(246,245,243,0.24)', paddingLeft: 14,
  fontSize: typography.editorial.caption,
};

const momentList: React.CSSProperties = {
  listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 6,
};

const momentBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: 'none', borderBottom: '1px solid rgba(246,245,243,0.12)',
  padding: '6px 0', font: 'inherit', fontSize: 13, textAlign: 'left', width: '100%',
  display: 'flex', gap: 12, alignItems: 'baseline',
};

const emptyBox: React.CSSProperties = {
  marginTop: 18, padding: '22px 24px', border: '1px solid rgba(246,245,243,0.18)',
};

const chip: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.24)', borderRadius: 999,
  padding: '7px 16px', fontSize: 11, fontFamily: typography.family.sans,
  letterSpacing: '0.08em', textTransform: 'uppercase',
};

const kindTag: React.CSSProperties = {
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '2px 9px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const arrow: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  width: 40, height: 40, fontSize: 15, flex: '0 0 auto',
};

const openBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: '#f6f5f3', color: '#08090b',
  border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 12,
  fontWeight: typography.weight.semibold, fontFamily: typography.family.sans,
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

const select: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', marginTop: 14,
  background: 'rgba(246,245,243,0.06)', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '9px 16px', fontSize: 12, fontFamily: typography.family.sans, maxWidth: '100%',
};
