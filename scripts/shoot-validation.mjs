#!/usr/bin/env node
/**
 * Visual validation shots for PR #5:
 *  1. landing hero with +, loupe, Agenda
 *  2. moment editor under the timeline
 *  3. Mini-site Studio — desktop
 *  4. Mini-site Studio — iPhone
 */
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const OUT = path.resolve('docs/validation-shots');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/';

const executablePath = await chromium.executablePath();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: [
    ...chromium.args,
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--font-render-hinting=none',
  ],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const settle = (ms = 800) => new Promise((r) => setTimeout(r, ms));

const shot = async (page, name, fullPage = false) => {
  const dest = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: dest, fullPage });
  console.log('→', dest);
  return dest;
};

const page = await browser.newPage();
page.setDefaultTimeout(45000);
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 160)));

// --- 1. Landing hero -------------------------------------------------------
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
await settle(1500);
await page.waitForSelector('[data-landing="hero"]', { timeout: 20000 });
// Ensure the three bar icons are present.
const bar = await page.evaluate(() => {
  const plus = document.querySelector('[data-landing="import-label"]');
  const search = document.querySelector('[data-landing="search"]');
  const agenda = document.querySelector('[data-landing="agenda"]');
  return {
    plus: !!plus, search: !!search, agenda: !!agenda,
    agendaLabel: agenda?.getAttribute('aria-label') || '',
    titles: [plus, search, agenda].map((el) => el?.getAttribute('title') || el?.getAttribute('aria-label') || null),
  };
});
console.log('hero bar', JSON.stringify(bar));
if (!bar.plus || !bar.search || !bar.agenda) {
  console.error('FAIL: hero bar missing + / loupe / Agenda');
  process.exit(1);
}
await shot(page, '01-hero-agenda');

// Open Agenda briefly to confirm modal, then close.
await page.click('[data-landing="agenda"]');
await settle(900);
const calOpen = await page.evaluate(() => !!document.querySelector('[data-cal="studio"]'));
console.log('calendar modal open', calOpen);
if (!calOpen) {
  console.error('FAIL: Agenda did not open CalendarStudio');
  process.exit(1);
}
await page.click('[data-cal="close"]');
await settle(400);

// --- 2. Open demo project → moment editor ----------------------------------
await page.evaluate(() => {
  // Access the store through a side-channel if exposed; otherwise click Mes événements.
  // weddingStore is a module singleton — inject via localStorage project load path.
});
// Prefer loading the demo through the public API if the page exposes nothing:
// navigate with a bootstrap that loads the demo in localStorage-compatible way.
await page.evaluate(async () => {
  // Dynamic import of the store from the same origin (Vite serves /src in dev).
  const mod = await import('/src/game/weddingStore.ts');
  const store = mod.weddingStore;
  store.loadProject('proj_demo_clara_alexandre');
});
await settle(1800);
await page.waitForSelector('#jour-j', { timeout: 20000 });

// Confirm no visible calendar in the desk header.
const deskCal = await page.evaluate(() => {
  const visible = [...document.querySelectorAll('[data-jourj="nav-calendar"]')]
    .filter((el) => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null && !el.hidden;
    });
  const eventNav = !!document.querySelector('[data-jourj="event-nav"]');
  const story = !!document.querySelector('[data-story="immersive-preview"]');
  return { visibleCalendarButtons: visible.length, eventNav, story };
});
console.log('desk chrome', JSON.stringify(deskCal));
if (deskCal.visibleCalendarButtons > 0 || deskCal.eventNav || deskCal.story) {
  console.error('FAIL: desk still shows calendar / event-nav / embedded mini-site');
  process.exit(1);
}

// Open first moment — the card itself is the door (no « Ouvrir » button).
const card = await page.$('[data-jourj="moment"]');
if (!card) {
  console.error('FAIL: no moment card to click');
  process.exit(1);
}
await card.evaluate((el) => el.scrollIntoView({ inline: 'center', block: 'nearest' }));
await card.click();
await settle(1400);

