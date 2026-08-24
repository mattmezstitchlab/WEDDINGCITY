import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { getStoredProjects } from '../../game/persistence';
import { GRAND_JOUR_HERO } from '../../design/momentImagery';
import { PRODUCT_NAME, PRODUCT_MARK, PRODUCT_TAGLINE } from '../../design/productIdentity';
import { EVENT_TYPES, eventType, type EventTypeId } from '../../design/eventTypes';
import { LandingFilm } from './timeline/LandingFilm';
import { IntakeStudio } from './intake/IntakeStudio';
import './landing.css';

// ---------------------------------------------------------------------------
// PUBLIC ENTRY — the first frame of the same product.
// ---------------------------------------------------------------------------
// There is no public project yet, therefore no real Timeline can be shown.
// The single honest preview is LandingFilm: a static product demonstration,
// explicitly separated from stored weddings. The moment a real project exists,
// MirrorSite opens directly on TimelineStudio.
//
// The Hero is one hand-off into the local Intake. It never opens a competing
// creation form, and it never reads the demo as the visitor's wedding.
// ---------------------------------------------------------------------------

export function MirrorLanding() {
  const [projects, setProjects] = useState<ReturnType<typeof getStoredProjects>>([]);
  const [brief, setBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<EventTypeId>('mariage');
  const [intakeOpen, setIntakeOpen] = useState(false);

  useEffect(() => {
    setProjects(getStoredProjects().filter((project) => !project.isDemo));
  }, []);

  // One public door: even an empty field goes through the same report.
  const start = () => setIntakeOpen(true);
  const schema = eventType(type);

  return (
    <div id="wc-mirror" className="wc-grandjour wc-landing-timeline" data-landing="page">
      <a className="wc-skip" href="#landing-timeline-preview">Aller à la Timeline</a>

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
          <h1 className="wc-gj-title">
            {PRODUCT_NAME}<span className="wc-gj-mark">{PRODUCT_MARK}</span>
          </h1>
          <p className="wc-gj-signature">{PRODUCT_TAGLINE}</p>

          <div className="wc-gj-bar" data-landing="tool">
            <input
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') start(); }}
              placeholder="Décrivez votre mariage…"
              aria-label="Décrivez votre mariage"
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
              aria-label="Nature de l’événement"
              className="wc-gj-bar-type"
              data-landing="type"
            >
              {EVENT_TYPES.map((event) => <option key={event.id} value={event.id}>{event.label}</option>)}
            </select>
            <button onClick={start} className="wc-gj-bar-go" data-landing="hero-create" aria-label="Commencer">
              <span aria-hidden>→</span>
            </button>
          </div>

          <p className="wc-gj-bar-hint" data-landing="hint">
            {files.length === 0
              ? schema.intakeLine
              : `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      <section id="landing-timeline-preview" className="wc-landing-timeline-preview" data-landing="timeline-intro">
        <div className="wc-landing-timeline-head">
          <span className="wc-gj-index">01</span>
          <h2 className="wc-gj-h2">Votre mariage commence par son fil.</h2>
          <p className="wc-gj-sub">
            Une pellicule pour voir la journée, un moment pour entrer dans son
            contexte. La démonstration ci-dessous montre la forme du produit,
            jamais les données d’un mariage réel.
          </p>
        </div>
        <LandingFilm />
      </section>

      <section className="wc-landing-report-tease" data-landing="report-intro">
        <span className="wc-gj-index">02</span>
        <div>
          <h2 className="wc-gj-h2">Dites-le comme vous l’avez.</h2>
          <p className="wc-gj-sub">
            AIME vous montre ce qu’il a réellement compris avant de poser quoi
            que ce soit dans votre journée. Vous corrigez, puis vous validez.
          </p>
        </div>
      </section>

      {projects.length > 0 && (
        <section id="mes-evenements" className="wc-landing-projects" aria-label="Mes événements">
          <div className="wc-gj-section-head">
            <span className="wc-gj-index">03</span>
            <h2 className="wc-gj-h2">Mes événements</h2>
          </div>
          <ul className="wc-gj-list">
            {projects.map((project) => (
              <li key={project.id}>
                <button onClick={() => weddingStore.loadProject(project.id)} className="wc-gj-list-item">
                  <span className="wc-gj-list-name">{project.coupleNames || project.title}</span>
                  <span className="wc-gj-list-meta">
                    {project.locationName || 'Lieu à confirmer'}
                    <span aria-hidden style={{ marginLeft: 12 }}>→</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="wc-landing-footer">
        <span>{PRODUCT_NAME}{PRODUCT_MARK}</span>
        <span>{PRODUCT_TAGLINE}</span>
      </footer>

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
