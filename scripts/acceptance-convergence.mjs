#!/usr/bin/env node
/**
 * ACCEPTANCE — CONVERGENCE. « J'ai tout ça. Mettez-moi de l'ordre. »
 *
 * The §24 test, played for real: a blank browser, nothing typed by hand except
 * one sentence, three files dropped in — then the day is read, corrected,
 * generated, organised, searched, reloaded.
 *
 * Also checks the two hard criteria of §25: no user path to the 3D World, and
 * no visible occurrence of the word "Mirror".
 *
 * Usage: node scripts/acceptance-convergence.mjs [width]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/convergence';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/convergence-profile';
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

// --- the chaos: three real files -------------------------------------------
const GUESTS = `${OUT}/liste-invites.csv`;
writeFileSync(GUESTS, [
  'Nom;Prenom',
  'Dupont;Marie',
  'Martin;Paul',
  'Nguyen;Claire',
  'Berger;Antoine',
].join('\n'));

const PLAYLIST = `${OUT}/playlist-soiree.txt`;
writeFileSync(PLAYLIST, [
  'Playlist de la soirée',
  'La Vie En Rose — Édith Piaf',
  'Perfect — Ed Sheeran',
  'September — Earth Wind And Fire',
].join('\n'));

const CONTRACT = `${OUT}/contrat-prestataires.txt`;
writeFileSync(CONTRACT, [
  'RÉCAPITULATIF PRESTATAIRES',
  'Photographe : Studio Aubert',
  'Traiteur : Table & Feu',
  'DJ : Nuit Blanche',
  'Arrivée du traiteur à 17:30, service du dîner à 20:00.',
  'Montant total : 8 400 € — acompte 2 500 €',
  'contact@table-et-feu.fr — 06 11 22 33 44',
  'Prévoir deux menus sans gluten.',
].join('\n'));

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
  say('  [erreur page]', s.slice(0, 200));
});

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}-${WIDTH}.png` }); };
const clickTag = (attr, tag) => p.evaluate((attr, tag) => {
  const el = document.querySelector(`[data-${attr}="${tag}"]`);
  if (!el) return false; el.click(); return true;
}, attr, tag);
const setTag = (attr, tag, value) => p.evaluate((attr, tag, value) => {
  const el = document.querySelector(`[data-${attr}="${tag}"]`);
  if (!el) return false;
  el.focus();
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  return true;
}, attr, tag, value);

const state = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const projects = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]');
  const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || 'null');
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  return {
    id,
    project: projects.find((x) => x.id === id) ?? null,
    phases: L('phases').map((x) => ({ name: x.name, start: x.startHour, end: x.endHour })),
    persons: L('persons').map((x) => x.displayName),
    vendors: L('vendors').map((x) => x.companyName),
    places: L('places').map((x) => x.name),
    tracks: L('tracks').map((x) => x.title),
    tables: L('seatingTables').length,
    guests: L('guests').map((g) => ({ personId: g.personId, table: g.seating?.tableId ?? null })),
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
say(`### CONVERGENCE — ${WIDTH}px — profil vierge`);

// --- §25 : the two hard criteria, on the public page ------------------------
say('\n=== 1. UNE SEULE EXPÉRIENCE ===');
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
let s = await state();
check('le produit s’appelle LE GRAND JOUR', /LE GRAND JOUR/.test(s.text));
check('le mot « Mirror » n’apparaît nulle part', !/Mirror/i.test(s.text));
check('aucune mention World / Canvas comme destination',
  !/\bWorld\b/.test(s.text) && !/\bCanvas\b/.test(s.text));
const worldLinks = await p.evaluate(() => [...document.querySelectorAll('button, a')]
  .filter((b) => /monde 3d|world|mirror|canvas/i.test(b.textContent || '')).length);
check('aucun bouton ne mène à une surface 3D', worldLinks === 0, String(worldLinks));
// LOCATOR ADAPTED (editorial pass): the six type chips became one compact
// selector inside the field. Same guarantee: a field, an import, a type.
check('le hero est un outil : champ + import + types',
  await p.evaluate(() => !!document.querySelector('[data-landing="brief"]')
    && !!document.querySelector('[data-landing="files"]')
    && document.querySelectorAll('[data-landing="type"] option').length >= 5));
await shot('01-hero-outil');
await noOverflow('Page publique');

// --- §24 : the chaos --------------------------------------------------------
say('\n=== 2. « J’AI TOUT ÇA. METTEZ-MOI DE L’ORDRE. » ===');
await setTag('landing', 'brief',
  'Nous nous marions le 18 juillet 2027 au Château de Vaux. Cérémonie à 14h, cocktail à 17h, dîner à 20h, environ 120 invités.');
const input = await p.$('[data-landing="files"]');
await input.uploadFile(GUESTS, PLAYLIST, CONTRACT);
await wait(700);
check('les trois fichiers sont pris en compte',
  await p.evaluate(() => /3 fichiers/.test(document.body.innerText)));
await clickTag('landing', 'hero-create');
await wait(2500);

check('l’écran de lecture puis d’analyse s’affiche',
  await p.evaluate(() => !!document.querySelector('[data-intake="studio"]')));
const review = await p.evaluate(() => {
  const el = document.querySelector('[data-intake="review"]');
  if (!el) return null;
  return {
    counts: [...document.querySelectorAll('[data-intake="count"]')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()),
    moments: [...document.querySelectorAll('[data-intake="moment"]')].map((m) => m.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)),
    people: [...document.querySelectorAll('[data-intake="person"]')].map((x) => x.textContent.trim()),
    vendors: [...document.querySelectorAll('[data-intake="vendor"]')].map((x) => x.textContent.trim()),
    places: [...document.querySelectorAll('[data-intake="place"]')].map((x) => x.textContent.trim()),
    tracks: [...document.querySelectorAll('[data-intake="track"]')].map((x) => x.textContent.trim()),
    documents: [...document.querySelectorAll('[data-intake="document"]')].map((x) => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)),
    questions: [...document.querySelectorAll('[data-intake="questions"] li')].map((x) => x.textContent.trim().slice(0, 70)),
    couple: document.querySelector('[data-intake="intake-couple"]')?.value,
    date: document.querySelector('[data-intake="intake-date"]')?.value,
    place: document.querySelector('[data-intake="intake-place"]')?.value,
  };
});
say('  ' + JSON.stringify(review, null, 1).slice(0, 1400));
check('« Votre journée prend forme » est affiché',
  await p.evaluate(() => /Votre journée prend forme/.test(document.body.innerText)));
check('la date écrite dans la phrase est lue', review.date === '2027-07-18', String(review.date));
check('les prénoms absents ne sont PAS devinés', !review.couple, String(review.couple));
check('et la question est posée', review.questions.some((q) => /Qui se marie/.test(q)));
check('sans les prénoms, la génération est bloquée',
  await p.evaluate(() => document.querySelector('[data-intake="generate"]')?.disabled === true));
check('le lieu écrit dans la phrase est lu', /Vaux/i.test(review.place || ''), String(review.place));
check('les trois horaires sont devenus des moments', review.moments.length === 3, String(review.moments.length));
check('une heure de fin non écrite est marquée comme estimée',
  review.moments.some((m) => /estimé/.test(m)));
check('les invités du CSV sont lus', review.people.length === 4, review.people.join(' / '));
check('les prestataires du contrat sont lus', review.vendors.length === 3, review.vendors.join(' / '));
check('la playlist est lue', review.tracks.length === 3, review.tracks.join(' / '));
check('les trois documents sont listés avec ce qu’ils contiennent',
  review.documents.length === 3, String(review.documents.length));
await shot('02-intake-review');

// --- corrections before anything exists -------------------------------------
say('\n=== 3. L’UTILISATEUR CORRIGE AVANT GÉNÉRATION ===');
const before = await state();
check('rien n’a encore été créé', !before.id, String(before.id));
await p.evaluate(() => {
  const paul = [...document.querySelectorAll('[data-intake="person"]')].find((x) => /Paul/.test(x.textContent));
  paul?.click();
});
await wait(400);
await p.evaluate(() => {
  const first = document.querySelector('[data-intake="moment-label"]');
  if (!first) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(first, 'Cérémonie civile');
  first.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(400);
// The couple is the one thing the product refuses to invent: it is typed here.
await setTag('intake', 'intake-couple', 'MATT & ÉMILIE');
await wait(400);
await clickTag('intake', 'generate');
await wait(3500);

// --- what was really created ------------------------------------------------
say('\n=== 4. LA JOURNÉE EST GÉNÉRÉE, ET RIEN D’AUTRE ===');
s = await state();
say('  ' + JSON.stringify({
  couple: s.project?.coupleNames, date: s.project?.weddingDate, lieu: s.project?.locationName,
  moments: s.phases.map((x) => `${fmt(x.start)} ${x.name}`), personnes: s.persons,
  prestataires: s.vendors, lieux: s.places, morceaux: s.tracks,
}, null, 1).slice(0, 900));
check('le mariage porte les prénoms saisis', s.project?.coupleNames === 'MATT & ÉMILIE', String(s.project?.coupleNames));
check('le mariage porte la date lue', String(s.project?.weddingDate).includes('2027-07-18'));
check('le mariage porte le lieu lu', /Vaux/.test(String(s.project?.locationName)), String(s.project?.locationName));
check('trois moments existent', s.phases.length === 3, String(s.phases.length));
check('la correction du nom du moment est prise en compte',
  s.phases.some((x) => x.name === 'Cérémonie civile'), s.phases.map((x) => x.name).join(', '));
check('l’invité retiré n’a pas été créé',
  !s.persons.some((n) => /Paul/.test(n)), s.persons.join(' / '));
check('les trois autres invités existent',
  s.persons.filter((n) => /Marie|Claire|Antoine/.test(n)).length === 3, s.persons.join(' / '));
check('aucune ligne d’en-tête de tableur n’est devenue une personne',
  !s.persons.some((n) => /^Nom /i.test(n)), s.persons.join(' / '));
check('les prestataires portent leur nom, pas leur métier',
  s.vendors.includes('Studio Aubert') && s.vendors.includes('Table & Feu'), s.vendors.join(' / '));
check('le lieu n’est pas dupliqué', s.places.every((n) => !/Château Château/i.test(n)), s.places.join(' / '));
check('les trois prestataires existent', s.vendors.length === 3, s.vendors.join(' / '));
check('les trois morceaux existent', s.tracks.length === 3, s.tracks.join(' / '));
check('aucune donnée de démonstration', !/Clara|Bellevue|Lenôtre|Studio Lumière/.test(s.text));
check('on atterrit sur la pellicule',
  await p.evaluate(() => document.querySelectorAll('[data-jourj="moment"]').length === 3));
await shot('03-timeline-generee');
await noOverflow('Timeline générée');

// --- navigation & search ----------------------------------------------------
say('\n=== 5. NAVIGATION UNIQUE, RECHERCHE UNIVERSELLE ===');
const nav = await p.evaluate(() => ['nav-today', 'nav-jourj', 'nav-people', 'nav-organisation',
  'nav-music', 'nav-documents', 'nav-memories', 'nav-search']
  .filter((t) => !!document.querySelector(`[data-jourj="${t}"]`)));
check('la navigation définitive est en place', nav.length === 8, nav.join(', '));
s = await state();
check('le mot « Mirror » n’apparaît pas dans le produit', !/Mirror/i.test(s.text));

await clickTag('jourj', 'nav-search'); await wait(700);
await setTag('search', 'input', 'Marie');
await wait(700);
const results = await p.evaluate(() => [...document.querySelectorAll('[data-search="result"]')]
  .map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)));
say('  ' + JSON.stringify(results));
check('la recherche trouve la personne et son contexte',
  results.some((r) => /Marie/.test(r)), String(results.length));
check('la recherche dit qu’elle n’interroge pas le web',
  await p.evaluate(() => /n’interroge pas le web/.test(document.body.innerText)));
await shot('04-recherche');
await clickTag('search', 'close'); await wait(500);

// --- organisation: lab + seating -------------------------------------------
say('\n=== 6. ORGANISATION : LAB ET PLAN DE TABLE ===');
await clickTag('jourj', 'nav-organisation'); await wait(900);
await clickTag('org', 'lab-run'); await wait(700);
const findings = await p.evaluate(() => [...document.querySelectorAll('[data-org="lab-findings"] li')]
  .map((li) => li.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)));
say('  ' + JSON.stringify(findings.slice(0, 5), null, 1));
check('le Lab dit ce qui manque, à partir des données réelles', findings.length > 0, String(findings.length));
check('et il ne parle que de choses vérifiables',
  findings.every((f) => !/probablement|il semblerait|nous pensons/i.test(f)));

await clickTag('org', 'add-table'); await wait(700);
s = await state();
check('une table a été créée', s.tables === 1, String(s.tables));
// Bring the plan into view first — a human scrolls to it before dragging.
await p.evaluate(() => document.querySelector('[data-org="unseated-guest"]')?.scrollIntoView({ block: 'center' }));
await wait(800);
const boxes = await p.evaluate(() => {
  const g = document.querySelector('[data-org="unseated-guest"]');
  const t = document.querySelector('[data-org="table"]');
  if (!g || !t) return null;
  const gr = g.getBoundingClientRect();
  const tr = t.getBoundingClientRect();
  return {
    guest: { x: Math.round(gr.left + gr.width / 2), y: Math.round(gr.top + gr.height / 2), name: g.textContent.trim() },
    table: { x: Math.round(tr.left + tr.width / 2), y: Math.round(tr.top + tr.height / 2) },
    viewport: window.innerHeight,
  };
});
say('  ' + JSON.stringify(boxes));
const guestBox = boxes?.guest ?? null;
const tableBox = boxes?.table ?? null;
if (guestBox && tableBox) {
  await p.mouse.move(guestBox.x, guestBox.y);
  await p.mouse.down();
  await p.mouse.move((guestBox.x + tableBox.x) / 2, (guestBox.y + tableBox.y) / 2, { steps: 6 });
  await wait(200);
  const carrying = await p.evaluate(() => {
    const c = document.querySelector('[data-org="carrying"]');
    return c ? { text: c.textContent.trim(), x: Math.round(c.getBoundingClientRect().left) } : null;
  });
  check('l’invité suit réellement le pointeur', !!carrying, JSON.stringify(carrying));
  await p.mouse.move(tableBox.x, tableBox.y, { steps: 6 });
  await wait(150);
  await p.mouse.up();
  await wait(800);
}
s = await state();
const seated = s.guests.filter((g) => g.table).length;
check('l’invité déposé est réellement assis', seated === 1, `${seated} assis`);
await shot('05-plan-de-table');
await noOverflow('Organisation');

// --- reload -----------------------------------------------------------------
say('\n=== 7. RELOAD : LE PROJET EST RESTITUÉ À L’IDENTIQUE ===');
const beforeReload = await state();
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3200);
const after = await state();
check('même mariage', after.id === beforeReload.id);
check('mêmes moments',
  JSON.stringify(after.phases) === JSON.stringify(beforeReload.phases),
  after.phases.map((x) => `${fmt(x.start)} ${x.name}`).join(' | '));
check('mêmes personnes, prestataires, morceaux et lieux',
  after.persons.length === beforeReload.persons.length
  && after.vendors.length === beforeReload.vendors.length
  && after.tracks.length === beforeReload.tracks.length
  && after.places.length === beforeReload.places.length,
  `${after.persons.length}p ${after.vendors.length}v ${after.tracks.length}t ${after.places.length}l`);
check('le plan de table est conservé',
  after.tables === beforeReload.tables && after.guests.filter((g) => g.table).length === seated);
check('toujours aucune occurrence de « Mirror »', !/Mirror/i.test(after.text));
await shot('06-apres-reload');

say(`\n### RÉSULTAT ${WIDTH}px : ${failures} échec(s)`);
writeFileSync(`${OUT}/convergence-${WIDTH}.log`, log.join('\n'));
await browser.close();
process.exit(failures > 0 ? 1 : 0);
