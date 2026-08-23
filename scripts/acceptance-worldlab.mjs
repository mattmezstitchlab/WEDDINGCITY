#!/usr/bin/env node
/**
 * ACCEPTANCE — World Lab / createWorldWithAi, driven in a real browser.
 *
 * Same discipline as the multi-project pass:
 *  · every world is created by clicking the real UI;
 *  · the store is NEVER imported into the page (that produced a second module
 *    instance last time, which reported wrong numbers AND polluted the data);
 *  · observations come from the DOM and from what the app wrote to storage.
 *
 *   node scripts/acceptance-worldlab.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/worldlab';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173/';
const log = [];
const say = (...a) => { const l = a.join(' '); console.log(l); log.push(l); };

const browser = await puppeteer.launch({
  executablePath: '/tmp/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp/swiftshader:/tmp' },
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => say('  [erreur page]', String(e).slice(0, 130)));

const wait = (ms = 800) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); say('  📷', n); };

const clickText = (t) => page.evaluate((x) => {
  const el = [...document.querySelectorAll('button, [role="button"]')]
    .find((b) => b.textContent.replace(/\s+/g, ' ').includes(x));
  if (!el) return false;
  el.click();
  return true;
}, t);

/**
 * Open the brand menu — idempotent.
 * The brand panel TOGGLES the menu, so clicking it while the menu is already
 * open closes it. A previous run reported a false "cannot reopen project A"
 * for exactly that reason.
 */
const openMenu = async () => {
  const alreadyOpen = () => page.evaluate(() => [...document.querySelectorAll('button')]
    .some((b) => /Créer un Mariage/.test(b.textContent)));
  if (await alreadyOpen()) return;
  await page.evaluate(() => document.querySelector('[title="Ouvrir le menu principal Wedding City"]')?.click());
  await wait(700);
};

/** DOM + storage only. */
const snap = () => page.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const projects = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]');
  const active = projects.find((p) => p.id === id) || null;
  const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || 'null');
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  const body = document.body.innerText.replace(/\s+/g, ' ');
  return {
    id,
    title: active?.title ?? null,
    couple: active?.coupleNames ?? null,
    worldType: active?.worldType ?? null,
    projects: projects.map((p) => `${p.id}|${p.worldType}|${p.coupleNames || p.title}`),
    stateKeys: Object.keys(localStorage).filter((k) => k.startsWith('wedding_city_state_')),
    counts: {
      places: L('places').length, agents: L('agents').length, phases: L('phases').length,
      tracks: L('tracks').length, persons: L('persons').length, guests: L('guests').length,
      vendors: L('vendors').length, tables: L('seatingTables').length,
      media: L('media').length, docs: L('docs').length, adSlots: L('adSlots').length,
    },
    placeNames: L('places').map((p) => p.name).slice(0, 6),
    placeIds: L('places').map((p) => p.id).slice(0, 6),
    personNames: L('persons').map((p) => p.displayName).slice(0, 8),
    // Flags computed on the FULL list — the first run's "no leak" was a false
    // negative because only the first eight names were inspected.
    hasVoyageur: L('persons').some((p) => /VOYAGEUR ALPHA/.test(p.displayName)),
    hasDemoPerson: L('persons').some((p) => /Clara Dubois|Sophie Étoile|Julien Renard/.test(p.displayName)),
    guestCount: L('guests').length,
    trackTitles: L('tracks').map((t) => t.title).slice(0, 8),
    hud: (document.querySelector('[title="Ouvrir le menu principal Wedding City"]')?.innerText || '')
      .replace(/\s+/g, ' ').trim(),
    mentionsDemo: /Gare TGV|Manoir d.Honneur|Chapelle & Oliviers|Clara Dubois/.test(body),
    emptyWorldNotice: /Ce monde n.a pas encore d.espaces/.test(body),
  };
});

const brief = (s) => `${s.id} · ${s.worldType} · "${(s.couple || s.title || '').slice(0, 30)}" · `
  + `lieux=${s.counts.places} agents=${s.counts.agents} moments=${s.counts.phases} `
  + `morceaux=${s.counts.tracks} personnes=${s.counts.persons} invités=${s.counts.guests} `
  + `prestataires=${s.counts.vendors} médias=${s.counts.media}`;

/** World Lab → generate a world from an archetype prompt. */
async function createAiWorldFromChip(chipLabel) {
  await openMenu();
  const opened = await clickText('Créer un Nouveau Monde');
  await wait(1200);
  if (!opened) return { opened: false };
  // A chip sets the archetype AND launches the generation in one click —
  // exactly what a user does.
  const launched = await clickText(chipLabel);
  await wait(4200);
  return { opened, launched, via: chipLabel };
}

