import { useEffect, useMemo, useRef, useState } from 'react';
import { typography } from '../../../design/tokens';
import { DEMO_DAY, MOMENT_ASSETS } from '../../../design/momentImagery';
import './timeline.css';

// ---------------------------------------------------------------------------
// LANDING FILM — the product, shown instead of described.
// ---------------------------------------------------------------------------
// The same film as the Jour J, on the public page: an hour scale, moments at
// their real position, huge hours, full-bleed photographs, real zoom and real
// horizontal navigation.
//
// IT IS A DEMONSTRATION AND IT SAYS SO. It carries no couple, no guest, no
// vendor, no venue, no price — only the shape of a day. It reads from a
// constant (DEMO_DAY), never from the store, and it writes nothing: a visitor
// can drag and zoom it without a single byte reaching any wedding.
// ---------------------------------------------------------------------------

const DAY_START = 8;
const DAY_END = 29;
const MIN_PX = 30;
const MAX_PX = 260;
const MIN_CARD_PX = 96;

const fmt = (h: number) => {
  const t = Math.round(h * 60);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export function LandingFilm({ onOpenMoment, shifted }: {
  onOpenMoment?: (index: number) => void;
  /** Index of the moment shown shifted by the propagation demonstration. */
  shifted?: { from: number; delta: number } | null;
}) {
  const [pxPerHour, setPxPerHour] = useState(96);
  // Two clicks inside one frame would both read the same stale scale, so the
  // second one did nothing. MEASURED at 768px, where the day never fitted.
  const pxRef = useRef(96);
  pxRef.current = pxPerHour;
  const [cursor, setCursor] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; scroll: number } | null>(null);

  const moments = useMemo(() => DEMO_DAY.map((m, i) => {
    const delta = shifted && i >= shifted.from ? shifted.delta : 0;
    return { ...m, hour: m.hour + delta, endHour: m.endHour + delta, index: i, shifted: delta !== 0 };
  }), [shifted]);

  const width = (DAY_END - DAY_START) * pxPerHour + MIN_CARD_PX;
  const x = (h: number) => (h - DAY_START) * pxPerHour;

  const zoom = (factorOrValue: number, clientX?: number, absolute = false) => {
    const strip = stripRef.current;
    const current = pxRef.current;
    const next = absolute ? factorOrValue : current * factorOrValue;
    const floor = Math.min(MIN_PX, strip ? (strip.clientWidth - MIN_CARD_PX) / (DAY_END - DAY_START) : MIN_PX);
    const clamped = Math.max(floor, Math.min(MAX_PX, next));
    pxRef.current = clamped;
    if (!strip) { setPxPerHour(clamped); return; }
    const rect = strip.getBoundingClientRect();
    const anchor = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const hour = DAY_START + (strip.scrollLeft + anchor) / current;
    setPxPerHour(clamped);
    requestAnimationFrame(() => {
      if (stripRef.current) stripRef.current.scrollLeft = (hour - DAY_START) * clamped - anchor;
    });
  };

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX);
    };
    strip.addEventListener('wheel', onWheel, { passive: false });
    return () => strip.removeEventListener('wheel', onWheel);
  }, [pxPerHour]);

  const ticks: number[] = [];
  const step = pxPerHour > 160 ? 0.5 : pxPerHour > 70 ? 1 : 2;
  for (let h = DAY_START; h <= DAY_END; h += step) ticks.push(Number(h.toFixed(3)));

  return (
    <div className="wc-jourj" style={{ background: 'transparent' }}>
      <div className="wc-jourj-tools" style={{ padding: '0 clamp(18px, 5vw, 64px) 16px', justifyContent: 'flex-end' }}>
        <span style={{ marginRight: 'auto', fontSize: typography.editorial.micro, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(246,245,243,0.62)' }}>
          Démonstration · aucune donnée réelle
        </span>
        <div style={zoomGroup} role="group" aria-label="Zoom de la démonstration">
          <button onClick={() => zoom(1 / 1.5)} style={zoomBtn} aria-label="Dézoomer" data-landing="zoom-out">−</button>
          <span style={zoomLabel} data-landing="zoom-level">{pxPerHour >= 170 ? 'détail' : pxPerHour >= 70 ? 'moments' : 'journée'}</span>
          <button onClick={() => zoom(1.5)} style={zoomBtn} aria-label="Zoomer" data-landing="zoom-in">+</button>
        </div>
        <button
          onClick={() => {
            const strip = stripRef.current;
            const full = strip ? (strip.clientWidth - MIN_CARD_PX) / (DAY_END - DAY_START) : MIN_PX;
            zoom(full, undefined, true);
            requestAnimationFrame(() => { if (stripRef.current) stripRef.current.scrollLeft = 0; });
          }}
          style={dayBtn}
          data-landing="zoom-day"
        >
          Toute la journée
        </button>
      </div>

      <div
        ref={stripRef}
        className="wc-jourj-strip"
        data-landing="film"
        data-px-per-hour={pxPerHour}
        onPointerDown={(e) => {
          const strip = stripRef.current;
          if (!strip) return;
          panRef.current = { x: e.clientX, scroll: strip.scrollLeft };
          strip.classList.add('is-panning');
        }}
        onPointerMove={(e) => {
          const strip = stripRef.current;
          if (!strip) return;
          const rect = strip.getBoundingClientRect();
          setCursor(DAY_START + (e.clientX - rect.left + strip.scrollLeft) / pxPerHour);
          if (!panRef.current) return;
          strip.scrollLeft = panRef.current.scroll - (e.clientX - panRef.current.x);
        }}
        onPointerUp={() => { panRef.current = null; stripRef.current?.classList.remove('is-panning'); }}
        onPointerLeave={() => { panRef.current = null; setCursor(null); stripRef.current?.classList.remove('is-panning'); }}
      >
        <div style={{ position: 'relative', width, height: '100%' }}>
          {ticks.map((h) => {
            const isHour = Math.abs(h - Math.round(h)) < 1e-6;
            const isLast = h >= DAY_END - 1e-6;
            return (
              <div key={h} style={{ position: 'absolute', left: x(h), top: 0, bottom: 0, width: 1 }}>
                <div style={{ position: 'absolute', inset: 0, background: isHour ? 'rgba(246,245,243,0.13)' : 'rgba(246,245,243,0.05)' }} />
                {isHour && <div style={{ ...tickLabel, ...(isLast ? { left: 'auto', right: 8 } : null) }}>{fmt(h)}</div>}
              </div>
            );
          })}

          {moments.map((m) => {
            const w = Math.max((m.endHour - m.hour) * pxPerHour, MIN_CARD_PX);
            const asset = MOMENT_ASSETS[m.key];
            const dense = w < 190;
            return (
              <article
                key={m.label}
                className="wc-jourj-moment"
                style={{ left: x(m.hour), width: w, transition: 'left 700ms cubic-bezier(.2,.7,.2,1)' }}
                data-landing="film-moment"
                data-hour={m.hour}
                onClick={() => onOpenMoment?.(m.index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenMoment?.(m.index); } }}
              >
                <img src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} loading="lazy" decoding="async" />
                <div style={scrim} />
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, pointerEvents: 'none' }}>
                  {/* The hour is the biggest thing on a moment. It is the film. */}
                  <div style={{ ...bigHour, fontSize: dense ? 'clamp(20px, 3vw, 30px)' : 'clamp(28px, 4.4vw, 56px)' }}>
                    {fmt(m.hour)}
                  </div>
                  {!dense && <div style={momentLabel}>{m.label}</div>}
                  {m.shifted && <div style={shiftedTag}>recalculé</div>}
                </div>
              </article>
            );
          })}

          {cursor !== null && (
            <div style={{ position: 'absolute', left: x(cursor), top: 0, bottom: 0, width: 1, background: 'rgba(246,245,243,0.32)', pointerEvents: 'none' }}>
              <div style={cursorBadge}>{fmt(cursor)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const zoomGroup: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  border: '1px solid rgba(246,245,243,0.16)', borderRadius: 999, padding: 3,
};
const zoomBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: 'none', width: 30, height: 28, fontSize: 16, lineHeight: 1, fontFamily: typography.family.sans,
};
const zoomLabel: React.CSSProperties = {
  fontSize: typography.editorial.micro, color: 'rgba(246,245,243,0.72)',
  letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 6px', minWidth: 78, textAlign: 'center',
};
const dayBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.16)', borderRadius: 999,
  padding: '9px 16px', fontSize: typography.editorial.caption, fontFamily: typography.family.sans,
};

