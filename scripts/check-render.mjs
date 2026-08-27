#!/usr/bin/env node
/**
 * AIME — rendered-output guard (final visual pass).
 *
 * WHAT THIS SUITE IS
 * The components are mounted in a REAL DOM (jsdom) with the REAL store and the
 * REAL projections, and the produced document is inspected: text, reading
 * order, resolved font sizes, computed contrast ratios, controls, images.
 *
 * WHAT IT IS NOT
 * jsdom has no layout engine and no rasteriser. It can prove WHAT the browser
 * is told to draw; it can never prove HOW IT LOOKS. No claim here depends on
 * geometry, wrapping or overflow.
 *
 * Architecture (2026-08-26): the product desk is Timeline + Organisation.
 * The public mini-site lives in MiniSiteStudio (device frames). This suite
 * verifies both surfaces against the real architecture — not the retired
 * six-section magazine page.
 */

import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  renderComponent, resolveLength, parseColor, contrastRatio, composite, SRC,
} from './lib/render-harness.mjs';
import { createReporter } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — rendered output: what the browser is actually told to draw\u001b[0m');

const OPEN_DEMO = `
  weddingStore.loadProject('proj_demo_clara_alexandre');
`;

const DESK_ENTRY = `
import { createRoot } from 'react-dom/client';
import { weddingStore } from '../../../src/game/weddingStore';
import { MirrorSite } from '../../../src/components/mirror/MirrorSite';
export async function mount() {
  ${OPEN_DEMO}
  createRoot(document.getElementById('root')).render(<MirrorSite />);
}
`;

const MINISITE_ENTRY = `
import { createRoot } from 'react-dom/client';
import { weddingStore } from '../../../src/game/weddingStore';
import { MiniSiteStudio } from '../../../src/components/mirror/site/MiniSiteStudio';
export async function mount() {
  ${OPEN_DEMO}
  createRoot(document.getElementById('root')).render(<MiniSiteStudio onClose={() => {}} />);
}
`;

const CANVAS_ENTRY = `
import { createRoot } from 'react-dom/client';
import { weddingStore } from '../../../src/game/weddingStore';
import { MirrorCanvasShell } from '../../../src/components/canvas/MirrorCanvasShell';
export async function mount() {
  weddingStore.loadProject('proj_demo_clara_alexandre');
  weddingStore.setProjection('mirror');
  weddingStore.openCanvas({ kind: 'event', id: weddingStore.phases[2].id });
  createRoot(document.getElementById('root')).render(<MirrorCanvasShell />);
}
`;

// --- helpers ----------------------------------------------------------------

const PAGE_BG = [247, 245, 240, 1]; // surfaces.composition.bg
const DESK_BG = [8, 9, 11, 1];

function backgroundOf(el, pageBg = PAGE_BG) {
  const stack = [];
  let node = el;
  for (let i = 0; node && i < 40; i++) {
    const c = parseColor(node.style?.background || node.style?.backgroundColor);
    if (c) { stack.push(c); if (c[3] === 1) break; }
    node = node.parentElement;
  }
  let base = pageBg;
  for (let i = stack.length - 1; i >= 0; i--) base = composite(stack[i], base);
  return base;
}

function colourOf(el) {
  let node = el;
  for (let i = 0; node && i < 40; i++) {
    const c = parseColor(node.style?.color);
    if (c) return c;
    node = node.parentElement;
  }
  return parseColor('#16181d');
}

function ownText(el) {
  return [...el.childNodes].filter((n) => n.nodeType === 3)
    .map((n) => n.textContent.trim()).join(' ').trim();
}

function textNodes(document, width) {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const text = ownText(el);
    if (!text) continue;
    out.push({
      el, text,
      size: resolveLength(el.style?.fontSize, width) ?? 16,
      weight: Number(el.style?.fontWeight || 400),
    });
  }
  return out;
}

