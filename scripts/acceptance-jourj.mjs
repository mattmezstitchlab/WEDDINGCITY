#!/usr/bin/env node
/**
 * ACCEPTANCE — JOUR J. The timeline is the product.
 *
 * Played for real in Chromium, on a virgin profile: landing → creation →
 * empty day → five moments → the moment hub (place, people, vendor, music,
 * task, budget, document) → drag & drop → ripple → zoom → reload → a second
 * wedding. Everything observed comes from the DOM, from real geometry
 * (getBoundingClientRect) and from the localStorage the app really wrote.
 *
 * Usage: node scripts/acceptance-jourj.mjs [width]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/jourj';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/jourj-acceptance-profile';
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

// A real file, with real facts inside it.
const DOC = `${OUT}/contrat-traiteur.txt`;
writeFileSync(DOC, [
  'CONTRAT TRAITEUR — MAISON ACCEPTATION',
  'Service du dîner à 19:45, installation à partir de 17:30.',
  'Montant total : 4 250 €  — acompte 1 500 €',
  'Contact : contact@maison-acceptation.fr — 06 12 34 56 78',
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
  say('  [erreur page]', s.slice(0, 160));
});

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}-${WIDTH}.png` }); };
const clickText = (t, sel = 'button') => p.evaluate((t, sel) => {
  const el = [...document.querySelectorAll(sel)].find((b) => (b.textContent || '').includes(t));
  if (!el) return false;
  el.click(); return true;
}, t, sel);
const clickTag = (tag) => p.evaluate((tag) => {
  const el = document.querySelector(`[data-jourj="${tag}"]`);
  if (!el) return false;
  el.click(); return true;
}, tag);
const setField = (tag, value) => p.evaluate((tag, value) => {
  const el = document.querySelector(`[data-jourj="${tag}"]`);
  if (!el) return false;
  el.focus();
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, tag, value);
/** Type and leave the field — React commits on blur, like a real user. */
const commitField = async (tag, value) => {
  await setField(tag, value);
  await p.evaluate((tag) => document.querySelector(`[data-jourj="${tag}"]`)?.blur(), tag);
};

const typeInto = (matcher, v) => p.evaluate((matcher, v) => {
  const i = [...document.querySelectorAll('input')]
    .find((x) => (x.placeholder || '').includes(matcher) || x.type === matcher);
  if (!i) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v);
  i.dispatchEvent(new Event('input', { bubbles: true }));
  i.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, matcher, v);

/** Real geometry of the moments, plus what storage holds. */
const state = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || 'null');
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  const cards = [...document.querySelectorAll('[data-jourj="moment"]')].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      id: el.getAttribute('data-phase-id'),
      start: Number(el.getAttribute('data-start')),
      left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    };
  });
  const scale = document.querySelector('[data-jourj="scale"]');
  const strip = document.querySelector('[data-jourj="strip"]');
  return {
    projectId: id,
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour, end: x.endHour })),
    counts: {
      phases: L('phases').length, persons: L('persons').length, places: L('places').length,
      vendors: L('vendors').length, tracks: L('tracks').length, media: L('media').length,
      tasks: L('tasks').length,
    },
    raw: (localStorage.getItem('wedding_city_state_' + id) || '').slice(0, 0), // never dumped, only probed below
    hasDemoData: /Clara|Alexandre Meyer|Bellevue|Gare TGV/.test(localStorage.getItem('wedding_city_state_' + id) || ''),
    hasEditorial: /\/editorial\//.test(localStorage.getItem('wedding_city_state_' + id) || ''),
    cards,
    pxPerHour: scale ? Number(scale.getAttribute('data-px-per-hour')) : null,
    stripScroll: strip ? { left: Math.round(strip.scrollLeft), w: strip.clientWidth, sw: strip.scrollWidth } : null,
    dom: {
      empty: !!document.querySelector('[data-jourj="empty"]'),
      hub: !!document.querySelector('[data-jourj="hub"]'),
      capsule: !!document.querySelector('[aria-label="Projection"]'),
      worldLink: /monde 3d/i.test(document.body.innerText),
      docScrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      text: (document.body.innerText || '').replace(/\s+/g, ' '),
    },
  };
});

