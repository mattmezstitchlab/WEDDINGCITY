import { useEffect, useMemo } from 'react';
import { weddingStore, CanvasSection } from '../../game/weddingStore';
import { projectWorldModel } from '../../projections/worldModel';
import { typography } from '../../design/tokens';
import { M, fluid, SectionShell, EmptyState, Reveal } from './MirrorPrimitives';
import { MirrorNav, editBtnStyle } from './MirrorNav';
import { MirrorHero } from './MirrorHero';
import { MirrorTimeline } from './MirrorTimeline';
import { MirrorPeople } from './MirrorPeople';
import { MirrorVendors, MirrorPlaces, MirrorMusic, MirrorGallery } from './MirrorSections';
import { MirrorLanding } from './MirrorLanding';
import { TimelineStudio } from './timeline/TimelineStudio';
import { PRODUCT_NAME, PRODUCT_MARK } from '../../design/productIdentity';
import './mirror.css';

// ---------------------------------------------------------------------------
// MIRROR — the editorial projection of the World Model.
// ---------------------------------------------------------------------------
// This file is the SPINE: it owns the rhythm of the page (hero → programme →
// people → places → music → media) and nothing else. Each section's
// composition lives in its own module.
//
// It holds no state: everything derives from projectWorldModel(), so a change
// made in the Canvas or the World is reflected here on the next render.
//
// Rhythm is deliberate. The hero is nearly full-screen, PROGRAMME is the
// dominant section, people and places breathe normally, media is quiet.
// Sections alternate between the ivory background and the paper surface so a
// scroll feels like turning pages rather than passing dividers.
// ---------------------------------------------------------------------------

export function MirrorSite() {
  const store = weddingStore;

  // Before any wedding has been opened or created in this browser, the Mirror
  // is not a projection of anything: it is the public face of the product.
  // No project data is read at all in that state — in particular, never the
  // demo (see MirrorLanding).
  if (!store.projectChosen) return <MirrorLanding />;

  // ---------------------------------------------------------------------
  // THE PRODUCT IS THE DAY.
  //
  // Until this pass the Mirror opened on a magazine cover and the day was a
  // section inside it — and, before that, the way in was the 3D World. Both
  // are the wrong priority: what a couple builds, day after day, is the
  // timeline of the Jour J. So the Jour J now owns the first screen, and the
  // editorial story stays right below it, in the same scroll: it is the same
  // data seen as a site, not another destination.
  // ---------------------------------------------------------------------
  return (
    <div id="wc-mirror" style={productPageStyle} className="wc-jourj">
      <ProductNav />
      <TimelineStudio />
      <div style={storyDividerStyle}>
        <span>Le récit</span>
        <span style={{ opacity: 0.62 }}>ce que vos invités verront de cette journée</span>
      </div>
      <MirrorProjection embedded />
    </div>
  );
}

/**
 * The whole navigation of the product: where I am, my weddings, a new one.
 * Three words. No sidebar, no menu, no 3D entrance.
 */
function ProductNav() {
  const store = weddingStore;
  const go = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav style={productNavStyle} aria-label="Navigation">
      <span style={{ fontWeight: 700, letterSpacing: '0.22em', fontSize: 12 }}>
        {PRODUCT_NAME}
        <span style={{ fontSize: '0.6em', verticalAlign: 'super', marginLeft: 2 }}>{PRODUCT_MARK}</span>
      </span>
      <span style={{ flex: 1 }} />
      <button onClick={() => go('jour-j')} style={productNavBtn} data-jourj="nav-jourj">Jour J</button>
      <button onClick={() => store.returnToLanding()} style={productNavBtn} data-jourj="nav-weddings">Mes mariages</button>
      <button onClick={() => store.startWeddingCreation()} style={productNavCta} data-jourj="nav-create">Créer</button>
    </nav>
  );
}

