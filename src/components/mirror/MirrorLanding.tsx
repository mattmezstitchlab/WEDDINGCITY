import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { getStoredProjects } from '../../game/persistence';
import { typography } from '../../design/tokens';
import { GRAND_JOUR_HERO, DEMO_DAY, MOMENT_ASSETS } from '../../design/momentImagery';
import { PRODUCT_NAME, PRODUCT_MARK, PRODUCT_TAGLINE } from '../../design/productIdentity';
import { EVENT_TYPES, eventType, type EventTypeId } from '../../design/eventTypes';
import { EDITORIAL_PEOPLE, EDITORIAL_TRACKS, EDITORIAL_DISCLAIMER } from '../../design/editorialRegistry';
import { LandingFilm } from './timeline/LandingFilm';
import { IntakeStudio } from './intake/IntakeStudio';
import './landing.css';

// ---------------------------------------------------------------------------
// LE GRAND JOUR® — the public page.
// ---------------------------------------------------------------------------
// Eleven sections, each one an innovation of the product SHOWN rather than
// described. The hero says the name and hands over a single field; the film
// arrives immediately; then causality, moments, music, people, seating,
// import, scenarios, editing, and a last full screen.
//
// THE LINE BETWEEN REAL AND DEMONSTRATION, drawn once:
//   • the weddings of this browser are real, and listed as such;
//   • everything shown on this page is a DEMONSTRATION of the interface. It
//     carries no name, no guest, no vendor, no price, and never touches
//     storage. Where a demonstration could be mistaken for data, it says so.
// ---------------------------------------------------------------------------

const CAUSALITY = [
  { icon: '🍸', label: 'Cocktail', from: '17:30', to: '18:00' },
  { icon: '📸', label: 'Photos de groupe', from: '17:45', to: '18:15' },
  { icon: '🍽️', label: 'Dîner', from: '19:30', to: '20:00' },
  { icon: '🎵', label: 'Playlist du dîner', from: '19:30', to: '20:00' },
  { icon: '🎚️', label: 'DJ — arrivée', from: '21:00', to: '21:30' },
  { icon: '👨‍🍳', label: 'Traiteur — service', from: '19:00', to: '19:30' },
];

const SCENARIOS = [
  {
    id: 'A', title: 'Plan A', subtitle: 'Beau temps',
    lines: ['Cocktail dans le jardin', 'Photos au belvédère', 'Dîner sous l’orangerie'],
  },
  {
    id: 'B', title: 'Plan B', subtitle: 'Pluie',
    lines: ['Cocktail à l’intérieur', 'Photos sous la galerie', 'Dîner décalé de 15 min', 'Le fleuriste installe plus tôt'],
  },
  {
    id: 'C', title: 'Plan C', subtitle: 'Retard de 45 min',
    lines: ['Cérémonie +45 min', 'Cocktail raccourci de 30 min', 'Dîner +15 min', 'Première danse inchangée'],
  },
];

