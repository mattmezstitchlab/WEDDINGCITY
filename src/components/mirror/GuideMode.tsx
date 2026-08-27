import React from 'react';
import { typography } from '../../design/tokens';
import { PRODUCT_NAME } from '../../design/productIdentity';

export function GuideMode() {
  return (
    <section id="guide-mode" style={sectionStyle} aria-label="Mode d'emploi">
      <div style={innerStyle}>
        <h2 style={titleStyle}>ORGANISER COMMENCE PAR RACONTER</h2>
        <p style={subtitleStyle}>Vous n’avez pas besoin de savoir où ranger l’information. Dites simplement ce qui se passe.</p>

        <ol style={stepsList}>
          <li style={stepItem}><strong>01 — EXPRIMEZ</strong><div style={stepDesc}>Texte, message, URL ou fichier.</div></li>
          <li style={stepItem}><strong>02 — COMPRENEZ</strong><div style={stepDesc}>Le système identifie personnes, lieux, dates, heures, ressources, événements, musique et informations importantes.</div></li>
          <li style={stepItem}><strong>03 — RELIEZ</strong><div style={stepDesc}>Les informations sont mises en relation pour construire le contexte réel de votre événement.</div></li>
          <li style={stepItem}><strong>04 — AGISSEZ</strong><div style={stepDesc}>La timeline, les moments, les ressources et les surfaces de partage deviennent progressivement actionnables.</div></li>
        </ol>

        <div style={exampleBox}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Exemple</div>
          <div style={exampleText}>« Sophie confirme le Château de la Motte pour le 12 septembre. RDV à 14h30. DJ Martin : 1 200 €. Playlist Spotify du mariage. »</div>

          <div style={mapList}>
            <div style={mapItem}><strong>Sophie</strong> → <em>événement</em> → <em>lieu</em> → <em>date</em> → <em>heure</em></div>
            <div style={mapItem}><strong>DJ Martin</strong> → <em>prestation</em> → <em>montant</em> → <em>musique</em></div>
          </div>

          <div style={{ marginTop: 12, color: '#9ba1b0' }}><strong>Vous racontez. Le système organise. Vous décidez.</strong></div>
        </div>
      </div>
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: '44px clamp(18px, 6vw, 80px)',
  borderTop: '1px solid rgba(255,255,255,0.04)',
};

const innerStyle: React.CSSProperties = { maxWidth: 980, margin: '0 auto' };
const titleStyle: React.CSSProperties = { fontFamily: typography.family.sans, fontSize: 20, letterSpacing: '0.06em', fontWeight: 800 };
const subtitleStyle: React.CSSProperties = { color: '#9ba1b0', marginTop: 10, marginBottom: 22 };
const stepsList: React.CSSProperties = { display: 'grid', gap: 12, listStyle: 'none', padding: 0, margin: 0 };
const stepItem: React.CSSProperties = { background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: 10 };
const stepDesc: React.CSSProperties = { marginTop: 6, color: '#9ba1b0', fontSize: 13 };
const exampleBox: React.CSSProperties = { marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12 };
const exampleText: React.CSSProperties = { color: '#f5f5f7', lineHeight: 1.45 };
const mapList: React.CSSProperties = { marginTop: 12, display: 'grid', gap: 6 };
const mapItem: React.CSSProperties = { color: '#dfe6ee', fontSize: 13 };

export default GuideMode;
