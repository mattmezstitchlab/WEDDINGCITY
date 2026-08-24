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
// MIRROR CANVAS SHELL — contextual transverse fiches.
// ---------------------------------------------------------------------------
// Clicking a person, provider, place, song or media collection opens this shell
// beside the day. It is deliberately NOT a second programme: the moment's
// properties and relations are edited in MomentHub, on the timeline.
//
// The shell keeps the existing CanvasCore for transverse entities only. Layout
// and navigation live here; business mutations remain in the shared core/store.
// ---------------------------------------------------------------------------

export function MirrorCanvasShell() {
  const store = weddingStore;
  const focusTab = tabForFocus(store.canvasFocus);
  // PRODUCT DECISION (Passe A): Ordre du jour belongs to TimelineStudio. The
  // World may keep its legacy tab, but the product shell exposes fiches only.
  const VISIBLE_TABS = CANVAS_TABS;
  const firstTab = VISIBLE_TABS[0]?.id ?? 'people';
  const initialTab = VISIBLE_TABS.some((t) => t.id === focusTab) ? focusTab : firstTab;
  const [tab, setTab] = useState<CanvasTab>(initialTab);
  const [lastFocus, setLastFocus] = useState(store.canvasFocus?.id ?? null);
  const [lastIntent, setLastIntent] = useState(store.canvasIntent);

  // Arriving with a new focus switches the surface, without losing context.
  if (store.canvasFocus && store.canvasFocus.id !== lastFocus) {
    setLastFocus(store.canvasFocus.id);
    setTab(VISIBLE_TABS.some((t) => t.id === focusTab) ? focusTab : firstTab);
  }
  // A section request from the Mirror lands directly on one transverse sheet.
  // Programme requests are deliberately reduced to the first sheet: the day
  // itself is opened by TimelineStudio/MomentHub, never by this shell.
  if (store.canvasIntent !== lastIntent) {
    setLastIntent(store.canvasIntent);
    if (store.canvasSection && VISIBLE_TABS.some((t) => t.id === store.canvasSection)) setTab(store.canvasSection);
    else if (store.canvasFocus) {
      const requestedTab = tabForFocus(store.canvasFocus);
      setTab(VISIBLE_TABS.some((t) => t.id === requestedTab) ? requestedTab : firstTab);
    }
  }

  // The former Programme tab carried a second moment-ordering surface. The
  // Timeline already owns that gesture and the MomentHub owns moment fields.
  // It is therefore intentionally absent from this product shell. The shared
  // core keeps the dormant World implementation until that legacy surface is
  // retired in its own pass.
  const effectiveTab: CanvasTab = VISIBLE_TABS.some((t) => t.id === tab) ? tab : firstTab;
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
                  Fiche&nbsp;: <strong style={{ color: M.textPrimary }}>{focusLabel(store.canvasFocus)}</strong>
                  <button onClick={() => store.setCanvasFocus(null)} style={clearFocusStyle}>tout afficher</button>
                </div>
              )}
              {store.canvasReturnPhaseId && (
                <div style={{ ...focusLineStyle, marginTop: 6 }} data-canvas="return-context">
                  Depuis&nbsp;: <strong style={{ color: M.textPrimary }}>
                    {focusLabel({ kind: 'event', id: store.canvasReturnPhaseId })}
                  </strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SaveIndicator />
              <UndoRedo />
              <button className="wc-action" onClick={() => store.closeCanvas()} style={doneBtnStyle} data-canvas="close">
                {store.canvasReturnPhaseId ? 'Retour au moment' : 'Terminer'}
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
        <span>Toute modification agit sur la journée — les autres vues suivent.</span>
      </footer>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0,
  width: 'min(720px, 100vw)', zIndex: 860, overflowY: 'auto',
  background: M.bg, color: M.textPrimary,
  borderLeft: `1px solid ${M.line}`,
  boxShadow: '-18px 0 50px rgba(8, 9, 11, 0.18)',
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
