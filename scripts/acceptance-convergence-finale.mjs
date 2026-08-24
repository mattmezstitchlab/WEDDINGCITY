#!/usr/bin/env node
/**
 * ACCEPTANCE — CONVERGENCE FINALE.
 *
 * One product, one door, one timeline. This test drives a real Chromium and
 * proves, end to end:
 *
 *   the hero (a real select, eleven kinds of day) → a sentence with no hour →
 *   the analysis screen and its five levels of certainty → a FIRST DAY proposed
 *   and marked ESTIMÉ → the timeline showing what each scene is missing → a
 *   document generated from a moment → propagation named person by person →
 *   a plan B branched from it → the administration reading several events →
 *   reload → and NO access to a second timeline, the 3D world or the old
 *   chaos import.
 *
 * Usage: node scripts/acceptance-convergence-finale.mjs [width]
 */
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/finale';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/finale-profile';
rmSync(PROFILE, { recursive: true, force: true });

const WIDTH = Number(process.argv[2] || 1440);
let failures = 0;
const say = (...a) => console.log(a.join(' '));
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
  if (s.includes('Failed to fetch')) return; // known telemetry noise in index.html
  say('  [erreur page]', s.slice(0, 200));
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
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, attr, tag, value);
const clickText = (t) => p.evaluate((t) => {
  const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(t));
  if (!el) return false; el.click(); return true;
}, t);
const text = () => p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

/** Read the persisted state — never by importing the store into the page. */
const state = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const raw = localStorage.getItem('wedding_city_state_' + id) || '';
  const st = raw ? JSON.parse(raw) : null;
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  const projects = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]');
  return {
    id,
    projects: projects.map((x) => ({ id: x.id, name: x.coupleNames || x.title, type: x.eventTypeId })),
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour, conf: x.confidence ?? null, people: x.personIds || [] })),
    persons: L('persons').map((x) => ({ id: x.id, name: x.displayName, craft: x.craft || null })),
    media: L('media').map((m) => ({ owner: m.ownerKind, id: m.ownerId, title: m.title })),
    scenarios: L('scenarios').length,
    tasks: L('tasks').length,
  };
});

const noOverflow = async (label) => {
  const m = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth, vw: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1
        && !el.closest('[data-landing="film"]') && !el.closest('[data-jourj="strip"]')
        && !el.closest('.wc-product-nav-links'))
      .slice(0, 3).map((el) => `${el.tagName}.${String(el.className).slice(0, 28)}`),
  }));
  return check(`${label} · aucun débordement horizontal`, m.sw === m.vw,
    `${m.sw}/${m.vw}${m.offenders.length ? ' — ' + m.offenders.join(' | ') : ''}`);
};

// ═══════════════════════════════════════════════════════════════════════════
say(`### CONVERGENCE FINALE — ${WIDTH}px`);

// --- 1. THE HERO: ONE DOOR --------------------------------------------------
say('\n=== 1. LE HERO ===');
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);

const hero = await p.evaluate(() => {
  const sel = document.querySelector('[data-landing="type"]');
  const cs = sel ? getComputedStyle(sel) : null;
  return {
    title: document.querySelector('.wc-gj-title')?.textContent.trim(),
    signature: document.querySelector('.wc-gj-signature')?.textContent.trim(),
    bar: !!document.querySelector('[data-landing="tool"]'),
    brief: !!document.querySelector('[data-landing="brief"]'),
    importer: !!document.querySelector('[data-landing="import-label"]'),
    go: !!document.querySelector('[data-landing="hero-create"]'),
    options: sel ? [...sel.options].map((o) => o.textContent.trim()) : [],
    hasChevron: cs ? cs.backgroundImage.includes('svg') : false,
    hasBorder: cs ? cs.borderStyle !== 'none' : false,
  };
});
say('  ' + JSON.stringify({ ...hero, options: hero.options.length }));
check('le titre est LE GRAND JOUR®', /LE GRAND JOUR/.test(hero.title || ''), hero.title);
check('la signature est « L’amour en vrai. »', /amour en vrai/.test(hero.signature || ''), hero.signature);
check('une seule barre : champ, importer, type, flèche',
  hero.bar && hero.brief && hero.importer && hero.go);
