import { useEffect, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { momentImage } from '../../../design/momentImagery';
import { extractDocumentFacts, suggestMoments, describeFacts, type MomentCandidate } from '../../../game/documentIntelligence';
import { formatHour, formatHourWithDay, normalizeNightHour } from './TimelineStudio';
import { TrackArt } from '../TrackArt';

// ---------------------------------------------------------------------------
// THE MOMENT IS A HUB.
// ---------------------------------------------------------------------------
// "19:30 — Dîner" is not a label: it is the place where the people, the
// vendors, the room, the music, the shots, the menu, the logistics, the money
// and the paperwork of that half-hour all live. Everything below writes
// straight into the store, on THIS moment, and nothing exists until someone
// types it.
//
// Deliberately not a settings page: no tabs, no wizard, no separate
// /documents route. One scroll, one moment, ten dimensions.
// ---------------------------------------------------------------------------

export function MomentHub({ phaseId, onClose }: { phaseId: string; onClose: () => void }) {
  const store = weddingStore;
  const hub = store.getPhaseHub(phaseId);
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Escape closes; the page behind must not scroll under the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  if (!hub) return null;
  const { phase, persons, vendors, tracks, tasks, media, place } = hub;

  const ownImage = media.find((m) => m.kind === 'image');
  const image = momentImage(phase.name, ownImage?.source);
  const duration = phase.endHour - phase.startHour;

  return (
    <div ref={surfaceRef} className="wc-hub" role="dialog" aria-modal="true" aria-label={`Moment ${phase.name}`} data-jourj="hub">
      {/* ---- cover ---- */}
      <div className="wc-hub-cover">
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} decoding="async" />
        <div style={coverScrim} />
        <button onClick={onClose} style={closeBtn} aria-label="Fermer le moment" data-jourj="hub-close">Fermer</button>
        <div style={coverText}>
          <div style={{ fontFamily: typography.family.mono, fontSize: 14, letterSpacing: '0.06em' }}>
            {formatHourWithDay(phase.startHour)} → {formatHourWithDay(phase.endHour)}
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4, overflowWrap: 'anywhere' }}>
            {phase.name}
          </div>
          {image.isProductAsset && (
            <div style={{ fontSize: 10, color: 'rgba(246,245,243,0.6)', marginTop: 6 }}>
              Image d’illustration du produit — vos photographies la remplaceront.
            </div>
          )}
        </div>
      </div>

      {/* ---- WHAT THIS MOMENT IS MISSING, AND WHAT TO DO ABOUT IT ----
             The state comes from phaseFindings(); the actions are shortcuts to
             functions that already exist elsewhere in the product. Nothing is
             re-implemented here — the point is that nobody should have to leave
             the moment to find them. */}
      <MomentState phaseId={phase.id} onClose={onClose} />

      {/* ---- when ---- */}
      <Dimension title="Heure" hint="Déplacer ici, ou glisser le bloc sur la pellicule.">
        <div style={row}>
          <ClockField
            label="Début"
            value={formatHour(phase.startHour)}
            onCommit={(h) => store.setPhaseTime(phase.id, normalizeNightHour(h, store.phases))}
            testId="hub-start"
          />
          <NumberField
            label="Durée (min)"
            value={Math.round(duration * 60)}
            onCommit={(m) => store.setPhaseDuration(phase.id, m / 60)}
            testId="hub-duration"
          />
        </div>
        <Inline
          value={phase.subtitle || ''}
          placeholder="Une phrase sur ce moment"
          onCommit={(v) => store.setPhaseSubtitle(phase.id, v)}
          testId="hub-subtitle"
        />
      </Dimension>

      {/* ---- where ---- */}
      <Dimension title="Lieu" hint={place ? undefined : 'Aucun lieu rattaché à ce moment.'}>
        <PlacePicker phaseId={phase.id} currentPlaceId={phase.primaryPlaceId} />
        {place && (
          <div style={{ ...muted, marginTop: 8 }}>
            {place.address || 'Adresse non renseignée'}
            {place.capacity ? ` · ${place.capacity} places` : ''}
          </div>
        )}
      </Dimension>

      {/* ---- who ---- */}
      <Dimension title="Personnes" hint={persons.length === 0 ? 'Personne n’est encore attendu à ce moment.' : undefined}>
        <PeopleRow
          persons={persons as { id: string; displayName: string; portraitMediaId?: string; craft?: { role: string } }[]}
          onRemove={(id) => store.detachPersonFromPhase(phase.id, id)}
        />
        <AddExisting
          placeholder="Ajouter une personne déjà connue"
          options={store.persons
            .filter((p) => !(phase.personIds ?? []).includes(p.id))
            .map((p) => ({ id: p.id, label: p.displayName }))}
          onPick={(id) => store.attachPersonToPhase(phase.id, id)}
          testId="hub-person-existing"
        />
        <AddNew
          placeholder="…ou créer une personne : Prénom Nom"
          onSubmit={(name) => {
            const person = store.createPerson({ displayName: name, asGuest: true, rsvp: 'pending' });
            if (person) store.attachPersonToPhase(phase.id, person.id);
          }}
          testId="hub-person-new"
        />
      </Dimension>

      {/* ---- with whom ---- */}
      <Dimension title="Prestataires" hint={vendors.length === 0 ? 'Aucun prestataire sur ce moment.' : undefined}>
        <VendorRow
          vendors={vendors as { id: string; companyName: string; category: string }[]}
          onRemove={(id) => store.detachVendorFromPhase(phase.id, id)}
        />
        <AddExisting
          placeholder="Ajouter un prestataire du mariage"
          options={store.vendors
            .filter((v) => !(phase.vendorIds ?? []).includes(v.id))
            .map((v) => ({ id: v.id, label: v.companyName }))}
          onPick={(id) => store.attachVendorToPhase(phase.id, id)}
          testId="hub-vendor-existing"
        />
        <AddNew
          placeholder="…ou créer un prestataire : nom de l’entreprise"
          onSubmit={(name) => {
            const vendor = store.createVendor({ companyName: name, category: 'autre' });
            if (vendor) store.attachVendorToPhase(phase.id, vendor.id);
          }}
          testId="hub-vendor-new"
        />
      </Dimension>

      {/* ---- music: a temporal layer of the moment ---- */}
      <MusicDimension phaseId={phase.id} />

      {/* ---- shots ---- */}
      <Dimension title="Photo / Vidéo" hint={(phase.shots ?? []).length === 0 ? 'Aucun plan demandé pour l’instant.' : undefined}>
        <ul style={list}>
          {(phase.shots ?? []).map((shot, i) => (
            <li key={`${shot}-${i}`} style={listItem}>
              <span>{shot}</span>
              <button onClick={() => store.removePhaseShot(phase.id, i)} style={linkBtn}>retirer</button>
            </li>
          ))}
        </ul>
        <AddNew
          placeholder="Plan indispensable : « les grands-parents avec les mariés »"
          onSubmit={(v) => store.addPhaseShot(phase.id, v)}
          testId="hub-shot-new"
        />
      </Dimension>

      {/* ---- meal ---- */}
      <Dimension title="Repas">
        <Inline
          value={phase.meal?.menu ?? ''}
          placeholder="Menu servi à ce moment"
          onCommit={(v) => store.setPhaseMeal(phase.id, { menu: v })}
          testId="hub-menu"
        />
        <div className="wc-hub-grid" style={{ marginTop: 8 }}>
          <Inline
            value={phase.meal?.allergies ?? ''}
            placeholder="Allergies et régimes"
            onCommit={(v) => store.setPhaseMeal(phase.id, { allergies: v })}
            testId="hub-allergies"
          />
          <Inline
            value={phase.meal?.headcount ? String(phase.meal.headcount) : ''}
            placeholder="Nombre de couverts"
            onCommit={(v) => store.setPhaseMeal(phase.id, { headcount: Number(v) })}
            testId="hub-headcount"
          />
        </div>
      </Dimension>

      {/* ---- logistics & tasks ---- */}
      <Dimension title="Logistique">
        <Inline
          value={phase.logistics ?? ''}
          placeholder="Installation, livraison, transport, heures d’arrivée…"
          multiline
          onCommit={(v) => store.setPhaseLogistics(phase.id, v)}
          testId="hub-logistics"
        />
        <ul style={{ ...list, marginTop: 10 }}>
          {tasks.map((t) => (
            <li key={t.id} style={listItem}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={t.isDone} onChange={() => store.toggleTaskDone(t.id)} />
                <span style={{ textDecoration: t.isDone ? 'line-through' : 'none' }}>{t.title}</span>
              </label>
              {t.cost ? <span style={muted}>{t.cost} €</span> : null}
            </li>
          ))}
        </ul>
        <AddNew
          placeholder="Ajouter une tâche pour ce moment"
          onSubmit={(v) => store.createTaskForPhase(phase.id, v)}
          testId="hub-task-new"
        />
      </Dimension>

      {/* ---- money ---- */}
      <Dimension title="Budget" hint={phase.budget ? undefined : 'Aucun montant saisi pour ce moment.'}>
        <div className="wc-hub-grid">
          <Inline
            value={phase.budget?.amount !== undefined ? String(phase.budget.amount) : ''}
            placeholder="Coût (€)"
            onCommit={(v) => store.setPhaseBudget(phase.id, { amount: Number(v) })}
            testId="hub-cost"
          />
          <Inline
            value={phase.budget?.deposit !== undefined ? String(phase.budget.deposit) : ''}
            placeholder="Acompte versé (€)"
            onCommit={(v) => store.setPhaseBudget(phase.id, { deposit: Number(v) })}
            testId="hub-deposit"
          />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(phase.budget?.paid)}
            onChange={(e) => store.setPhaseBudget(phase.id, { paid: e.target.checked })}
            data-jourj="hub-paid"
          />
          <span style={muted}>Soldé</span>
        </label>
      </Dimension>

      {/* ---- paperwork ---- */}
      <DocumentsDimension phaseId={phase.id} />

      {/* ---- notes ---- */}
      <Dimension title="Notes">
        <Inline
          value={phase.notes ?? ''}
          placeholder="Consignes, informations importantes, notes privées"
          multiline
          onCommit={(v) => store.setPhaseNotes(phase.id, v)}
          testId="hub-notes"
        />
      </Dimension>

      <div className="wc-hub-dim" style={{ paddingBottom: 40 }}>
        <button
          onClick={() => { if (store.deletePhase(phase.id)) onClose(); }}
          style={{ ...linkBtn, color: '#e0736a' }}
          data-jourj="hub-delete"
        >
          Supprimer ce moment
        </button>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// MUSIC — a track is a temporal object, not a line in a list.
