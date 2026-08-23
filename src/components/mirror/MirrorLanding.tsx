import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { getStoredProjects } from '../../game/persistence';
import { typography } from '../../design/tokens';
import { GRAND_JOUR_HERO, DEMO_DAY, MOMENT_ASSETS } from '../../design/momentImagery';
import { PRODUCT_NAME, PRODUCT_MARK, PRODUCT_TAGLINE } from '../../design/productIdentity';
import { LandingFilm } from './timeline/LandingFilm';
import { IntakeStudio } from './intake/IntakeStudio';
import './landing.css';

// ---------------------------------------------------------------------------
// LE GRAND JOUR® — the public page.
// ---------------------------------------------------------------------------
// The product is a film of the day, so the page shows the film. It does not
// explain three surfaces before showing anything: the hero, then the timeline
// itself, live and manipulable, within one screen of scrolling.
//
// WHAT IS REAL AND WHAT IS A DEMONSTRATION — the line is drawn once, here:
//   • the weddings of this browser are real, and appear under "Mes mariages";
//   • the film on this page is a DEMONSTRATION, labelled as such, and carries
//     no couple, no guest, no vendor, no venue and no price. It is a shape,
//     not a fake wedding, and it never touches storage.
// The hero counts down only when a real wedding exists in this browser.
// ---------------------------------------------------------------------------

const MOMENT_DIMENSIONS = [
  { icon: '📍', label: 'Lieu' },
  { icon: '👥', label: 'Personnes' },
  { icon: '📸', label: 'Prestataires' },
  { icon: '🎵', label: 'Musique' },
  { icon: '🍽️', label: 'Repas' },
  { icon: '📄', label: 'Documents' },
  { icon: '📝', label: 'Notes' },
];

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const ms = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
    - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round(ms / 86400000);
}

