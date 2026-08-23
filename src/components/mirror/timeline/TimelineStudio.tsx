import { useEffect, useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { momentImage, MOMENT_TEMPLATES } from '../../../design/momentImagery';
import { MomentHub } from './MomentHub';
import './timeline.css';

// ---------------------------------------------------------------------------
// JOUR J — the timeline IS the product.
// ---------------------------------------------------------------------------
// A wedding is a day, and a day is a strip of time. This surface draws that
// strip literally: a horizontal hour scale, and every moment placed at its real
// hour, as wide as it really lasts. Reading it should feel like watching the
// film of the day before it happens — big images, no cards, no dashboard.
//
// THREE MECHANICS, all measured in a real browser:
//
//   ZOOM      pixels-per-hour, continuous from the whole day to five-minute
//             precision. The instant under the cursor stays under the cursor.
//   PAN       native horizontal scrolling, plus grab-and-drag on the surface.
//   MOVE      pointer capture on the CARD ITSELF. The card follows the finger,
//             a guide shows where it will land and at what time, and the drop
//             writes the new hour through the store (one undo step, saved).
//
// Nothing here invents data: an empty day stays empty and says so.
// ---------------------------------------------------------------------------

const MIN_PX_PER_HOUR = 42;      // the whole day on one screen
const MAX_PX_PER_HOUR = 900;     // five-minute work
const DEFAULT_PX_PER_HOUR = 190;
const SNAP_MINUTES = 5;
/**
 * A moment shorter than ~30 minutes would be a sliver at normal zoom, so a card
 * never goes below this width. The scale therefore carries a tail of the same
 * size, otherwise the last moment of the day would stick out past midnight —
 * MEASURED at 390px, where it made the page scroll sideways by 8px.
 */
const MIN_CARD_PX = 96;

/**
 * The day runs from 07:00 to 03:00 the next morning by default — but it is the
 * DATA that decides: a moment at 05:00 or at 05:30 the next morning must be
 * drawn, not left outside the film. MEASURED: a moment created at 29:00 (05:00
 * the day after) existed in the store and appeared nowhere on the strip.
 */
const DEFAULT_DAY_START = 7;
const DEFAULT_DAY_END = 27;

export function formatHour(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

interface DragState {
  phaseId: string;
  /** Where the pointer grabbed the card, in px from its left edge. */
  grabOffset: number;
  /** Live start hour under the pointer, already snapped. */
  targetStart: number;
  /** Live pixel left of the card while dragging. */
  left: number;
  width: number;
  moved: boolean;
}

export function TimelineStudio() {
  const store = weddingStore;
  const phases = useMemo(
    () => [...store.phases].sort((a, b) => a.startHour - b.startHour),
    [store.version],
  );

  const [pxPerHour, setPxPerHour] = useState(DEFAULT_PX_PER_HOUR);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [cursorHour, setCursorHour] = useState<number | null>(null);
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftStart, setDraftStart] = useState('15:00');
  const [draftDuration, setDraftDuration] = useState('60');
  const [ripple, setRipple] = useState<{ phaseId: string; delta: number; count: number } | null>(null);

  const stripRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startX: number; startScroll: number } | null>(null);

  // The film always covers at least the usual day, and always covers the data.
  const DAY_START = Math.min(DEFAULT_DAY_START, ...phases.map((p) => Math.floor(p.startHour)));
  const DAY_END = Math.max(DEFAULT_DAY_END, ...phases.map((p) => Math.ceil(p.endHour)));

  const width = (DAY_END - DAY_START) * pxPerHour + MIN_CARD_PX;
  const xForHour = (h: number) => (h - DAY_START) * pxPerHour;
  const hourForX = (x: number) => DAY_START + x / pxPerHour;
  const snap = (h: number) => Math.round(h * (60 / SNAP_MINUTES)) / (60 / SNAP_MINUTES);

  // --- zoom, keeping the instant under the cursor still ---------------------
  /**
   * The floor of the zoom is not a constant: "the whole day" must really mean
   * the whole day, on a phone as on a large screen. MEASURED at 768px, a fixed
   * 42 px/h still left 115px of the day off screen.
   */
  const fullDayPxPerHour = () => {
    const w = (stripRef.current?.clientWidth ?? 0) - MIN_CARD_PX;
    return w > 0 ? w / (DAY_END - DAY_START) : MIN_PX_PER_HOUR;
  };

  const zoomAround = (nextPx: number, clientX?: number) => {
    const strip = stripRef.current;
    const floor = Math.min(MIN_PX_PER_HOUR, fullDayPxPerHour());
    const clamped = Math.max(floor, Math.min(MAX_PX_PER_HOUR, nextPx));
    if (!strip) { setPxPerHour(clamped); return; }
    const rect = strip.getBoundingClientRect();
    const anchorX = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const hourUnderPointer = DAY_START + (strip.scrollLeft + anchorX) / pxPerHour;
    setPxPerHour(clamped);
    requestAnimationFrame(() => {
      const el = stripRef.current;
      if (!el) return;
      el.scrollLeft = (hourUnderPointer - DAY_START) * clamped - anchorX;
    });
  };

  // Ctrl/⌘ + wheel = zoom (the browser gesture for scale), plain wheel pans.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAround(pxPerHour * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX);
      } else if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && e.shiftKey) {
        e.preventDefault();
        strip.scrollLeft += e.deltaY;
      }
    };
    strip.addEventListener('wheel', onWheel, { passive: false });
    return () => strip.removeEventListener('wheel', onWheel);
  }, [pxPerHour]);

  // --- moving a moment: the CARD moves, not an icon --------------------------
  const onMomentPointerDown = (e: React.PointerEvent, phaseId: string) => {
    if (e.button !== 0) return;
    const strip = stripRef.current;
    const phase = phases.find((p) => p.id === phaseId);
    if (!strip || !phase) return;
    const rect = strip.getBoundingClientRect();
    const pointerX = e.clientX - rect.left + strip.scrollLeft;
    const left = xForHour(phase.startHour);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      phaseId,
      grabOffset: pointerX - left,
      targetStart: phase.startHour,
      left,
      width: Math.max((phase.endHour - phase.startHour) * pxPerHour, MIN_CARD_PX),
      moved: false,
    });
  };

  const onMomentPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const strip = stripRef.current;
    if (!strip) return;
    e.preventDefault();
    const rect = strip.getBoundingClientRect();
    const pointerX = e.clientX - rect.left + strip.scrollLeft;
    const rawLeft = pointerX - drag.grabOffset;
    const target = snap(Math.max(DAY_START, Math.min(DAY_END - 0.25, hourForX(rawLeft))));
    setDrag({ ...drag, left: xForHour(target), targetStart: target, moved: true });

    // Auto-pan when the card is pushed against an edge of the viewport.
    const edge = 60;
    const localX = e.clientX - rect.left;
    if (localX < edge) strip.scrollLeft -= (edge - localX) / 4;
    else if (localX > rect.width - edge) strip.scrollLeft += (localX - (rect.width - edge)) / 4;
  };

  const onMomentPointerUp = () => {
    if (!drag) return;
    const phase = phases.find((p) => p.id === drag.phaseId);
    const target = drag.targetStart;
    const current = drag;
    setDrag(null);
    if (!phase || !current.moved || Math.abs(target - phase.startHour) < 1e-6) return;
    const delta = target - phase.startHour;
    const followers = store.phasesAfter(phase.id).length;
    if (store.setPhaseTime(phase.id, target)) {
      // The chain of the day is a proposal, never an automatic rewrite.
      if (followers > 0) setRipple({ phaseId: phase.id, delta, count: followers });
    }
  };

  // --- panning the film ------------------------------------------------------
  const onStripPointerDown = (e: React.PointerEvent) => {
    if (drag || e.button !== 0) return;
    const strip = stripRef.current;
    if (!strip) return;
    panRef.current = { startX: e.clientX, startScroll: strip.scrollLeft };
    strip.classList.add('is-panning');
  };
  const onStripPointerMove = (e: React.PointerEvent) => {
    const strip = stripRef.current;
    if (strip) {
      const rect = strip.getBoundingClientRect();
      setCursorHour(hourForX(e.clientX - rect.left + strip.scrollLeft));
    }
    if (!panRef.current || !strip) return;
    strip.scrollLeft = panRef.current.startScroll - (e.clientX - panRef.current.startX);
  };
  const endPan = () => {
    panRef.current = null;
    stripRef.current?.classList.remove('is-panning');
  };

  // --- creating a moment -----------------------------------------------------
  const parseClock = (value: string): number | null => {
    const m = /^(\d{1,2})\s*[:h]\s*(\d{2})?$/.exec(value.trim());
    if (!m) return null;
    const h = Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
    return Number.isFinite(h) ? h : null;
  };

  const submitMoment = () => {
    const start = parseClock(draftStart);
    const minutes = Number(draftDuration);
    if (!draftName.trim() || start === null || !Number.isFinite(minutes) || minutes <= 0) return;
    const created = store.createPhase({
      name: draftName.trim(),
      startHour: start,
      durationHours: minutes / 60,
    });
    if (!created) return;
    setDraftName('');
    setComposing(false);
    // Bring the new moment into view — the day should never hide what you add.
    requestAnimationFrame(() => {
      const strip = stripRef.current;
      if (strip) strip.scrollLeft = Math.max(0, xForHour(created.startHour) - 120);
    });
  };

  const addTemplate = (label: string, startHour: number, durationHours: number) => {
    const created = store.createPhase({ name: label, startHour, durationHours });
    if (created) {
      requestAnimationFrame(() => {
        const strip = stripRef.current;
        if (strip) strip.scrollLeft = Math.max(0, xForHour(created.startHour) - 120);
      });
    }
  };

  // --- the hour ruler --------------------------------------------------------
  const tickStep = pxPerHour > 420 ? 0.25 : pxPerHour > 220 ? 0.5 : pxPerHour > 90 ? 1 : 2;
  const ticks: number[] = [];
  for (let h = DAY_START; h <= DAY_END; h += tickStep) ticks.push(Number(h.toFixed(4)));

  const project = store.currentProject;
  const dayLabel = project.weddingDate
    ? new Date(project.weddingDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <section className="wc-jourj" id="jour-j" aria-label="Le Jour J">
      {/* ---- the head: whose day, which day, and the tools of the film ---- */}
      <div className="wc-jourj-head">
        <div style={{ minWidth: 0 }}>
          <div style={eyebrow}>Le Jour J</div>
          <h1 className="wc-jourj-title" style={dayTitleStyle}>
            {project.coupleNames || 'Votre mariage'}
          </h1>
          <div style={{ marginTop: 12, display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--jourj-dim)', fontSize: typography.editorial.caption }}>
            {dayLabel && <span>{dayLabel}</span>}
            {project.locationName && <span>{project.locationName}</span>}
            <span>{phases.length === 0 ? 'aucun moment' : phases.length === 1 ? '1 moment' : `${phases.length} moments`}</span>
          </div>
        </div>

        <div className="wc-jourj-tools">
          <button onClick={() => setComposing((v) => !v)} style={primaryBtn} data-jourj="add-moment">
            + Ajouter un moment
          </button>
          <div style={zoomGroup} role="group" aria-label="Zoom temporel">
            <button onClick={() => zoomAround(pxPerHour / 1.4)} style={zoomBtn} aria-label="Dézoomer" data-jourj="zoom-out">−</button>
            <span style={zoomLabel} data-jourj="zoom-level">
              {pxPerHour >= 420 ? 'précision' : pxPerHour >= 150 ? 'moments' : pxPerHour >= 80 ? 'demi-journée' : 'journée'}
            </span>
            <button onClick={() => zoomAround(pxPerHour * 1.4)} style={zoomBtn} aria-label="Zoomer" data-jourj="zoom-in">+</button>
          </div>
          <button
            onClick={() => {
              setPxPerHour(fullDayPxPerHour());
              requestAnimationFrame(() => { if (stripRef.current) stripRef.current.scrollLeft = 0; });
            }}
            style={ghostBtn}
            data-jourj="zoom-day"
          >
            Toute la journée
          </button>
        </div>
      </div>

      {/* ---- inline composer: a moment is one line, not a form ---- */}
      {composing && (
        <div style={composerRow}>
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitMoment(); if (e.key === 'Escape') setComposing(false); }}
            placeholder="Nom du moment — cérémonie, cocktail, discours…"
            style={{ ...input, flex: '1 1 260px' }}
            data-jourj="moment-name"
          />
          <input
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitMoment(); }}
            placeholder="15:00"
            style={{ ...input, width: 92 }}
            aria-label="Heure de début"
            data-jourj="moment-start"
          />
          <input
            value={draftDuration}
            onChange={(e) => setDraftDuration(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitMoment(); }}
            placeholder="60"
            style={{ ...input, width: 80 }}
            aria-label="Durée en minutes"
            data-jourj="moment-duration"
          />
          <span style={{ color: 'var(--jourj-faint)', fontSize: typography.editorial.caption }}>minutes</span>
          <button onClick={submitMoment} style={primaryBtn} data-jourj="moment-create">Créer</button>
          <button onClick={() => setComposing(false)} style={ghostBtn}>Annuler</button>
          {/* The same templates as the empty day, still one click each and
              still never injected on their own. */}
          <span style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {MOMENT_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => addTemplate(t.label, t.startHour, t.durationHours)}
                style={templateChip}
                data-jourj="template"
              >
                {t.label}
                <span style={{ color: 'var(--jourj-faint)', marginLeft: 8 }}>{formatHour(t.startHour)}</span>
              </button>
            ))}
          </span>
        </div>
      )}

      {/* ---- the film. An empty day draws no scale: there is no time to read
             yet, and a ruler over nothing is decoration. ---- */}
      {phases.length > 0 && (
      <div
        ref={stripRef}
        className="wc-jourj-strip"
        onPointerDown={onStripPointerDown}
        onPointerMove={onStripPointerMove}
        onPointerUp={endPan}
        onPointerLeave={() => { endPan(); setCursorHour(null); }}
        data-jourj="strip"
      >
        <div style={{ position: 'relative', width, height: '100%' }} data-jourj="scale" data-px-per-hour={pxPerHour}>
          {/* hour scale */}
          {ticks.map((h) => {
            const isHour = Math.abs(h - Math.round(h)) < 1e-6;
            // MEASURED at 768px: the label of the very last tick hung 43px past
            // the end of the day and made the page itself scrollable. The last
            // one reads to the LEFT of its line.
            const isLast = h >= DAY_END - 1e-6;
            return (
              <div key={h} style={{ position: 'absolute', left: xForHour(h), top: 0, bottom: 0, width: 1 }}>
                <div style={{ position: 'absolute', inset: 0, background: isHour ? 'rgba(246,245,243,0.13)' : 'rgba(246,245,243,0.05)' }} />
                {isHour && (
                  <div style={{ ...tickLabel, ...(isLast ? { left: 'auto', right: 8 } : null) }}>{formatHour(h)}</div>
                )}
              </div>
            );
          })}

          {/* the moment being dropped: where it lands, and at what time */}
          {drag && (
            <>
              <div style={{ position: 'absolute', left: drag.left, top: 0, bottom: 0, width: 2, background: '#f6f5f3', opacity: 0.9, zIndex: 25 }} />
              <div style={{ ...dropBadge, left: drag.left + 8 }} data-jourj="drop-time">
                {formatHour(drag.targetStart)}
              </div>
            </>
          )}

          {/* the moments */}
          {phases.map((phase) => {
            const isDragged = drag?.phaseId === phase.id;
            const duration = phase.endHour - phase.startHour;
            const left = isDragged ? drag!.left : xForHour(phase.startHour);
            const cardWidth = Math.max(duration * pxPerHour, MIN_CARD_PX);
            const own = store.media.find((m) => m.ownerKind === 'event' && m.ownerId === phase.id && m.kind === 'image');
            const image = momentImage(phase.name, own?.source);
            const hub = store.getPhaseHub(phase.id);
            const dense = cardWidth < 150;
            return (
              <article
                key={phase.id}
                className={`wc-jourj-moment${isDragged ? ' is-dragging' : ''}`}
                style={{ left, width: cardWidth }}
                onPointerDown={(e) => onMomentPointerDown(e, phase.id)}
                onPointerMove={onMomentPointerMove}
                onPointerUp={onMomentPointerUp}
                onPointerCancel={onMomentPointerUp}
                data-jourj="moment"
                data-phase-id={phase.id}
                data-start={phase.startHour}
              >
                <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" />
                <div style={momentScrim} />
                <div style={momentBody}>
                  <div style={momentHour}>{formatHour(phase.startHour)}</div>
                  {!dense && (
                    <>
                      <div style={momentName}>{phase.name}</div>
                      <div style={momentMeta}>
                        {formatDuration(duration)}
                        {hub && hub.persons.length > 0 && ` · ${hub.persons.length} pers.`}
                        {hub && hub.vendors.length > 0 && ` · ${hub.vendors.length} prest.`}
                        {hub && hub.media.length > 0 && ` · ${hub.media.length} doc.`}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenPhaseId(phase.id); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={openBtn}
                  data-jourj="open-moment"
                >
                  Ouvrir
                </button>
              </article>
            );
          })}

          {/* where you are in the day */}
          {cursorHour !== null && !drag && (
            <div style={{ position: 'absolute', left: xForHour(cursorHour), top: 0, bottom: 0, width: 1, background: 'rgba(246,245,243,0.35)', pointerEvents: 'none' }}>
              <div style={cursorBadge} data-jourj="cursor-time">{formatHour(cursorHour)}</div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ---- the empty day: beautiful, and honest about being empty ---- */}
      {phases.length === 0 && (
        <div style={emptyWrap} data-jourj="empty">
          <div style={eyebrow}>Le Jour J</div>
          <p style={emptyTitle}>Votre histoire commence ici.</p>
          <p style={emptyBody}>
            Cette journée est vide : aucun moment, aucun invité, aucun prestataire
            n’a été inventé pour la remplir. Ajoutez le premier moment — tout le
            reste s’y accrochera.
          </p>
          <button onClick={() => setComposing(true)} style={{ ...primaryBtn, marginTop: 18 }} data-jourj="empty-add">
            + Ajouter le premier moment
          </button>
          <div style={{ marginTop: 26 }}>
            <div style={{ ...eyebrow, marginBottom: 10 }}>Ou partir d’un modèle</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MOMENT_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => addTemplate(t.label, t.startHour, t.durationHours)}
                  style={templateChip}
                  data-jourj="template"
                >
                  {t.label}
                  <span style={{ color: 'var(--jourj-faint)', marginLeft: 8 }}>{formatHour(t.startHour)}</span>
                </button>
              ))}
            </div>
            <p style={{ ...emptyBody, marginTop: 12, fontSize: typography.editorial.micro }}>
              Un modèle ajoute un seul moment, à une heure que vous pourrez déplacer.
              Rien n’est injecté sans votre clic.
            </p>
          </div>
        </div>
      )}

      {/* ---- the chain of the day, proposed after a move ---- */}
      {ripple && (
        <div style={rippleBar} role="status" data-jourj="ripple">
          <span>
            Ce moment a bougé de {Math.round(ripple.delta * 60)} minutes.
            {' '}Décaler aussi {ripple.count === 1 ? 'le moment suivant' : `les ${ripple.count} moments suivants`} ?
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                store.shiftPhasesAfter(ripple.phaseId, ripple.delta);
                setRipple(null);
              }}
              style={primaryBtn}
              data-jourj="ripple-apply"
            >
              Décaler la suite
            </button>
            <button onClick={() => setRipple(null)} style={ghostBtn} data-jourj="ripple-dismiss">
              Ce moment seulement
            </button>
          </span>
        </div>
      )}

      {openPhaseId && (
        <MomentHub phaseId={openPhaseId} onClose={() => setOpenPhaseId(null)} />
      )}
    </section>
  );
}