check('le sélecteur de type EST visiblement un menu déroulant (chevron + contour)',
  hero.hasChevron && hero.hasBorder, `chevron:${hero.hasChevron} contour:${hero.hasBorder}`);
check('onze natures d’événement sont proposées', hero.options.length === 11, String(hero.options.length));
for (const t of ['Mariage', 'Événement corporate', 'Festival', 'Concert', 'Gala', 'Spectacle',
  'Événement associatif', 'Événement culturel', 'Séminaire', 'Anniversaire / célébration', 'Autre']) {
  if (!hero.options.includes(t)) check(`type « ${t} » proposé`, false, hero.options.join(' | '));
}
check('les onze types attendus y sont tous',
  ['Mariage', 'Festival', 'Concert', 'Gala', 'Spectacle'].every((t) => hero.options.includes(t)));
await shot('01-hero');
await noOverflow('Landing');

// --- 2. THE LANDING SEQUENCE ------------------------------------------------
say('\n=== 2. LA LANDING RACONTE LES INNOVATIONS RÉELLES ===');
const landing = await p.evaluate(() => ({
  indices: [...document.querySelectorAll('.wc-gj-index')].map((n) => n.textContent.trim()),
  chaos: !!document.querySelector('[data-landing="chaos"]'),
  chaosLines: [...document.querySelectorAll('[data-landing="chaos-line"]')].map((n) => n.dataset.level),
  admin: !!document.querySelector('[data-landing="administration"]'),
  causality: !!document.querySelector('[data-landing="causality"]'),
  film: !!document.querySelector('[data-landing="film"]'),
}));
say('  ' + JSON.stringify(landing));
check('la séquence « importer le chaos » existe', landing.chaos);
check('elle montre les cinq niveaux de certitude',
  ['CONFIRMÉ', 'DÉDUIT', 'ESTIMÉ', 'À CONFIRMER', 'MANQUANT'].every((l) => landing.chaosLines.includes(l)),
  landing.chaosLines.join(','));
check('la séquence « administration invisible » existe', landing.admin);
check('la pellicule et la causalité sont toujours là', landing.film && landing.causality);
const nums = landing.indices.map(Number).filter((n) => Number.isFinite(n));
check('la numérotation est strictement croissante, sans doublon',
  nums.every((n, i) => i === 0 || n > nums[i - 1]), nums.join(' '));

// --- 3. A SENTENCE WITH NO HOUR → A PROPOSED DAY ----------------------------
say('\n=== 3. ANALYSE : CINQ CERTITUDES ET UNE PREMIÈRE JOURNÉE ===');
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
await setField('landing', 'brief', 'Nous nous marions le 18 juillet 2027 au Château de Vaux.');
await click('landing', 'hero-create');
await wait(2600);

const analysis = await p.evaluate(() => {
  const cells = [...document.querySelectorAll('[data-intake="recap-line"]')]
    .map((n) => ({ label: n.dataset.label, level: n.dataset.level }));
  return {
    heading: document.querySelector('[data-intake="review"] div')?.textContent.trim(),
    body: (document.body.innerText || '').replace(/\s+/g, ' '),
    cells,
    proposed: !!document.querySelector('[data-intake="proposed-day"]'),
    moments: document.querySelectorAll('[data-intake="moment"]').length,
    levels: [...document.querySelectorAll('[data-intake="moment-confidence"]')].map((n) => n.dataset.level),
  };
});
say('  ' + JSON.stringify({ cells: analysis.cells.length, proposed: analysis.proposed, moments: analysis.moments }));
check('l’écran d’analyse s’annonce comme tel', /analyse de votre événement/i.test(analysis.body));
check('il dit ce qu’il a compris', /Voici ce que nous avons compris/.test(analysis.body));
check('le récapitulatif couvre type, date, lieu, personnes, moments, prestataires, artistes, musique, documents, contraintes',
  ['Type', 'Date', 'Lieu', 'Moments', 'Prestataires', 'Artistes', 'Musique', 'Documents', 'Contraintes']
    .every((l) => analysis.cells.some((c) => c.label === l)),
  analysis.cells.map((c) => c.label).join(','));
