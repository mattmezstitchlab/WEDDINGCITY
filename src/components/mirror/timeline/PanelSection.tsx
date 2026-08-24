import { useState } from 'react';
import './timeline.css';

// ---------------------------------------------------------------------------
// ONE FOLDING SECTION — used by the moment panel AND by the event panel.
// ---------------------------------------------------------------------------
// There is one side panel in this product, with two contexts: a moment, opened
// from its card, and the event, opened from the head of the day. They share
// this component so they can never drift into two different mechanics — which
// is exactly the second configuration system the product must not grow.
// ---------------------------------------------------------------------------

/**
 * A FOLDED SECTION THAT STILL SAYS WHAT IT HOLDS.
 *
 * MEASURED before this pass: twelve sections, all open, all the time — a wall
 * of forms taller than four screens on a phone. Folding them would only hide
 * the problem, so a closed section carries its own state in words: « 2
 * personnes · 1 prestataire », « aucun document ». One can read the whole
 * moment without opening anything, and open exactly the one that is wrong.
 *
 * Nothing was removed: every field of the old panel is still here, one click
 * away, writing to the same place.
 */
export function PanelSection({ title, summary, defaultOpen, forceOpen, testId, children }: {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  testId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const isOpen = open || Boolean(forceOpen);
  return (
    <section className="wc-hub-section" data-jourj="hub-section" data-section={testId} data-open={isOpen ? 'yes' : 'no'}>
      <button
        className="wc-hub-section-head"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        data-jourj={`hub-section-${testId}`}
      >
        <span className="wc-hub-section-title">{title}</span>
        <span className="wc-hub-section-summary" data-jourj="hub-section-summary">{summary}</span>
        <span className={`wc-hub-chevron${isOpen ? ' is-open' : ''}`} aria-hidden>▾</span>
      </button>
      {isOpen && <div className="wc-hub-section-body">{children}</div>}
    </section>
  );
}
