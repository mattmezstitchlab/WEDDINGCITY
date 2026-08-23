import { useEffect, useMemo } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { projectWorldModel } from '../../projections/worldModel';
import { typography } from '../../design/tokens';
import { M, fluid, SectionShell, EmptyState, Reveal } from './MirrorPrimitives';
import { MirrorNav, editBtnStyle } from './MirrorNav';
import { MirrorHero } from './MirrorHero';
import { MirrorTimeline } from './MirrorTimeline';
import { MirrorPeople } from './MirrorPeople';
import { MirrorVendors, MirrorPlaces, MirrorMusic, MirrorGallery } from './MirrorSections';

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
  const model = useMemo(() => projectWorldModel(), [store.version]);
  const { hero, programme, guests, vendors, places, music, gallery, availability } = model;

  // Arriving from the World on a specific person: scroll to them.
  useEffect(() => {
    if (!store.mirrorFocusPersonId) return;
    requestAnimationFrame(() => {
      document.getElementById('mirror-guests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [store.mirrorFocusPersonId]);

  const storySection = availability.find((a) => a.id === 'story');
  const gallerySection = availability.find((a) => a.id === 'gallery');

  // The nav lists exactly the sections that really render.
  const navSections = [
    { id: 'programme', index: '01', label: 'Programme', available: programme.hasData },
    { id: 'guests', index: '02', label: 'Personnes', available: guests.hasData },
    { id: 'vendors', index: '03', label: 'Prestataires', available: vendors.hasData },
    { id: 'places', index: '04', label: 'Lieux', available: places.hasData },
    { id: 'music', index: '05', label: 'Musique', available: music.hasData },
    { id: 'gallery', index: '06', label: 'Médias', available: true },
  ];

  const compose = (focus?: { kind: 'event' | 'person' | 'vendor' | 'place' | 'song'; id: string }) =>
    store.openCanvas(focus);

  const ComposeBtn = ({ label = 'Composer' }: { label?: string }) => (
    <button style={editBtnStyle} onClick={() => compose()}>{label}</button>
  );

  return (
    <div style={pageStyle}>
      <MirrorHero hero={hero} />

      <MirrorNav sections={navSections} />

      {/* ------------------------------------------------------ 01 PROGRAMME */}
      {programme.hasData ? (
        <SectionShell
          id="programme"
          index="01"
          scale="dominant"
          eyebrow="Le déroulé"
          title="Programme"
          lead="Le fil de la journée. Chaque moment porte son lieu, celles et ceux qui le font, et sa bande-son."
          action={<ComposeBtn />}
        >
          <MirrorTimeline moments={programme.moments} />
        </SectionShell>
      ) : (
        <SectionShell
          id="programme" index="01" eyebrow="Le déroulé" title="Programme"
          action={<ComposeBtn />}
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
          action={<ComposeBtn />}
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
          action={<ComposeBtn />}
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
          action={<ComposeBtn />}
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
          action={<ComposeBtn />}
        >
          <MirrorMusic music={music} />
        </SectionShell>
      )}

      {/* ---------------------------------------------------------- 06 MÉDIAS */}
      <SectionShell
        id="gallery"
        index="06"
        tone="surface"
        scale={gallery.length > 0 ? 'normal' : 'quiet'}
        eyebrow="Les images"
        title="Médias"
        action={<button style={editBtnStyle} onClick={() => compose()}>Ajouter</button>}
      >
        {gallery.length > 0 ? (
          <MirrorGallery gallery={gallery} />
        ) : (
          <EmptyState
            title="Votre histoire visuelle commencera ici"
            body="Aucun média n’est encore rattaché au projet. Rien n’est affiché à la place : ces images n’existent pas. Le premier fichier ajouté apparaîtra ici, et pourra devenir la couverture du site."
            note={gallerySection?.reason}
          />
        )}
      </SectionShell>

      {/* Story has no backing field in the model — stated, never faked. */}
      {storySection && !storySection.available && (
        <SectionShell id="story" scale="quiet" eyebrow="Le récit" title="Notre histoire">
          <EmptyState
            title="Votre récit n’a pas encore été écrit"
            body="Cette section restera vide tant qu’aucun texte n’existera dans le projet."
            note={storySection.reason}
          />
        </SectionShell>
      )}

      <footer style={footerStyle}>
        <Reveal>
          <div style={footerInnerStyle}>
            <span style={{ fontSize: fluid(16, 22), color: M.textPrimary, letterSpacing: '-0.02em' }}>
              {hero.title}
            </span>
            <span style={{ color: M.textMuted }}>
              Projection éditoriale du monde · données en direct
            </span>
          </div>
        </Reveal>
      </footer>
    </div>
  );
}

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
  fontSize: typography.size.caption, color: M.textSecondary,
};
