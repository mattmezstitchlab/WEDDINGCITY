import React, { useState, useEffect, useRef } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { typography } from '../../design/tokens';

export function IntentToolbar() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // no persistent subscription required — this toolbar reads from store on demand
    return () => undefined;
  }, []);

  function suggest(text: string) {
    setValue(text);
    setOpen(true);
    inputRef.current?.focus();
  }

  function showTransient(message: string) {
    setHint(message);
    window.setTimeout(() => setHint(null), 4200);
  }

  function handleCommand(raw: string) {
    const cmd = (raw || '').trim().toLowerCase();
    if (!cmd) return;

    // Navigation intents
    if (/invité|invites|invités|inviter/.test(cmd)) {
      document.getElementById('organisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showTransient('Ouverture : Organisation — invités');
      setValue(''); setOpen(false); return;
    }

    if (/prestataire|prestataires|dj|photographe|traiteur|vendor|vendeur/.test(cmd)) {
      // go to organisation and attempt to open vendors canvas when possible
      document.getElementById('organisation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try { (weddingStore as any).openCanvas?.(undefined, 'vendors'); } catch (e) {}
      showTransient('Affichage des prestataires');
      setValue(''); setOpen(false); return;
    }

    if (/budget|coût|coûts|dépense/.test(cmd)) {
      // show budget summary using existing store function
      try {
        const b = weddingStore.getTimelineBudget();
        showTransient(`Budget: ${b.committed}€ engagé • ${b.deposits}€ acomptes • ${b.paid}€ payé`);
      } catch (e) { showTransient('Impossible de calculer le budget'); }
      setValue(''); setOpen(false); return;
    }

    if (/timeline|déroulé|programme|jour j|jour j|jourj/.test(cmd)) {
      // switch to timeline view
      try { weddingStore.setViewMode('timeline'); } catch (e) {}
      document.getElementById('jour-j')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showTransient('Affichage de la timeline');
      setValue(''); setOpen(false); return;
    }

    if (/comment|commenter|comment faire|comment ajouter|comment puis-je/.test(cmd)) {
      // open guide modal if available
      try { (weddingStore as any).guideDocModalOpen = true; weddingStore.notify(); } catch (e) {}
      showTransient('Guide d’utilisation ouvert');
      setValue(''); setOpen(false); return;
    }

    if (/où en est|où en est mon budget|qu’est-ce qu’il me manque|manque/.test(cmd)) {
      // try to provide honest response about missing info — shallow: list missing essentials
      const missing: string[] = [];
      try {
        if (weddingStore.places.length === 0) missing.push('Lieu');
        if ((weddingStore.persons ?? []).length === 0) missing.push('Invités / personnes');
        if ((weddingStore.phases ?? []).length === 0) missing.push('Moments (timeline)');
      } catch (e) {}
      if (missing.length === 0) showTransient('Votre événement semble complet pour les éléments essentiels.');
      else showTransient(`Il manque : ${missing.join(', ')}`);
      setValue(''); setOpen(false); return;
    }

    // Fallback: offer suggestions honestly
    setHint('Commande non reconnue — suggestions affichées');
    setTimeout(() => setHint(null), 2400);
    setValue(''); setOpen(false);
  }

  return (
    <div style={wrapper} role="region" aria-label="Barre d'intention">
      <div style={barStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150 }}>
          <strong style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ffffff' }}>AI + ME</strong>
          <span style={{ fontSize: 12, color: '#9ba1b0' }}>Naviguer · lire · traduire</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => suggest('Ajouter un prestataire')} style={chip}>Ajouter une info</button>
          <button onClick={() => suggest("Où en est mon budget ?")} style={chip}>Où en est mon budget ?</button>
          <button onClick={() => suggest('Passer en mode vidéo')} style={chip}>Play</button>
          <button onClick={() => suggest('Aller au prochain moment')} style={chip}>Suivant</button>
        </div>

        <div style={{ flex: 1 }}>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCommand(value); if (e.key === 'Escape') { setOpen(false); setValue(''); } }}
            placeholder="Que voulez-vous faire ? Ex. “Ajouter le photographe”"
            style={inputStyle}
            aria-label="Barre d'intention" />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hint ? <div style={hintStyle}>{hint}</div> : null}
          <button onClick={() => handleCommand(value)} style={actionBtn}>OK</button>
        </div>
      </div>
    </div>
  );
}

const wrapper: React.CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 18, zIndex: 1200, display: 'flex', justifyContent: 'center', pointerEvents: 'auto',
};

const barStyle: React.CSSProperties = {
  width: 'min(1100px, calc(100% - 56px))', background: 'rgba(8,9,11,0.96)', borderRadius: 20, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 14px 40px rgba(2,2,3,0.6)'
};
const chip: React.CSSProperties = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', color: '#e8eef6', padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13 };
const inputStyle: React.CSSProperties = { background: 'transparent', border: 'none', outline: 'none', color: '#f6f6f8', fontSize: 14, width: '100%', fontFamily: typography.family.sans };
const actionBtn: React.CSSProperties = { background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#f6f6f8', padding: '8px 12px', borderRadius: 10, cursor: 'pointer' };
const hintStyle: React.CSSProperties = { color: '#9ba1b0', fontSize: 13 };

export default IntentToolbar;