async function createAiWorld(promptText) {
  await openMenu();
  const opened = await clickText('Créer un Nouveau Monde');
  await wait(1000);
  if (!opened) return { opened: false };
  await page.evaluate((t) => {
    const input = [...document.querySelectorAll('input, textarea')]
      .find((i) => /décri|prompt|monde|projet/i.test(i.placeholder || ''))
      || document.querySelector('textarea')
      || [...document.querySelectorAll('input[type="text"]')][0];
    if (!input) return false;
    const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, t);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, promptText);
  await wait(400);
  await shot(`lab-${promptText.slice(0, 12).replace(/\W/g, '')}`);
  const launched = await clickText('Générer')
    || await clickText('Créer le Monde') || await clickText('Lancer');
  // handleGenerateAi fakes a 1.6s pipeline before calling the store.
  await wait(4000);
  return { opened: true, launched };
}

const results = {};

try {
  say('=== 1. ÉTAT INITIAL (profil neuf) ===');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await wait(3200);
  const s0 = await snap();
  say('  ' + brief(s0));
  say('  projets :', JSON.stringify(s0.projects));
  results.initial = s0;
  await shot('01-demo');

  say('\n=== 2. WORLD LAB : quelles actions existent ? ===');
  await openMenu();
  const labOpened = await clickText('Créer un Nouveau Monde');
  await wait(1200);
  const labButtons = await page.evaluate(() => [...document.querySelectorAll('button')]
    .map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 60));
  say('  Lab ouvert :', labOpened);
  say('  actions du Lab :', JSON.stringify(labButtons.slice(0, 18)));
  const labInputs = await page.evaluate(() => [...document.querySelectorAll('input, textarea')]
    .map((i) => `${i.tagName}:${i.placeholder || i.type}`));
  say('  champs du Lab :', JSON.stringify(labInputs));
  results.labButtons = labButtons;
  await shot('02-lab');
  // Escape does not close this modal: use its own ✕, otherwise every later
  // menu click lands on the overlay instead of the menu.
  const closed = await page.evaluate(() => {
    const x = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '✕');
    if (!x) return false;
    x.click();
    return true;
  });
  say('  Lab refermé par ✕ :', closed);
  await wait(800);

  say('\n=== 3. CRÉER IA-A (Roadtrip Japon) ===');
  const a = await createAiWorld('PREMIER MONDE IA — Roadtrip Japon');
  say('  ouverture/lancement :', JSON.stringify(a));
  const sA = await snap();
  say('  IA-A → ' + brief(sA));
  say('  lieux :', JSON.stringify(sA.placeNames));
  say('  ids lieux :', JSON.stringify(sA.placeIds));
  say('  personnes :', JSON.stringify(sA.personNames));
  say('  HÉRITAGE DÉMO ? invités=' + sA.counts.guests, 'prestataires=' + sA.counts.vendors,
    'tables=' + sA.counts.tables, 'personnes=' + sA.counts.persons,
    '| personne de la démo présente:', sA.hasDemoPerson);
  say('  décor démo visible :', sA.mentionsDemo);
  results.iaA = sA;
  await shot('03-IA-A-world');

  say('\n=== 4. MODIFIER IA-A DANS LE CANVAS ===');
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((b) => b.textContent.trim().toUpperCase() === 'CANVAS')?.click());
  await wait(1800);
  const made = await page.evaluate(async () => {
    const out = {};
    const rail = (re) => [...document.querySelectorAll('nav button')].find((b) => re.test(b.textContent));
    rail(/Personnes/i)?.click();
    await new Promise((r) => setTimeout(r, 700));
    const addP = [...document.querySelectorAll('button')].find((b) => /Ajouter une personne/i.test(b.textContent));
    if (addP) {
      addP.click();
      await new Promise((r) => setTimeout(r, 500));
      const input = [...document.querySelectorAll('input')].find((i) => /Prénom/i.test(i.placeholder || ''));
      if (input) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'VOYAGEUR ALPHA');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 200));
        [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Créer')?.click();
        out.person = 'ok';
      }
    }
    await new Promise((r) => setTimeout(r, 800));
    rail(/Musique/i)?.click();
    await new Promise((r) => setTimeout(r, 700));
    const addT = [...document.querySelectorAll('button')].find((b) => /Ajouter un morceau/i.test(b.textContent));
    if (addT) { addT.click(); out.track = 'ok'; }
    return out;
  });
  say('  créations :', JSON.stringify(made));
  await wait(1500);
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((b) => /Terminer/.test(b.textContent))?.click());
  await wait(900);
  const sA2 = await snap();
  say('  IA-A modifié → ' + brief(sA2));
  results.iaAEdited = sA2;
  await shot('04-IA-A-canvas');

  say('\n=== 5. MIRROR SUR IA-A ===');
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((b) => b.textContent.trim().toUpperCase() === 'MIRROR')?.click());
  await wait(2000);
  const mirrorA = await page.evaluate(() => {
    const r = document.getElementById('wc-mirror');
    return r ? r.innerText.replace(/\s+/g, ' ').slice(0, 230) : 'MIRROR ABSENT';
  });
  say('  Mirror :', mirrorA);
  results.mirrorA = mirrorA;
  await shot('05-IA-A-mirror');
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((b) => b.textContent.trim().toUpperCase() === 'WORLD')?.click());
  await wait(1200);

  say('\n=== 6. CRÉER IA-B (Tournée concert) ===');
  const bRes = await createAiWorldFromChip('Tournée Live SoundWave');
  say('  ouverture/lancement :', JSON.stringify(bRes));
  const sB = await snap();
  say('  IA-B → ' + brief(sB));
  say('  lieux :', JSON.stringify(sB.placeNames));
  say('  FUITE depuis IA-A ? VOYAGEUR ALPHA:', sB.hasVoyageur,
    '| personne de la démo:', sB.hasDemoPerson,
    '| invités hérités:', sB.guestCount);
  say('  projets :', JSON.stringify(sB.projects));
  results.iaB = sB;
  await shot('06-IA-B-world');

  say('\n=== 7. ISOLATION : IA-B → DÉMO → IA-A → IA-B → IA-A ===');
  const open = async (label) => { await openMenu(); const ok = await clickText(label); await wait(2400); return ok; };
  const demo = await open('Basculer vers le Mode Démo');
  const sDemo = await snap();
  say(`  → DÉMO (${demo}) : ` + brief(sDemo),
    '| VOYAGEUR ?', sDemo.hasVoyageur);

  await openMenu();
  const menuNow = await page.evaluate(() => [...document.querySelectorAll('button')]
    .map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 70));
  say('  projets listés dans le menu :', JSON.stringify(menuNow.filter((t) => /◆|◇/.test(t))));
  await page.evaluate(() => {
    const x = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '✕');
    if (x) x.click(); else document.body.click();
  });
  await wait(700);

  const backA = await open('PREMIER MONDE IA');
  const sA3 = await snap();
  say(`  → IA-A (${backA}) : ` + brief(sA3),
    '| VOYAGEUR:', sA3.hasVoyageur);
  await shot('07-retour-IA-A');

  const backB = await open('Tournée de 5 concerts');
  const sB2 = await snap();
  say(`  → IA-B (${backB}) : ` + brief(sB2),
    '| VOYAGEUR (fuite ?):', sB2.hasVoyageur, '| démo (fuite ?):', sB2.hasDemoPerson);

  const backA2 = await open('PREMIER MONDE IA');
  const sA4 = await snap();
  say(`  → IA-A (${backA2}) : ` + brief(sA4));
  results.isolation = { sDemo, sA3, sB2, sA4 };

  say('\n=== 8. RELOAD SUR IA-A ===');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await wait(3200);
  const sA5 = await snap();
  say('  IA-A après reload → ' + brief(sA5),
    '| VOYAGEUR:', sA5.hasVoyageur, '| démo:', sA5.hasDemoPerson,
    '| décor démo:', sA5.mentionsDemo);
  results.reloadA = sA5;
  await shot('08-IA-A-reload');

  say('\n=== 9. RELOAD SUR IA-B, PUIS SUR LA DÉMO ===');
  await open('Tournée de 5 concerts');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await wait(3000);
  const sB3 = await snap();
  say('  IA-B après reload → ' + brief(sB3));
  await open('Basculer vers le Mode Démo');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await wait(3000);
  const sDemo2 = await snap();
  say('  DÉMO après reload → ' + brief(sDemo2));
  results.reloadB = sB3;
  results.reloadDemo = sDemo2;
  await shot('09-final');

  say('\n=== 10. STOCKAGE FINAL ===');
  const storage = await page.evaluate(() => {
    const o = {};
    for (const k of Object.keys(localStorage)) o[k] = (localStorage.getItem(k) || '').length;
    return o;
  });
  say('  ' + JSON.stringify(storage));
  results.storage = storage;
} finally {
  writeFileSync(`${OUT}/log.txt`, log.join('\n'));
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  await browser.close();
}