// ---------------------------------------------------------------------------
// Real artwork when a real image is attached, a real Play control only when a
// real audio file exists (see TrackArt), and a real duration: if the music
// asked for exceeds the moment itself, the hub says so and offers to lengthen
// the moment — which then proposes to carry the rest of the day.
function MusicDimension({ phaseId }: { phaseId: string }) {
  const store = weddingStore;
  const hub = store.getPhaseHub(phaseId);
  if (!hub) return null;
  const { phase, tracks } = hub;

  const seconds = (d?: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec((d ?? '').trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  };
  const totalSeconds = tracks.reduce((acc, t) => acc + seconds(t.duration), 0);
  const momentSeconds = Math.round((phase.endHour - phase.startHour) * 3600);
  const overflow = totalSeconds > momentSeconds && totalSeconds > 0;

  const mediaFor = (songId: string, kind: 'image' | 'audio') =>
    store.media.find((m) => m.ownerKind === 'song' && m.ownerId === songId && m.kind === kind)?.source ?? null;

  return (
    <Dimension title="Musique" hint={tracks.length === 0 ? 'Aucun morceau lancé à ce moment.' : undefined}>
      <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
        {tracks.map((t) => (
          <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <TrackArt
              songId={t.id}
              title={t.title}
              artist={t.artist}
              coverSource={mediaFor(t.id, 'image')}
              audioSource={mediaFor(t.id, 'audio')}
              size={56}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: typography.editorial.caption, fontWeight: 600 }}>{t.title}</div>
              <div style={muted}>{t.artist && t.artist !== '—' ? t.artist : 'Artiste non renseigné'}</div>
              {/* No audio ⇒ no Play control, and the reason is written rather
                  than left as a missing button. */}
              {!mediaFor(t.id, 'audio') && (
                <div style={{ ...muted, marginTop: 2 }} data-jourj="hub-track-noaudio">
                  Aucun extrait audio : le bouton Écouter apparaîtra dès qu’un fichier sera importé.
                </div>
              )}
            </div>
            <div style={{ width: 78 }}>
              <Inline
                value={t.duration || ''}
                placeholder="3:45"
                onCommit={(v) => store.setTrackDuration(t.id, v)}
                testId="hub-track-duration"
              />
            </div>
            <button onClick={() => store.detachTrackFromPhase(phase.id, t.id)} style={linkBtn}>retirer</button>
          </div>
        ))}
      </div>

      {overflow && (
        <div style={analysisBox} data-jourj="hub-music-overflow">
          La bande-son de ce moment dure {Math.round(totalSeconds / 60)} minutes,
          le moment en dure {Math.round(momentSeconds / 60)}.
          <button
            onClick={() => store.setPhaseDuration(phase.id, totalSeconds / 3600)}
            style={{ ...smallBtn, marginTop: 10 }}
            data-jourj="hub-music-fit"
          >
            Allonger le moment à {Math.round(totalSeconds / 60)} min
          </button>
        </div>
      )}

      <AddNew
        placeholder="Ajouter un morceau : titre — artiste"
        onSubmit={(value) => {
          const [title, artist] = value.split('—').map((x) => x.trim());
          const track = store.createTrack({ title: title || value, artist: artist || '—', phaseId: phase.id });
          if (track) store.attachTrackToPhase(phase.id, track.id);
        }}
        testId="hub-track-new"
      />
    </Dimension>
  );
}

