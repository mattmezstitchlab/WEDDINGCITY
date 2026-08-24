import { CSSProperties, useEffect, useRef, useState } from 'react';
import { radius, surfaces, typography, shadowFor, dmcDotStyle, dmcTint } from '../../design/tokens';

// ---------------------------------------------------------------------------
// MIRROR — shared editorial primitives.
// ---------------------------------------------------------------------------
// These are deliberately NOT the dashboard components. The Mirror is the
// editorial projection of the World Model: big type, wide margins, vertical
// rhythm, almost no chrome. Same tokens, different expression.
// ---------------------------------------------------------------------------

export const M = surfaces.composition;

/** Fluid type: the Mirror must read as a site on mobile, tablet and desktop. */
export const fluid = (minPx: number, maxPx: number, minVw = 360, maxVw = 1280) =>
  `clamp(${minPx}px, calc(${minPx}px + ${maxPx - minPx} * ((100vw - ${minVw}px) / ${maxVw - minVw})), ${maxPx}px)`;

/**
 * Real French plural, because "3 régime(s) particulier(s)" is a form field,
 * not a sentence. Nothing invented: the count is the count.
 */
export function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count > 1 ? (pluralForm ?? `${singular}s`) : singular;
  return `${count} ${word}`;
}

export function Eyebrow({ children, inherit }: {
  children: React.ReactNode;
  /** Over a photograph the eyebrow must follow the surrounding type colour. */
  inherit?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: typography.editorial.micro,
        fontWeight: typography.weight.bold,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: inherit ? 'inherit' : M.textMuted,
      }}
    >
      {children}
    </div>
  );
}

export function SectionShell({
  id, index, eyebrow, title, lead, children, tone = 'bg', action, scale = 'normal',
}: {
  id: string;
  /** Editorial section number, e.g. "01". Gives the page a real spine. */
  index?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  children?: React.ReactNode;
  tone?: 'bg' | 'surface';
  action?: React.ReactNode;
  /** Editorial weight. Drives vertical air and title scale. */
  scale?: 'dominant' | 'normal' | 'quiet';
}) {
  return (
    <section
      id={`mirror-${id}`}
      style={{
        background: tone === 'surface' ? M.surface : 'transparent',
        // Rhythm, not uniformity: a dominant section breathes more than a
        // supporting one, so the page reads as a composition rather than a
        // stack of identical blocks.
        padding: scale === 'dominant'
          ? `${fluid(96, 200)} ${fluid(20, 72)}`
          : scale === 'quiet'
            ? `${fluid(52, 96)} ${fluid(20, 72)}`
            : `${fluid(72, 148)} ${fluid(20, 72)}`,
        borderTop: tone === 'surface' ? 'none' : `1px solid ${M.line}`,
        // The sticky rail sits at the top: an anchored section must land
        // below it, not underneath.
        scrollMarginTop: 64,
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Section number + rule: the editorial signature of the page. */}
        {index && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: fluid(18, 26) }}>
            <span style={{
              fontFamily: typography.family.mono, fontSize: fluid(11, 13),
              color: M.textMuted, letterSpacing: '0.06em',
            }}>
              {index}
            </span>
            <span style={{ flex: 1, height: 1, background: M.line }} />
            {action}
          </div>
        )}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && (
          <h2
            style={{
              margin: '14px 0 0',
              fontSize: scale === 'dominant' ? fluid(42, 104) : scale === 'quiet' ? fluid(28, 52) : fluid(34, 72),
              lineHeight: 0.94,
              fontWeight: typography.weight.semibold,
              letterSpacing: '-0.03em',
              color: M.textPrimary,
            }}
          >
            {title}
          </h2>
        )}
        {lead && (
          <p
            style={{
              margin: `${fluid(18, 26)} 0 0`,
              maxWidth: 560,
              fontSize: fluid(14, 18),
              lineHeight: typography.leading.relaxed,
              color: M.textSecondary,
            }}
          >
            {lead}
          </p>
        )}
        {children && <div style={{ marginTop: title || lead ? fluid(28, 48) : 0 }}>{children}</div>}
      </div>
    </section>
  );
}

/**
 * Honest empty state. Never a fake photo, never placeholder content:
 * it says what is missing and, where relevant, what would fill it.
 */
export function EmptyState({ title, body, note }: { title: string; body: string; note?: string }) {
  return (
    <div
      style={{
        border: `1px dashed ${M.lineStrong}`,
        borderRadius: radius.lg,
        padding: `${fluid(28, 44)} ${fluid(20, 36)}`,
        textAlign: 'center',
        background: 'transparent',
      }}
    >
      <div style={{ fontSize: fluid(16, 21), color: M.textPrimary, fontWeight: typography.weight.medium }}>
        {title}
      </div>
      <p
        style={{
          margin: '10px auto 0',
          maxWidth: 460,
          fontSize: typography.editorial.body,
          lineHeight: typography.leading.relaxed,
          color: M.textSecondary,
        }}
      >
        {body}
      </p>
      {note && (
        <div style={{ marginTop: 12, fontSize: typography.editorial.caption, color: M.textMuted }}>{note}</div>
      )}
    </div>
  );
}