const tickLabel: React.CSSProperties = {
  position: 'absolute', top: 14, left: 8, whiteSpace: 'nowrap',
  fontFamily: typography.family.mono, fontSize: 11, color: 'rgba(246,245,243,0.62)', letterSpacing: '0.04em',
};
const scrim: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'linear-gradient(180deg, rgba(8,9,11,0.1) 0%, rgba(8,9,11,0.7) 60%, rgba(8,9,11,0.94) 100%)',
};
const bigHour: React.CSSProperties = {
  fontFamily: typography.family.mono, fontWeight: 700, letterSpacing: '-0.02em',
  lineHeight: 1, color: '#f6f5f3',
};
const momentLabel: React.CSSProperties = {
  marginTop: 8, fontSize: 'clamp(13px, 1.3vw, 17px)', letterSpacing: '0.16em',
  textTransform: 'uppercase', color: 'rgba(246,245,243,0.9)', fontWeight: 600,
};
const shiftedTag: React.CSSProperties = {
  marginTop: 8, display: 'inline-block', background: '#f6f5f3', color: '#08090b',
  borderRadius: 999, padding: '3px 9px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
};
const cursorBadge: React.CSSProperties = {
  position: 'absolute', top: 12, left: 6, fontFamily: typography.family.mono,
  fontSize: 11, color: 'rgba(246,245,243,0.75)', whiteSpace: 'nowrap',
};
