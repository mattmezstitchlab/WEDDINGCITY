import { useEffect, useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { momentImage, MOMENT_TEMPLATES } from '../../../design/momentImagery';
import { PRODUCT_NAME } from '../../../design/productIdentity';
import { MomentHub } from './MomentHub';
import { EventPanel } from './EventPanel';
import { CERTAINTY } from '../../../design/certainty';
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

/**
 * The current time of day, in the same decimal hours as the model.
 *
 * MEASURED at 03:00: the marker fell outside the drawn day and disappeared. The
 * small hours belong to the night of the wedding day — 03:00 is 27:00 here.
 */
function nowHour(): number {
  const d = new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  return h < DEFAULT_DAY_START ? h + 24 : h;
}

/**
 * 01:00 typed on a wedding day means the NIGHT of that day, not one o'clock in
 * the morning before the preparations. MEASURED: an after-party entered as
 * "01:00" landed at the very beginning of the day and re-chained the whole
 * programme backwards. When the day already runs past noon, a small hour is
 * read as the night that follows it — the model has room for it (0 → 30).
 */
export function normalizeNightHour(hour: number, phases: { endHour: number }[]): number {
  if (hour >= 6) return hour;
  return phases.some((p) => p.endHour > 12) ? hour + 24 : hour;
}

/** Wall clock, with the day marker when the hour belongs to the next morning. */
export function formatHourWithDay(h: number): string {
  return h >= 24 ? `${formatHour(h)} (+1)` : formatHour(h);
}

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
  // Same reason as the landing film: two clicks in one frame must compound.
  const pxRef = useRef(DEFAULT_PX_PER_HOUR);
  pxRef.current = pxPerHour;
  const [drag, setDrag] = useState<DragState | null>(null);
  const [cursorHour, setCursorHour] = useState<number | null>(null);
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftStart, setDraftStart] = useState('15:00');
  const [draftDuration, setDraftDuration] = useState('60');
  const [ripple, setRipple] = useState<{ phaseId: string; delta: number; count: number } | null>(null);
  const [eventPanelOpen, setEventPanelOpen] = useState(false);

  // ONE DOOR, WHEREVER YOU CAME FROM. The calendar, the search, a mission or a
  // document all ask the store to open a moment; the timeline is the only thing
  // that knows how. The request is consumed once, so nothing re-opens by itself.
  useEffect(() => {
    const requested = store.focusPhaseId;
    if (!requested) return;
    const exists = store.phases.some((p) => p.id === requested);
    store.consumeMomentFocus();
    if (!exists) return;
    setOpenPhaseId(requested);
    requestAnimationFrame(() => {
      document.querySelector(`[data-phase-id="${requested}"]`)
        ?.scrollIntoView({ inline: 'center', block: 'nearest' });
    });
  }, [store.focusPhaseId, store.version]);

  const [nowMode, setNowMode] = useState(false);
  const [clock, setClock] = useState(() => nowHour());

  // MODE JOUR J — the real clock, ticking. Nothing is simulated: the marker is
  // where the actual time is, and the page says plainly whether today IS the
  // wedding day.
  useEffect(() => {
    if (!nowMode) return;
    const id = setInterval(() => setClock(nowHour()), 20000);
    setClock(nowHour());
    return () => clearInterval(id);
  }, [nowMode]);

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

  const zoomAround = (factor: number, clientX?: number) => {
    const strip = stripRef.current;
    const current = pxRef.current;
    const floor = Math.min(MIN_PX_PER_HOUR, fullDayPxPerHour());
    const clamped = Math.max(floor, Math.min(MAX_PX_PER_HOUR, current * factor));
    pxRef.current = clamped;
    if (!strip) { setPxPerHour(clamped); return; }
    const rect = strip.getBoundingClientRect();
    const anchorX = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const hourUnderPointer = DAY_START + (strip.scrollLeft + anchorX) / current;
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
        zoomAround(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX);
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
    const parsed = parseClock(draftStart);
    const minutes = Number(draftDuration);
    if (!draftName.trim() || parsed === null || !Number.isFinite(minutes) || minutes <= 0) return;
    const start = normalizeNightHour(parsed, phases);
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
          <button onClick={() => setEventPanelOpen(true)} style={ghostBtn} data-jourj="open-event">
            L’événement
          </button>
          <button onClick={() => setComposing((v) => !v)} style={primaryBtn} data-jourj="add-moment">
            + Ajouter un moment
          </button>
          <button
            onClick={() => {
              const next = !nowMode;
              setNowMode(next);
              if (next) {
                const strip = stripRef.current;
                if (strip) strip.scrollLeft = Math.max(0, xForHour(nowHour()) - strip.clientWidth / 2);
              }
            }}
            style={nowMode ? primaryBtn : ghostBtn}
            data-jourj="now-mode"
            aria-pressed={nowMode}
          >
            Mode Jour J
          </button>
          <div style={zoomGroup} role="group" aria-label="Zoom temporel">
            <button onClick={() => zoomAround(1 / 1.4)} style={zoomBtn} aria-label="Dézoomer" data-jourj="zoom-out">−</button>
            <span style={zoomLabel} data-jourj="zoom-level">
              {pxPerHour >= 420 ? 'précision' : pxPerHour >= 150 ? 'moments' : pxPerHour >= 80 ? 'demi-journée' : 'journée'}
            </span>
            <button onClick={() => zoomAround(1.4)} style={zoomBtn} aria-label="Zoomer" data-jourj="zoom-in">+</button>
          </div>
          <button
            onClick={() => {
              const full = fullDayPxPerHour();
              pxRef.current = full;
              setPxPerHour(full);
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
            // What this scene is still missing, read from the same engine the
            // whole product uses. Gaps and conflicts come first: a card should
            // announce a problem before it announces a success.
            const allFindings = store.phaseFindings(phase.id);
            const findings = [
              ...allFindings.filter((f) => f.level === 'conflict'),
              ...allFindings.filter((f) => f.level === 'gap'),
              ...allFindings.filter((f) => f.level === 'ok'),
            ];
            const extraFindings = Math.max(0, findings.length - 3);
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
                  <div style={momentHour}>
                    {formatHour(phase.startHour)}
                    {phase.confidence && phase.confidence !== 'confirmed' && (
                      <span
                        style={{ ...estimateTag, color: CERTAINTY[phase.confidence].color, borderColor: CERTAINTY[phase.confidence].color }}
                        title={phase.confidenceNote || CERTAINTY[phase.confidence].meaning}
                        data-jourj="moment-certainty"
                        data-level={phase.confidence}
                      >
                        {CERTAINTY[phase.confidence].label}
                      </span>
                    )}
                  </div>
                  {!dense && (
                    <>
                      <div style={momentName}>{phase.name}</div>
                      <div style={momentMeta}>
                        {formatDuration(duration)}
                        {hub && hub.persons.length > 0 && ` · ${hub.persons.length} pers.`}
                        {hub && hub.vendors.length > 0 && ` · ${hub.vendors.length} prest.`}
                        {hub && hub.media.length > 0 && ` · ${hub.media.length} doc.`}
                      </div>

                      {/* THE STATE OF THE SCENE, on the scene itself.
                          Derived from phaseFindings() — the same reading the
                          hub opens on. Three lines at most: the card announces,
                          the hub explains. */}
                      {cardWidth >= 240 && findings.length > 0 && (
                        <ul style={stateList} data-jourj="moment-state">
                          {findings.slice(0, 3).map((f, i) => (
                            <li
                              key={i}
                              style={{ ...stateLine, color: f.level === 'ok' ? 'rgba(246,245,243,0.72)' : f.level === 'conflict' ? '#e0736a' : '#e0a06a' }}
                              data-jourj="moment-state-line"
                              data-level={f.level}
                            >
                              {f.level === 'ok' ? '✓' : '⚠'} {f.title}
                            </li>
                          ))}
                          {extraFindings > 0 && (
                            <li style={{ ...stateLine, color: 'rgba(246,245,243,0.5)' }}>
                              + {extraFindings} autre{extraFindings > 1 ? 's' : ''}
                            </li>
                          )}
                        </ul>
                      )}
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

          {/* MAINTENANT — the real time, on the real scale */}
          {nowMode && clock >= DAY_START && clock <= DAY_END && (
            <div style={{ position: 'absolute', left: xForHour(clock), top: 0, bottom: 0, width: 2, background: '#e0736a', zIndex: 24, pointerEvents: 'none' }}>
              <div style={nowBadge} data-jourj="now-badge">{formatHour(clock)} · maintenant</div>
            </div>
          )}

          {/* where you are in the day */}
          {cursorHour !== null && !drag && (
            <div style={{ position: 'absolute', left: xForHour(cursorHour), top: 0, bottom: 0, width: 1, background: 'rgba(246,245,243,0.35)', pointerEvents: 'none' }}>
              <div style={cursorBadge} data-jourj="cursor-time">{formatHour(cursorHour)}</div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ---- MODE JOUR J: what is happening, and what comes next ---- */}
      {nowMode && (
        <div style={nowPanel} data-jourj="now-panel">
          <NowState phases={phases} clock={clock} weddingDate={project.weddingDate} />
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

      {/* ---- CAUSALITÉ — what moving this moment really does, by name ----
             The engine is the same one that has always propagated a shift
             (shiftPhasesAfter). What changes here is that the consequence is
             READ BEFORE it happens: who slides, what breaks, and the four ways
             out. Nothing is applied until one of them is clicked. */}
      {ripple && (() => {
        const impact = store.propagationImpact(ripple.phaseId, ripple.delta);
        const minutes = Math.round(ripple.delta * 60);
        const sign = minutes > 0 ? '+' : '';
        return (
          <div style={rippleBar} role="status" data-jourj="ripple">
            <div style={{ display: 'grid', gap: 10, flex: '1 1 420px' }}>
              <span>
                <strong>{impact?.moment.name ?? 'Ce moment'} {sign}{minutes}</strong>
                {' — '}
                {ripple.count === 1 ? 'le moment suivant' : `les ${ripple.count} moments suivants`}
                {' '}peuvent suivre.
              </span>

              {impact && (impact.people.length > 0 || impact.vendors.length > 0) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} data-jourj="ripple-people">
                  {impact.people.map((p) => (
                    <span key={p.id} style={impactChip} data-jourj="ripple-person">
                      {p.name}{p.role ? ` · ${p.role}` : ''} {sign}{minutes}
                    </span>
                  ))}
                  {impact.vendors.map((v) => (
                    <span key={v.id} style={impactChip} data-jourj="ripple-vendor">
                      {v.name} {sign}{minutes}
                    </span>
                  ))}
                </div>
              )}

              {impact && impact.conflicts.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }} data-jourj="ripple-conflicts">
                  {impact.conflicts.map((c, i) => (
                    <li key={i} style={conflictLine} data-jourj="ripple-conflict">
                      <strong>⚠ {c.title}</strong> — {c.detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  store.shiftPhasesAfter(ripple.phaseId, ripple.delta);
                  setRipple(null);
                }}
                style={primaryBtn}
                data-jourj="ripple-apply"
              >
                Appliquer
              </button>
              <button
                onClick={() => {
                  // A PLAN B is not another engine: it is the scenario engine
                  // already in the product, seeded with the move being read.
                  const name = `Plan B — ${impact?.moment.name ?? 'décalage'} ${sign}${minutes} min`;
                  const scenario = store.createScenario(name);
                  if (scenario) {
                    store.scenarioShiftPhase(scenario.id, ripple.phaseId, ripple.delta, true);
                    store.setActiveScenario(scenario.id);
                  }
                  setRipple(null);
                  document.getElementById('organisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={ghostBtn}
                data-jourj="ripple-planb"
              >
                Créer un plan B
              </button>
              <button onClick={() => setRipple(null)} style={ghostBtn} data-jourj="ripple-dismiss">
                Ce moment seulement
              </button>
            </span>
          </div>
        );
      })()}

      {openPhaseId && (
        <MomentHub phaseId={openPhaseId} onClose={() => setOpenPhaseId(null)} />
      )}

      {/* The same panel geometry, the other context: the day as a whole. */}
      {eventPanelOpen && <EventPanel onClose={() => setEventPanelOpen(false)} />}
    </section>
  );
}

/**
 * The companion of the day: what is happening now, and what comes next.
 *
 * It never pretends. If today is not the wedding day, it says so and shows the
 * same reading of the day at the current time — because that is exactly what
 * the couple will see on the day itself.
 */
function NowState({ phases, clock, weddingDate }: {
  phases: { id: string; name: string; startHour: number; endHour: number }[];
  clock: number;
  weddingDate: string;
}) {
  const isToday = (() => {
    if (!weddingDate) return false;
    const d = new Date(weddingDate);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  })();

  const current = phases.find((p) => clock >= p.startHour && clock < p.endHour) ?? null;
  const next = phases.filter((p) => p.startHour > clock).sort((a, b) => a.startHour - b.startHour).slice(0, 3);
  const inWords = (h: number) => {
    const minutes = Math.round((h - clock) * 60);
    if (minutes < 60) return `dans ${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem === 0 ? `dans ${hrs} h` : `dans ${hrs} h ${String(rem).padStart(2, '0')}`;
  };

  return (
    <>
      <div style={{ ...eyebrow, marginBottom: 12 }}>
        {isToday ? `${PRODUCT_NAME} · aujourd’hui` : 'Mode Jour J · nous ne sommes pas encore le jour J'}
      </div>
      <div style={nowClock}>{formatHour(clock)}</div>
      {current ? (
        <div style={{ marginTop: 10 }}>
          <div style={nowCurrent}>{current.name}</div>
          <div style={{ ...eyebrow, marginTop: 6 }}>maintenant</div>
        </div>
      ) : (
        <div style={{ marginTop: 10, color: 'var(--jourj-dim)', fontSize: typography.editorial.caption }}>
          {phases.length === 0
            ? 'Aucun moment n’est encore posé sur cette journée.'
            : 'Aucun moment ne couvre cette heure-ci.'}
        </div>
      )}
      {/* MEASURED at 05:13 with a moment running: the panel announced « Cocktail,
          maintenant » and then said nothing at all about the rest of the day —
          the reader could not tell whether something followed or not. Silence is
          not an answer; when nothing follows, the day says so. */}
      {next.length === 0 && phases.length > 0 && (
        <div style={{ marginTop: 18, color: 'var(--jourj-dim)', fontSize: typography.editorial.caption }}>
          Aucun moment n’est prévu après celui-ci.
        </div>
      )}
      {next.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 10 }}>
          {next.map((p) => (
            <li key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontFamily: typography.family.mono, fontSize: 13, color: '#f6f5f3' }}>{formatHour(p.startHour)}</span>
              <span style={{ fontSize: typography.editorial.caption, color: '#f6f5f3' }}>{p.name}</span>
              <span style={{ fontSize: typography.editorial.micro, color: 'var(--jourj-dim)' }}>{inWords(p.startHour)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
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

const nowBadge: React.CSSProperties = {
  position: 'absolute', top: 12, left: 8, whiteSpace: 'nowrap',
  background: '#e0736a', color: '#08090b', borderRadius: 999,
  padding: '4px 10px', fontFamily: typography.family.mono, fontSize: 11, fontWeight: 700,
};

const nowPanel: React.CSSProperties = {
  padding: 'clamp(22px, 4vw, 40px) clamp(18px, 5vw, 64px)',
  borderBottom: '1px solid rgba(246,245,243,0.12)',
};

const nowClock: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: 'clamp(34px, 6vw, 68px)',
  fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#f6f5f3',
};

const nowCurrent: React.CSSProperties = {
  fontSize: 'clamp(18px, 2.6vw, 30px)', fontWeight: 600, letterSpacing: '-0.02em', color: '#f6f5f3',
};

const estimateTag: React.CSSProperties = {
  marginLeft: 8, border: '1px solid', borderRadius: 999,
  padding: '1px 7px', fontSize: 9, letterSpacing: '0.14em', fontWeight: 700,
  verticalAlign: 'middle',
};

const stateList: React.CSSProperties = {
  listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 3,
};

const stateLine: React.CSSProperties = {
  fontSize: 11, lineHeight: 1.4, whiteSpace: 'nowrap',
  overflow: 'hidden', textOverflow: 'ellipsis',
};

const impactChip: React.CSSProperties = {
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '4px 10px', fontSize: 11, whiteSpace: 'nowrap',
};

const conflictLine: React.CSSProperties = {
  borderLeft: '2px solid #e0736a', paddingLeft: 10, fontSize: 11, lineHeight: 1.5,
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
