import { useEffect, useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { CERTAINTY } from '../../../design/certainty';
import {
  AUTHOR_ROLES,
  lookupPartyInProject,
  suggestedDocKinds,
  type PartyLookupResult,
} from '../../../design/momentDocs';
import { formatHour, normalizeNightHour } from './TimelineStudio';

// ---------------------------------------------------------------------------
// MOMENT TOOLBAR — permanent bottom bar on Jour J.
// ---------------------------------------------------------------------------
// Always on screen. Idle until a film card is selected; then the same bar
// fills with controls. No duplicate identity text (the card already says
// who/when). No close button — deselect by tapping the card again or Esc.
// Hours use a wheel-style picker (HH · MM), not a free-text field.
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = Array.from({ length: 12 }, (_, i) => i * 5); // 5-min snap

function splitHour(h: number): { hh: number; mm: number } {
  const total = Math.round(h * 60);
  return { hh: Math.floor(total / 60) % 24, mm: total % 60 };
}

/** Snap minutes to nearest 5 for the wheel. */
function snapMin(m: number): number {
  return Math.round(m / 5) * 5 % 60;
}

function joinHour(hh: number, mm: number, nightBias: boolean): number {
  let h = hh + mm / 60;
  // Night hours (0–5) after a daytime programme → +24, same rule as the film.
  if (nightBias && h < 6) h += 24;
  return h;
}

export function MomentDock({
  phaseId,
  onClear,
}: {
  phaseId: string | null;
  onClear: () => void;
}) {
  const store = weddingStore;
  const hub = phaseId ? store.getPhaseHub(phaseId) : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = Boolean(hub && phaseId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phaseId) {
        e.preventDefault();
        onClear();
        setMenuOpen(false);
        setDocOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phaseId, onClear]);

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

  // If the selected moment disappears, clear selection.
  useEffect(() => {
    if (phaseId && !hub) onClear();
  }, [phaseId, hub, onClear]);

  useEffect(() => {
    setMenuOpen(false);
    setDocOpen(false);
  }, [phaseId]);

  const phase = hub?.phase;
  const persons = hub?.persons ?? [];
  const vendors = hub?.vendors ?? [];
  const duration = phase ? phase.endHour - phase.startHour : 0;
  const gaps = phaseId ? store.phaseFindings(phaseId).filter((f) => f.level !== 'ok') : [];
  const nightBias = store.phases.some((p) => p.endHour > 12);

  return (
    <div
      className={`wc-moment-dock${active ? ' is-active' : ' is-idle'}`}
      role="toolbar"
      aria-label="Barre d’édition du moment"
      data-jourj="moment-dock"
      data-active={active ? 'yes' : 'no'}
    >
      <div className="wc-moment-dock-inner" data-jourj="moment-card">
        {!active && (
          <div className="wc-moment-dock-idle" data-jourj="dock-idle">
            <span className="wc-moment-dock-idle-mark" aria-hidden />
            <span>Sélectionnez un moment sur la pellicule</span>
          </div>
        )}

        {active && phase && phaseId && (
          <>
            <div className="wc-moment-dock-fields">
              <TimeWheel
                value={phase.startHour}
                nightBias={nightBias}
                onCommit={(h) => store.setPhaseTime(phaseId, normalizeNightHour(h, store.phases))}
                testId="hub-start"
                ariaLabel="Heure de début"
              />
              <DurationWheel
                minutes={Math.round(duration * 60)}
                onCommit={(m) => store.setPhaseDuration(phaseId, m / 60)}
                testId="hub-duration"
              />
              <input
                className="wc-moment-dock-input wc-moment-dock-title"
                key={`title-${phaseId}-${phase.name}`}
                defaultValue={phase.name}
                placeholder="Nom"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== phase.name) store.setPhaseTitle(phaseId, v);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                data-jourj="hub-title"
                aria-label="Nom du moment"
              />
              <select
                className="wc-moment-dock-select"
                value={phase.primaryPlaceId || ''}
                onChange={(e) => store.setPhasePlace(phaseId, e.target.value || null)}
                data-jourj="hub-place-select"
                aria-label="Lieu"
              >
                <option value="">Lieu</option>
                {store.places.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <label className="wc-moment-dock-check" title="En extérieur">
                <input
                  type="checkbox"
                  checked={Boolean(phase.outdoor)}
                  onChange={(e) => store.setPhaseOutdoor(phaseId, e.target.checked)}
                  data-jourj="hub-outdoor"
                />
                <span aria-hidden>☀</span>
              </label>
              <input
                className="wc-moment-dock-input wc-moment-dock-num"
                key={`€-${phaseId}-${phase.budget?.amount ?? ''}`}
                defaultValue={phase.budget?.amount !== undefined ? String(phase.budget.amount) : ''}
                placeholder="€"
                inputMode="decimal"
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0) store.setPhaseBudget(phaseId, { amount: n });
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                data-jourj="hub-cost"
                aria-label="Budget"
              />
            </div>

            <div className="wc-moment-dock-meta">
              <div className="wc-moment-dock-chips" data-jourj="moment-who">
                {persons.slice(0, 5).map((p) => (
                  <span key={p!.id} className="wc-moment-dock-chip" title={p!.craft?.role || p!.displayName}>
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
                  <span key={v!.id} className="wc-moment-dock-chip is-vendor" title={v!.companyName}>
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
              </div>

              {gaps.slice(0, 2).map((f, i) => (
                <span
                  key={i}
                  className="wc-moment-dock-gap"
                  data-level={f.level}
                  data-jourj="moment-state-line"
                  title={f.detail}
                >
                  ⚠
                  {f.docKind && (
                    <button
                      type="button"
                      className="wc-moment-dock-doc-btn"
                      title={`Générer ${f.docKind}`}
                      aria-label={`Générer ${f.docKind}`}
                      data-jourj="hub-generate-missing"
                      onClick={() => {
                        const person = f.personId ? store.persons.find((x) => x.id === f.personId) : null;
                        const vendor = f.vendorId ? store.vendors.find((x) => x.id === f.vendorId) : null;
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
                </span>
              ))}

              {phase.confidence && phase.confidence !== 'confirmed' && (
                <span
                  className="wc-moment-dock-cert"
                  style={{ color: CERTAINTY[phase.confidence].color }}
                  data-jourj="moment-certainty"
                >
                  {CERTAINTY[phase.confidence].label}
                </span>
              )}
            </div>

            <div className="wc-moment-dock-actions" ref={menuRef}>
              <button
                type="button"
                className="wc-moment-dock-plus"
                data-jourj="moment-plus"
                aria-label="Actions"
                aria-expanded={menuOpen}
                onClick={() => {
                  setMenuOpen((v) => !v);
                  setDocOpen(false);
                }}
              >
                +
              </button>
              {menuOpen && !docOpen && (
                <ul className="wc-moment-dock-menu" role="menu" data-jourj="moment-plus-menu">
                  <li>
                    <button type="button" role="menuitem" data-jourj="moment-action-doc" onClick={() => setDocOpen(true)}>
                      <span aria-hidden>📄</span> Document
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      data-jourj="moment-action-task"
                      onClick={() => {
                        const title = window.prompt('Tâche ?');
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
                        const name = window.prompt('Prénom Nom ?');
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
                      <span aria-hidden>🏢</span> Presta
                    </button>
                  </li>
                  <li className="is-danger">
                    <button
                      type="button"
                      role="menuitem"
                      data-jourj="moment-action-delete"
                      onClick={() => {
                        if (store.deletePhase(phaseId)) onClear();
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
          </>
        )}
      </div>
    </div>
  );
}

/** iOS-style dual wheel: hours · minutes (5-min). */
function TimeWheel({
  value,
  nightBias,
  onCommit,
  testId,
  ariaLabel,
}: {
  value: number;
  nightBias: boolean;
  onCommit: (h: number) => void;
  testId?: string;
  ariaLabel: string;
}) {
  const { hh, mm } = useMemo(() => {
    const s = splitHour(value);
    return { hh: s.hh, mm: snapMin(s.mm) };
  }, [value]);

  const commit = (nextH: number, nextM: number) => {
    onCommit(joinHour(nextH, nextM, nightBias));
  };

  return (
    <div className="wc-time-wheel" data-jourj={testId} role="group" aria-label={ariaLabel}>
      <select
        className="wc-time-wheel-col"
        value={hh}
        aria-label="Heure"
        onChange={(e) => commit(Number(e.target.value), mm)}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      <span className="wc-time-wheel-colon" aria-hidden>:</span>
      <select
        className="wc-time-wheel-col"
        value={mm}
        aria-label="Minutes"
        onChange={(e) => commit(hh, Number(e.target.value))}
      >
        {MINS.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
}

/** Duration as H + M wheels (total minutes under the hood). */
function DurationWheel({
  minutes,
  onCommit,
  testId,
}: {
  minutes: number;
  onCommit: (m: number) => void;
  testId?: string;
}) {
  const h = Math.floor(Math.max(0, minutes) / 60);
  const m = snapMin(Math.max(0, minutes) % 60);
  const hoursOpts = useMemo(() => Array.from({ length: 13 }, (_, i) => i), []);

  return (
    <div className="wc-time-wheel wc-duration-wheel" data-jourj={testId} role="group" aria-label="Durée">
      <select
        className="wc-time-wheel-col"
        value={h}
        aria-label="Heures de durée"
        onChange={(e) => onCommit(Number(e.target.value) * 60 + m)}
      >
        {hoursOpts.map((x) => (
          <option key={x} value={x}>{x} h</option>
        ))}
      </select>
      <select
        className="wc-time-wheel-col"
        value={m}
        aria-label="Minutes de durée"
        onChange={(e) => onCommit(h * 60 + Number(e.target.value))}
      >
        {MINS.map((x) => (
          <option key={x} value={x}>{String(x).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
}

/** Read-only face on the film — never an editor. */
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
  const durationMin = Math.round((phase.endHour - phase.startHour) * 60);
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
            {durationMin >= 60
              ? `${Math.floor(durationMin / 60)} h${durationMin % 60 ? ` ${durationMin % 60}` : ''}`
              : `${durationMin} min`}
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
    setLookup(lookupPartyInProject(lookupQ || selected?.label || '', {
      persons: store.persons,
      vendors: store.vendors,
      locationName: store.currentProject.locationName,
    }));
  };

  return (
    <div className="wc-moment-dock-composer" data-jourj="moment-doc-composer">
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
      <div className="wc-moment-dock-lookup">
        <input
          value={lookupQ}
          onChange={(e) => setLookupQ(e.target.value)}
          placeholder="Asso, SIRET…"
          data-jourj="hub-generate-lookup"
          onKeyDown={(e) => { if (e.key === 'Enter') runLookup(); }}
        />
        <button type="button" onClick={runLookup} data-jourj="hub-generate-lookup-run">OK</button>
      </div>
      {lookup && (
        <p className="wc-moment-dock-lookup-note" data-jourj="hub-generate-lookup-result">
          {lookup.found
            ? `${lookup.legalName}${lookup.email ? ` · ${lookup.email}` : ''}`
            : lookup.note}
        </p>
      )}
      <div className="wc-moment-dock-composer-actions">
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
              window.setTimeout(onClose, 500);
            }
          }}
        >
          Générer
        </button>
        <button type="button" onClick={onClose}>annuler</button>
      </div>
      {toast && <p className="wc-moment-dock-toast" data-jourj="hub-generated">{toast}</p>}
    </div>
  );
}