const editor = await page.evaluate(() => {
  const hub = document.querySelector('[data-jourj="hub"]');
  const selected = document.querySelector('[data-jourj="moment"].is-selected, [data-selected="yes"]');
  const strip = document.querySelector('[data-jourj="strip"]');
  const cover = hub?.querySelector('.wc-hub-cover');
  const coverDisplay = cover ? getComputedStyle(cover).display : 'none';
  const inlineHead = !!document.querySelector('[data-jourj="hub-inline-head"]');
  const sim = document.querySelector('[data-jourj="simulation"]');
  const hubTop = hub?.getBoundingClientRect().top ?? null;
  const simTop = sim?.getBoundingClientRect().top ?? null;
  const stripBottom = strip?.getBoundingClientRect().bottom ?? null;
  const lateral = getComputedStyle(hub || document.body).position === 'fixed'
    && (hub?.getBoundingClientRect().right ?? 0) > window.innerWidth - 20
    && (hub?.getBoundingClientRect().width ?? 0) < window.innerWidth * 0.5;
  return {
    hub: !!hub,
    selected: !!selected,
    coverDisplay,
    inlineHead,
    hubBeforeCommand: hubTop !== null && simTop !== null ? hubTop < simTop : null,
    hubUnderStrip: hubTop !== null && stripBottom !== null ? hubTop >= stripBottom - 8 : null,
    lateral,
    editorLocation: hub?.getAttribute('data-editor-location') || null,
  };
});
console.log('editor', JSON.stringify(editor));
if (!editor.hub || !editor.selected || editor.coverDisplay !== 'none' || !editor.inlineHead || editor.lateral) {
  console.error('FAIL: moment editor not inline under the film as required');
  process.exit(1);
}
// Compose a shot that keeps the strip + the top of the editor together.
await page.evaluate(() => {
  const strip = document.querySelector('[data-jourj="strip"]');
  strip?.scrollIntoView({ behavior: 'instant', block: 'start' });
});
await settle(500);
await shot(page, '02-moment-editor');

// --- 3. Studio mini-site desktop -------------------------------------------
await page.click('[data-jourj="brand-menu"]');
await settle(400);
const menuLabel = await page.evaluate(() => {
  const btn = document.querySelector('[data-jourj="open-minisite"]');
  return btn?.textContent?.trim() || null;
});
console.log('menu label', menuLabel);
if (menuLabel !== 'Ouvrir le studio mini-site') {
  console.error('FAIL: brand menu label incorrect:', menuLabel);
  process.exit(1);
}
await page.click('[data-jourj="open-minisite"]');
await settle(1200);
await page.waitForSelector('[data-minisite="studio"]', { timeout: 10000 });

const studio = await page.evaluate(() => {
  const nav = document.querySelector('[data-minisite="public-nav"]');
  const labels = [...(nav?.querySelectorAll('button') || [])].map((b) => b.textContent.trim());
  const devices = [...document.querySelectorAll('[data-minisite-device]')].map((b) => ({
    id: b.getAttribute('data-minisite-device'),
    label: b.textContent.trim(),
  }));
  const screen = document.querySelector('[data-minisite="screen"]');
  const scrollable = screen ? screen.scrollHeight > screen.clientHeight - 1 : false;
  return { labels, devices, scrollable, hasScreen: !!screen };
});
console.log('studio', JSON.stringify(studio));
if (!studio.devices.find((d) => d.id === 'desktop' && d.label === 'Ordinateur')
  || !studio.devices.find((d) => d.id === 'tablet' && d.label === 'iPad')
  || !studio.devices.find((d) => d.id === 'phone' && d.label === 'iPhone')) {
  console.error('FAIL: device formats incomplete');
  process.exit(1);
}
if (!studio.labels.includes('Programme') || !studio.labels.includes('Infos pratiques')) {
  console.error('FAIL: public nav incomplete inside device');
  process.exit(1);
}
await page.click('[data-minisite-device="desktop"]');
await settle(600);
await shot(page, '03-studio-desktop');

// --- 4. Studio mini-site iPhone --------------------------------------------
await page.click('[data-minisite-device="phone"]');
await settle(800);
const phoneFrame = await page.evaluate(() => {
  const frame = document.querySelector('[data-minisite-frame="phone"]');
  const screen = document.querySelector('[data-minisite="screen"]');
  return {
    frame: !!frame,
    overflowY: screen ? getComputedStyle(screen).overflowY : null,
    navInside: !!document.querySelector('[data-minisite-frame="phone"] [data-minisite="public-nav"]')
      || !!document.querySelector('[data-minisite="public-nav"]'),
  };
});
console.log('phone', JSON.stringify(phoneFrame));
await shot(page, '04-studio-iphone');

// Also verify event-type visuals resolve for all 14 types (source of truth).
const visuals = await page.evaluate(async () => {
  const { momentImage } = await import('/src/design/momentImagery.ts');
  const types = [
    'mariage', 'corporate', 'seminaire', 'festival', 'concert', 'spectacle',
    'gala', 'associatif', 'culturel', 'anniversaire', 'journee', 'mission', 'voyage', 'autre',
  ];
  const rows = types.map((t) => {
    const img = momentImage('Moment sans nom', null, t);
    const own = momentImage('Moment sans nom', 'data:image/png;base64,USER', t);
    return {
      type: t,
      productSrc: img.src,
      isProduct: img.isProductAsset,
      userWins: own.src.startsWith('data:') && own.isProductAsset === false,
      empty: !img.src,
    };
  });
  return rows;
});
const bad = visuals.filter((v) => v.empty || !v.isProduct || !v.userWins);
console.log('visuals sample', visuals.map((v) => `${v.type}:${v.productSrc.split('/').pop()}`).join(' | '));
if (bad.length) {
  console.error('FAIL: event visuals', bad);
  process.exit(1);
}

await browser.close();
console.log('\nAll visual validation shots written to', OUT);