// ---------------------------------------------------------------------------
// PEOPLE — a face when there is a face, initials when there is not.
// ---------------------------------------------------------------------------
// A person is never an isolated card: opening one shows where they are in the
// day, who they work with and what is attached to them — all read from the
// same store, nothing invented.
function PeopleRow({ persons, onRemove }: {
  persons: { id: string; displayName: string; portraitMediaId?: string; craft?: { role: string } }[];
  onRemove: (id: string) => void;
}) {
  const store = weddingStore;
  const [open, setOpen] = useState<string | null>(null);
  if (persons.length === 0) return null;

  const portrait = (p: { portraitMediaId?: string }) =>
    p.portraitMediaId ? store.media.find((m) => m.id === p.portraitMediaId)?.source ?? null : null;
  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const openPerson = open ? persons.find((p) => p.id === open) : null;
  const connections = openPerson ? {
    moments: store.phases.filter((ph) => (ph.personIds ?? []).includes(openPerson.id)),
    guest: store.guests.find((g) => g.personId === openPerson.id) ?? null,
    media: store.media.filter((m) => m.ownerKind === 'person' && m.ownerId === openPerson.id),
    relationships: store.relationships.filter((r) => r.fromPersonId === openPerson.id || r.toPersonId === openPerson.id),
  } : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {persons.map((p) => {
          const src = portrait(p);
          return (
            <button
              key={p.id}
              onClick={() => setOpen(open === p.id ? null : p.id)}
              style={personChip}
              data-jourj="hub-person-chip"
              title={`Voir les liens de ${p.displayName}`}
            >
              {src
                ? <img src={src} alt="" width={28} height={28} style={avatarImg} />
                : <span style={avatarInitials} aria-hidden>{initials(p.displayName)}</span>}
              <span>
                {p.displayName}
                {/* Who is here to WORK, and at what. */}
                {p.craft?.role && <span style={{ ...muted, marginLeft: 6 }}>· {p.craft.role}</span>}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onRemove(p.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRemove(p.id); } }}
                style={chipX}
                aria-label={`Retirer ${p.displayName}`}
              >
                ×
              </span>
            </button>
          );
        })}
      </div>

      {openPerson && connections && (
        <div style={analysisBox} data-jourj="hub-person-links">
          <div style={{ fontWeight: 600 }}>{openPerson.displayName}</div>
          <div style={{ ...muted, marginTop: 8 }}>
            {connections.moments.length > 0
              ? `Présent·e à ${connections.moments.length} moment${connections.moments.length > 1 ? 's' : ''} : `
                + connections.moments.map((m) => `${formatHour(m.startHour)} ${m.name}`).join(' · ')
              : 'Rattaché·e à aucun autre moment pour l’instant.'}
          </div>
          <div style={{ ...muted, marginTop: 6 }}>
            {connections.guest?.seating?.tableId
              ? `Table : ${store.seatingTables.find((t) => t.id === connections.guest!.seating.tableId)?.label ?? '—'}`
              : 'Aucune table attribuée.'}
          </div>
          <div style={{ ...muted, marginTop: 6 }}>
            {connections.media.length > 0
              ? `${connections.media.length} média rattaché${connections.media.length > 1 ? 's' : ''}.`
              : 'Aucune photo rattachée à cette personne.'}
          </div>
          <div style={{ ...muted, marginTop: 6 }}>
            {connections.relationships.length > 0
              ? `${connections.relationships.length} relation${connections.relationships.length > 1 ? 's' : ''} déclarée${connections.relationships.length > 1 ? 's' : ''}.`
              : 'Aucune relation déclarée.'}
          </div>
        </div>
      )}
    </>
  );
}

