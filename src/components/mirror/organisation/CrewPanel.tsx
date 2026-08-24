import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { IconAlert } from '../../ui/Icons';

// ---------------------------------------------------------------------------
// ÉQUIPE DU JOUR — ceux qui donnent vie au moment.
// ---------------------------------------------------------------------------
// A performer is a Person with a craft (see docs/AUDIT-SPECTACLE.md): no second
// directory, no parallel storage. This surface does three things and nothing
// else:
//
//   · give a craft to someone who already exists in the day;
//   · show « MA JOURNÉE » — their road map, DERIVED from the timeline, so a
//     moment moved half an hour ago is already reflected here;
//   · say what is missing or contradictory, from the real data.
//
// Nothing administrative is invented: an undeclared fee stays empty, an
// undeclared setup time produces no arrival row.
// ---------------------------------------------------------------------------

const clock = (h: number) => {
  const t = Math.round(h * 60);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export function CrewPanel() {
  const store = weddingStore;
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftRole, setDraftRole] = useState('');

  const crew = store.getCrew();
  const findings = store.crewFindings();
  const openSheet = openId ? store.getCallSheet(openId) : null;

  const addCrew = () => {
    const name = draftName.trim();
    const role = draftRole.trim();
    if (!name || !role) return;
    const existing = store.persons.find((p) => p.displayName.toLowerCase() === name.toLowerCase());
    const person = existing ?? store.createPerson({ displayName: name, asGuest: false });
    if (!person) return;
    store.setPersonCraft(person.id, { role });
    setDraftName('');
    setDraftRole('');
    setOpenId(person.id);
  };

  return (
    <div data-crew="panel">
      <p style={muted}>
        Artistes, techniciens, régie : les personnes qui font la journée. Chacune
        garde sa propre feuille de route, calculée depuis la pellicule — jamais
        recopiée, donc jamais périmée.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Prénom Nom"
          style={{ ...field, flex: '1 1 200px' }}
          data-crew="new-name"
        />
        <input
          value={draftRole}
          onChange={(e) => setDraftRole(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCrew(); }}
          placeholder="Métier — saxophoniste, technicienne lumière, régisseur…"
          style={{ ...field, flex: '1 1 240px' }}
          data-crew="new-role"
        />
        <button onClick={addCrew} style={btn} data-crew="new-submit">Ajouter à l’équipe</button>
      </div>

      {crew.length === 0 ? (
        <p style={{ ...muted, marginTop: 16 }} data-crew="empty">
          Aucun artiste ni technicien pour l’instant. Personne n’est inventé :
          ajoutez celles et ceux qui travailleront réellement ce jour-là.
        </p>
      ) : (
        <div style={{ marginTop: 20 }}>
          <div style={countRow} data-crew="counts">
            {[
              { label: 'artistes', n: crew.filter((p) => /music|chant|danse|saxo|dj|artist|comédien|performer|circa/i.test(p.craft!.role)).length },
              { label: 'techniciens', n: crew.filter((p) => /techn|lumi|son|régie|regie|scéno|sceno|vidéa|videa|stage/i.test(p.craft!.role)).length },
              { label: 'au total', n: crew.length },
            ].map((c) => (
              <span key={c.label} style={countChip}>
                <strong style={{ fontFamily: typography.family.mono, fontSize: 20 }}>{c.n}</strong> {c.label}
              </span>
            ))}
          </div>

          <ul style={list} data-crew="list">
            {crew.map((person) => {
              const moments = store.phases.filter((p) => (p.personIds ?? []).includes(person.id));
              return (
                <li key={person.id} style={row} data-crew="member">
                  <button
                    onClick={() => setOpenId(openId === person.id ? null : person.id)}
                    style={memberBtn}
                    data-crew="open"
                    data-person-id={person.id}
                  >
                    <span style={avatar} aria-hidden>
                      {person.displayName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                    </span>
                    <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>
                        {person.displayName} <span style={mutedInline}>· {person.craft!.role}</span>
                      </span>
                      <span style={mutedInline}>
                        {person.craft!.status ? `${person.craft!.status} · ` : ''}
                        {moments.length > 0
                          ? moments.map((m) => `${clock(m.startHour)} ${m.name}`).join(' · ')
                          : 'aucun moment'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ---- MA JOURNÉE — the road map, derived ---- */}
      {openSheet && (
        <div style={sheet} data-crew="callsheet">
          <div style={{ ...eyebrow, marginBottom: 6 }}>Ma journée</div>
          <div style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 600 }}>
            {openSheet.person.displayName}
          </div>
          <div style={{ ...mutedInline, marginBottom: 14 }}>
            {openSheet.person.craft?.role}
            {openSheet.person.craft?.status ? ` · ${openSheet.person.craft.status}` : ''}
            {store.currentProject.locationName ? ` · ${store.currentProject.locationName}` : ''}
          </div>

          {openSheet.rows.length === 0 ? (
            <p style={muted} data-crew="callsheet-empty">
              Cette personne n’est rattachée à aucun moment : sa feuille de route
              est vide, et rien n’a été inventé pour la remplir.
            </p>
          ) : (
            <ol style={{ ...list, marginTop: 0 }} data-crew="callsheet-rows">
              {openSheet.rows.map((r, i) => (
                <li key={`${r.hour}-${i}`} style={sheetRow} data-crew="callsheet-row">
                  <span style={sheetHour}>{clock(r.hour)}</span>
                  <span>{r.label}</span>
                  {r.placeName && <span style={mutedInline}>{r.placeName}</span>}
                </li>
              ))}
            </ol>
          )}

          {/* the professional information, all optional */}
          <div style={grid}>
            <Craft label="Spécialité" value={openSheet.person.craft?.speciality ?? ''} tag="speciality"
              onCommit={(v) => store.setPersonCraft(openSheet.person.id, { speciality: v })} />
            <Craft label="Statut" value={openSheet.person.craft?.status ?? ''} tag="status"
              placeholder="Intermittent du spectacle, indépendant…"
              onCommit={(v) => store.setPersonCraft(openSheet.person.id, { status: v })} />
            <Craft label="Installation (min)" value={openSheet.person.craft?.setupMinutes ? String(openSheet.person.craft.setupMinutes) : ''} tag="setup"
              onCommit={(v) => store.setPersonCraft(openSheet.person.id, { setupMinutes: Number(v) || undefined })} />
            <Craft label="Démontage (min)" value={openSheet.person.craft?.teardownMinutes ? String(openSheet.person.craft.teardownMinutes) : ''} tag="teardown"
              onCommit={(v) => store.setPersonCraft(openSheet.person.id, { teardownMinutes: Number(v) || undefined })} />
            {/* WHAT IS NOT EVERYONE'S BUSINESS. A fee is a negotiation between
                the person who books and the person who plays; a guest or a
                viewer of the day has no reason to read it. The question is
                asked of the permission model that already exists, not of a new
                one. */}
            {store.isOrchestrator() && (
              <Craft label="Cachet / tarif" value={openSheet.person.craft?.fee ?? ''} tag="fee"
                placeholder="tel que négocié"
                onCommit={(v) => store.setPersonCraft(openSheet.person.id, { fee: v })} />
            )}
            <Craft label="Zone" value={openSheet.person.craft?.zone ?? ''} tag="zone"
              onCommit={(v) => store.setPersonCraft(openSheet.person.id, { zone: v })} />
          </div>

          {/* ---- getting there and back — administration, not the day ---- */}
          {store.isOrchestrator() && (
          <div style={{ marginTop: 18 }}>
            <div style={eyebrow}>Déplacement et hébergement</div>
            <div style={grid}>
              {([
                ['from', 'Départ'], ['arrival', 'Arrivée'], ['transport', 'Transport'],
                ['shuttle', 'Navette'], ['hotel', 'Hébergement'], ['departure', 'Retour'],
              ] as const).map(([key, label]) => (
                <Craft
                  key={key}
                  label={label}
                  tag={`travel-${key}`}
                  value={openSheet.person.craft?.travel?.[key] ?? ''}
                  onCommit={(v) => store.setPersonTravel(openSheet.person.id, { [key]: v })}
                />
              ))}
            </div>
            <p style={{ ...muted, marginTop: 8 }}>
              Champs libres : rien n’est réservé, aucun numéro de vol n’est deviné.
            </p>
          </div>
          )}

          {/* ---- missions delegated about this person ---- */}
          <Missions personId={openSheet.person.id} personName={openSheet.person.displayName} />

          {/* ---- who could replace them ---- */}
          <Replacements personId={openSheet.person.id} />

          <div style={{ marginTop: 16 }}>
            <div style={eyebrow}>Besoins techniques</div>
            {(openSheet.person.craft?.requirements ?? []).length === 0 ? (
              <p style={{ ...muted, marginTop: 6 }}>
                Rien de déclaré — donc rien ne peut être vérifié.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {(openSheet.person.craft!.requirements ?? []).map((req, i) => (
                  <span key={`${req}-${i}`} style={chip}>
                    {req}
                    <button
                      onClick={() => store.removeCraftRequirement(openSheet.person.id, i)}
                      style={chipX}
                      aria-label={`Retirer ${req}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <AddRequirement personId={openSheet.person.id} />
          </div>
        </div>
      )}

      {/* ---- the same person, in another event ---- */}
      <CrossEvents />

      {/* ---- produce a document from what the project knows ---- */}
      <DocumentDesk />

      {/* ---- what the crew makes visible ---- */}
      {findings.length > 0 && (
        <ul style={{ ...list, marginTop: 22 }} data-crew="findings">
          {findings.slice(0, 8).map((f, i) => (
            <li
              key={`${f.personId}-${i}`}
              style={{ ...row, paddingLeft: 12, borderLeft: `2px solid ${f.level === 'conflict' ? '#e0736a' : 'rgba(246,245,243,0.3)'}` }}
              data-crew="finding"
              data-level={f.level}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                {f.level === 'conflict' && <IconAlert size={13} color="currentColor" />}
                {f.title}
              </span>
              <span style={mutedInline}>{f.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Missions: a task with someone on it, and a state everyone can read. */
function Missions({ personId, personName }: { personId: string; personName: string }) {
  const store = weddingStore;
  const [draft, setDraft] = useState('');
  const missions = store.getMissionsFor(personId);
  const LABEL: Record<string, string> = {
    todo: 'à faire', doing: 'en cours', to_confirm: 'à confirmer', done: 'validé', blocked: 'bloqué',
  };

  return (
    <div style={{ marginTop: 18 }} data-crew="missions">
      <div style={eyebrow}>Missions déléguées</div>
      {missions.length === 0 ? (
        <p style={{ ...muted, marginTop: 6 }}>Aucune mission confiée à {personName}.</p>
      ) : (
        <ul style={{ ...list, marginTop: 10 }}>
          {missions.map((m) => (
            <li key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }} data-crew="mission">
              <span style={{ flex: '1 1 200px' }}>{m.title}</span>
              <select
                value={m.status ?? 'todo'}
                onChange={(e) => store.setMissionStatus(m.id, e.target.value as 'todo')}
                style={{ ...field, width: 150 }}
                data-crew="mission-status"
              >
                {Object.entries(LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !draft.trim()) return;
            store.createMission({ title: draft.trim(), assignedPersonId: personId });
            setDraft('');
          }}
          placeholder={`Confier une vérification à ${personName}…`}
          style={{ ...field, flex: 1 }}
          data-crew="mission-new"
        />
        <button
          onClick={() => { if (draft.trim()) { store.createMission({ title: draft.trim(), assignedPersonId: personId }); setDraft(''); } }}
          style={smallBtn}
          data-crew="mission-submit"
        >
          Déléguer
        </button>
      </div>
    </div>
  );
}

/** « Et si l’artiste n’était plus disponible ? » — a proposal, never a swap. */
function Replacements({ personId }: { personId: string }) {
  const store = weddingStore;
  const [open, setOpen] = useState(false);
  const options = open ? store.findReplacements(personId) : [];
  return (
    <div style={{ marginTop: 18 }} data-crew="replacements">
      <div style={eyebrow}>Et si cette personne n’était plus disponible ?</div>
      <button onClick={() => setOpen(!open)} style={{ ...smallBtn, marginTop: 8 }} data-crew="replacements-open">
        {open ? 'Masquer' : 'Chercher un remplaçant'}
      </button>
      {open && (
        options.length === 0 ? (
          <p style={{ ...muted, marginTop: 8 }} data-crew="replacements-empty">
            Personne d’autre n’exerce ce métier dans cet événement. Le produit ne
            propose que des personnes qui existent réellement ici.
          </p>
        ) : (
          <ul style={{ ...list, marginTop: 10 }} data-crew="replacements-list">
            {options.map((o) => (
              <li key={o.person.id} style={row}>
                <span style={{ fontWeight: 600 }}>{o.person.displayName}</span>
                <span style={mutedInline}>{o.reason}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/** The same name, working somewhere else on the same day. */
function CrossEvents() {
  const store = weddingStore;
  const [checked, setChecked] = useState(false);
  const conflicts = checked ? store.crossEventConflicts() : [];
  return (
    <div style={{ marginTop: 24 }} data-crew="crossevents">
      <div style={eyebrow}>Plusieurs événements</div>
      <button onClick={() => setChecked(true)} style={{ ...smallBtn, marginTop: 8 }} data-crew="crossevents-run">
        Vérifier les autres événements
      </button>
      {checked && (
        conflicts.length === 0 ? (
          <p style={{ ...muted, marginTop: 8 }} data-crew="crossevents-empty">
            Aucune double réservation détectée le même jour dans vos autres
            événements.
          </p>
        ) : (
          <ul style={{ ...list, marginTop: 10 }} data-crew="crossevents-list">
            {conflicts.map((c, i) => (
              <li key={i} style={{ ...row, paddingLeft: 12, borderLeft: '2px solid #e0736a' }} data-crew="crossevent">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                  <IconAlert size={13} color="currentColor" /> {c.personName} · double réservation
                </span>
                <span style={mutedInline}>
                  Ici : {c.here} — {c.otherProjectName} : {c.there}. À confirmer : le
                  rapprochement se fait sur le nom, deux homonymes ne sont pas la même personne.
                </span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/**
 * QUI · QUOI · POUR QUI — a document produced from what the project knows.
 *
 * The result is a MediaAsset of this project: one document system, not two.
 * Looking a company up on the web is NOT available here (no network, external
 * providers out of scope), and the panel says so rather than pretending.
 */
function DocumentDesk() {
  const store = weddingStore;
  const [author, setAuthor] = useState('Moi');
  const [docKind, setDocKind] = useState('Devis');
  const [recipientKind, setRecipientKind] = useState('Particulier');
  const [recipient, setRecipient] = useState('');
  const [personId, setPersonId] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const generate = () => {
    const asset = store.generateAdminDocument({
      docKind, authorKind: author, recipientKind, recipientName: recipient,
      personId: personId || undefined,
    });
    setNote(asset
      ? `« ${asset.title} » a été produit et rattaché${personId ? ' à la personne' : ' à l’événement'}.`
      : 'Il manque le destinataire pour produire ce document.');
  };

  return (
    <div style={{ marginTop: 26 }} data-crew="documents">
      <div style={eyebrow}>Que voulez-vous faire ?</div>
      <div style={{ ...grid, marginTop: 10 }}>
        <Select label="Qui ?" value={author} onChange={setAuthor} tag="author"
          options={['Moi', 'Un particulier', 'Une entreprise', 'Une association', 'Un artiste', 'Un technicien', 'Un prestataire', 'Une structure']} />
        <Select label="Quoi ?" value={docKind} onChange={setDocKind} tag="kind"
          options={['Devis', 'Facture', 'Contrat', 'Convention', 'Fiche technique', 'Feuille de route', 'Cahier des charges', 'Bon de commande', 'Attestation', 'Document personnalisé']} />
        <Select label="Pour qui ?" value={recipientKind} onChange={setRecipientKind} tag="recipient-kind"
          options={['Particulier', 'Entreprise', 'Association', 'Collectivité', 'Producteur', 'Organisateur', 'Artiste', 'Prestataire', 'Autre structure']} />
      </div>
      <div style={{ ...grid, marginTop: 10 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={eyebrow}>Destinataire</span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Nom de la personne ou de la structure"
            style={field}
            data-crew="doc-recipient"
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={eyebrow}>Concerne (facultatif)</span>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} style={field} data-crew="doc-person">
            <option value="">Aucune personne en particulier</option>
            {store.getCrew().map((p) => (
              <option key={p.id} value={p.id}>{p.displayName} · {p.craft!.role}</option>
            ))}
          </select>
        </label>
      </div>
      <button onClick={generate} style={{ ...btn, marginTop: 12 }} data-crew="doc-generate">Générer</button>
      {note && <p style={{ ...muted, marginTop: 10 }} data-crew="doc-note">{note}</p>}
      <p style={{ ...muted, marginTop: 10 }} data-crew="doc-web">
        Rechercher une entreprise ou une association sur le web n’est pas
        disponible ici : aucun accès réseau, aucun service extérieur. Les
        informations que le projet ne possède pas sont écrites « À CONFIRMER »
        dans le document, jamais devinées.
      </p>
    </div>
  );
}

function Select({ label, value, onChange, options, tag }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; tag: string;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={eyebrow}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={field} data-crew={`doc-${tag}`}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function AddRequirement({ personId }: { personId: string }) {
  const [draft, setDraft] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !draft.trim()) return;
          weddingStore.addCraftRequirement(personId, draft.trim());
          setDraft('');
        }}
        placeholder="Micro HF, 230 V, loge, repas, parking…"
        style={{ ...field, flex: 1 }}
        data-crew="req-new"
      />
      <button
        onClick={() => { if (draft.trim()) { weddingStore.addCraftRequirement(personId, draft.trim()); setDraft(''); } }}
        style={smallBtn}
        data-crew="req-submit"
      >
        Ajouter
      </button>
    </div>
  );
}

function Craft({ label, value, onCommit, tag, placeholder }: {
  label: string; value: string; onCommit: (v: string) => void; tag: string; placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={eyebrow}>{label}</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onCommit(draft.trim()); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={field}
        data-crew={`craft-${tag}`}
      />
    </label>
  );
}

// --- styles ------------------------------------------------------------------

const muted: React.CSSProperties = {
  margin: 0, fontSize: typography.editorial.caption, color: 'rgba(246,245,243,0.66)', lineHeight: 1.6,
};
const mutedInline: React.CSSProperties = { fontSize: typography.editorial.micro, color: 'rgba(246,245,243,0.6)', fontWeight: 400 };
const eyebrow: React.CSSProperties = {
  fontSize: typography.editorial.micro, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: 'rgba(246,245,243,0.55)', fontWeight: typography.weight.bold,
};
const field: React.CSSProperties = {
  background: '#101114', color: '#f6f5f3', border: '1px solid rgba(246,245,243,0.18)',
  borderRadius: 4, padding: '10px 12px', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans, outline: 'none', boxSizing: 'border-box', width: '100%',
};
const btn: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer', background: '#f6f5f3', color: '#08090b',
  borderRadius: 999, padding: '10px 18px', fontSize: typography.editorial.caption,
  fontWeight: typography.weight.semibold, fontFamily: typography.family.sans, whiteSpace: 'nowrap',
};
const smallBtn: React.CSSProperties = { ...btn, padding: '9px 14px', fontSize: 12 };
const list: React.CSSProperties = { listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 8 };
const row: React.CSSProperties = { display: 'grid', gap: 3, fontSize: typography.editorial.caption };
const memberBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', border: 'none', color: '#f6f5f3',
  display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: '10px 0', width: '100%',
  borderTop: '1px solid rgba(246,245,243,0.12)', fontFamily: typography.family.sans,
  fontSize: typography.editorial.caption,
};
const avatar: React.CSSProperties = {
  width: 34, height: 34, flex: 'none', borderRadius: '50%',
  background: 'rgba(246,245,243,0.12)', display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', fontSize: 11, fontWeight: 700,
};
const countRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' };
const countChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'baseline', gap: 8,
  border: '1px solid rgba(246,245,243,0.18)', borderRadius: 999,
  padding: '8px 14px', fontSize: typography.editorial.caption,
};
const sheet: React.CSSProperties = {
  marginTop: 20, padding: 'clamp(16px, 2.4vw, 26px)',
  border: '1px solid rgba(246,245,243,0.18)', borderRadius: 6, background: '#101114',
};
const sheetRow: React.CSSProperties = {
  display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap',
  padding: '10px 0', borderTop: '1px solid rgba(246,245,243,0.1)',
  fontSize: typography.editorial.caption,
};
const sheetHour: React.CSSProperties = {
  fontFamily: typography.family.mono, fontSize: 15, fontWeight: 700, minWidth: 58,
};
const grid: React.CSSProperties = {
  marginTop: 18, display: 'grid', gap: 10,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};
const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: '1px solid rgba(246,245,243,0.22)', borderRadius: 999,
  padding: '6px 8px 6px 12px', fontSize: 12,
};
const chipX: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'rgba(246,245,243,0.6)', fontSize: 14, lineHeight: 1, padding: '0 2px',
};