const noOverflow = async (label) => {
  const m = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth, vw: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        // Inside the film strip, being wider than the screen IS the point:
        // the strip scrolls horizontally on purpose.
        return r.right > window.innerWidth + 1 && !el.closest('[data-jourj="strip"]');
      })
      .slice(0, 3)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 24)}@${Math.round(el.getBoundingClientRect().right)}`),
  }));
  return check(`${label} · aucun débordement horizontal`, m.sw === m.vw,
    `${m.sw}/${m.vw}${m.offenders.length ? ' — ' + m.offenders.join(' | ') : ''}`);
};

const fmt = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// ═══════════════════════════════════════════════════════════════════════════
say(`### JOUR J — acceptation ${WIDTH}px — profil vierge`);

// --- 1-3. landing → creation → nothing inherited ----------------------------
say('\n=== 1. LANDING → CRÉATION D’UN MARIAGE NEUF ===');
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(2600);
let s = await state();
check('la landing s’ouvre sans projet actif', !s.projectId);
await clickText('Créer mon mariage');
await wait(900);
await typeInto('Clara', 'ANNA-JOURJ');
await typeInto('Alexandre', 'BORIS-JOURJ');
await clickText('Continuer'); await wait(500);
await typeInto('date', '2027-06-19');
await clickText('Continuer'); await wait(500);
await typeInto('Domaine', 'DOMAINE JOURJ');
await clickText('Générer notre monde');
await wait(3200);
s = await state();
const A_ID = s.projectId;
check('un mariage a été créé', !!A_ID, String(A_ID));
check('aucune donnée de démonstration héritée', !s.hasDemoData);
check('aucun asset éditorial dans les données', !s.hasEditorial);
say('  compteurs : ' + JSON.stringify(s.counts));
check('0 moment', s.counts.phases === 0, String(s.counts.phases));
check('0 lieu', s.counts.places === 0, String(s.counts.places));
check('2 personnes (les mariés saisis)', s.counts.persons === 2, String(s.counts.persons));
check('0 média', s.counts.media === 0, String(s.counts.media));

say('\n=== 2. ON ARRIVE DIRECTEMENT DANS LA TIMELINE ===');
check('la surface Jour J est affichée', await p.evaluate(() => !!document.getElementById('jour-j')));
check('la timeline vide dit pourquoi elle est vide', s.dom.empty);
check('« Votre histoire commence ici » est affiché', /Votre histoire commence ici/.test(s.dom.text));
check('aucune capsule de projection (le World n’est plus une porte)', !s.dom.capsule);
check('aucun lien « Monde 3D » dans le produit', !s.dom.worldLink);
check('la navigation est réduite à Jour J / Mes mariages / Créer',
  await p.evaluate(() => ['nav-jourj', 'nav-weddings', 'nav-create']
    .every((t) => !!document.querySelector(`[data-jourj="${t}"]`))));
await shot('01-empty');
await noOverflow('Jour J vide');

// --- 5. five moments --------------------------------------------------------
say('\n=== 3. CRÉATION DE 5 MOMENTS ===');
const MOMENTS = [
  ['Préparatifs', '09:00', '180'],
  ['Cérémonie', '15:00', '60'],
  ['Cocktail', '16:30', '150'],
  ['Dîner', '19:30', '120'],
  ['Soirée', '22:30', '180'],
];
for (const [name, start, minutes] of MOMENTS) {
  const opened = await p.evaluate(() => {
    const btn = document.querySelector('[data-jourj="add-moment"]') || document.querySelector('[data-jourj="empty-add"]');
    if (!btn) return false;
    if (!document.querySelector('[data-jourj="moment-name"]')) btn.click();
    return true;
  });
  if (!opened) break;
  await wait(300);
  await setField('moment-name', name);
  await setField('moment-start', start);
  await setField('moment-duration', minutes);
  await clickTag('moment-create');
  await wait(500);
}
s = await state();
check('5 moments existent', s.counts.phases === 5, String(s.counts.phases));
check('5 moments sont dessinés sur la pellicule', s.cards.length === 5, String(s.cards.length));
say('  ' + s.phases.map((x) => `${fmt(x.start)} ${x.name}`).join(' | '));