/** A vendor shows the moments they really cover, so they are never a card. */
function VendorRow({ vendors, onRemove }: {
  vendors: { id: string; companyName: string; category: string }[];
  onRemove: (id: string) => void;
}) {
  const store = weddingStore;
  if (vendors.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
      {vendors.map((v) => {
        const covers = store.phases
          .filter((p) => (p.vendorIds ?? []).includes(v.id))
          .sort((a, b) => a.startHour - b.startHour);
        return (
          <div key={v.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={avatarInitials} aria-hidden>{v.companyName.slice(0, 2).toUpperCase()}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: typography.editorial.caption, fontWeight: 600 }}>
                {v.companyName} <span style={{ ...muted, fontWeight: 400 }}>· {v.category}</span>
              </div>
              <div style={muted}>
                {covers.length > 0
                  ? `${formatHour(covers[0].startHour)} — ${formatHour(covers[covers.length - 1].endHour)} · `
                    + covers.map((c) => c.name).join(', ')
                  : 'Aucun moment couvert.'}
              </div>
            </div>
            <button onClick={() => onRemove(v.id)} style={linkBtn}>retirer</button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DOCUMENTS — a file lands ON a moment, and says what it contains.
// ---------------------------------------------------------------------------
function DocumentsDimension({ phaseId }: { phaseId: string }) {
  const store = weddingStore;
  const media = store.media.filter((m) => m.ownerKind === 'event' && m.ownerId === phaseId);
  const [reading, setReading] = useState(false);
  const [analysis, setAnalysis] = useState<null | {
    mediaId: string; fileName: string; summary: string; candidates: MomentCandidate[];
  }>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setReading(true);
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const source = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
      const asset = store.addMedia({
        kind: isImage ? 'image' : 'document',
        source,
        ownerKind: 'event',
        ownerId: phaseId,
        title: file.name,
        fileName: file.name,
        byteSize: file.size,
      });
      if (!asset) continue;

      // What can really be read here: plain text, plus the file name.
      let text = file.name;
      if (file.type.startsWith('text/') || /\.(txt|md|csv|ics)$/i.test(file.name)) {
        text += '\n' + await file.text();
      }
      const facts = extractDocumentFacts(text);
      const candidates = suggestMoments(
        facts,
        text,
        store.phases.map((p) => ({ id: p.id, name: p.name, startHour: p.startHour, endHour: p.endHour })),
      ).filter((c) => c.phaseId !== phaseId);
      setAnalysis({ mediaId: asset.id, fileName: file.name, summary: describeFacts(facts), candidates });
    }
    setReading(false);
  };

  return (
    <Dimension title="Documents" hint={media.length === 0 ? 'Aucun document rattaché à ce moment.' : undefined}>
      <ul style={list}>
        {media.map((m) => (
          <li key={m.id} style={listItem}>
            <span>
              {m.kind === 'image' ? '🖼' : '📄'} {m.title || m.fileName || 'Document'}
              {m.byteSize ? <span style={muted}> · {Math.max(1, Math.round(m.byteSize / 1024))} ko</span> : null}
            </span>
            <button onClick={() => store.removeMedia(m.id)} style={linkBtn}>retirer</button>
          </li>
        ))}
      </ul>

      <label style={{ ...fileBtn, opacity: reading ? 0.6 : 1 }}>
        {reading ? 'Lecture…' : '+ Importer un document'}
        <input
          type="file"
          multiple
          onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }}
          style={{ display: 'none' }}
          data-jourj="hub-file"
        />
      </label>

      {analysis && (
        <div style={analysisBox} data-jourj="hub-analysis">
          <div style={{ fontWeight: 600 }}>{analysis.fileName}</div>
          <div style={{ ...muted, marginTop: 6 }}>{analysis.summary}</div>
          {analysis.candidates.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              {analysis.candidates.map((c) => (
                <div key={c.phaseId} style={{ marginTop: 8 }}>
                  <div style={muted}>{c.reason}</div>
                  <button
                    onClick={() => {
                      store.attachMediaToPhase(analysis.mediaId, c.phaseId);
                      setAnalysis(null);
                    }}
                    style={{ ...smallBtn, marginTop: 6 }}
                    data-jourj="hub-analysis-move"
                  >
                    Rattacher plutôt à « {c.label} »
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...muted, marginTop: 8 }}>
              Aucun autre moment ne semble concerné : le document reste sur celui-ci.
            </div>
          )}
          <button onClick={() => setAnalysis(null)} style={{ ...linkBtn, marginTop: 10 }}>
            Garder sur ce moment
          </button>
        </div>
      )}
    </Dimension>
  );
}

/**
 * THE STATE OF A SCENE — and the shortest path out of each gap.
 *
 * Reads store.phaseFindings(): one derived truth, shown here in full and
 * summarised on the card. A « ⚠ contrat absent » line carries the button that
 * produces the contract, because the product already knows the event, the date,
 * the place, the hours and the person: asking the user to type them again would
 * be asking them to do the product's job.
 */
function MomentState({ phaseId, onClose }: { phaseId: string; onClose: () => void }) {
  const store = weddingStore;
  const [generated, setGenerated] = useState<{ title: string } | null>(null);
  const findings = store.phaseFindings(phaseId);
  const gaps = findings.filter((f) => f.level !== 'ok');
  const oks = findings.filter((f) => f.level === 'ok');

  const generate = (docKind: string, personId?: string, vendorId?: string) => {
    const person = personId ? store.persons.find((p) => p.id === personId) : null;
    const vendor = vendorId ? store.vendors.find((v) => v.id === vendorId) : null;
    const recipientName = person?.displayName ?? vendor?.companyName ?? '';
    if (!recipientName) return;
    const asset = store.generateAdminDocument({
      docKind,
      authorKind: 'Organisation de l’événement',
      recipientKind: person ? 'Artiste / prestataire' : 'Prestataire',
      recipientName,
      personId: personId,
      phaseId,
    });
    if (asset) setGenerated({ title: asset.title || docKind });
  };

  return (
    <Dimension title="État de ce moment">
      <ul style={list} data-jourj="hub-state">
        {gaps.map((f, i) => (
          <li key={`gap-${i}`} style={{ ...stateRow, borderLeftColor: f.level === 'conflict' ? '#e0736a' : '#e0a06a' }} data-jourj="hub-state-line" data-level={f.level}>
            <div>
              <strong>⚠ {f.title}</strong>
              <div style={{ ...muted, marginTop: 3 }}>{f.detail}</div>
            </div>
            {f.docKind && (
              <button
                onClick={() => generate(f.docKind!, f.personId, f.vendorId)}
                style={smallBtn}
                data-jourj="hub-generate-missing"
              >
                Générer {f.docKind.toLowerCase()}
              </button>
            )}
          </li>
        ))}
        {oks.map((f, i) => (
          <li key={`ok-${i}`} style={{ ...stateRow, borderLeftColor: 'rgba(169,198,162,0.7)' }} data-jourj="hub-state-line" data-level="ok">
            <div>
              <strong>✓ {f.title}</strong>
              <div style={{ ...muted, marginTop: 3 }}>{f.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      {generated && (
        <div style={analysisBox} data-jourj="hub-generated">
          <div style={{ fontWeight: 600 }}>{generated.title}</div>
          <div style={{ ...muted, marginTop: 6 }}>
            Document produit à partir de ce que le projet sait réellement, et rangé
            dans ses documents. Tout ce que le projet ignore y est écrit
            « À CONFIRMER » : rien n’a été deviné à votre place.
          </div>
        </div>
      )}

      {/* THE ACTIONS OF A MOMENT. Each one leads to a function that already
          exists; none of them is a new engine. */}
      <div style={actionRail} data-jourj="hub-actions">
        <GenerateHere phaseId={phaseId} onGenerated={(t) => setGenerated({ title: t })} />
        <button
          onClick={() => {
            const title = window.prompt('Quelle tâche pour ce moment ?');
            if (title?.trim()) store.createTaskForPhase(phaseId, title.trim());
          }}
          style={smallBtn}
          data-jourj="hub-action-task"
        >
          Créer une tâche
        </button>
        <button
          onClick={() => {
            const phase = store.phases.find((p) => p.id === phaseId);
            const scenario = store.createScenario(`Plan B — ${phase?.name ?? 'ce moment'}`);
            if (scenario) store.setActiveScenario(scenario.id);
            onClose();
            document.getElementById('organisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          style={smallBtn}
          data-jourj="hub-action-planb"
        >
          Créer un plan B
        </button>
      </div>
    </Dimension>
  );
}

/**
 * « QUE VOULEZ-VOUS GÉNÉRER ? », asked where the context already answers most
 * of it. The recipient is chosen among the people and vendors of THIS moment —
 * never typed from scratch, never invented.
 */
function GenerateHere({ phaseId, onGenerated }: { phaseId: string; onGenerated: (title: string) => void }) {
  const store = weddingStore;
  const [open, setOpen] = useState(false);
  const [docKind, setDocKind] = useState('Contrat');
  const [target, setTarget] = useState('');
  const hub = store.getPhaseHub(phaseId);
  if (!hub) return null;

  const targets = [
    ...hub.persons.filter(Boolean).map((p) => ({ id: `person:${p!.id}`, label: p!.displayName })),
    ...hub.vendors.filter(Boolean).map((v) => ({ id: `vendor:${v!.id}`, label: v!.companyName })),
  ];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={smallBtn} data-jourj="hub-action-generate">
        Générer un document
      </button>
    );
  }

  return (
    <div style={generateBox} data-jourj="hub-generate-box">
      <select value={docKind} onChange={(e) => setDocKind(e.target.value)} style={select} data-jourj="hub-generate-kind">
        {['Contrat', 'Devis', 'Facture', 'Fiche technique', 'Feuille de route', 'Convention'].map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <select value={target} onChange={(e) => setTarget(e.target.value)} style={select} data-jourj="hub-generate-target">
        <option value="">Pour qui ?</option>
        {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <button
        onClick={() => {
          const [kind, id] = target.split(':');
          if (!id) return;
          const person = kind === 'person' ? store.persons.find((p) => p.id === id) : null;
          const vendor = kind === 'vendor' ? store.vendors.find((v) => v.id === id) : null;
          const asset = store.generateAdminDocument({
            docKind,
            authorKind: 'Organisation de l’événement',
            recipientKind: person ? 'Artiste / prestataire' : 'Prestataire',
            recipientName: person?.displayName ?? vendor?.companyName ?? '',
            personId: person?.id,
            phaseId,
          });
          if (asset) { onGenerated(asset.title || docKind); setOpen(false); }
        }}
        style={smallBtn}
        data-jourj="hub-generate-run"
      >
        Générer
      </button>
      <button onClick={() => setOpen(false)} style={linkBtn}>annuler</button>
      {targets.length === 0 && (
        <div style={{ ...muted, width: '100%' }}>
          Personne n’est rattaché à ce moment : un document sans destinataire réel
          ne sera pas produit.
        </div>
      )}
    </div>
  );
}

// --- small building blocks ---------------------------------------------------

function Dimension({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="wc-hub-dim">
      <div style={dimTitle}>{title}</div>
      {hint && <div style={{ ...muted, marginBottom: 10 }}>{hint}</div>}
      {children}
    </section>
  );
}

function Inline({ value, placeholder, onCommit, multiline, testId }: {
  value: string; placeholder: string; onCommit: (v: string) => void; multiline?: boolean; testId?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const shared = {
    value: draft,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: () => { if (draft !== value) onCommit(draft); },
    style: { ...field, minHeight: multiline ? 76 : undefined },
    'data-jourj': testId,
  };
  return multiline
    ? <textarea {...shared} />
    : <input {...shared} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
}

function ClockField({ label, value, onCommit, testId }: {
  label: string; value: string; onCommit: (h: number) => void; testId?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => {
    const m = /^(\d{1,2})\s*[:h]\s*(\d{2})?$/.exec(draft.trim());
    if (!m) { setDraft(value); return; }
    onCommit(Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0));
  };
  return (
    <label style={{ display: 'grid', gap: 6, flex: 1 }}>
      <span style={muted}>{label}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ ...field, fontFamily: typography.family.mono }}
        data-jourj={testId}
      />
    </label>
  );
}

function NumberField({ label, value, onCommit, testId }: {
  label: string; value: number; onCommit: (n: number) => void; testId?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <label style={{ display: 'grid', gap: 6, flex: 1 }}>
      <span style={muted}>{label}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { const n = Number(draft); if (Number.isFinite(n) && n > 0) onCommit(n); else setDraft(String(value)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ ...field, fontFamily: typography.family.mono }}
        data-jourj={testId}
      />
    </label>
  );
}

function Chips({ items, onRemove }: { items: { id: string; label: string }[]; onRemove: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
      {items.map((i) => (
        <span key={i.id} style={chip}>
          {i.label}
          <button onClick={() => onRemove(i.id)} style={chipX} aria-label={`Retirer ${i.label}`}>×</button>
        </span>
      ))}
    </div>
  );
}

function AddExisting({ placeholder, options, onPick, testId }: {
  placeholder: string; options: { id: string; label: string }[]; onPick: (id: string) => void; testId?: string;
}) {
  if (options.length === 0) return null;
  return (
    <select
      value=""
      onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
      style={{ ...field, marginBottom: 8 }}
      data-jourj={testId}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

function AddNew({ placeholder, onSubmit, testId }: {
  placeholder: string; onSubmit: (value: string) => void; testId?: string;
}) {
  const [draft, setDraft] = useState('');
  const submit = () => { const v = draft.trim(); if (!v) return; onSubmit(v); setDraft(''); };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder={placeholder}
        style={{ ...field, flex: 1 }}
        data-jourj={testId}
      />
      <button onClick={submit} style={smallBtn} data-jourj={testId ? `${testId}-submit` : undefined}>Ajouter</button>
    </div>
  );
}

function PlacePicker({ phaseId, currentPlaceId }: { phaseId: string; currentPlaceId: string }) {
  const store = weddingStore;
  const [draft, setDraft] = useState('');
  return (
    <>
      <select
        value={currentPlaceId || ''}
        onChange={(e) => store.setPhasePlace(phaseId, e.target.value || null)}
        style={field}
        data-jourj="hub-place-select"
      >
        <option value="">Aucun lieu</option>
        {store.places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !draft.trim()) return;
            const place = store.createPlace({ name: draft.trim() });
            if (place) { store.setPhasePlace(phaseId, place.id); setDraft(''); }
          }}
          placeholder="…ou créer un lieu : domaine, salle, adresse"
          style={{ ...field, flex: 1 }}
          data-jourj="hub-place-new"
        />
        <button
          onClick={() => {
            if (!draft.trim()) return;
            const place = store.createPlace({ name: draft.trim() });
            if (place) { store.setPhasePlace(phaseId, place.id); setDraft(''); }
          }}
          style={smallBtn}
          data-jourj="hub-place-new-submit"
        >
          Ajouter
        </button>
      </div>
    </>
  );
}

// --- styles ------------------------------------------------------------------

const coverScrim: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'linear-gradient(180deg, rgba(8,9,11,0.35) 0%, rgba(8,9,11,0.85) 100%)',
};

const coverText: React.CSSProperties = { position: 'absolute', left: 22, right: 22, bottom: 18, color: '#f6f5f3' };

const closeBtn: React.CSSProperties = {
  position: 'absolute', top: 14, right: 16, appearance: 'none', cursor: 'pointer',
  background: 'rgba(8,9,11,0.6)', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.3)', borderRadius: 999,
  padding: '7px 14px', fontSize: typography.editorial.micro, fontFamily: typography.family.sans,
};

const dimTitle: React.CSSProperties = {
  fontSize: typography.editorial.micro, letterSpacing: '0.18em', textTransform: 'uppercase',
  fontWeight: typography.weight.bold, color: 'rgba(246,245,243,0.55)', marginBottom: 10,
};

const muted: React.CSSProperties = { fontSize: typography.editorial.caption, color: 'rgba(246,245,243,0.62)' };

const field: React.CSSProperties = {
  width: '100%', background: '#101114', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.16)', borderRadius: 4,
  padding: '10px 12px', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans, outline: 'none', boxSizing: 'border-box',
};

const row: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 10 };

const list: React.CSSProperties = { listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'grid', gap: 8 };

const listItem: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center',
  fontSize: typography.editorial.caption, color: '#f6f5f3',
};

const personChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  border: '1px solid rgba(246,245,243,0.2)', borderRadius: 999,
  padding: '4px 8px 4px 4px', fontSize: typography.editorial.micro,
  color: '#f6f5f3', background: 'transparent', cursor: 'pointer',
  fontFamily: typography.family.sans,
};

