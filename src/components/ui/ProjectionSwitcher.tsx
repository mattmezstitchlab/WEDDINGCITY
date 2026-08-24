import { weddingStore } from '../../game/weddingStore';
import { radius, typography, surfaces, shadowFor, BRAND_ACCENT } from '../../design/tokens';

// ---------------------------------------------------------------------------
// Projection switcher — one World Model, several ways of seeing it.
// ---------------------------------------------------------------------------
// Deliberately minimal: this is not new navigation chrome, it is a dimension
// selector. It adapts to the surface it sits on, because it appears both over
// the dark World and over the ivory Mirror.
// ---------------------------------------------------------------------------

const PROJECTIONS = [
  { id: 'world' as const, label: 'World', hint: 'Projection spatiale — explorer' },
  { id: 'mirror' as const, label: 'Mirror', hint: 'Projection éditoriale — présenter' },
];

export function ProjectionSwitcher() {
  const active = weddingStore.projection;
  const onLight = active === 'mirror';
  const S = onLight ? surfaces.composition : surfaces.world;

  return (
    <div
      role="tablist"
      aria-label="Projection"
      style={{
        position: 'fixed',
        // The editorial navigation belongs to the site and sits at the very
        // top; this capsule belongs to the projection system and sits under
        // the content. In the World it stays where the HUD expects it.
        // MEASURED IN THE BROWSER (journey acceptance): pinned to the top of
        // the World it sat exactly on the HUD pills — it covered NERVE CENTER
        // and CONNECTEURS at 1440, WORLDMAP 3D and TIMELINE at 768 and 390.
        // One lane, both surfaces: the very bottom of the screen belongs to
        // the projection capsule, and the World dock starts above it (see
        // BottomOrchestrator). That holds at every width, including when the
        // dock wraps onto three rows on a phone.
        bottom: 'max(18px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: 3,
        padding: 3,
        borderRadius: radius.pill,
        background: onLight ? S.surface : 'rgba(18, 21, 30, 0.92)',
        border: `1px solid ${S.line}`,
        boxShadow: shadowFor(2, onLight ? 'composition' : 'world'),
      }}
    >
      {PROJECTIONS.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={isActive}
            title={p.hint}
            onClick={() => weddingStore.setProjection(p.id)}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              border: 'none',
              borderRadius: radius.pill,
              padding: '7px 16px',
              fontFamily: typography.family.sans,
              fontSize: typography.size.caption,
              fontWeight: typography.weight.semibold,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              transition: 'background 180ms ease, color 180ms ease',
              background: isActive
                ? (onLight ? S.textPrimary : BRAND_ACCENT)
                : 'transparent',
              color: isActive
                ? (onLight ? S.surface : '#08090d')
                : S.textSecondary,
            }}
          >
            {p.label}
          </button>
        );
      })}

      {/* Canvas is a MODE, not a third page: it composes on top of whichever
          projection is open, so it toggles rather than switching. */}
      <button
        role="tab"
        aria-selected={weddingStore.canvasOpen}
        title="Canvas — composer"
        onClick={() => (weddingStore.canvasOpen ? weddingStore.closeCanvas() : weddingStore.openCanvas())}
        style={{
          appearance: 'none', cursor: 'pointer', border: 'none',
          borderRadius: radius.pill, padding: '7px 16px',
          fontFamily: typography.family.sans, fontSize: typography.size.caption,
          fontWeight: typography.weight.semibold, letterSpacing: '0.06em',
          textTransform: 'uppercase', transition: 'background 180ms ease, color 180ms ease',
          background: weddingStore.canvasOpen ? (onLight ? S.textPrimary : BRAND_ACCENT) : 'transparent',
          color: weddingStore.canvasOpen ? (onLight ? S.surface : '#08090d') : S.textSecondary,
        }}
      >
        Canvas
      </button>
    </div>
  );
}
