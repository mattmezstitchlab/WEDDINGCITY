import { useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { typography, radius, shadowFor } from '../../design/tokens';
import { K } from './CanvasPrimitives';
import {
  CanvasCore, CanvasTab, CANVAS_TABS, tabForFocus, focusLabel, SaveIndicator, UndoRedo,
} from './CanvasCore';
import { M, fluid, Eyebrow } from '../mirror/MirrorPrimitives';
// Same responsive + accessibility rules as the site it is embedded in.
import '../mirror/mirror.css';

// ---------------------------------------------------------------------------
// MIRROR CANVAS SHELL — the editorial site becomes editable.
// ---------------------------------------------------------------------------
// Clicking "Modifier" in Mirror used to throw the user back into the 3D world.
// It now opens THIS shell instead: the same CanvasCore, wrapped in the Mirror's
// own visual language — ivory, wide margins, numbered sections, large type.
//
// The intent is that the magazine becomes directly editable, rather than the
// reader being handed an admin panel. Layout only: no business logic here.
// ---------------------------------------------------------------------------

export function MirrorCanvasShell() {
  const store = weddingStore;
  const focusTab = tabForFocus(store.canvasFocus);
  const [tab, setTab] = useState<CanvasTab>(focusTab);
  const [lastFocus, setLastFocus] = useState(store.canvasFocus?.id ?? null);
  const [lastIntent, setLastIntent] = useState(store.canvasIntent);

  // Arriving with a new focus switches the surface, without losing context.
  if (store.canvasFocus && store.canvasFocus.id !== lastFocus) {
    setLastFocus(store.canvasFocus.id);
    setTab(focusTab);
  }
  // A section request from the Mirror ("Composer" in 04 LIEUX) lands directly
  // on that surface. The intent counter makes a repeated request work too.
  if (store.canvasIntent !== lastIntent) {
    setLastIntent(store.canvasIntent);
    if (store.canvasSection) setTab(store.canvasSection);
    else if (store.canvasFocus) setTab(tabForFocus(store.canvasFocus));
  }

  // AUDITED, then CORRECTED BY THE TEST SUITE — and the correction is the
  // honest part of this pass.
  //
  // The audit concluded that the « Programme » surface was a second reading of
  // the day and had to go. Removing it turned an existing acceptance red, and
  // that test was right: this surface carries the deliberate handle gesture
  // that was explicitly asked for — the block stays still, only the handle
  // travels, then « Modifications détectées » validates. That gesture exists
  // NOWHERE else, and deleting a function to tidy an interface is exactly what
  // this pass forbids.
  //
  // So it stays, stripped of what really was duplicated: its five field
  // editors (hour, title, place, notes, vendors) are gone — the moment owns
  // them. What is left is an ORDER, which is what the rail now calls it.
  const VISIBLE_TABS = CANVAS_TABS.map((t) => (
    t.id === 'programme' ? { ...t, label: 'Ordre du jour' } : t
  ));
  const effectiveTab: CanvasTab = tab;
  const active = VISIBLE_TABS.find((t) => t.id === effectiveTab);

  return (
    <div id="wc-mirror-canvas" style={pageStyle}>
      {/* --- editorial masthead, not a toolbar --- */}
      <header className="wc-canvas-masthead" style={mastheadStyle}>
        <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <Eyebrow>Fiches · les personnes, les prestataires, les lieux</Eyebrow>
              <h1 style={titleStyle}>
                <span style={indexStyle}>{active?.index}</span>
                {active?.label}
              </h1>
              {store.canvasFocus && (
                <div style={focusLineStyle}>
                  Focus&nbsp;: <strong style={{ color: M.textPrimary }}>{focusLabel(store.canvasFocus)}</strong>
                  <button onClick={() => store.setCanvasFocus(null)} style={clearFocusStyle}>tout afficher</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SaveIndicator />
              <UndoRedo />
              <button className="wc-action" onClick={() => store.closeCanvas()} style={doneBtnStyle}>
                Terminer
              </button>
            </div>
          </div>

          {/* --- section rail: numbered, minimal, no sub-menus --- */}
          <nav style={railStyle} aria-label="Sections">
            {VISIBLE_TABS.map((t) => {
              const isActive = effectiveTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); store.setCanvasFocus(null); }}
                  style={railItemStyle(isActive)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span style={{ ...railIndexStyle, color: isActive ? M.textPrimary : M.textMuted }}>{t.index}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* --- the same core, given room to breathe --- */}
      <main style={mainStyle}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <CanvasCore tab={effectiveTab} />
        </div>
      </main>

      <footer style={footerStyle}>
        <span>Toute modification agit sur le World Model — le Monde et le site suivent.</span>
      </footer>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 860, overflowY: 'auto',
  background: M.bg, color: M.textPrimary,
  fontFamily: typography.family.sans,
  WebkitFontSmoothing: 'antialiased',
};

const mastheadStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2,
  background: M.bg,
  borderBottom: `1px solid ${M.line}`,
  // padding-top lives in mirror.css (.wc-canvas-masthead): the shorthand here
  // would outrank the mobile media query, as it silently did once already.
  paddingRight: fluid(20, 72),
  paddingBottom: 0,
  paddingLeft: fluid(20, 72),
};

const titleStyle: React.CSSProperties = {
  margin: '10px 0 0', display: 'flex', alignItems: 'baseline', gap: fluid(12, 20),
  fontSize: fluid(28, 46), lineHeight: 1.02,
  fontWeight: typography.weight.semibold, letterSpacing: '-0.028em', color: M.textPrimary,
};

const indexStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: fluid(13, 18),
  color: M.textMuted, fontWeight: typography.weight.regular,
};

const focusLineStyle: React.CSSProperties = {
  marginTop: 10, fontSize: typography.editorial.body, color: M.textSecondary,
  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
};

const clearFocusStyle: React.CSSProperties = {
  font: 'inherit', fontSize: typography.editorial.caption, color: M.textMuted,
  background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottom: `1px solid ${M.line}`, padding: 0,
};

const railStyle: React.CSSProperties = {
  display: 'flex', gap: fluid(8, 22), marginTop: fluid(18, 26),
  overflowX: 'auto', paddingBottom: 2,
};

const railItemStyle = (active: boolean): React.CSSProperties => ({
  font: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'baseline', gap: 7,
  padding: '0 0 12px', whiteSpace: 'nowrap',
  fontSize: typography.editorial.caption, letterSpacing: '0.08em', textTransform: 'uppercase',
  fontWeight: active ? typography.weight.bold : typography.weight.medium,
  color: active ? M.textPrimary : M.textSecondary,
  borderBottom: `2px solid ${active ? M.textPrimary : 'transparent'}`,
  marginBottom: -1,
});

const railIndexStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: typography.editorial.micro, letterSpacing: 0,
};

const mainStyle: React.CSSProperties = {
  padding: `${fluid(28, 48)} ${fluid(20, 72)} ${fluid(60, 90)}`,
};

const doneBtnStyle: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', border: 'none',
  background: M.textPrimary, color: M.surface,
  borderRadius: radius.pill, padding: '9px 18px',
  fontSize: typography.editorial.caption, fontWeight: typography.weight.semibold,
  letterSpacing: '0.04em', boxShadow: shadowFor(1, 'composition'),
};

const footerStyle: React.CSSProperties = {
  padding: `${fluid(20, 28)} ${fluid(20, 72)}`,
  borderTop: `1px solid ${M.line}`,
  fontSize: typography.editorial.caption, color: K.textMuted,
};
