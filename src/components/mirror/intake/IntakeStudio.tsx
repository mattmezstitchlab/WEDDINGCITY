import { useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { analyseIntake, summariseIntake, type IntakePlan, type IntakeSource } from '../../../game/projectIntake';
import { eventType, type EventTypeId } from '../../../design/eventTypes';

// ---------------------------------------------------------------------------
// INTAKE — « Importez votre chaos. Nous construisons votre journée. »
// ---------------------------------------------------------------------------
// Four states, and the third one is the important one:
//
//   1. LECTURE      the files are decoded, locally, in the browser
//   2. ANALYSE      projectIntake reads what is literally written
//   3. VALIDATION   « Votre journée prend forme » — everything found is shown,
//                   with its evidence, and can be corrected or dropped BEFORE
//                   anything is created
//   4. GÉNÉRATION   the wedding and its timeline are created from the plan
//
// Nothing is invented at any step: an estimated hour is labelled as estimated,
// an unreadable file says so, and a missing answer becomes a question.
// ---------------------------------------------------------------------------

type Stage = 'reading' | 'review' | 'done';

export function IntakeStudio({ description, files, projectType, onClose }: {
  description: string;
  files: File[];
  /** The event type chosen in the hero — it decides every question below. */
  projectType: EventTypeId;
  onClose: () => void;
}) {
  const schema = eventType(projectType);
  const store = weddingStore;
  const [stage, setStage] = useState<Stage>('reading');
  const [plan, setPlan] = useState<IntakePlan | null>(null);
  const [step, setStep] = useState('Lecture des fichiers');

  // --- 1 & 2: read, then analyse ------------------------------------------
  useState(() => {
    (async () => {
      const sources: IntakeSource[] = [];
      for (const file of files) {
        let text = '';
        const readable = file.type.startsWith('text/')
          || /\.(txt|md|csv|tsv|ics|json|vcf)$/i.test(file.name);
        if (readable) {
          try { text = await file.text(); } catch { text = ''; }
        }
        sources.push({ fileName: file.name, text });
      }
      setStep('Analyse des documents');
      await new Promise((r) => setTimeout(r, 260));
      const result = analyseIntake({ description, sources, eventTypeId: projectType });
      setStep('Structuration du projet');
      await new Promise((r) => setTimeout(r, 260));
      setPlan(result);
      setStage('review');
    })();
    return undefined;
  });

  const toggle = <K extends keyof IntakePlan>(key: K, index: number) => {
    if (!plan) return;
    const list = plan[key] as unknown as { keep: boolean }[];
    const next = [...list];
    next[index] = { ...next[index], keep: !next[index].keep };
    setPlan({ ...plan, [key]: next } as IntakePlan);
  };

  const editMoment = (index: number, patch: { label?: string; startHour?: number; endHour?: number }) => {
    if (!plan) return;
    const moments = [...plan.moments];
    moments[index] = { ...moments[index], ...patch, confidence: patch.endHour !== undefined ? 'read' : moments[index].confidence };
    setPlan({ ...plan, moments });
  };

  const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  const parse = (v: string) => {
    const m = /^(\d{1,2})\s*[:h]\s*(\d{2})?$/.exec(v.trim());
    return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0) : null;
  };

  const canGenerate = Boolean(plan?.coupleNames && plan.coupleNames.trim());

  const generate = () => {
    if (!plan || !canGenerate) return;
    // The wedding itself comes first — with only what was really read.
    store.createRealWedding({
      coupleNames: plan.coupleNames || 'Notre mariage',
      weddingDate: plan.weddingDate || '',
      locationName: plan.locationName || '',
      userRole: 'wedding_planner',
      userName: (plan.coupleNames || '').split('&')[0].trim(),
    });
    store.applyIntakePlan(plan);
    setStage('done');
    onClose();
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Construction de votre journée" data-intake="studio">
      <div style={surface}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={eyebrow}>{schema.label}</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={ghost} data-intake="close">Fermer</button>
        </div>

        {stage === 'reading' && (
          <div style={{ padding: '48px 0' }} data-intake="reading">
            <div style={title}>{step}…</div>
            <p style={{ ...muted, marginTop: 8 }}>{schema.intakeLine}</p>
            <p style={muted}>
              Tout est lu ici, dans votre navigateur : aucun fichier n’est envoyé
              nulle part.
            </p>
            <div style={barTrack}><div style={barFill} /></div>
          </div>
        )}

        {stage === 'review' && plan && (
          <div data-intake="review">
            <div style={eyebrow}>Lecture du projet</div>
            <div style={title}>Votre journée prend forme</div>

            <div style={countsRow}>
              {summariseIntake(plan).map((c) => (
                <span key={c.label} style={countChip} data-intake="count">
                  <strong style={{ fontSize: 22, fontFamily: typography.family.mono }}>{c.count}</strong> {c.label}
                </span>
              ))}
              {summariseIntake(plan).length === 0 && (
                <span style={muted}>Rien n’a pu être lu dans ce que vous avez donné.</span>
              )}
            </div>

            {/* CE QUE NOUS AVONS COMPRIS — with the words of THIS kind of day.
                A corporate event is never asked who the bride is. */}
            <div style={identityRow}>
              {schema.fields.map((f) => {
                if (f.key === 'principals') {
                  return (
                    <Field key={f.key} label={f.label} value={plan.coupleNames ?? ''} placeholder={f.placeholder}
                      onCommit={(v) => setPlan({ ...plan, coupleNames: v || null })} testId="intake-couple" />
                  );
                }
                if (f.key === 'date') {
                  return (
                    <Field key={f.key} label={f.label} value={plan.weddingDate ?? ''} placeholder={f.placeholder}
                      onCommit={(v) => setPlan({ ...plan, weddingDate: v || null })} testId="intake-date" />
                  );
                }
                if (f.key === 'place') {
                  return (
                    <Field key={f.key} label={f.label} value={plan.locationName ?? ''} placeholder={f.placeholder}
                      onCommit={(v) => setPlan({ ...plan, locationName: v || null })} testId="intake-place" />
                  );
                }
                return (
                  <Field key={f.key} label={f.label}
                    value={plan.guestCountTarget ? String(plan.guestCountTarget) : ''}
                    placeholder={f.placeholder}
                    onCommit={(v) => setPlan({ ...plan, guestCountTarget: Number(v) || null })}
                    testId="intake-headcount" />
                );
              })}
            </div>

            {plan.questions.length > 0 && (
              <ul style={{ ...list, marginTop: 18 }} data-intake="questions">
                {plan.questions.map((q) => (
                  <li key={q} style={{ ...row, borderLeftColor: '#e0a06a' }}>{q}</li>
                ))}
              </ul>
            )}

            <Group title="Moments">
              {plan.moments.length === 0 && <p style={muted}>Aucun horaire reconnu.</p>}
              {plan.moments.map((m, i) => (
                <div key={`${m.label}-${i}`} style={{ ...row, opacity: m.keep ? 1 : 0.45 }} data-intake="moment">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={clock(m.startHour)}
                      onChange={(e) => { const h = parse(e.target.value); if (h !== null) editMoment(i, { startHour: h, endHour: h + (m.endHour - m.startHour) }); }}
                      style={{ ...input, width: 74, fontFamily: typography.family.mono }}
                      data-intake="moment-start"
                    />
                    <input
                      value={m.label}
                      onChange={(e) => editMoment(i, { label: e.target.value })}
                      style={{ ...input, flex: '1 1 180px' }}
                      data-intake="moment-label"
                    />
                    <span style={m.confidence === 'estimated' ? warnTag : okTag} data-intake="moment-confidence">
                      {m.confidence === 'estimated' ? '⚠ horaire de fin estimé' : '✓ lu'}
                    </span>
                    <button onClick={() => toggle('moments', i)} style={ghost} data-intake="moment-toggle">
                      {m.keep ? 'Retirer' : 'Remettre'}
                    </button>
                  </div>
                  <div style={{ ...muted, marginTop: 4 }}>« {m.evidence} »</div>
                </div>
              ))}
            </Group>

            <Group title={schema.headcountLabel === 'participants' ? 'Participants' : 'Personnes'}>
              {plan.people.length === 0 && <p style={muted}>Aucune liste d’invités reconnue.</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {plan.people.map((p, i) => (
                  <button key={p.name} onClick={() => toggle('people', i)}
                    style={{ ...chip, opacity: p.keep ? 1 : 0.4 }} data-intake="person">
                    {p.name}
                  </button>
                ))}
              </div>
            </Group>

            <Group title="Prestataires">
              {plan.vendors.length === 0 && <p style={muted}>Aucun prestataire reconnu.</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {plan.vendors.map((v, i) => (
                  <button key={v.name} onClick={() => toggle('vendors', i)}
                    style={{ ...chip, opacity: v.keep ? 1 : 0.4 }} data-intake="vendor">
                    {v.name}
                  </button>
                ))}
              </div>
            </Group>

            <Group title="Lieux">
              {plan.places.length === 0 && <p style={muted}>Aucun lieu reconnu.</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {plan.places.map((p, i) => (
                  <button key={p.name} onClick={() => toggle('places', i)}
                    style={{ ...chip, opacity: p.keep ? 1 : 0.4 }} data-intake="place">
                    {p.name}
                  </button>
                ))}
              </div>
            </Group>

            <Group title="Musique">
              {plan.tracks.length === 0 && <p style={muted}>Aucune playlist reconnue.</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {plan.tracks.map((t, i) => (
                  <button key={t.title} onClick={() => toggle('tracks', i)}
                    style={{ ...chip, opacity: t.keep ? 1 : 0.4 }} data-intake="track">
                    {t.title} · {t.artist}
                  </button>
                ))}
              </div>
            </Group>

            <Group title="Documents">
              {plan.documents.length === 0 && <p style={muted}>Aucun fichier importé.</p>}
              <ul style={list}>
                {plan.documents.map((d) => (
                  <li key={d.fileName} style={row} data-intake="document">
                    <span style={{ fontWeight: 600 }}>{d.fileName}</span>
                    <span style={muted}>
                      {d.facts.unreadable
                        ? 'non lisible comme du texte ici — conservé tel quel'
                        : [
                          d.facts.hours.length ? `${d.facts.hours.length} horaire(s)` : null,
                          d.facts.amounts.length ? `${d.facts.amounts.length} montant(s)` : null,
                          d.facts.emails.length ? `${d.facts.emails.length} e-mail(s)` : null,
                          d.facts.phones.length ? `${d.facts.phones.length} téléphone(s)` : null,
                        ].filter(Boolean).join(' · ') || 'aucune information exploitable'}
                      {d.momentIndex !== null && plan.moments[d.momentIndex]
                        ? ` — semble concerner « ${plan.moments[d.momentIndex].label} »` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Group>

            <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
              <button
                onClick={generate}
                disabled={!canGenerate}
                style={{ ...primary, opacity: canGenerate ? 1 : 0.4, cursor: canGenerate ? 'pointer' : 'not-allowed' }}
                data-intake="generate"
              >
                Générer ma journée <span aria-hidden>→</span>
              </button>
              <button onClick={onClose} style={ghost}>Annuler</button>
            </div>
            {!canGenerate && (
              <p style={{ ...muted, marginTop: 12 }} data-intake="need-couple">
                Renseignez d’abord « {schema.fields[0].label} » : cette information ne sera pas devinée.
              </p>
            )}
            <p style={{ ...muted, marginTop: 12 }}>
              Seuls les éléments encore actifs seront créés. Rien d’autre ne sera
              inventé pour remplir la journée.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26 }}>
      <div style={eyebrow}>{title}</div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, placeholder, onCommit, testId }: {
  label: string; value: string; placeholder: string; onCommit: (v: string) => void; testId: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label style={{ display: 'grid', gap: 6, flex: '1 1 200px' }}>
      <span style={eyebrow}>{label}</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft.trim())}
        style={input}
        data-intake={testId}
      />
    </label>
  );
}

// --- styles ------------------------------------------------------------------

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1500, background: '#08090b',
  overflowY: 'auto', color: '#f6f5f3', fontFamily: typography.family.sans,
};

const surface: React.CSSProperties = {
  maxWidth: 900, margin: '0 auto', padding: 'clamp(24px, 5vw, 64px) clamp(18px, 5vw, 48px) 80px',
};

const eyebrow: React.CSSProperties = {
  fontSize: typography.editorial.micro, letterSpacing: '0.18em', textTransform: 'uppercase',
  fontWeight: typography.weight.bold, color: 'rgba(246,245,243,0.6)',
};

const title: React.CSSProperties = {
  marginTop: 14, fontSize: 'clamp(28px, 5vw, 56px)', letterSpacing: '-0.035em',
  fontWeight: typography.weight.semibold, lineHeight: 1.03,
};

const muted: React.CSSProperties = {
  fontSize: typography.editorial.caption, color: 'rgba(246,245,243,0.66)', lineHeight: 1.6,
};

const countsRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 };

const countChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'baseline', gap: 8,
  border: '1px solid rgba(246,245,243,0.18)', borderRadius: 999,
  padding: '10px 16px', fontSize: typography.editorial.caption,
};

const identityRow: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 };

const input: React.CSSProperties = {
  background: '#101114', color: '#f6f5f3', border: '1px solid rgba(246,245,243,0.18)',
  borderRadius: 4, padding: '10px 12px', fontSize: typography.editorial.caption,
  fontFamily: typography.family.sans, outline: 'none', boxSizing: 'border-box', width: '100%',
};

const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 };

const row: React.CSSProperties = {
  paddingLeft: 12, borderLeft: '2px solid rgba(246,245,243,0.2)',
  fontSize: typography.editorial.caption,
};

const chip: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.22)', borderRadius: 999,
  padding: '8px 14px', fontSize: 12, fontFamily: typography.family.sans,
};

const okTag: React.CSSProperties = { ...chip, cursor: 'default', borderColor: 'rgba(127,176,138,0.6)' };
const warnTag: React.CSSProperties = { ...chip, cursor: 'default', borderColor: 'rgba(224,160,106,0.7)' };

const primary: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer', background: '#f6f5f3', color: '#08090b',
  borderRadius: 999, padding: '14px 24px', fontSize: typography.editorial.caption,
  fontWeight: typography.weight.semibold, fontFamily: typography.family.sans,
};

const ghost: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '9px 16px', fontSize: 12, fontFamily: typography.family.sans,
};

const barTrack: React.CSSProperties = {
  marginTop: 26, height: 2, background: 'rgba(246,245,243,0.14)', overflow: 'hidden', maxWidth: 420,
};

const barFill: React.CSSProperties = {
  height: '100%', width: '40%', background: '#f6f5f3',
  animation: 'wcIntake 1.1s ease-in-out infinite',
};
