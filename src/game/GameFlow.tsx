// Title + result overlays as DOM over the canvas (never 3D text). Restyle these
// to the brief's palette — the default look is a placeholder, not a design.
//
// HARD RULE: no backdrop-filter, no mix-blend-mode, no full-viewport blur over
// the canvas — they force the browser to re-rasterise the WebGL canvas per HUD
// repaint and read as full-screen strobing. Use a high-alpha rgba() panel.

import { type ReactNode } from 'react';
import { useGamePhase, startRun } from './loop';

interface GameFlowProps {
  title: string;
  tagline?: string;
  startLabel?: string;
  resultLabel?: string;
  /** Called from the Start/Restart gesture — the place to request pointer lock. */
  onStart?: () => void;
  /** Optional HUD shown only while playing. */
  hud?: ReactNode;
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(12, 14, 24, 0.82)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 16,
  padding: '32px 40px',
  boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
  textAlign: 'center',
  color: '#f4f6ff',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  maxWidth: 460,
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
};

const buttonStyle: React.CSSProperties = {
  marginTop: 22,
  padding: '12px 28px',
  fontSize: 18,
  fontWeight: 600,
  color: '#0b0e18',
  background: '#8fd6ff',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
};

export default function GameFlow({
  title,
  tagline,
  startLabel = 'Start',
  resultLabel = 'Play again',
  onStart,
  hud,
}: GameFlowProps) {
  const phase = useGamePhase();

  const begin = () => {
    onStart?.();
    startRun();
  };

  if (phase === 'playing') {
    return hud ? <>{hud}</> : null;
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h1 style={{ margin: 0, fontSize: 34, letterSpacing: 0.5 }}>{title}</h1>
        {tagline && <p style={{ margin: '14px 0 0', opacity: 0.85, lineHeight: 1.5 }}>
          {phase === 'gameover' ? resultLabel : tagline}
        </p>}
        <button style={buttonStyle} onClick={begin}>
          {phase === 'gameover' ? 'Restart' : startLabel}
        </button>
      </div>
    </div>
  );
}