function MirrorProjection({ embedded }: { embedded?: boolean }) {
  const store = weddingStore;
  const model = useMemo(() => projectWorldModel(), [store.version]);
  const { hero, programme, guests, vendors, places, music, gallery, availability } = model;

  // Arriving from the World on a specific person: scroll to them.
  useEffect(() => {
    if (!store.mirrorFocusPersonId) return;
    requestAnimationFrame(() => {
      document.getElementById('mirror-guests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [store.mirrorFocusPersonId]);

  // 06 MÉDIAS renders IMAGES. A song preview is a real media too, but it is
  // not something to hang on a wall — counting it as a photograph would make
  // the section claim a gallery it cannot show.
  const galleryImages = gallery.filter((m) => m.kind === 'image');
  const otherMedia = gallery.length - galleryImages.length;


  // The nav lists exactly the sections that really render.
  const navSections = [
    { id: 'programme', index: '01', label: 'Programme', available: programme.hasData },
    { id: 'guests', index: '02', label: 'Personnes', available: guests.hasData },
    { id: 'vendors', index: '03', label: 'Prestataires', available: vendors.hasData },
    { id: 'places', index: '04', label: 'Lieux', available: places.hasData },
    { id: 'music', index: '05', label: 'Musique', available: music.hasData },
    { id: 'gallery', index: '06', label: 'Médias', available: true },
  ];

  // "Composer" opens the Canvas ALREADY on the matching surface: 04 LIEUX →
  // Canvas 04 Lieux. No intermediate navigation, no lost context.
  const SECTION_LABEL: Record<CanvasSection, string> = {
    programme: 'le programme', people: 'les personnes', vendors: 'les prestataires',
    places: 'les lieux', music: 'la musique', media: 'les médias',
  };

  const ComposeBtn = ({ section, label = 'Composer' }: { section: CanvasSection; label?: string }) => (
    <button
      className="wc-action"
      style={editBtnStyle}
      onClick={() => store.openCanvas(undefined, section)}
      aria-label={`${label} ${SECTION_LABEL[section]}`}
    >
      {label}
    </button>
  );

  return (
    <div id={embedded ? 'wc-mirror-story' : 'wc-mirror'} style={embedded ? storyPageStyle : pageStyle}>
      {/* Keyboard users land here first: one key to reach the content. */}
      <a className="wc-skip" href="#mirror-programme">Aller au programme</a>

      {/* Imposed vertical order — [navigation du site] ↓ [contenu] ↓ [capsule].
          MEASURED IN THE BROWSER (journey acceptance): with the rail placed
          after the hero, its flow position landed at the very bottom of the
          first screen, exactly where the fixed projection capsule sits, and
          the capsule covered 03 PRESTATAIRES / 04 LIEUX / 05 MUSIQUE on every
          first paint. Sticky at the top from the first pixel, the contents
          page reads like a magazine and never meets the capsule. */}
      <MirrorNav sections={navSections} />

      <MirrorHero hero={hero} />

      {/* ------------------------------------------------------ 01 PROGRAMME */}
      {programme.hasData ? (
        <SectionShell
          id="programme"
          index="01"
          scale="dominant"
          eyebrow="Le déroulé"
          title="Programme"
          lead="Le fil de la journée. Chaque moment porte son lieu, celles et ceux qui le font, et sa bande-son."
          action={<ComposeBtn section="programme" />}
        >
          <MirrorTimeline moments={programme.moments} />
        </SectionShell>
      ) : (
        <SectionShell
          id="programme" index="01" eyebrow="Le déroulé" title="Programme"
          action={<ComposeBtn section="programme" />}
        >
          <EmptyState
            title="Le programme n’est pas encore composé"
            body="Les moments de la journée apparaîtront ici dès qu’une timeline sera définie."
          />
        </SectionShell>
      )}

      {/* ------------------------------------------------------- 02 PERSONNES */}
      {guests.hasData ? (
        <SectionShell
          id="guests"
          index="02"
          tone="surface"
          eyebrow="Les personnes"
          title="Invités"
          lead={`${guests.counts.headcount} convives attendus, répartis sur ${guests.counts.tables} tables.`}
          action={<ComposeBtn section="people" />}
        >
          <MirrorPeople guests={guests} />
        </SectionShell>
      ) : (
        <SectionShell id="guests" index="02" tone="surface" eyebrow="Les personnes" title="Invités">
          <EmptyState
            title="Aucun invité pour l’instant"
            body="Les personnes invitées apparaîtront ici, avec leur réponse et leur table."
          />
        </SectionShell>
      )}

      {/* ---------------------------------------------------- 03 PRESTATAIRES */}
      {vendors.hasData && (
        <SectionShell
          id="vendors"
          index="03"
          eyebrow="Celles et ceux qui font"
          title="Prestataires"
          lead={`${vendors.counts.total} intervenants, dont ${vendors.counts.contracted} contractualisés.`}
          action={<ComposeBtn section="vendors" />}
        >
          <MirrorVendors vendors={vendors} />
        </SectionShell>
      )}

      {/* ----------------------------------------------------------- 04 LIEUX */}
      {places.hasData && (
        <SectionShell
          id="places"
          index="04"
          tone="surface"
          eyebrow="Les espaces"
          title="Le lieu"
          lead={`${places.counts.withMoments} espaces accueillent un moment du programme, sur ${places.counts.total} référencés.`}
          action={<ComposeBtn section="places" />}
        >
          <MirrorPlaces places={places} />
        </SectionShell>
      )}

      {/* --------------------------------------------------------- 05 MUSIQUE */}
      {music.hasData && (
        <SectionShell
          id="music"
          index="05"
          eyebrow="La bande-son"
          title="Musique"
          lead={`${music.counts.total} titres, ${music.counts.scheduled} rattachés à un moment du programme.`}
          action={<ComposeBtn section="music" />}
        >
          <MirrorMusic music={music} />
        </SectionShell>
      )}

      {/* ---------------------------------------------------------- 06 MÉDIAS */}
      <SectionShell
        id="gallery"
        index="06"
        tone="surface"
        scale={galleryImages.length > 0 ? 'normal' : 'quiet'}
        eyebrow="Les images"
        title="Médias"
        lead={galleryImages.length > 0
          ? `${galleryImages.length} ${galleryImages.length > 1 ? 'images rattachées' : 'image rattachée'} au projet.`
          : undefined}
        action={<ComposeBtn section="media" label="Ajouter" />}
      >
        {galleryImages.length > 0 ? (
          <>
            <MirrorGallery gallery={galleryImages} />
            {otherMedia > 0 && (
              <p style={otherMediaStyle}>
                {otherMedia > 1
                  ? `${otherMedia} autres fichiers — extraits audio et documents — sont rattachés`
                  : `${otherMedia} autre fichier — extrait audio ou document — est rattaché`}
                {' '}au projet sans être des images.
              </p>
            )}
          </>
        ) : (
          <EmptyState
            title="Votre histoire visuelle commencera ici"
            body={otherMedia > 0
              ? `Aucune image pour l’instant : ${otherMedia > 1 ? `les ${otherMedia} fichiers rattachés au projet sont des extraits audio ou des documents` : 'le seul fichier rattaché au projet est un extrait audio ou un document'}. La première photographie ajoutée apparaîtra ici, et pourra devenir la couverture du site.`
              : 'Aucune photographie n’est encore rattachée à ce mariage. Rien n’est affiché à la place : ces images n’existent pas. La première ajoutée apparaîtra ici, et pourra devenir la couverture du site.'}
          />
        )}
      </SectionShell>

      {/* "Notre histoire" has NO field in the model, so a visitor can neither
          read it nor fill it: showing an empty section — and, worse, the
          diagnostic sentence explaining that the field does not exist — was
          developer talk on a wedding site. The gap stays declared in
          projectAvailability() for the Canvas and the System Nerve; the page
          simply does not pretend the section exists. */}

      <footer style={footerStyle}>
        <Reveal>
          <div style={footerInnerStyle}>
            <span style={{ fontSize: fluid(16, 22), color: M.textPrimary, letterSpacing: '-0.02em' }}>
              {hero.title}
            </span>
            <span style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ color: M.textMuted }}>
                Projection éditoriale du monde · données en direct
              </span>
              {/* The site is a wedding's site, but the product has several
                  weddings. Without this link the public landing — and the
                  list of every wedding in this browser — was unreachable
                  once a first wedding had been opened. */}
              <button
                className="wc-action"
                onClick={() => store.returnToLanding()}
                style={{ ...editBtnStyle, textTransform: 'none' }}
              >
                Mes mariages
              </button>
            </span>
          </div>
        </Reveal>
      </footer>
    </div>
  );
}

const otherMediaStyle: React.CSSProperties = {
  margin: `${fluid(18, 26)} 0 0`, maxWidth: 520,
  fontSize: typography.editorial.caption, color: M.textMuted, lineHeight: 1.6,
};

const productPageStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 800, overflowY: 'auto',
  background: '#08090b', color: '#f6f5f3',
  fontFamily: typography.family.sans,
  WebkitFontSmoothing: 'antialiased',
};

/** Embedded in the product page: the story scrolls with the day, it is not a
    second fixed surface stacked on top of the first. */
const storyPageStyle: React.CSSProperties = {
  position: 'relative', background: M.bg, color: M.textPrimary,
  fontFamily: typography.family.sans,
  WebkitFontSmoothing: 'antialiased',
};

const productNavStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 900,
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '14px clamp(18px, 5vw, 64px)',
  background: '#08090b', borderBottom: '1px solid rgba(246,245,243,0.12)',
  color: '#f6f5f3',
};

const productNavBtn: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'rgba(246,245,243,0.78)', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans, padding: '8px 10px',
};

const productNavCta: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer',
  background: '#f6f5f3', color: '#08090b', borderRadius: 999,
  padding: '8px 16px', fontSize: typography.editorial.caption,
  fontWeight: typography.weight.semibold, fontFamily: typography.family.sans,
};

const storyDividerStyle: React.CSSProperties = {
  display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline',
  padding: 'clamp(30px, 6vw, 64px) clamp(18px, 5vw, 64px)',
  background: '#08090b', color: '#f6f5f3',
  fontSize: typography.editorial.caption,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  borderTop: '1px solid rgba(246,245,243,0.12)',
};

const pageStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 800, overflowY: 'auto',
  background: M.bg, color: M.textPrimary,
  fontFamily: typography.family.sans,
  WebkitFontSmoothing: 'antialiased',
};

const footerStyle: React.CSSProperties = {
  padding: `${fluid(48, 88)} ${fluid(20, 72)} ${fluid(60, 96)}`,
  borderTop: `1px solid ${M.line}`,
};

const footerInnerStyle: React.CSSProperties = {
  maxWidth: 1080, margin: '0 auto',
  display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
  alignItems: 'baseline',
  fontSize: typography.editorial.caption, color: M.textSecondary,
};
