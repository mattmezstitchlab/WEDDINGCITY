#!/usr/bin/env node
/**
 * AIME — the Mirror as a public landing.
 *
 * Two states, one surface:
 *   · no wedding opened in this browser → LANDING (product, no project data);
 *   · a wedding open                    → the editorial projection of it.
 *
 * Everything below is rendered in a real DOM (jsdom) with the real store, or
 * asserted on the source where behaviour cannot be rendered.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderComponent, SRC } from './lib/render-harness.mjs';
import { createReporter } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — Mirror landing & wedding creation\u001b[0m');

const LANDING_ENTRY = `
import { createRoot } from 'react-dom/client';
import { MirrorSite } from '../../../src/components/mirror/MirrorSite';
export async function mount() { createRoot(document.getElementById('root')).render(<MirrorSite />); }
`;

const OPENED_ENTRY = `
import { createRoot } from 'react-dom/client';
import { weddingStore } from '../../../src/game/weddingStore';
import { MirrorSite } from '../../../src/components/mirror/MirrorSite';
export async function mount() {
  weddingStore.loadProject('proj_demo_clara_alexandre');
  createRoot(document.getElementById('root')).render(<MirrorSite />);
}
`;

const views = [];
const render = async (entry, options) => {
  const v = await renderComponent(entry, options);
  views.push(v);
  return v;
};

try {
  // ---------------------------------------------------------------------------
  console.log('\n[1/4] A first-time visitor gets the landing, never the demo');
  // ---------------------------------------------------------------------------
  {
    const { document: doc } = await render(LANDING_ENTRY, { width: 1440 });
    const text = doc.body.textContent.replace(/\s+/g, ' ');

    r.check(/devient un monde/.test(text), 'the landing hero is shown');
    r.check(doc.querySelectorAll('h1').length === 1, 'with a single h1');

    // No project data whatsoever — the demo must not be used as a fallback.
    const demoData = ['Clara Dubois', 'Gare TGV', 'Manoir d’Honneur', 'Château de Bellevue',
      'Signed, Sealed, Delivered', 'Cérémonie Laïque']
      .filter((w) => text.includes(w));
    r.check(demoData.length === 0, 'no demo CONTENT is rendered', demoData.join(', '));

    // The wedding list is an affordance, not content: names may appear there.
    const list = [...doc.querySelectorAll('button')]
      .filter((b) => /Clara & Alexandre/.test(b.textContent));
    r.check(list.length <= 1, 'existing weddings are offered as a list, once', String(list.length));

    // The three surfaces are explained without jargon.
    for (const word of ['World', 'Mirror', 'Canvas']) {
      r.check(text.includes(word), `the landing explains ${word}`);
    }
    const jargon = ['store', 'localStorage', 'projection pure', 'World Model', 'MediaAsset']
      .filter((w) => text.includes(w));
    r.check(jargon.length === 0, 'and uses no technical vocabulary', jargon.join(', '));

    // One CTA, several places, one handler.
    const ctas = [...doc.querySelectorAll('button')]
      .filter((b) => /Créer mon mariage/.test(b.textContent));
    r.check(ctas.length >= 3, `the CTA appears in nav, hero and closing (${ctas.length})`);
    const landingSrc = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorLanding.tsx'), 'utf8');
    r.check((landingSrc.match(/onClick=\{create\}/g) || []).length >= 3,
      'and they all call the same single handler');
    r.check(/store\.startWeddingCreation\(\)/.test(landingSrc),
      'which is the store\u2019s one creation entry point');

    const storeSrc = readFileSync(path.join(SRC, 'game', 'weddingStore.ts'), 'utf8');
    r.check(/public startWeddingCreation\(\): void \{[\s\S]{0,200}createWeddingModalOpen = true/.test(storeSrc),
      'and it opens the EXISTING creation modal — no second creation system');
    r.check(!/createRealWedding\(/.test(landingSrc),
      'the landing never reimplements the creation logic');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[2/4] With a wedding open, the Mirror is its projection again');
  // ---------------------------------------------------------------------------
  {
    const { document: doc } = await render(OPENED_ENTRY, { width: 1440 });
    const text = doc.body.textContent.replace(/\s+/g, ' ');
    r.check(!/devient un monde/.test(text), 'the landing steps aside');
    r.check(/Clara/.test(text), 'and the wedding is the subject again');
    const sections = [...doc.querySelectorAll('section[id^="mirror-"]')];
    r.check(sections.length >= 6, `its sections render (${sections.length})`);
  }

  // ---------------------------------------------------------------------------
  console.log('\n[3/4] The chrome obeys the two states');
  // ---------------------------------------------------------------------------
  {
    const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    const site = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorSite.tsx'), 'utf8');
    const nav = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorNav.tsx'), 'utf8');
    const switcher = readFileSync(path.join(SRC, 'components', 'ui', 'ProjectionSwitcher.tsx'), 'utf8');
    const store = readFileSync(path.join(SRC, 'game', 'weddingStore.ts'), 'utf8');

    r.check(/if \(!store\.projectChosen\) return <MirrorLanding \/>;/.test(site),
      'the Mirror switches state on projectChosen, not on data');
    r.check(/\{weddingStore\.projectChosen && <ProjectionSwitcher \/>\}/.test(app),
      'the projection capsule is hidden until a wedding is open');
    r.check(/!weddingStore\.projectChosen\) weddingStore\.startWeddingCreation\(\)/.test(app),
      'and the Canvas shortcut asks for a wedding instead of opening the demo');

    // Navigation at the very top, capsule below the content.
    r.check(/position: 'sticky', top: 0/.test(nav), 'the site navigation owns the top');
    r.check(/onLight[\s\S]{0,140}bottom: 'max\(18px/.test(switcher),
      'the capsule sits at the bottom in the Mirror');
    r.check(!/backdropFilter|backdrop-filter/i.test(
      readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorLanding.tsx'), 'utf8')),
      'no glassmorphism on the landing');

    // The flag is real, and every way in sets it.
    r.check(/this\.projectChosen = hasChosenProject\(\)/.test(store),
      'the state comes from storage, not from a guess');
    r.check((store.match(/this\.markProjectChosen\(\);/g) || []).length >= 3,
      'creating a wedding, generating a world and opening a project all set it');
    r.check(/if \(!this\.projectChosen\) this\.projection = 'mirror'/.test(store),
      'and a first-time visitor boots on the Mirror');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[4/4] Landing at 390px: nothing is cut off');
  // ---------------------------------------------------------------------------
  {
    const css = readFileSync(path.join(SRC, 'components', 'mirror', 'mirror.css'), 'utf8');
    const landing = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorLanding.tsx'), 'utf8');
    // MEASURED at 390px: brand + links + CTA did not fit and the CTA was cut.
    r.check(/\.wc-landing-links \{\s*display: flex;/.test(css)
      && !/display: 'flex', gap: fluid\(12, 28\)/.test(landing),
      'the nav links declare display in CSS, so the phone rule can win');
    r.check(/@media \(max-width: 680px\)[\s\S]{0,400}\.wc-landing-links \{\s*display: none;/.test(css),
      'they step aside on a phone');
    r.check(/\.wc-landing-brand-suffix \{\s*display: none;/.test(css),
      'and the brand shortens so the CTA always fits');

    const { document: doc } = await render(LANDING_ENTRY, { width: 390 });
    const ctas = [...doc.querySelectorAll('button')].filter((b) => /Créer mon mariage/.test(b.textContent));
    r.check(ctas.length >= 3, 'every CTA is still rendered on a phone', String(ctas.length));
  }
} finally {
  for (const v of views) v.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll landing checks passed.\u001b[0m\n');