export function MirrorLanding() {
  const store = weddingStore;
  const [projects, setProjects] = useState<ReturnType<typeof getStoredProjects>>([]);
  const [openMoment, setOpenMoment] = useState<number | null>(null);
  const [shifted, setShifted] = useState<{ from: number; delta: number } | null>(null);

  // --- the hero is a tool ---------------------------------------------------
  const [brief, setBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState('Mariage');
  const [intakeOpen, setIntakeOpen] = useState(false);

  useEffect(() => { setProjects(getStoredProjects()); }, []);

  const create = () => store.startWeddingCreation();

  // The countdown belongs to a REAL wedding or to nobody.
  const real = projects.find((p) => !p.isDemo && p.weddingDate);
  const countdown = real ? daysUntil(real.weddingDate) : null;
  const dateParts = real?.weddingDate ? new Date(real.weddingDate) : null;

  return (
    <div id="wc-mirror" className="wc-grandjour" data-landing="page">
      <a className="wc-skip" href="#film">Aller à la pellicule</a>

      {/* ---------------------------------------------------------------- 01 */}
      <header className="wc-gj-hero" data-landing="hero">
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
          <button onClick={create} className="wc-gj-cta-small" data-landing="nav-create">
            Créer mon mariage
          </button>
        </nav>

        <div className="wc-gj-hero-body">
          <h1 className="wc-gj-title">
            {PRODUCT_NAME}<span className="wc-gj-mark">{PRODUCT_MARK}</span>
          </h1>

          {real ? (
            <div className="wc-gj-hero-real" data-landing="hero-wedding">
              <div className="wc-gj-couple">{real.coupleNames}</div>
              {dateParts && (
                <div className="wc-gj-date">
                  <span>{dateParts.getDate()}</span>
                  <span>{dateParts.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase()}</span>
                  <span>{dateParts.getFullYear()}</span>
                </div>
              )}
              {countdown !== null && countdown >= 0 && (
                <div className="wc-gj-countdown">J − {countdown}</div>
              )}
            </div>
          ) : (
            <p className="wc-gj-lead">
              {PRODUCT_TAGLINE} Votre journée devient un film : une pellicule
              horizontale où chaque heure est une scène, et où tout — les
              personnes, la musique, les prestataires, les documents — est
              accroché au moment qui le concerne.
            </p>
          )}

          {/* ---- the tool: describe, or hand over the chaos ---- */}
          <div className="wc-gj-tool" data-landing="tool">
            <label className="wc-gj-tool-label" htmlFor="wc-brief">Que voulez-vous organiser ?</label>
            <textarea
              id="wc-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="« Nous nous marions le 18 juillet 2027 au Château de Vaux, cérémonie à 14h, cocktail à 17h, dîner à 20h, environ 120 invités. »"
              className="wc-gj-tool-field"
              rows={3}
              data-landing="brief"
            />
            <div className="wc-gj-tool-row">
              <label className="wc-gj-plus" data-landing="import-label">
                <span aria-hidden>+</span> Importer mes documents
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
                  style={{ display: 'none' }}
                  data-landing="files"
                />
              </label>
              <span className="wc-gj-tool-hint">
                {files.length === 0
                  ? 'PDF, photos, captures, notes, CSV, contrats — tout est lu dans votre navigateur.'
                  : `${files.length} fichier${files.length > 1 ? 's' : ''} : ${files.map((f) => f.name).join(', ')}`}
              </span>
            </div>

            <div className="wc-gj-types" role="group" aria-label="Type de projet">
              {['Mariage', 'Événement', 'Anniversaire', 'Fête', 'Corporate', 'Autre'].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`wc-gj-type${type === t ? ' is-active' : ''}`}
                  aria-pressed={type === t}
                  data-landing="type"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="wc-gj-hero-actions">
              <button
                onClick={() => (brief.trim() || files.length > 0 ? setIntakeOpen(true) : create())}
                className="wc-gj-cta"
                data-landing="hero-create"
              >
                {brief.trim() || files.length > 0 ? 'Construire ma journée' : 'Entrer dans le grand jour'}
                <span aria-hidden> →</span>
              </button>
              {projects.length > 0 && (
                <button
                  onClick={() => document.getElementById('mes-mariages')?.scrollIntoView({ behavior: 'smooth' })}
                  className="wc-gj-cta-ghost"
                >
                  Mes mariages
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- 02 */}
      <section id="film" className="wc-gj-film" aria-label="La pellicule du jour J">
        <div className="wc-gj-section-head">
          <h2 className="wc-gj-h2">Une journée. Un seul fil.</h2>
          <p className="wc-gj-sub">
            Faites glisser, zoomez, ouvrez une scène. C’est exactement l’interface
            dans laquelle vous construirez votre journée.
          </p>
        </div>

        <LandingFilm shifted={shifted} onOpenMoment={(i) => setOpenMoment(i)} />
      </section>

      {/* ---------------------------------------------------------------- 03 */}
      <section className="wc-gj-band" aria-label="Chaque changement se propage">
        <div className="wc-gj-section-head">
          <h2 className="wc-gj-h2">Chaque changement se propage.</h2>
          <p className="wc-gj-sub">
            Déplacez le cocktail d’une demi-heure : le dîner, la première danse
            et la soirée suivent. Le produit propose, vous décidez.
          </p>
          <div className="wc-gj-actions">
            <button
              onClick={() => setShifted(shifted ? null : { from: 3, delta: 0.5 })}
              className="wc-gj-cta"
              data-landing="propagate"
            >
              {shifted ? 'Revenir en arrière' : 'Décaler le cocktail de 30 min'}
            </button>
            {shifted && (
              <span className="wc-gj-note" data-landing="propagate-note">
                5 moments recalculés — cocktail, dîner, première danse, party, after.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 04 */}
      <section className="wc-gj-cols" aria-label="Ce qui vit dans un moment">
        <div className="wc-gj-section-head">
          <h2 className="wc-gj-h2">Tout ce dont vous avez besoin, au bon moment.</h2>
        </div>
        <div className="wc-gj-grid">
          {[
            { t: 'Les personnes', b: 'Les mariés, la famille, les témoins, les invités : rattachés à l’heure où on les attend, avec leur photo dès que vous l’ajoutez.' },
            { t: 'Les prestataires', b: 'Le photographe apparaît dans les moments qu’il couvre, le traiteur dans ceux qu’il sert. Jamais une liste hors du temps.' },
            { t: 'La musique', b: 'Un morceau appartient à une scène. Sa durée compte : si elle dépasse le moment, la pellicule vous le dit.' },
            { t: 'Les documents', b: 'Contrats, devis, plans, captures : le fichier se lit et se range sur le moment qu’il concerne.' },
          ].map((c) => (
            <article key={c.t} className="wc-gj-cell">
              <h3 className="wc-gj-h3">{c.t}</h3>
              <p className="wc-gj-body">{c.b}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- 05 */}
      {projects.length > 0 && (
        <section id="mes-mariages" className="wc-gj-weddings" aria-label="Mes mariages">
          <div className="wc-gj-section-head">
            <h2 className="wc-gj-h2">Mes mariages</h2>
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

      {/* ---------------------------------------------------------------- 06 */}
      <section className="wc-gj-final">
        <h2 className="wc-gj-final-title">Votre grand jour commence par un nom.</h2>
        <button onClick={create} className="wc-gj-cta" data-landing="final-create">
          Créer mon mariage <span aria-hidden>→</span>
        </button>
        <div className="wc-gj-footer">
          <span>{PRODUCT_NAME}{PRODUCT_MARK}</span>
          <span style={{ opacity: 0.6 }}>{PRODUCT_TAGLINE}</span>
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

      {/* ---- a scene, opened from the film ---- */}
      {openMoment !== null && (
        <DemoScene index={openMoment} onClose={() => setOpenMoment(null)} onCreate={create} />
      )}
    </div>
  );
}

/**
 * A scene of the demonstration.
 *
 * It shows WHAT a moment holds — and deliberately not invented content: no
 * guest names, no vendor names, no counts. In your wedding those lines carry
 * your own data; here they carry their own label, and the page says so.
 */
function DemoScene({ index, onClose, onCreate }: { index: number; onClose: () => void; onCreate: () => void }) {
  const m = DEMO_DAY[index];
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
          Dans votre mariage, chacune de ces lignes porte vos données — et
          s’édite ici même, sans quitter la scène. Cette démonstration n’en
          invente aucune.
        </p>
        <button onClick={onCreate} className="wc-gj-cta" data-landing="scene-create">
          Créer mon mariage <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