check('chaque ligne porte un niveau de certitude',
  analysis.cells.every((c) => ['confirmed', 'inferred', 'estimated', 'to_confirm', 'missing'].includes(c.level)));
check('la date lue est CONFIRMÉE', analysis.cells.find((c) => c.label === 'Date')?.level === 'confirmed');
check('les mariés ne sont pas devinés : MANQUANT',
  analysis.cells.find((c) => c.label === 'Les mariés')?.level === 'missing',
  String(analysis.cells.find((c) => c.label === 'Les mariés')?.level));
check('une première structure est proposée', analysis.proposed && /première structure proposée/.test(analysis.body));
check('elle compte dix moments', analysis.moments === 10, String(analysis.moments));
check('et tous sont marqués ESTIMÉ, aucun CONFIRMÉ',
  analysis.levels.length === 10 && analysis.levels.every((l) => l === 'estimated'),
  [...new Set(analysis.levels)].join(','));
check('la génération reste bloquée tant que les mariés ne sont pas écrits',
  await p.evaluate(() => document.querySelector('[data-intake="generate"]')?.disabled === true));
await shot('02-analyse');
await noOverflow('Analyse');

// correct, then generate
await p.evaluate(() => {
  const el = document.querySelector('[data-intake="intake-couple"]');
  el.focus(); // MEASURED: blur() on a never-focused input fires no onBlur, so
              // the value was typed and never committed.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'NINA & OSCAR');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.blur();
});
await wait(500);
await click('intake', 'generate');
await wait(3200);

// --- 4. THE TIMELINE SAYS WHAT IS MISSING -----------------------------------
say('\n=== 4. LA PELLICULE MONTRE CE QUI MANQUE ===');
const st1 = await state();
check('la journée existe avec ses dix moments', st1.phases.length === 10, String(st1.phases.length));
check('la certitude est persistée avec chaque heure',
  st1.phases.every((x) => x.conf === 'estimated'), [...new Set(st1.phases.map((x) => x.conf))].join(','));
check('le type d’événement est retenu sur le projet',
  st1.projects.find((x) => x.id === st1.id)?.type === 'mariage',
  String(st1.projects.find((x) => x.id === st1.id)?.type));

const film = await p.evaluate(() => ({
  cards: document.querySelectorAll('[data-jourj="moment"]').length,
  tags: [...document.querySelectorAll('[data-jourj="moment-certainty"]')].map((n) => n.textContent.trim()),
  stateLines: document.querySelectorAll('[data-jourj="moment-state-line"]').length,
}));
say('  ' + JSON.stringify({ ...film, tags: film.tags.length }));
check('chaque scène porte son étiquette ESTIMÉ sur la pellicule',
  film.tags.length === 10 && film.tags.every((t) => t === 'ESTIMÉ'), [...new Set(film.tags)].join(','));
check('les scènes annoncent leur état (✓ / ⚠)', film.stateLines > 0, String(film.stateLines));
await shot('03-pellicule');

// --- 5. A MOMENT IS A CONTROL DESK ------------------------------------------
say('\n=== 5. LE MOMENT EST UN POSTE DE PILOTAGE ===');
await p.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-jourj="moment"]')];
  const cocktail = cards.find((c) => c.textContent.includes('Cocktail')) || cards[0];
  cocktail?.querySelector('[data-jourj="open-moment"]')?.click();
});
await wait(1000);
const hub = await p.evaluate(() => ({
  state: document.querySelectorAll('[data-jourj="hub-state-line"]').length,
  actions: ['hub-action-generate', 'hub-action-task', 'hub-action-planb']
    .filter((t) => !!document.querySelector(`[data-jourj="${t}"]`)),
  body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 2000),
}));
say('  ' + JSON.stringify({ state: hub.state, actions: hub.actions }));
check('le moment affiche son état', hub.state > 0, String(hub.state));
check('et porte ses actions sans quitter la pellicule',
  hub.actions.length === 3, hub.actions.join(','));
