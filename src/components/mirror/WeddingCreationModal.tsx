import { useEffect, useRef, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { typography, radius } from '../../design/tokens';
import { EDITORIAL_ASSETS } from '../../design/editorialAssets';
import { M, fluid } from './MirrorPrimitives';

// ---------------------------------------------------------------------------
// WEDDING CREATION — the editorial way in.
// ---------------------------------------------------------------------------
// The World has its own creation panel, which belongs to its dark, spatial
// language. Arriving from the public landing and falling into that panel broke
// the illusion: the visitor left the site and landed in the machine.
//
// This is the SAME creation, dressed for the Mirror: a full surface, ivory
// paper, one question at a time, monumental type. It owns NO business logic —
// the last step calls weddingStore.createRealWedding, exactly like the World
// panel does. One model, two doors.
// ---------------------------------------------------------------------------

type Step = 0 | 1 | 2;

const STEPS: { index: string; question: string; hint: string }[] = [
  { index: '01', question: 'Qui se marie ?', hint: 'Les deux prénoms, tels que vous les direz.' },
  { index: '02', question: 'Quand ?', hint: 'La date peut changer plus tard, rien n’est figé.' },
  { index: '03', question: 'Où ?', hint: 'Le lieu principal. Les autres espaces viendront ensuite.' },
];

export function WeddingCreationModal() {
  const store = weddingStore;
  const [step, setStep] = useState<Step>(0);
  const [one, setOne] = useState('');
  const [two, setTwo] = useState('');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');

  const surfaceRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const close = () => store.cancelWeddingCreation();

  // Escape closes, Tab stays inside: a modal that traps nothing is a trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const root = surfaceRef.current;
      if (!root) return;
      const focusables = [...root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    // The page behind must not scroll under the modal (no double scrollbar).
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => { firstFieldRef.current?.focus(); }, [step]);

  const names = [one.trim(), two.trim()].filter(Boolean);
  const canContinue = step === 0 ? names.length === 2 : true;

  const submit = () => {
    if (names.length < 2) return;
    // THE one creation path — same method the World panel calls.
    store.createRealWedding({
      coupleNames: `${names[0]} & ${names[1]}`,
      weddingDate: date || '',
      locationName: place.trim(),
      userRole: 'wedding_planner',
      userName: names[0],
    });
  };

  const next = () => {
    if (step < 2) setStep((step + 1) as Step);
    else submit();
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Créer mon mariage">
      <div ref={surfaceRef} className="wc-creation-surface" style={surfaceStyle}>
        {/* ---- masthead ---- */}
        <div className="wc-creation-top" style={topRowStyle}>
          <span style={brandStyle}>AIME · Wedding City</span>
          <button onClick={close} style={closeStyle} aria-label="Fermer et revenir au site">
            Fermer
          </button>
        </div>

        <div style={bodyStyle}>
          {/* ---- progress: three questions, never a form ---- */}
          <div style={stepsRowStyle} aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.index} style={stepDotStyle(i === step, i < step)}>
                {s.index}
              </span>
            ))}
          </div>

          <h1 style={titleStyle}>
            {step === 0 ? 'Créons votre monde.' : STEPS[step].question}
          </h1>
          <p style={hintStyle}>{STEPS[step].hint}</p>

          {/* ---- 01 the two names, with the ampersand as a real object ---- */}
          {step === 0 && (
            <div className="wc-creation-names" style={namesStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Prénom</span>
                <input
                  ref={firstFieldRef}
                  value={one}
                  onChange={(e) => setOne(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canContinue) next(); }}
                  placeholder="Clara"
                  style={inputStyle}
                  autoComplete="off"
                />
              </label>

              <span className="wc-creation-amp" style={ampStyle} aria-hidden>&amp;</span>

              <label style={fieldStyle}>
                <span style={labelStyle}>Prénom</span>
                <input
                  value={two}
                  onChange={(e) => setTwo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canContinue) next(); }}
                  placeholder="Alexandre"
                  style={inputStyle}
                  autoComplete="off"
                />
              </label>
            </div>
          )}

          {/* ---- 02 the date ---- */}
          {step === 1 && (
            <div style={singleFieldStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Date du mariage</span>
                <input
                  ref={firstFieldRef}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') next(); }}
                  style={inputStyle}
                />
              </label>
              <button onClick={next} style={skipStyle}>Je ne sais pas encore</button>
            </div>
          )}

          {/* ---- 03 the place ---- */}
          {step === 2 && (
            <div style={singleFieldStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Lieu principal</span>
                <input
                  ref={firstFieldRef}
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') next(); }}
                  placeholder="Domaine, château, maison de famille…"
                  style={inputStyle}
                  autoComplete="off"
                />
              </label>
              <button onClick={next} style={skipStyle}>Le lieu n’est pas encore choisi</button>
            </div>
          )}

          {/* ---- what is about to happen, said plainly ---- */}
          {step === 2 && (
            <p style={promiseStyle}>
              Votre monde va être créé vide : aucun invité, aucun prestataire,
              aucun moment inventé. Tout ce qui s’y trouvera sera ce que vous y
              mettrez.
            </p>
          )}

          <div style={actionsStyle}>
            {step > 0 && (
              <button onClick={() => setStep((step - 1) as Step)} style={backStyle}>
                Retour
              </button>
            )}
            <button
              onClick={next}
              disabled={!canContinue}
              style={{ ...primaryStyle, opacity: canContinue ? 1 : 0.4, cursor: canContinue ? 'pointer' : 'not-allowed' }}
            >
              {step === 2 ? 'Générer notre monde' : 'Continuer'}
              <span aria-hidden style={{ marginLeft: 10 }}>→</span>
            </button>
          </div>

          {step === 0 && names.length < 2 && (
            <p style={requiredStyle}>Les deux prénoms sont nécessaires pour commencer.</p>
          )}
        </div>

        {/* ---- the editorial side: a product illustration, never a wedding's
             own photograph — see design/editorialAssets. ---- */}
        <div style={asideStyle}>
          <img
            src={EDITORIAL_ASSETS.matter.src}
            alt={EDITORIAL_ASSETS.matter.alt}
            width={EDITORIAL_ASSETS.matter.width}
            height={EDITORIAL_ASSETS.matter.height}
            loading="lazy"
            decoding="async"
            style={asideImgStyle}
          />
        </div>
      </div>
    </div>
  );
}

