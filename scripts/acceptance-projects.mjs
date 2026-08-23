#!/usr/bin/env node
/**
 * MULTI-PROJECT ACCEPTANCE — driven in a real browser, as a user would.
 *
 * Rules of this test:
 *  · every project and every entity is created by CLICKING the real UI;
 *  · localStorage and the store are only ever READ, to observe what the UI did;
 *  · anything the UI cannot do is a RESULT, not something to work around.
 *
 *   node scripts/acceptance-projects.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/acceptance';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173/';
const log = [];
const say = (...a) => { const line = a.join(' '); console.log(line); log.push(line); };

const browser = await puppeteer.launch({
  executablePath: '/tmp/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp/swiftshader:/tmp' },
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => say('  [erreur page]', String(e).slice(0, 140)));

const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); say('  📷', n); };

const clickText = async (text, selector = 'button, [role="button"], div[title]') =>
  page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)]
      .find((b) => b.textContent.replace(/\s+/g, ' ').trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, text, selector);

const clickTitle = async (title) => page.evaluate((t) => {
  const el = document.querySelector(`[title="${t}"]`);
  if (!el) return false;
  el.click();
  return true;
}, title);

/**
 * READ-ONLY observation — DOM and localStorage ONLY.
 *
 * An earlier version of this script imported the store inside the page. Vite
 * served that import as a SECOND module instance: it reported numbers the
 * interface was not using AND, worse, its own boot wrote demo data into the
 * project under test. Measurement must not touch the thing it measures, so
 * everything below is read from what a user can see, or from what the
 * application itself wrote to storage.
 */
const snap = async () => page.evaluate(() => {
  const activeId = localStorage.getItem('wedding_city_active_project_id_v1');
  const projects = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]');
  const active = projects.find((p) => p.id === activeId) || null;
  const raw = activeId ? localStorage.getItem('wedding_city_state_' + activeId) : null;
  const st = raw ? JSON.parse(raw) : null;
  const list = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  const bodyText = document.body.innerText.replace(/\s+/g, ' ');
  const mirror = document.getElementById('wc-mirror');

  return {
    projectId: activeId,
    couple: active ? active.coupleNames : null,
    stored: projects.map((p) => `${p.id}|${p.coupleNames}`),
    stateKeys: Object.keys(localStorage).filter((k) => k.startsWith('wedding_city_state_')),
    counts: {
      phases: list('phases').length, persons: list('persons').length,
      places: list('places').length, vendors: list('vendors').length,
      tracks: list('tracks').length, agents: list('agents').length,
      media: list('media').length,
    },
    persons: list('persons').map((x) => x.displayName),
    places: list('places').map((x) => x.name),
    tracks: list('tracks').map((x) => x.title),
    hud: (document.querySelector('[title="Ouvrir le menu principal Wedding City"]')?.innerText || '')
      .replace(/\s+/g, ' ').trim(),
    mirrorText: mirror ? mirror.innerText.replace(/\s+/g, ' ').slice(0, 240) : null,
    showsDemoEstate: /Gare TGV|Manoir d.Honneur|Chapelle & Oliviers/.test(bodyText),
    mentionsClara: /Clara/.test(bodyText),
    emptyWorldNotice: /Ce monde n.a pas encore d.espaces/.test(bodyText),
  };
});

const brief = (s) => `${s.projectId} · ${s.couple} · phases=${s.counts.phases} `
  + `personnes=${s.counts.persons} lieux=${s.counts.places} morceaux=${s.counts.tracks}`
  + ` · HUD="${(s.hud || '').slice(0, 34)}"`;


/** Fill the create-wedding form the way a user would: by field, not by index. */
const fillWeddingForm = async (couple, date, place, who, budget, guests) =>
  page.evaluate((c, d, pl, w, b, g) => {
    const set = (el, v) => {
      if (!el) return null;
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return `${el.placeholder || el.type}=${el.value}`;
    };
    const inputs = [...document.querySelectorAll('input')];
    const byPh = (re) => inputs.find((i) => re.test(i.placeholder || ''));
    return [
      set(byPh(/Sophie & Julien/), c),
      set(inputs.find((i) => i.type === 'date'), d),
      set(byPh(/Chantilly/), pl),
      set(byPh(/^Ex: Sophie$/), w),
      set(byPh(/^25000$/), b),
      set(byPh(/^120$/), g),
    ].filter(Boolean);
  }, couple, date, place, who, budget, guests);

