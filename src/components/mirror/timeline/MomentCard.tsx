import { useEffect, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { CERTAINTY } from '../../../design/certainty';
import {
  AUTHOR_ROLES,
  lookupPartyInProject,
  suggestedDocKinds,
  type PartyLookupResult,
} from '../../../design/momentDocs';
import { formatHour, formatHourWithDay, normalizeNightHour } from './TimelineStudio';

// ---------------------------------------------------------------------------
// THE MOMENT CARD — compact editor ON the film block.
// ---------------------------------------------------------------------------
// One to three words per field. Verbs live in the top-right « + » menu and as
// pictos (doc). No second page under the strip. Same store writers as before.
// ---------------------------------------------------------------------------

function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export function MomentCardChrome({
  phaseId,
  dense,
  displayName,
}: {
  phaseId: string;
  dense: boolean;
  displayName: string;
}) {
  const store = weddingStore;
  const hub = store.getPhaseHub(phaseId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !docOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setDocOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [menuOpen, docOpen]);

  if (!hub) return null;
  const { phase, persons, vendors, media, place } = hub;
  const duration = phase.endHour - phase.startHour;
  const findings = store.phaseFindings(phaseId);
  const gaps = findings.filter((f) => f.level !== 'ok');
  const isSelected = true;

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`wc-moment-card${isSelected ? ' is-editing' : ''}${dense ? ' is-dense' : ''}`}
      data-jourj="moment-card"
      onPointerDown={stop}
      onClick={stop}
    >
      {/* + menu — creation verbs only */}
      <div className="wc-moment-plus-wrap" ref={menuRef}>
        <button
          type="button"
          className="wc-moment-plus"
          data-jourj="moment-plus"
          aria-label="Actions du moment"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
            setDocOpen(false);
          }}
        >
          +
        </button>
        {menuOpen && !docOpen && (
          <ul className="wc-moment-plus-menu" role="menu" data-jourj="moment-plus-menu">
            <li>
              <button type="button" role="menuitem" data-jourj="moment-action-doc" onClick={() => { setDocOpen(true); }}>
                <span aria-hidden>📄</span> Document…
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                data-jourj="moment-action-task"
                onClick={() => {
                  const title = window.prompt('Tâche pour ce moment ?');
                  if (title?.trim()) store.createTaskForPhase(phaseId, title.trim());
                  setMenuOpen(false);
                }}
              >
                <span aria-hidden>✓</span> Tâche
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                data-jourj="moment-action-planb"
                onClick={() => {
                  const scenario = store.createScenario(`Plan B — ${phase.name}`);
                  if (scenario) store.setActiveScenario(scenario.id);
                  setMenuOpen(false);
                }}
              >
                <span aria-hidden>⎇</span> Plan B
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                data-jourj="hub-move-earlier"
                aria-label={`Avancer ${phase.name} dans la journée`}
                onClick={() => {
                  const order = [...store.phases].sort((a, b) => a.startHour - b.startHour).findIndex((x) => x.id === phaseId);
                  store.movePhaseToIndex(phaseId, order - 1);
                  setMenuOpen(false);
                }}
              >
                <span aria-hidden>↑</span> Plus tôt
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                data-jourj="hub-move-later"
                aria-label={`Retarder ${phase.name} dans la journée`}
                onClick={() => {
                  const order = [...store.phases].sort((a, b) => a.startHour - b.startHour).findIndex((x) => x.id === phaseId);
                  store.movePhaseToIndex(phaseId, order + 1);
                  setMenuOpen(false);
                }}
              >
                <span aria-hidden>↓</span> Plus tard
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                data-jourj="moment-action-person"
                onClick={() => {
                  const name = window.prompt('Personne (Prénom Nom) ?');
                  if (!name?.trim()) return;
                  const person = store.createPerson({ displayName: name.trim(), asGuest: true, rsvp: 'pending' });
                  if (person) store.attachPersonToPhase(phaseId, person.id);
                  setMenuOpen(false);
                }}
              >
                <span aria-hidden>👤</span> Personne
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                data-jourj="moment-action-vendor"
                onClick={() => {
                  const name = window.prompt('Prestataire ?');
                  if (!name?.trim()) return;
                  const vendor = store.createVendor({ companyName: name.trim(), category: 'autre' });
                  if (vendor) store.attachVendorToPhase(phaseId, vendor.id);
                  setMenuOpen(false);
                }}
              >
                <span aria-hidden>🏢</span> Prestataire
              </button>
            </li>
            <li className="is-danger">
              <button
                type="button"
                role="menuitem"
                data-jourj="moment-action-delete"
                onClick={() => {
                  if (store.deletePhase(phaseId)) setMenuOpen(false);
                }}
              >
                Supprimer
              </button>
            </li>
          </ul>
        )}
        {docOpen && (
          <DocComposer
            phaseId={phaseId}
            onClose={() => { setDocOpen(false); setMenuOpen(false); }}
          />
        )}
      </div>

      {/* Micro fields — 1–3 words each */}
      <div className="wc-moment-fields">
        <div className="wc-moment-row wc-moment-time-row">
          <MicroClock
            value={formatHour(phase.startHour)}
            onCommit={(h) => store.setPhaseTime(phaseId, normalizeNightHour(h, store.phases))}
            testId="hub-start"
          />
          <span className="wc-moment-sep">→</span>
          <span className="wc-moment-end" title={formatHourWithDay(phase.endHour)}>
            {formatHour(phase.endHour)}
          </span>
          <MicroNumber
            value={Math.round(duration * 60)}
            suffix="min"
            onCommit={(m) => store.setPhaseDuration(phaseId, m / 60)}
            testId="hub-duration"
          />
          {phase.confidence && phase.confidence !== 'confirmed' && (
            <span
              className="wc-moment-cert"
              style={{ color: CERTAINTY[phase.confidence].color }}
              title={phase.confidenceNote || CERTAINTY[phase.confidence].meaning}
              data-jourj="moment-certainty"
            >
              {CERTAINTY[phase.confidence].label}
            </span>
          )}
        </div>

        <MicroText
          value={phase.name}
          placeholder="Nom"
          onCommit={(v) => store.setPhaseTitle(phaseId, v)}
          testId="hub-title"
          className="wc-moment-title-input"
        />

        {!dense && (
          <MicroText
            value={phase.subtitle || ''}
            placeholder="Sous-titre"
            onCommit={(v) => store.setPhaseSubtitle(phaseId, v)}
            testId="hub-subtitle"
          />
        )}

        <div className="wc-moment-row">
          <select
            className="wc-moment-select"
            value={phase.primaryPlaceId || ''}
            onChange={(e) => store.setPhasePlace(phaseId, e.target.value || null)}
            data-jourj="hub-place-select"
            aria-label="Lieu"
          >
            <option value="">Lieu…</option>
            {store.places.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <label className="wc-moment-check" title="En extérieur">
            <input
              type="checkbox"
              checked={Boolean(phase.outdoor)}
              onChange={(e) => store.setPhaseOutdoor(phaseId, e.target.checked)}
              data-jourj="hub-outdoor"
            />
            <span>dehors</span>
          </label>
        </div>

        {!dense && (
          <div className="wc-moment-row wc-moment-chips" data-jourj="moment-who">
            {persons.slice(0, 4).map((p) => (
              <span key={p!.id} className="wc-moment-chip" title={p!.craft?.role || ''}>
                {(p!.displayName || '?').split(/\s+/)[0]}
                <button
                  type="button"
                  aria-label={`Retirer ${p!.displayName}`}
                  onClick={() => store.detachPersonFromPhase(phaseId, p!.id)}
                >
                  ×
                </button>
              </span>
            ))}
            {vendors.slice(0, 3).map((v) => (
              <span key={v!.id} className="wc-moment-chip is-vendor">
                {(v!.companyName || '?').slice(0, 12)}
                <button
                  type="button"
                  aria-label={`Retirer ${v!.companyName}`}
                  onClick={() => store.detachVendorFromPhase(phaseId, v!.id)}
                >
                  ×
                </button>
              </span>
            ))}
            {persons.length === 0 && vendors.length === 0 && (
              <span className="wc-moment-muted">qui · via +</span>
            )}
          </div>
        )}

        <div className="wc-moment-row">
          <MicroNumber
            value={phase.budget?.amount}
            placeholder="€"
            onCommit={(n) => store.setPhaseBudget(phaseId, { amount: n })}
            testId="hub-cost"
          />
          <MicroText
            value={phase.notes || ''}
            placeholder="Note"
            onCommit={(v) => store.setPhaseNotes(phaseId, v)}
            testId="hub-notes"
          />
        </div>

        {/* Gaps: short signal + doc picto */}
        {gaps.length > 0 && (
          <ul className="wc-moment-gaps" data-jourj="moment-state">
            {gaps.slice(0, 3).map((f, i) => (
              <li key={i} data-level={f.level} data-jourj="moment-state-line">
                <span>⚠ {f.title}</span>
                {f.docKind && (
                  <button
                    type="button"
                    className="wc-moment-doc-picto"
                    title={`Générer ${f.docKind}`}
                    aria-label={`Générer ${f.docKind}`}
                    data-jourj="hub-generate-missing"
                    onClick={() => {
                      const person = f.personId ? store.persons.find((p) => p.id === f.personId) : null;
                      const vendor = f.vendorId ? store.vendors.find((v) => v.id === f.vendorId) : null;
                      const recipientName = person?.displayName ?? vendor?.companyName;
                      if (!recipientName) return;
                      store.generateAdminDocument({
                        docKind: f.docKind!,
                        authorKind: AUTHOR_ROLES[0],
                        recipientKind: person ? 'Artiste / intermittent' : 'Prestataire',
                        recipientName,
                        personId: person?.id,
                        phaseId,
                      });
                    }}
                  >
                    📄
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!dense && (
          <div className="wc-moment-meta-foot">
            {formatDuration(duration)}
            {place ? ` · ${place.name}` : ''}
            {media.length ? ` · ${media.length} doc.` : ''}
            {displayName ? '' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

/** Read-only face when the card is not selected — short signal only. */
export function MomentCardFace({
  phaseId,
  dense,
  displayName,
}: {
  phaseId: string;
  dense: boolean;
  displayName: string;
}) {
  const store = weddingStore;
  const hub = store.getPhaseHub(phaseId);
  const phase = store.phases.find((p) => p.id === phaseId);
  if (!phase) return null;
  const duration = phase.endHour - phase.startHour;
  const findings = store.phaseFindings(phaseId);
  const gaps = findings.filter((f) => f.level !== 'ok');

  return (
    <div className="wc-moment-face" data-jourj="moment-face">
      <div className="wc-moment-face-hour">
        {formatHour(phase.startHour)}
        {phase.confidence && phase.confidence !== 'confirmed' && (
          <span
            className="wc-moment-cert"
            style={{ color: CERTAINTY[phase.confidence].color }}
            data-jourj="moment-certainty"
          >
            {CERTAINTY[phase.confidence].label}
          </span>
        )}
      </div>
      {!dense && (
        <>
          <div className="wc-moment-face-name">{displayName}</div>
          <div className="wc-moment-face-meta">
            {formatDuration(duration)}
            {hub && hub.persons.length > 0 && ` · ${hub.persons.length} pers.`}
            {hub && hub.vendors.length > 0 && ` · ${hub.vendors.length} prest.`}
            {hub && hub.media.length > 0 && ` · ${hub.media.length} doc.`}
          </div>
          {gaps.length > 0 && (
            <ul className="wc-moment-gaps is-face" data-jourj="moment-state">
              {gaps.slice(0, 2).map((f, i) => (
                <li key={i} data-level={f.level} data-jourj="moment-state-line">
                  ⚠ {f.title}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function DocComposer({ phaseId, onClose }: { phaseId: string; onClose: () => void }) {
  const store = weddingStore;
  const hub = store.getPhaseHub(phaseId);
  const [docKind, setDocKind] = useState('Contrat');
  const [author, setAuthor] = useState<string>(AUTHOR_ROLES[0]);
  const [target, setTarget] = useState('');
  const [lookupQ, setLookupQ] = useState('');
  const [lookup, setLookup] = useState<PartyLookupResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!hub) return null;

  const targets = [
    ...hub.persons.filter(Boolean).map((p) => ({
      id: `person:${p!.id}`,
      label: p!.craft?.role ? `${p!.displayName} · ${p!.craft.role}` : p!.displayName,
      status: p!.craft?.status,
      role: p!.craft?.role,
    })),
    ...hub.vendors.filter(Boolean).map((v) => ({
      id: `vendor:${v!.id}`,
      label: v!.companyName,
      status: undefined as string | undefined,
      role: v!.category,
    })),
  ];

  const selected = targets.find((t) => t.id === target);
  const kinds = suggestedDocKinds({ status: selected?.status, role: selected?.role });

  const runLookup = () => {
    const result = lookupPartyInProject(lookupQ || selected?.label || '', {
      persons: store.persons,
      vendors: store.vendors,
      locationName: store.currentProject.locationName,
    });
    setLookup(result);
  };

  return (
    <div className="wc-moment-doc-composer" data-jourj="moment-doc-composer" onPointerDown={(e) => e.stopPropagation()}>
      <div className="wc-moment-doc-title">Document</div>
      <label>
        <span>Type</span>
        <select value={docKind} onChange={(e) => setDocKind(e.target.value)} data-jourj="hub-generate-kind">
          {kinds.map((k) => (
            <option key={k.id} value={k.id}>{k.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Émis par</span>
        <select value={author} onChange={(e) => setAuthor(e.target.value)} data-jourj="hub-generate-author">
          {AUTHOR_ROLES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Pour</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)} data-jourj="hub-generate-target">
          <option value="">Choisir…</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </label>
      <div className="wc-moment-doc-lookup">
        <input
          value={lookupQ}
          onChange={(e) => setLookupQ(e.target.value)}
          placeholder="Asso, structure, SIRET…"
          data-jourj="hub-generate-lookup"
          onKeyDown={(e) => { if (e.key === 'Enter') runLookup(); }}
        />
        <button type="button" onClick={runLookup} data-jourj="hub-generate-lookup-run">Chercher</button>
      </div>
      {lookup && (
        <p className="wc-moment-doc-lookup-note" data-jourj="hub-generate-lookup-result">
          {lookup.found
            ? `${lookup.legalName}${lookup.email ? ` · ${lookup.email}` : ''} — ${lookup.note}`
            : lookup.note}
        </p>
      )}
      <div className="wc-moment-doc-actions">
        <button
          type="button"
          data-jourj="hub-generate-run"
          onClick={() => {
            const [kind, id] = target.split(':');
            if (!id) return;
            const person = kind === 'person' ? store.persons.find((p) => p.id === id) : null;
            const vendor = kind === 'vendor' ? store.vendors.find((v) => v.id === id) : null;
            const recipientName = person?.displayName ?? vendor?.companyName ?? lookup?.legalName;
            if (!recipientName) return;
            const asset = store.generateAdminDocument({
              docKind,
              authorKind: author,
              recipientKind: person
                ? (person.craft?.status?.toLowerCase().includes('intermitt') ? 'Artiste / intermittent' : 'Artiste / prestataire')
                : 'Prestataire',
              recipientName,
              personId: person?.id,
              phaseId,
            });
            if (asset) {
              setToast(asset.title || docKind);
              window.setTimeout(onClose, 600);
            }
          }}
        >
          Générer
        </button>
        <button type="button" onClick={onClose}>annuler</button>
      </div>
      {toast && <p className="wc-moment-doc-toast" data-jourj="hub-generated">{toast}</p>}
      {targets.length === 0 && (
        <p className="wc-moment-muted">Ajoutez d’abord une personne ou un presta via +.</p>
      )}
    </div>
  );
}

function MicroText({
  value, placeholder, onCommit, testId, className,
}: {
  value: string; placeholder: string; onCommit: (v: string) => void; testId?: string; className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <input
      className={`wc-moment-input${className ? ` ${className}` : ''}`}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onCommit(draft); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      data-jourj={testId}
    />
  );
}

function MicroClock({
  value, onCommit, testId,
}: {
  value: string; onCommit: (h: number) => void; testId?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => {
    const m = /^(\d{1,2})\s*[:h]\s*(\d{2})?$/.exec(draft.trim());
    if (!m) { setDraft(value); return; }
    onCommit(Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0));
  };
  return (
    <input
      className="wc-moment-input wc-moment-clock"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      data-jourj={testId}
      aria-label="Début"
    />
  );
}

function MicroNumber({
  value, onCommit, testId, placeholder, suffix,
}: {
  value?: number; onCommit: (n: number) => void; testId?: string; placeholder?: string; suffix?: string;
}) {
  const [draft, setDraft] = useState(value !== undefined ? String(value) : '');
  useEffect(() => { setDraft(value !== undefined ? String(value) : ''); }, [value]);
  return (
    <span className="wc-moment-num-wrap">
      <input
        className="wc-moment-input wc-moment-num"
        value={draft}
        placeholder={placeholder ?? '0'}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft);
          if (Number.isFinite(n) && n >= 0) onCommit(n);
          else setDraft(value !== undefined ? String(value) : '');
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        data-jourj={testId}
      />
      {suffix && <span className="wc-moment-suffix">{suffix}</span>}
    </span>
  );
}

