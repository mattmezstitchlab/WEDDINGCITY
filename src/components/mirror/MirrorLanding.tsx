import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { getStoredProjects } from '../../game/persistence';
import { typography } from '../../design/tokens';
import { GRAND_JOUR_HERO, DEMO_DAY, MOMENT_ASSETS } from '../../design/momentImagery';
import { PRODUCT_NAME, PRODUCT_MARK, PRODUCT_TAGLINE } from '../../design/productIdentity';
import { EVENT_TYPES, eventType, type EventTypeId } from '../../design/eventTypes';
import {
  IconCocktail, IconPhoto, IconBanquet, IconMusic, IconSliders, IconBrunch,
  IconMairie, IconUser, IconDocument, IconPlanner,
} from '../ui/Icons';
import {
  EDITORIAL_PEOPLE, EDITORIAL_TRACKS, EDITORIAL_DISCLAIMER,
  SPECTACLE_VISUALS, SPECTACLE_CRAFTS,
} from '../../design/editorialRegistry';
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

// AUDITED: the product surfaces spoke in emojis while a thin, coherent icon
// set already existed in ui/Icons and was used only by the retired World
// screens. Two icon languages, and the product used the worse one. There is
// one now — the existing one. No second set was created.
const CAUSALITY: { Icon: React.FC<{ size?: number; color?: string }>; label: string; from: string; to: string }[] = [
  { Icon: IconCocktail, label: 'Cocktail', from: '17:30', to: '18:00' },
  { Icon: IconPhoto, label: 'Photos de groupe', from: '17:45', to: '18:15' },
  { Icon: IconBanquet, label: 'Dîner', from: '19:30', to: '20:00' },
  { Icon: IconMusic, label: 'Playlist du dîner', from: '19:30', to: '20:00' },
  { Icon: IconSliders, label: 'DJ — arrivée', from: '21:00', to: '21:30' },
  { Icon: IconBrunch, label: 'Traiteur — service', from: '19:00', to: '19:30' },
];

/**
 * The two rails of the scenario demonstration. Positions come from the same
 * 08:00 → 03:00 span the film uses, so the geometry is the real geometry of a
 * day rather than a decorative bar.
 */
const RAIL_START = 8;
const RAIL_END = 27;
const railBlock = (hour: number, end: number, label: string, changed = false) => ({
  label,
  hour: `${String(Math.floor(hour) % 24).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`,
  left: ((hour - RAIL_START) / (RAIL_END - RAIL_START)) * 100,
  width: Math.max(((end - hour) / (RAIL_END - RAIL_START)) * 100, 8),
  changed,
});

const SCENARIO_RAILS = {
  real: [
    railBlock(11, 12.5, 'Cérémonie'),
    railBlock(17.5, 19.5, 'Cocktail'),
    railBlock(19.5, 21, 'Dîner'),
    railBlock(23.5, 27, 'Party'),
  ],
  planB: [
    railBlock(11, 12.5, 'Cérémonie'),
    railBlock(17.5, 19.5, 'Cocktail · orangerie', true),
    railBlock(20, 21.5, 'Dîner', true),
    railBlock(23.5, 27, 'Party'),
  ],
};

