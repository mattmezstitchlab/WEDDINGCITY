import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { HeroProjection, MediaProjection } from '../../projections/worldModel';
import { typography } from '../../design/tokens';
import { M, fluid, Eyebrow } from './MirrorPrimitives';

// ---------------------------------------------------------------------------
// MIRROR HERO — an editorial cover, not a dashboard header.
// ---------------------------------------------------------------------------
// Near-full-viewport, one idea per screen: the names, the date, the place.
//
// NO stock imagery and NO 3D render is used as the cover. When a real
// MediaAsset is attached to the wedding it becomes a full-bleed editorial
// image; until then the cover is purely typographic and monumental — which is
// an honest answer, not a placeholder.
// ---------------------------------------------------------------------------

export function MirrorHero({ hero }: { hero: HeroProjection }) {
  // Real media attached to the wedding itself. Nothing invented.
  const cover: MediaProjection | null = weddingStore
    .getMediaFor('wedding', hero.projectId)
    .filter((m) => m.kind === 'image')
    .map((m) => ({ mediaId: m.id, kind: m.kind, source: m.source, title: m.title ?? null, caption: m.caption ?? null }))[0] ?? null;

  // A cover that cannot be displayed must degrade to the typographic state —
  // an empty black frame would be worse than no image at all.
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [cover?.mediaId]);
  const image = broken ? null : cover;

  const names = (hero.coupleNames || hero.title).split(/\s*&\s*/);

  const toProgramme = () => {
    document.getElementById('mirror-programme')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="wc-hero" style={{ ...heroStyle, color: image ? '#fff' : M.textPrimary }}>
      {image && (
        <>
          {/* HERO IMAGE state: the real photograph becomes the cover.
              Eager + high priority: it is the first thing on screen, so
              deferring it would only produce a flash of empty frame. */}
          <img
            src={image.source}
            alt={image.title ?? `Photographie du mariage de ${hero.coupleNames || hero.title}`}
            loading="eager"
            decoding="async"
            onError={() => setBroken(true)}
            style={coverImgStyle}
          />
          {/* A single soft scrim so type stays legible — not a decorative gradient. */}
          <div style={scrimStyle} />
        </>
      )}

      <div style={heroInnerStyle}>
        {/* SEEN IN THE BROWSER: over a photograph the eyebrow kept its ivory
            grey and all but vanished. It follows the type, like everything
            else in the image state. */}
        <div style={{ color: image ? 'rgba(255,253,250,0.82)' : undefined }}>
          <Eyebrow inherit={Boolean(image)}>
            {hero.worldType === 'wedding' ? 'Mariage' : hero.worldType}
          </Eyebrow>
        </div>

        {/* The names set as a monumental two-line lockup. */}
        {/* One page, one h1. Since the Jour J timeline opens the product and
            already carries the couple's names, the story cover is the second
            level — measured in the render harness, which found two h1. */}
        <h2 className="wc-hero-title" style={heroTitleStyle}>
          {names.length > 1 ? (
            <>
              <span style={{ display: 'block' }}>{names[0]}</span>
              <span style={ampStyle}>&amp;</span>
              <span style={{ display: 'block' }}>{names.slice(1).join(' & ')}</span>
            </>
          ) : (
            names[0]
          )}
        </h2>

        <div style={metaRowStyle}>
          {hero.formattedDate && <span style={metaItemStyle}>{hero.formattedDate}</span>}
          {hero.locationName && (
            <>
              <span style={{ ...dotStyle, background: image ? 'rgba(255,255,255,.6)' : M.textMuted }} />
              <span style={metaItemStyle}>{hero.locationName}</span>
            </>
          )}
          {hero.daysUntil !== null && hero.daysUntil > 0 && (
            <>
              <span style={{ ...dotStyle, background: image ? 'rgba(255,255,255,.6)' : M.textMuted }} />
              <span style={metaItemStyle}>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{hero.daysUntil}</strong> jours
              </span>
            </>
          )}
        </div>
      </div>

      {/* Invitation to descend — a real control, reachable by keyboard. */}
      <button
        type="button"
        className="wc-action"
        onClick={toProgramme}
        style={{ ...scrollHintStyle, color: image ? 'rgba(255,255,255,.75)' : M.textMuted }}
      >
        <span>Le déroulé</span>
        <span aria-hidden style={{ display: 'block', marginTop: 8, fontSize: 15, lineHeight: 1 }}>↓</span>
      </button>
    </header>
  );
}

// Height and vertical anchoring live in mirror.css (.wc-hero) so a phone can
// have its own: at 390px the 94vh cover left ~380px of emptiness above the
// names, which reads as a loading state rather than as a composition.
const heroStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex', flexDirection: 'column',
  padding: `${fluid(110, 170)} ${fluid(20, 72)} ${fluid(56, 92)}`,
  overflow: 'hidden',
};

const coverImgStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', display: 'block',
};

// The names sit in the middle third, where the old gradient was at 18% — fine
// over the dark test image, a gamble over a bright one (a white dress, a sky).
// Still a scrim, not a filter: a whisper of even veil plus a firmer foot.
const scrimStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background:
    'linear-gradient(to top, rgba(12,10,8,.70) 0%, rgba(12,10,8,.38) 42%, rgba(12,10,8,.20) 100%)',
};

const heroInnerStyle: React.CSSProperties = {
  position: 'relative', maxWidth: 1080, margin: '0 auto', width: '100%',
};

const heroTitleStyle: React.CSSProperties = {
  margin: `${fluid(22, 36)} 0 0`,
  fontSize: fluid(52, 148),
  lineHeight: 0.86,
  fontWeight: typography.weight.semibold,
  letterSpacing: '-0.045em',
};

const ampStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.34em',
  lineHeight: 1.9,
  letterSpacing: '0',
  fontWeight: typography.weight.regular,
  opacity: 0.55,
  fontStyle: 'italic',
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
  marginTop: fluid(28, 46),
  paddingTop: fluid(22, 32),
  borderTop: '1px solid currentColor',
  opacity: 0.9,
};

const metaItemStyle: React.CSSProperties = {
  fontSize: fluid(12, 15), letterSpacing: '0.02em',
};

const dotStyle: React.CSSProperties = {
  width: 3, height: 3, borderRadius: 999, display: 'inline-block',
};

const scrollHintStyle: React.CSSProperties = {
  position: 'relative', maxWidth: 1080, margin: `${fluid(34, 54)} auto 0`, width: '100%',
  fontSize: typography.editorial.micro, letterSpacing: '0.18em', textTransform: 'uppercase',
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  cursor: 'pointer', font: 'inherit', textAlign: 'left', display: 'block',
};