export function MirrorLanding() {
  const store = weddingStore;
  const [projects, setProjects] = useState<ReturnType<typeof getStoredProjects>>([]);
  const [openMoment, setOpenMoment] = useState<number | null>(null);
  const [shifted, setShifted] = useState<{ from: number; delta: number } | null>(null);
  const [scenario, setScenario] = useState('A');
  // The music demonstration recomputes its own hours from real durations.
  const [stretch, setStretch] = useState(0);

  // the hero, as a tool
  const [brief, setBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<EventTypeId>('mariage');
  const [intakeOpen, setIntakeOpen] = useState(false);

  useEffect(() => { setProjects(getStoredProjects()); }, []);

  const create = () => store.startWeddingCreation();
  const start = () => (brief.trim() || files.length > 0 ? setIntakeOpen(true) : create());
  const schema = eventType(type);

  return (
    <div id="wc-mirror" className="wc-grandjour" data-landing="page">
      <a className="wc-skip" href="#film">Aller à la pellicule</a>

      {/* ============================================================ 01 HERO */}
      <header className="wc-gj-hero is-centered" data-landing="hero">
        <img
          src={GRAND_JOUR_HERO.src}
          alt={GRAND_JOUR_HERO.alt}
          width={GRAND_JOUR_HERO.width}
          height={GRAND_JOUR_HERO.height}
          loading="eager"
          decoding="async"
          className="wc-gj-hero-img"
        />
        <div className="wc-gj-hero-scrim" aria-hidden />

        <nav className="wc-gj-nav" aria-label="Navigation">
          <span className="wc-gj-wordmark">
            {PRODUCT_NAME}<span className="wc-gj-mark">{PRODUCT_MARK}</span>
          </span>
          <span style={{ flex: 1 }} />
          {projects.length > 0 && (
            <button
              onClick={() => document.getElementById('mes-mariages')?.scrollIntoView({ behavior: 'smooth' })}
              className="wc-gj-nav-link"
            >
              Mes événements
            </button>
          )}
        </nav>

        <div className="wc-gj-hero-center">
          <h1 className="wc-gj-title">
            {PRODUCT_NAME}<span className="wc-gj-mark">{PRODUCT_MARK}</span>
          </h1>
          <p className="wc-gj-signature">{PRODUCT_TAGLINE}</p>

          {/* One field. A type. An import. Nothing else. */}
          <div className="wc-gj-bar" data-landing="tool">
            <input
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') start(); }}
              placeholder="Dites-nous ce que vous devez organiser…"
              aria-label="Décrivez votre événement"
              className="wc-gj-bar-field"
              data-landing="brief"
            />
            <label className="wc-gj-bar-import" data-landing="import-label">
              <span aria-hidden>+</span>
              <span className="wc-gj-bar-import-text">Importer</span>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
                style={{ display: 'none' }}
                data-landing="files"
              />
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventTypeId)}
              aria-label="Type d’événement"
              className="wc-gj-bar-type"
              data-landing="type"
            >
              {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button onClick={start} className="wc-gj-bar-go" data-landing="hero-create" aria-label="Commencer">
              <span aria-hidden>→</span>
            </button>
          </div>

          <p className="wc-gj-bar-hint" data-landing="hint">
            {files.length === 0
              ? schema.intakeLine
              : `${files.length} fichier${files.length > 1 ? 's' : ''} : ${files.map((f) => f.name).join(', ')}`}
          </p>
        </div>
      </header>

      {/* ======================================================== 02 TIMELINE */}
      <section id="film" className="wc-gj-film" aria-label="La pellicule">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">02</span>
          <h2 className="wc-gj-h2">La journée devient une histoire dans le temps.</h2>
          <p className="wc-gj-sub">
            Faites-la glisser dans les deux sens, zoomez, ouvrez une scène.
            C’est l’interface dans laquelle vous construirez la vôtre.
          </p>
        </div>
        <LandingFilm shifted={shifted} onOpenMoment={(i) => setOpenMoment(i)} />
      </section>

      {/* ======================================================= 03 CAUSALITÉ */}
      <section className="wc-gj-band" aria-label="Un changement, tout se recalcule">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">03</span>
          <h2 className="wc-gj-h2">Un changement. Tout se recalcule.</h2>
          <p className="wc-gj-sub">
            Décalez le cocktail d’une demi-heure : les photos, le dîner, la
            musique, le DJ et le traiteur suivent. Le produit propose, vous
            décidez — rien n’est réécrit sans vous.
          </p>
          <div className="wc-gj-actions">
            <button
              onClick={() => setShifted(shifted ? null : { from: 3, delta: 0.5 })}
              className="wc-gj-cta"
              data-landing="propagate"
            >
              {shifted ? 'Revenir en arrière' : '+30 min sur le cocktail'}
            </button>
            {shifted && <span className="wc-gj-note" data-landing="propagate-note">5 moments recalculés sur la pellicule.</span>}
          </div>
        </div>

        <ul className="wc-gj-cascade" data-landing="cascade">
          {CAUSALITY.map((c) => (
            <li key={c.label} className={`wc-gj-cascade-row${shifted ? ' is-shifted' : ''}`}>
              <span aria-hidden className="wc-gj-cascade-icon">{c.icon}</span>
              <span className="wc-gj-cascade-label">{c.label}</span>
              <span className="wc-gj-cascade-time">{shifted ? c.to : c.from}</span>
              {shifted && <span className="wc-gj-cascade-delta">+30 min</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* ========================================================= 04 MOMENTS */}
      <SectionWithImage
        index="04"
        title="Chaque instant devient une scène."
        body="Un moment n’est pas une ligne d’agenda : c’est un lieu, des personnes, des prestataires, une musique, un menu, des documents et des tâches — réunis à l’heure qui les concerne, et modifiables là."
        asset={MOMENT_ASSETS.cocktail}
        action={{ label: 'Ouvrir une scène', onClick: () => setOpenMoment(3), tag: 'open-scene' }}
      />

      {/* ========================================================= 05 MUSIQUE */}
      <section className="wc-gj-cols" aria-label="La musique devient le temps">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">05</span>
          <h2 className="wc-gj-h2">La musique devient le temps.</h2>
          <p className="wc-gj-sub">
            Un morceau n’est pas une ligne de playlist : il a une durée, donc une
            heure de début et une heure de fin. Allongez le premier — tous les
            suivants se déplacent, comme sur la pellicule.
          </p>
          <div className="wc-gj-actions">
            <button
              onClick={() => setStretch(stretch === 0 ? 45 : 0)}
              className="wc-gj-cta"
              data-landing="music-stretch"
            >
              {stretch === 0 ? 'Allonger le premier morceau de 45 s' : 'Revenir à la durée d’origine'}
            </button>
            {stretch > 0 && (
              <span className="wc-gj-note" data-landing="music-note">
                2 morceaux recalculés — la fin de la séquence recule de 45 secondes.
              </span>
            )}
          </div>
        </div>

        <div className="wc-gj-tracks" data-landing="music">
          {(() => {
            // 21:00, then each track starts where the previous one ended.
            let cursor = 21 * 3600;
            return EDITORIAL_TRACKS.map((t, i) => {
              const seconds = t.seconds + (i === 0 ? stretch : 0);
              const start = cursor;
              cursor += seconds;
              const clock = (sec: number) => {
                const total = Math.round(sec / 60);
                return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
              };
              const length = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
              return (
                <article key={t.id} className="wc-gj-track" data-landing="track">
                  <img
                    src={t.cover.src}
                    alt={t.cover.alt}
                    width={t.cover.width}
                    height={t.cover.height}
                    loading="lazy"
                    decoding="async"
                    className="wc-gj-track-cover"
                  />
                  <span className="wc-gj-track-play" aria-hidden>▶</span>
                  <div className="wc-gj-track-text">
                    <div className="wc-gj-track-title">{t.title}</div>
                    <div className="wc-gj-track-artist">{t.artist}</div>
                    <div className="wc-gj-track-moment">{t.moment}</div>
                  </div>
                  <div className="wc-gj-track-times">
                    <span className="wc-gj-track-hour" data-landing="track-hour">{clock(start)}</span>
                    <span className="wc-gj-track-length">{length}</span>
                  </div>
                </article>
              );
            });
          })()}
          <p className="wc-gj-fineprint">
            {EDITORIAL_DISCLAIMER} Dans votre événement, la pochette et l’extrait
            n’apparaissent que si un vrai fichier ou une vraie source existe.
          </p>
        </div>
      </section>

      {/* ========================================================== 06 PEOPLE */}
      <section className="wc-gj-cols" aria-label="Chaque personne trouve sa place">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">06</span>
          <h2 className="wc-gj-h2">Chaque personne trouve sa place.</h2>
          <p className="wc-gj-sub">
            Une personne n’est pas une ligne dans un tableur : c’est un fil qui
            traverse la journée. On la suit d’un moment à l’autre, avec sa table,
            ses photos, et parfois son discours.
          </p>
        </div>
        <div className="wc-gj-people" data-landing="people">
          {EDITORIAL_PEOPLE.map((person) => (
            <article key={person.id} className="wc-gj-person" data-landing="person">
              <img
                src={person.portrait.src}
                alt={person.portrait.alt}
                width={person.portrait.width}
                height={person.portrait.height}
                loading="lazy"
                decoding="async"
                className="wc-gj-portrait"
              />
              <div className="wc-gj-person-body">
                <div className="wc-gj-person-role">{person.role}</div>
                <ol className="wc-gj-thread">
                  {person.thread.map((step) => (
                    <li key={step.hour}>
                      <span className="wc-gj-thread-hour">{step.hour}</span>
                      <span>{step.moment}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
          <p className="wc-gj-fineprint">
            {EDITORIAL_DISCLAIMER} Dans votre événement, ce sont vos visages et
            vos moments — et tant qu’une photo n’existe pas, des initiales.
          </p>
        </div>
      </section>

      {/* =================================================== 07 PLAN DE TABLE */}
      <SectionWithImage
        index="07"
        title="Les relations deviennent spatiales."
        body="Les tables sont des objets, pas des cellules. On porte un invité d’une table à l’autre, la table pleine le dit, et le plan reste lié au dîner : changer l’heure du repas ne casse pas le placement."
        asset={MOMENT_ASSETS.diner}
        reverse
      />

      {/* ========================================================== 08 IMPORT */}
      <section className="wc-gj-band" aria-label="Importez votre chaos">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">08</span>
          <h2 className="wc-gj-h2">Importez votre chaos.</h2>
          <p className="wc-gj-sub">
            Contrats, devis, listes, captures, playlists, notes. Tout est lu
            dans votre navigateur, rien n’est envoyé ailleurs, et rien n’est
            inventé : ce qui n’a pas été lu vous est demandé.
          </p>
        </div>
        <ol className="wc-gj-steps" data-landing="steps">
          {['Lecture', 'Analyse', 'Structuration', 'Vérification', 'Timeline'].map((s, i) => (
            <li key={s}><span>{String(i + 1).padStart(2, '0')}</span> {s}</li>
          ))}
        </ol>
      </section>

      {/* ======================================================= 09 SCÉNARIOS */}
      <section className="wc-gj-cols" aria-label="Scénarios">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">09</span>
          <h2 className="wc-gj-h2">Préparez le plan A, B et C.</h2>
          <p className="wc-gj-sub">
            Une journée parallèle, posée à côté de la vraie : la pluie, un
            retard, une salle changée. On regarde les conséquences sans rien
            casser, et on bascule seulement si cela arrive.
          </p>
        </div>
        <div className="wc-gj-scenarios" data-landing="scenarios">
          <div className="wc-gj-scenario-tabs" role="tablist" aria-label="Scénarios">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={scenario === s.id}
                onClick={() => setScenario(s.id)}
                className={`wc-gj-scenario-tab${scenario === s.id ? ' is-active' : ''}`}
                data-landing="scenario-tab"
              >
                {s.title} <span>{s.subtitle}</span>
              </button>
            ))}
          </div>
          <ul className="wc-gj-scenario-lines" data-landing="scenario-lines">
            {(SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0]).lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="wc-gj-fineprint">
            Démonstration de l’idée : dans votre événement, ces lignes seront
            calculées à partir de vos propres moments.
          </p>
        </div>
      </section>

      {/* ========================================================= 10 ÉDITION */}
      <SectionWithImage
        index="10"
        title="Construisez réellement votre journée."
        body="Pas une capture d’écran marketing : la pellicule de cette page est le composant que vous utiliserez. Glissez un moment, zoomez, ouvrez-le — c’est le même outil, avec vos données."
        asset={MOMENT_ASSETS.preparatifs}
        action={{ label: 'Revenir à la pellicule', onClick: () => document.getElementById('film')?.scrollIntoView({ behavior: 'smooth' }), tag: 'back-to-film' }}
      />

      {/* ================================================== MES ÉVÉNEMENTS */}
      {projects.length > 0 && (
        <section id="mes-mariages" className="wc-gj-weddings" aria-label="Mes événements">
          <div className="wc-gj-section-head">
            <h2 className="wc-gj-h2">Mes événements</h2>
          </div>
          <ul className="wc-gj-list">
            {projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => store.loadProject(p.id)} className="wc-gj-list-item">
                  <span className="wc-gj-list-name">{p.coupleNames || p.title}</span>
                  <span className="wc-gj-list-meta">
                    {p.isDemo ? 'démonstration' : p.locationName || ''}
                    <span aria-hidden style={{ marginLeft: 12 }}>→</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ======================================================= 11 SOUVENIRS */}
      <section className="wc-gj-closing" aria-label="Tout commence par un oui">
        <img
          src={MOMENT_ASSETS.bal.src}
          alt={MOMENT_ASSETS.bal.alt}
          width={MOMENT_ASSETS.bal.width}
          height={MOMENT_ASSETS.bal.height}
          loading="lazy"
          decoding="async"
          className="wc-gj-closing-img"
        />
        <div className="wc-gj-closing-scrim" aria-hidden />
        <div className="wc-gj-closing-body">
          <span className="wc-gj-index">11</span>
          {/* Universal by default — « un oui » only makes sense for a wedding,
              and a séminaire deserves its own sentence. */}
          <h2 className="wc-gj-closing-title" data-landing="closing-title">
            {type === 'mariage' ? 'Un mariage commence par un oui.' : 'Tout commence par un moment.'}
          </h2>
          <p className="wc-gj-closing-sub">
            {type === 'mariage'
              ? 'Puis vient le moment de tout imaginer — et, plus tard, celui de revoir la journée telle qu’elle a été vécue.'
              : 'Une idée, puis une heure, puis une histoire — et, plus tard, le souvenir de la journée telle qu’elle a été vécue.'}
          </p>
          <button
            onClick={() => { document.getElementById('wc-mirror')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="wc-gj-cta"
            data-landing="final-create"
          >
            Commencer <span aria-hidden>→</span>
          </button>
          <div className="wc-gj-footer">
            <span>{PRODUCT_NAME}{PRODUCT_MARK}</span>
            <span style={{ opacity: 0.6 }}>{PRODUCT_TAGLINE}</span>
          </div>
        </div>
      </section>

      {intakeOpen && (
        <IntakeStudio
          description={brief}
          files={files}
          projectType={type}
          onClose={() => setIntakeOpen(false)}
        />
      )}

      {openMoment !== null && (
        <DemoScene index={openMoment} onClose={() => setOpenMoment(null)} onCreate={create} />
      )}
    </div>
  );
}

/** An editorial section: one photograph, one idea, one optional action. */
function SectionWithImage({ index, title, body, asset, reverse, action }: {
  index: string; title: string; body: string;
  asset: { src: string; alt: string; width: number; height: number };
  reverse?: boolean;
  action?: { label: string; onClick: () => void; tag: string };
}) {
  return (
    <section className={`wc-gj-split${reverse ? ' is-reverse' : ''}`} aria-label={title}>
      <div className="wc-gj-split-text">
        <span className="wc-gj-index">{index}</span>
        <h2 className="wc-gj-h2">{title}</h2>
        <p className="wc-gj-sub">{body}</p>
        {action && (
          <button onClick={action.onClick} className="wc-gj-cta-ghost" data-landing={action.tag}>
            {action.label}
          </button>
        )}
      </div>
      <div className="wc-gj-split-img">
        <img src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} loading="lazy" decoding="async" />
      </div>
    </section>
  );
}

const MOMENT_DIMENSIONS = [
  { icon: '📍', label: 'Lieu' },
  { icon: '👥', label: 'Personnes' },
  { icon: '📸', label: 'Prestataires' },
  { icon: '🎵', label: 'Musique' },
  { icon: '🍽️', label: 'Repas' },
  { icon: '📄', label: 'Documents' },
  { icon: '📝', label: 'Notes' },
];

/**
 * A scene of the demonstration: what a moment holds, and deliberately not
 * invented content — no guest names, no vendor names, no counts.
 */
function DemoScene({ index, onClose, onCreate }: { index: number; onClose: () => void; onCreate: () => void }) {
  const m = DEMO_DAY[index] ?? DEMO_DAY[0];
  const asset = MOMENT_ASSETS[m.key];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const fmt = (h: number) => {
    const t = Math.round(h * 60);
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  return (
    <div className="wc-gj-scene" role="dialog" aria-modal="true" aria-label={`Scène ${m.label}`} data-landing="scene">
      <img src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} className="wc-gj-scene-img" />
      <div className="wc-gj-scene-scrim" aria-hidden />
      <button onClick={onClose} className="wc-gj-scene-close" data-landing="scene-close">Fermer</button>
      <div className="wc-gj-scene-body">
        <div className="wc-gj-scene-hour">{fmt(m.hour)}</div>
        <div className="wc-gj-scene-title">{m.label}</div>
        <div className="wc-gj-scene-range">{fmt(m.hour)} — {fmt(m.endHour)}</div>
        <div className="wc-gj-scene-dims">
          {MOMENT_DIMENSIONS.map((d) => (
            <span key={d.label} className="wc-gj-scene-dim">
              <span aria-hidden>{d.icon}</span> {d.label}
            </span>
          ))}
        </div>
        <p className="wc-gj-scene-note">
          Dans votre événement, chacune de ces lignes porte vos données — et
          s’édite ici même, sans quitter la scène. Cette démonstration n’en
          invente aucune.
        </p>
        <button onClick={onCreate} className="wc-gj-cta" data-landing="scene-create">
          Commencer <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