// --- styles ------------------------------------------------------------------
// Only what does NOT change with the viewport lives here (see timeline.css).

/** Fluid, and readable by anything that computes styles (see check-render). */
const dayTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(30px, 7vw, 72px)',
  lineHeight: 0.92,
  letterSpacing: '-0.04em',
  fontWeight: typography.weight.semibold,
};

const eyebrow: React.CSSProperties = {
  fontSize: typography.editorial.micro,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: typography.weight.bold,
  color: 'var(--jourj-faint)',
};

const primaryBtn: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer',
  background: '#f6f5f3', color: '#08090b',
  borderRadius: 999, padding: '10px 18px',
  fontSize: typography.editorial.caption, fontWeight: typography.weight.semibold,
  fontFamily: typography.family.sans,
};

const ghostBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: 'transparent', color: '#f6f5f3',
  border: '1px solid var(--jourj-line)',
  borderRadius: 999, padding: '9px 16px',
  fontSize: typography.editorial.caption, fontFamily: typography.family.sans,
};

const zoomGroup: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  border: '1px solid var(--jourj-line)', borderRadius: 999, padding: 3,
};

const zoomBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: 'none', width: 30, height: 28, fontSize: 16, lineHeight: 1,
  fontFamily: typography.family.sans,
};

const zoomLabel: React.CSSProperties = {
  fontSize: typography.editorial.micro, color: 'var(--jourj-dim)',
  letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 6px',
  minWidth: 92, textAlign: 'center',
};

