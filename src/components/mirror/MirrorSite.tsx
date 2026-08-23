import { useEffect, useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { projectWorldModel, GuestProjection } from '../../projections/worldModel';
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
  const { hero, programme, guests, availability } = model;

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
                        onClick={() => {
                          store.setProjection('world');
                          if (m.placeId) store.focusPlace(m.placeId);
                        }}
                      >
                        {m.placeName} →
                      </button>
                    )}
                    {m.highlight && <span style={momentHighlightStyle}>{m.highlight}</span>}
                  </div>
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

      {gallerySection && !gallerySection.available && (
        <SectionShell id="gallery" eyebrow="Les images" title="Galerie" tone="surface">
          <EmptyState
            title="Votre histoire visuelle commencera ici"
            body="Aucune photo n’est encore rattachée au projet. Rien n’est affiché à la place : ces images n’existent pas."
            note={gallerySection.reason}
          />
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
            {notice && <div style={{ marginTop: 8, fontSize: 11, color: M.textMuted }}>{notice}</div>}
          </div>
        )}
      </div>
    </li>
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
