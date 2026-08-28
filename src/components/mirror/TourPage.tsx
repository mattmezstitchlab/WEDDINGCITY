import React, { useMemo, useState } from 'react';
import { EVENT_TYPES } from '../../design/eventTypes';
import { typography } from '../../design/tokens';

const TOUR_VISUALS = [
  '/editorial/grandjour-hero.jpg',
  '/editorial/canvas.jpg',
  '/editorial/spectacle/regie.jpg',
  '/editorial/immersive.jpg',
];

export function TourPage() {
  const [message, setMessage] = useState('');
  const [index, setIndex] = useState(0);

  const visual = TOUR_VISUALS[index % TOUR_VISUALS.length];
  const eventType = useMemo(() => EVENT_TYPES[index % EVENT_TYPES.length], [index]);

  return (
    <main style={page}>
      <header style={hero}>
        <div style={tag}>Guide tour agent</div>
        <h1 style={title}>Une page simple qui montre tout de suite l’idée.</h1>
        <p style={lead}>
          Grands visuels. Un agent qui comprend l’intention. Un champ pour parler comme on parle vraiment.
        </p>
      </header>

      <section style={visualBlock}>
        <img src={visual} alt={eventType.label} style={image} />
        <div style={overlay}>
          <div style={eyebrow}>{eventType.label}</div>
          <h2 style={visualTitle}>{eventType.label}</h2>
          <p style={visualCopy}>
            {index === 0 && 'Mariage de A à Z'}
            {index === 1 && 'Spectacle : visuel + éditorial'}
            {index === 2 && 'Une vitrine claire'}
            {index === 3 && 'Une intention, un guide'}
          </p>
        </div>
      </section>

      <section style={chatBlock}>
        <div style={chatHeader}>Agent</div>
        <div style={chatBubble}>
          Je peux lire votre intention, proposer un parcours, puis guider la suite.
        </div>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Dites ce que vous voulez faire…"
          aria-label="Dialogue avec l'agent"
          style={input}
        />
        <div style={actions}>
          <button type="button" style={button} onClick={() => setIndex((v) => (v + 1) % TOUR_VISUALS.length)}>Changer le visuel</button>
          <button type="button" style={buttonPrimary}>Lancer le guide</button>
        </div>
      </section>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', padding: '40px clamp(18px, 5vw, 72px)', background: '#08090b', color: '#f6f5f3' };
const hero: React.CSSProperties = { maxWidth: 920, marginBottom: 24 };
const tag: React.CSSProperties = { fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9ba1b0' };
const title: React.CSSProperties = { margin: '10px 0 0', fontSize: 'clamp(34px, 7vw, 84px)', lineHeight: 0.95, letterSpacing: '-0.04em' };
const lead: React.CSSProperties = { marginTop: 14, maxWidth: 720, color: '#c8ccd4', fontSize: 18, lineHeight: 1.55 };
const visualBlock: React.CSSProperties = { position: 'relative', minHeight: 420, borderRadius: 28, overflow: 'hidden', marginTop: 24 };
const image: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const overlay: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 28, background: 'linear-gradient(180deg, transparent, rgba(8,9,11,0.88))' };
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#dfe6ee' };
const visualTitle: React.CSSProperties = { margin: '8px 0 0', fontSize: clamp(24, 5, 56), lineHeight: 1.02 };
const visualCopy: React.CSSProperties = { margin: '8px 0 0', color: '#c8ccd4', fontSize: 16 };
const chatBlock: React.CSSProperties = { marginTop: 22, maxWidth: 760, padding: 20, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
const chatHeader: React.CSSProperties = { fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ba1b0' };
const chatBubble: React.CSSProperties = { marginTop: 10, padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.06)', lineHeight: 1.6 };
const input: React.CSSProperties = { width: '100%', marginTop: 14, padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(8,9,11,0.92)', color: '#f6f5f3', font: 'inherit', fontFamily: typography.family.sans };
const actions: React.CSSProperties = { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' };
const button: React.CSSProperties = { padding: '12px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: '#f6f5f3', cursor: 'pointer' };
const buttonPrimary: React.CSSProperties = { ...button, background: '#f6f5f3', color: '#08090b', fontWeight: 700 };

function clamp(min: number, preferredVw: number, max: number) {
  return `clamp(${min}px, ${preferredVw}vw, ${max}px)`;
}

export default TourPage;
