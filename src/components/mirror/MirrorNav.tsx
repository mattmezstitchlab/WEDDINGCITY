import { useEffect, useState } from 'react';
import { typography, radius, shadowFor } from '../../design/tokens';
import { M } from './MirrorPrimitives';

// ---------------------------------------------------------------------------
// MIRROR NAV — the lowest-cognitive-cost option.
// ---------------------------------------------------------------------------
// Two candidates were considered (brief §navigation):
//
//   A. vertical icon rail with tooltips — compact, but pictograms for
//      "Prestataires" vs "Personnes" vs "Lieux" are genuinely ambiguous, so
//      the label has to be discovered by hovering. That IS cognitive cost.
//   B. thin horizontal editorial rail with numbers + words — reads like a
//      magazine contents page, is self-explanatory at a glance, and matches
//      the numbered sections it points at.
//
// B is implemented. Numbers are the same 01..06 used by the sections, so the
// nav and the page speak one language. No icons, no sub-menus, no dropdowns.
// On mobile it becomes a single horizontally scrollable line.
// ---------------------------------------------------------------------------

export interface NavSection {
  id: string;
  index: string;
  label: string;
  available: boolean;
}

export function MirrorNav({ sections }: { sections: NavSection[] }) {
  const visible = sections.filter((s) => s.available);
  const [active, setActive] = useState<string | null>(visible[0]?.id ?? null);

  // Highlight follows the section actually in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (inView) setActive(inView.target.id.replace('mirror-', ''));
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0.05, 0.25, 0.5] },
    );
    for (const s of visible) {
      const el = document.getElementById(`mirror-${s.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [visible.map((s) => s.id).join(',')]);

  if (visible.length < 2) return null;

  const go = (id: string) => {
    document.getElementById(`mirror-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav style={barStyle} aria-label="Sections du site">
      <div style={innerStyle}>
        {visible.map((s) => {
          const isActive = active === s.id;
          return (
            <button key={s.id} onClick={() => go(s.id)} style={itemStyle(isActive)}>
              <span style={{ ...idxStyle, color: isActive ? M.textPrimary : M.textMuted }}>{s.index}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const barStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 5,
  background: 'rgba(247, 245, 240, 0.92)',
  borderBottom: `1px solid ${M.line}`,
};

const innerStyle: React.CSSProperties = {
  maxWidth: 1080, margin: '0 auto',
  display: 'flex', gap: 'clamp(10px, 2.4vw, 30px)',
  padding: '11px clamp(16px, 5vw, 72px)',
  overflowX: 'auto',
};

const itemStyle = (active: boolean): React.CSSProperties => ({
  font: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'baseline', gap: 6,
  padding: 0, whiteSpace: 'nowrap',
  fontSize: typography.size.caption, letterSpacing: '0.09em', textTransform: 'uppercase',
  fontWeight: active ? typography.weight.bold : typography.weight.medium,
  color: active ? M.textPrimary : M.textSecondary,
  opacity: active ? 1 : 0.75,
  transition: 'opacity 160ms ease, color 160ms ease',
});

const idxStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: 9, letterSpacing: 0,
};

export const editBtnStyle: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: 'transparent', color: M.textSecondary,
  border: `1px solid ${M.line}`, borderRadius: radius.pill,
  padding: '5px 13px', fontSize: typography.size.caption,
  letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
  boxShadow: shadowFor(0, 'composition'),
};
