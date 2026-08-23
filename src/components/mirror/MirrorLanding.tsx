import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { getStoredProjects } from '../../game/persistence';
import { typography, radius } from '../../design/tokens';
import { EDITORIAL_ASSETS } from '../../design/editorialAssets';
import { M, fluid, Eyebrow, Reveal } from './MirrorPrimitives';

// ---------------------------------------------------------------------------
// MIRROR LANDING — the product before there is a wedding.
// ---------------------------------------------------------------------------
// Until this browser has opened or created a wedding, the Mirror is not the
// projection of anything: it is the public face of the product. It therefore
// shows NO project data at all — no demo, no Clara & Alexandre, no venue.
//
// Same language as the editorial site it will become: ivory paper, monumental
// type, wide margins, hairlines, no cards, no glassmorphism, no dashboard.
//
// Everything here is either static product copy or the list of weddings that
// really exist in this browser. Nothing is invented, nothing is persisted.
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'landing-discover', label: 'Découvrir' },
  { id: 'landing-experience', label: 'L’expérience' },
  { id: 'landing-concept', label: 'Le concept' },
];

/** The three surfaces, described without a single technical word. */
const DIMENSIONS = [
  {
    index: '01',
    name: 'World',
    line: 'Le monde vivant',
    body: 'Les lieux, les personnes et les heures occupent un espace. On s’y déplace, on regarde qui est où, et la journée se comprend d’un seul coup d’œil.',
    asset: EDITORIAL_ASSETS.world,
  },
  {
    index: '02',
    name: 'Mirror',
    line: 'Le récit',
    body: 'Le même mariage, raconté comme un site : le déroulé, les visages, les lieux, la musique. C’est ce que vous pourrez partager.',
    asset: EDITORIAL_ASSETS.mirror,
  },
  {
    index: '03',
    name: 'Canvas',
    line: 'La composition',
    body: 'On écrit le mariage directement là où on le lit. Une heure, un lieu, un morceau : la modification apparaît aussitôt dans les deux autres espaces.',
    asset: EDITORIAL_ASSETS.canvas,
  },
];

