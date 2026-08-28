import React from 'react';
import { typography } from '../../design/tokens';

export function Manifesto() {
  return (
    <section id="manifesto" style={manifestoStyle} aria-label="Manifeste">
      <div style={inner}>
        <h2 style={h2}>DE L'INTENTION AU MONDE<br/><span style={{ fontSize: 13, fontWeight: 400, color: '#9ba1b0', letterSpacing: '0.04em' }}>(sans remplir 47 champs)</span></h2>

        <p style={lead}>
          Pendant des décennies, nous avons appris aux humains à penser comme les logiciels.
          Choisir une rubrique. Remplir un formulaire. Sélectionner une catégorie. Renseigner une date.
          Nous avons décidé d'inverser le paradigme — parce que la vie ne se remplit pas en cases.
        </p>

        <blockquote style={quote}>
          L’humain raconte.
          <br />
          Le système comprend.
          <br />
          Le monde se construit.
        </blockquote>

        <div style={principles}>
          <div style={principle}><strong>01 — VOUS N’AVEZ PAS À COMPRENDRE LA STRUCTURE</strong><div style={pdesc}>Exprimez votre intention avec vos propres mots.</div></div>
          <div style={principle}><strong>02 — L’INFORMATION PREND DU SENS PAR SES RELATIONS</strong><div style={pdesc}>Une personne n’est pas seulement un nom. Elle peut être liée à un événement, un lieu, une prestation, une date ou une action.</div></div>
          <div style={principle}><strong>03 — LE MONDE AVANT LES FORMULAIRES</strong><div style={pdesc}>Le système représente la réalité de l’événement plutôt qu’une collection de champs.</div></div>
          <div style={principle}><strong>04 — L’HUMAIN GARDE LE DERNIER MOT</strong><div style={pdesc}>Chaque compréhension importante peut être vérifiée, corrigée ou refusée.</div></div>
          <div style={principle}><strong>05 — EXPLICABLE PAR CONCEPTION</strong><div style={pdesc}>Lorsqu’une information est détectée, le système explique pourquoi.</div></div>
          <div style={principle}><strong>06 — LA TECHNOLOGIE DOIT DISPARAÎTRE DERRIÈRE L’INTENTION</strong><div style={pdesc}>L’utilisateur ne devrait pas avoir besoin de connaître le moteur pour l’utiliser.</div></div>
        </div>

        <div style={flow}>
          <div style={{ fontWeight: 800 }}>INTENTION</div>
          <div style={{ margin: '6px 0' }}>↓</div>
          <div>COMPRÉHENSION</div>
          <div style={{ margin: '6px 0' }}>↓</div>
          <div>ENTITÉS</div>
          <div style={{ margin: '6px 0' }}>↓</div>
          <div>RELATIONS</div>
          <div style={{ margin: '6px 0' }}>↓</div>
          <div>MONDE</div>
          <div style={{ margin: '6px 0' }}>↓</div>
          <div>CONNEXIONS</div>
          <div style={{ margin: '6px 0' }}>↓</div>
          <div>ACTION</div>
        </div>

        <p style={{ color: '#9ba1b0', marginTop: 18 }}>
          {`AIME — Le Grand Jour`} gère déjà plusieurs types d’événements : mariage, conférence, anniversaire, concert, festival, événements professionnels ou familiaux.
          Ces situations sont des expressions d’un même principe : un monde d’événement composé de personnes, lieux, temps, ressources et relations.
        </p>

        <div style={explore}>
          <h3 style={{ margin: 0 }}>CE QUE NOUS EXPLORONS</h3>
          <p style={{ marginTop: 8, color: '#9ba1b0' }}>
            Et si les logiciels ne nous demandaient plus de comprendre leur fonctionnement ?
            Et si nous pouvions simplement leur dire ce qui nous arrive ?
            Et s’ils pouvaient transformer cette intention en contexte, en possibilités puis en actions ?
          </p>

          <p style={{ marginTop: 14 }}><strong>AIME</strong> est un terrain d’expérimentation pour une idée plus vaste : passer de l’interface qui impose une structure à l’interface qui comprend une intention.</p>

          <p style={{ marginTop: 18, fontWeight: 700 }}>Vous n'avez pas besoin de savoir comment ranger votre monde. Commencez juste par nous dire ce qui est vivant. On s'occupe du reste — sans rien inventer.</p>
        </div>
      </div>
    </section>
  );
}

const manifestoStyle: React.CSSProperties = { padding: '44px clamp(18px, 6vw, 80px)', borderTop: '1px solid rgba(255,255,255,0.04)' };
const inner: React.CSSProperties = { maxWidth: 980, margin: '0 auto' };
const h2: React.CSSProperties = { fontSize: 20, fontWeight: 800 };
const lead: React.CSSProperties = { color: '#9ba1b0', marginTop: 12 };
const quote: React.CSSProperties = { marginTop: 18, padding: 18, background: 'rgba(255,255,255,0.02)', borderRadius: 10, fontWeight: 700 };
const principles: React.CSSProperties = { display: 'grid', gap: 10, marginTop: 16 };
const principle: React.CSSProperties = { padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 };
const pdesc: React.CSSProperties = { marginTop: 8, color: '#9ba1b0' };
const flow: React.CSSProperties = { marginTop: 20, display: 'grid', gap: 4, maxWidth: 240 }; 
const explore: React.CSSProperties = { marginTop: 24 };

export default Manifesto;
