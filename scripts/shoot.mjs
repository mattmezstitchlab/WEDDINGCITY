#!/usr/bin/env node
/**
 * Real screenshots of the running app, with a real Chromium.
 *
 * Not a test: an eye. It drives the dev server on :5173 like a visitor would
 * (keyboard shortcuts, clicks, scrolling) and writes PNGs to /tmp/shots.
 *
 * Usage: node scripts/shoot.mjs [scenario]
 */

import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173/';
const scenario = process.argv[2] ?? 'mirror';

const browser = await puppeteer.launch({
  executablePath: '/tmp/chromium',
  headless: true,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--hide-scrollbars', '--font-render-hinting=none',
  ],
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp/swiftshader:/tmp' },
});

const shot = async (page, name, options = {}) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...options });
  console.log('→', `${OUT}/${name}.png`);
};

const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));

async function open(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('  [page error]', String(e).slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [console]', m.text().slice(0, 160));
  });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await settle(2500);
  return page;
}

/** The app boots in the World; a visitor clicks MIRROR in the switcher. */
async function toMirror(page) {
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim().toUpperCase() === 'MIRROR');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error('MIRROR button not found');
  await settle(1800);
  const isMirror = await page.evaluate(() => Boolean(document.getElementById('wc-mirror')));
  console.log('  mirror monté:', isMirror);
  return isMirror;
}

async function scrollToSection(page, id) {
  await page.evaluate((sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, id);
  await settle(700);
}

if (scenario === 'world') {
  const page = await open(1440, 900);
  await shot(page, 'world-1440');
  await page.close();
}

if (scenario === 'mirror') {
  const page = await open(1440, 900);
  await toMirror(page);
  await shot(page, 'mirror-hero-1440');
  for (const id of ['mirror-programme', 'mirror-guests', 'mirror-vendors',
    'mirror-places', 'mirror-music', 'mirror-gallery']) {
    await scrollToSection(page, id);
    await shot(page, `mirror-${id.replace('mirror-', '')}-1440`);
  }
  await page.close();
}

if (scenario === 'mobile') {
  const page = await open(390, 844);
  await toMirror(page);
  await shot(page, 'mobile-hero');
  for (const id of ['mirror-programme', 'mirror-guests', 'mirror-music']) {
    await scrollToSection(page, id);
    await shot(page, `mobile-${id.replace('mirror-', '')}`);
  }
  await page.close();
}

if (scenario === 'canvas') {
  const page = await open(1440, 900);
  await toMirror(page);
  await scrollToSection(page, 'mirror-programme');
  // "Composer ce moment" on the first moment — the contextual opening.
  const opened = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim() === 'Composer ce moment');
    if (!btn) return false;
    btn.click();
    return true;
  });
  console.log('  canvas ouvert depuis un moment:', opened);
  await settle(1500);
  await shot(page, 'canvas-moment-1440');
  await page.close();
}

if (scenario === 'places') {
  const page = await open(1440, 900);
  await toMirror(page);
  await scrollToSection(page, 'mirror-places');
  await shot(page, 'places-1440');
  await page.close();
}

if (scenario === 'canvas-mobile') {
  const page = await open(390, 844);
  await toMirror(page);
  await scrollToSection(page, 'mirror-programme');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim() === 'Composer ce moment')?.click();
  });
  await settle(1500);
  await shot(page, 'canvas-mobile');
  await page.close();
}

if (scenario === 'focus') {
  const page = await open(1440, 900);
  await toMirror(page);
  await scrollToSection(page, 'mirror-programme');
  // Focus the rail from the keyboard: :focus-visible only lights up for a
  // keyboard-driven focus, so we seed it then press Tab.
  await page.evaluate(() => {
    document.querySelector('nav[aria-label="Sections du site"] button')?.focus();
  });
  await page.keyboard.press('Tab');
  await settle(300);
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { text: el?.textContent?.trim().slice(0, 24), outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor };
  });
  console.log('  focus clavier sur:', JSON.stringify(focused));
  await shot(page, 'focus-ring', { clip: { x: 0, y: 40, width: 1440, height: 120 } });
  // And a hover state on an editorial control.
  const target = await page.$('#mirror-programme button');
  if (target) { await target.hover(); await settle(300); }
  await shot(page, 'hover-state', { clip: { x: 140, y: 200, width: 1000, height: 500 } });
  await page.close();
}