export function MirrorLanding() {
  const store = weddingStore;
  const [projects, setProjects] = useState<ReturnType<typeof getStoredProjects>>([]);

  // Read once on mount: the list of weddings that really exist here.
  useEffect(() => { setProjects(getStoredProjects()); }, []);

  const create = () => store.startWeddingCreation();
  const goTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'start' });
    el?.setAttribute('tabindex', '-1');
    (el as HTMLElement | null)?.focus?.({ preventScroll: true });
  };

  return (
    <div id="wc-mirror" style={pageStyle}>
      <a className="wc-skip" href="#landing-hero">Aller au contenu</a>

      {/* ---- the site navigation, at the very top ---- */}
      <nav style={navStyle} aria-label="Navigation du site">
        <div className="wc-landing-nav" style={navInnerStyle}>
          <span style={brandStyle}>
            AIME
            {/* The suffix steps aside on a phone so the CTA always fits. */}
            <span className="wc-landing-brand-suffix" style={{ color: M.textMuted }}> · Wedding City</span>
          </span>

          <span style={{ flex: 1 }} />

          <div className="wc-landing-links" style={navLinksStyle}>
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => goTo(s.id)} style={navLinkStyle}>
                {s.label}
              </button>
            ))}
          </div>

          <button className="wc-action wc-landing-cta" onClick={create} style={navCtaStyle}>
            Créer mon mariage
          </button>
        </div>
      </nav>

      {/* ---- hero: a real picture, and the type on top of it ---- */}
      <header id="landing-hero" style={heroStyle}>
        <img
          src={EDITORIAL_ASSETS.hero.src}
          alt={EDITORIAL_ASSETS.hero.alt}
          width={EDITORIAL_ASSETS.hero.width}
          height={EDITORIAL_ASSETS.hero.height}
          /* The only image of the first screen: it loads immediately, the
             others wait until they are scrolled to. */
          loading="eager"
          decoding="async"
          style={heroImgStyle}
        />
        <div style={heroScrimStyle} aria-hidden />

        <div style={heroInnerStyle}>
          <Eyebrow inherit>Wedding City</Eyebrow>
          <h1 style={heroTitleStyle}>
            <span style={{ display: 'block' }}>Le mariage</span>
            <span style={{ display: 'block' }}>devient un monde.</span>
          </h1>
          <p style={heroLeadStyle}>
            Une seule journée, trois façons de la regarder : un espace où tout
            se situe, un récit que l’on partage, et une surface où l’on compose.
            Rien n’est décoratif — tout ce qui s’affiche existe vraiment.
          </p>
          <div style={heroActionsStyle}>
            <button className="wc-action" onClick={create} style={primaryCtaStyle}>
              Créer mon mariage
            </button>
            <button className="wc-action" onClick={() => goTo('landing-experience')} style={secondaryCtaStyle}>
              Découvrir l’expérience
            </button>
          </div>
        </div>
      </header>

      {/* ---- 01 discover ---- */}
      <section id="landing-discover" style={sectionStyle}>
        <div style={sectionInnerStyle}>
          <Reveal>
            <div style={ruleRowStyle}>
              <span style={sectionIndexStyle}>01</span>
              <span style={hairlineStyle} />
            </div>
            <h2 style={sectionTitleStyle}>Un mariage n’est pas une liste</h2>
            <p style={sectionLeadStyle}>
              C’est un lieu, une heure, des gens qui arrivent, une musique qui
              commence. Wedding City garde ces liens intacts : déplacez un
              moment et son lieu, ses prestataires et sa bande-son suivent.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- 02 the three dimensions ---- */}
      <section id="landing-experience" style={{ ...sectionStyle, background: M.surface }}>
        <div style={sectionInnerStyle}>
          <Reveal>
            <div style={ruleRowStyle}>
              <span style={sectionIndexStyle}>02</span>
              <span style={hairlineStyle} />
            </div>
            <h2 style={sectionTitleStyle}>Trois espaces, un seul mariage</h2>
            <p style={sectionLeadStyle}>
              Vous ne remplissez pas une application : vous composez un monde.
              Chaque espace montre le même mariage sous un angle différent.
            </p>
          </Reveal>

          {/* A sequence, not three cards: image and text alternate sides so
              the scroll has a rhythm. */}
          <div style={sequenceStyle}>
            {DIMENSIONS.map((d, i) => (
              <Reveal key={d.name} delay={Math.min(i, 3) * 60}>
                <article className="wc-landing-row" style={sequenceRowStyle(i % 2 === 1)}>
                  <div style={sequenceTextStyle}>
                    <div style={dimensionIndexStyle}>{d.index}</div>
                    <h3 style={dimensionNameStyle}>{d.name}</h3>
                    <div style={dimensionLineStyle}>{d.line}</div>
                    <p style={dimensionBodyStyle}>{d.body}</p>
                  </div>
                  <figure style={sequenceFigureStyle}>
                    <img
                      src={d.asset.src}
                      alt={d.asset.alt}
                      width={d.asset.width}
                      height={d.asset.height}
                      loading="lazy"
                      decoding="async"
                      style={sequenceImgStyle}
                    />
                  </figure>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- immersive band: almost no words, a lot of air ---- */}
      <section style={immersiveStyle} aria-label="Un jour, des milliers de relations">
        <img
          src={EDITORIAL_ASSETS.immersive.src}
          alt={EDITORIAL_ASSETS.immersive.alt}
          width={EDITORIAL_ASSETS.immersive.width}
          height={EDITORIAL_ASSETS.immersive.height}
          loading="lazy"
          decoding="async"
          style={immersiveImgStyle}
        />
        <div style={immersiveScrimStyle} aria-hidden />
        <div style={immersiveTextStyle}>
          <span style={{ display: 'block' }}>Un jour.</span>
          <span style={{ display: 'block' }}>Des milliers de relations.</span>
        </div>
      </section>

      {/* ---- 03 concept ---- */}
      <section id="landing-concept" style={sectionStyle}>
        <div style={sectionInnerStyle}>
          <Reveal>
            <div style={ruleRowStyle}>
              <span style={sectionIndexStyle}>03</span>
              <span style={hairlineStyle} />
            </div>
            <h2 style={sectionTitleStyle}>Rien d’inventé</h2>
            <p style={sectionLeadStyle}>
              Aucune photographie de banque d’images, aucun invité fictif,
              aucune statistique décorative. Tant qu’une information n’existe
              pas, la page le dit simplement — et le jour où elle arrive, elle
              apparaît partout à la fois.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- weddings that really exist in this browser ---- */}
      {projects.length > 0 && (
        <section style={{ ...sectionStyle, paddingTop: fluid(40, 70), paddingBottom: fluid(40, 70) }}>
          <div style={sectionInnerStyle}>
            <Reveal>
              <div style={ruleRowStyle}>
                <span style={sectionIndexStyle}>Mes mariages</span>
                <span style={hairlineStyle} />
              </div>
              <ul style={projectListStyle}>
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => store.loadProject(p.id)}
                      style={projectItemStyle}
                      title={`Ouvrir ${p.coupleNames || p.title}`}
                    >
                      <span style={projectNameStyle}>{p.coupleNames || p.title}</span>
                      <span style={projectMetaStyle}>
                        {p.isDemo ? 'démonstration' : p.locationName || ''}
                        <span aria-hidden style={{ marginLeft: 12 }}>→</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- closing call ---- */}
      <section style={{ ...sectionStyle, background: M.surface }}>
        <div style={{ ...sectionInnerStyle, textAlign: 'center' }}>
          <Reveal>
            <h2 style={{ ...sectionTitleStyle, maxWidth: 760, margin: '0 auto' }}>
              Votre mariage commence par un nom.
            </h2>
            <div style={{ ...heroActionsStyle, justifyContent: 'center', marginTop: fluid(26, 38) }}>
              <button className="wc-action" onClick={create} style={primaryCtaStyle}>
                Créer mon mariage
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <footer style={footerStyle}>
        <span>AIME · Wedding City</span>
        <span style={{ color: M.textMuted }}>
          Un monde, un récit, une surface de composition.
        </span>
      </footer>
    </div>
  );
}