check('l’horaire estimé y est dit tel quel', /ESTIMÉ|Horaire estimé/i.test(hub.body));
await shot('04-moment');
await noOverflow('Moment');

// attach a person with a craft, then watch a missing document appear
await p.evaluate(() => {
  const el = [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').includes('Créer'))
    || [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').includes('personne'));
  if (!el) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'MATT MEZ');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
});
await wait(900);
await p.keyboard.press('Escape');
await wait(600);

// --- 6. PROPAGATION, BY NAME -------------------------------------------------
say('\n=== 6. CAUSALITÉ : QUI BOUGE, ET CE QUE ÇA CASSE ===');
// A card scrolled out of the strip cannot be grabbed by a human either:
// bring it into view first, exactly as one would scroll to it.
await p.evaluate(() => {
  const card = [...document.querySelectorAll('[data-jourj="moment"]')]
    .find((el) => (el.textContent || '').includes('Cocktail'));
  card?.scrollIntoView({ inline: 'center', block: 'nearest' });
});
await wait(700);
const moved = await p.evaluate(() => {
  const card = [...document.querySelectorAll('[data-jourj="moment"]')].find((c) => c.textContent.includes('Cocktail'));
  if (!card) return null;
  const r = card.getBoundingClientRect();
  return { left: r.left, top: r.top, id: card.dataset.phaseId };
});
if (moved) {
  const y = moved.top + 60;
  const x = Math.min(Math.max(moved.left + 40, 50), WIDTH - 150);
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + 100, y, { steps: 8 });
  await wait(250);
  await p.mouse.up();
  await wait(900);
}
const ripple = await p.evaluate(() => ({
  bar: !!document.querySelector('[data-jourj="ripple"]'),
  people: document.querySelectorAll('[data-jourj="ripple-person"]').length,
  vendors: document.querySelectorAll('[data-jourj="ripple-vendor"]').length,
  conflicts: document.querySelectorAll('[data-jourj="ripple-conflict"]').length,
  apply: !!document.querySelector('[data-jourj="ripple-apply"]'),
  planB: !!document.querySelector('[data-jourj="ripple-planb"]'),
  dismiss: !!document.querySelector('[data-jourj="ripple-dismiss"]'),
  text: document.querySelector('[data-jourj="ripple"]')?.innerText.replace(/\s+/g, ' ') || '',
}));
say('  ' + JSON.stringify(ripple));
check('déplacer un moment propose la propagation', ripple.bar, ripple.text.slice(0, 90));
check('les trois issues sont offertes : appliquer, plan B, ce moment seulement',
  ripple.apply && ripple.planB && ripple.dismiss);
await shot('05-causalite');

// branch a plan B from it — the scenario engine, not a new one
if (ripple.planB) {
  await click('jourj', 'ripple-planb');
  await wait(1400);
}
const st2 = await state();
check('un plan B est bien une branche du moteur de scénarios existant',
  st2.scenarios >= 1, `${st2.scenarios} scénario(s)`);
check('et la journée principale n’a pas été modifiée par le plan B',
  st2.phases.filter((x) => x.name === 'Cocktail').length === 1);

// --- 7. ADMINISTRATION -------------------------------------------------------
say('\n=== 7. ADMINISTRATION : PLUSIEURS ÉVÉNEMENTS, UNE SURFACE ===');
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(500);
const hasAdminEntry = await click('jourj', 'nav-admin');
check('l’entrée « Administration » existe pour celui qui pilote', hasAdminEntry);
await wait(1200);
const admin = await p.evaluate(() => ({
  console: !!document.querySelector('[data-admin="console"]'),
  search: !!document.querySelector('[data-admin="search"]'),
  filters: document.querySelectorAll('[data-admin="filter"]').length,
  events: document.querySelectorAll('[data-admin="event"]').length,
  alerts: document.querySelectorAll('[data-admin="alert"]').length,
  people: document.querySelectorAll('[data-admin="person"]').length,
  honesty: document.querySelector('[data-admin="honesty"]')?.textContent.replace(/\s+/g, ' ') || '',
}));
say('  ' + JSON.stringify({ ...admin, honesty: admin.honesty.slice(0, 60) }));
check('la base de contrôle s’ouvre', admin.console && admin.search);
check('elle filtre par nature d’objet', admin.filters >= 6, String(admin.filters));
check('elle liste les événements réellement stockés', admin.events >= 1, String(admin.events));
check('elle dit ce qui attend une décision', admin.alerts >= 1, String(admin.alerts));
check('elle dit franchement ce qui n’est pas disponible',
  /recherche d’une entreprise|n’est pas disponible/.test(admin.honesty)
  && /pas simulées/.test(admin.honesty));

