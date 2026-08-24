import { useMemo, useState } from 'react';
import { weddingStore, CanvasSection } from '../../game/weddingStore';
import { projectWorldModel } from '../../projections/worldModel';
import { radius, typography, shadowFor } from '../../design/tokens';
import {
  K, InlineText, InlineSelect, Chip, InlinePicker, FieldRow, CanvasEmpty,
  canvasCard, addBtnStyle, fieldLabelStyle,
} from './CanvasPrimitives';
import {
  searchEnrichment, confirmEnrichment, removeEnrichment, getEnrichmentState,
  getCachedResult, isEnrichmentAvailable, isItunesEnabled, setItunesEnabled,
  describeActivation, EnrichmentCandidate,
} from '../../game/enrichment';
import { IconAlert } from '../ui/Icons';

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

/** The five transverse sheets — the day itself is not a Canvas tab. */
export type CanvasTab = CanvasSection;

export const CANVAS_TABS: { id: CanvasTab; label: string; index: string }[] = [
  { id: 'people', label: 'Personnes', index: '01' },
  { id: 'vendors', label: 'Prestataires', index: '02' },
  { id: 'places', label: 'Lieux', index: '03' },
  { id: 'music', label: 'Musique', index: '04' },
  { id: 'media', label: 'Médias', index: '05' },
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
    // A generic Canvas request opens the first transverse sheet. A moment
    // request must use openMoment(), never fall back to a day editor.
    default: return 'people';
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
      {state === 'error' && <IconAlert size={12} color={s.color} style={{ verticalAlign: '-2px', marginRight: 4 }} />}{s.text}
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
      {tab === 'people' && <PeopleSurface model={model} />}
      {tab === 'vendors' && <VendorsSurface model={model} />}
      {tab === 'places' && <PlacesSurface model={model} />}
      {tab === 'music' && <MusicSurface model={model} />}
      {tab === 'media' && <MediaSurface model={model} />}
    </>
  );
}

// ===========================================================================
// TRANSVERSE SHEETS
//
// Moment properties and ordering no longer live in Canvas. TimelineStudio and
// MomentHub are the only product doors for the day itself; the sheets below
// handle entities that can belong to several moments.
// ===========================================================================

// ===========================================================================
// D3 — PEOPLE
// ===========================================================================