const composerRow: React.CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
  padding: '0 clamp(18px, 5vw, 64px) 18px',
};

const input: React.CSSProperties = {
  background: '#101114', color: '#f6f5f3',
  border: '1px solid var(--jourj-line)', borderRadius: 4,
  padding: '10px 12px', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans, outline: 'none',
};

const tickLabel: React.CSSProperties = {
  position: 'absolute', top: 14, left: 8, whiteSpace: 'nowrap',
  fontFamily: typography.family.mono, fontSize: 11,
  // AA on #08090b: 0.42 measured 3.80:1. 0.62 measures 6.0:1.
  color: 'rgba(246,245,243,0.62)', letterSpacing: '0.04em',
};

const momentScrim: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'linear-gradient(180deg, rgba(8,9,11,0.15) 0%, rgba(8,9,11,0.72) 62%, rgba(8,9,11,0.92) 100%)',
};

const momentBody: React.CSSProperties = {
  position: 'absolute', left: 14, right: 14, bottom: 14, pointerEvents: 'none',
};

const momentHour: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: 13, letterSpacing: '0.06em',
  color: '#f6f5f3', fontWeight: 600,
};

const momentName: React.CSSProperties = {
  marginTop: 6, fontSize: 'clamp(16px, 1.6vw, 22px)', lineHeight: 1.15,
  letterSpacing: '-0.02em', fontWeight: 600, color: '#f6f5f3',
  overflowWrap: 'anywhere',
};

