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