const results = {};

try {
  // =========================================================================
  say('=== 1. ÉTAT INITIAL (profil navigateur neuf) ===');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await settle(3500);
  const s0 = await snap();
  say('  ' + brief(s0));
  say('  projets stockés :', JSON.stringify(s0.stored));
  say('  clés d’état :', JSON.stringify(s0.stateKeys));
  await shot('01-initial');
  results.initial = s0;

  // =========================================================================
  say('\n=== 2. MENU PROJETS ===');
  const menu = await clickTitle('Ouvrir le menu principal Wedding City');
  say('  ouverture du menu :', menu);
  await settle(900);
  const menuItems = await page.evaluate(() => [...document.querySelectorAll('button, [role="button"]')]
    .map((b) => b.textContent.replace(/\s+/g, ' ').trim())
    .filter((t) => t && t.length < 60));
  say('  entrées du menu :', JSON.stringify(menuItems.filter((t) => /Mariage|Monde|Projet|Démo|Compte|Inviter/i.test(t))));
  await shot('02-menu');
  results.menuItems = menuItems;

  // =========================================================================
  say('\n=== 3. CRÉER LE PROJET A PAR L’INTERFACE ===');
  const openCreate = await clickText('Créer un Mariage');
  say('  ouverture du formulaire :', openCreate);
  await settle(1200);
  await shot('03-formulaire');

  const fields = await page.evaluate(() => [...document.querySelectorAll('input, select')]
    .map((i, idx) => ({ idx, type: i.type || i.tagName, ph: i.placeholder || '', value: i.value })));
  say('  champs du formulaire :', JSON.stringify(fields));

  const fillA = await fillWeddingForm('ALPHA-UN & ALPHA-DEUX', '2027-03-05', 'DOMAINE ALPHA UNIQUE', 'Alpha Organisateur', '11111', '11');
  say('  saisie A :', JSON.stringify(fillA));
  await shot('04-formulaire-rempli');

  const submitted = await clickText('Générer le Monde');
  say('  soumission :', submitted);
  await settle(2500);
  const sA = await snap();
  say('  APRÈS CRÉATION A → ' + brief(sA));
  say('  projets stockés :', JSON.stringify(sA.stored));
  say('  lieux du projet A :', JSON.stringify(sA.places.slice(0, 6)));
  say('  personnes A (6 premières) :', JSON.stringify(sA.persons.slice(0, 6)));
  say('  morceaux A :', JSON.stringify(sA.tracks.slice(0, 5)));
  await shot('05-projet-A-world');
  results.afterCreateA = sA;

  // =========================================================================
  say('\n=== 4. CRÉER DES DONNÉES UNIQUES DANS A (via Canvas) ===');
  await page.keyboard.press('Escape');
  await settle(400);
  const openCanvas = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().toUpperCase() === 'CANVAS');
    if (!b) return false; b.click(); return true;
  });
  say('  ouverture du Canvas :', openCanvas);
  await settle(1800);
  await shot('06-canvas-A');

  // people surface → create a person with a unique name
  const madePerson = await page.evaluate(async () => {
    const railBtn = [...document.querySelectorAll('nav button')].find((b) => /Personnes/i.test(b.textContent));
    railBtn?.click();
    await new Promise((r) => setTimeout(r, 600));
    const add = [...document.querySelectorAll('button')].find((b) => /Ajouter une personne/i.test(b.textContent));
    if (!add) return 'bouton absent';
    add.click();
    await new Promise((r) => setTimeout(r, 500));
    const input = [...document.querySelectorAll('input')].find((i) => /Prénom/i.test(i.placeholder || ''));
    if (!input) return 'champ absent';
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'ZORGLUB ALPHA');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    const create = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Créer');
    if (!create) return 'bouton Créer absent';
    create.click();
    return 'ok';
  });
  say('  création personne A :', madePerson);
  await settle(1200);

  const madeTrack = await page.evaluate(async () => {
    const railBtn = [...document.querySelectorAll('nav button')].find((b) => /Musique/i.test(b.textContent));
    railBtn?.click();
    await new Promise((r) => setTimeout(r, 600));
    const add = [...document.querySelectorAll('button')].find((b) => /Ajouter un morceau/i.test(b.textContent));
    if (!add) return 'bouton absent';
    add.click();
    return 'ok';
  });
  say('  création morceau A :', madeTrack);
  await settle(1200);

  const madePlace = await page.evaluate(async () => {
    const railBtn = [...document.querySelectorAll('nav button')].find((b) => /Lieux/i.test(b.textContent));
    railBtn?.click();
    await new Promise((r) => setTimeout(r, 600));
    const add = [...document.querySelectorAll('button')].find((b) => /Ajouter un lieu/i.test(b.textContent));
    if (!add) return 'bouton absent';
    add.click();
    return 'ok';
  });
  say('  création lieu A :', madePlace);
  await settle(1200);
  await shot('07-canvas-A-apres-creations');

  const sA2 = await snap();
  say('  A APRÈS CRÉATIONS → ' + brief(sA2));
  say('  ZORGLUB présent :', sA2.persons.some((n) => /ZORGLUB/.test(n)));
  results.afterEditA = sA2;

  // =========================================================================
  say('\n=== 5. MIRROR SUR LE PROJET A ===');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim().toUpperCase() === 'MIRROR')?.click();
  });
  await settle(2000);
  const mirrorA = await page.evaluate(() => {
    const root = document.getElementById('wc-mirror');
    return root ? root.innerText.replace(/\s+/g, ' ').slice(0, 400) : 'MIRROR ABSENT';
  });
  say('  Mirror (extrait) :', mirrorA.slice(0, 220));
  await shot('08-mirror-A');
  results.mirrorA = mirrorA;

  // =========================================================================
  say('\n=== 6. RELOAD : le projet actif est-il restauré ? ===');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await settle(3500);
  const sAreload = await snap();
  say('  APRÈS RELOAD → ' + brief(sAreload));
  say('  ZORGLUB toujours là :', sAreload.persons.some((n) => /ZORGLUB/.test(n)));
  await shot('09-reload-A');
  results.afterReloadA = sAreload;

  // =========================================================================
  say('\n=== 7. BASCULER VERS LA DÉMO (seul autre projet accessible ?) ===');
  await clickTitle('Ouvrir le menu principal Wedding City');
  await settle(800);
  const toDemo = await clickText('Basculer vers le Mode Démo');
  say('  bascule démo :', toDemo);
  await settle(2500);
  const sDemo = await snap();
  say('  DÉMO → ' + brief(sDemo));
  say('  ZORGLUB (fuite ?) :', sDemo.persons.some((n) => /ZORGLUB/.test(n)));
  say('  DOMAINE ALPHA (fuite ?) :', sDemo.places.some((n) => /ALPHA/.test(n)));
  await shot('10-demo');
  results.demo = sDemo;

  // =========================================================================
  say('\n=== 8. REVENIR AU PROJET A : existe-t-il un chemin dans l’interface ? ===');
  await clickTitle('Ouvrir le menu principal Wedding City');
  await settle(800);
  const menuItems2 = await page.evaluate(() => [...document.querySelectorAll('button, [role="button"]')]
    .map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 70));
  const pathBack = menuItems2.filter((t) => /ALPHA|projet|Projet|sélection|Sélection|changer|Changer/i.test(t));
  say('  entrées permettant de revenir sur A :', JSON.stringify(pathBack));
  await shot('11-menu-retour');
  results.pathBackToA = pathBack;

  // =========================================================================
  say('\n=== 9. CRÉER LE PROJET B ET VÉRIFIER L’ISOLATION ===');
  const openCreate2 = await clickText('Créer un Mariage');
  say('  formulaire B :', openCreate2);
  await settle(1200);
  const fillB = await fillWeddingForm('BETA-UN & BETA-DEUX', '2028-09-09', 'CHALET BETA UNIQUE', 'Beta Organisateur', '77777', '77');
  say('  saisie B :', JSON.stringify(fillB));
  await clickText('Générer le Monde');
  await settle(2500);
  const sB = await snap();
  say('  PROJET B → ' + brief(sB));
  say('  projets stockés :', JSON.stringify(sB.stored));
  say('  ZORGLUB dans B (fuite ?) :', sB.persons.some((n) => /ZORGLUB/.test(n)));
  say('  DOMAINE ALPHA dans B (fuite ?) :', sB.places.some((n) => /ALPHA/.test(n)));
  say('  clés d’état :', JSON.stringify(sB.stateKeys));
  await shot('12-projet-B');
  results.projectB = sB;

  // =========================================================================
  say('\n=== 10. RELOAD SUR B, PUIS RETOUR DÉMO, PUIS RELOAD ===');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await settle(3500);
  const sBreload = await snap();
  say('  B APRÈS RELOAD → ' + brief(sBreload));
  results.afterReloadB = sBreload;

  await clickTitle('Ouvrir le menu principal Wedding City');
  await settle(700);
  await clickText('Basculer vers le Mode Démo');
  await settle(2200);
  const sDemo2 = await snap();
  say('  DÉMO (2e fois) → ' + brief(sDemo2));
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await settle(3000);
  const sDemo3 = await snap();
  say('  DÉMO APRÈS RELOAD → ' + brief(sDemo3));
  results.demoAfterReload = sDemo3;
  await shot('13-final');

  // =========================================================================
  say('\n=== 10b. ALTERNANCE A → B → A PAR LE SÉLECTEUR DE PROJETS ===');
  const openProject = async (label) => {
    await clickTitle('Ouvrir le menu principal Wedding City');
    await settle(700);
    const ok = await clickText(label);
    await settle(2200);
    return ok;
  };

  const gotoA1 = await openProject('ALPHA-UN');
  const a1 = await snap();
  say(`  → A (${gotoA1}) : ` + brief(a1), '| ZORGLUB:', a1.persons.some((n) => /ZORGLUB/.test(n)),
    '| BETA présent ?', a1.persons.some((n) => /BETA/.test(n)));
  await shot('14-retour-A');

  const gotoB1 = await openProject('BETA-UN');
  const b1 = await snap();
  say(`  → B (${gotoB1}) : ` + brief(b1), '| ZORGLUB (fuite ?):', b1.persons.some((n) => /ZORGLUB/.test(n)),
    '| ALPHA lieu (fuite ?):', b1.places.some((n) => /ALPHA/.test(n)));
  await shot('15-retour-B');

  const gotoA2 = await openProject('ALPHA-UN');
  const a2 = await snap();
  say(`  → A (${gotoA2}) : ` + brief(a2), '| ZORGLUB:', a2.persons.some((n) => /ZORGLUB/.test(n)));

  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await settle(3200);
  const a3 = await snap();
  say('  A APRÈS RELOAD : ' + brief(a3), '| ZORGLUB:', a3.persons.some((n) => /ZORGLUB/.test(n)),
    '| décor démo:', a3.showsDemoEstate, '| Clara citée:', a3.mentionsClara);
  await shot('16-A-reload-final');
  results.alternance = { a1, b1, a2, a3 };

  // Mirror must follow the project, not the previous one.
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim().toUpperCase() === 'MIRROR')?.click();
  });
  await settle(1800);
  const mirrorFinal = await page.evaluate(() => {
    const r = document.getElementById('wc-mirror');
    return r ? r.innerText.replace(/\s+/g, ' ').slice(0, 200) : 'MIRROR ABSENT';
  });
  say('  MIRROR sur A :', mirrorFinal.slice(0, 160));
  await shot('17-mirror-A-final');
  results.mirrorFinal = mirrorFinal;

  // =========================================================================
  say('\n=== 11. CE QUE CONTIENT RÉELLEMENT LE STOCKAGE ===');
  const storage = await page.evaluate(() => {
    const out = {};
    for (const k of Object.keys(localStorage)) {
      const v = localStorage.getItem(k) || '';
      out[k] = v.length;
    }
    return out;
  });
  say('  ' + JSON.stringify(storage, null, 1));
  results.storage = storage;
} finally {
  writeFileSync(`${OUT}/log.txt`, log.join('\n'));
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  await browser.close();
}
