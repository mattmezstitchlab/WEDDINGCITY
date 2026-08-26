import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { getStoredProjects } from '../../game/persistence';
import { GRAND_JOUR_HERO } from '../../design/momentImagery';
import { PRODUCT_NAME, PRODUCT_MARK, PRODUCT_TAGLINE } from '../../design/productIdentity';
import { EVENT_TYPES, eventType, type EventTypeId } from '../../design/eventTypes';
import { IntakeStudio } from './intake/IntakeStudio';
import { ImportStudio } from './intake/ImportStudio';
import { PublicSearchResults } from './search/PublicSearchStudio';
import './landing.css';

// ---------------------------------------------------------------------------
// LE GRAND JOUR® — one promise, one tool, one proof.
// ---------------------------------------------------------------------------
// The previous landing demonstrated every module in eleven long sequences. It
// made the visitor understand the catalogue before they could start. The hero
// is now the product: describe or import the event, then let the intake ask one
// missing fact at a time. The rest of the page only explains that trajectory.
// ---------------------------------------------------------------------------

export function MirrorLanding() {
  const store = weddingStore;
  const [projects, setProjects] = useState<ReturnType<typeof getStoredProjects>>([]);
  const [brief, setBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<EventTypeId>('mariage');
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState(50);
  const [searchRequest, setSearchRequest] = useState(0);

  useEffect(() => { setProjects(getStoredProjects()); }, []);

  const create = () => setIntakeOpen(true);
  const start = create;
  const schema = eventType(type);

  return (
    <div id="wc-mirror" className="wc-grandjour wc-landing-simple" data-landing="page">
      <a className="wc-skip" href="#comment-ca-marche">Aller au fonctionnement</a>

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
              onClick={() => document.getElementById('mes-evenements')?.scrollIntoView({ behavior: 'smooth' })}
              className="wc-gj-nav-link"
            >
              Mes événements
            </button>
          )}
        </nav>

        <div className="wc-gj-hero-center">
          <p className="wc-simple-kicker">Votre événement. Une seule source de vérité.</p>
          <h1 className="wc-gj-title">
            {PRODUCT_NAME}<span className="wc-gj-mark">{PRODUCT_MARK}</span>
          </h1>
          <p className="wc-gj-signature">{PRODUCT_TAGLINE}</p>

          <div className="wc-gj-bar" data-landing="tool">
            <input
              key={searchMode ? 'search-field' : 'creation-field'}
              autoFocus={searchMode}
              value={searchMode ? searchQuery : brief}
              onChange={(event) => searchMode ? setSearchQuery(event.target.value) : setBrief(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') searchMode ? setSearchRequest((value) => value + 1) : start(); }}
              placeholder={searchMode ? 'Que recherchez-vous ? Saxophoniste, lieu, traiteur…' : 'Décrivez ce que vous organisez…'}
              aria-label={searchMode ? 'Votre recherche' : 'Décrivez votre événement'}
              className="wc-gj-bar-field"
              data-landing="brief"
            />
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="wc-gj-bar-icon"
              data-landing="import-label"
              aria-label="Importer des fichiers"
              title="Importer des fichiers"
            >
              <span aria-hidden>+</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode((value) => !value)}
              className={`wc-gj-bar-icon${searchMode ? ' is-active' : ''}`}
              data-landing="search"
              aria-label="Rechercher dans le projet et les sources publiques"
              title="Rechercher"
            >
              <svg aria-hidden viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
            {searchMode ? (
              <select value={searchRadius} onChange={(event) => setSearchRadius(Number(event.target.value))} aria-label="Distance de recherche" className="wc-gj-bar-type" data-landing="distance">
                {[10, 25, 50, 100, 200].map((value) => <option key={value} value={value}>{value} km</option>)}
              </select>
            ) : (
              <select
                value={type}
                onChange={(event) => setType(event.target.value as EventTypeId)}
                aria-label="Type d’événement"
                className="wc-gj-bar-type"
                data-landing="type"
              >
                {EVENT_TYPES.map((eventTypeOption) => (
                  <option key={eventTypeOption.id} value={eventTypeOption.id}>{eventTypeOption.label}</option>
                ))}
              </select>
            )}
            <button onClick={() => searchMode ? setSearchRequest((value) => value + 1) : start()} className="wc-gj-bar-go" data-landing="hero-create" aria-label={searchMode ? 'Rechercher' : 'Commencer'}>
              <span aria-hidden>→</span>
            </button>
          </div>

          {searchMode && (
            <div className="wc-gj-search-mode" role="status">
              <strong>Mode recherche</strong>
              <span>Écrivez votre besoin, choisissez une distance, puis utilisez la flèche. Les résultats présents sur le site et les compléments publics apparaîtront juste sous ce hero.</span>
            </div>
          )}
          <p className="wc-gj-bar-hint" data-landing="hint">
            {searchMode
              ? 'Votre position ne sera demandée qu’au lancement de la recherche.'
              : files.length === 0
                ? schema.intakeLine
                : `${files.length} fichier${files.length > 1 ? 's' : ''} prêt${files.length > 1 ? 's' : ''} à être analysé${files.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      {searchRequest > 0 && (
        <PublicSearchResults
          query={searchQuery}
          radius={searchRadius}
          request={searchRequest}
          onUse={(result) => { setBrief((current) => [current.trim(), result].filter(Boolean).join(' — ')); setSearchMode(false); }}
        />
      )}

      <main>
        <section id="comment-ca-marche" className="wc-simple-proof" data-landing="film" aria-label="Comment ça marche">
          <div className="wc-simple-proof-head">
            <span className="wc-simple-kicker">Du chaos au Jour J</span>
            <h2>Une phrase suffit pour commencer.</h2>
            <p>Nous lisons ce que vous donnez, demandons ce qui manque, puis construisons une timeline que vous gardez entièrement éditable.</p>
          </div>
          <ol className="wc-simple-steps">
            <li><span>01</span><strong>Décrivez ou importez</strong><p>Un message, un planning ou des documents existants.</p></li>
            <li><span>02</span><strong>Confirmez</strong><p>Une seule question à la fois. Rien n’est inventé en silence.</p></li>
            <li><span>03</span><strong>Pilotez</strong><p>Une timeline, un panneau d’édition et votre mini-site immersif.</p></li>
          </ol>
          <p className="wc-simple-demo-note">Démonstration du parcours — vos données restent la seule vérité.</p>
        </section>

        {projects.length > 0 && (
          <section id="mes-evenements" className="wc-simple-projects" aria-label="Mes événements">
            <div className="wc-simple-proof-head">
              <span className="wc-simple-kicker">Reprendre</span>
              <h2>Mes événements</h2>
            </div>
            <ul className="wc-gj-list">
              {projects.map((project) => (
                <li key={project.id}>
                  <button onClick={() => store.loadProject(project.id)} className="wc-gj-list-item">
                    <span className="wc-gj-list-name">{project.coupleNames || project.title}</span>
                    <span className="wc-gj-list-meta">
                      {project.isDemo ? 'démonstration' : project.locationName || project.weddingDate || 'à compléter'}
                      <span aria-hidden style={{ marginLeft: 12 }}>→</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="wc-simple-footer">
        <span>{PRODUCT_NAME}{PRODUCT_MARK}</span>
        <button onClick={create}>Créer un événement <span aria-hidden>→</span></button>
      </footer>


      {importOpen && (
        <ImportStudio
          onClose={() => setImportOpen(false)}
          onConfirm={(selectedFiles, context) => {
            setFiles(selectedFiles);
            if (context) setBrief((current) => [current.trim(), context].filter(Boolean).join('\n\n'));
            setImportOpen(false);
            setIntakeOpen(true);
          }}
        />
      )}

      {intakeOpen && (
        <IntakeStudio
          description={brief}
          files={files}
          projectType={type}
          onClose={() => setIntakeOpen(false)}
        />
      )}
    </div>
  );
}
