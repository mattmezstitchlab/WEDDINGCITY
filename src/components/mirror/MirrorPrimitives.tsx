import { CSSProperties } from 'react';
import { radius, surfaces, typography, shadowFor, dmcDotStyle } from '../../design/tokens';

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

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: typography.size.micro,
        fontWeight: typography.weight.bold,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: M.textMuted,
      }}
    >
      {children}
    </div>
  );
}

export function SectionShell({
  id, index, eyebrow, title, lead, children, tone = 'bg', action,
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
}) {
  return (
    <section
      id={`mirror-${id}`}
      style={{
        background: tone === 'surface' ? M.surface : 'transparent',
        padding: `${fluid(64, 128)} ${fluid(20, 72)}`,
        borderTop: `1px solid ${M.line}`,
        scrollMarginTop: 72,
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
              fontSize: fluid(34, 72),
              lineHeight: 0.98,
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
              margin: '16px 0 0',
              maxWidth: 620,
              fontSize: fluid(14, 17),
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
          fontSize: typography.size.body,
          lineHeight: typography.leading.relaxed,
          color: M.textSecondary,
        }}
      >
        {body}
      </p>
      {note && (
        <div style={{ marginTop: 12, fontSize: typography.size.caption, color: M.textMuted }}>{note}</div>
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
          fontSize: typography.size.micro,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: M.textMuted,
          fontWeight: typography.weight.bold,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ marginTop: 4, fontSize: typography.size.caption, color: M.textSecondary }}>{sub}</div>
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
