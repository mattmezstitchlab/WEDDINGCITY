import { useMemo, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import {
  buildConstellation, RSVP_COLOR, RSVP_LABEL, ConstellationNode,
} from '../../game/constellation';
import {
  radius, shadowFor, surfaces, typography, relationships, dmcSignal, dmcTint, dmcDotStyle,
} from '../../design/tokens';

// ---------------------------------------------------------------------------
// GUEST CONSTELLATION — first Composition-mode surface.
// ---------------------------------------------------------------------------
// Mode Composition = an ivory editorial surface PROJECTED OVER the dark world,
// not a separate application. It shares radius, elevation, DMC and typography
// tokens with the world, and reads exclusively from the live store.
//
// Every dot is a real `Guest`. Clicking one selects the underlying agent, so
// the visualisation and the 3D world address the same entity.
//
// NO FABRICATED DATA: all figures come from buildConstellation(), which is a
// pure projection of the store. If a dimension is empty in the data, it is
// shown as empty — never padded to look better.
// ---------------------------------------------------------------------------

const C = surfaces.composition;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function GuestConstellation({ isOpen, onClose }: Props) {
  const store = weddingStore;
  const [hovered, setHovered] = useState<ConstellationNode | null>(null);

  const model = useMemo(() => {
    const dmcByPerson = new Map<string, string>();
    for (const d of store.dmcIdentities) dmcByPerson.set(d.ownerPersonId, d.dmcColor);
    return buildConstellation({
      guests: store.guests,
      persons: store.persons,
      seatingTables: store.seatingTables,
      agents: store.agents,
      dmcByPerson,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.version, isOpen]);

  if (!isOpen) return null;

  const { totals } = model;
  const W = 720;
  const H = 470;
  const px = (v: number) => v * W;
  const py = (v: number) => v * H;

  const openEntity = (node: ConstellationNode) => {
    if (!node.agentId) return;
    store.selectEntity('agent', node.agentId);
  };

  // Only statuses actually present are listed: a legend must not advertise
  // categories the data does not contain.
  const presentStatuses = (Object.keys(totals.byRsvp) as (keyof typeof totals.byRsvp)[])
    .filter((s) => totals.byRsvp[s] > 0);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        {/* --- editorial header --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={eyebrowStyle}>COMPOSITION · CARTOGRAPHIE DES PERSONNES</div>
            <h2 style={titleStyle}>Constellation des invités</h2>
            <p style={leadStyle}>
              Chaque point est une personne réelle du projet. Position&nbsp;: sa table.
              Couleur&nbsp;: sa réponse. Anneau&nbsp;: son identité DMC.
            </p>
          </div>
          <button onClick={onClose} style={closeStyle} aria-label="Fermer">✕</button>
        </div>

        {/* --- figures, all derived from the store --- */}
        <div style={statRowStyle}>
          <Stat value={totals.guests} label="invités" />
          <Stat value={totals.headcount} label="convives attendus" />
          <Stat value={totals.tables} label="tables" />
          <Stat value={`${totals.placed}/${totals.guests}`} label="placés" />
          <Stat value={totals.capacity} label="places" />
          <Stat value={totals.withDietary} label="régimes" />
        </div>

        {/* --- the constellation itself --- */}
        <div style={canvasWrapStyle}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
            {/* table halos: capacity read as a soft ring, not a bar chart */}
            {model.clusters.map((c) => (
              <g key={c.id}>
                <circle
                  cx={px(c.x)} cy={py(c.y)} r={c.radius * W}
                  fill={c.isUnplaced ? 'rgba(16,18,24,0.02)' : 'rgba(16,18,24,0.035)'}
                  stroke={c.overCapacity ? RSVP_COLOR.declined : C.line}
                  strokeWidth={c.overCapacity ? 1.2 : 1}
                  strokeDasharray={c.isUnplaced ? '3 4' : undefined}
                />
                <text
                  x={px(c.x)} y={py(c.y) + c.radius * W + 15}
                  textAnchor="middle" style={clusterLabelStyle}
                >
                  {c.label}
                </text>
                {c.capacity !== null && (
                  <text
                    x={px(c.x)} y={py(c.y) + c.radius * W + 27}
                    textAnchor="middle" style={clusterMetaStyle}
                  >
                    {c.seated}/{c.capacity}
                  </text>
                )}
              </g>
            ))}

            {/* hairline from a hovered guest to its table: relation on demand */}
            {hovered?.tableId && (() => {
              const c = model.clusters.find((x) => x.id === hovered.tableId);
              if (!c) return null;
              const mx = (px(hovered.x) + px(c.x)) / 2;
              const my = (py(hovered.y) + py(c.y)) / 2 - 18;
              return (
                <path
                  d={`M ${px(hovered.x)} ${py(hovered.y)} Q ${mx} ${my} ${px(c.x)} ${py(c.y)}`}
                  fill="none"
                  stroke={hovered.dmcColor ?? C.textMuted}
                  strokeWidth={relationships.width.active}
                  strokeOpacity={relationships.opacity.active}
                />
              );
            })()}

            {/* one dot = one real Guest */}
            {model.nodes.map((n) => {
              const isHover = hovered?.guestId === n.guestId;
              const r = 5 + (n.headcount - 1) * 2.2;
              return (
                <g
                  key={n.guestId}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => openEntity(n)}
                  style={{ cursor: n.agentId ? 'pointer' : 'default' }}
                >
                  {isHover && (
                    <circle
                      cx={px(n.x)} cy={py(n.y)} r={r + 7}
                      fill={dmcTint(n.dmcColor ?? RSVP_COLOR[n.rsvp], dmcSignal.halo.alpha)}
                    />
                  )}
                  <circle
                    cx={px(n.x)} cy={py(n.y)} r={r}
                    fill={RSVP_COLOR[n.rsvp]}
                    stroke={n.dmcColor ?? 'rgba(16,18,24,0.10)'}
                    strokeWidth={n.dmcColor ? dmcSignal.dot.ring + 0.4 : 0.75}
                  />
                  {/* dietary: a discreet mark, only when the field is filled */}
                  {n.dietary && (
                    <circle cx={px(n.x) + r * 0.72} cy={py(n.y) - r * 0.72} r={2} fill={C.textPrimary} />
                  )}
                </g>
              );
            })}
          </svg>

          {/* hover detail — real fields only */}
          <div style={hoverCardStyle}>
            {hovered ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {hovered.dmcColor && (
                    <span style={dmcDotStyle(hovered.dmcColor)} />
                  )}
                  <strong style={{ fontSize: typography.size.bodyLg, color: C.textPrimary }}>
                    {hovered.label}
                  </strong>
                </div>
                <div style={hoverMetaStyle}>
                  {RSVP_LABEL[hovered.rsvp]}
                  {hovered.tableLabel ? ` · ${hovered.tableLabel}` : ' · non placé'}
                  {hovered.headcount > 1 ? ` · +${hovered.headcount - 1}` : ''}
                  {hovered.dietary ? ` · ${hovered.dietary}` : ''}
                  {hovered.side !== 'unknown' ? ` · côté ${hovered.side}` : ''}
                </div>
                {hovered.agentId && (
                  <div style={{ ...hoverMetaStyle, marginTop: 3, opacity: 0.7 }}>
                    Cliquer pour ouvrir la fiche
                  </div>
                )}
              </>
            ) : (
              <div style={hoverMetaStyle}>Survolez une personne pour voir sa fiche.</div>
            )}
          </div>
        </div>

        {/* --- legend: only statuses actually present in the data --- */}
        <div style={legendRowStyle}>
          {presentStatuses.map((s) => (
            <span key={s} style={legendItemStyle}>
              <span style={{ ...dmcDotStyle(RSVP_COLOR[s]), display: 'inline-block' }} />
              {RSVP_LABEL[s]} · {totals.byRsvp[s]}
            </span>
          ))}
          <span style={{ ...legendItemStyle, opacity: 0.75 }}>
            <span style={{
              width: 8, height: 8, borderRadius: radius.pill,
              border: '1.4px solid #16181d', display: 'inline-block',
            }} />
            anneau = identité DMC ({totals.withDmc})
          </span>
          {totals.unplaced > 0 && (
            <span style={{ ...legendItemStyle, opacity: 0.75 }}>
              cercle pointillé = {totals.unplaced} non placé(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div style={{
        fontSize: typography.size.display, fontWeight: typography.weight.semibold,
        color: C.textPrimary, letterSpacing: typography.tracking.tight, lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: typography.size.caption, color: C.textMuted, marginTop: 4,
        letterSpacing: typography.tracking.label, textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

// --- styles: Composition surface, elevation tokens, no glassmorphism --------

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 900,
  background: 'rgba(6, 7, 10, 0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28,
};

const sheetStyle: React.CSSProperties = {
  width: 'min(880px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
  background: C.bg,
  borderRadius: radius.xl,
  boxShadow: shadowFor(4, 'composition'),
  padding: '30px 34px 26px',
  fontFamily: typography.family.sans,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: typography.size.micro, fontWeight: typography.weight.bold,
  letterSpacing: typography.tracking.label, color: C.textMuted, textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0 6px', fontSize: typography.size.display,
  fontWeight: typography.weight.semibold, color: C.textPrimary,
  letterSpacing: typography.tracking.tight,
};

const leadStyle: React.CSSProperties = {
  margin: 0, maxWidth: 520, fontSize: typography.size.body,
  lineHeight: typography.leading.relaxed, color: C.textSecondary,
};

const closeStyle: React.CSSProperties = {
  border: `1px solid ${C.line}`, background: C.surface, color: C.textSecondary,
  width: 30, height: 30, borderRadius: radius.pill, cursor: 'pointer', fontSize: 13,
  boxShadow: shadowFor(1, 'composition'),
};

const statRowStyle: React.CSSProperties = {
  display: 'flex', gap: 34, flexWrap: 'wrap',
  margin: '22px 0 18px', paddingBottom: 18, borderBottom: `1px solid ${C.line}`,
};

const canvasWrapStyle: React.CSSProperties = {
  position: 'relative', background: C.surface,
  borderRadius: radius.lg, padding: '18px 16px 26px',
  boxShadow: shadowFor(2, 'composition'),
};

const hoverCardStyle: React.CSSProperties = {
  position: 'absolute', left: 18, bottom: 14, maxWidth: 340,
  background: C.bg, border: `1px solid ${C.line}`, borderRadius: radius.sm,
  padding: '9px 12px', boxShadow: shadowFor(1, 'composition'), pointerEvents: 'none',
};

const hoverMetaStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: C.textSecondary, marginTop: 2,
};

const clusterLabelStyle: React.CSSProperties = {
  fontSize: 10, fill: C.textSecondary, fontFamily: typography.family.sans, fontWeight: 600,
};

const clusterMetaStyle: React.CSSProperties = {
  fontSize: 9, fill: C.textMuted, fontFamily: typography.family.mono,
};

const legendRowStyle: React.CSSProperties = {
  display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 16,
};

const legendItemStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: typography.size.caption, color: C.textSecondary,
};
