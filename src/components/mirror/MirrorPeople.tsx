import { useEffect, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { GuestsProjection, GuestProjection } from '../../projections/worldModel';
import { typography, radius, dmcTint } from '../../design/tokens';
import { M, fluid, Reveal, Rule } from './MirrorPrimitives';

// ---------------------------------------------------------------------------
// 02 PERSONNES — a human composition, not an admin grid.
// ---------------------------------------------------------------------------
// Tables are the organising idea, because that is how a wedding is actually
// arranged. People are set as names in type. A real portrait is used when one
// exists; otherwise the person is represented by their initials — never by an
// invented avatar or a stock face.
//
// The DMC colour stays a signal: a thin ring, never a filled surface.
// ---------------------------------------------------------------------------

const RSVP_LABEL: Record<string, string> = {
  accepted: 'Présent', pending: 'En attente', tentative: 'Incertain', declined: 'Absent',
};
const RSVP_COLOR: Record<string, string> = {
  accepted: '#7fb79a', pending: '#d9b877', tentative: '#8fb0c6', declined: '#c98f9c',
};

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase();
}

export function MirrorPeople({ guests }: { guests: GuestsProjection }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      {/* Keyframe kept local to the people composition. */}
      <style>{'@keyframes wcPortraitIn{from{opacity:0}to{opacity:1}}'}</style>
      {/* Counts read as an editorial line, not as stat cards. */}
      <Reveal>
        <div style={summaryStyle}>
          {guests.presentStatuses.map((s) => (
            <span key={s} style={summaryItemStyle}>
              <span style={{ ...dotStyle, background: RSVP_COLOR[s] }} />
              <strong style={{ color: M.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                {guests.counts.byRsvp[s]}
              </strong>
              {' '}{RSVP_LABEL[s].toLowerCase()}
            </span>
          ))}
          {guests.counts.withDietary > 0 && (
            <span style={summaryItemStyle}>
              <strong style={{ color: M.textPrimary }}>{guests.counts.withDietary}</strong>
              {' '}régime(s) particulier(s)
            </span>
          )}
        </div>
      </Reveal>

      {/* Tables as the spatial organisation of the room. */}
      <div style={{ marginTop: fluid(40, 68), display: 'grid', gap: fluid(34, 56) }}>
        {guests.tables.map((t, i) => (
          <Reveal key={t.tableId} delay={Math.min(i, 4) * 50}>
            <section>
              <div style={tableHeadStyle}>
                <h3 style={tableTitleStyle}>{t.label}</h3>
                <span style={tableCountStyle}>
                  {t.seated}
                  <span style={{ color: M.textMuted }}> / {t.capacity}</span>
                </span>
                <span style={{ flex: 1, height: 1, background: M.line }} />
                {t.placeName && <span style={tablePlaceStyle}>{t.placeName}</span>}
              </div>

              {t.guests.length === 0 ? (
                <div style={emptyTableStyle}>Aucun invité placé.</div>
              ) : (
                <ul style={peopleGridStyle}>
                  {t.guests.map((g) => (
                    <PersonName
                      key={g.guestId}
                      guest={g}
                      open={openId === g.guestId}
                      onToggle={() => setOpenId(openId === g.guestId ? null : g.guestId)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </Reveal>
        ))}

        {guests.unplaced.length > 0 && (
          <Reveal>
            <section>
              <Rule label={`À placer · ${guests.unplaced.length}`} />
              <ul style={{ ...peopleGridStyle, marginTop: 20 }}>
                {guests.unplaced.map((g) => (
                  <PersonName
                    key={g.guestId}
                    guest={g}
                    open={openId === g.guestId}
                    onToggle={() => setOpenId(openId === g.guestId ? null : g.guestId)}
                  />
                ))}
              </ul>
            </section>
          </Reveal>
        )}
      </div>
    </div>
  );
}

function PersonName({ guest, open, onToggle }: {
  guest: GuestProjection; open: boolean; onToggle: () => void;
}) {
  const store = weddingStore;
  // Real portrait only, resolved from the MediaAsset registry — never copied
  // into this component. Deterministic order: `portraitMediaId` when valid,
  // otherwise the first image attached to that person (store.getPortraitFor).
  const portrait = store.getPortraitFor(guest.personId);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  }, []);

  return (
    <li style={{ minWidth: 0 }}>
      <button onClick={onToggle} style={nameBtnStyle}>
        <span
          style={{
            ...markStyle,
            // DMC as a ring — a signal, never a fill.
            boxShadow: guest.dmcColor ? `0 0 0 1.5px ${guest.dmcColor}` : `0 0 0 1px ${M.line}`,
            background: portrait ? 'transparent' : dmcTint(guest.dmcColor ?? '#8a8f99', 0.1),
          }}
        >
          {portrait ? (
            <img
              src={portrait.source}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                ...portraitStyle,
                // Soft swap when a photo appears or disappears.
                animation: reduced ? undefined : 'wcPortraitIn 420ms ease both',
              }}
            />
          ) : (
            <span style={initialsStyle}>{initialsOf(guest.displayName)}</span>
          )}
        </span>

        <span style={{ minWidth: 0 }}>
          <span style={personNameStyle}>{guest.displayName}</span>
          <span style={personMetaStyle}>
            <span style={{ ...dotStyle, background: RSVP_COLOR[guest.rsvp] }} />
            {RSVP_LABEL[guest.rsvp]}
            {guest.plusOnes > 0 ? ` +${guest.plusOnes}` : ''}
            {guest.dietary ? ` · ${guest.dietary}` : ''}
          </span>
        </span>
      </button>

      {open && (
        <div style={detailStyle}>
          {guest.dmcCode && <div style={detailLineStyle}>Identité DMC · {guest.dmcCode}</div>}
          {guest.side !== 'unknown' && <div style={detailLineStyle}>Côté {guest.side}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {guest.canShowInWorld && (
              <button onClick={() => store.showPersonInWorld(guest.personId)} style={actionStyle}>
                Voir dans le Monde
              </button>
            )}
            <button
              onClick={() => store.openCanvas({ kind: 'person', id: guest.personId })}
              style={{ ...actionStyle, borderColor: M.lineStrong, color: M.textPrimary }}
            >
              Modifier
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

const summaryStyle: React.CSSProperties = {
  display: 'flex', gap: fluid(20, 40), flexWrap: 'wrap',
  fontSize: fluid(13, 16), color: M.textSecondary,
  paddingBottom: fluid(20, 28), borderBottom: `1px solid ${M.line}`,
};

const summaryItemStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
};

const dotStyle: React.CSSProperties = {
  width: 6, height: 6, borderRadius: 999, display: 'inline-block', flex: '0 0 auto',
};

const tableHeadStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
};

const tableTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: fluid(18, 26), fontWeight: typography.weight.medium,
  letterSpacing: '-0.018em', color: M.textPrimary,
};

const tableCountStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: typography.size.caption, color: M.textPrimary,
};

const tablePlaceStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textMuted,
};

const peopleGridStyle: React.CSSProperties = {
  listStyle: 'none', margin: `${fluid(18, 26)}px 0 0`, padding: 0,
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(212px, 1fr))',
  gap: `${fluid(14, 20)}px ${fluid(20, 36)}px`,
};

const nameBtnStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  cursor: 'pointer', textAlign: 'left', width: '100%',
  display: 'flex', alignItems: 'center', gap: 12,
};

const markStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 999, flex: '0 0 auto',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
};

const portraitStyle: React.CSSProperties = {
  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
};

const initialsStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: typography.weight.semibold,
  letterSpacing: '0.04em', color: M.textSecondary,
};

const personNameStyle: React.CSSProperties = {
  display: 'block', fontSize: fluid(14, 16), color: M.textPrimary,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const personMetaStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
  fontSize: typography.size.caption, color: M.textMuted,
};

const detailStyle: React.CSSProperties = {
  marginTop: 10, paddingLeft: 46,
};

const detailLineStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textSecondary, marginTop: 2,
};

const actionStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', cursor: 'pointer',
  border: `1px solid ${M.line}`, borderRadius: radius.pill, padding: '5px 12px',
  font: 'inherit', fontSize: typography.size.micro,
  letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600, color: M.textMuted,
};

const emptyTableStyle: React.CSSProperties = {
  marginTop: 16, fontSize: typography.size.caption, color: M.textMuted, fontStyle: 'italic',
};
