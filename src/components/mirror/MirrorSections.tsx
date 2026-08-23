import { weddingStore } from '../../game/weddingStore';
import { VendorsProjection, PlacesProjection, MusicProjection, MediaProjection } from '../../projections/worldModel';
import { typography, radius } from '../../design/tokens';
import { M, fluid, Reveal, Rule, MetaLine } from './MirrorPrimitives';
import { TrackArt, NoAudioNote } from './TrackArt';

// ---------------------------------------------------------------------------
// 03 PRESTATAIRES · 04 LIEUX · 05 MUSIQUE · 06 MÉDIAS
// ---------------------------------------------------------------------------
// Three different editorial forms rather than three grids of identical cards:
//
//   vendors  a directory — role above, name large, moments as context
//   places   a hierarchy — the spaces that host a moment lead, the rest follow
//   music    a soundtrack — songs live under the moment they belong to
//   media    a gallery when real assets exist, an honest void otherwise
// ---------------------------------------------------------------------------

const PLACE_KIND_LABEL: Record<string, string> = {
  main_venue: 'Lieu principal', ceremony: 'Cérémonie', civil: 'Cérémonie civile',
  cocktail: 'Cocktail', dinner: 'Dîner', dancefloor: 'Dancefloor',
  accommodation: 'Hébergement', parking: 'Accès & stationnement',
  vendor_space: 'Espace prestataire', other: 'Autre',
};

const VENDOR_STATUS: Record<string, string> = {
  prospect: 'Prospect', quoted: 'Devis', contracted: 'Contractualisé', cancelled: 'Annulé',
};

// --- 03 VENDORS -------------------------------------------------------------

