import { useEffect, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';
import { analyseIntake, summariseIntake, type IntakePlan, type IntakeSource } from '../../../game/projectIntake';
import { eventType, type EventTypeId } from '../../../design/eventTypes';
import { CERTAINTY, type Certainty } from '../../../design/certainty';

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

type Stage = 'reading' | 'clarify' | 'review' | 'done';
type ClarificationKey = 'principals' | 'date' | 'place' | 'headcount';

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
  const [clarificationDraft, setClarificationDraft] = useState('');
  const [deferred, setDeferred] = useState<ClarificationKey[]>([]);

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
      const hasMissingHeadline = Object.values(result.certainty).some((level) => level === 'missing');
      setStage(hasMissingHeadline ? 'clarify' : 'review');
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
    // Touching an hour by hand makes it a decision: it becomes CONFIRMÉ.
    moments[index] = {
      ...moments[index], ...patch,
      confidence: patch.endHour !== undefined || patch.startHour !== undefined
        ? 'confirmed' : moments[index].confidence,
    };
    setPlan({ ...plan, moments });
  };

  const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  const parse = (v: string) => {
    const m = /^(\d{1,2})\s*[:h]\s*(\d{2})?$/.exec(v.trim());
    return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0) : null;
  };

  const clarificationOrder: ClarificationKey[] = ['principals', 'date', 'place', 'headcount'];
  const clarification = plan
    ? clarificationOrder.find((key) => plan.certainty[key] === 'missing' && !deferred.includes(key)) ?? null
    : null;
  useEffect(() => {
    if (stage === 'clarify' && plan && !clarification) setStage('review');
  }, [stage, plan, clarification]);

  const clarificationCopy: Record<ClarificationKey, { question: string; hint: string; type: string }> = {
    principals: {
      question: schema.principalsQuestion ?? `Quel nom donner à cet événement ?`,
      hint: 'Cette information identifie votre événement. Nous ne la devinerons pas.',
      type: 'text',
    },
    date: { question: 'Quelle est la date du Jour J ?', hint: 'Vous pourrez toujours la modifier.', type: 'date' },
    place: { question: 'Quel est le lieu principal ?', hint: 'Un nom de lieu suffit pour commencer.', type: 'text' },
    headcount: {
      question: `Combien de ${schema.headcountLabel} prévoyez-vous ?`,
      hint: 'Une estimation est suffisante et restera clairement modifiable.',
      type: 'number',
    },
  };

  const answerClarification = (skip = false) => {
    if (!plan || !clarification) { setStage('review'); return; }
    const value = clarificationDraft.trim();
    if (skip) {
      setDeferred([...deferred, clarification]);
    } else if (value) {
      const patch: Partial<IntakePlan> = clarification === 'principals'
        ? { coupleNames: value }
        : clarification === 'date'
          ? { weddingDate: value }
          : clarification === 'place'
            ? { locationName: value }
            : { guestCountTarget: Number(value) || null };
      setPlan({ ...plan, ...patch, certainty: { ...plan.certainty, [clarification]: 'confirmed' } });
    } else return;
    setClarificationDraft('');
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
      eventTypeId: plan.eventTypeId,
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
            <div style={eyebrow}>Analyse de votre événement</div>
            <div style={title}>{step}…</div>
            <p style={{ ...muted, marginTop: 8 }}>{schema.intakeLine}</p>
            <p style={muted}>
              Tout est lu ici, dans votre navigateur : aucun fichier n’est envoyé
              nulle part.
            </p>
            <div style={barTrack}><div style={barFill} /></div>
          </div>
        )}

        {stage === 'clarify' && plan && clarification && (
          <div style={{ padding: '48px 0', maxWidth: 680 }} data-intake="clarify">
            <div style={eyebrow}>
              Une information à la fois · {clarificationOrder.filter((key) => plan.certainty[key] !== 'missing' || deferred.includes(key)).length + 1}/4
            </div>
            <div style={title}>{clarificationCopy[clarification].question}</div>
            <p style={{ ...muted, marginTop: 14 }}>{clarificationCopy[clarification].hint}</p>
            <input
              autoFocus
              type={clarificationCopy[clarification].type}
              min={clarification === 'headcount' ? 1 : undefined}
              value={clarificationDraft}
              onChange={(e) => setClarificationDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') answerClarification(); }}
              style={{ ...input, marginTop: 30, width: 'min(100%, 520px)', fontSize: 24 }}
              data-intake="clarification-field"
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <button onClick={() => answerClarification()} disabled={!clarificationDraft.trim()} style={{ ...primary, opacity: clarificationDraft.trim() ? 1 : 0.45 }} data-intake="clarification-next">
                Continuer <span aria-hidden>→</span>
              </button>
              {clarification !== 'principals' && (
                <button onClick={() => answerClarification(true)} style={ghost} data-intake="clarification-later">
                  Je ne sais pas encore
                </button>
              )}
            </div>
          </div>
        )}


        {stage === 'review' && plan && (
          <div data-intake="review">
            <div style={eyebrow}>Analyse de votre événement</div>
            <div style={title}>Voici ce que nous avons compris</div>
            <p style={{ ...muted, marginTop: 14, maxWidth: 620 }}>
              Rien n’est encore créé. Corrigez ce qui est faux, retirez ce qui n’a
              rien à faire là, puis validez.
            </p>

            {/* CE QUE LE MOTEUR A COMPRIS — one line per thing, each with the
                degree of certainty it really reached. Nothing is stated more
                firmly than it was read. */}
            <dl style={recapGrid} data-intake="recap">
              <Recap label="Type" value={schema.label} level="confirmed" />
              <Recap label="Date" value={plan.weddingDate} level={plan.certainty.date} />
              <Recap label="Lieu" value={plan.locationName} level={plan.certainty.place} />
              <Recap
                label={schema.principalsLabel ?? 'Intitulé'}
                value={plan.coupleNames}
                level={plan.certainty.principals}
              />
              <Recap
                label={schema.headcountLabel === 'participants' ? 'Participants' : 'Personnes'}
                value={plan.guestCountTarget ? `${plan.guestCountTarget} ${schema.headcountLabel}` : null}
                level={plan.certainty.headcount}
              />
              <Recap
                label="Moments"
                value={plan.moments.length ? `${plan.moments.length} identifiés` : null}
                level={plan.proposedDay ? 'estimated' : plan.moments.length ? 'confirmed' : 'missing'}
              />
              <Recap
                label="Prestataires"
                value={plan.vendors.length ? plan.vendors.map((v) => v.name).join(', ') : null}
                level={plan.vendors.length ? 'confirmed' : 'missing'}
              />
              <Recap
                label="Artistes"
                value={null}
                level="to_confirm"
                note="Le métier d’une personne ne se devine pas : déclarez-le sur sa fiche, dans « Spectacle »."
              />
              <Recap
                label="Musique"
                value={plan.tracks.length ? `${plan.tracks.length} morceau(x)` : null}
                level={plan.tracks.length ? 'confirmed' : 'missing'}
              />
              <Recap
                label="Documents"
                value={plan.documents.length ? `${plan.documents.length} analysé(s)` : null}
                level={plan.documents.length ? 'confirmed' : 'missing'}
              />
              <Recap
                label="Contraintes"
                value={plan.questions.length ? `${plan.questions.length} à confirmer` : 'aucune'}
                level={plan.questions.length ? 'to_confirm' : 'confirmed'}
              />
            </dl>

            {plan.proposedDay && (
              <div style={proposalBox} data-intake="proposed-day">
                <div style={{ fontWeight: 600, fontSize: typography.editorial.body }}>
                  Voici la première structure proposée.
                </div>
                <p style={{ ...muted, marginTop: 8 }}>
                  Aucune heure n’a été lue dans ce que vous avez donné. Ces {plan.moments.length} moments
                  sont la trame habituelle d’un événement « {schema.label} » : ils sont tous marqués
                  ESTIMÉ, ils ne sont la vérité de personne, et chacun se déplace. Ils existent pour
                  que votre journée ne commence pas devant une page blanche.
                </p>
              </div>
            )}

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
                    <span
                      style={{
                        ...chip, cursor: 'default',
                        borderColor: CERTAINTY[m.confidence].color,
                        color: CERTAINTY[m.confidence].color,
                      }}
                      title={CERTAINTY[m.confidence].meaning}
                      data-intake="moment-confidence"
                      data-level={m.confidence}
                    >
                      {CERTAINTY[m.confidence].mark} {CERTAINTY[m.confidence].label}
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
                Créer la timeline du Jour J <span aria-hidden>→</span>
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

/**
 * One understood fact, with the exact degree of certainty behind it.
 * A missing value is written « MANQUANT » — never filled with a plausible one.
 */
function Recap({ label, value, level, note }: {
  label: string; value: string | null; level: Certainty; note?: string;
}) {
  const settled = Boolean(value);
  const shown: Certainty = settled ? level : (level === 'missing' ? 'missing' : level);
  return (
    <div style={recapCell} data-intake="recap-line" data-label={label} data-level={shown}>
      <dt style={eyebrow}>{label}</dt>
      <dd style={{ margin: '6px 0 0', fontSize: typography.editorial.body }}>
        {value ?? <span style={{ color: 'rgba(246,245,243,0.45)' }}>—</span>}
      </dd>
      <div style={{ marginTop: 6, fontSize: 10, letterSpacing: '0.16em', color: CERTAINTY[shown].color }}>
        {CERTAINTY[shown].label}
      </div>
      {note && <p style={{ ...muted, marginTop: 6, fontSize: 11 }}>{note}</p>}
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

const recapGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 1, margin: '28px 0 0', padding: 0,
  background: 'rgba(246,245,243,0.14)', border: '1px solid rgba(246,245,243,0.14)',
};

const recapCell: React.CSSProperties = { background: '#08090b', padding: '16px 18px' };

const proposalBox: React.CSSProperties = {
  marginTop: 24, padding: '18px 20px',
  border: '1px solid rgba(224,160,106,0.5)', borderLeft: '3px solid #e0a06a',
  background: 'rgba(224,160,106,0.06)',
};

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