const LEGACY_SCENARIOS = [
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

      {/* ================================================== 02 IMPORTER LE CHAOS */}
      <section className="wc-gj-cols" aria-label="Importer le chaos" data-landing="chaos">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">02</span>
          <h2 className="wc-gj-h2">Donnez-nous votre chaos.</h2>
          <p className="wc-gj-sub">
            Une phrase écrite à la va-vite, un contrat, un planning, une liste
            d’invités, une fiche technique. Le même moteur lit tout, et vous
            montre ce qu’il a compris avant de créer quoi que ce soit.
          </p>
        </div>

        <div className="wc-gj-chaos" data-landing="chaos-demo">
          <div className="wc-gj-chaos-in">
            <div className="wc-gj-chaos-label">Ce que vous donnez</div>
            <p className="wc-gj-chaos-quote">
              « Je prépare un mariage le 18 juillet 2027. Cérémonie à 11h,
              cocktail à 17h, dîner à 20h. Nous avons un DJ, un saxophoniste et
              un photographe. »
            </p>
            <div className="wc-gj-chaos-files">
              <span>contrat.pdf</span>
              <span>planning.csv</span>
              <span>liste-invités.csv</span>
              <span>fiche-technique.txt</span>
            </div>
          </div>

          <div className="wc-gj-chaos-out">
            <div className="wc-gj-chaos-label">Ce que nous en comprenons</div>
            <ul className="wc-gj-chaos-lines">
              {[
                ['Date', '18 juillet 2027', 'CONFIRMÉ'],
                ['Moments', 'Cérémonie · Cocktail · Dîner', 'CONFIRMÉ'],
                ['Fin du dîner', 'déduite du moment suivant', 'DÉDUIT'],
                ['Durée du cocktail', 'proposée pour commencer', 'ESTIMÉ'],
                ['Lieu', 'reconnu, jamais supposé', 'À CONFIRMER'],
                ['Les mariés', 'rien ne sera deviné', 'MANQUANT'],
              ].map(([label, value, level]) => (
                <li key={label} data-landing="chaos-line" data-level={level}>
                  <span className="wc-gj-chaos-key">{label}</span>
                  <span className="wc-gj-chaos-val">{value}</span>
                  <b className={`wc-gj-level is-${level === 'CONFIRMÉ' ? 'ok' : level === 'DÉDUIT' ? 'soft' : level === 'MANQUANT' ? 'bad' : 'warn'}`}>{level}</b>
                </li>
              ))}
            </ul>
            <p className="wc-gj-note">
              Cinq niveaux de certitude, et pas un de plus. Rien n’est jamais
              affirmé plus fort que ce qui a été lu.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== 02 TIMELINE */}
      <section id="film" className="wc-gj-film" aria-label="La pellicule">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">03</span>
          <h2 className="wc-gj-h2">La journée devient une histoire dans le temps.</h2>
          <p className="wc-gj-sub">
            Faites-la glisser dans les deux sens, zoomez, ouvrez une scène.
            C’est l’interface dans laquelle vous construirez la vôtre.
          </p>
          <div className="wc-gj-demo-head" data-landing="demo-head">
            <span className="wc-gj-demo-couple">MATT &amp; ÉMILIE</span>
            <span className="wc-gj-demo-date">18 JUILLET 2027</span>
            <span className="wc-gj-demo-tag">démonstration</span>
          </div>
        </div>

        <LandingFilm shifted={shifted} onOpenMoment={(i) => setOpenMoment(i)} />

        {/* CAUSALITÉ — 04. PRODUCT DECISION: the brief recommends causality as
            its own sequence, after the documents. It stays here instead, inside
            the film sequence: the whole point of the demonstration is that the
            consequence is read ON the film, without scrolling away from it. It
            carries its own index, so the page still reads as one linear story. */}
        <div className="wc-gj-section-head" style={{ marginTop: 48 }}>
          <span className="wc-gj-index">04</span>
          <h2 className="wc-gj-h2">Une heure change. Tout ce qui en dépend change avec elle.</h2>
          <p className="wc-gj-sub">
            Décaler un moment ne décale pas un rectangle : cela décale le
            photographe, le saxophoniste, le traiteur, et les moments qui
            suivent. Le produit vous montre qui bouge, et ce que cela casse,
            avant d’appliquer quoi que ce soit.
          </p>
        </div>
        <div className="wc-gj-causality" data-landing="causality">
          <button
            onClick={() => setShifted(shifted ? null : { from: 3, delta: 0.5 })}
            className="wc-gj-cta"
            data-landing="propagate"
          >
            {shifted ? 'Revenir en arrière' : 'Décaler le cocktail de 30 min'}
          </button>
          <div className="wc-gj-causality-lines">
            {CAUSALITY.map((c) => (
              <span key={c.label} className={`wc-gj-causality-item${shifted ? ' is-shifted' : ''}`} data-landing="cascade-item">
                <c.Icon size={14} color="currentColor" />
                <span>{c.label}</span>
                <b>{shifted ? c.to : c.from}</b>
                {shifted && <em>+30 min</em>}
              </span>
            ))}
          </div>
          {shifted && (
            <p className="wc-gj-note" data-landing="propagate-note">
              5 moments recalculés sur la pellicule, et rien d’autre n’a bougé.
            </p>
          )}
        </div>
      </section>

      {/* ======================================================= 03 SCÉNARIOS */}
      <section className="wc-gj-cols" aria-label="Scénarios">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">05</span>
          <h2 className="wc-gj-h2">Testez la pluie sans casser la journée.</h2>
          <p className="wc-gj-sub">
            Un scénario est une journée parallèle : on y décale, on y change de
            salle, on compare. La journée réelle ne bouge que si on l’applique.
          </p>
        </div>
        <div className="wc-gj-rails" data-landing="scenarios">
          <div className="wc-gj-rail-label">Journée réelle</div>
          <div className="wc-gj-rail" data-landing="rail">
            {SCENARIO_RAILS.real.map((m) => (
              <span key={m.label} className="wc-gj-rail-block" style={{ left: `${m.left}%`, width: `${m.width}%` }}>
                <b>{m.hour}</b><span>{m.label}</span>
              </span>
            ))}
          </div>
          <div className="wc-gj-rail-label">
            Plan B — pluie <span>3 moments différents</span>
          </div>
          <div className="wc-gj-rail" data-landing="rail">
            {SCENARIO_RAILS.planB.map((m) => (
              <span
                key={m.label}
                className={`wc-gj-rail-block${m.changed ? ' is-changed' : ''}`}
                style={{ left: `${m.left}%`, width: `${m.width}%` }}
              >
                <b>{m.hour}</b><span>{m.label}</span>
              </span>
            ))}
          </div>
          <ul className="wc-gj-rail-diff" data-landing="scenario-lines">
            <li>Cocktail — jardin → orangerie</li>
            <li>Photos de groupe — 17:45 → 18:15</li>
            <li>Dîner — 19:30 → 20:00</li>
          </ul>
          <p className="wc-gj-fineprint">
            {EDITORIAL_DISCLAIMER} Dans votre événement, ces deux rails sont
            calculés depuis vos propres moments, et vous appliquez ligne par
            ligne ou tout à la fois.
          </p>
        </div>
      </section>

      {/* ======================================================= 07 DOCUMENTS */}
      <section className="wc-gj-cols" aria-label="Documents">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">06</span>
          <h2 className="wc-gj-h2">Le contrat vit à l’heure qu’il concerne.</h2>
          <p className="wc-gj-sub">
            Un document n’est pas rangé dans un dossier : il est accroché au
            moment, au prestataire ou à la tâche qu’il concerne — et la
            recherche le retrouve avec son contexte.
          </p>
        </div>
        <div className="wc-gj-docs" data-landing="documents">
          {[
            { hour: '17:30', moment: 'Cocktail', docs: ['Plan traiteur', 'Horaires de service', 'Contact DJ'] },
            { hour: '19:30', moment: 'Dîner', docs: ['Contrat traiteur', 'Menu', 'Plan de salle'] },
            { hour: '21:00', moment: 'Première danse', docs: ['Fiche technique DJ', 'Playlist validée'] },
          ].map((row) => (
            <article key={row.hour} className="wc-gj-doc-row" data-landing="doc-row">
              <span className="wc-gj-doc-hour">{row.hour}</span>
              <span className="wc-gj-doc-moment">{row.moment}</span>
              <span className="wc-gj-doc-list">
                {row.docs.map((d) => (
                  <span key={d} className="wc-gj-doc-chip">
                    <IconDocument size={12} color="currentColor" /> {d}
                  </span>
                ))}
              </span>
            </article>
          ))}
          <p className="wc-gj-fineprint">{EDITORIAL_DISCLAIMER}</p>
        </div>
      </section>

      {/* ======================================================= 03 SPECTACLE */}
      <section className="wc-gj-spectacle" aria-label="Ceux qui donnent vie au moment" data-landing="spectacle">
        <img
          src={SPECTACLE_VISUALS.danseuse.src}
          alt={SPECTACLE_VISUALS.danseuse.alt}
          width={SPECTACLE_VISUALS.danseuse.width}
          height={SPECTACLE_VISUALS.danseuse.height}
          loading="lazy"
          decoding="async"
          className="wc-gj-spectacle-img"
        />
        <div className="wc-gj-spectacle-scrim" aria-hidden />
        <div className="wc-gj-spectacle-body">
          <span className="wc-gj-index">07</span>
          <h2 className="wc-gj-spectacle-title">Un moment ne se produit jamais par hasard.</h2>
          <p className="wc-gj-spectacle-lead">
            Des artistes. Des techniciens. Des prestataires.
            Des dizaines de personnes. Une seule pellicule.
          </p>
          <div className="wc-gj-crafts" data-landing="crafts">
            {SPECTACLE_CRAFTS.map((c) => <span key={c} className="wc-gj-craft">{c}</span>)}
          </div>
          <button
            onClick={() => document.getElementById('film')?.scrollIntoView({ behavior: 'smooth' })}
            className="wc-gj-cta"
            data-landing="crew-cta"
          >
            Découvrir l’équipe du jour <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      {/* ---- what a crew really needs, hour by hour — same sequence ---- */}
      <div className="wc-gj-cols" aria-label="Feuilles de route">
        <div className="wc-gj-section-head">
          <h2 className="wc-gj-h2">Chacun reçoit sa propre journée.</h2>
          <p className="wc-gj-sub">
            Le saxophoniste voit son arrivée, sa balance et ses deux passages.
            L’éclairagiste voit son montage et son démontage. Personne ne
            recopie une heure : tout est calculé depuis la pellicule, donc tout
            se recale quand un moment bouge.
          </p>
        </div>
        <div className="wc-gj-callsheets" data-landing="callsheets">
          {[
            {
              role: 'Saxophoniste', img: SPECTACLE_VISUALS.musicien,
              rows: [['17:00', 'Arrivée et installation'], ['17:30', 'Cocktail'], ['21:00', 'Première danse'], ['21:30', 'Démontage']],
            },
            {
              role: 'Technicienne lumière', img: SPECTACLE_VISUALS.regie,
              rows: [['14:00', 'Montage plateau'], ['17:30', 'Cocktail'], ['19:30', 'Dîner'], ['23:30', 'Party'], ['01:00', 'Démontage']],
            },
            {
              role: 'Régie générale', img: SPECTACLE_VISUALS.coulisses,
              rows: [['08:00', 'Ouverture du lieu'], ['11:00', 'Cérémonie'], ['19:30', 'Dîner'], ['02:00', 'Fermeture']],
            },
          ].map((sheet) => (
            <article key={sheet.role} className="wc-gj-callsheet" data-landing="callsheet">
              <img
                src={sheet.img.src}
                alt={sheet.img.alt}
                width={sheet.img.width}
                height={sheet.img.height}
                loading="lazy"
                decoding="async"
                className="wc-gj-callsheet-img"
              />
              <div className="wc-gj-callsheet-body">
                <div className="wc-gj-callsheet-role">{sheet.role}</div>
                <ol className="wc-gj-callsheet-rows">
                  {sheet.rows.map(([h, label]) => (
                    <li key={h}><b>{h}</b><span>{label}</span></li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
          <p className="wc-gj-fineprint">
            {EDITORIAL_DISCLAIMER} Dans votre événement, ces feuilles sont
            dérivées de vos moments — et le statut d’intermittent, les besoins
            techniques ou le cachet ne s’affichent que si vous les renseignez.
          </p>
        </div>
      </div>

      {/* ========================================================= 05 MUSIQUE */}
      <section className="wc-gj-cols" aria-label="La musique devient le temps">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">08</span>
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
          <span className="wc-gj-index">09</span>
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
        index="10"
        title="Les relations deviennent spatiales."
        body="Les tables sont des objets, pas des cellules. On porte un invité d’une table à l’autre, la table pleine le dit, et le plan reste lié au dîner : changer l’heure du repas ne casse pas le placement."
        asset={MOMENT_ASSETS.diner}
        reverse
      />

      {/* ========================================== 11 ADMINISTRATION INVISIBLE */}
      <section className="wc-gj-cols" aria-label="Administration invisible" data-landing="administration">
        <div className="wc-gj-section-head">
          <span className="wc-gj-index">11</span>
          <h2 className="wc-gj-h2">L’administration ne devrait jamais se voir.</h2>
          <p className="wc-gj-sub">
            Celui qui vit sa journée voit sa journée. Celui qui pilote quinze
            événements, trente artistes et deux cents documents dispose d’une
            base de contrôle — la même donnée, lue autrement. Aucune seconde
            application, aucun second stockage.
          </p>
        </div>

        <div className="wc-gj-admin" data-landing="admin-demo">
          <div className="wc-gj-admin-col">
            <div className="wc-gj-chaos-label">Ce que voient les mariés</div>
            <ul className="wc-gj-admin-list">
              <li>Leur pellicule</li>
              <li>Leurs personnes</li>
              <li>Leurs documents</li>
              <li>Leur musique</li>
            </ul>
          </div>
          <div className="wc-gj-admin-col">
            <div className="wc-gj-chaos-label">Ce que voit celui qui pilote</div>
            <ul className="wc-gj-admin-list">
              <li>Tous les événements, une seule recherche</li>
              <li>Ce qui attend une décision, par événement</li>
              <li>Une personne et tous ses événements</li>
              <li>Les documents manquants, là où ils manquent</li>
            </ul>
          </div>
        </div>
        <p className="wc-gj-fineprint">
          Les rapprochements d’une même personne entre deux événements se font
          sur le nom, et sont toujours présentés comme à confirmer. La recherche
          Web et l’envoi de documents ne sont pas disponibles dans cet
          environnement : ils ne sont pas simulés.
        </p>
      </section>

      {/* ========================================================= 10 ÉDITION */}
      <SectionWithImage
        index="12"
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
          <span className="wc-gj-index">13</span>
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
  { Icon: IconMairie, label: 'Lieu' },
  { Icon: IconUser, label: 'Personnes' },
  { Icon: IconPhoto, label: 'Prestataires' },
  { Icon: IconMusic, label: 'Musique' },
  { Icon: IconBanquet, label: 'Repas' },
  { Icon: IconDocument, label: 'Documents' },
  { Icon: IconPlanner, label: 'Notes' },
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
              <d.Icon size={13} color="currentColor" /> {d.label}
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