export function MirrorVendors({ vendors }: { vendors: VendorsProjection }) {
  const store = weddingStore;

  return (
    <div style={{ display: 'grid', gap: fluid(40, 72) }}>
      {vendors.byCategory.map((group, gi) => (
        <Reveal key={group.category} delay={Math.min(gi, 4) * 50}>
          <section>
            <Rule label={group.category} />
            <div style={{ display: 'grid', gap: fluid(22, 34), marginTop: fluid(20, 30) }}>
              {group.vendors.map((v) => {
                const cover = v.media.find((m) => m.kind === 'image');
                return (
                  <article key={v.vendorId} style={vendorRowStyle}>
                    {/* A real photo is used when it exists; otherwise pure type. */}
                    {cover && (
                      <img src={cover.source} alt={v.companyName} style={vendorImgStyle} />
                    )}

                    <div style={{ minWidth: 0 }}>
                      <h3 style={vendorNameStyle}>{v.companyName}</h3>

                      <MetaLine items={[
                        v.contactName && v.contactName !== v.companyName ? v.contactName : null,
                        VENDOR_STATUS[v.status] ?? v.status,
                        v.documentCount > 0 ? `${v.documentCount} document(s)` : null,
                      ]} />

                      {v.places.length > 0 && (
                        <div style={{ ...vendorMomentsStyle, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                          {v.places.map((pl) => (
                            <button
                              key={pl.placeId}
                              onClick={() => store.showPlaceInWorld(pl.placeId)}
                              style={momentLinkStyle}
                            >
                              {pl.name}
                              <span style={{ opacity: 0.5 }}> ↗</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {v.moments.length > 0 && (
                        <div style={vendorMomentsStyle}>
                          {v.moments.map((mo) => (
                            <button
                              key={mo.phaseId}
                              onClick={() => store.showEventInWorld(mo.phaseId)}
                              style={momentLinkStyle}
                            >
                              <span style={momentTimeStyle}>{mo.time}</span> {mo.title}
                            </button>
                          ))}
                        </div>
                      )}

                      {(v.phone || v.email || v.websiteUrl) && (
                        <div style={contactRowStyle}>
                          {v.phone && <a href={`tel:${v.phone}`} style={contactLinkStyle}>{v.phone}</a>}
                          {v.email && <a href={`mailto:${v.email}`} style={contactLinkStyle}>{v.email}</a>}
                          {v.websiteUrl && <a href={v.websiteUrl} target="_blank" rel="noreferrer" style={contactLinkStyle}>Site</a>}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: fluid(14, 18) }}>
                        {v.canShowInWorld && (
                          <button className="wc-action" onClick={() => store.showVendorInWorld(v.vendorId)} style={ghostBtnStyle}>
                            Voir dans le Monde
                          </button>
                        )}
                        <button
                          className="wc-action"
                          onClick={() => store.openCanvas({ kind: 'vendor', id: v.vendorId })}
                          style={{ ...ghostBtnStyle, borderColor: M.lineStrong, color: M.textPrimary }}
                        >
                          Modifier
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </Reveal>
      ))}
    </div>
  );
}

// --- 04 PLACES --------------------------------------------------------------

export function MirrorPlaces({ places }: { places: PlacesProjection }) {
  const store = weddingStore;
  const secondary = places.places.filter((p) => p.moments.length === 0);

  return (
    <div>
      {/* Spaces that actually host a moment lead the section. */}
      <div style={{ display: 'grid', gap: fluid(44, 78) }}>
        {places.keyPlaces.map((p, i) => {
          const cover = p.media.find((m) => m.kind === 'image');
          return (
            <Reveal key={p.placeId} delay={Math.min(i, 4) * 50}>
              <article>
                {cover && <img src={cover.source} alt={p.name} style={placeImgStyle} />}

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: cover ? fluid(18, 26) : 0 }}>
                  <span style={placeKindStyle}>{PLACE_KIND_LABEL[p.kind] ?? p.kind}</span>
                  <span style={{ flex: 1, height: 1, background: M.line }} />
                </div>

                <h3 style={placeNameStyle}>{p.name}</h3>

                {p.description && <p style={placeDescStyle}>{p.description}</p>}

                <MetaLine items={[
                  p.address,
                  p.capacity ? `${p.capacity} places` : null,
                  p.tableCount > 0 ? `${p.tableCount} table(s)` : null,
                  p.gps,
                ]} />

                {p.moments.length > 0 && (
                  <div style={placeMomentsStyle}>
                    {p.moments.map((mo) => (
                      <button key={mo.phaseId} onClick={() => store.showEventInWorld(mo.phaseId)} style={momentLinkStyle}>
                        <span style={momentTimeStyle}>{mo.time}</span> {mo.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* MOMENT ↔ LIEU ↔ PRESTATAIRES: the third edge of the triangle,
                    rendered from the same relation the Canvas edits. */}
                {p.vendors.length > 0 && (
                  <div style={placeVendorsStyle}>
                    <span style={placeVendorsLabelStyle}>Sur place</span>
                    <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                      {p.vendors.map((v) => (
                        <button
                          key={v.vendorId}
                          onClick={() => store.openCanvas({ kind: 'vendor', id: v.vendorId })}
                          style={momentLinkStyle}
                          title={v.category}
                        >
                          {v.companyName}
                          <span style={{ color: M.textMuted }}> · {v.category}</span>
                        </button>
                      ))}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: fluid(16, 22) }}>
                  <button className="wc-action" onClick={() => store.showPlaceInWorld(p.placeId)} style={ghostBtnStyle}>
                    Explorer dans le Monde
                  </button>
                  <button
                    className="wc-action"
                    onClick={() => store.openCanvas({ kind: 'place', id: p.placeId })}
                    style={{ ...ghostBtnStyle, borderColor: M.lineStrong, color: M.textPrimary }}
                  >
                    Modifier
                  </button>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* Logistical spaces exist too, but they do not deserve the same weight. */}
      {secondary.length > 0 && (
        <Reveal>
          <div style={{ marginTop: fluid(52, 88) }}>
            <Rule label={`Autres espaces · ${secondary.length}`} />
            <div style={secondaryGridStyle}>
              {secondary.map((p) => (
                <button key={p.placeId} onClick={() => store.showPlaceInWorld(p.placeId)} style={secondaryItemStyle}>
                  <span style={{ color: M.textPrimary }}>{p.name}</span>
                  <span style={{ color: M.textMuted, fontSize: typography.size.caption }}>
                    {PLACE_KIND_LABEL[p.kind] ?? p.kind}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}

// --- 05 MUSIC ---------------------------------------------------------------

export function MirrorMusic({ music }: { music: MusicProjection }) {
  const store = weddingStore;

  return (
    <div style={{ display: 'grid', gap: fluid(36, 62) }}>
      {music.byMoment.map((group, gi) => (
        <Reveal key={group.phaseId ?? 'unscheduled'} delay={Math.min(gi, 4) * 50}>
          <section>
            <div style={musicHeadStyle}>
              {group.phaseTime && <span style={musicTimeStyle}>{group.phaseTime}</span>}
              <span style={musicMomentStyle}>{group.phaseTitle}</span>
              <span style={{ flex: 1, height: 1, background: M.line }} />
              {group.phaseId && (
                <button onClick={() => store.showEventInWorld(group.phaseId!)} style={miniLinkStyle}>
                  le moment ↗
                </button>
              )}
            </div>

            <ol style={songListStyle}>
              {group.songs.map((sg) => (
                <li key={sg.songId} style={songRowStyle}>
                  <div style={songInnerStyle}>
                    {/* Same artwork + player used by the Timeline. */}
                    <TrackArt
                      songId={sg.songId}
                      title={sg.title}
                      artist={sg.artist}
                      coverSource={sg.coverSource}
                      audioSource={sg.audioSource}
                      /* 05 MUSIQUE: the cover is a graphic element in its own
                         right. In 01 PROGRAMME it stays contextual (38px). */
                      size={92}
                    />

                    <button
                      onClick={() => store.openCanvas({ kind: 'song', id: sg.songId })}
                      style={songBtnStyle}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={songTitleStyle}>{sg.title}</span>
                        <span style={songArtistStyle}>{sg.artist}</span>
                      </span>
                      <span style={songMetaStyle}>
                        {sg.duration || ''}
                        {sg.status === 'verified' ? ' · validé' : ''}
                      </span>
                    </button>

                    {!sg.audioSource && <NoAudioNote />}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>
      ))}
    </div>
  );
}

// --- 06 MEDIA ---------------------------------------------------------------

export function MirrorGallery({ gallery }: { gallery: MediaProjection[] }) {
  const images = gallery.filter((g) => g.kind === 'image');
  if (images.length === 0) return null;

  // Asymmetric by composition, not by chance: the rhythm comes from
  // .wc-gallery in mirror.css and applies to however many REAL assets exist.
  return (
    <div className="wc-gallery">
      {images.map((g, i) => (
        <figure key={g.mediaId} style={galleryFigureStyle}>
          <img
            src={g.source}
            alt={g.title ?? (g.ownerLabel ? `Média rattaché à ${g.ownerLabel}` : 'Média du mariage')}
            loading={i < 2 ? 'eager' : 'lazy'}
            decoding="async"
            style={galleryImgStyle}
          />
          {/* The caption says what this image belongs to — real context, not
              decoration. Provenance stays a Canvas concern. */}
          {(g.caption || g.ownerLabel) && (
            <figcaption style={captionStyle}>{g.caption ?? g.ownerLabel}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

// --- styles -----------------------------------------------------------------

const vendorRowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: fluid(14, 20),
};

const vendorImgStyle: React.CSSProperties = {
  width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block', borderRadius: radius.md,
};

const vendorNameStyle: React.CSSProperties = {
  margin: '0 0 10px', fontSize: fluid(22, 40), lineHeight: 1.02,
  fontWeight: typography.weight.medium, letterSpacing: '-0.026em', color: M.textPrimary,
};

const vendorMomentsStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, marginTop: fluid(12, 16),
};

const momentLinkStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0,
  cursor: 'pointer', textAlign: 'left',
  font: 'inherit', fontSize: typography.size.body, color: M.textSecondary,
};

const momentTimeStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: typography.size.caption, color: M.textPrimary,
};

const placeVendorsStyle: React.CSSProperties = {
  display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap',
  marginTop: fluid(14, 20),
};

const placeVendorsLabelStyle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
  color: M.textMuted, fontWeight: 700,
};

const galleryFigureStyle: React.CSSProperties = {
  margin: 0, position: 'relative', overflow: 'hidden', borderRadius: radius.md,
  background: 'rgba(16,18,24,0.04)',
};

const contactRowStyle: React.CSSProperties = {
  display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: fluid(12, 16),
  fontSize: typography.size.caption,
};

const contactLinkStyle: React.CSSProperties = {
  color: M.textSecondary, textDecoration: 'none',
  borderBottom: `1px solid ${M.line}`, paddingBottom: 1,
};

const ghostBtnStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', cursor: 'pointer',
  border: `1px solid ${M.line}`, borderRadius: radius.pill, padding: '6px 14px',
  font: 'inherit', fontSize: typography.size.micro,
  letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600, color: M.textMuted,
};

const placeImgStyle: React.CSSProperties = {
  width: '100%', maxHeight: 460, objectFit: 'cover', display: 'block', borderRadius: radius.md,
};

const placeKindStyle: React.CSSProperties = {
  fontSize: typography.size.micro, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: M.textMuted, fontWeight: 700,
};

const placeNameStyle: React.CSSProperties = {
  margin: `${fluid(14, 20)} 0 0`, fontSize: fluid(26, 54), lineHeight: 1.0,
  fontWeight: typography.weight.semibold, letterSpacing: '-0.03em', color: M.textPrimary,
};

const placeDescStyle: React.CSSProperties = {
  margin: `${fluid(14, 20)} 0 ${fluid(12, 16)}`, maxWidth: 560,
  fontSize: fluid(13, 16), lineHeight: 1.62, color: M.textSecondary,
};

const placeMomentsStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, marginTop: fluid(14, 18),
};

const secondaryGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 12, marginTop: fluid(18, 24),
};

const secondaryItemStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: '8px 0',
  cursor: 'pointer', textAlign: 'left', font: 'inherit',
  display: 'flex', flexDirection: 'column', gap: 3,
  borderTop: `1px solid ${M.line}`, fontSize: typography.size.body,
};

const musicHeadStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
};

const musicTimeStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: fluid(18, 30),
  color: M.textPrimary, letterSpacing: '-0.02em',
};

const musicMomentStyle: React.CSSProperties = {
  fontSize: fluid(12, 15), letterSpacing: '0.12em', textTransform: 'uppercase',
  color: M.textSecondary, fontWeight: 600,
};

const miniLinkStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
  font: 'inherit', fontSize: typography.size.caption, color: M.textMuted,
};

const songListStyle: React.CSSProperties = {
  listStyle: 'none', margin: `${fluid(16, 22)} 0 0`, padding: 0,
};

const songRowStyle: React.CSSProperties = {
  borderBottom: `1px solid ${M.line}`,
};

const songInnerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0',
};

const songBtnStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  flex: 1, minWidth: 0, textAlign: 'left', font: 'inherit',
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16,
  padding: 0,
};

const songTitleStyle: React.CSSProperties = {
  display: 'block', fontSize: fluid(15, 19), color: M.textPrimary,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const songArtistStyle: React.CSSProperties = {
  display: 'block', fontSize: typography.size.caption, color: M.textMuted, marginTop: 3,
};

const songMetaStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: typography.size.caption,
  color: M.textMuted, whiteSpace: 'nowrap',
};

// The grid itself lives in mirror.css (.wc-gallery): the asymmetric rhythm
// needs nth-child rules and media queries, neither of which exists inline.
const galleryImgStyle: React.CSSProperties = {
  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
};

const captionStyle: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, bottom: 0,
  padding: '26px 14px 10px',
  fontSize: typography.size.caption, color: '#fff',
  background: 'linear-gradient(to top, rgba(12,10,8,.55), rgba(12,10,8,0))',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
