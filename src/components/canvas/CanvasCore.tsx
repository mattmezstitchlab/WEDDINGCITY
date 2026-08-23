import { useMemo, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { projectWorldModel } from '../../projections/worldModel';
import { radius, typography, shadowFor } from '../../design/tokens';
import {
  K, InlineText, InlineSelect, Chip, InlinePicker, FieldRow, canvasCard, addBtnStyle, fieldLabelStyle,
} from './CanvasPrimitives';
import {
  searchEnrichment, confirmEnrichment, removeEnrichment, getEnrichmentState,
  getCachedResult, getEnabledProviders, EnrichmentCandidate,
} from '../../game/enrichment';

// ---------------------------------------------------------------------------
// CANVAS CORE — the composition logic, with NO layout of its own.
// ---------------------------------------------------------------------------
// Phase E splits the Canvas in two:
//
//   CanvasCore          business surfaces (this file): mutations, validation,
//                       inline editing, context, pickers
//   WorldCanvasShell    side panel over the dark 3D world
//   MirrorCanvasShell   editorial surface inside the ivory Mirror
//
// The shells own layout, navigation and presentation. NOTHING business lives
// in them, so the two never diverge: same mutations, same validation, same
// save state, same undo/redo, same ids, same World Model.
//
// There is no local copy of any domain entity here — every surface re-derives
// from projectWorldModel() after each mutation.
// ---------------------------------------------------------------------------

export type CanvasTab = 'programme' | 'people' | 'vendors' | 'places' | 'music' | 'media';

export const CANVAS_TABS: { id: CanvasTab; label: string; index: string }[] = [
  { id: 'programme', label: 'Programme', index: '01' },
  { id: 'people', label: 'Personnes', index: '02' },
  { id: 'vendors', label: 'Prestataires', index: '03' },
  { id: 'places', label: 'Lieux', index: '04' },
  { id: 'music', label: 'Musique', index: '05' },
  { id: 'media', label: 'Médias', index: '06' },
];

const VENDOR_CATEGORIES = [
  'traiteur', 'photographe', 'dj', 'fleuriste', 'lieu',
  'robe', 'transport', 'musique', 'voyage', 'autre',
] as const;

/** Which tab a cross-navigation focus should land on. */
export function tabForFocus(focus: { kind: string } | null): CanvasTab {
  switch (focus?.kind) {
    case 'person': return 'people';
    case 'vendor': return 'vendors';
    case 'place': return 'places';
    case 'song': return 'music';
    default: return 'programme';
  }
}

export function focusLabel(focus: { kind: string; id: string }): string {
  const s = weddingStore;
  switch (focus.kind) {
    case 'person': return s.getPerson(focus.id)?.displayName ?? focus.id;
    case 'vendor': return s.vendors.find((v) => v.id === focus.id)?.companyName ?? focus.id;
    case 'place': return s.places.find((p) => p.id === focus.id)?.name ?? focus.id;
    case 'event': return s.phases.find((p) => p.id === focus.id)?.name ?? focus.id;
    case 'song': return s.tracks.find((t) => t.id === focus.id)?.title ?? focus.id;
    default: return focus.id;
  }
}

/** Reflects the REAL persistence outcome. Never optimistic. */
export function SaveIndicator() {
  const state = weddingStore.saveState;
  const map = {
    idle: { text: 'Prêt', color: K.textMuted },
    saving: { text: 'Enregistrement…', color: K.textSecondary },
    saved: { text: 'Enregistré', color: '#4c7a63' },
    error: { text: 'Échec d’enregistrement', color: '#b4536b' },
  } as const;
  const s = map[state];
  return (
    <span style={{ fontSize: typography.size.caption, color: s.color, whiteSpace: 'nowrap' }}>
      {state === 'error' ? '⚠ ' : ''}{s.text}
    </span>
  );
}

export function UndoRedo({ compact }: { compact?: boolean }) {
  const store = weddingStore;
  const btn = (disabled: boolean): React.CSSProperties => ({
    border: `1px solid ${K.line}`, background: K.surface,
    color: disabled ? K.textMuted : K.textPrimary,
    width: compact ? 28 : 32, height: compact ? 28 : 32, borderRadius: radius.pill,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, opacity: disabled ? 0.45 : 1,
  });
  return (
    <>
      <button onClick={() => store.undo()} disabled={!store.canUndo()}
        title={store.undoLabel() ? `Annuler : ${store.undoLabel()}` : 'Rien à annuler'}
        style={btn(!store.canUndo())}>↶</button>
      <button onClick={() => store.redo()} disabled={!store.canRedo()}
        title={store.redoLabel() ? `Rétablir : ${store.redoLabel()}` : 'Rien à rétablir'}
        style={btn(!store.canRedo())}>↷</button>
    </>
  );
}

/** Renders the business surface for a tab. Layout is the shell's job. */
export function CanvasCore({ tab }: { tab: CanvasTab }) {
  const store = weddingStore;
  const model = useMemo(() => projectWorldModel(), [store.version]);

  return (
    <>
      {tab === 'programme' && <ProgrammeSurface model={model} />}
      {tab === 'people' && <PeopleSurface model={model} />}
      {tab === 'vendors' && <VendorsSurface model={model} />}
      {tab === 'places' && <PlacesSurface model={model} />}
      {tab === 'music' && <MusicSurface model={model} />}
      {tab === 'media' && <MediaSurface model={model} />}
    </>
  );
}

// ===========================================================================
// D2 — PROGRAMME: the primary composition surface
// ===========================================================================

function ProgrammeSurface({ model }: { model: ReturnType<typeof projectWorldModel> }) {
  const store = weddingStore;
  const places = store.places.map((p) => ({ id: p.id, label: p.name, sub: p.code }));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {model.programme.moments.map((m) => {
        const isFocus = store.canvasFocus?.kind === 'event' && store.canvasFocus.id === m.phaseId;
        return (
          <article
            key={m.phaseId}
            style={{
              ...canvasCard,
              padding: '18px 20px',
              boxShadow: isFocus ? shadowFor(4, 'composition') : shadowFor(2, 'composition'),
              borderColor: isFocus ? K.lineStrong : K.line,
            }}
          >
            {/* time + title, both editable in place */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 92 }}>
                <div style={fieldLabelStyle}>Heure</div>
                <InlineText
                  value={m.time}
                  mono
                  size={typography.size.bodyLg}
                  bold
                  onCommit={(next) => {
                    const parsed = parseHour(next);
                    if (parsed !== null) store.setPhaseTime(m.phaseId, parsed);
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={fieldLabelStyle}>Moment</div>
                <InlineText
                  value={m.title}
                  size={typography.size.bodyLg}
                  bold
                  onCommit={(next) => store.setPhaseTitle(m.phaseId, next)}
                />
              </div>
              <button
                onClick={() => store.showEventInWorld(m.phaseId)}
                style={{ ...addBtnStyle, borderStyle: 'solid' }}
                title="Ouvrir ce moment dans le Monde"
              >
                Voir dans le Monde →
              </button>
            </div>

            <div style={{ borderTop: `1px solid ${K.line}`, marginTop: 12, paddingTop: 6 }}>
              {/* PLACE */}
              <FieldRow label="Lieu">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <InlineSelect
                    value={m.placeId}
                    options={places.map((p) => ({ value: p.id, label: p.label }))}
                    placeholder="Aucun lieu"
                    onCommit={(next) => store.setPhasePlace(m.phaseId, next)}
                  />
                  {m.placeId && (
                    <button onClick={() => store.showPlaceInWorld(m.placeId!)} style={linkBtnStyle}>
                      Explorer →
                    </button>
                  )}
                </div>
              </FieldRow>

              {/* VENDORS */}
              <FieldRow label="Prestataires">
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  {m.vendors.map((v) => (
                    <Chip
                      key={v.vendorId}
                      label={v.companyName}
                      sub={v.explicit ? undefined : 'via lieu'}
                      tone={v.explicit ? 'default' : 'derived'}
                      onClick={() => store.setCanvasFocus({ kind: 'vendor', id: v.vendorId })}
                      onRemove={v.explicit ? () => store.detachVendorFromPhase(m.phaseId, v.vendorId) : undefined}
                    />
                  ))}
                  <InlinePicker
                    placeholder="Ajouter un prestataire"
                    items={store.vendors
                      .filter((v) => !m.vendors.some((x) => x.vendorId === v.id))
                      .map((v) => ({ id: v.id, label: v.companyName, sub: v.category }))}
                    onPick={(id) => store.attachVendorToPhase(m.phaseId, id)}
                    onCreate={() => {
                      const created = store.createVendor({ companyName: 'Nouveau prestataire', category: 'autre' });
                      if (created) {
                        store.attachVendorToPhase(m.phaseId, created.id);
                        store.setCanvasFocus({ kind: 'vendor', id: created.id });
                      }
                    }}
                    createLabel="+ Créer un prestataire"
                  />
                </div>
              </FieldRow>

              {/* MUSIC */}
              <FieldRow label="Musique">
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  {m.songs.map((sg) => (
                    <Chip
                      key={sg.songId}
                      label={sg.title}
                      sub={sg.artist}
                      onClick={() => store.setCanvasFocus({ kind: 'song', id: sg.songId })}
                      onRemove={() => store.linkTrackToPhase(sg.songId, null)}
                    />
                  ))}
                  <InlinePicker
                    placeholder="Ajouter un morceau"
                    items={store.tracks
                      .filter((t) => !m.songs.some((x) => x.songId === t.id))
                      .map((t) => ({ id: t.id, label: t.title, sub: t.artist }))}
                    onPick={(id) => store.linkTrackToPhase(id, m.phaseId)}
                    onCreate={() => {
                      const t = store.createTrack({ title: 'Nouveau morceau', artist: '—', phaseId: m.phaseId });
                      if (t) store.setCanvasFocus({ kind: 'song', id: t.id });
                    }}
                    createLabel="+ Créer un morceau"
                  />
                </div>
              </FieldRow>

              {/* PEOPLE — real count, from the model */}
              <FieldRow label="Personnes">
                <span style={{ fontSize: typography.size.body, color: K.textSecondary }}>
                  {m.keyPersonIds.length > 0
                    ? `${m.keyPersonIds.length} mobilisée(s) sur ce moment`
                    : 'Aucune personne rattachée à ce moment'}
                  {' · '}
                  <span style={{ color: K.textMuted }}>{model.guests.counts.total} invités au total</span>
                </span>
              </FieldRow>

              {/* NOTES */}
              <FieldRow label="Notes">
                <InlineText
                  value={m.notes}
                  multiline
                  placeholder="Ajouter une note…"
                  onCommit={(next) => store.setPhaseNotes(m.phaseId, next)}
                />
              </FieldRow>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ===========================================================================
// D3 — PEOPLE
// ===========================================================================

function PeopleSurface({ model }: { model: ReturnType<typeof projectWorldModel> }) {
  const store = weddingStore;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const focusId = store.canvasFocus?.kind === 'person' ? store.canvasFocus.id : null;
  const ordered = focusId
    ? [...model.guests.guests].sort((a, b) => (a.personId === focusId ? -1 : b.personId === focusId ? 1 : 0))
    : model.guests.guests;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!creating ? (
          <button onClick={() => setCreating(true)} style={{ ...addBtnStyle, borderStyle: 'solid' }}>
            + Ajouter une personne
          </button>
        ) : (
          <div style={{ ...canvasCard, padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom Nom"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setCreating(false); setName(''); } }}
              style={inputStyle}
            />
            <button onClick={submit} style={{ ...addBtnStyle, borderStyle: 'solid' }}>Créer</button>
            <button onClick={() => { setCreating(false); setName(''); }} style={{ ...addBtnStyle, border: 'none' }}>Annuler</button>
          </div>
        )}
        <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>
          {model.guests.counts.total} personnes · {model.guests.counts.headcount} convives
        </span>
      </div>

      {ordered.map((g) => <PersonCard key={g.guestId} guestId={g.guestId} personId={g.personId} focused={g.personId === focusId} />)}
    </div>
  );

  function submit() {
    const person = store.createPerson({ displayName: name, asGuest: true, rsvp: 'pending' });
    if (person) {
      store.setCanvasFocus({ kind: 'person', id: person.id });
      setCreating(false);
      setName('');
    }
  }
}

function PersonCard({ guestId, personId, focused }: { guestId: string; personId: string; focused: boolean }) {
  const store = weddingStore;
  const person = store.getPerson(personId);
  const guest = store.guests.find((g) => g.id === guestId);
  if (!person || !guest) return null;

  const relations = store.getRelationshipsFor(personId);
  const media = store.getMediaFor('person', personId);
  const tables = store.seatingTables.map((t) => ({ value: t.id, label: `${t.label} (${store.getTableOccupancy(t.id).seated}/${t.capacity})` }));

  return (
    <article style={{
      ...canvasCard, padding: '16px 18px',
      boxShadow: focused ? shadowFor(4, 'composition') : shadowFor(1, 'composition'),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineText
            value={person.displayName}
            size={typography.size.bodyLg}
            bold
            onCommit={(next) => store.updatePerson(personId, { displayName: next })}
          />
        </div>
        {store.getAgentForPerson(personId) && (
          <button onClick={() => store.showPersonInWorld(personId)} style={linkBtnStyle}>Voir dans le Monde →</button>
        )}
      </div>

      <div style={{ marginTop: 8, borderTop: `1px solid ${K.line}`, paddingTop: 4 }}>
        <FieldRow label="RSVP">
          <InlineSelect
            value={guest.rsvp.status}
            options={[
              { value: 'accepted', label: 'Présent' }, { value: 'pending', label: 'En attente' },
              { value: 'tentative', label: 'Incertain' }, { value: 'declined', label: 'Absent' },
            ]}
            onCommit={(next) => next && store.setGuestRsvp(guestId, next)}
          />
        </FieldRow>

        <FieldRow label="Table">
          <InlineSelect
            value={guest.seating.tableId ?? null}
            options={tables}
            placeholder="Non placé"
            onCommit={(next) => {
              const ok = store.assignGuestToTable(guestId, next);
              if (!ok) window.setTimeout(() => undefined, 0);
            }}
          />
        </FieldRow>

        <FieldRow label="Régime">
          <InlineText value={guest.dietary ?? null} placeholder="Standard"
            onCommit={(next) => store.setGuestDietary(guestId, next)} />
        </FieldRow>

        <FieldRow label="Côté">
          <InlineSelect
            value={guest.side}
            options={[
              { value: 'bride', label: 'Mariée' }, { value: 'groom', label: 'Marié' },
              { value: 'both', label: 'Les deux' }, { value: 'unknown', label: 'Non précisé' },
            ]}
            onCommit={(next) => next && store.setGuestSide(guestId, next)}
          />
        </FieldRow>

        <FieldRow label="Contact">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <InlineText value={person.email ?? null} placeholder="E-mail"
              onCommit={(next) => store.setPersonContact(personId, { email: next })} />
            <InlineText value={person.phone ?? null} placeholder="Téléphone"
              onCommit={(next) => store.setPersonContact(personId, { phone: next })} />
          </div>
        </FieldRow>

        {/* D8 — relations */}
        <FieldRow label="Relations">
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            {relations.map(({ relationship, otherPersonId }) => (
              <Chip
                key={relationship.id}
                label={store.getPerson(otherPersonId)?.displayName ?? otherPersonId}
                sub={RELATION_LABEL[relationship.kind] ?? relationship.kind}
                onClick={() => store.setCanvasFocus({ kind: 'person', id: otherPersonId })}
                onRemove={() => store.unlinkPersons(relationship.id)}
              />
            ))}
            <InlinePicker
              placeholder="Ajouter une relation"
              items={store.persons
                .filter((p) => p.id !== personId && !relations.some((r) => r.otherPersonId === p.id))
                .map((p) => ({ id: p.id, label: p.displayName }))}
              onPick={(id) => store.linkPersons(personId, id, 'friend')}
            />
          </div>
        </FieldRow>

        {/* D7 — media */}
        <FieldRow label="Médias">
          <MediaField ownerKind="person" ownerId={personId} existing={media.length} />
        </FieldRow>

        <FieldRow label="Notes">
          <InlineText value={person.notes ?? null} multiline placeholder="Ajouter une note…"
            onCommit={(next) => store.setPersonNotes(personId, next)} />
        </FieldRow>
      </div>
    </article>
  );
}

const RELATION_LABEL: Record<string, string> = {
  partner: 'Partenaire', parent: 'Parent', child: 'Enfant', sibling: 'Frère/Sœur',
  family: 'Famille', friend: 'Ami', colleague: 'Collègue', witness: 'Témoin', works_with: 'Travaille avec',
};

// ===========================================================================
// D7 — MEDIA: real upload, real persistence
// ===========================================================================

function MediaField({ ownerKind, ownerId, existing }: {
  ownerKind: 'person' | 'place' | 'vendor' | 'event' | 'song' | 'wedding';
  ownerId: string;
  existing: number;
}) {
  const store = weddingStore;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const media = store.getMediaFor(ownerKind, ownerId);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    // localStorage is the only storage this app really has. A large image
    // would blow the quota, so the limit is enforced and explained rather
    // than failing silently later.
    // localStorage is the only storage this app really has. Limits are enforced
    // and EXPLAINED rather than failing silently at save time.
    const limit = file.type.startsWith('audio/') ? 1200 * 1024 : 600 * 1024;
    if (file.size > limit) {
      setError(`Fichier trop lourd (max ${Math.round(limit / 1024)} Ko) : le stockage local est limité.`);
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const asset = store.addMedia({
        kind: file.type.startsWith('image/') ? 'image'
          : file.type.startsWith('audio/') ? 'audio' : 'document',
        source: String(reader.result),
        ownerKind, ownerId,
        title: file.name, fileName: file.name, byteSize: file.size,
      });
      setBusy(false);
      if (!asset) setError('Rattachement refusé : entité introuvable.');
      else if (store.saveState === 'error') setError('Média ajouté mais NON enregistré (quota dépassé).');
    };
    reader.onerror = () => { setBusy(false); setError('Lecture du fichier impossible.'); };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {media.map((m) => (
        <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {m.kind === 'image' && (
            <img src={m.source} alt={m.title ?? ''} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: radius.xs }} />
          )}
          <Chip label={m.title ?? m.kind} onRemove={() => store.removeMedia(m.id)} />
        </span>
      ))}
      <label style={{ ...addBtnStyle, display: 'inline-block' }}>
        {busy ? 'Lecture…' : existing > 0 ? '+ Ajouter' : '+ Ajouter un média'}
        <input
          type="file"
          // Songs also accept an audio file, which is what makes Play real.
          accept={ownerKind === 'song' ? 'image/*,audio/*' : 'image/*'}
          style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {error && <span style={{ fontSize: 10.5, color: '#b4536b' }}>{error}</span>}
    </div>
  );
}

// ===========================================================================
// D4 / D5 / D6 — vendors, places, music
// ===========================================================================

function VendorsSurface({ model }: { model: ReturnType<typeof projectWorldModel> }) {
  const store = weddingStore;
  const focusId = store.canvasFocus?.kind === 'vendor' ? store.canvasFocus.id : null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <button
        onClick={() => {
          const v = store.createVendor({ companyName: 'Nouveau prestataire', category: 'autre' });
          if (v) store.setCanvasFocus({ kind: 'vendor', id: v.id });
        }}
        style={{ ...addBtnStyle, borderStyle: 'solid', justifySelf: 'start' }}
      >
        + Créer un prestataire
      </button>

      {model.vendors.vendors.map((v) => {
        const vendor = store.vendors.find((x) => x.id === v.vendorId);
        if (!vendor) return null;
        return (
          <article key={v.vendorId} style={{
            ...canvasCard, padding: '16px 18px',
            boxShadow: focusId === v.vendorId ? shadowFor(4, 'composition') : shadowFor(1, 'composition'),
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <InlineText value={vendor.companyName} size={typography.size.bodyLg} bold
                onCommit={(next) => store.updateVendor(v.vendorId, { companyName: next })} />
              {v.canShowInWorld && (
                <button onClick={() => store.showVendorInWorld(v.vendorId)} style={linkBtnStyle}>Voir dans le Monde →</button>
              )}
            </div>
            <div style={{ marginTop: 8, borderTop: `1px solid ${K.line}`, paddingTop: 4 }}>
              <FieldRow label="Rôle">
                <InlineSelect value={vendor.category}
                  options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  onCommit={(next) => next && store.updateVendor(v.vendorId, { category: next })} />
              </FieldRow>
              <FieldRow label="Statut">
                <InlineSelect value={vendor.status}
                  options={[
                    { value: 'prospect', label: 'Prospect' }, { value: 'quoted', label: 'Devis' },
                    { value: 'contracted', label: 'Contractualisé' }, { value: 'cancelled', label: 'Annulé' },
                  ]}
                  onCommit={(next) => next && store.updateVendor(v.vendorId, { status: next })} />
              </FieldRow>
              <FieldRow label="Téléphone">
                <InlineText value={vendor.phone ?? null} placeholder="—"
                  onCommit={(next) => store.updateVendor(v.vendorId, { phone: next })} />
              </FieldRow>
              <FieldRow label="E-mail">
                <InlineText value={vendor.email ?? null} placeholder="—"
                  onCommit={(next) => store.updateVendor(v.vendorId, { email: next })} />
              </FieldRow>
              <FieldRow label="Site">
                <InlineText value={vendor.websiteUrl ?? null} placeholder="—"
                  onCommit={(next) => store.updateVendor(v.vendorId, { websiteUrl: next })} />
              </FieldRow>
              <FieldRow label="Médias">
                <MediaField ownerKind="vendor" ownerId={v.vendorId} existing={v.media.length} />
              </FieldRow>
              <FieldRow label="Notes">
                <InlineText value={vendor.notes ?? null} multiline placeholder="Ajouter une note…"
                  onCommit={(next) => store.setVendorNotes(v.vendorId, next)} />
              </FieldRow>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PlacesSurface({ model }: { model: ReturnType<typeof projectWorldModel> }) {
  const store = weddingStore;
  const focusId = store.canvasFocus?.kind === 'place' ? store.canvasFocus.id : null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <button
        onClick={() => {
          const p = store.createPlace({ name: 'Nouveau lieu' });
          if (p) store.setCanvasFocus({ kind: 'place', id: p.id });
        }}
        style={{ ...addBtnStyle, borderStyle: 'solid', justifySelf: 'start' }}
      >
        + Créer un lieu
      </button>

      {model.places.places.map((p) => {
        const place = store.places.find((x) => x.id === p.placeId);
        if (!place) return null;
        return (
          <article key={p.placeId} style={{
            ...canvasCard, padding: '16px 18px',
            boxShadow: focusId === p.placeId ? shadowFor(4, 'composition') : shadowFor(1, 'composition'),
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <InlineText value={place.name} size={typography.size.bodyLg} bold
                onCommit={(next) => store.updatePlace(p.placeId, { name: next })} />
              <button onClick={() => store.showPlaceInWorld(p.placeId)} style={linkBtnStyle}>Explorer →</button>
            </div>
            <div style={{ marginTop: 8, borderTop: `1px solid ${K.line}`, paddingTop: 4 }}>
              <FieldRow label="Adresse">
                <InlineText value={place.address ?? null} placeholder="Aucune adresse"
                  onCommit={(next) => store.updatePlace(p.placeId, { address: next })} />
              </FieldRow>
              <FieldRow label="GPS">
                <InlineText value={place.gpsCoordinates || null} mono placeholder="—"
                  onCommit={(next) => store.updatePlace(p.placeId, { gpsCoordinates: next })} />
              </FieldRow>
              <FieldRow label="Capacité">
                <InlineText value={place.capacity ? String(place.capacity) : null} mono placeholder="0"
                  onCommit={(next) => {
                    const n = parseInt(next, 10);
                    if (!Number.isNaN(n)) store.updatePlace(p.placeId, { capacity: n });
                  }} />
              </FieldRow>
              <FieldRow label="Moments">
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {p.moments.length === 0
                    ? <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>Aucun moment ici</span>
                    : p.moments.map((mo) => (
                      <Chip key={mo.phaseId} label={`${mo.time} ${mo.title}`}
                        onClick={() => store.setCanvasFocus({ kind: 'event', id: mo.phaseId })} />
                    ))}
                </div>
              </FieldRow>
              <FieldRow label="Médias">
                <MediaField ownerKind="place" ownerId={p.placeId} existing={p.media.length} />
              </FieldRow>
              <FieldRow label="Description">
                <InlineText value={place.description || null} multiline placeholder="Ajouter une description…"
                  onCommit={(next) => store.updatePlace(p.placeId, { description: next })} />
              </FieldRow>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MusicSurface({ model }: { model: ReturnType<typeof projectWorldModel> }) {
  const store = weddingStore;
  const phases = store.phases.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <button
        onClick={() => {
          const t = store.createTrack({ title: 'Nouveau morceau', artist: '—' });
          if (t) store.setCanvasFocus({ kind: 'song', id: t.id });
        }}
        style={{ ...addBtnStyle, borderStyle: 'solid', justifySelf: 'start' }}
      >
        + Ajouter un morceau
      </button>

      {model.music.songs.map((sg) => {
        const track = store.tracks.find((t) => t.id === sg.songId);
        if (!track) return null;
        const isFocus = store.canvasFocus?.kind === 'song' && store.canvasFocus.id === sg.songId;
        return (
          <article key={sg.songId} style={{
            ...canvasCard, padding: '14px 18px',
            boxShadow: isFocus ? shadowFor(4, 'composition') : shadowFor(1, 'composition'),
          }}>
            {/* Real artwork when one exists; otherwise nothing is invented. */}
            {sg.coverSource && (
              <img
                src={sg.coverSource}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: radius.xs, display: 'block', marginBottom: 10 }}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'center' }}>
              <InlineText value={track.title} bold onCommit={(next) => { track.title = next.trim() || track.title; store.saveCurrentState(); store.notify(); }} />
              <InlineText value={track.artist} onCommit={(next) => { track.artist = next.trim() || track.artist; store.saveCurrentState(); store.notify(); }} />
              <InlineText value={track.duration || null} mono placeholder="--:--"
                onCommit={(next) => { track.duration = next.trim(); store.saveCurrentState(); store.notify(); }} />
              <InlineSelect value={sg.phaseId} options={phases} placeholder="Hors programme"
                onCommit={(next) => store.linkTrackToPhase(sg.songId, next)} />
              <button onClick={() => store.removeTrack(sg.songId)} style={{ ...addBtnStyle, border: 'none', color: '#b4536b', justifySelf: 'end' }}>
                Retirer
              </button>
            </div>

            {/* Artwork and audio are ordinary MediaAssets: the SAME upload
                mutation as everywhere else, no parallel media handling. */}
            <div style={{ marginTop: 10, borderTop: `1px solid ${K.line}`, paddingTop: 6 }}>
              <FieldRow label="Pochette / audio">
                <div style={{ display: 'grid', gap: 6 }}>
                  <MediaField ownerKind="song" ownerId={sg.songId} existing={sg.media.length} />
                  <span style={{ fontSize: 10, color: K.textMuted }}>
                    {sg.audioSource
                      ? 'Écoutable : une source audio réelle est rattachée.'
                      : 'Aucune source audio : le bouton Écouter n’apparaît pas dans le site.'}
                  </span>
                </div>
              </FieldRow>

              <FieldRow label="Enrichir">
                <EnrichmentField songId={sg.songId} title={track.title} artist={track.artist} />
              </FieldRow>
            </div>
          </article>
        );
      })}
    </div>
  );
}


// ===========================================================================
// MEDIA surface — project-wide, real upload (Phase D mechanism, unchanged)
// ===========================================================================

function MediaSurface({ model }: { model: ReturnType<typeof projectWorldModel> }) {
  const store = weddingStore;
  const owners = [
    { kind: 'wedding' as const, id: store.currentProject.id, label: 'Le mariage' },
    ...store.persons.slice(0, 40).map((p) => ({ kind: 'person' as const, id: p.id, label: p.displayName })),
    ...store.places.map((p) => ({ kind: 'place' as const, id: p.id, label: p.name })),
    ...store.vendors.map((v) => ({ kind: 'vendor' as const, id: v.id, label: v.companyName })),
  ];
  const [ownerIdx, setOwnerIdx] = useState(0);
  const owner = owners[Math.min(ownerIdx, owners.length - 1)];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...canvasCard, padding: '16px 18px' }}>
        <div style={fieldLabelStyle}>Rattacher un média à</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
          <select
            value={ownerIdx}
            onChange={(e) => setOwnerIdx(Number(e.target.value))}
            style={{
              font: 'inherit', fontSize: typography.size.body, color: K.textPrimary,
              background: K.bg, border: `1px solid ${K.line}`, borderRadius: radius.xs,
              padding: '6px 9px', outline: 'none', maxWidth: 280,
            }}
          >
            {owners.map((o, i) => <option key={`${o.kind}_${o.id}`} value={i}>{o.label}</option>)}
          </select>
          <MediaField ownerKind={owner.kind} ownerId={owner.id} existing={store.getMediaFor(owner.kind, owner.id).length} />
        </div>
      </div>

      {model.gallery.length === 0 ? (
        <div style={{ ...canvasCard, padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: typography.size.bodyLg, color: K.textPrimary }}>Aucun média</div>
          <p style={{ margin: '8px auto 0', maxWidth: 380, fontSize: typography.size.caption, color: K.textSecondary, lineHeight: 1.6 }}>
            Rien n’est affiché à la place : ces images n’existent pas. Le premier fichier ajouté
            apparaîtra immédiatement dans le Mirror.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {model.gallery.map((m) => (
            <figure key={m.mediaId} style={{ ...canvasCard, margin: 0, padding: 8 }}>
              {m.kind === 'image' && (
                <img src={m.source} alt={m.title ?? ''} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: radius.xs, display: 'block' }} />
              )}
              <figcaption style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 10.5, color: K.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.title ?? m.kind}
                </span>
                <button onClick={() => store.removeMedia(m.mediaId)} style={{ ...addBtnStyle, border: 'none', color: '#b4536b', padding: '2px 6px' }}>×</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// ENRICHMENT — inline, contextual, never automatic
// ===========================================================================
// Explicit user action only: nothing is searched during a render. The result
// is cached per song for the session, so re-rendering never re-queries.
//
// An ambiguous match is NEVER auto-applied — the candidates are listed and a
// human picks. When no provider is enabled (the default in this build), the
// field says so plainly instead of offering a button that cannot work.

function EnrichmentField({ songId, title, artist }: { songId: string; title: string; artist: string }) {
  const store = weddingStore;
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const state = getEnrichmentState(songId);
  const cached = getCachedResult(songId);
  const providersOn = getEnabledProviders().length > 0;
  void tick;

  const runSearch = async () => {
    setBusy(true);
    setMessage(null);
    const result = await searchEnrichment(songId);
    setBusy(false);
    setTick((n) => n + 1);
    if (result.state === 'unavailable') {
      setMessage('Aucun service d’enrichissement activé dans cette version.');
    } else if (result.state === 'not_found') {
      setMessage('Aucune correspondance trouvée pour ce titre.');
    }
  };

  const apply = (c: EnrichmentCandidate) => {
    const outcome = confirmEnrichment(songId, c.externalId);
    setTick((n) => n + 1);
    if (!outcome.ok) {
      setMessage(outcome.reason === 'nothing_usable'
        ? 'Cette correspondance n’apporte ni pochette ni extrait.'
        : 'Association impossible.');
      return;
    }
    const kept = [
      outcome.keptManualArtwork ? 'pochette manuelle conservée' : null,
      outcome.keptManualPreview ? 'audio manuel conservé' : null,
    ].filter(Boolean).join(' · ');
    setMessage(kept ? `Associé — ${kept}.` : 'Associé.');
  };

  if (state === 'enriched') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, color: '#4c7a63' }}>Enrichi</span>
        <button
          onClick={() => { removeEnrichment(songId); setTick((n) => n + 1); setMessage(null); }}
          style={{ ...addBtnStyle, border: 'none', color: '#b4536b' }}
        >
          Retirer l’enrichissement
        </button>
        {message && <span style={{ fontSize: 10, color: K.textMuted }}>{message}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={runSearch} disabled={busy || !providersOn} style={{
          ...addBtnStyle,
          borderStyle: 'solid',
          opacity: providersOn ? 1 : 0.45,
          cursor: providersOn ? 'pointer' : 'not-allowed',
        }}>
          {busy ? 'Recherche…' : 'Enrichir le morceau'}
        </button>
        {!providersOn && (
          <span style={{ fontSize: 10, color: K.textMuted }}>
            Service non activé — import manuel disponible ci-dessus.
          </span>
        )}
      </div>

      {/* Candidates: a human always chooses. */}
      {cached && cached.candidates.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {cached.candidates.map((c) => (
            <div key={c.externalId} style={candidateStyle}>
              {c.artworkUrl && (
                <img src={c.artworkUrl} alt="" loading="lazy" decoding="async"
                  style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: radius.xs }} />
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11.5, color: K.textPrimary }}>{c.title}</span>
                <span style={{ display: 'block', fontSize: 10, color: K.textMuted }}>
                  {c.artist}
                  {c.previewUrl ? ' · extrait disponible' : ' · sans extrait'}
                </span>
              </span>
              <button onClick={() => apply(c)} style={{ ...addBtnStyle, borderStyle: 'solid' }}>
                Associer
              </button>
            </div>
          ))}
          {cached.attribution && (
            <span style={{ fontSize: 9.5, color: K.textMuted }}>{cached.attribution}</span>
          )}
        </div>
      )}

      {message && <span style={{ fontSize: 10, color: K.textMuted }}>{message}</span>}
      <span style={{ fontSize: 9.5, color: K.textMuted }}>
        Recherche « {title} — {artist} ». Un import manuel a toujours priorité.
      </span>
    </div>
  );
}

const candidateStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  border: `1px solid ${K.line}`, borderRadius: radius.xs, padding: '7px 9px',
};

// --- helpers / styles -------------------------------------------------------

function parseHour(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})\s*[:h]?\s*(\d{2})?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (Number.isNaN(h) || min > 59) return null;
  return h + min / 60;
}

const linkBtnStyle: React.CSSProperties = {
  font: 'inherit', fontSize: typography.size.caption, color: K.textPrimary,
  background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottom: `1px solid ${K.lineStrong}`, padding: 0, whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  font: 'inherit', fontSize: typography.size.body, color: K.textPrimary,
  background: K.bg, border: `1px solid ${K.lineStrong}`, borderRadius: radius.xs,
  padding: '6px 9px', outline: 'none', minWidth: 180,
};