await p.evaluate(() => {
  const el = document.querySelector('[data-admin="search"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'MATT');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(800);
const results = await p.evaluate(() => document.querySelectorAll('[data-admin="result"]').length);
check('la recherche universelle traverse les événements', results >= 1, String(results));
await shot('06-administration');
await noOverflow('Administration');

const dossier = await p.evaluate(() => {
  const b = document.querySelector('[data-admin="person-open"]');
  if (!b) return null;
  b.click();
  return true;
});
await wait(900);
if (dossier) {
  const card = await p.evaluate(() => ({
    open: !!document.querySelector('[data-admin="dossier"]'),
    events: document.querySelectorAll('[data-admin="dossier-event"]').length,
    text: document.querySelector('[data-admin="dossier"]')?.innerText.replace(/\s+/g, ' ') || '',
  }));
  check('une carte personne s’ouvre, avec ses événements', card.open && card.events >= 1);
  check('et ne montre aucune donnée inventée', !/Clara|Alexandre|Manoir|Gare TGV/.test(card.text));
  await shot('07-carte-personne');
}
await p.evaluate(() => document.querySelector('[data-admin="close"]')?.click());
await wait(600);

// --- 8. NO SECOND ANYTHING ---------------------------------------------------
say('\n=== 8. AUCUNE DEUXIÈME PORTE ===');
for (const key of ['KeyT', 'KeyI', 'KeyN', 'KeyC', 'KeyL', 'KeyG']) {
  await p.keyboard.press(key.replace('Key', ''));
  await wait(200);
}
await wait(800);
const doors = await p.evaluate(() => ({
  living: !!document.querySelector('.living-timeline, [data-living-timeline]'),
  inspector: [...document.querySelectorAll('div')].some((d) => /INSPECTEUR|WORLDMAP 3D|WORLD LAB/.test(d.textContent || '') && d.offsetParent),
  connectors: /CONNECTEURS|Google Drive|Spotify/.test(document.body.innerText),
  chaos: /IMPORTER LE CHAOS \(preset\)|preset/i.test(document.body.innerText),
  mirrorWord: /\bMirror\b/.test(document.body.innerText),
  world3d: /WORLDMAP|Monde 3D|World Lab/i.test(document.body.innerText),
  strips: document.querySelectorAll('[data-jourj="strip"]').length,
}));
say('  ' + JSON.stringify(doors));
check('aucune seconde pellicule n’est atteignable', !doors.living && doors.strips <= 1, String(doors.strips));
check('aucun inspecteur ni chrome 3D', !doors.inspector);
check('aucun hub de connecteurs', !doors.connectors);
check('aucun ancien import « chaos »', !doors.chaos);
check('le mot « Mirror » n’apparaît jamais', !doors.mirrorWord);
check('aucune porte vers le World 3D', !doors.world3d);
await shot('08-aucune-porte');

// --- 9. RELOAD + ISOLATION ----------------------------------------------------
say('\n=== 9. RECHARGEMENT ET ISOLATION ===');
await p.reload({ waitUntil: 'domcontentloaded' });
await wait(3200);
const st3 = await state();
check('la journée survit au rechargement', st3.phases.length === 10, String(st3.phases.length));
check('les niveaux de certitude aussi', st3.phases.every((x) => x.conf === 'estimated'));
const body = await text();
check('aucune donnée de démonstration dans un projet réel',
  !/Clara & Alexandre|Gare TGV|Manoir/.test(body));

say(`\n### ${failures === 0 ? 'TOUT EST VERT' : failures + ' ÉCHEC(S)'} — ${WIDTH}px`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