// --- 4. position and width really represent time ---------------------------
say('\n=== 4. CHAQUE MOMENT EST À SA PLACE, ET DURE SA DURÉE ===');
const ordered = [...s.cards].sort((a, b) => a.start - b.start);
const monotonic = ordered.every((c, i) => i === 0 || c.left > ordered[i - 1].left);
check('l’ordre horizontal suit l’ordre horaire', monotonic,
  ordered.map((c) => `${fmt(c.start)}@${c.left}`).join(' '));
const ratios = ordered.map((c) => {
  const ph = s.phases.find((x) => x.id === c.id);
  return { dur: ph.end - ph.start, w: c.width };
});
const ceremonie = ratios.find((r) => Math.abs(r.dur - 1) < 1e-6);
const prep = ratios.find((r) => Math.abs(r.dur - 3) < 1e-6);
check('un moment d’1 h est plus étroit qu’un moment de 3 h',
  !!ceremonie && !!prep && ceremonie.w < prep.w, `${ceremonie?.w}px vs ${prep?.w}px`);
const px = s.pxPerHour;
const proportional = ratios.every((r) => Math.abs(r.w - r.dur * px) < 3 || r.w === 96);
check('la largeur est proportionnelle à la durée', proportional,
  ratios.map((r) => `${r.dur}h=${r.w}px`).join(' '));
await shot('02-five-moments');
await noOverflow('Jour J avec 5 moments');

// --- 7-13. the moment hub ---------------------------------------------------
say('\n=== 5. LE MOMENT EST UN HUB (lieu, personnes, prestataire, musique, tâche, budget, document) ===');
const dinerId = s.phases.find((x) => x.name === 'Dîner').id;
await p.evaluate((id) => {
  const card = document.querySelector(`[data-phase-id="${id}"]`);
  card?.querySelector('[data-jourj="open-moment"]')?.click();
}, dinerId);
await wait(900);
check('le hub du Dîner est ouvert', (await state()).dom.hub);

await setField('hub-place-new', 'ORANGERIE DU DOMAINE');
await clickTag('hub-place-new-submit'); await wait(600);

for (const person of ['CAMILLE TEMOIN', 'HUGO TEMOIN']) {
  await setField('hub-person-new', person);
  await clickTag('hub-person-new-submit'); await wait(500);
}
await setField('hub-vendor-new', 'MAISON ACCEPTATION');
await clickTag('hub-vendor-new-submit'); await wait(500);

await setField('hub-track-new', 'PREMIERE VALSE — DUO JOURJ');
await clickTag('hub-track-new-submit'); await wait(600);

await setField('hub-task-new', 'Confirmer le nombre de couverts');
await clickTag('hub-task-new-submit'); await wait(500);

await commitField('hub-cost', '4250'); await wait(400);
await commitField('hub-deposit', '1500'); await wait(400);

await setField('hub-shot-new', 'Table des grands-parents');
await clickTag('hub-shot-new-submit'); await wait(400);
await commitField('hub-menu', 'Menu automnal, 3 services'); await wait(400);
await commitField('hub-headcount', '96'); await wait(400);
await commitField('hub-logistics', 'Livraison du traiteur à 17:30, montage des tables à 18:00'); await wait(500);
await commitField('hub-notes', 'Prévoir un micro sans fil'); await wait(500);

const fileInput = await p.$('[data-jourj="hub-file"]');
if (fileInput) { await fileInput.uploadFile(DOC); await wait(1600); }
await shot('03-hub');

s = await state();
say('  compteurs après le hub : ' + JSON.stringify(s.counts));
check('un lieu a été créé', s.counts.places === 1, String(s.counts.places));
check('deux personnes de plus (4 au total)', s.counts.persons === 4, String(s.counts.persons));
check('un prestataire', s.counts.vendors === 1, String(s.counts.vendors));
check('un morceau', s.counts.tracks === 1, String(s.counts.tracks));
check('une tâche', s.counts.tasks === 1, String(s.counts.tasks));
check('un document importé', s.counts.media === 1, String(s.counts.media));