// --- styles -----------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 950,
  background: 'rgba(20, 18, 15, 0.55)',
  display: 'flex', alignItems: 'stretch', justifyContent: 'center',
  fontFamily: typography.family.sans,
};

// Columns live in mirror.css (.wc-creation-surface): on a wide screen the
// picture stands in its own column, on a phone everything stacks.
const surfaceStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%', maxWidth: 1180, margin: `${fluid(0, 40)} auto`,
  background: M.bg, color: M.textPrimary,
  borderRadius: 0,
  overflowY: 'auto',
};

const topRowStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: `14px ${fluid(20, 48)}`,
  background: M.bg, borderBottom: `1px solid ${M.line}`,
};

const brandStyle: React.CSSProperties = {
  fontSize: typography.editorial.caption, letterSpacing: '0.16em',
  textTransform: 'uppercase', fontWeight: typography.weight.bold, color: M.textPrimary,
};

const closeStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  font: 'inherit', fontSize: typography.editorial.caption, color: M.textSecondary,
  padding: '8px 4px', letterSpacing: '0.06em',
};

const bodyStyle: React.CSSProperties = {
  padding: `${fluid(34, 70)} ${fluid(20, 48)} ${fluid(30, 56)}`,
  maxWidth: 720,
};

const stepsRowStyle: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: fluid(22, 34) };

const stepDotStyle = (active: boolean, done: boolean): React.CSSProperties => ({
  fontFamily: typography.family.mono, fontSize: typography.editorial.micro,
  letterSpacing: '0.08em',
  color: active ? M.textPrimary : done ? M.textSecondary : M.textMuted,
  borderBottom: `2px solid ${active ? M.textPrimary : 'transparent'}`,
  paddingBottom: 4,
});

const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: fluid(32, 68), lineHeight: 0.98,
  fontWeight: typography.weight.semibold, letterSpacing: '-0.035em',
};

const hintStyle: React.CSSProperties = {
  margin: `${fluid(14, 20)} 0 0`, maxWidth: 460,
  fontSize: fluid(14, 17), lineHeight: typography.leading.relaxed, color: M.textSecondary,
};

// Layout in mirror.css (.wc-creation-names): on a phone the ampersand becomes
// a centred separator between the two names instead of hanging off the first.
const namesStyle: React.CSSProperties = {
  gap: fluid(14, 26),
  marginTop: fluid(30, 46),
};

const singleFieldStyle: React.CSSProperties = {
  display: 'grid', gap: 14, marginTop: fluid(30, 46), maxWidth: 460,
};

const fieldStyle: React.CSSProperties = { display: 'grid', gap: 8, flex: 1, minWidth: 200 };

const labelStyle: React.CSSProperties = {
  fontSize: typography.editorial.micro, letterSpacing: '0.15em',
  textTransform: 'uppercase', color: M.textMuted, fontWeight: typography.weight.bold,
};

const inputStyle: React.CSSProperties = {
  font: 'inherit', fontSize: fluid(20, 30), color: M.textPrimary,
  background: 'transparent', border: 'none',
  borderBottom: `1px solid ${M.lineStrong}`,
  padding: '8px 0', outline: 'none', width: '100%',
  letterSpacing: '-0.02em',
};

const ampStyle: React.CSSProperties = {
  fontSize: fluid(30, 54), lineHeight: 1.6, color: M.textMuted,
  fontStyle: 'italic', fontWeight: typography.weight.regular,
};

const skipStyle: React.CSSProperties = {
  appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
  padding: 0, justifySelf: 'start',
  font: 'inherit', fontSize: typography.editorial.caption, color: M.textMuted,
  borderBottom: `1px solid ${M.line}`,
};

const promiseStyle: React.CSSProperties = {
  margin: `${fluid(24, 32)} 0 0`, maxWidth: 460,
  fontSize: typography.editorial.caption, lineHeight: 1.65, color: M.textMuted,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
  marginTop: fluid(30, 44),
};

const primaryStyle: React.CSSProperties = {
  appearance: 'none', border: 'none',
  background: M.textPrimary, color: M.surface,
  borderRadius: radius.pill, padding: '14px 28px',
  fontSize: typography.editorial.body, fontWeight: typography.weight.semibold,
  letterSpacing: '0.02em',
};

const backStyle: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer',
  background: 'transparent', color: M.textSecondary,
  border: `1px solid ${M.lineStrong}`,
  borderRadius: radius.pill, padding: '13px 20px',
  font: 'inherit', fontSize: typography.editorial.body,
};

const requiredStyle: React.CSSProperties = {
  margin: '14px 0 0', fontSize: typography.editorial.caption, color: M.textMuted,
};

const asideStyle: React.CSSProperties = {
  position: 'relative', minHeight: 220, overflow: 'hidden',
};

const asideImgStyle: React.CSSProperties = {
  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
};
