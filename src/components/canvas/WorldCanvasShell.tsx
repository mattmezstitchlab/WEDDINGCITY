import { useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { radius, typography, shadowFor } from '../../design/tokens';
import { K } from './CanvasPrimitives';
import {
  CanvasCore, CanvasTab, CANVAS_TABS, tabForFocus, focusLabel, SaveIndicator, UndoRedo,
} from './CanvasCore';

// ---------------------------------------------------------------------------
// WORLD CANVAS SHELL — the side panel over the 3D world.
// ---------------------------------------------------------------------------
// Unchanged behaviour from Phase D: a contextual panel on the right, the World
// stays visible behind it. Layout only — every mutation lives in CanvasCore.
// ---------------------------------------------------------------------------

export function WorldCanvasShell() {
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

  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>Canvas · Composition</div>
          <div style={breadcrumbStyle}>
            {CANVAS_TABS.find((t) => t.id === tab)?.label}
            {store.canvasFocus && <span style={{ color: K.textMuted }}> → {focusLabel(store.canvasFocus)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SaveIndicator />
          <UndoRedo compact />
          <button onClick={() => store.closeCanvas()} style={closeBtnStyle} aria-label="Fermer">✕</button>
        </div>
      </header>

      <nav style={tabsStyle}>
        {CANVAS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); store.setCanvasFocus(null); }}
            style={tabStyle(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div style={bodyStyle}>
        <CanvasCore tab={tab} />
      </div>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0,
  width: 'min(560px, 100vw)', zIndex: 850,
  background: K.bg, color: K.textPrimary,
  borderLeft: `1px solid ${K.lineStrong}`,
  boxShadow: shadowFor(4, 'world'),
  display: 'flex', flexDirection: 'column',
  fontFamily: typography.family.sans,
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  padding: '16px 18px 12px', borderBottom: `1px solid ${K.line}`,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: K.textMuted, fontWeight: 700,
};

const breadcrumbStyle: React.CSSProperties = {
  marginTop: 5, fontSize: typography.size.bodyLg, color: K.textPrimary,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const tabsStyle: React.CSSProperties = {
  display: 'flex', gap: 4, padding: '10px 14px',
  borderBottom: `1px solid ${K.line}`, overflowX: 'auto',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  font: 'inherit', fontSize: typography.size.caption, fontWeight: 600,
  border: 'none', borderRadius: radius.pill, padding: '6px 13px', cursor: 'pointer',
  whiteSpace: 'nowrap',
  background: active ? K.textPrimary : 'transparent',
  color: active ? K.surface : K.textSecondary,
});

const bodyStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '16px 18px 40px',
};

const closeBtnStyle: React.CSSProperties = {
  border: `1px solid ${K.line}`, background: K.surface, color: K.textSecondary,
  width: 28, height: 28, borderRadius: radius.pill, cursor: 'pointer', fontSize: 12,
};
