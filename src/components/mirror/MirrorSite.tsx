import { useEffect, useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import {
  projectWorldModel, GuestProjection, VendorProjection, PlaceProjection,
} from '../../projections/worldModel';
import { radius, typography, shadowFor, dmcTint } from '../../design/tokens';
import {
  M, fluid, SectionShell, EmptyState, BigFigure, DmcMark, editorialCard, quietLink, Eyebrow,
} from './MirrorPrimitives';

// ---------------------------------------------------------------------------
// MIRROR — the editorial projection of the World Model.
// ---------------------------------------------------------------------------
// This is NOT the dashboard with a light theme, and NOT a copy of the 3D view.
// Same data, different language: a contemporary editorial site.
//
// It holds NO state of its own beyond scroll/UI affordances. Everything comes
// from projectWorldModel(), which derives from weddingStore. Change an RSVP in
// World or Canvas and this page reflects it on the next render.
//
// V1 scope (Phase C §20): Hero · Programme · Invités.
// Sections without data are empty-stated honestly, never fabricated.
// ---------------------------------------------------------------------------

const RSVP_LABEL: Record<string, string> = {
  accepted: 'Présent', pending: 'En attente', tentative: 'Incertain', declined: 'Absent',
};
const RSVP_COLOR: Record<string, string> = {
  accepted: '#7fb79a', pending: '#d9b877', tentative: '#8fb0c6', declined: '#c98f9c',
};

export function MirrorSite() {
  const store = weddingStore;
  const model = useMemo(() => projectWorldModel(), [store.version]);
  const { hero, programme, guests, vendors, places, music, gallery, availability } = model;

  const [openGuestId, setOpenGuestId] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  // Arriving from World: scroll to that exact person, by id.
  useEffect(() => {
    if (!store.mirrorFocusPersonId) return;
    const target = guests.guests.find((g) => g.personId === store.mirrorFocusPersonId);
    if (target) {
      setOpenGuestId(target.guestId);
      requestAnimationFrame(() => {
        focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.mirrorFocusPersonId]);

  const storySection = availability.find((a) => a.id === 'story');
  const gallerySection = availability.find((a) => a.id === 'gallery');

  return (
    <div style={pageStyle}>
      {/* ---------------------------------------------------------------- HERO */}
      <header style={heroStyle}>
        <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
          <Eyebrow>{hero.worldType === 'wedding' ? 'Mariage' : hero.worldType}</Eyebrow>

          <h1 style={heroTitleStyle}>{hero.coupleNames || hero.title}</h1>

          <div style={heroMetaStyle}>
            {hero.formattedDate && <span style={heroMetaItem}>{hero.formattedDate}</span>}
            {hero.locationName && (
              <>
                <span style={heroDot} aria-hidden />
                <span style={heroMetaItem}>{hero.locationName}</span>
              </>
            )}
          </div>

          {/* Figures are derived, never typed by hand. */}
          <div style={heroFiguresStyle}>
            {hero.daysUntil !== null && (
              <BigFigure
                value={hero.daysUntil > 0 ? hero.daysUntil : Math.abs(hero.daysUntil)}
                label={hero.daysUntil > 0 ? 'jours restants' : hero.daysUntil === 0 ? 'aujourd’hui' : 'jours écoulés'}
              />
            )}
            {guests.hasData && <BigFigure value={guests.counts.total} label="invités" />}
            {guests.counts.tables > 0 && <BigFigure value={guests.counts.tables} label="tables" />}
            {programme.hasData && <BigFigure value={programme.moments.length} label="moments" />}
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- PROGRAMME */}
      {programme.hasData ? (
        <SectionShell
          id="programme"
          eyebrow="Le déroulé"
          title="Programme"
          lead="Le fil de la journée, tel qu’il est orchestré dans le monde."
        >
          <ol style={timelineStyle}>
            {programme.moments.map((m) => (
              <li key={m.phaseId} style={momentRowStyle}>
                <div style={momentTimeStyle}>
                  <span style={{ fontSize: fluid(20, 30), letterSpacing: '-0.02em' }}>{m.time}</span>
                  <span style={momentEndStyle}>→ {m.endTime}</span>
                </div>

                <div style={momentRuleWrapStyle}>
                  <span style={{ ...momentDotStyle, ...(m.isCurrent ? currentDotStyle : null) }} />
                  <span style={momentRuleStyle} />
                </div>

                <div style={{ paddingBottom: fluid(26, 40) }}>
                  <h3 style={momentTitleStyle}>
                    {m.title}
                    {m.isCurrent && <span style={nowBadgeStyle}>en cours</span>}
                  </h3>
                  {m.subtitle && <p style={momentSubStyle}>{m.subtitle}</p>}
                  <div style={momentMetaStyle}>
                    {m.placeName && (
                      <button
                        style={{ ...quietLink, ...momentPlaceStyle }}
                        onClick={() => store.showEventInWorld(m.phaseId)}
                        title="Ouvrir ce moment dans le Monde"
                      >
                        {m.placeName} →
                      </button>
                    )}
                    {m.highlight && <span style={momentHighlightStyle}>{m.highlight}</span>}
                  </div>

                  {/* Vendors and music attached to this moment, derived from
                      the same World Model — not a second list. */}
                  {(m.vendors.length > 0 || m.songs.length > 0) && (
                    <div style={momentLinksStyle}>
                      {m.vendors.map((v) => (
                        <button
                          key={v.vendorId}
                          style={{ ...quietLink, ...tagStyle }}
                          onClick={() => store.showVendorInWorld(v.vendorId)}
                          title={`${v.category} · voir dans le Monde`}
                        >
                          {v.companyName}
                        </button>
                      ))}
                      {m.songs.map((sg) => (
                        <span key={sg.songId} style={{ ...tagStyle, borderStyle: 'dashed' }}>
                          ♪ {sg.title} — {sg.artist}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </SectionShell>
      ) : (
        <SectionShell id="programme" eyebrow="Le déroulé" title="Programme">
          <EmptyState
            title="Le programme n’est pas encore composé"
            body="Les moments de la journée apparaîtront ici dès qu’une timeline sera définie dans le monde."
          />
        </SectionShell>
      )}

      {/* -------------------------------------------------------------- INVITÉS */}
      {guests.hasData ? (
        <SectionShell
          id="guests"
          eyebrow="Les personnes"
          title="Invités"
          lead={`${guests.counts.headcount} convives attendus, répartis sur ${guests.counts.tables} tables.`}
          tone="surface"
        >
          {/* Only statuses actually present in the data. */}
          <div style={statusRowStyle}>
            {guests.presentStatuses.map((s) => (
              <span key={s} style={statusChipStyle}>
                <span style={{
                  width: 7, height: 7, borderRadius: radius.pill,
                  background: RSVP_COLOR[s], display: 'inline-block',
                }} />
                {RSVP_LABEL[s]} · {guests.counts.byRsvp[s]}
              </span>
            ))}
            {guests.counts.withDietary > 0 && (
              <span style={statusChipStyle}>{guests.counts.withDietary} régime(s) particulier(s)</span>
            )}
          </div>

          <div style={tableGridStyle}>
            {guests.tables.map((t) => (
              <article key={t.tableId} style={{ ...editorialCard, padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={tableTitleStyle}>{t.label}</h3>
                  <span style={{
                    ...tableCountStyle,
                    color: t.overCapacity ? RSVP_COLOR.declined : M.textMuted,
                  }}>
                    {t.seated}/{t.capacity}
                  </span>
                </div>
                {t.placeName && <div style={tablePlaceStyle}>{t.placeName}</div>}

                {t.guests.length === 0 ? (
                  <div style={tableEmptyStyle}>Aucun invité placé.</div>
                ) : (
                  <ul style={guestListStyle}>
                    {t.guests.map((g) => (
                      <GuestRow
                        key={g.guestId}
                        guest={g}
                        open={openGuestId === g.guestId}
                        onToggle={() => setOpenGuestId(openGuestId === g.guestId ? null : g.guestId)}
                        focusRef={store.mirrorFocusPersonId === g.personId ? focusRef : undefined}
                      />
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          {guests.unplaced.length > 0 && (
            <div style={{ marginTop: fluid(24, 36) }}>
              <Eyebrow>À placer · {guests.unplaced.length}</Eyebrow>
              <ul style={{ ...guestListStyle, marginTop: 12 }}>
                {guests.unplaced.map((g) => (
                  <GuestRow
                    key={g.guestId}
                    guest={g}
                    open={openGuestId === g.guestId}
                    onToggle={() => setOpenGuestId(openGuestId === g.guestId ? null : g.guestId)}
                    focusRef={store.mirrorFocusPersonId === g.personId ? focusRef : undefined}
                  />
                ))}
              </ul>
            </div>
          )}
        </SectionShell>
      ) : (
        <SectionShell id="guests" eyebrow="Les personnes" title="Invités" tone="surface">
          <EmptyState
            title="Aucun invité pour l’instant"
            body="Les personnes invitées apparaîtront ici, avec leur réponse et leur table."
          />
        </SectionShell>
      )}

      {/* ---------------------------------------------------------- PRESTATAIRES */}
      {vendors.hasData && (
        <SectionShell
          id="vendors"
          eyebrow="Celles et ceux qui font"
          title="Les prestataires"
          lead={`${vendors.counts.total} intervenants, dont ${vendors.counts.contracted} contractualisés.`}
        >
          <div style={{ display: 'grid', gap: fluid(28, 44) }}>
            {vendors.byCategory.map((group) => (
              <div key={group.category}>
                <Eyebrow>{group.category}</Eyebrow>
                <div style={{ ...tableGridStyle, marginTop: 14 }}>
                  {group.vendors.map((v) => <VendorCard key={v.vendorId} vendor={v} />)}
                </div>
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* ----------------------------------------------------------------- LIEUX */}
      {places.hasData && (
        <SectionShell
          id="places"
          eyebrow="Les espaces"
          title="Le lieu"
          lead={`${places.counts.withMoments} espaces accueillent un moment du programme, sur ${places.counts.total} référencés.`}
          tone="surface"
        >
          <div style={{ display: 'grid', gap: fluid(16, 22) }}>
            {(places.keyPlaces.length > 0 ? places.keyPlaces : places.places).map((p) => (
              <PlaceRow key={p.placeId} place={p} />
            ))}
          </div>

          {places.keyPlaces.length > 0 && places.places.length > places.keyPlaces.length && (
            <div style={{ marginTop: fluid(20, 30), fontSize: typography.size.caption, color: M.textMuted }}>
              {places.places.length - places.keyPlaces.length} autres espaces référencés dans le monde
              (logistique, stationnement, zones prestataires).
            </div>
          )}
        </SectionShell>
      )}

      {/* --------------------------------------------------------------- MUSIQUE */}
      {music.hasData && (
        <SectionShell
          id="music"
          eyebrow="La bande-son"
          title="Musique"
          lead={`${music.counts.total} titres, ${music.counts.scheduled} rattachés à un moment du programme.`}
        >
          <div style={{ display: 'grid', gap: fluid(24, 38) }}>
            {music.byMoment.map((group) => (
              <div key={group.phaseId ?? 'unscheduled'}>
                <div style={musicMomentHeadStyle}>
                  {group.phaseTime && <span style={musicTimeStyle}>{group.phaseTime}</span>}
                  <span style={musicMomentTitleStyle}>{group.phaseTitle}</span>
                  {group.phaseId && (
                    <button
                      style={{ ...quietLink, ...momentPlaceStyle, marginLeft: 'auto' }}
                      onClick={() => store.showEventInWorld(group.phaseId!)}
                    >
                      Voir le moment →
                    </button>
                  )}
                </div>
                <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
                  {group.songs.map((sg) => (
                    <li key={sg.songId} style={songRowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={songTitleStyle}>{sg.title}</div>
                        <div style={songArtistStyle}>{sg.artist}</div>
                      </div>
                      <div style={songMetaStyle}>
                        {sg.duration}
                        {sg.status === 'verified' ? ' · validé' : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* --------------------------------------- SECTIONS WITHOUT DATA (honest) */}
      {storySection && !storySection.available && (
        <SectionShell id="story" eyebrow="Le récit" title="Notre histoire">
          <EmptyState
            title="Votre récit n’a pas encore été écrit"
            body="Cette section restera vide tant qu’aucun texte n’existera dans le projet."
            note={storySection.reason}
          />
        </SectionShell>
      )}

      {gallerySection && (
        <SectionShell id="gallery" eyebrow="Les images" title="Galerie" tone="surface">
          {gallery.length > 0 ? (
            <div style={galleryGridStyle}>
              {gallery.filter((g) => g.kind === 'image').map((g) => (
                <figure key={g.mediaId} style={{ margin: 0 }}>
                  <img
                    src={g.source}
                    alt={g.title ?? ''}
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: radius.md }}
                  />
                  {g.caption && <figcaption style={captionStyle}>{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucun média n’a encore été ajouté"
              body="L’architecture est prête : un fichier peut être rattaché à une personne, un lieu, un prestataire, un moment ou un morceau. Rien n’est affiché à la place, car ces images n’existent pas."
              note={gallerySection.reason}
            />
          )}
        </SectionShell>
      )}

      <footer style={footerStyle}>
        <span>{hero.title}</span>
        <span style={{ color: M.textMuted }}>
          Projection éditoriale du monde · données en direct
        </span>
      </footer>
    </div>
  );
}

// --- Guest row: identity, and the hop back into the World -------------------

function GuestRow({
  guest, open, onToggle, focusRef,
}: {
  guest: GuestProjection;
  open: boolean;
  onToggle: () => void;
  focusRef?: React.RefObject<HTMLDivElement>;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <li style={{ borderTop: `1px solid ${M.line}` }}>
      <div ref={focusRef}>
        <button onClick={onToggle} style={{ ...quietLink, ...guestRowStyle }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={{
              width: 7, height: 7, borderRadius: radius.pill, flex: '0 0 auto',
              background: RSVP_COLOR[guest.rsvp],
            }} />
            <span style={guestNameStyle}>{guest.displayName}</span>
            <DmcMark color={guest.dmcColor} code={guest.dmcCode} />
          </span>
          <span style={guestMetaStyle}>
            {guest.plusOnes > 0 ? `+${guest.plusOnes}` : ''}
            {guest.dietary ? ' · ' + guest.dietary : ''}
          </span>
        </button>

        {open && (
          <div style={guestDetailStyle}>
            <dl style={detailGridStyle}>
              <Detail label="Réponse" value={RSVP_LABEL[guest.rsvp]} />
              <Detail label="Table" value={guest.tableLabel ?? 'Non placé'} />
              {guest.plusOnes > 0 && <Detail label="Accompagnants" value={String(guest.plusOnes)} />}
              {guest.dietary && <Detail label="Régime" value={guest.dietary} />}
              {guest.side !== 'unknown' && <Detail label="Côté" value={guest.side} />}
              {guest.dmcCode && <Detail label="Identité DMC" value={guest.dmcCode} />}
            </dl>

            {/* MIRROR → WORLD, by personId. */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={showInWorldStyle}
                onClick={() => {
                  const ok = weddingStore.showPersonInWorld(guest.personId);
                  if (!ok) setNotice('Cette personne n’a pas de représentation dans le monde.');
                }}
                disabled={!guest.canShowInWorld}
                title={guest.canShowInWorld ? undefined : 'Aucune projection spatiale pour cette personne'}
              >
                Voir dans le Monde →
              </button>
              {/* MIRROR → CANVAS, focused on this exact person. */}
              <button
                style={{ ...showInWorldStyle, background: 'transparent', color: M.textPrimary, border: `1px solid ${M.lineStrong}` }}
                onClick={() => weddingStore.openCanvas({ kind: 'person', id: guest.personId })}
              >
                Modifier
              </button>
            </div>
            {notice && <div style={{ marginTop: 8, fontSize: 11, color: M.textMuted }}>{notice}</div>}
          </div>
        )}
      </div>
    </li>
  );
}

// --- Vendor: an editorial card, typographic when no photo exists ------------

function VendorCard({ vendor }: { vendor: VendorProjection }) {
  const store = weddingStore;
  const cover = vendor.media.find((m) => m.kind === 'image');

  return (
    <article style={{ ...editorialCard, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* No photo is fabricated: without a real media, the card is purely typographic. */}
      {cover && (
        <img
          src={cover.source}
          alt={vendor.companyName}
          style={{ width: '100%', borderRadius: radius.md, display: 'block' }}
        />
      )}

      <div>
        <div style={vendorRoleStyle}>{vendor.category}</div>
        <h3 style={{ margin: '6px 0 0', fontSize: fluid(17, 21), fontWeight: typography.weight.medium, color: M.textPrimary }}>
          {vendor.companyName}
        </h3>
        {vendor.contactName && vendor.contactName !== vendor.companyName && (
          <div style={{ marginTop: 4, fontSize: typography.size.caption, color: M.textSecondary }}>
            {vendor.contactName}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ ...tagStyle, borderStyle: 'solid' }}>{VENDOR_STATUS[vendor.status] ?? vendor.status}</span>
        {vendor.documentCount > 0 && <span style={tagStyle}>{vendor.documentCount} document(s)</span>}
        {vendor.taskCount > 0 && <span style={tagStyle}>{vendor.taskCount} tâche(s)</span>}
      </div>

      {vendor.moments.length > 0 && (
        <div style={{ fontSize: typography.size.caption, color: M.textSecondary, lineHeight: 1.7 }}>
          {vendor.moments.map((mo) => (
            <div key={mo.phaseId}>
              <span style={{ fontFamily: typography.family.mono, color: M.textMuted }}>{mo.time}</span>{' '}
              {mo.title}
            </div>
          ))}
        </div>
      )}

      {/* Contact details only when they really exist. */}
      {(vendor.phone || vendor.email || vendor.websiteUrl) && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: typography.size.caption }}>
          {vendor.phone && <a href={`tel:${vendor.phone}`} style={contactLinkStyle}>{vendor.phone}</a>}
          {vendor.email && <a href={`mailto:${vendor.email}`} style={contactLinkStyle}>{vendor.email}</a>}
          {vendor.websiteUrl && (
            <a href={vendor.websiteUrl} target="_blank" rel="noreferrer" style={contactLinkStyle}>Site</a>
          )}
        </div>
      )}

      {vendor.notes && <p style={{ margin: 0, fontSize: typography.size.caption, color: M.textSecondary }}>{vendor.notes}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {vendor.canShowInWorld && (
          <button style={showInWorldStyle} onClick={() => store.showVendorInWorld(vendor.vendorId)}>
            Voir dans le Monde →
          </button>
        )}
        <button
          style={{ ...showInWorldStyle, background: 'transparent', color: M.textPrimary, border: `1px solid ${M.lineStrong}` }}
          onClick={() => store.openCanvas({ kind: 'vendor', id: vendor.vendorId })}
        >
          Modifier
        </button>
      </div>
    </article>
  );
}

// --- Place: a wide editorial row --------------------------------------------

function PlaceRow({ place }: { place: PlaceProjection }) {
  const store = weddingStore;
  return (
    <article style={{ ...editorialCard, padding: `${fluid(20, 28)} ${fluid(20, 30)}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div style={{ minWidth: 0 }}>
          <div style={vendorRoleStyle}>{PLACE_KIND_LABEL[place.kind] ?? place.kind}</div>
          <h3 style={{ margin: '6px 0 0', fontSize: fluid(19, 26), fontWeight: typography.weight.medium, letterSpacing: '-0.015em', color: M.textPrimary }}>
            {place.name}
          </h3>
        </div>
        <button style={{ ...quietLink, ...momentPlaceStyle }} onClick={() => store.showPlaceInWorld(place.placeId)}>
          Explorer dans le Monde →
        </button>
      </div>

      {place.description && (
        <p style={{ margin: '12px 0 0', maxWidth: 620, fontSize: fluid(13, 15), lineHeight: typography.leading.relaxed, color: M.textSecondary }}>
          {place.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        {place.address && <span style={tagStyle}>{place.address}</span>}
        {place.gps && <span style={tagStyle}>{place.gps}</span>}
        {place.capacity !== null && <span style={tagStyle}>{place.capacity} places</span>}
        {place.window && <span style={tagStyle}>{place.window}</span>}
        {place.tableCount > 0 && <span style={tagStyle}>{place.tableCount} table(s)</span>}
      </div>

      {place.moments.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {place.moments.map((mo) => (
            <button
              key={mo.phaseId}
              style={{ ...quietLink, fontSize: typography.size.caption, color: M.textSecondary }}
              onClick={() => store.showEventInWorld(mo.phaseId)}
            >
              <span style={{ fontFamily: typography.family.mono, color: M.textPrimary }}>{mo.time}</span> {mo.title}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={detailLabelStyle}>{label}</dt>
      <dd style={detailValueStyle}>{value}</dd>
    </div>
  );
}

// --- styles -----------------------------------------------------------------

const pageStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 800, overflowY: 'auto',
  background: M.bg, color: M.textPrimary,
  fontFamily: typography.family.sans,
  WebkitFontSmoothing: 'antialiased',
};

const heroStyle: React.CSSProperties = {
  minHeight: 'min(78vh, 720px)',
  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  padding: `${fluid(96, 140)} ${fluid(20, 72)} ${fluid(44, 72)}`,
};

const heroTitleStyle: React.CSSProperties = {
  margin: '18px 0 0',
  fontSize: fluid(40, 104),
  lineHeight: 0.96,
  fontWeight: typography.weight.semibold,
  letterSpacing: '-0.035em',
  color: M.textPrimary,
  maxWidth: 14 * 100,
};

const heroMetaStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  marginTop: fluid(20, 30),
};

const heroMetaItem: React.CSSProperties = {
  fontSize: fluid(13, 16), color: M.textSecondary, letterSpacing: '0.01em',
};

const heroDot: React.CSSProperties = {
  width: 3, height: 3, borderRadius: 999, background: M.textMuted, display: 'inline-block',
};

const heroFiguresStyle: React.CSSProperties = {
  display: 'flex', gap: fluid(28, 64), flexWrap: 'wrap',
  marginTop: fluid(36, 60), paddingTop: fluid(28, 40), borderTop: `1px solid ${M.line}`,
};

const timelineStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };

const momentRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(76px, 108px) 22px 1fr',
  gap: fluid(10, 20),
  alignItems: 'start',
};

const momentTimeStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  fontVariantNumeric: 'tabular-nums',
  color: M.textPrimary, fontWeight: typography.weight.medium, paddingTop: 2,
};

const momentEndStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textMuted, marginTop: 4,
};

const momentRuleWrapStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch', paddingTop: 9,
};

const momentDotStyle: React.CSSProperties = {
  width: 7, height: 7, borderRadius: 999,
  border: `1px solid ${M.lineStrong}`, background: M.bg, flex: '0 0 auto',
};

const currentDotStyle: React.CSSProperties = {
  background: '#7fb79a', borderColor: '#7fb79a',
  boxShadow: `0 0 0 4px ${dmcTint('#7fb79a', 0.18)}`,
};

const momentRuleStyle: React.CSSProperties = {
  width: 1, flex: 1, background: M.line, marginTop: 6,
};

const momentTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: fluid(17, 24), lineHeight: 1.22,
  fontWeight: typography.weight.medium, letterSpacing: '-0.015em', color: M.textPrimary,
};

const nowBadgeStyle: React.CSSProperties = {
  marginLeft: 10, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#4c7a63', background: dmcTint('#7fb79a', 0.16),
  padding: '3px 8px', borderRadius: 999, verticalAlign: 'middle', fontWeight: 700,
};

const momentSubStyle: React.CSSProperties = {
  margin: '8px 0 0', maxWidth: 560,
  fontSize: fluid(13, 15), lineHeight: typography.leading.relaxed, color: M.textSecondary,
};

const momentMetaStyle: React.CSSProperties = {
  display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, alignItems: 'center',
};

const momentPlaceStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textPrimary,
  borderBottom: `1px solid ${M.lineStrong}`, paddingBottom: 1,
};

const momentHighlightStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textMuted,
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: fluid(24, 34),
};

const statusChipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  fontSize: typography.size.caption, color: M.textSecondary,
  border: `1px solid ${M.line}`, borderRadius: 999, padding: '6px 12px',
};

const tableGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: fluid(14, 22),
};

const tableTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: fluid(15, 18), fontWeight: typography.weight.medium, color: M.textPrimary,
};

const tableCountStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: typography.size.caption,
};

const tablePlaceStyle: React.CSSProperties = {
  marginTop: 4, fontSize: typography.size.caption, color: M.textMuted,
};

const tableEmptyStyle: React.CSSProperties = {
  marginTop: 14, fontSize: typography.size.caption, color: M.textMuted, fontStyle: 'italic',
};

const guestListStyle: React.CSSProperties = { listStyle: 'none', margin: '14px 0 0', padding: 0 };

const guestRowStyle: React.CSSProperties = {
  width: '100%', display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', gap: 10, padding: '10px 0',
};

const guestNameStyle: React.CSSProperties = {
  fontSize: typography.size.bodyLg, color: M.textPrimary,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const guestMetaStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textMuted, whiteSpace: 'nowrap',
};

const guestDetailStyle: React.CSSProperties = {
  padding: '4px 0 16px',
};

const detailGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))',
  gap: 12, margin: '0 0 14px',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: M.textMuted, fontWeight: 700,
};

const detailValueStyle: React.CSSProperties = {
  margin: '4px 0 0', fontSize: typography.size.body, color: M.textPrimary,
};

const showInWorldStyle: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: M.textPrimary, color: M.surface, border: 'none',
  borderRadius: 999, padding: '9px 16px',
  fontSize: typography.size.caption, fontWeight: typography.weight.semibold,
  letterSpacing: '0.02em', boxShadow: shadowFor(1, 'composition'),
};

const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
  padding: `${fluid(28, 40)} ${fluid(20, 72)}`,
  borderTop: `1px solid ${M.line}`,
  fontSize: typography.size.caption, color: M.textSecondary,
};

const VENDOR_STATUS: Record<string, string> = {
  prospect: 'Prospect', quoted: 'Devis', contracted: 'Contractualisé', cancelled: 'Annulé',
};

const PLACE_KIND_LABEL: Record<string, string> = {
  main_venue: 'Lieu principal', ceremony: 'Cérémonie', civil: 'Cérémonie civile',
  cocktail: 'Cocktail', dinner: 'Dîner', dancefloor: 'Dancefloor',
  accommodation: 'Hébergement', parking: 'Accès & stationnement',
  vendor_space: 'Espace prestataire', other: 'Autre',
};

const momentLinksStyle: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12,
};

const tagStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  fontSize: typography.size.caption, color: M.textSecondary,
  border: `1px solid ${M.line}`, borderRadius: 999, padding: '4px 11px',
  background: 'transparent', cursor: 'inherit',
};

const vendorRoleStyle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: M.textMuted, fontWeight: 700,
};

const contactLinkStyle: React.CSSProperties = {
  color: M.textPrimary, textDecoration: 'none',
  borderBottom: `1px solid ${M.lineStrong}`, paddingBottom: 1,
};

const musicMomentHeadStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 12,
  paddingBottom: 10, borderBottom: `1px solid ${M.line}`,
};

const musicTimeStyle: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: fluid(15, 19), color: M.textPrimary,
};

const musicMomentTitleStyle: React.CSSProperties = {
  fontSize: fluid(13, 16), letterSpacing: '0.1em', textTransform: 'uppercase',
  color: M.textSecondary, fontWeight: 600,
};

const songRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center',
  padding: '11px 0', borderBottom: `1px solid ${M.line}`,
};

const songTitleStyle: React.CSSProperties = {
  fontSize: typography.size.bodyLg, color: M.textPrimary,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const songArtistStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textMuted, marginTop: 2,
};

const songMetaStyle: React.CSSProperties = {
  fontSize: typography.size.caption, color: M.textMuted,
  fontFamily: typography.family.mono, whiteSpace: 'nowrap',
};

const galleryGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16,
};

const captionStyle: React.CSSProperties = {
  marginTop: 8, fontSize: typography.size.caption, color: M.textSecondary,
};
