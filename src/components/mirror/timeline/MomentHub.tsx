import { useEffect, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { momentImage } from '../../../design/momentImagery';
import { extractDocumentFacts, suggestMoments, describeFacts, type MomentCandidate } from '../../../game/documentIntelligence';
import { formatHour } from './TimelineStudio';

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
            {formatHour(phase.startHour)} → {formatHour(phase.endHour)}
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

      {/* ---- when ---- */}
      <Dimension title="Heure" hint="Déplacer ici, ou glisser le bloc sur la pellicule.">
        <div style={row}>
          <ClockField
            label="Début"
            value={formatHour(phase.startHour)}
            onCommit={(h) => store.setPhaseTime(phase.id, h)}
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
        <Chips
          items={persons.map((p) => ({ id: p!.id, label: p!.displayName }))}
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
        <Chips
          items={vendors.map((v) => ({ id: v!.id, label: `${v!.companyName} · ${v!.category}` }))}
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

      {/* ---- music ---- */}
      <Dimension title="Musique" hint={tracks.length === 0 ? 'Aucun morceau lancé à ce moment.' : undefined}>
        <Chips
          items={tracks.map((t) => ({ id: t.id, label: `${t.title}${t.artist && t.artist !== '—' ? ' · ' + t.artist : ''}` }))}
          onRemove={(id) => store.detachTrackFromPhase(phase.id, id)}
        />
        <AddNew
          placeholder="Ajouter un morceau : titre — artiste"
          onSubmit={(value) => {
            const [title, artist] = value.split('—').map((s) => s.trim());
            const track = store.createTrack({ title: title || value, artist: artist || '—', phaseId: phase.id });
            if (track) store.attachTrackToPhase(phase.id, track.id);
          }}
          testId="hub-track-new"
        />
      </Dimension>

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
