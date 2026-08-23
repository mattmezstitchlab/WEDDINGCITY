import { useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { GuestsProjection, GuestProjection } from '../../projections/worldModel';
import { typography, radius } from '../../design/tokens';
import { M, fluid, Reveal, Rule, Portrait } from './MirrorPrimitives';

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

const RELATION_LABEL: Record<string, string> = {
  partner: 'en couple avec', parent: 'parent de', child: 'enfant de',
  sibling: 'frère/sœur de', family: 'famille de', friend: 'ami·e de',
  colleague: 'collègue de', witness: 'témoin de', works_with: 'travaille avec',
};

export function MirrorPeople({ guests }: { guests: GuestsProjection }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // When every single guest shares the same answer, repeating it under all 27
  // names adds nothing — the summary line above already says it once. The
  // moment RSVPs actually differ, the per-person label comes back on its own.
  const rsvpDistinguishes = guests.presentStatuses.length > 1;

  return (
    <div>
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
                      showRsvp={rsvpDistinguishes}
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
                    showRsvp={rsvpDistinguishes}
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

function PersonName({ guest, open, onToggle, showRsvp }: {
  guest: GuestProjection; open: boolean; onToggle: () => void; showRsvp: boolean;
}) {
  const store = weddingStore;

  return (
    <li style={{ minWidth: 0 }}>
      <button
        onClick={onToggle}
        style={nameBtnStyle}
        aria-expanded={open}
        aria-label={`${guest.displayName} — ${RSVP_LABEL[guest.rsvp]}. Afficher le détail.`}
      >
        {/* Real photo when the person has one, initials otherwise — resolved
            by the projection through the MediaAsset registry, never copied. */}
        <Portrait
          name={guest.displayName}
          source={guest.portraitSource}
          dmcColor={guest.dmcColor}
          size={34}
        />

        <span style={{ minWidth: 0 }}>
          <span style={personNameStyle}>{guest.displayName}</span>
          {/* Secondary line: only what actually distinguishes this person. */}
          {(showRsvp || guest.plusOnes > 0 || guest.dietary) && (
            <span style={personMetaStyle}>
              {showRsvp && <span style={{ ...dotStyle, background: RSVP_COLOR[guest.rsvp] }} />}
              {showRsvp ? RSVP_LABEL[guest.rsvp] : ''}
              {guest.plusOnes > 0 ? `${showRsvp ? ' ' : ''}+${guest.plusOnes}` : ''}
              {guest.dietary ? `${showRsvp || guest.plusOnes > 0 ? ' · ' : ''}${guest.dietary}` : ''}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div style={detailStyle}>
          {guest.dmcCode && <div style={detailLineStyle}>Identité DMC · {guest.dmcCode}</div>}
          {guest.side !== 'unknown' && <div style={detailLineStyle}>Côté {guest.side}</div>}

          {/* Moments this person is really mobilised on. */}
          {guest.moments.length > 0 && (
            <div style={detailLineStyle}>
              {guest.moments.map((mo) => (
                <button
                  key={mo.phaseId}
                  onClick={() => store.showEventInWorld(mo.phaseId)}
                  style={inlineLinkStyle}
                >
                  <span style={{ fontFamily: typography.family.mono, color: M.textMuted }}>{mo.time}</span>
                  {' '}{mo.title}
                </button>
              ))}
            </div>
          )}

          {/* Relations recorded in the model. Nothing is inferred. */}
          {guest.relationships.length > 0 && (
            <div style={detailLineStyle}>
              {guest.relationships.map((rel) => (
                <span key={rel.relationshipId} style={{ marginRight: 12 }}>
                  {RELATION_LABEL[rel.kind] ?? rel.kind}{' '}
                  <span style={{ color: M.textPrimary }}>{rel.otherName}</span>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {guest.canShowInWorld && (
              <button className="wc-action" onClick={() => store.showPersonInWorld(guest.personId)} style={actionStyle}>
                Voir dans le Monde
              </button>
            )}
            <button
              className="wc-action"
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
  fontFamily: typography.family.mono, fontSize: typography.editorial.caption, color: M.textPrimary,
};

const tablePlaceStyle: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: M.textMuted,
};

const peopleGridStyle: React.CSSProperties = {
  listStyle: 'none', margin: `${fluid(18, 26)} 0 0`, padding: 0,
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(212px, 1fr))',
  gap: `${fluid(14, 20)} ${fluid(20, 36)}`,
};

const nameBtnStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  cursor: 'pointer', textAlign: 'left', width: '100%',
  display: 'flex', alignItems: 'center', gap: 12,
};

const inlineLinkStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  marginRight: 12, cursor: 'pointer', font: 'inherit',
  fontSize: typography.editorial.caption, color: M.textSecondary,
};

const personNameStyle: React.CSSProperties = {
  display: 'block', fontSize: fluid(14, 16), color: M.textPrimary,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const personMetaStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
  fontSize: typography.editorial.caption, color: M.textMuted,
};

const detailStyle: React.CSSProperties = {
  marginTop: 10, paddingLeft: 46,
};

const detailLineStyle: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: M.textSecondary, marginTop: 2,
};

const actionStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', cursor: 'pointer',
  border: `1px solid ${M.line}`, borderRadius: radius.pill, padding: '7px 14px',
  font: 'inherit', fontSize: typography.editorial.caption,
  letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600, color: M.textMuted,
};

const emptyTableStyle: React.CSSProperties = {
  marginTop: 16, fontSize: typography.editorial.caption, color: M.textMuted, fontStyle: 'italic',
};
