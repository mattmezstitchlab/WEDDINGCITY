import { weddingStore } from '../../game/weddingStore';
import { ProgrammeMoment } from '../../projections/worldModel';
import { typography, radius } from '../../design/tokens';
import { M, fluid, Reveal, MetaLine, Portrait } from './MirrorPrimitives';
import { TrackArt } from './TrackArt';

// ---------------------------------------------------------------------------
// MIRROR TIMELINE — the spine of the site.
// ---------------------------------------------------------------------------
// The hierarchy is deliberately unequal, because the information is unequal:
//
//   the HOUR      monumental, tabular, the anchor you scan by
//   the MOMENT    a large editorial title
//   the PLACE     secondary, quiet, clickable
//   VENDORS/MUSIC contextual, smallest, present only when they exist
//
// Density comes from the DATA, never from an invented rule: a moment with more
// real relations simply shows more. Nothing is padded to balance the layout.
// ---------------------------------------------------------------------------

export function MirrorTimeline({ moments }: { moments: ProgrammeMoment[] }) {
  const store = weddingStore;

  return (
    <ol style={listStyle}>
      {moments.map((m, i) => {
        // Editorial weight from real relations only.
        const relations = m.vendors.length + m.songs.length + (m.placeId ? 1 : 0);
        const isMajor = relations >= 5;

        return (
          <Reveal key={m.phaseId} as="li" delay={Math.min(i, 4) * 55}>
            <article className="wc-timeline-row" style={rowStyle}>
              {/* ---- the hour: the thing you scan by ---- */}
              <div className="wc-timeline-hour" style={hourColStyle}>
                <div style={{ ...hourStyle, fontSize: isMajor ? fluid(30, 62) : fluid(24, 44) }}>
                  {m.time}
                </div>
                <div style={untilStyle}>jusqu’à {m.endTime}</div>
                {m.isCurrent && <span style={nowStyle}>en cours</span>}
              </div>

              {/* ---- the thread ---- */}
              <div className="wc-timeline-thread" style={threadColStyle} aria-hidden>
                <span style={{ ...nodeStyle, ...(m.isCurrent ? nodeNowStyle : null) }} />
                {i < moments.length - 1 && <span style={threadStyle} />}
              </div>

              {/* ---- the moment ---- */}
              <div style={bodyColStyle}>
                <h3 style={{ ...titleStyle, fontSize: isMajor ? fluid(26, 54) : fluid(20, 38) }}>
                  {m.title}
                </h3>

                {m.subtitle && <p style={subtitleStyle}>{m.subtitle}</p>}

                {/* place — secondary, never competing with the title */}
                {m.placeName && (
                  <button
                    onClick={() => store.openCanvas({ kind: 'place', id: m.placeId! }, undefined, m.phaseId)}
                    style={placeStyle}
                    title="Ouvrir la fiche du lieu"
                  >
                    {m.placeName}
                    <span style={{ opacity: 0.5 }}> ↗</span>
                  </button>
                )}

                <MetaLine items={[m.highlight]} />

                {/* contextual: only rendered when the relation really exists */}
                {(m.vendors.length > 0 || m.songs.length > 0 || m.persons.length > 0) && (
                  <div style={contextStyle}>
                    {m.persons.length > 0 && (
                      <div style={contextBlockStyle}>
                        <div style={contextLabelStyle}>Autour</div>
                        <div style={peopleRowStyle}>
                          {m.persons.map((p) => (
                            <button
                              key={p.personId}
                              onClick={() => store.openCanvas(
                                { kind: 'person', id: p.personId },
                                undefined,
                                m.phaseId,
                              )}
                              style={personChipStyle}
                              title="Ouvrir la fiche"
                            >
                              {/* Real photo when one exists, initials otherwise. */}
                              <Portrait name={p.name} source={p.portraitSource} dmcColor={p.dmcColor} size={26} />
                              <span style={{ minWidth: 0 }}>{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.vendors.length > 0 && (
                      <div style={contextBlockStyle}>
                        <div style={contextLabelStyle}>Avec</div>
                        <div style={contextItemsStyle}>
                          {m.vendors.map((v) => (
                            <button
                              key={v.vendorId}
                              onClick={() => store.openCanvas(
                                { kind: 'vendor', id: v.vendorId },
                                undefined,
                                m.phaseId,
                              )}
                              style={contextLinkStyle}
                              title={`${v.category} · ouvrir la fiche`}
                            >
                              {v.companyName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.songs.length > 0 && (
                      <div style={contextBlockStyle}>
                        <div style={contextLabelStyle}>Bande-son</div>
                        <div style={soundtrackStyle}>
                          {m.songs.map((sg) => (
                            <div key={sg.songId} style={soundtrackRowStyle}>
                              {/* Small cover + the SAME global player as 05. */}
                              <TrackArt
                                songId={sg.songId}
                                title={sg.title}
                                artist={sg.artist}
                                coverSource={sg.coverSource}
                                audioSource={sg.audioSource}
                                size={38}
                              />
                              <button
                                onClick={() => store.openCanvas(
                                  { kind: 'song', id: sg.songId },
                                  undefined,
                                  m.phaseId,
                                )}
                                style={contextLinkStyle}
                                title={`${sg.artist}${sg.duration ? ` · ${sg.duration}` : ''}`}
                              >
                                {sg.title}
                                <span style={{ color: M.textMuted }}> — {sg.artist}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Real media attached to this moment — never a placeholder. */}
                {m.media.filter((md) => md.kind === 'image').length > 0 && (
                  <div style={momentMediaStyle}>
                    {m.media.filter((md) => md.kind === 'image').map((md) => (
                      <img
                        key={md.mediaId}
                        src={md.source}
                        alt={md.title ?? `Photographie du moment ${m.title}`}
                        loading="lazy"
                        decoding="async"
                        style={momentMediaImgStyle}
                      />
                    ))}
                  </div>
                )}

                {m.notes && <p style={noteStyle}>{m.notes}</p>}

                <button
                  className="wc-action"
                  onClick={() => store.openMoment(m.phaseId)}
                  style={editStyle}
                  aria-label={`Ouvrir le moment ${m.time} ${m.title}`}
                >
                  Ouvrir ce moment
                </button>
              </div>
            </article>
          </Reveal>
        );
      })}
    </ol>
  );
}

const listStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };

// Columns live in mirror.css (.wc-timeline-row) because a phone must be able
// to collapse them, and a media query cannot be expressed inline.
const rowStyle: React.CSSProperties = {
  gap: `0 ${fluid(14, 34)}`,
};

const hourColStyle: React.CSSProperties = { paddingTop: fluid(6, 12) };

const hourStyle: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.04em',
  lineHeight: 0.9,
  fontWeight: typography.weight.medium,
  color: M.textPrimary,
};

const untilStyle: React.CSSProperties = {
  marginTop: 8, fontSize: typography.editorial.micro, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: M.textMuted,
};

const nowStyle: React.CSSProperties = {
  display: 'inline-block', marginTop: 10,
  fontSize: typography.editorial.micro, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: '#4c7a63', fontWeight: 700,
};

// `display` lives in mirror.css (.wc-timeline-thread): an inline value would
// beat the mobile media query, which is exactly what happened — on a phone the
// thread column stayed visible and left an orphan green dot mid-paragraph.
const threadColStyle: React.CSSProperties = {
  flexDirection: 'column', alignItems: 'center',
  alignSelf: 'stretch', paddingTop: fluid(14, 24),
};

const nodeStyle: React.CSSProperties = {
  width: 7, height: 7, borderRadius: 999,
  border: `1px solid ${M.lineStrong}`, background: M.bg, flex: '0 0 auto',
};

const nodeNowStyle: React.CSSProperties = {
  background: '#7fb79a', borderColor: '#7fb79a',
};

const threadStyle: React.CSSProperties = {
  width: 1, flex: 1, background: M.line, marginTop: 8,
};

const bodyColStyle: React.CSSProperties = {
  paddingBottom: fluid(52, 104), minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  margin: 0, lineHeight: 1.0,
  fontWeight: typography.weight.semibold, letterSpacing: '-0.028em', color: M.textPrimary,
};

const subtitleStyle: React.CSSProperties = {
  margin: `${fluid(12, 18)} 0 0`, maxWidth: 540,
  fontSize: fluid(13, 16), lineHeight: 1.62, color: M.textSecondary,
};

const placeStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  marginTop: fluid(14, 20), cursor: 'pointer',
  font: 'inherit', fontSize: fluid(12, 14), color: M.textPrimary,
  borderBottom: `1px solid ${M.lineStrong}`, paddingBottom: 2,
};

const contextStyle: React.CSSProperties = {
  display: 'grid', gap: 12, marginTop: fluid(20, 28),
  paddingTop: fluid(16, 22), borderTop: `1px solid ${M.line}`, maxWidth: 620,
};

const contextBlockStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'minmax(62px, 84px) 1fr', gap: 14, alignItems: 'baseline',
};

const contextLabelStyle: React.CSSProperties = {
  fontSize: typography.editorial.micro, letterSpacing: '0.15em', textTransform: 'uppercase',
  color: M.textMuted, fontWeight: 700,
};

const soundtrackStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
};

const soundtrackRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
};

const peopleRowStyle: React.CSSProperties = {
  display: 'flex', gap: 10, flexWrap: 'wrap', minWidth: 0,
};

const personChipStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
  font: 'inherit', fontSize: typography.editorial.caption, color: M.textSecondary,
};

const momentMediaStyle: React.CSSProperties = {
  display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: fluid(18, 26),
};

const momentMediaImgStyle: React.CSSProperties = {
  width: 'clamp(120px, 26vw, 190px)', aspectRatio: '3 / 2',
  objectFit: 'cover', display: 'block', borderRadius: radius.sm,
};

const contextItemsStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0,
};

const contextLinkStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  cursor: 'pointer', textAlign: 'left',
  font: 'inherit', fontSize: typography.editorial.body, color: M.textSecondary,
};

const noteStyle: React.CSSProperties = {
  margin: `${fluid(16, 22)} 0 0`, maxWidth: 540,
  fontSize: typography.editorial.caption, lineHeight: 1.6, color: M.textMuted,
  borderLeft: `2px solid ${M.line}`, paddingLeft: 12,
};

const editStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', cursor: 'pointer',
  border: `1px solid ${M.line}`, borderRadius: radius.pill,
  marginTop: fluid(18, 24), padding: '8px 16px',
  // An action is never set at the smallest, most discreet tier.
  font: 'inherit', fontSize: typography.editorial.caption,
  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: M.textMuted,
};