function PeopleSurface({ model }: { model: ReturnType<typeof projectWorldModel> }) {
  const store = weddingStore;
  const inWorld = store.getCanvasShell() === 'world';
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

      {ordered.length === 0 && (
        <CanvasEmpty
          title="Aucune personne"
          body="Personne n’est encore rattaché à ce mariage. Une personne créée ici apparaît aussitôt dans 02 PERSONNES."
        />
      )}

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
  const inWorld = store.getCanvasShell() === 'world';
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
        {inWorld && store.getAgentForPerson(personId) && (
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
          <span style={{ display: 'inline-grid', gap: 2 }}>
            <Chip label={m.title ?? m.kind} onRemove={() => store.removeMedia(m.id)} />
            {/* PROVENANCE — Canvas only. The Mirror never shows this. */}
            <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>
              {m.origin === 'manual'
                ? 'Import manuel'
                : m.origin === 'research'
                  ? `Enrichi automatiquement${m.provenance?.providerName ? ` · ${m.provenance.providerName}` : ''}`
                  : m.origin}
            </span>
          </span>
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
  const inWorld = store.getCanvasShell() === 'world';
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

      {model.vendors.vendors.length === 0 && (
        <CanvasEmpty
          title="Aucun prestataire"
          body="Aucun intervenant n’est référencé. Un prestataire créé ici pourra être rattaché à un moment et à un lieu."
        />
      )}

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
              {inWorld && v.canShowInWorld && (
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
  const inWorld = store.getCanvasShell() === 'world';
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

      {model.places.places.length === 0 && (
        <CanvasEmpty
          title="Aucun lieu"
          body="Aucun espace n’est référencé. Un lieu créé ici peut accueillir un moment de la journée."
        />
      )}

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
              {inWorld && (
                <button onClick={() => store.showPlaceInWorld(p.placeId)} style={linkBtnStyle}>Explorer →</button>
              )}
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

      <EnrichmentActivation />

      {model.music.songs.length === 0 && (
        <CanvasEmpty
          title="Aucun morceau"
          body="La bande-son est vide. Un morceau créé ici reçoit sa fiche, puis se règle depuis le MomentHub du moment concerné."
        />
      )}

      {model.music.songs.map((sg) => {
        const track = store.tracks.find((t) => t.id === sg.songId);
        if (!track) return null;
        const phaseId = sg.phaseId;
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
              {phaseId ? (
                <button
                  onClick={() => {
                    const returnFrom = store.canvasReturnPhaseId;
                    const target = returnFrom ?? phaseId;
                    store.closeCanvas();
                    if (!returnFrom) store.openMoment(target);
                  }}
                  style={linkBtnStyle}
                  title="La relation se règle dans le MomentHub"
                >
                  Régler dans le moment →
                </button>
              ) : (
                <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>
                  Hors moment
                </span>
              )}
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
                  <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>
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
            apparaîtra immédiatement dans LE GRAND JOUR.
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

function formatMs(ms: number | undefined): string | null {
  if (!ms || ms <= 0) return null;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * ACTIVATION SWITCH — the one place a human turns the external search on.
 *
 * It grants permission; it proves nothing. Reachability is only ever
 * demonstrated by a search that actually returns candidates, so the copy here
 * never claims the service works.
 */
function EnrichmentActivation() {
  const [, setTick] = useState(0);
  const on = isItunesEnabled();
  return (
    <div style={{ ...canvasCard, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10.5, color: K.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Recherche automatique
      </span>
      <button
        onClick={() => { setItunesEnabled(!on); setTick((n) => n + 1); }}
        aria-pressed={on}
        style={{ ...addBtnStyle, borderStyle: 'solid' }}
      >
        {on ? 'Désactiver iTunes Search' : 'Activer iTunes Search'}
      </button>
      <span style={{ fontSize: typography.size.caption, color: K.textMuted, flex: 1, minWidth: 220 }}>
        {describeActivation()}
        {' '}
        La connexion à Apple n’a pas pu être vérifiée depuis l’environnement de
        développement : si elle échoue, l’import manuel reste disponible.
      </span>
    </div>
  );
}

function EnrichmentField({ songId, title, artist }: { songId: string; title: string; artist: string }) {
  const store = weddingStore;
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const state = getEnrichmentState(songId);
  const cached = getCachedResult(songId);
  const available = isEnrichmentAvailable();
  void tick;

  const runSearch = async () => {
    setBusy(true);
    setMessage(null);
    const result = await searchEnrichment(songId);
    setBusy(false);
    setTick((n) => n + 1);
    if (result.state === 'unavailable') {
      // Never an exception, never a stack trace: one calm sentence.
      setMessage('Enrichissement automatique indisponible — import manuel disponible.');
    } else if (result.state === 'not_found') {
      setMessage('Aucune correspondance fiable. Le morceau reste tel quel — import manuel disponible.');
    } else if (result.exact === null && result.candidates.length > 1) {
      setMessage('Plusieurs correspondances proches : à vous de choisir, rien n’est appliqué automatiquement.');
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
    const enriched = store.getMediaFor('song', songId).find((m) => m.origin === 'research');
    const prov = enriched?.provenance;
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, color: '#4c7a63' }}>
            Enrichi automatiquement{prov?.providerName ? ` · ${prov.providerName}` : ''}
          </span>
          {prov?.externalUrl && (
            <a href={prov.externalUrl} target="_blank" rel="noreferrer noopener"
              style={{ ...linkBtnStyle, textDecoration: 'none' }}>
              voir la source ↗
            </a>
          )}
          <button
            onClick={() => { removeEnrichment(songId); setTick((n) => n + 1); setMessage(null); }}
            style={{ ...addBtnStyle, border: 'none', color: '#b4536b' }}
          >
            Retirer l’enrichissement
          </button>
        </div>
        {prov?.attribution && (
          <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>{prov.attribution}</span>
        )}
        {message && <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>{message}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={runSearch} disabled={busy || !available} style={{
          ...addBtnStyle,
          borderStyle: 'solid',
          opacity: available ? 1 : 0.45,
          cursor: available ? 'pointer' : 'not-allowed',
        }}>
          {busy ? 'Recherche…' : 'Enrichir le morceau'}
        </button>
        {!available && (
          <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>
            Enrichissement automatique indisponible — import manuel disponible ci-dessus.
          </span>
        )}
      </div>

      {/* PROPOSITION — a human always confirms. Nothing is applied on its own. */}
      {cached && cached.candidates.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {cached.candidates.map((c) => {
            const exact = cached.exact?.externalId === c.externalId;
            const duration = formatMs(c.durationMs);
            return (
              <div key={c.externalId} style={{
                ...candidateStyle,
                boxShadow: exact ? `inset 0 0 0 1px ${K.lineStrong}` : 'none',
              }}>
                {c.artworkUrl && (
                  <img src={c.artworkUrl} alt="" loading="lazy" decoding="async"
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: radius.xs }} />
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11.5, color: K.textPrimary }}>
                    {c.title}
                    {exact && (
                      <span style={{ marginLeft: 6, fontSize: typography.size.caption, color: '#4c7a63' }}>
                        correspondance exacte
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'block', fontSize: typography.size.caption, color: K.textMuted }}>
                    {c.artist}
                    {c.album ? ` · ${c.album}` : ''}
                    {duration ? ` · ${duration}` : ''}
                  </span>
                  <span style={{ display: 'block', fontSize: typography.size.caption, color: K.textMuted }}>
                    {c.artworkUrl ? 'pochette' : 'sans pochette'}
                    {c.previewUrl ? ' · extrait écoutable' : ' · sans extrait'}
                  </span>
                </span>
                <button onClick={() => apply(c)} style={{ ...addBtnStyle, borderStyle: 'solid' }}>
                  Confirmer
                </button>
              </div>
            );
          })}
          {cached.attribution && (
            <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>{cached.attribution}</span>
          )}
        </div>
      )}

      {message && <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>{message}</span>}
      <span style={{ fontSize: typography.size.caption, color: K.textMuted }}>
        Recherche « {title} — {artist} ». Un import manuel a toujours priorité.
      </span>
    </div>
  );
}

// --- helpers / styles -------------------------------------------------------

const candidateStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  border: `1px solid ${K.line}`, borderRadius: radius.xs, padding: '7px 9px',
};

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
