#!/usr/bin/env node
/**
 * ACCEPTANCE — V2: editorial media, and real scenarios.
 *
 * Two things are proven here, in a real Chromium:
 *
 *   1. the public page is visually rich — portraits, record sleeves, moment
 *      photographs — and NONE of it can reach a project: a wedding created
 *      right after browsing it still has zero media and zero /editorial/ in
 *      its snapshot;
 *   2. a scenario is a real branch: created, modified, compared, applied line
 *      by line or entirely, abandoned — and the main day never moves until it
 *      is applied. Survives a reload, and never leaks into another wedding.
 *
 * Usage: node scripts/acceptance-v2.mjs [width]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/v2';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/v2-profile';
rmSync(PROFILE, { recursive: true, force: true });

const WIDTH = Number(process.argv[2] || 1440);
const log = [];
let failures = 0;
const say = (...a) => { const l = a.join(' '); console.log(l); log.push(l); };
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  say(`  ${ok ? 'OK  ' : 'ÉCHEC'} · ${label}${detail ? ' — ' + detail : ''}`);
  return ok;
};

const browser = await puppeteer.launch({
  executablePath: '/tmp/chromium',
  headless: true,
  userDataDir: PROFILE,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp/swiftshader:/tmp' },
});
const p = await browser.newPage();
await p.setViewport({ width: WIDTH, height: WIDTH < 500 ? 844 : 900 });
p.on('pageerror', (e) => {
  const s = String(e);
  if (s.includes('Failed to fetch')) return;
  say('  [erreur page]', s.slice(0, 180));
});

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}-${WIDTH}.png` }); };
const click = (attr, tag) => p.evaluate((attr, tag) => {
  const el = document.querySelector(`[data-${attr}="${tag}"]`);
  if (!el) return false; el.click(); return true;
}, attr, tag);
const setField = (attr, tag, value) => p.evaluate((attr, tag, value) => {
  const el = document.querySelector(`[data-${attr}="${tag}"]`);
  if (!el) return false;
  el.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, attr, tag, value);
const typeInto = (matcher, v) => p.evaluate((matcher, v) => {
  const i = [...document.querySelectorAll('input')]
    .find((x) => (x.placeholder || '').includes(matcher) || x.type === matcher);
  if (!i) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v);
  i.dispatchEvent(new Event('input', { bubbles: true }));
  i.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, matcher, v);
const clickText = (t) => p.evaluate((t) => {
  const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(t));
  if (!el) return false; el.click(); return true;
}, t);

const state = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const raw = localStorage.getItem('wedding_city_state_' + id) || '';
  const st = raw ? JSON.parse(raw) : null;
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  const everyState = Object.keys(localStorage)
    .filter((k) => k.startsWith('wedding_city_state_'))
    .map((k) => localStorage.getItem(k) || '');
  return {
    id,
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour })),
    scenarios: L('scenarios').map((s) => ({
      id: s.id, name: s.name, phases: (s.phases || []).map((x) => ({ id: x.id, start: x.startHour })),
    })),
    media: L('media').length,
    editorialInThisProject: /\/editorial\//.test(raw),
    editorialAnywhere: everyState.some((s) => /\/editorial\//.test(s)),
    text: (document.body.innerText || '').replace(/\s+/g, ' '),
  };
});

const noOverflow = async (label) => {
  const m = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth, vw: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1
        && !el.closest('[data-landing="film"]') && !el.closest('[data-jourj="strip"]')
        && !el.closest('.wc-product-nav-links'))
      .slice(0, 3).map((el) => `${el.tagName}.${String(el.className).slice(0, 24)}`),
  }));
  return check(`${label} · aucun débordement horizontal`, m.sw === m.vw,
    `${m.sw}/${m.vw}${m.offenders.length ? ' — ' + m.offenders.join(' | ') : ''}`);
};

const fmt = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// ═══════════════════════════════════════════════════════════════════════════
say(`### V2 — médias éditoriaux et scénarios réels — ${WIDTH}px`);

// --- 1. the page is visually rich ------------------------------------------
say('\n=== 1. LA PAGE EST VISUELLE ===');
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3200);
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 2200 }));
await wait(900);
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 5200 }));
await wait(1200);

const visuals = await p.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')];
  const by = (sel) => [...document.querySelectorAll(sel)].map((i) => ({ ok: i.naturalWidth > 0, src: i.getAttribute('src') }));
  return {
    total: imgs.length,
    loaded: imgs.filter((i) => i.naturalWidth > 0).length,
    portraits: by('.wc-gj-portrait'),
    covers: by('.wc-gj-track-cover'),
    moments: by('[data-landing="film-moment"] img').length,
    tracks: document.querySelectorAll('[data-landing="track"]').length,
    people: document.querySelectorAll('[data-landing="person"]').length,
    play: document.querySelectorAll('.wc-gj-track-play').length,
    disclaimers: (document.body.innerText.match(/Démonstration/g) || []).length,
  };
});
say('  ' + JSON.stringify({ ...visuals, portraits: visuals.portraits.length, covers: visuals.covers.length }));
check('trois portraits éditoriaux chargés',
  visuals.portraits.length === 3 && visuals.portraits.every((x) => x.ok),
  JSON.stringify(visuals.portraits.map((x) => x.ok)));
check('trois pochettes de démonstration chargées',
  visuals.covers.length === 3 && visuals.covers.every((x) => x.ok));
check('chaque morceau porte un repère de lecture', visuals.play === 3, String(visuals.play));
check('les huit photographies de la pellicule sont chargées', visuals.moments === 8, String(visuals.moments));
check('toutes les images de la page sont réellement chargées',
  visuals.loaded === visuals.total, `${visuals.loaded}/${visuals.total}`);
check('chaque démonstration est étiquetée comme telle', visuals.disclaimers >= 3, String(visuals.disclaimers));
await shot('01-music-people');
await noOverflow('Page publique');

// --- 2. HERA: music really is time -----------------------------------------
say('\n=== 2. LA MUSIQUE EST DU TEMPS ===');
const before = await p.evaluate(() => [...document.querySelectorAll('[data-landing="track-hour"]')].map((x) => x.textContent.trim()));
await click('landing', 'music-stretch');
await wait(700);
const after = await p.evaluate(() => [...document.querySelectorAll('[data-landing="track-hour"]')].map((x) => x.textContent.trim()));
say(`  ${before.join(' ')} → ${after.join(' ')}`);
check('allonger un morceau déplace les suivants',
  before[0] === after[0] && before[1] !== after[1] && before[2] !== after[2],
  `${before.join(',')} → ${after.join(',')}`);
check('la conséquence est écrite', await p.evaluate(() => !!document.querySelector('[data-landing="music-note"]')));

// --- 3. the closing line is universal --------------------------------------
say('\n=== 3. ACCROCHE FINALE ===');
const closingWedding = await p.evaluate(() => document.querySelector('[data-landing="closing-title"]')?.textContent.trim());
await p.evaluate(() => {
  const sel = document.querySelector('[data-landing="type"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, 'seminaire');
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(500);
const closingPro = await p.evaluate(() => document.querySelector('[data-landing="closing-title"]')?.textContent.trim());
say(`  mariage : « ${closingWedding} » · séminaire : « ${closingPro} »`);
check('la variante mariage parle d’un oui', /oui/i.test(closingWedding || ''));
check('la version universelle ne parle pas de mariage',
  !/oui|mariage/i.test(closingPro || ''), String(closingPro));
await p.evaluate(() => {
  const sel = document.querySelector('[data-landing="type"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, 'mariage');
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(300);

// --- 4. nothing editorial reaches a project --------------------------------
say('\n=== 4. AUCUN ASSET ÉDITORIAL N’ENTRE DANS UN PROJET ===');
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(500);
await click('landing', 'hero-create');
await wait(1200);
await typeInto('Clara', 'IRIS'); await typeInto('Alexandre', 'JONAS');
await clickText('Continuer'); await wait(400);
await typeInto('date', '2027-09-11');
await clickText('Continuer'); await wait(400);
await typeInto('Domaine', 'DOMAINE V2');
await clickText('Générer notre monde');
await wait(3200);
let s = await state();
check('un mariage réel est créé', !!s.id);
check('sa journée est vide', s.phases.length === 0, String(s.phases.length));
check('aucun média dans le projet', s.media === 0, String(s.media));
check('aucun chemin /editorial/ dans ce projet', !s.editorialInThisProject);
check('aucun chemin /editorial/ dans AUCUN projet', !s.editorialAnywhere);

// --- 5. scenarios ----------------------------------------------------------
say('\n=== 5. SCÉNARIOS RÉELS ===');
const mk = async (name, start, minutes) => {
  await p.evaluate(() => {
    const btn = document.querySelector('[data-jourj="add-moment"]') || document.querySelector('[data-jourj="empty-add"]');
    if (!document.querySelector('[data-jourj="moment-name"]')) btn?.click();
  });
  await wait(300);
  await setField('jourj', 'moment-name', name);
  await setField('jourj', 'moment-start', start);
  await setField('jourj', 'moment-duration', String(minutes));
  await click('jourj', 'moment-create');
  await wait(450);
};
await mk('Cocktail', '17:30', 120);
await mk('Dîner', '19:30', 120);
await mk('Soirée', '22:00', 180);
s = await state();
check('trois moments existent', s.phases.length === 3, String(s.phases.length));
const mainBefore = s.phases.map((x) => `${x.name} ${fmt(x.start)}`).join(' | ');

await click('jourj', 'nav-organisation');
await wait(900);
await setField('scenario', 'name', 'Pluie');
await click('scenario', 'create');
await wait(900);
s = await state();
check('un scénario est créé', s.scenarios.length === 1, JSON.stringify(s.scenarios.map((x) => x.name)));
check('il copie la journée telle quelle', s.scenarios[0]?.phases.length === 3);
check('la journée principale n’a pas bougé',
  s.phases.map((x) => `${x.name} ${fmt(x.start)}`).join(' | ') === mainBefore, mainBefore);

// modify inside the branch
await p.evaluate(() => {
  const b = [...document.querySelectorAll('[data-scenario="shift"]')].find((x) => /Cocktail/.test(x.textContent));
  b?.click();
});
await wait(900);
s = await state();
const branch = s.scenarios[0];
const branchCocktail = branch.phases.find((x) => x.id === s.phases.find((ph) => ph.name === 'Cocktail').id);
const mainCocktail = s.phases.find((x) => x.name === 'Cocktail');
check('le scénario décale le cocktail', Math.abs(branchCocktail.start - mainCocktail.start - 0.5) < 1e-6,
  `${fmt(mainCocktail.start)} → ${fmt(branchCocktail.start)}`);
check('et la suite du scénario suit',
  branch.phases.filter((bp) => {
    const real = s.phases.find((ph) => ph.id === bp.id);
    return real && Math.abs(bp.start - real.start - 0.5) < 1e-6;
  }).length === 3);
check('la journée principale n’a TOUJOURS pas bougé',
  s.phases.map((x) => `${x.name} ${fmt(x.start)}`).join(' | ') === mainBefore, mainBefore);

const diff = await p.evaluate(() => [...document.querySelectorAll('[data-scenario="diff"] li')]
  .map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
say('  ' + JSON.stringify(diff));
check('la comparaison montre les trois différences', diff.length === 3, String(diff.length));
check('chaque ligne dit l’écart en minutes', diff.every((d) => /\+30 min/.test(d)));
const rails = await p.evaluate(() => document.querySelectorAll('[data-scenario="rail"]').length);
check('les deux rails sont affichés', rails === 2, String(rails));
await shot('02-scenario-compare');
await noOverflow('Organisation avec scénario');

// apply one line only
await p.evaluate(() => document.querySelector('[data-scenario="apply-one"]')?.click());
await wait(900);
s = await state();
const movedOne = s.phases.filter((x) => {
  const b = branch.phases.find((bp) => bp.id === x.id);
  return b && Math.abs(b.start - x.start) < 1e-6;
}).length;
check('appliquer une ligne ne change qu’un moment', movedOne === 1, `${movedOne} moment(s) alignés`);

// apply the whole thing
await p.evaluate(() => document.querySelector('[data-scenario="apply-all"]')?.click());
await wait(1000);
s = await state();
const allAligned = s.phases.every((x) => {
  const b = branch.phases.find((bp) => bp.id === x.id);
  return b && Math.abs(b.start - x.start) < 1e-6;
});
check('appliquer tout aligne la journée sur le scénario', allAligned,
  s.phases.map((x) => `${x.name} ${fmt(x.start)}`).join(' | '));

// reload keeps everything
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
const reloaded = await state();
check('après reload, le scénario existe encore', reloaded.scenarios.length === 1);
check('après reload, la journée appliquée est conservée',
  reloaded.phases.map((x) => `${x.name} ${fmt(x.start)}`).join(' | ')
  === s.phases.map((x) => `${x.name} ${fmt(x.start)}`).join(' | '),
  reloaded.phases.map((x) => fmt(x.start)).join(' '));

// discard
await click('jourj', 'nav-organisation');
await wait(900);
await p.evaluate(() => {
  const tab = document.querySelector('[data-scenario="tab"]');
  if (tab && !document.querySelector('[data-scenario="discard"]')) tab.click();
});
await wait(600);
await p.evaluate(() => document.querySelector('[data-scenario="discard"]')?.click());
await wait(900);
const afterDiscard = await state();
check('un scénario abandonné disparaît', afterDiscard.scenarios.length === 0);
check('et la journée reste celle qui avait été appliquée',
  afterDiscard.phases.map((x) => fmt(x.start)).join(' ') === reloaded.phases.map((x) => fmt(x.start)).join(' '));

// --- 6. no leak between weddings -------------------------------------------
say('\n=== 6. AUCUNE FUITE ENTRE PROJETS ===');
await click('jourj', 'nav-organisation'); await wait(400);
await setField('scenario', 'name', 'Retard +30');
await click('scenario', 'create');
await wait(800);
const withScenario = await state();
check('un scénario existe dans ce mariage', withScenario.scenarios.length === 1);

await click('jourj', 'nav-weddings'); await wait(1600);
await click('landing', 'hero-create'); await wait(1200);
await typeInto('Clara', 'KARL'); await typeInto('Alexandre', 'LOU');
await clickText('Continuer'); await wait(400);
await clickText('Continuer'); await wait(400);
await clickText('Générer notre monde'); await wait(3000);
const other = await state();
check('le second mariage n’a aucun scénario', other.scenarios.length === 0, String(other.scenarios.length));
check('ni aucun moment', other.phases.length === 0, String(other.phases.length));
check('ni aucun média', other.media === 0);
check('toujours aucun /editorial/ nulle part', !other.editorialAnywhere);
await shot('03-second-projet');

say(`\n### RÉSULTAT ${WIDTH}px : ${failures} échec(s)`);
writeFileSync(`${OUT}/v2-${WIDTH}.log`, log.join('\n'));
await browser.close();
process.exit(failures > 0 ? 1 : 0);