// --- styles -----------------------------------------------------------------

const pageStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 800, overflowY: 'auto',
  background: M.bg, color: M.textPrimary,
  fontFamily: typography.family.sans,
  WebkitFontSmoothing: 'antialiased',
};

const navStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 6,
  background: M.bg, borderBottom: `1px solid ${M.line}`,
};

const navInnerStyle: React.CSSProperties = {
  maxWidth: 1080, margin: '0 auto',
  display: 'flex', alignItems: 'center', gap: fluid(10, 24),
  padding: `12px ${fluid(20, 72)}`,
};

const brandStyle: React.CSSProperties = {
  fontSize: typography.editorial.caption,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  fontWeight: typography.weight.bold, color: M.textPrimary, whiteSpace: 'nowrap',
};

// `display` lives in mirror.css (.wc-landing-links): an inline value would beat
// the mobile media query — the exact trap that left the CTA cut off at 390px.
const navLinksStyle: React.CSSProperties = {
  gap: fluid(12, 28), overflowX: 'auto',
};

const navLinkStyle: React.CSSProperties = {
  font: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer',
  padding: 0, whiteSpace: 'nowrap',
  fontSize: typography.editorial.caption, color: M.textSecondary,
  letterSpacing: '0.06em',
};

const navCtaStyle: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
  background: M.textPrimary, color: M.surface, border: 'none',
  borderRadius: radius.pill, padding: '9px 16px',
  fontSize: typography.editorial.caption, fontWeight: typography.weight.semibold,
  letterSpacing: '0.04em',
};

const heroStyle: React.CSSProperties = {
  position: 'relative', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  minHeight: 'min(88vh, 940px)',
  padding: `${fluid(90, 150)} ${fluid(20, 72)} ${fluid(50, 84)}`,
  color: '#fff',
};

const heroImgStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', objectPosition: 'center 58%', display: 'block',
};

// Enough veil for white type to hold over a bright picture, little enough for
// the orangery to stay readable. Measured, not guessed (see check-landing).
const heroScrimStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background:
    'linear-gradient(to top, rgba(14,12,10,.76) 0%, rgba(14,12,10,.48) 46%, rgba(14,12,10,.26) 100%)',
};

const heroInnerStyle: React.CSSProperties = {
  position: 'relative', maxWidth: 1080, margin: '0 auto', width: '100%',
};

const heroTitleStyle: React.CSSProperties = {
  margin: `${fluid(20, 30)} 0 0`,
  fontSize: fluid(44, 116),
  lineHeight: 0.92,
  fontWeight: typography.weight.semibold,
  letterSpacing: '-0.042em',
};

const heroLeadStyle: React.CSSProperties = {
  margin: `${fluid(24, 34)} 0 0`, maxWidth: 560,
  fontSize: fluid(15, 19), lineHeight: typography.leading.relaxed,
  color: 'rgba(255,253,250,0.88)',
};

const heroActionsStyle: React.CSSProperties = {
  display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: fluid(30, 44),
};

const primaryCtaStyle: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: M.surface, color: M.textPrimary, border: 'none',
  borderRadius: radius.pill, padding: '13px 26px',
  fontSize: typography.editorial.body, fontWeight: typography.weight.semibold,
  letterSpacing: '0.02em',
};

const secondaryCtaStyle: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: 'transparent', color: '#fff',
  border: '1px solid rgba(255,253,250,0.5)',
  borderRadius: radius.pill, padding: '13px 22px',
  fontSize: typography.editorial.body, fontWeight: typography.weight.medium,
};

const sectionStyle: React.CSSProperties = {
  padding: `${fluid(64, 130)} ${fluid(20, 72)}`,
  scrollMarginTop: 70,
};