const momentMeta: React.CSSProperties = {
  marginTop: 6, fontSize: typography.editorial.micro, color: 'rgba(246,245,243,0.72)',
};

const openBtn: React.CSSProperties = {
  position: 'absolute', top: 10, right: 10,
  appearance: 'none', cursor: 'pointer',
  background: 'rgba(8,9,11,0.62)', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  // No control under 11px, on a phone included.
  padding: '6px 12px', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans,
};

const dropBadge: React.CSSProperties = {
  position: 'absolute', top: 12, zIndex: 26,
  background: '#f6f5f3', color: '#08090b', borderRadius: 999,
  padding: '4px 10px', fontFamily: typography.family.mono, fontSize: 12, fontWeight: 700,
};

const cursorBadge: React.CSSProperties = {
  position: 'absolute', top: 12, left: 6,
  fontFamily: typography.family.mono, fontSize: 11,
  color: 'rgba(246,245,243,0.75)', whiteSpace: 'nowrap',
};

const emptyWrap: React.CSSProperties = {
  padding: 'clamp(28px, 6vw, 64px) clamp(18px, 5vw, 64px) clamp(40px, 8vw, 90px)',
  maxWidth: 760,
};

const emptyTitle: React.CSSProperties = {
  margin: '14px 0 0', fontSize: 'clamp(26px, 4.4vw, 44px)',
  letterSpacing: '-0.03em', lineHeight: 1.05, fontWeight: 600, color: '#f6f5f3',
};

const emptyBody: React.CSSProperties = {
  margin: '14px 0 0', maxWidth: 560,
  fontSize: typography.editorial.body, lineHeight: 1.65, color: 'var(--jourj-dim)',
};

const templateChip: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: 'transparent', color: '#f6f5f3',
  border: '1px solid var(--jourj-line)', borderRadius: 999,
  padding: '9px 16px', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans,
};

const rippleBar: React.CSSProperties = {
  position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
  zIndex: 1300, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
  background: '#101114', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.24)', borderRadius: 999,
  padding: '10px 12px 10px 20px', maxWidth: 'min(92vw, 720px)',
  fontSize: typography.editorial.caption,
  boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
};
