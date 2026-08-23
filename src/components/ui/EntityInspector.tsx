import { useState } from 'react';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import {
  IconMairie,
  IconManoir,
  IconChapelle,
  IconCeremonie,
  IconCocktail,
  IconBanquet,
  IconDancefloor,
  IconHotel,
  IconTransport,
  IconBrunch,
  IconFlorist,
  IconPhoto,
  IconDocument,
  IconUser,
} from './Icons';

export function EntityInspector() {
  const store = weddingStore;
  const selected = store.selectedEntity;
  // Surfaces a refused seating attempt instead of failing silently.
  const [seatError, setSeatError] = useState<string | null>(null);

  if (!selected) return null;

  const getPlaceIcon = (iconCode: string) => {
    switch (iconCode) {
      case 'mairie': return <IconMairie size={16} color={BRAND_ACCENT} />;
      case 'manoir': return <IconManoir size={16} color={BRAND_ACCENT} />;
      case 'chapelle': return <IconChapelle size={16} color={BRAND_ACCENT} />;
      case 'ceremonie': return <IconCeremonie size={16} color={BRAND_ACCENT} />;
      case 'cocktail': return <IconCocktail size={16} color={BRAND_ACCENT} />;
      case 'banquet': return <IconBanquet size={16} color={BRAND_ACCENT} />;
      case 'dancefloor': return <IconDancefloor size={16} color={BRAND_ACCENT} />;
      case 'hotel': return <IconHotel size={16} color={BRAND_ACCENT} />;
      case 'transport': return <IconTransport size={16} color={BRAND_ACCENT} />;
      case 'brunch': return <IconBrunch size={16} color={BRAND_ACCENT} />;
      case 'florist': return <IconFlorist size={16} color={BRAND_ACCENT} />;
      case 'photo': return <IconPhoto size={16} color={BRAND_ACCENT} />;
      default: return <IconManoir size={16} color={BRAND_ACCENT} />;
    }
  };

  if (selected.type === 'agent') {
    const agent = store.agents.find((a) => a.id === selected.id);
    if (!agent) return null;

    // The card is now a PROJECTION OF THE DOMAIN MODEL, resolved by id.
    // Previously it read agent fields directly and — worse — displayed the
    // CURRENT USER's DMC identity on every single person's card.
    const person = store.getPersonForAgent(agent.id);
    const guest = person ? store.getGuestForPerson(person.id) : null;
    const vendor = store.getVendorForAgent(agent.id);
    const dmc = person ? store.getDmcForPerson(person.id) : null;
    const isMe = store.isCurrentUserAgent(agent.id);
    const table = guest?.seating.tableId
      ? store.seatingTables.find((t) => t.id === guest.seating.tableId)
      : null;
    const phases = store.getPhasesForAgent(agent.id);
    const zone = store.getCurrentPlaceForAgent(agent.id);

    return (
      <div style={inspectorCardStyle}>
        {/* Header */}
        <div style={inspectorHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={avatarBoxStyle}>
              <IconUser size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: BRAND_TEXT_PRIMARY }}>
                {agent.name}
              </div>
              <div style={{ fontSize: 11, color: BRAND_ACCENT, fontWeight: 500 }}>
                {agent.title}
              </div>
            </div>
          </div>
          <button onClick={() => store.clearSelection()} style={closeBtnStyle}>✕</button>
        </div>

        {/* Conflict Alert */}
        {agent.isConflict && (
          <div style={conflictBannerStyle}>
            <div style={{ fontWeight: 700, color: '#f43f5e', fontSize: 11, letterSpacing: '0.04em' }}>
              CONFLIT HORAIRE DÉTECTÉ
            </div>
            <div style={{ fontSize: 11, color: '#fda4af', marginTop: 2 }}>{agent.conflictReason}</div>
            <button
              onClick={() => store.resolveConflict('conflict_photo_time')}
              style={resolveBtnStyle}
            >
              Résoudre & Caler à 14h30
            </button>
          </div>
        )}

        {/* Core Attributes */}
        <div style={sectionStyle}>
          <div style={labelStyle}>IDENTITÉ & DONNÉES DMC</div>
          <div style={gridDataStyle}>
            <div>
              <span style={dataKeyStyle}>Rôle :</span> <span style={dataValStyle}>{agent.role.toUpperCase()}</span>
            </div>
            <div>
              <span style={dataKeyStyle}>Identifiant :</span>{' '}
              <span style={{ ...dataValStyle, fontSize: 9.5, opacity: 0.75 }}>
                {person ? person.id : 'aucune personne rattachée'}
              </span>
            </div>
            {/* The DMC shown is the one OWNED BY THIS PERSON. */}
            {dmc ? (
              <>
                <div>
                  <span style={dataKeyStyle}>DMC ID :</span>{' '}
                  <span style={{ ...dataValStyle, color: dmc.dmcColor }}>
                    {dmc.symbolGlyph} {dmc.dmcCode}
                  </span>
                </div>
                <div>
                  <span style={dataKeyStyle}>Nuance Textile :</span> <span style={dataValStyle}>{dmc.dmcName}</span>
                </div>
              </>
            ) : (
              <div>
                <span style={dataKeyStyle}>DMC ID :</span>{' '}
                <span style={{ ...dataValStyle, opacity: 0.6 }}>aucune identité DMC</span>
              </div>
            )}
            {isMe && (
              <div>
                <span style={dataKeyStyle}>Statut :</span>{' '}
                <span style={{ ...dataValStyle, color: BRAND_ACCENT }}>C’EST VOUS</span>
              </div>
            )}
            {vendor && (
              <div>
                <span style={dataKeyStyle}>Prestataire :</span>{' '}
                <span style={dataValStyle}>{vendor.companyName} · {vendor.category}</span>
              </div>
            )}
            {zone && (
              <div>
                <span style={dataKeyStyle}>Zone actuelle :</span> <span style={dataValStyle}>{zone.name}</span>
              </div>
            )}
            <div>
              <span style={dataKeyStyle}>Présence :</span> <span style={dataValStyle}>{Math.floor(agent.arrivalHour)}h - {Math.floor(agent.departureHour)}h</span>
            </div>
            {agent.phone && (
              <div>
                <span style={dataKeyStyle}>Contact :</span> <span style={dataValStyle}>{agent.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* ---- GUEST FACET: real, editable, persisted ---- */}
        {guest && (
          <div style={sectionStyle}>
            <div style={labelStyle}>INVITÉ · RSVP & PLACEMENT</div>

            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {(['accepted', 'pending', 'tentative', 'declined'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => store.setGuestRsvp(guest.id, status)}
                  style={{
                    ...badgeBtnStyle,
                    flex: '0 0 auto',
                    borderColor: guest.rsvp.status === status ? BRAND_ACCENT : undefined,
                    background: guest.rsvp.status === status ? 'rgba(226,180,72,0.15)' : undefined,
                    color: guest.rsvp.status === status ? BRAND_ACCENT : '#ffffff',
                  }}
                >
                  {status === 'accepted' ? 'Présent' : status === 'pending' ? 'En attente'
                    : status === 'tentative' ? 'Incertain' : 'Absent'}
                </button>
              ))}
            </div>

            <div style={{ ...gridDataStyle, marginTop: 8 }}>
              <div>
                <span style={dataKeyStyle}>Côté :</span>{' '}
                <select
                  value={guest.side}
                  onChange={(e) => store.setGuestSide(guest.id, e.target.value as typeof guest.side)}
                  style={inlineSelectStyle}
                >
                  <option value="bride">Mariée</option>
                  <option value="groom">Marié</option>
                  <option value="both">Les deux</option>
                  <option value="unknown">Non précisé</option>
                </select>
              </div>
              <div>
                <span style={dataKeyStyle}>Accompagnants :</span>{' '}
                <span style={dataValStyle}>{guest.rsvp.plusOnes}</span>
                <button onClick={() => store.setGuestPlusOnes(guest.id, guest.rsvp.plusOnes + 1)} style={miniBtnStyle}>+</button>
                <button onClick={() => store.setGuestPlusOnes(guest.id, guest.rsvp.plusOnes - 1)} style={miniBtnStyle}>−</button>
              </div>
              <div>
                <span style={dataKeyStyle}>Table :</span>{' '}
                <select
                  value={guest.seating.tableId ?? ''}
                  onChange={(e) => {
                    const ok = store.assignGuestToTable(guest.id, e.target.value || null);
                    if (!ok) setSeatError('Table complète ou introuvable.');
                    else setSeatError(null);
                  }}
                  style={inlineSelectStyle}
                >
                  <option value="">Non placé</option>
                  {store.seatingTables.map((t) => {
                    const occ = store.getTableOccupancy(t.id);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.label} ({occ.seated}/{occ.capacity})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <span style={dataKeyStyle}>Régime :</span>{' '}
                <input
                  defaultValue={guest.dietary ?? ''}
                  onBlur={(e) => store.setGuestDietary(guest.id, e.target.value)}
                  placeholder="Standard"
                  style={inlineInputStyle}
                />
              </div>
            </div>

            {seatError && (
              <div style={{ marginTop: 6, fontSize: 10, color: '#fda4af' }}>{seatError}</div>
            )}
            {table && (
              <button
                onClick={() => { if (table.placeId) store.focusPlace(table.placeId); }}
                style={{ ...badgeBtnStyle, marginTop: 6 }}
              >
                Voir {table.label} dans le monde →
              </button>
            )}
          </div>
        )}

        {/* ---- VENDOR FACET ---- */}
        {vendor && (
          <div style={sectionStyle}>
            <div style={labelStyle}>PRESTATAIRE · ENGAGEMENT</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {(['prospect', 'quoted', 'contracted', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => store.setVendorStatus(vendor.id, st)}
                  style={{
                    ...badgeBtnStyle,
                    flex: '0 0 auto',
                    borderColor: vendor.status === st ? BRAND_ACCENT : undefined,
                    background: vendor.status === st ? 'rgba(226,180,72,0.15)' : undefined,
                    color: vendor.status === st ? BRAND_ACCENT : '#ffffff',
                  }}
                >
                  {st === 'prospect' ? 'Prospect' : st === 'quoted' ? 'Devis'
                    : st === 'contracted' ? 'Contractualisé' : 'Annulé'}
                </button>
              ))}
            </div>
            {vendor.placeIds.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={subLabelStyle}>ZONES D’INTERVENTION :</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {vendor.placeIds.map((placeId) => {
                    const place = store.places.find((pl) => pl.id === placeId);
                    if (!place) return null;
                    return (
                      <button key={placeId} onClick={() => store.focusPlace(place.id)} style={badgeBtnStyle}>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {place.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interconnected Network */}
        <div style={sectionStyle}>
          <div style={labelStyle}>RÉSEAU INTERCONNECTÉ</div>

          {/* Connected Documents */}
          {agent.connectedDocIds.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={subLabelStyle}>DOCUMENTS & CONTRATS :</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {agent.connectedDocIds.map((docId) => {
                  const doc = store.docs.find((d) => d.id === docId);
                  if (!doc) return null;
                  return (
                    <button
                      key={docId}
                      onClick={() => store.selectEntity('document', doc.id)}
                      style={badgeBtnStyle}
                    >
                      <IconDocument size={12} color="#ffffff" />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {doc.title} {doc.amount ? `(${doc.amount} €)` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connected Tasks */}
          {agent.connectedTaskIds.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={subLabelStyle}>ACTIONS PROGRAMMÉES :</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {agent.connectedTaskIds.map((taskId) => {
                  const task = store.tasks.find((t) => t.id === taskId);
                  if (!task) return null;
                  return (
                    <button
                      key={taskId}
                      onClick={() => store.selectEntity('task', task.id)}
                      style={badgeBtnStyle}
                    >
                      <span style={{ color: task.isDone ? '#10b981' : BRAND_ACCENT }}>
                        {task.isDone ? '✓' : '•'}
                      </span>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ---- TIMELINE MOMENTS ---- */}
        {phases.length > 0 && (
          <div style={sectionStyle}>
            <div style={labelStyle}>MOMENTS DE TIMELINE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {phases.map((ph) => (
                <button key={ph.id} onClick={() => store.setTime(ph.startHour + 0.1)} style={badgeBtnStyle}>
                  <span style={{ color: BRAND_ACCENT }}>{Math.floor(ph.startHour)}h</span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {ph.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WORLD → MIRROR. Travels by personId, so the editorial page lands on
            exactly this person — no index, no name matching. */}
        {person && (
          <button
            onClick={() => store.openCanvas({ kind: 'person', id: person.id })}
            style={{ ...actionMainBtnStyle, background: 'transparent', color: BRAND_TEXT_PRIMARY, border: `1px solid ${BRAND_BORDER}`, marginBottom: 6 }}
          >
            Composer dans le Canvas →
          </button>
        )}

        {person && (
          <button
            onClick={() => store.showPersonInMirror(person.id)}
            style={{ ...actionMainBtnStyle, background: 'transparent', color: BRAND_ACCENT, border: `1px solid ${BRAND_BORDER}`, marginBottom: 6 }}
          >
            Voir dans Mirror →
          </button>
        )}

        {/* Track Agent in World */}
        <button
          onClick={() => {
            store.cameraTargetPos = [agent.currentPos[0], agent.currentPos[1] + 1.5, agent.currentPos[2]];
            store.spawnGridWave(agent.currentPos, BRAND_ACCENT);
          }}
          style={actionMainBtnStyle}
        >
          Localiser sur la Worldmap
        </button>
      </div>
    );
  }

  if (selected.type === 'document') {
    const doc = store.docs.find((d) => d.id === selected.id);
    if (!doc) return null;

    return (
      <div style={inspectorCardStyle}>
        <div style={inspectorHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={avatarBoxStyle}><IconDocument size={16} color="#ffffff" /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: BRAND_TEXT_PRIMARY }}>
                {doc.title}
              </div>
              <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                {doc.fileName}
              </div>
            </div>
          </div>
          <button onClick={() => store.clearSelection()} style={closeBtnStyle}>✕</button>
        </div>

        {doc.amount && (
          <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
            <div style={metricCardStyle}>
              <div style={{ fontSize: 8, color: BRAND_TEXT_MUTED, fontWeight: 700 }}>MONTANT TOTAL</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: '#ffffff', marginTop: 2 }}>
                {doc.amount.toLocaleString('fr-FR')} €
              </div>
            </div>
            {doc.depositAmount && (
              <div style={metricCardStyle}>
                <div style={{ fontSize: 8, color: BRAND_TEXT_MUTED, fontWeight: 700 }}>ACOMPTE REQUIS</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: BRAND_ACCENT, marginTop: 2 }}>
                  {doc.depositAmount.toLocaleString('fr-FR')} €
                </div>
              </div>
            )}
          </div>
        )}

        <div style={sectionStyle}>
          <div style={labelStyle}>EXTRACTION OCR</div>
          <div style={ocrBoxStyle}>
            {doc.rawTextExcerpt}
          </div>
        </div>

        {doc.depositAmount && !doc.isPaid && (
          <button
            onClick={() => store.resolveConflict('conflict_traiteur_acompte')}
            style={actionMainBtnStyle}
          >
            Régler l’acompte ({doc.depositAmount} €)
          </button>
        )}
      </div>
    );
  }

  if (selected.type === 'place') {
    const place = store.places.find((p) => p.id === selected.id);
    if (!place) return null;

    return (
      <div style={inspectorCardStyle}>
        <div style={inspectorHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={avatarBoxStyle}>{getPlaceIcon(place.icon)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: BRAND_TEXT_PRIMARY }}>
                {place.name}
              </div>
              <div style={{ fontSize: 10, color: BRAND_ACCENT, fontFamily: "'JetBrains Mono', monospace" }}>
                {place.gpsCoordinates} • Capacité : {place.capacity} pax
              </div>
            </div>
          </div>
          <button onClick={() => store.clearSelection()} style={closeBtnStyle}>✕</button>
        </div>

        <p style={{ fontSize: 12, color: BRAND_TEXT_SECONDARY, lineHeight: 1.5, margin: '10px 0' }}>
          {place.description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {place.isInteriorExplorable && (
            <button
              onClick={() => store.enterVenue(place.id)}
              style={{
                ...actionMainBtnStyle,
                marginTop: 0,
                background: BRAND_ACCENT,
                color: '#08090d',
              }}
            >
              🚪 Entrer & Explorer l’Intérieur en 3D
            </button>
          )}

          <button
            onClick={() => {
              store.worldResearchModalOpen = true;
              store.notify();
            }}
            style={{ ...actionMainBtnStyle, marginTop: 0, background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff' }}
          >
            ◉ Rechercher des prestataires Web ici
          </button>

          <button
            onClick={() => store.focusPlace(place.id)}
            style={{ ...actionMainBtnStyle, marginTop: 0 }}
          >
            Centrer la caméra sur ce lieu
          </button>
        </div>
      </div>
    );
  }

  if (selected.type === 'object') {
    const obj = store.placedObjects.find((o) => o.id === selected.id);
    if (!obj) return null;

    return (
      <div style={inspectorCardStyle}>
        <div style={inspectorHeaderStyle}>
          <div>
            <div style={{ fontSize: 9, color: BRAND_ACCENT, fontWeight: 700, letterSpacing: '0.06em' }}>
              MOBILIER INTERACTIF DU LIEU
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: BRAND_TEXT_PRIMARY, marginTop: 2 }}>
              {obj.name}
            </div>
          </div>
          <button onClick={() => store.clearSelection()} style={closeBtnStyle}>✕</button>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>DÉTAILS & AFFECTATIONS</div>
          <div style={gridDataStyle}>
            <div>
              <span style={dataKeyStyle}>Catégorie :</span> <span style={dataValStyle}>{obj.category.toUpperCase()}</span>
            </div>
            {obj.tableCapacity && (
              <div>
                <span style={dataKeyStyle}>Capacité :</span> <span style={dataValStyle}>{obj.tableCapacity} couverts</span>
              </div>
            )}
            <div>
              <span style={dataKeyStyle}>Position :</span> <span style={dataValStyle}>X: {obj.pos[0].toFixed(1)} Z: {obj.pos[2].toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <button
            onClick={() => store.toggleConstructionMode(true)}
            style={{ ...actionMainBtnStyle, marginTop: 0, background: BRAND_ACCENT }}
          >
            🛠️ Modifier l’Agencement
          </button>
        </div>
      </div>
    );
  }

  return null;
}

const inspectorCardStyle: React.CSSProperties = {
  position: 'absolute',
  top: 70,
  right: 16,
  width: 310,
  maxHeight: 'calc(100vh - 160px)',
  overflowY: 'auto',
  background: 'rgba(18, 21, 30, 0.92)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 18,
  padding: '16px',
  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.55)',
  zIndex: 40,
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const inspectorHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  paddingBottom: 10,
};

const avatarBoxStyle: React.CSSProperties = {
  fontSize: 18,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  padding: '6px 8px',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 13,
  cursor: 'pointer',
};

const sectionStyle: React.CSSProperties = {
  marginTop: 12,
  paddingTop: 8,
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: BRAND_TEXT_MUTED,
  textTransform: 'uppercase',
};

const subLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  color: BRAND_TEXT_SECONDARY,
};

const gridDataStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '5px 8px',
  marginTop: 6,
  fontSize: 11,
};

const dataKeyStyle: React.CSSProperties = {
  color: BRAND_TEXT_MUTED,
};

const dataValStyle: React.CSSProperties = {
  color: BRAND_TEXT_PRIMARY,
  fontWeight: 600,
};

const badgeBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '4px 8px',
  color: BRAND_TEXT_PRIMARY,
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
};

const metricCardStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.02)',
  padding: '8px 10px',
  borderRadius: 8,
  border: `1px solid ${BRAND_BORDER}`,
};

const ocrBoxStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.35)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: 10,
  fontSize: 10,
  fontFamily: "'JetBrains Mono', monospace",
  color: '#cbd5e1',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  marginTop: 6,
};

const actionMainBtnStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 14,
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 10,
  padding: '9px 12px',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
};

const conflictBannerStyle: React.CSSProperties = {
  marginTop: 10,
  background: 'rgba(244, 63, 94, 0.1)',
  border: '1px solid rgba(244, 63, 94, 0.6)',
  borderRadius: 8,
  padding: 10,
};

const resolveBtnStyle: React.CSSProperties = {
  marginTop: 6,
  width: '100%',
  background: '#f43f5e',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
};

// Inline editing controls. Deliberately reuse the existing tokens and the same
// visual weight as the read-only rows they replace, so the card looks
// unchanged while becoming genuinely editable.
const inlineSelectStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 5,
  color: BRAND_TEXT_PRIMARY,
  fontSize: 11,
  padding: '2px 4px',
  outline: 'none',
  maxWidth: 150,
};

const inlineInputStyle: React.CSSProperties = {
  ...inlineSelectStyle,
  width: 110,
};

const miniBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 4,
  color: BRAND_TEXT_PRIMARY,
  fontSize: 10,
  lineHeight: 1,
  padding: '2px 5px',
  marginLeft: 4,
  cursor: 'pointer',
};