const sectionInnerStyle: React.CSSProperties = { maxWidth: 1080, margin: '0 auto' };

const ruleRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16, marginBottom: fluid(18, 26),
};

const sectionIndexStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: typography.editorial.micro,
  color: M.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
};

const hairlineStyle: React.CSSProperties = { flex: 1, height: 1, background: M.line };

const sectionTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: fluid(30, 62), lineHeight: 1.0,
  fontWeight: typography.weight.semibold, letterSpacing: '-0.03em', color: M.textPrimary,
};

const sectionLeadStyle: React.CSSProperties = {
  margin: `${fluid(20, 28)} 0 0`, maxWidth: 620,
  fontSize: fluid(14, 18), lineHeight: typography.leading.relaxed, color: M.textSecondary,
};

const sequenceStyle: React.CSSProperties = {
  display: 'grid', gap: fluid(48, 96), marginTop: fluid(40, 70),
};

// Columns live in mirror.css (.wc-landing-row) so a phone can stack them.
const sequenceRowStyle = (reversed: boolean): React.CSSProperties => ({
  gap: `${fluid(20, 34)} ${fluid(26, 64)}`,
  alignItems: 'center',
  direction: reversed ? 'rtl' : 'ltr',
});

const sequenceTextStyle: React.CSSProperties = { direction: 'ltr', minWidth: 0 };

const sequenceFigureStyle: React.CSSProperties = {
  direction: 'ltr', margin: 0, overflow: 'hidden', borderRadius: radius.md,
  background: 'rgba(16,18,24,0.05)',
};

const sequenceImgStyle: React.CSSProperties = {
  width: '100%', height: '100%', aspectRatio: '4 / 3',
  objectFit: 'cover', display: 'block',
};

const immersiveStyle: React.CSSProperties = {
  position: 'relative', overflow: 'hidden',
  minHeight: 'min(72vh, 640px)',
  display: 'flex', alignItems: 'flex-end',
  padding: `${fluid(50, 90)} ${fluid(20, 72)}`,
};

const immersiveImgStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', display: 'block',
};

const immersiveScrimStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'linear-gradient(to top, rgba(14,12,10,.66) 0%, rgba(14,12,10,.20) 60%, rgba(14,12,10,.10) 100%)',
};

const immersiveTextStyle: React.CSSProperties = {
  position: 'relative', maxWidth: 1080, margin: '0 auto', width: '100%',
  color: '#fff', fontSize: fluid(28, 62), lineHeight: 1.04,
  fontWeight: typography.weight.semibold, letterSpacing: '-0.032em',
};

const dimensionsStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: `${fluid(30, 48)} ${fluid(24, 56)}`, marginTop: fluid(36, 60),
};

const dimensionStyle: React.CSSProperties = { minWidth: 0 };

const dimensionIndexStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: typography.editorial.micro,
  color: M.textMuted, letterSpacing: '0.08em',
};

const dimensionNameStyle: React.CSSProperties = {
  margin: '10px 0 0', fontSize: fluid(24, 40), lineHeight: 1.05,
  fontWeight: typography.weight.semibold, letterSpacing: '-0.028em', color: M.textPrimary,
};

const dimensionLineStyle: React.CSSProperties = {
  marginTop: 6, fontSize: typography.editorial.caption,
  letterSpacing: '0.12em', textTransform: 'uppercase', color: M.textMuted,
  fontWeight: typography.weight.bold,
};

const dimensionBodyStyle: React.CSSProperties = {
  margin: '14px 0 0', fontSize: typography.editorial.body,
  lineHeight: typography.leading.relaxed, color: M.textSecondary,
};

const projectListStyle: React.CSSProperties = {
  listStyle: 'none', margin: `${fluid(18, 26)} 0 0`, padding: 0,
  display: 'grid', gap: 0,
};

const projectItemStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none',
  borderBottom: `1px solid ${M.line}`, cursor: 'pointer',
  width: '100%', textAlign: 'left', padding: `${fluid(16, 22)} 0`,
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 18,
  font: 'inherit',
};

const projectNameStyle: React.CSSProperties = {
  fontSize: fluid(18, 28), letterSpacing: '-0.02em', color: M.textPrimary,
  fontWeight: typography.weight.medium,
};

const projectMetaStyle: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: M.textMuted, whiteSpace: 'nowrap',
};

const footerStyle: React.CSSProperties = {
  padding: `${fluid(34, 54)} ${fluid(20, 72)}`,
  borderTop: `1px solid ${M.line}`,
  display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
  maxWidth: 1080, margin: '0 auto', width: '100%',
  fontSize: typography.editorial.caption, color: M.textSecondary,
};