const avatarImg: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block',
};

/** No photograph is invented: initials, drawn as a real object. */
const avatarInitials: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', flex: 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(246,245,243,0.12)', color: '#f6f5f3',
  fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
};

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: '1px solid rgba(246,245,243,0.2)', borderRadius: 999,
  padding: '6px 8px 6px 12px', fontSize: typography.editorial.micro, color: '#f6f5f3',
};

const chipX: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'rgba(246,245,243,0.6)', fontSize: 14, lineHeight: 1, padding: '0 2px',
};

const smallBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: '#f6f5f3', color: '#08090b',
  border: 'none', borderRadius: 4, padding: '9px 14px',
  fontSize: typography.editorial.micro, fontWeight: typography.weight.semibold,
  fontFamily: typography.family.sans, whiteSpace: 'nowrap',
};

const linkBtn: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'rgba(246,245,243,0.6)', fontSize: typography.editorial.micro,
  fontFamily: typography.family.sans, textDecoration: 'underline', padding: 0,
};

const fileBtn: React.CSSProperties = {
  display: 'inline-block', cursor: 'pointer',
  border: '1px dashed rgba(246,245,243,0.3)', borderRadius: 4,
  padding: '10px 14px', fontSize: typography.editorial.caption, color: '#f6f5f3',
};

const analysisBox: React.CSSProperties = {
  marginTop: 12, padding: 14, borderRadius: 4,
  border: '1px solid rgba(246,245,243,0.18)', background: '#101114',
  fontSize: typography.editorial.caption, color: '#f6f5f3',
};

const stateRow: React.CSSProperties = {
  display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between',
  borderLeft: '2px solid', paddingLeft: 12, flexWrap: 'wrap',
};

const actionRail: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, alignItems: 'center',
};

const generateBox: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
};

const select: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: 'rgba(246,245,243,0.06)', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '8px 14px', fontSize: 12, fontFamily: typography.family.sans,
};
