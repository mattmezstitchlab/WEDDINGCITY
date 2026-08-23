import { useMemo, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { projectWorldModel } from '../../projections/worldModel';
import { radius, typography, shadowFor } from '../../design/tokens';
import {
  K, InlineText, InlineSelect, Chip, InlinePicker, FieldRow, canvasCard, addBtnStyle, fieldLabelStyle,
} from './CanvasPrimitives';

// ---------------------------------------------------------------------------
// CANVAS — the composition surface of the World Model.
// ---------------------------------------------------------------------------
// Not a page, not a dashboard, not a settings screen: the place where the
// World Model is edited directly, in context.
//
// Every control calls a validated store mutation. There is no local copy of
// any entity here — the surface re-derives from projectWorldModel() after each
// change, exactly like World and Mirror do.
//
// D2 (moments) is the primary surface, because a moment already joins time,
// place, vendors, songs, people and media.
// ---------------------------------------------------------------------------

type Tab = 'programme' | 'people' | 'vendors' | 'places' | 'music';

const TABS: { id: Tab; label: string }[] = [
  { id: 'programme', label: 'Programme' },
  { id: 'people', label: 'Personnes' },
  { id: 'vendors', label: 'Prestataires' },
  { id: 'places', label: 'Lieux' },
  { id: 'music', label: 'Musique' },
];

const VENDOR_CATEGORIES = [
  'traiteur', 'photographe', 'dj', 'fleuriste', 'lieu',
  'robe', 'transport', 'musique', 'voyage', 'autre',
] as const;

export function CanvasSurface() {
  const store = weddingStore;
  const model = useMemo(() => projectWorldModel(), [store.version]);

  // Tab follows the focus the user arrived with (Mirror/World → Canvas).
  const focusTab: Tab =
    store.canvasFocus?.kind === 'person' ? 'people'
      : store.canvasFocus?.kind === 'vendor' ? 'vendors'
        : store.canvasFocus?.kind === 'place' ? 'places'
          : store.canvasFocus?.kind === 'song' ? 'music'
            : 'programme';
  const [tab, setTab] = useState<Tab>(focusTab);
  const [lastTouchedFocus, setLastTouchedFocus] = useState(store.canvasFocus?.id ?? null);

  // Arriving with a new focus switches the surface to it, without losing context.
  if (store.canvasFocus && store.canvasFocus.id !== lastTouchedFocus) {
    setLastTouchedFocus(store.canvasFocus.id);
    setTab(focusTab);
  }

  return (
    <div style={shellStyle}>
      {/* ---- header: context + real save state + history ---- */}
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>Canvas · Composition</div>
          <div style={breadcrumbStyle}>
            {TABS.find((t) => t.id === tab)?.label}
            {store.canvasFocus && <span style={{ color: K.textMuted }}> → {focusLabel(store.canvasFocus)}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SaveIndicator />
          <button
            onClick={() => store.undo()}
            disabled={!store.canUndo()}
            title={store.undoLabel() ? `Annuler : ${store.undoLabel()}` : 'Rien à annuler'}
            style={historyBtnStyle(!store.canUndo())}
          >
            ↶
          </button>
          <button
            onClick={() => store.redo()}
            disabled={!store.canRedo()}
            title={store.redoLabel() ? `Rétablir : ${store.redoLabel()}` : 'Rien à rétablir'}
            style={historyBtnStyle(!store.canRedo())}
          >
            ↷
          </button>
          <button onClick={() => store.closeCanvas()} style={closeBtnStyle} aria-label="Fermer">✕</button>
        </div>
      </header>

      {/* ---- surface selector ---- */}
      <nav style={tabsStyle}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); store.setCanvasFocus(null); }}
            style={tabStyle(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div style={bodyStyle}>
        {tab === 'programme' && <ProgrammeSurface model={model} />}
        {tab === 'people' && <PeopleSurface model={model} />}
        {tab === 'vendors' && <VendorsSurface model={model} />}
        {tab === 'places' && <PlacesSurface model={model} />}
        {tab === 'music' && <MusicSurface model={model} />}
      </div>
    </div>
  );
}

function focusLabel(focus: { kind: string; id: string }): string {
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
function SaveIndicator() {
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
  ownerKind: 'person' | 'place' | 'vendor' | 'event' | 'song';
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
    if (file.size > 600 * 1024) {
      setError('Fichier trop lourd (max 600 Ko) : le stockage local est limité.');
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const asset = store.addMedia({
        kind: file.type.startsWith('image/') ? 'image' : 'document',
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
        <input type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files?.[0])} />
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
        return (
          <article key={sg.songId} style={{ ...canvasCard, padding: '14px 18px' }}>
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
          </article>
        );
      })}
    </div>
  );
}

// --- helpers / styles -------------------------------------------------------

function parseHour(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})\s*[:h]?\s*(\d{2})?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (Number.isNaN(h) || min > 59) return null;
  return h + min / 60;
}

const shellStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0,
  width: 'min(560px, 100vw)', zIndex: 850,
  background: K.bg, color: K.textPrimary,
  borderLeft: `1px solid ${K.lineStrong}`,
  boxShadow: shadowFor(4, 'world'),
  display: 'flex', flexDirection: 'column',
  fontFamily: typography.family.sans,
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  padding: '16px 18px 12px', borderBottom: `1px solid ${K.line}`,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: K.textMuted, fontWeight: 700,
};

const breadcrumbStyle: React.CSSProperties = {
  marginTop: 5, fontSize: typography.size.bodyLg, color: K.textPrimary,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const tabsStyle: React.CSSProperties = {
  display: 'flex', gap: 4, padding: '10px 14px', borderBottom: `1px solid ${K.line}`,
  overflowX: 'auto',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  font: 'inherit', fontSize: typography.size.caption, fontWeight: 600,
  border: 'none', borderRadius: radius.pill, padding: '6px 13px', cursor: 'pointer',
  whiteSpace: 'nowrap',
  background: active ? K.textPrimary : 'transparent',
  color: active ? K.surface : K.textSecondary,
});

const bodyStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '16px 18px 40px',
};

const closeBtnStyle: React.CSSProperties = {
  border: `1px solid ${K.line}`, background: K.surface, color: K.textSecondary,
  width: 28, height: 28, borderRadius: radius.pill, cursor: 'pointer', fontSize: 12,
};

const historyBtnStyle = (disabled: boolean): React.CSSProperties => ({
  border: `1px solid ${K.line}`, background: K.surface,
  color: disabled ? K.textMuted : K.textPrimary,
  width: 28, height: 28, borderRadius: radius.pill,
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, opacity: disabled ? 0.45 : 1,
});

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
