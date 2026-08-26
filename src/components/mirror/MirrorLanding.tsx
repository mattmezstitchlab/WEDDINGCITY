import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { getStoredProjects } from '../../game/persistence';
import { PRODUCT_NAME, PRODUCT_MARK } from '../../design/productIdentity';
import { createSiteRequest } from '../../game/siteRequests';
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

const HERO_IMAGES = [
  '/editorial/grandjour-hero.jpg', '/editorial/canvas.jpg', '/editorial/spectacle/regie.jpg',
  '/editorial/spectacle/musicien.jpg', '/editorial/spectacle/danseuse.jpg', '/editorial/spectacle/coulisses.jpg',
  '/editorial/covers/cover-01.jpg', '/editorial/covers/cover-02.jpg', '/editorial/covers/cover-03.jpg',
  '/editorial/hero.jpg', '/editorial/mirror.jpg', '/editorial/world.jpg', '/editorial/immersive.jpg', '/editorial/matter.jpg',
];

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
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [quoteSent, setQuoteSent] = useState(false);
  const [quote, setQuote] = useState({ name: '', email: '', organisation: '', websiteNeed: '', budget: '', message: '' });

  useEffect(() => { setProjects(getStoredProjects()); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setHeroSlide((index) => (index + 1) % EVENT_TYPES.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const create = () => setIntakeOpen(true);
  const start = create;
  const schema = eventType(type);

  return (
    <div id="wc-mirror" className="wc-grandjour wc-landing-simple" data-landing="page">
      <a className="wc-skip" href="#comment-ca-marche">Aller au fonctionnement</a>

      <header className="wc-gj-hero is-centered" data-landing="hero">
        {EVENT_TYPES.map((eventTypeOption, index) => (
          <img
            key={eventTypeOption.id}
            src={HERO_IMAGES[index % HERO_IMAGES.length]}
            alt={`Univers ${eventTypeOption.label}`}
            width={1568}
            height={656}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={`wc-gj-hero-img wc-gj-hero-slide${heroSlide === index ? ' is-active' : ''}`}
          />
        ))}
        <div className="wc-gj-hero-scrim" aria-hidden />

        <nav className="wc-gj-nav" aria-label="Navigation">
          <span className="wc-gj-wordmark">
            {PRODUCT_NAME}<span className="wc-gj-mark">{PRODUCT_MARK}</span>
          </span>
          <span style={{ flex: 1 }} />
          {projects.length > 0 && (
            <div className="wc-gj-project-menu">
              <button onClick={() => setProjectMenuOpen((open) => !open)} className="wc-gj-nav-link" aria-expanded={projectMenuOpen}>
                Mes événements <span aria-hidden>⌄</span>
              </button>
              {projectMenuOpen && (
                <div role="menu" aria-label="Mes événements">
                  {projects.map((project) => (
                    <button key={project.id} role="menuitem" onClick={() => store.loadProject(project.id)}>
                      <strong>{project.coupleNames || project.title}</strong>
                      <span>{project.locationName || project.weddingDate || 'À compléter'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="wc-gj-hero-center">
          <p className="wc-simple-kicker">Votre événement. Une seule source de vérité.</p>
          <h1 className="wc-gj-title">
            {PRODUCT_NAME}<span className="wc-gj-mark">{PRODUCT_MARK}</span>
          </h1>
          <p className="wc-gj-hero-kind" aria-live="polite">{EVENT_TYPES[heroSlide]?.label}</p>

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
                onChange={(event) => { const next = event.target.value as EventTypeId; setType(next); setHeroSlide(Math.max(0, EVENT_TYPES.findIndex((item) => item.id === next))); }}
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

        <section id="creation-site" className="wc-site-quote" aria-label="Demander un site internet">
          <div className="wc-site-quote-copy">
            <span className="wc-simple-kicker">Création sur mesure</span>
            <h2>Votre événement mérite aussi son propre site.</h2>
            <p>Mini-site public, billetterie, RSVP, programme ou plateforme complète : décrivez le besoin. La demande rejoint l’espace de suivi commercial.</p>
          </div>
          <form onSubmit={(event) => {
            event.preventDefault();
            createSiteRequest({ ...quote, eventType: eventType(type).label });
            setQuoteSent(true);
          }} className="wc-site-quote-form">
            <label>Nom<input required value={quote.name} onChange={(event) => setQuote({ ...quote, name: event.target.value })} /></label>
            <label>E-mail<input required type="email" value={quote.email} onChange={(event) => setQuote({ ...quote, email: event.target.value })} /></label>
            <label>Organisation<input value={quote.organisation} onChange={(event) => setQuote({ ...quote, organisation: event.target.value })} /></label>
            <label>Besoin<select required value={quote.websiteNeed} onChange={(event) => setQuote({ ...quote, websiteNeed: event.target.value })}><option value="">Choisir…</option><option>Mini-site événementiel</option><option>RSVP et invitations</option><option>Billetterie</option><option>Site professionnel</option><option>Plateforme sur mesure</option></select></label>
            <label>Budget envisagé<select value={quote.budget} onChange={(event) => setQuote({ ...quote, budget: event.target.value })}><option value="">À définir</option><option>Moins de 1 500 €</option><option>1 500–3 000 €</option><option>3 000–6 000 €</option><option>Plus de 6 000 €</option></select></label>
            <label className="is-wide">Votre projet<textarea required rows={5} value={quote.message} onChange={(event) => setQuote({ ...quote, message: event.target.value })} placeholder="Objectif, date, fonctionnalités, contenu disponible…" /></label>
            <div className="wc-site-quote-submit is-wide">
              <span>{quoteSent ? 'Demande enregistrée. Nous revenons vers vous rapidement.' : 'Réponse personnalisée, sans engagement.'}</span>
              <button type="submit">Demander un devis <span aria-hidden>→</span></button>
            </div>
          </form>
        </section>
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