/**
 * DEMO — the image states, seen for real.
 *
 * The project has zero media, so the only way to LOOK at the image states is
 * to attach assets at runtime. They are generated inside the page (abstract
 * gradients, not photographs, not stock imagery), they live in a throwaway
 * browser profile, and nothing is written to the repository. They exist to
 * observe geometry — never to pretend the wedding has pictures.
 */
if (scenario === 'demo') {
  const page = await open(1440, 900);
  await toMirror(page);
  await page.evaluate(() => {
    const make = (w, h, a, b, label) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, a); g.addColorStop(1, b);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,0.30)';
      x.font = `600 ${Math.round(h * 0.1)}px sans-serif`;
      x.fillText(label, w * 0.06, h * 0.9);
      return c.toDataURL('image/png');
    };
    // A tiny, real, silent WAV: enough for a genuine <audio> source.
    const wav = () => {
      const rate = 8000; const secs = 1; const n = rate * secs;
      const buf = new ArrayBuffer(44 + n * 2); const v = new DataView(buf);
      const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
      str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
      v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      str(36, 'data'); v.setUint32(40, n * 2, true);
      let s = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return `data:audio/wav;base64,${btoa(s)}`;
    };
    window.__demo = { make, wav };
  });

  // The store is not on window, so the assets are attached through the very
  // path a user would take: the Canvas media field. Simpler and just as real:
  // dispatch through the app's own module graph via a dynamic import.
  const attached = await page.evaluate(async () => {
    const mod = await import('/src/game/weddingStore.ts');
    const store = mod.weddingStore;
    const { make, wav } = window.__demo;
    store.addMedia({ kind: 'image', source: make(1800, 1100, '#5a4c3f', '#cbb79b', 'COUVERTURE'),
      ownerKind: 'wedding', ownerId: store.currentProject.id, title: 'Couverture' });
    const g = store.guests[0];
    store.addMedia({ kind: 'image', source: make(600, 600, '#4a5560', '#9fb0bd', 'PORTRAIT'),
      ownerKind: 'person', ownerId: g.personId, title: 'Portrait' });
    const t = store.tracks[0];
    store.addMedia({ kind: 'image', source: make(800, 800, '#2f3a4a', '#b58e6a', 'POCHETTE'),
      ownerKind: 'song', ownerId: t.id, title: 'Pochette' });
    store.addMedia({ kind: 'audio', source: wav(), ownerKind: 'song', ownerId: t.id, title: 'Extrait' });
    const t2 = store.tracks[1];
    store.addMedia({ kind: 'image', source: make(800, 800, '#3d3a33', '#a8a08f', 'POCHETTE 2'),
      ownerKind: 'song', ownerId: t2.id, title: 'Pochette' });
    const place = store.places[0];
    store.addMedia({ kind: 'image', source: make(1600, 900, '#38423a', '#a9bda6', 'LIEU'),
      ownerKind: 'place', ownerId: place.id, title: 'Le lieu' });
    store.notify();
    return store.media.length;
  });
  console.log('  médias attachés (session éphémère):', attached);
  await settle(1200);

  await shot(page, 'demo-hero');
  for (const id of ['mirror-programme', 'mirror-guests', 'mirror-music', 'mirror-gallery']) {
    await scrollToSection(page, id);
    await shot(page, `demo-${id.replace('mirror-', '')}`);
  }
  // Press Play on a track that really has audio, and photograph the state.
  await scrollToSection(page, 'mirror-music');
  const played = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label^="Écouter"]');
    if (!btn) return false;
    btn.click();
    return true;
  });
  console.log('  bouton Play réel cliqué:', played);
  await settle(900);
  await shot(page, 'demo-playing');
  // The tracks that really carry a cover live further down the section.
  await page.evaluate(() => {
    const img = document.querySelector('#mirror-music img');
    img?.scrollIntoView({ block: 'center' });
  });
  await settle(600);
  await shot(page, 'demo-cover-play');
  await page.close();
}

if (scenario === 'media') {
  const page = await open(1440, 900);
  // A REAL image, generated locally as a data URL — never a stock photo, and
  // removed at the end. It exists only to see the image states render.
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 1600, 1000);
    g.addColorStop(0, '#6b5b4a'); g.addColorStop(1, '#c9b79c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 1000);
    window.__probeImage = canvas.toDataURL('image/png');
  });
  await toMirror(page);
  await shot(page, 'media-before');
  await page.close();
}

await browser.close();
console.log('done');
