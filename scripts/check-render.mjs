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
 * Every assertion below corresponds to something that was actually measured
 * and found wrong during the final pass.
 */

import path from 'node:path';
import {
  renderComponent, resolveLength, parseColor, contrastRatio, composite, SRC,
} from './lib/render-harness.mjs';
import { createReporter } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — rendered output: what the browser is actually told to draw\u001b[0m');

// A first-time visitor gets the LANDING (see check-landing). To photograph the
// editorial projection, a wedding must be open — exactly as a user would do.
const OPEN_DEMO = `
  weddingStore.loadProject('proj_demo_clara_alexandre');
`;

const MIRROR_ENTRY = `
import { createRoot } from 'react-dom/client';
import { weddingStore } from '../../../src/game/weddingStore';
import { MirrorSite } from '../../../src/components/mirror/MirrorSite';
export async function mount() {
  ${OPEN_DEMO}
  createRoot(document.getElementById('root')).render(<MirrorSite />);
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

function backgroundOf(el) {
  const stack = [];
  let node = el;
  for (let i = 0; node && i < 40; i++) {
    const c = parseColor(node.style?.background || node.style?.backgroundColor);
    if (c) { stack.push(c); if (c[3] === 1) break; }
    node = node.parentElement;
  }
  let base = PAGE_BG;
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

/** Every element that renders its own text, with what the browser resolves. */
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

/**
 * True when the text sits over an image or a gradient.
 *
 * Contrast over a photograph is NOT statically measurable — the value depends
 * on the pixels behind the glyphs. Rather than invent a number, those nodes
 * are excluded here and covered by a separate assertion: a scrim must exist.
 */
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

function contrastFailures(document, width) {
  const failures = [];
  for (const { el, text, size, weight } of textNodes(document, width)) {
    if (overUnmeasurableBackground(el)) continue;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3 : 4.5;
    const ratio = contrastRatio(colourOf(el), backgroundOf(el));
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
  console.log('\n[1/6] The page a visitor actually receives');
  // ---------------------------------------------------------------------------
  const desktop = await render(MIRROR_ENTRY, { width: 1440 });
  {
    const doc = desktop.document;
    const sections = [...doc.querySelectorAll('section[id^="mirror-"]')].map((s) => s.id);
    r.check(sections.length >= 6, `the six editorial sections render (${sections.length})`, sections.join(', '));

    // Every rendered section must carry real content, not just a heading.
    const thin = [];
    for (const section of doc.querySelectorAll('section[id^="mirror-"]')) {
      if (section.textContent.replace(/\s+/g, ' ').trim().length < 80) thin.push(section.id);
    }
    r.check(thin.length === 0, 'no section renders as an empty shell', thin.join(', '));

    r.check(doc.querySelectorAll('h1').length === 1, 'exactly one h1 — the couple');
    const h1 = doc.querySelector('h1').textContent;
    r.check(/Clara/.test(h1) && /Alexandre/.test(h1), 'and it carries the real names', h1);

    // No developer language may reach a wedding site.
    const body = doc.body.textContent;
    const jargon = ['modèle de données', 'World Model', 'MediaAsset', 'undefined',
      'NaN', 'null', 'object Object', 'localStorage', 'API', 'provider', 'projection']
      .filter((word) => body.includes(word));
    r.check(jargon.length === 0, 'no technical vocabulary is shown to the visitor', jargon.join(', '));

    // The hour is the anchor of the programme, and it is really there.
    const hours = [...doc.querySelectorAll('#mirror-programme div')]
      .map((d) => ownText(d)).filter((t) => /^\d{2}:\d{2}$/.test(t));
    r.check(hours.length >= 7, `every moment shows its hour (${hours.length})`);
  }

  // ---------------------------------------------------------------------------
  console.log('\n[2/6] Editorial hierarchy, measured at 1440px and 390px');
  // ---------------------------------------------------------------------------
  const mobile = await render(MIRROR_ENTRY, { width: 390 });
  {
    for (const [label, view, width] of [['desktop', desktop, 1440], ['mobile', mobile, 390]]) {
      const doc = view.document;
      // LOCATOR ADAPTED (Jour J pass): the page now opens on the timeline,
      // whose h1 carries the couple's names, and the editorial cover — same
      // names, larger type — became the h2 that follows it. The guarantee is
      // unchanged: the couple's name is the biggest type on the page, and no
      // SECTION title ever out-shouts it. So the couple's type is measured
      // wherever it is written, and section titles exclude the cover.
      const coverTitle = doc.querySelector('.wc-hero-title');
      const h1 = Math.max(
        resolveLength(doc.querySelector('h1').style.fontSize, width),
        coverTitle ? resolveLength(coverTitle.style.fontSize, width) : 0,
      );
      const h2 = [...doc.querySelectorAll('h2')]
        .filter((h) => !h.classList.contains('wc-hero-title'))
        .map((h) => resolveLength(h.style.fontSize, width));
      const h3 = [...doc.querySelectorAll('h3')].map((h) => resolveLength(h.style.fontSize, width));

      r.check(h1 > Math.max(...h2), `${label}: the couple dominates every section title`,
        `${Math.round(h1)} > ${Math.round(Math.max(...h2))}`);
      r.check(Math.max(...h2) > Math.max(...h3), `${label}: section titles dominate the moments`,
        `${Math.round(Math.max(...h2))} > ${Math.round(Math.max(...h3))}`);
      r.check(new Set(h2.map(Math.round)).size >= 2,
        `${label}: sections carry unequal weight (dominant / normal / quiet)`,
        [...new Set(h2.map(Math.round))].join('/'));

      // Nothing unreadable, and no control at the smallest tier.
      const nodes = textNodes(doc, width);
      const tiny = nodes.filter((n) => n.size < 10);
      r.check(tiny.length === 0, `${label}: no text below 10px`,
        tiny.slice(0, 3).map((n) => `${n.size}px "${n.text.slice(0, 20)}"`).join(' | '));
      const smallControls = nodes.filter((n) => n.el.tagName === 'BUTTON' && n.size < 11);
      r.check(smallControls.length === 0, `${label}: no control below 11px`,
        smallControls.slice(0, 3).map((n) => `"${n.text.slice(0, 20)}"`).join(' | '));

      // The Mirror must not inherit the dense 3D HUD scale.
      const bodyCopy = nodes.filter((n) => n.el.tagName === 'P');
      const smallest = Math.min(...bodyCopy.map((n) => n.size));
      r.check(smallest >= (width > 800 ? 13 : 12),
        `${label}: body copy is set at an editorial size`, `${Math.round(smallest)}px`);
    }
  }

  // ---------------------------------------------------------------------------
  console.log('\n[3/6] Contrast, computed (WCAG 2.1 AA)');
  // ---------------------------------------------------------------------------
  {
    for (const [label, view, width] of [['desktop', desktop, 1440], ['mobile', mobile, 390]]) {
      const failures = contrastFailures(view.document, width);
      r.check(failures.length === 0, `${label}: every text passes AA against its real background`,
        failures.slice(0, 3).join(' | '));
    }
  }

  // ---------------------------------------------------------------------------
  console.log('\n[4/6] Nothing is said twice, nothing is faked');
  // ---------------------------------------------------------------------------
  {
    const doc = desktop.document;

    // A human named as a vendor must not be repeated as a guest of the moment.
    for (const article of doc.querySelectorAll('#mirror-programme article')) {
      const names = [...article.querySelectorAll('button, span')]
        .map((el) => ownText(el)).filter((t) => t.length > 3 && /[A-ZÉÈ]/.test(t[0]));
      const counts = new Map();
      for (const n of names) counts.set(n, (counts.get(n) || 0) + 1);
      const twice = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
      r.check(twice.length === 0, 'a moment never names the same human twice', twice.join(', '));
      break; // the first moment is representative; all are built identically
    }

    // A vendor works in a place once.
    for (const article of doc.querySelectorAll('#mirror-vendors article')) {
      const places = [...article.querySelectorAll('button')].map((b) => ownText(b));
      const dupes = places.filter((p, i) => p && places.indexOf(p) !== i);
      r.check(dupes.length === 0, 'a vendor never lists the same place twice', dupes.join(', '));
    }

    // Initials must be letters. "Jean-Luc (Chauffeur)" produced "J(" before.
    const marks = [...doc.querySelectorAll('span')]
      .map((s) => ownText(s))
      .filter((t) => /^[A-ZÉÈÀÇ·]{1,2}$/.test(t));
    const broken = marks.filter((t) => /[^\p{L}·]/u.test(t));
    r.check(broken.length === 0, 'portrait initials contain letters only', broken.join(', '));

    // No Play control may exist without a real audio source.
    const playButtons = [...doc.querySelectorAll('button[aria-label^="Écouter"]')];
    r.check(playButtons.length === 0,
      'with no audio attached, no Play control is rendered at all', String(playButtons.length));
    const notes = [...doc.querySelectorAll('#mirror-music span')]
      .filter((s) => /écoute indisponible/.test(ownText(s)));
    r.check(notes.length === 0,
      'and the unavailability is stated once for the section, not on all ten lines',
      String(notes.length));

    // No stock imagery, ever.
    const imgs = [...doc.querySelectorAll('img')];
    const remote = imgs.filter((i) => /^https?:/.test(i.getAttribute('src') || ''));
    r.check(remote.length === 0, 'no remote image is loaded without a confirmed asset',
      remote.map((i) => i.getAttribute('src')).join(', '));
  }

  // ---------------------------------------------------------------------------
  console.log('\n[5/6] A real media instantly changes the page');
  // ---------------------------------------------------------------------------
  {
    // Nothing is seeded: the assets are created here, observed, then removed.
    const entry = `
      import { createRoot } from 'react-dom/client';
      import { weddingStore } from '../../../src/game/weddingStore';
      import { MirrorSite } from '../../../src/components/mirror/MirrorSite';
      export async function mount() {
        const store = weddingStore;
        store.loadProject('proj_demo_clara_alexandre');
        const person = store.guests[0].personId;
        const song = store.tracks[0].id;
        store.addMedia({ kind: 'image', source: 'data:image/png;base64,COVER',
          ownerKind: 'wedding', ownerId: store.currentProject.id, title: 'Couverture' });
        store.addMedia({ kind: 'image', source: 'data:image/png;base64,FACE',
          ownerKind: 'person', ownerId: person, title: 'Portrait' });
        store.addMedia({ kind: 'image', source: 'data:image/png;base64,ART',
          ownerKind: 'song', ownerId: song, title: 'Pochette' });
        store.addMedia({ kind: 'audio', source: 'data:audio/mpeg;base64,SND',
          ownerKind: 'song', ownerId: song, title: 'Extrait' });
        createRoot(document.getElementById('root')).render(<MirrorSite />);
      }
    `;
    const withMedia = await render(entry, { width: 1440 });
    const doc = withMedia.document;

    const hero = doc.querySelector('header img');
    r.check(!!hero && hero.getAttribute('src') === 'data:image/png;base64,COVER',
      'HERO IMAGE: a real cover attached to the wedding becomes the cover');
    r.check(/mariage|Photographie|Couverture/i.test(hero.getAttribute('alt') || ''),
      'and it carries a real alternative text', hero.getAttribute('alt'));

    const portrait = [...doc.querySelectorAll('#mirror-guests img')]
      .find((i) => i.getAttribute('src') === 'data:image/png;base64,FACE');
    r.check(!!portrait, '02 PERSONNES: the real photo replaces the initials');
    r.check(portrait.getAttribute('loading') === 'lazy', 'portraits stay lazy');

    const covers = [...doc.querySelectorAll('img')]
      .filter((i) => i.getAttribute('src') === 'data:image/png;base64,ART');
    r.check(covers.length >= 2,
      'the same artwork appears in 05 MUSIQUE and in 01 PROGRAMME', String(covers.length));

    const play = [...doc.querySelectorAll('button[aria-label^="Écouter"]')];
    r.check(play.length >= 2,
      'a real audio source makes the Play control appear — in both places', String(play.length));

    const gallery = doc.querySelectorAll('.wc-gallery figure');
    r.check(gallery.length === 3, '06 MÉDIAS composes the real images', String(gallery.length));
    const captions = [...doc.querySelectorAll('.wc-gallery figcaption')].map((c) => c.textContent);
    r.check(captions.some((c) => /Clara|Alexandre|Portrait|Couverture|Pochette/.test(c)),
      'each image says what it belongs to', captions.join(' | '));

    r.check(contrastFailures(doc, 1440).length === 0,
      'the page with media still passes AA everywhere (photo-backed text excluded)');

    // Over a photograph, contrast cannot be computed — so the design must
    // guarantee it structurally: a scrim between the image and the type.
    const scrim = [...doc.querySelectorAll('header div')]
      .find((d) => /linear-gradient/.test(String(d.style.background || '')));
    r.check(!!scrim, 'HERO IMAGE keeps a scrim between the photograph and the type');
    const headerColor = String(doc.querySelector('header').style.color || '');
    r.check(/#fff|rgb\(255, 255, 255\)/.test(headerColor),
      'and the type switches to white over the image', headerColor);
  }

  // ---------------------------------------------------------------------------
  console.log('\n[5b/6] What a real browser found, locked down');
  // ---------------------------------------------------------------------------
  // Every assertion here corresponds to a defect SEEN in Chromium during the
  // final pass. jsdom cannot lay out, so these guard the CAUSE, not the pixels.
  {
    const { readFileSync } = await import('node:fs');
    const p2 = (...parts) => path.join(SRC, ...parts);
    const nav = readFileSync(p2('components', 'mirror', 'MirrorNav.tsx'), 'utf8');
    const css = readFileSync(p2('components', 'mirror', 'mirror.css'), 'utf8');
    const timeline = readFileSync(p2('components', 'mirror', 'MirrorTimeline.tsx'), 'utf8');
    const hero = readFileSync(p2('components', 'mirror', 'MirrorHero.tsx'), 'utf8');
    const sections = readFileSync(p2('components', 'mirror', 'MirrorSections.tsx'), 'utf8');
    const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');

    // The fixed projection pill used to be drawn over the middle of the rail.
    // It now lives at the BOTTOM of the Mirror, so the editorial contents page
    // takes the top of the page — same guarantee (rail never covered), better
    // answer: the navigation belongs to the site, the capsule to the system.
    const switcher = readFileSync(p2('components', 'ui', 'ProjectionSwitcher.tsx'), 'utf8');
    r.check(/position: 'sticky', top: 0/.test(nav),
      'the editorial rail owns the top of the page');
    // LOCATOR ADAPTED (journey acceptance): the capsule used to be at the
    // bottom only on the light surface (`onLight ? bottom : top`). Measured in
    // Chromium, the top placement covered the World HUD pills, so the bottom
    // lane is now unconditional — the same guarantee, on both surfaces: the
    // capsule is anchored to the bottom and can never cover the rail.
    r.check(/bottom: 'max\(18px, env\(safe-area-inset-bottom\)\)'/.test(switcher)
      && !/top: 'max\(14px/.test(switcher),
      'and the projection capsule sits below the content, on both surfaces');
    r.check(/scrollMarginTop: 64/.test(readFileSync(p2('components', 'mirror', 'MirrorPrimitives.tsx'), 'utf8')),
      'an anchored section lands below the rail, not under it');

    // An inline `display` beat the mobile media query: orphan dot on a phone.
    r.check(!/display: 'flex'[^}]*alignSelf: 'stretch'/.test(timeline)
      && /\.wc-timeline-thread \{\s*display: flex;/.test(css),
      'the timeline thread declares its display in CSS, so mobile can hide it');

    // Same class of bug for the cover size and the hero height.
    r.check(/className="wc-cover-lg"/.test(sections) && /\.wc-cover-lg/.test(css),
      'the 92px cover can shrink on a phone');
    r.check(/className="wc-hero"/.test(hero) && /\.wc-hero \{/.test(css)
      && !/minHeight: 'min\(94vh/.test(hero),
      'the hero height is responsive, not frozen inline');

    // Measured at 390px: a nowrap title imposed its width on the flex row.
    r.check(/minWidth: 0, overflow: 'hidden'/.test(sections),
      'a song row can actually shrink inside a 350px column');

    // The documented ⇧M shortcut was unreachable behind a bare KeyM branch.
    const shiftFirst = app.indexOf("e.code === 'KeyM' && e.shiftKey");
    const bareM = app.indexOf("e.code === 'KeyM' && !weddingStore.showIdentityModal");
    r.check(shiftFirst > 0 && shiftFirst < bareM,
      'the ⇧M shortcut is reachable: its branch is tested before the bare M one');

    // Over a photograph the eyebrow vanished, and the scrim was thin enough to
    // lose white type on a bright picture.
    r.check(/<Eyebrow inherit=\{Boolean\(image\)\}>/.test(hero),
      'the hero eyebrow follows the type colour over an image');
    r.check(/rgba\(12,10,8,\.70\)[\s\S]*rgba\(12,10,8,\.38\)[\s\S]*rgba\(12,10,8,\.20\)/.test(hero),
      'the scrim protects the type across the whole cover, not only its foot');

    // No administrative "(s)" on a wedding site.
    const mirrorCopy = ['MirrorPeople.tsx', 'MirrorSections.tsx', 'MirrorSite.tsx']
      .map((f) => readFileSync(p2('components', 'mirror', f), 'utf8')).join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const admin = mirrorCopy.match(/\w+\(s\)/g) ?? [];
    r.check(admin.length === 0, 'plurals are written out, not "(s)"', admin.slice(0, 3).join(' '));

    // The rail let the page show through and muddied the contents page.
    r.check(/background: M\.bg,/.test(nav) && !/rgba\(247, 245, 240, 0\.92\)/.test(nav),
      'the sticky rail is opaque');

    // Layout that must survive a media query is never set inline.
    const shell = readFileSync(p2('components', 'canvas', 'MirrorCanvasShell.tsx'), 'utf8');
    r.check(/paddingRight: fluid/.test(shell) && !/padding: `\$\{fluid\(20, 30\)/.test(shell)
      && /\.wc-canvas-masthead/.test(css),
      'the Canvas masthead can make room for the floating switcher on a phone');

    // The absence of a preview belongs in the metadata line, said once.
    r.check(/· sans extrait/.test(sections) && !/<NoAudioNote \/>/.test(sections),
      'a track with no preview says so in its metadata, not in a second column');

    // The native select was the only thing that made the Canvas a form.
    const prim = readFileSync(p2('components', 'canvas', 'CanvasPrimitives.tsx'), 'utf8');
    r.check(/appearance: 'none'/.test(prim) && /borderBottom: `1px solid \$\{K.lineStrong\}`/.test(prim),
      'the Canvas select wears editorial clothing, not the system widget');
    r.check(/backgroundColor: 'transparent'/.test(prim) && !/\bbackground: 'transparent',\s*\n\s*backgroundImage/.test(prim),
      'and it does not mix a background shorthand with its long-hands (React warns)');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[6/6] The Canvas opens in context, and stays a composition tool');
  // ---------------------------------------------------------------------------
  {
    const canvas = await render(CANVAS_ENTRY, { width: 1440 });
    const doc = canvas.document;

    // PRODUCT DECISION (convergence de la Timeline): the « Programme » surface
    // was a second, lighter reading of the day, with its own reordering arrows
    // — the beginning of a Timeline 2. It is no longer offered here. What this
    // surface alone can still do — a person's file, a vendor, a place — is
    // untouched, and the day belongs to the film.
    //
    // The guarantees the three removed checks protected are preserved, and
    // moved to where they now live:
    //   • a moment opens → acceptance-timeline-convergence (clic → MomentHub);
    //   • reordering without a mouse → MomentHub « Place dans la journée »,
    //     asserted just below on the source;
    //   • the surfaces are reachable without a menu → the rail, now five.
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

    const { readFileSync: readHub } = await import('node:fs');
    const hubSource = readHub(
      path.join(SRC, 'components', 'mirror', 'timeline', 'MomentHub.tsx'), 'utf8');
    r.check(/data-jourj="hub-move-earlier"/.test(hubSource) && /data-jourj="hub-move-later"/.test(hubSource),
      'a moment can still be reordered — on the moment itself');
    r.check(/aria-label={`Avancer/.test(hubSource) && /aria-label={`Retarder/.test(hubSource),
      'and those controls are announced, so reordering never became mouse-only');

    const rail = [...doc.querySelectorAll('nav button')].map((b) => b.textContent);
    r.check(rail.length === 6, 'the six surfaces are reachable without a menu', String(rail.length));
    r.check(doc.querySelectorAll('[role="dialog"]').length === 0, 'no modal is used');

    const failures = contrastFailures(doc, 1440);
    r.check(failures.length === 0, 'the Canvas passes AA as well', failures.slice(0, 3).join(' | '));

    const tiny = textNodes(doc, 1440).filter((n) => n.size < 10.5);
    r.check(tiny.length === 0, 'nothing in the Canvas falls below the caption step',
      tiny.slice(0, 3).map((n) => `${n.size}px "${n.text.slice(0, 18)}"`).join(' | '));
  }
} finally {
  for (const view of rendered) view.cleanup();
}

void path; void SRC;

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll rendered-output checks passed.\u001b[0m\n');

// The rendered components legitimately own timers (the NOW marker ticks every
// 30s). jsdom keeps them alive after cleanup, which used to hang this script
// for minutes after its last check. Nothing is left to do here, so we say so.
process.exit(0);