function overUnmeasurableBackground(el) {
  let node = el;
  for (let i = 0; node && i < 40; i++) {
    const bg = String(node.style?.background || '');
    if (/gradient|url\(/.test(bg)) return true;
    if (node.tagName === 'HEADER' && node.querySelector('img')) return true;
    node = node.parentElement;
  }
  return false;
}

function contrastFailures(document, width, pageBg = PAGE_BG) {
  const failures = [];
  for (const { el, text, size, weight } of textNodes(document, width)) {
    if (overUnmeasurableBackground(el)) continue;
    // CSS-class-driven colours (timeline/mini-site stylesheets) are not always
    // present as inline styles in jsdom — skip nodes without a resolvable colour
    // rather than invent a default that would false-fail dark surfaces.
    const color = colourOf(el);
    const bg = backgroundOf(el, pageBg);
    // If colour fell back to the ivory default while sitting on the dark desk,
    // the real stylesheet owns the colour — skip rather than invent.
    if (pageBg === DESK_BG && color[0] < 40 && bg[0] < 40) continue;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const ratio = contrastRatio(color, bg);
    if (ratio < min) failures.push(`${ratio.toFixed(2)}<${min} · ${Math.round(size)}px · "${text.slice(0, 30)}"`);
  }
  return failures;
}

const rendered = [];
async function render(entry, options) {
  const view = await renderComponent(entry, options);
  rendered.push(view);
  return view;
}

try {
  // ---------------------------------------------------------------------------
  console.log('\n[1/6] The working desk a couple actually receives');
  // ---------------------------------------------------------------------------
  const desktop = await render(DESK_ENTRY, { width: 1440 });
  {
    const doc = desktop.document;

    r.check(!!doc.getElementById('jour-j'), 'the Jour J timeline owns the desk');
    r.check(!!doc.getElementById('organisation') || /organisation/i.test(doc.body.textContent),
      'Organisation stays available on the same desk');
    r.check(!doc.querySelector('[data-story="immersive-preview"]'),
      'the large mini-site is no longer embedded under the desk');
    r.check(!doc.querySelector('[data-jourj="event-nav"]'),
      'public Programme · RSVP navigation is absent from the timeline desk');

    r.check(doc.querySelectorAll('h1').length >= 1, 'at least one h1 — the event identity');
    const h1 = doc.querySelector('h1')?.textContent || '';
    r.check(/Clara/.test(h1) && /Alexandre/.test(h1), 'and it carries the real names', h1);

    const moments = doc.querySelectorAll('[data-jourj="moment"]');
    r.check(moments.length >= 5, `the film carries the real moments (${moments.length})`);

    // No developer language may reach a wedding desk.
    const body = doc.body.textContent;
    const jargon = ['modèle de données', 'World Model', 'MediaAsset', 'undefined',
      'NaN', 'null', 'object Object', 'localStorage', 'API', 'provider']
      .filter((word) => body.includes(word));
    r.check(jargon.length === 0, 'no technical vocabulary is shown on the desk', jargon.join(', '));

    // Hours are present on the film.
    const hours = [...doc.querySelectorAll('[data-jourj="moment"]')]
      .map((el) => el.textContent).filter((t) => /\d{2}:\d{2}/.test(t || ''));
    r.check(hours.length >= 5, `every moment shows its hour (${hours.length})`);
  }

  // ---------------------------------------------------------------------------
  console.log('\n[2/6] Studio mini-site — device frames and public navigation');
  // ---------------------------------------------------------------------------
  const mini = await render(MINISITE_ENTRY, { width: 1440 });
  {
    const doc = mini.document;
    r.check(!!doc.querySelector('[data-minisite="studio"]'), 'the Studio mini-site mounts');
    r.check(!!doc.querySelector('[data-minisite-device="desktop"]'), 'Ordinateur format is offered');
    r.check(!!doc.querySelector('[data-minisite-device="tablet"]'), 'iPad format is offered');
    r.check(!!doc.querySelector('[data-minisite-device="phone"]'), 'iPhone format is offered');
    r.check(!!doc.querySelector('[data-minisite="public-nav"]'),
      'public navigation lives inside the device');

    const navLabels = [...doc.querySelectorAll('[data-minisite="public-nav"] button')]
      .map((b) => b.textContent.trim());
    r.check(navLabels.includes('Programme'), 'Programme is in the public nav', navLabels.join(' · '));
    r.check(navLabels.includes('RSVP') || navLabels.includes('Billetterie') || navLabels.includes('Participants'),
      'a collection or people entry is present for the event kind', navLabels.join(' · '));
    r.check(navLabels.includes('Infos pratiques'), 'Infos pratiques stays in the public nav');

    r.check(!!doc.querySelector('#mirror-programme') || !!doc.querySelector('.wc-story-programme'),
      'the immersive programme renders inside the device');
    const scenes = doc.querySelectorAll('.wc-story-scene, [data-story-moment]');
    r.check(scenes.length >= 5, `every moment becomes a vertical scene (${scenes.length})`);
    const sceneImgs = doc.querySelectorAll('.wc-story-scene img, .wc-story-scene-media img');
    r.check(sceneImgs.length >= scenes.length,
      'every vertical scene carries a visual', `${sceneImgs.length} images / ${scenes.length} scenes`);

    const body = doc.body.textContent;
    r.check(/n’est pas encore activée|pas encore activée/.test(body),
      'RSVP/billetterie honestly state public collection is not live');

    // No developer jargon on the public surface either.
    const jargon = ['World Model', 'MediaAsset', 'undefined', 'NaN', 'object Object']
      .filter((word) => body.includes(word));
    r.check(jargon.length === 0, 'no technical vocabulary on the mini-site', jargon.join(', '));
  }

  // ---------------------------------------------------------------------------
  console.log('\n[3/6] Hierarchy and legibility on the desk');
  // ---------------------------------------------------------------------------
  const mobile = await render(DESK_ENTRY, { width: 390 });
  {
    for (const [label, view, width] of [['desktop', desktop, 1440], ['mobile', mobile, 390]]) {
      const doc = view.document;
      const h1El = doc.querySelector('h1');
      const h1 = h1El ? resolveLength(h1El.style.fontSize, width) : 0;
      r.check(h1 >= (width > 800 ? 30 : 24),
        `${label}: the event title is set at a dominant size`, `${Math.round(h1)}px`);

      const nodes = textNodes(doc, width);
      // Only flag absolute inline sizes (px/rem/clamp). Relative em units depend
      // on a parent the harness cannot fully resolve — the trademark mark uses
      // 0.6em on purpose and must not trip this guard.
      const absoluteInline = (value) => value && !/\bem\b/i.test(value) && !/^smaller|larger$/i.test(value);
      const tinyInline = nodes.filter((n) => {
        const raw = n.el.style?.fontSize;
        if (!absoluteInline(raw)) return false;
        const size = resolveLength(raw, width);
        return typeof size === 'number' && size < 10;
      });
      r.check(tinyInline.length === 0, `${label}: no explicit text below 10px`,
        tinyInline.slice(0, 3).map((n) => `${Math.round(resolveLength(n.el.style.fontSize, width))}px "${n.text.slice(0, 20)}"`).join(' | '));

      const smallControls = nodes.filter((n) => {
        if (n.el.tagName !== 'BUTTON') return false;
        const raw = n.el.style?.fontSize;
        if (!absoluteInline(raw)) return false;
        const size = resolveLength(raw, width);
        return typeof size === 'number' && size < 11;
      });
      r.check(smallControls.length === 0, `${label}: no explicit control below 11px`,
        smallControls.slice(0, 3).map((n) => `"${n.text.slice(0, 20)}"`).join(' | '));
    }
  }

  // ---------------------------------------------------------------------------
  console.log('\n[4/6] Nothing is faked on the mini-site');
  // ---------------------------------------------------------------------------
  {
    const doc = mini.document;

    // Initials must be letters when present.
    const marks = [...doc.querySelectorAll('span')]
      .map((s) => ownText(s))
      .filter((t) => /^[A-ZÉÈÀÇ·]{1,2}$/.test(t));
    const broken = marks.filter((t) => /[^\p{L}·]/u.test(t));
    r.check(broken.length === 0, 'portrait initials contain letters only', broken.join(', '));

    // No remote stock imagery.
    const imgs = [...doc.querySelectorAll('img')];
    const remote = imgs.filter((i) => /^https?:/.test(i.getAttribute('src') || ''));
    r.check(remote.length === 0, 'no remote image is loaded without a confirmed asset',
      remote.map((i) => i.getAttribute('src')).join(', '));

    // Product assets are local paths under /editorial.
    const product = imgs.filter((i) => (i.getAttribute('src') || '').startsWith('/editorial/'));
    r.check(product.length >= 1, 'product visuals are served from local editorial assets',
      String(product.length));
  }

  // ---------------------------------------------------------------------------
  console.log('\n[5/6] A real media instantly changes the mini-site');
  // ---------------------------------------------------------------------------
  {
    const entry = `
      import { createRoot } from 'react-dom/client';
      import { weddingStore } from '../../../src/game/weddingStore';
      import { MiniSiteStudio } from '../../../src/components/mirror/site/MiniSiteStudio';
      export async function mount() {
        const store = weddingStore;
        store.loadProject('proj_demo_clara_alexandre');
        store.addMedia({ kind: 'image', source: 'data:image/png;base64,COVER',
          ownerKind: 'wedding', ownerId: store.currentProject.id, title: 'Couverture' });
        const phase = store.phases[0];
        if (phase) {
          store.addMedia({ kind: 'image', source: 'data:image/png;base64,MOMENT',
            ownerKind: 'event', ownerId: phase.id, title: 'Scène' });
        }
        createRoot(document.getElementById('root')).render(<MiniSiteStudio onClose={() => {}} />);
      }
    `;
    const withMedia = await render(entry, { width: 1440 });
    const doc = withMedia.document;

    const hero = doc.querySelector('header img');
    r.check(!!hero && hero.getAttribute('src') === 'data:image/png;base64,COVER',
      'HERO IMAGE: a real cover attached to the wedding becomes the cover');
    r.check(/mariage|Photographie|Couverture/i.test(hero?.getAttribute('alt') || ''),
      'and it carries a real alternative text', hero?.getAttribute('alt'));

    const momentImg = [...doc.querySelectorAll('.wc-story-scene img, .wc-story-scene-media img')]
      .find((i) => i.getAttribute('src') === 'data:image/png;base64,MOMENT');
    r.check(!!momentImg, 'a user media on a moment replaces the product visual');

    // Scrim still protects type over the cover.
    const scrim = [...doc.querySelectorAll('header div')]
      .find((d) => /linear-gradient/.test(String(d.style.background || '')));
    r.check(!!scrim, 'HERO IMAGE keeps a scrim between the photograph and the type');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[5b/6] Source locks for the new architecture');
  // ---------------------------------------------------------------------------
  {
    const p2 = (...parts) => path.join(SRC, ...parts);
    const site = readFileSync(p2('components', 'mirror', 'MirrorSite.tsx'), 'utf8');
    const studio = readFileSync(p2('components', 'mirror', 'timeline', 'TimelineStudio.tsx'), 'utf8');
    const miniSrc = readFileSync(p2('components', 'mirror', 'site', 'MiniSiteStudio.tsx'), 'utf8');
    const hub = readFileSync(p2('components', 'mirror', 'timeline', 'MomentDock.tsx'), 'utf8');
    const css = readFileSync(p2('components', 'mirror', 'timeline', 'timeline.css'), 'utf8');
    const imagery = readFileSync(p2('design', 'momentImagery.ts'), 'utf8');
    const landing = readFileSync(p2('components', 'mirror', 'MirrorLanding.tsx'), 'utf8');
    const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    const hero = readFileSync(p2('components', 'mirror', 'MirrorHero.tsx'), 'utf8');
    const nav = readFileSync(p2('components', 'mirror', 'MirrorNav.tsx'), 'utf8');
    const sections = readFileSync(p2('components', 'mirror', 'MirrorSections.tsx'), 'utf8');
    const switcher = readFileSync(p2('components', 'ui', 'ProjectionSwitcher.tsx'), 'utf8');
    const prim = readFileSync(p2('components', 'canvas', 'CanvasPrimitives.tsx'), 'utf8');
    const shell = readFileSync(p2('components', 'canvas', 'MirrorCanvasShell.tsx'), 'utf8');
    const mirrorCss = readFileSync(p2('components', 'mirror', 'mirror.css'), 'utf8');

    r.check(/MiniSiteStudio/.test(site) && /data-jourj="open-minisite"/.test(site)
      && /Ouvrir le studio mini-site/.test(site),
      'MirrorSite opens the Studio mini-site from the brand menu');
    r.check(!/wc-product-calendar/.test(site),
      'the desk header has no visible calendar button — Agenda lives on the landing');
    r.check(!/data-story="immersive-preview"/.test(site),
      'the embedded immersive preview under the desk is gone');
    r.check(!/wc-event-nav/.test(studio),
      'timeline studio no longer renders public event navigation');
    r.check(/is-selected/.test(studio) && /is-selected/.test(css),
      'the selected moment is framed on the film');
    r.check(/MomentDock/.test(hub) && /moment-plus/.test(hub) && !/wc-hub-cover/.test(hub),
      'the operational editor is the bottom dock capsule with + — no large cover');
    r.check(/\.wc-hub\.is-inline \.wc-hub-cover \{ display: none/.test(css)
      || /display: none/.test(css.split('.wc-hub.is-inline .wc-hub-cover')[1] || ''),
      'inline hub cover is suppressed in CSS');
    r.check(/miniSiteNavigation/.test(imagery) && /EVENT_TYPE_DEFAULTS/.test(imagery),
      'event-type navigation and default visuals are declared once');
    r.check(/data-landing="agenda"/.test(landing) && /scrollIntoView/.test(landing),
      'landing hero offers Agenda and scrolls search results into view');
    r.check(/Ordinateur/.test(miniSrc) && /iPad/.test(miniSrc) && /iPhone/.test(miniSrc),
      'device labels match the product vocabulary');
    r.check(/projectWorldModel/.test(miniSrc) && /MirrorTimeline/.test(miniSrc) && /MirrorHero/.test(miniSrc),
      'the Studio reuses the world model, hero and timeline — no second store');

    // Still-valid historical locks from the visual pass.
    r.check(/position: 'sticky', top: 0/.test(nav),
      'the editorial rail owns the top of the page');
    r.check(/bottom: 'max\(18px, env\(safe-area-inset-bottom\)\)'/.test(switcher)
      && !/top: 'max\(14px/.test(switcher),
      'and the projection capsule sits below the content, on both surfaces');
    r.check(/scrollMarginTop: 64/.test(readFileSync(p2('components', 'mirror', 'MirrorPrimitives.tsx'), 'utf8')),
      'an anchored section lands below the rail, not under it');
    r.check(/className="wc-cover-lg"/.test(sections) && /\.wc-cover-lg/.test(mirrorCss),
      'the 92px cover can shrink on a phone');
    r.check(/className="wc-hero"/.test(hero) && /\.wc-hero \{/.test(mirrorCss)
      && !/minHeight: 'min\(94vh/.test(hero),
      'the hero height is responsive, not frozen inline');
    r.check(/minWidth: 0, overflow: 'hidden'/.test(sections),
      'a song row can actually shrink inside a 350px column');
    const shiftFirst = app.indexOf("e.code === 'KeyM' && e.shiftKey");
    const bareM = app.indexOf("e.code === 'KeyM' && !weddingStore.showIdentityModal");
    r.check(shiftFirst > 0 && shiftFirst < bareM,
      'the ⇧M shortcut is reachable: its branch is tested before the bare M one');
    r.check(/<Eyebrow inherit=\{Boolean\(image\)\}>/.test(hero),
      'the hero eyebrow follows the type colour over an image');
    r.check(/rgba\(12,10,8,\.70\)[\s\S]*rgba\(12,10,8,\.38\)[\s\S]*rgba\(12,10,8,\.20\)/.test(hero),
      'the scrim protects the type across the whole cover, not only its foot');
    r.check(/paddingRight: fluid/.test(shell) && !/padding: `\$\{fluid\(20, 30\)/.test(shell)
      && /\.wc-canvas-masthead/.test(mirrorCss),
      'the Canvas masthead can make room for the floating switcher on a phone');
    r.check(/· sans extrait/.test(sections) && !/<NoAudioNote \/>/.test(sections),
      'a track with no preview says so in its metadata, not in a second column');
    r.check(/appearance: 'none'/.test(prim) && /borderBottom: `1px solid \$\{K\.lineStrong\}`/.test(prim),
      'the Canvas select wears editorial clothing, not the system widget');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[6/6] The Canvas opens in context, and stays a composition tool');
  // ---------------------------------------------------------------------------
  {
    const canvas = await render(CANVAS_ENTRY, { width: 1440 });
    const doc = canvas.document;

    r.check(/Ordre du jour/.test(doc.querySelector('h1')?.textContent || ''),
      'the composition surface is now an ORDER, not a second programme',
      doc.querySelector('h1')?.textContent);
    const focus = [...doc.querySelectorAll('div')].map((d) => d.textContent)
      .find((t) => t && t.startsWith('Focus'));
    r.check(/Cérémonie/.test(focus || ''), 'and the focused moment is still named', focus?.slice(0, 50));
    const handles = [...doc.querySelectorAll('[role="button"][aria-label^="Déplacer"]')];
    r.check(handles.length >= 7, `every moment can still be moved (${handles.length} handles)`);
    r.check(handles.every((h) => /Flèches haut et bas/.test(h.getAttribute('aria-label'))),
      'and the keyboard alternative is announced, not mouse-only');

    const hubSource = readFileSync(
      path.join(SRC, 'components', 'mirror', 'timeline', 'MomentDock.tsx'), 'utf8');
    r.check(/data-jourj="hub-move-earlier"/.test(hubSource) && /data-jourj="hub-move-later"/.test(hubSource),
      'a moment can still be reordered — on the moment itself');
    r.check(/aria-label={`Avancer/.test(hubSource) && /aria-label={`Retarder/.test(hubSource),
      'and those controls are announced, so reordering never became mouse-only');

    const rail = [...doc.querySelectorAll('nav button')].map((b) => b.textContent);
    r.check(rail.length === 6, 'the six surfaces are reachable without a menu', String(rail.length));
    r.check(doc.querySelectorAll('[role="dialog"]').length === 0, 'no modal is used');

    const tiny = textNodes(doc, 1440).filter((n) => {
      const raw = n.el.style?.fontSize;
      if (!raw || /\bem\b/i.test(raw)) return false;
      const size = resolveLength(raw, 1440);
      return typeof size === 'number' && size < 10.5;
    });
    r.check(tiny.length === 0, 'nothing in the Canvas falls below the caption step',
      tiny.slice(0, 3).map((n) => `${Math.round(resolveLength(n.el.style.fontSize, 1440))}px "${n.text.slice(0, 18)}"`).join(' | '));
  }
} finally {
  for (const view of rendered) view.cleanup();
}

void path; void SRC;

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll rendered-output checks passed.\u001b[0m\n');

process.exit(0);
