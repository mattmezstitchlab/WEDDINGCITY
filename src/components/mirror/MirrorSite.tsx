import { useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { typography } from '../../design/tokens';
import { MirrorLanding } from './MirrorLanding';
import { TimelineStudio } from './timeline/TimelineStudio';
import { PRODUCT_NAME, PRODUCT_MARK } from '../../design/productIdentity';
import { OrganisationSection } from './organisation/OrganisationSection';
import { AdminConsole } from './admin/AdminConsole';
import { CalendarStudio } from './calendar/CalendarStudio';
import { MiniSiteStudio } from './site/MiniSiteStudio';
import './mirror.css';

// ---------------------------------------------------------------------------
// MIRROR — the product spine.
// ---------------------------------------------------------------------------
// Landing (no project) → Jour J timeline (the desk) → Organisation. The public
// mini-site is a SEPARATE studio opened from the brand menu: same data, three
// device frames, no second editor and no second store. The calendar stays one
// projection of time, reachable from the landing hero and from the desk.
// ---------------------------------------------------------------------------

export function MirrorSite() {
  const store = weddingStore;

  // Before any wedding has been opened or created in this browser, the Mirror
  // is not a projection of anything: it is the public face of the product.
  if (!store.projectChosen) return <MirrorLanding />;

  return (
    <div id="wc-mirror" style={productPageStyle} className="wc-jourj">
      <ProductNav />
      <TimelineStudio />
      <OrganisationSection />
    </div>
  );
}

/**
 * Wordmark menu owns destinations. Calendar remains the single temporal
 * shortcut on the desk (also offered in the landing hero bar).
 */
function ProductNav() {
  const store = weddingStore;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [miniSiteOpen, setMiniSiteOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const go = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <nav style={productNavStyle} aria-label="Navigation">
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setProjectMenuOpen((value) => !value)}
            style={productWordmarkBtn}
            aria-expanded={projectMenuOpen}
            aria-haspopup="menu"
            data-jourj="brand-menu"
          >
            {PRODUCT_NAME}
            <span style={{ fontSize: '0.6em', verticalAlign: 'super', marginLeft: 2 }}>{PRODUCT_MARK}</span>
            <span aria-hidden style={{ marginLeft: 8, opacity: 0.5 }}>⌄</span>
          </button>
          {projectMenuOpen && (
            <div style={projectMenuStyle} role="menu" aria-label="Menu Le Grand Jour">
              <button role="menuitem" onClick={() => { go('jour-j'); setProjectMenuOpen(false); }}>La timeline</button>
              <button role="menuitem" onClick={() => { document.querySelector('[data-jourj="simulation"]')?.scrollIntoView({ behavior: 'smooth' }); setProjectMenuOpen(false); }}>Command center</button>
              <button role="menuitem" onClick={() => { go('organisation'); setProjectMenuOpen(false); }}>Que voulez-vous faire ?</button>
              <button
                role="menuitem"
                onClick={() => { setMiniSiteOpen(true); setProjectMenuOpen(false); }}
                data-jourj="open-minisite"
              >
                Studio mini-site
              </button>
              {store.pilotsSeveralEvents() && (
                <button role="menuitem" onClick={() => { setAdminOpen(true); setProjectMenuOpen(false); }}>Administration</button>
              )}
              <span />
              <button role="menuitem" onClick={() => store.returnToLanding()}>Accueil · Mes événements</button>
            </div>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setCalendarOpen(true)}
          className="wc-product-calendar"
          data-jourj="nav-calendar"
          aria-label="Ouvrir le calendrier"
          title="Calendrier"
        >
          <span aria-hidden>▦</span>
        </button>
      </nav>
      {calendarOpen && <CalendarStudio onClose={() => setCalendarOpen(false)} />}
      {adminOpen && <AdminConsole onClose={() => setAdminOpen(false)} />}
      {miniSiteOpen && <MiniSiteStudio onClose={() => setMiniSiteOpen(false)} />}
    </>
  );
}

const productPageStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 800, overflowY: 'auto',
  background: '#08090b', color: '#f6f5f3',
  fontFamily: typography.family.sans,
  WebkitFontSmoothing: 'antialiased',
};

const productNavStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 900,
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  padding: '14px clamp(18px, 5vw, 64px)',
  background: '#08090b', borderBottom: '1px solid rgba(246,245,243,0.12)',
  color: '#f6f5f3',
};

const productWordmarkBtn: React.CSSProperties = {
  appearance: 'none', border: 'none', background: 'transparent', color: '#f6f5f3',
  cursor: 'pointer', padding: '8px 6px 8px 0', whiteSpace: 'nowrap',
  fontFamily: typography.family.sans, fontWeight: 700, letterSpacing: '0.22em', fontSize: 12,
};

const projectMenuStyle: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 12px)', left: 0, zIndex: 1100,
  width: 260, padding: 8, display: 'grid', gap: 2,
  background: '#f6f5f3', color: '#141414', border: '1px solid rgba(20,20,20,0.14)',
  boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
};