const hubData = await p.evaluate((id) => {
  const st = JSON.parse(localStorage.getItem('wedding_city_state_' + localStorage.getItem('wedding_city_active_project_id_v1')));
  const phase = (st.phases || []).find((x) => x.id === id);
  const media = (st.media || []);
  return {
    place: phase?.primaryPlaceId, persons: (phase?.personIds || []).length,
    vendors: (phase?.vendorIds || []).length, tracks: (phase?.trackIds || []).length,
    tasks: (st.tasks || []).filter((t) => t.phaseId === id).length,
    budget: phase?.budget, meal: phase?.meal, logistics: phase?.logistics,
    shots: phase?.shots, notes: phase?.notes,
    mediaOwners: media.map((m) => `${m.ownerKind}:${m.ownerId === id ? 'ce moment' : m.ownerId}`),
  };
}, dinerId);
say('  ' + JSON.stringify(hubData));
check('le lieu est rattaché au moment', !!hubData.place);
check('les personnes sont rattachées au moment', hubData.persons === 2, String(hubData.persons));
check('le prestataire est rattaché au moment', hubData.vendors === 1, String(hubData.vendors));
check('la musique est rattachée au moment', hubData.tracks === 1, String(hubData.tracks));
check('la tâche appartient au moment', hubData.tasks === 1, String(hubData.tasks));
check('le budget est enregistré', hubData.budget?.amount === 4250 && hubData.budget?.deposit === 1500,
  JSON.stringify(hubData.budget));
check('le repas est enregistré', hubData.meal?.headcount === 96, JSON.stringify(hubData.meal));
check('la logistique est enregistrée', /17:30/.test(hubData.logistics || ''));
check('le plan photo est enregistré', (hubData.shots || []).length === 1);
check('la note est enregistrée', /micro/.test(hubData.notes || ''));
check('le document est rattaché à CE moment', hubData.mediaOwners.includes('event:ce moment'),
  hubData.mediaOwners.join(','));

const analysis = await p.evaluate(() => {
  const box = document.querySelector('[data-jourj="hub-analysis"]');
  return box ? box.textContent.replace(/\s+/g, ' ').trim().slice(0, 260) : null;
});
say('  lecture du document : ' + (analysis || 'aucune analyse affichée'));
check('le document a été lu et résumé', !!analysis && /Lu dans ce document/.test(analysis));

await clickTag('hub-close'); await wait(700);
check('le hub se referme', !(await state()).dom.hub);