/** Monumental figure. The value always comes from the World Model. */
export function BigFigure({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div style={{ minWidth: 96 }}>
      <div
        style={{
          fontSize: fluid(34, 62),
          lineHeight: 0.94,
          fontWeight: typography.weight.semibold,
          letterSpacing: '-0.03em',
          color: M.textPrimary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: typography.editorial.micro,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: M.textMuted,
          fontWeight: typography.weight.bold,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ marginTop: 4, fontSize: typography.editorial.caption, color: M.textSecondary }}>{sub}</div>
      )}
    </div>
  );
}

export function DmcMark({ color, code }: { color: string | null; code?: string | null }) {
  if (!color) return null;
  return (
    <span
      title={code ?? undefined}
      style={{ ...dmcDotStyle(color, 7), display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
}

/**
 * PORTRAIT — the one way a human being is pictured across the Mirror.
 *
 * Real photo when a MediaAsset exists, initials otherwise. Never a generated
 * avatar, never a stock face. If a remote source fails to load we fall back to
 * the initials instead of showing a broken frame.
 *
 * `shape` follows the context: a circle in a list of people, a soft square in
 * an editorial block. The DMC colour is a ring — a signal, never a fill.
 */
export function Portrait({
  name, source, dmcColor, size = 34, shape = 'circle',
}: {
  name: string;
  source: string | null;
  dmcColor?: string | null;
  size?: number;
  shape?: 'circle' | 'squircle';
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [source]);
  const usable = broken ? null : source;

  // Letters only: "Jean-Luc (Chauffeur)" produced "J(" before this.
  const initials = name
    .normalize('NFD')
    .replace(/[^\p{L}\s'’-]/gu, ' ')
    .trim()
    .split(/[\s'’-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || '·';

  return (
    <span
      style={{
        width: size, height: size, flex: '0 0 auto', overflow: 'hidden',
        borderRadius: shape === 'circle' ? 999 : Math.round(size * 0.26),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: dmcColor ? `0 0 0 1.5px ${dmcColor}` : `0 0 0 1px ${M.line}`,
        background: usable ? 'transparent' : dmcTint(dmcColor ?? '#8a8f99', 0.1),
      }}
    >
      {usable ? (
        <img
          src={usable}
          alt={`Portrait de ${name}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            fontSize: Math.max(10, Math.round(size * 0.34)),
            fontWeight: typography.weight.semibold,
            letterSpacing: '0.04em', color: M.textSecondary,
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

export const editorialCard: CSSProperties = {
  background: M.surface,
  borderRadius: radius.lg,
  boxShadow: shadowFor(2, 'composition'),
  border: `1px solid ${M.line}`,
};

export const quietLink: CSSProperties = {
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  font: 'inherit',
  color: M.textPrimary,
  textAlign: 'left',
};


/**
 * Reveal on scroll — deliberately restrained.
 *
 * A short fade with a few pixels of rise. No parallax, no scale, no spring:
 * the brief asks for editorial calm, and motion here exists only to make the
 * page feel composed as you descend, never to perform.
 *
 * Respects prefers-reduced-motion, and degrades to visible if the observer is
 * unavailable — content must never depend on animation to be readable.
 */
export function Reveal({
  children, delay = 0, as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  as?: 'div' | 'li' | 'section';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const el = ref.current;
    if (!el) { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setShown(true); io.disconnect(); } },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(14px)',
        transition: `opacity 620ms cubic-bezier(.22,.61,.36,1) ${delay}ms, transform 620ms cubic-bezier(.22,.61,.36,1) ${delay}ms`,
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}

/** A hairline rule with optional label — the editorial separator of the site. */
export function Rule({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
      {label && (
        <span style={{
          fontSize: typography.editorial.micro, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: M.textMuted, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      )}
      <span style={{ flex: 1, height: 1, background: M.line }} />
    </div>
  );
}

/** Secondary metadata line: present, quiet, never competing with the title. */
export function MetaLine({ items }: { items: (string | null | undefined)[] }) {
  const real = items.filter((i): i is string => Boolean(i && i.trim()));
  if (real.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      fontSize: typography.editorial.caption, color: M.textMuted,
    }}>
      {real.map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {i > 0 && <span style={{ width: 2, height: 2, borderRadius: 999, background: M.textMuted, opacity: 0.7 }} />}
          {item}
        </span>
      ))}
    </div>
  );
}