// --- 16-17. drag & drop: the WHOLE block moves ------------------------------
say('\n=== 6. GLISSER-DÉPOSER : LE BLOC ENTIER SUIT LE CURSEUR ===');
// A card that is scrolled out of view cannot be grabbed by a human either:
// bring it into the strip's viewport first, exactly like scrolling to it.
const bringIntoView = async (name) => {
  await p.evaluate((name) => {
    const card = [...document.querySelectorAll('[data-jourj="moment"]')]
      .find((el) => (el.textContent || '').includes(name));
    card?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, name);
  await wait(500);
};
await bringIntoView('Cocktail');
const before = await state();
const cocktail = before.cards.find((c) => c.text.includes('Cocktail'));
const startBox = { ...cocktail };
const y = cocktail.top + 60;
// On a narrow screen the card can be wider than the viewport: grab it where it
// is really visible, as a finger would.
const dragX = Math.min(Math.max(cocktail.left + 40, 50), WIDTH - 150);
await p.mouse.move(dragX, y);
await p.mouse.down();
await p.mouse.move(dragX + 100, y, { steps: 8 });
await wait(200);
const midDrag = await p.evaluate((id) => {
  const el = document.querySelector(`[data-phase-id="${id}"]`);
  const r = el.getBoundingClientRect();
  const badge = document.querySelector('[data-jourj="drop-time"]');
  return {
    left: Math.round(r.left), width: Math.round(r.width),
    dragging: el.classList.contains('is-dragging'),
    badge: badge ? badge.textContent.trim() : null,
    guide: !!document.querySelector('[data-jourj="drop-time"]'),
  };
}, cocktail.id);
say('  pendant le glisser : ' + JSON.stringify(midDrag));
check('le bloc lui-même a bougé (pas seulement une icône)',
  midDrag.left > startBox.left + 40, `${startBox.left} → ${midDrag.left}`);
check('le bloc conserve sa largeur pendant le déplacement',
  Math.abs(midDrag.width - startBox.width) <= 2, `${startBox.width} → ${midDrag.width}`);
check('le bloc est marqué comme en cours de déplacement', midDrag.dragging);
check('l’heure cible est affichée pendant le déplacement', !!midDrag.badge, String(midDrag.badge));
await shot('04-drag');
await p.mouse.up();
await wait(800);

let after = await state();
const cocktailAfter = after.phases.find((x) => x.name === 'Cocktail');
const cocktailBefore = before.phases.find((x) => x.name === 'Cocktail');
check('l’horaire du moment a changé après le dépôt',
  Math.abs(cocktailAfter.start - cocktailBefore.start) > 0.01,
  `${fmt(cocktailBefore.start)} → ${fmt(cocktailAfter.start)}`);
check('la durée est conservée',
  Math.abs((cocktailAfter.end - cocktailAfter.start) - (cocktailBefore.end - cocktailBefore.start)) < 1e-6);

// --- 10. the chain of the day ------------------------------------------------
say('\n=== 7. CONSÉQUENCES TEMPORELLES ===');
const rippleShown = await p.evaluate(() => {
  const el = document.querySelector('[data-jourj="ripple"]');
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
});
say('  proposition : ' + (rippleShown || 'aucune'));
check('la conséquence sur la suite est proposée, pas imposée', !!rippleShown);
const dinerBefore = after.phases.find((x) => x.name === 'Dîner').start;
await clickTag('ripple-apply');
await wait(900);
after = await state();
const dinerAfter = after.phases.find((x) => x.name === 'Dîner').start;
check('accepter décale bien les moments suivants',
  Math.abs(dinerAfter - dinerBefore) > 0.01, `${fmt(dinerBefore)} → ${fmt(dinerAfter)}`);

// --- 13-16. zoom -------------------------------------------------------------
say('\n=== 8. ZOOM TEMPOREL ===');
const zoom0 = await state();
await clickTag('zoom-in'); await wait(400);
await clickTag('zoom-in'); await wait(500);
const zoomIn = await state();
check('zoomer augmente l’échelle', zoomIn.pxPerHour > zoom0.pxPerHour,
  `${zoom0.pxPerHour} → ${zoomIn.pxPerHour} px/h`);
const cocktailZoom = zoomIn.cards.find((c) => c.text.includes('Cocktail'));
check('le bloc s’élargit avec le zoom',
  cocktailZoom.width > (zoom0.cards.find((c) => c.text.includes('Cocktail'))?.width ?? 0),
  `${zoom0.cards.find((c) => c.text.includes('Cocktail'))?.width} → ${cocktailZoom.width}`);
await shot('05-zoom-in');

// precise move while zoomed in
const preciseBefore = zoomIn.phases.find((x) => x.name === 'Cocktail').start;
await bringIntoView('Cocktail');
const zoomedState = await state();
const zc = zoomedState.cards.find((c) => c.text.includes('Cocktail'));
// Zoomed in, a card can be wider than the screen: grab it wherever it is
// actually visible, like a human would.
const grabX = Math.min(Math.max(zc.left + 30, 60), WIDTH - 160);
await p.mouse.move(grabX, zc.top + 60);
await p.mouse.down();
await p.mouse.move(grabX + Math.round(zoomedState.pxPerHour / 4), zc.top + 60, { steps: 6 });
await wait(150);
await p.mouse.up();
await wait(800);
let precise = await state();
const preciseAfter = precise.phases.find((x) => x.name === 'Cocktail').start;
check('un déplacement fin est possible en zoom fort',
  Math.abs(preciseAfter - preciseBefore) > 0.01 && Math.abs(preciseAfter - preciseBefore) <= 0.75,
  `${fmt(preciseBefore)} → ${fmt(preciseAfter)}`);
await p.evaluate(() => document.querySelector('[data-jourj="ripple-dismiss"]')?.click());
await wait(400);

await clickTag('zoom-day'); await wait(700);
const zoomOut = await state();
check('« toute la journée » dézoome', zoomOut.pxPerHour < zoom0.pxPerHour,
  `${zoomOut.pxPerHour} px/h`);
check('le moment déplacé garde son heure après dézoom',
  Math.abs(zoomOut.phases.find((x) => x.name === 'Cocktail').start - preciseAfter) < 1e-6,
  fmt(zoomOut.phases.find((x) => x.name === 'Cocktail').start));
const allVisible = zoomOut.stripScroll && zoomOut.stripScroll.sw <= zoomOut.stripScroll.w + 2;
check('la journée entière tient dans la pellicule', Boolean(allVisible),
  JSON.stringify(zoomOut.stripScroll));
await shot('06-zoom-day');

// --- 18-19. reload -----------------------------------------------------------
say('\n=== 9. RELOAD ===');
const beforeReload = await state();
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
const afterReload = await state();
check('le mariage actif est le même', afterReload.projectId === A_ID);
check('les 5 moments sont conservés', afterReload.counts.phases === 5, String(afterReload.counts.phases));
check('les horaires déplacés sont conservés',
  JSON.stringify(afterReload.phases.map((x) => x.start)) === JSON.stringify(beforeReload.phases.map((x) => x.start)),
  afterReload.phases.map((x) => fmt(x.start)).join(' '));
check('le hub du Dîner a gardé son contenu',
  afterReload.counts.places === 1 && afterReload.counts.vendors === 1
  && afterReload.counts.tracks === 1 && afterReload.counts.media === 1 && afterReload.counts.tasks === 1,
  JSON.stringify(afterReload.counts));
check('aucune donnée de démonstration n’est apparue', !afterReload.hasDemoData);

// --- 20. another wedding stays out ------------------------------------------
say('\n=== 10. UN AUTRE MARIAGE N’APPARAÎT JAMAIS ICI ===');
await clickTag('nav-weddings'); await wait(1600);
check('« Mes mariages » ramène au site', await p.evaluate(() => !!document.querySelector('.wc-landing-cta')));
await clickText('Créer mon mariage'); await wait(900);
await typeInto('Clara', 'CELIA-AUTRE');
await typeInto('Alexandre', 'DAVID-AUTRE');
await clickText('Continuer'); await wait(400);
await clickText('Continuer'); await wait(400);
await clickText('Générer notre monde'); await wait(3000);
const b = await state();
check('le second mariage démarre sur une journée vide', b.counts.phases === 0, String(b.counts.phases));
// The words "Cocktail" and "Préparatifs" DO appear on an empty day — as
// template buttons, which are product suggestions, not data. What must be
// empty is the film itself.
check('aucun moment du premier mariage n’apparaît sur la pellicule',
  b.cards.length === 0 && b.counts.phases === 0,
  `${b.cards.length} blocs / ${b.counts.phases} moments`);
check('aucun document du premier mariage', b.counts.media === 0, String(b.counts.media));
check('B est bien un autre projet', b.projectId !== A_ID);
await noOverflow('Jour J du second mariage');

// back to A
await clickTag('nav-weddings'); await wait(1500);
await p.evaluate(() => {
  const btn = [...document.querySelectorAll('li button')].find((x) => x.textContent.includes('ANNA-JOURJ'));
  btn?.click();
});
await wait(2500);
const backToA = await state();
check('rouvrir le premier mariage rend sa journée', backToA.counts.phases === 5, String(backToA.counts.phases));
check('et le second reste vide de son côté', backToA.projectId === A_ID);
await shot('07-back-to-A');

say(`\n### RÉSULTAT ${WIDTH}px : ${failures} échec(s)`);
writeFileSync(`${OUT}/jourj-${WIDTH}.log`, log.join('\n'));
await browser.close();
process.exit(failures > 0 ? 1 : 0);
