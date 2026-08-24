#!/usr/bin/env node
/**
 * ACCEPTANCE — SPECTACLE.
 *
 * Artists and technicians are not a second directory: they are people with a
 * craft, attached to the moments they work. This test proves it in a real
 * browser:
 *
 *   create an artist and a technician → attach them to moments → read their
 *   road map (derived, never stored) → move a moment and watch the road maps
 *   follow → provoke a conflict → branch a scenario → attach a document →
 *   search by craft → reload → check another wedding knows none of it.
 *
 * Usage: node scripts/acceptance-spectacle.mjs [width]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/spectacle';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/spectacle-profile';
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

const DOC = `${OUT}/contrat-saxophoniste.txt`;
writeFileSync(DOC, [
  'CONTRAT DE CESSION — SAXOPHONE',
  'Prestation : cocktail à 17:30 puis première danse à 21:00.',
  'Montant : 900 € — acompte 300 €',
  'Besoins : micro HF, alimentation 230 V, loge, repas.',
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
const commit = async (attr, tag, value) => {
  await setField(attr, tag, value);
  await p.evaluate((attr, tag) => document.querySelector(`[data-${attr}="${tag}"]`)?.blur(), attr, tag);
  await wait(350);
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
const clickText = (t) => p.evaluate((t) => {
  const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(t));
  if (!el) return false; el.click(); return true;
}, t);

/** Open a crew member's road map — the panel toggles, so never blind-click. */
const openCrew = async (name) => {
  await p.evaluate((name) => {
    const sheet = document.querySelector('[data-crew="callsheet"]');
    if (sheet && sheet.textContent.includes(name)) return;
    const b = [...document.querySelectorAll('[data-crew="open"]')].find((x) => x.textContent.includes(name));
    b?.click();
  }, name);
  await wait(800);
};

const state = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const raw = localStorage.getItem('wedding_city_state_' + id) || '';
  const st = raw ? JSON.parse(raw) : null;
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  return {
    id,
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour, people: x.personIds || [] })),
    persons: L('persons').map((x) => ({ id: x.id, name: x.displayName, craft: x.craft || null })),
    media: L('media').map((m) => ({ owner: m.ownerKind, id: m.ownerId, name: m.fileName })),
    scenarios: L('scenarios').length,
    tasksToConfirm: L('tasks').filter((t) => t.status === 'to_confirm').length,
    missions: L('tasks').filter((t) => t.assignedPersonId).length,
    editorialAnywhere: Object.keys(localStorage).filter((k) => k.startsWith('wedding_city_state_'))
      .some((k) => /\/editorial\//.test(localStorage.getItem(k) || '')),
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
say(`### SPECTACLE — ${WIDTH}px`);

// --- 1. the public section --------------------------------------------------
say('\n=== 1. « UN MOMENT NE SE PRODUIT JAMAIS PAR HASARD » ===');
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
await p.evaluate(() => document.querySelector('[data-landing="spectacle"]')?.scrollIntoView());
await wait(1200);
const section = await p.evaluate(() => {
  const s = document.querySelector('[data-landing="spectacle"]');
  if (!s) return null;
  const img = s.querySelector('img');
  return {
    title: s.querySelector('.wc-gj-spectacle-title')?.textContent.trim(),
    titleSize: Math.round(parseFloat(getComputedStyle(s.querySelector('.wc-gj-spectacle-title')).fontSize)),
    imgOk: img ? img.naturalWidth > 0 : false,
    imgFit: img ? getComputedStyle(img).objectFit : null,
    crafts: [...document.querySelectorAll('[data-landing="crafts"] .wc-gj-craft')].map((c) => c.textContent.trim()),
    cta: !!document.querySelector('[data-landing="crew-cta"]'),
    sheets: document.querySelectorAll('[data-landing="callsheet"]').length,
    sheetImgs: [...document.querySelectorAll('.wc-gj-callsheet-img')].filter((i) => i.naturalWidth > 0).length,
  };
});
say('  ' + JSON.stringify({ ...section, crafts: section?.crafts.length }));
check('la section spectacle existe, en plein cadre', !!section && section.imgOk && section.imgFit === 'cover');
check('avec un titre monumental', (section?.titleSize ?? 0) >= 28, `${section?.titleSize}px`);
check('les seize métiers sont nommés', section?.crafts.length === 16, String(section?.crafts.length));
check('les métiers attendus y sont',
  ['Danseuse', 'Saxophoniste', 'Éclairagiste', 'Régisseur', 'Stage manager'].every((c) => section.crafts.includes(c)));
check('l’appel « découvrir l’équipe du jour » est là', section?.cta);
check('trois feuilles de route sont montrées, avec leurs visuels',
  section?.sheets === 3 && section?.sheetImgs === 3, `${section?.sheets}/${section?.sheetImgs}`);
check('le mot « intermittent » ne domine pas la page',
  !/INTERMITTENT/.test(await p.evaluate(() => document.body.innerText)));
await shot('01-section-spectacle');
await noOverflow('Page publique');

// --- 2. a real wedding, with a crew ----------------------------------------
say('\n=== 2. CRÉER UN ARTISTE ET UN TECHNICIEN ===');
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
await click('landing', 'hero-create');
await wait(1200);
await typeInto('Clara', 'NINA'); await typeInto('Alexandre', 'OSCAR');
await clickText('Continuer'); await wait(400);
await typeInto('date', '2027-08-21');
await clickText('Continuer'); await wait(400);
await typeInto('Domaine', 'DOMAINE SPECTACLE');
await clickText('Générer notre monde'); await wait(3200);

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
await mk('Cocktail', '17:30', 90);
await mk('Dîner', '19:30', 120);
await mk('Première danse', '21:45', 30);
let s = await state();
check('trois moments existent', s.phases.length === 3, String(s.phases.length));

await click('jourj', 'nav-crew');
await wait(900);
await setField('crew', 'new-name', 'MATT SAXO');
await setField('crew', 'new-role', 'Saxophoniste');
await click('crew', 'new-submit');
await wait(900);
await setField('crew', 'new-name', 'LEA LUMIERE');
await setField('crew', 'new-role', 'Technicienne lumière');
await click('crew', 'new-submit');
await wait(900);
s = await state();
const sax = s.persons.find((x) => /MATT SAXO/.test(x.name));
const light = s.persons.find((x) => /LEA LUMIERE/.test(x.name));
check('l’artiste existe avec son métier', sax?.craft?.role === 'Saxophoniste', JSON.stringify(sax?.craft));
check('le technicien aussi', light?.craft?.role === 'Technicienne lumière', JSON.stringify(light?.craft));
check('aucune donnée administrative inventée',
  !sax?.craft?.status && !sax?.craft?.fee && !sax?.craft?.professionalNumber, JSON.stringify(sax?.craft));
const counts = await p.evaluate(() => document.querySelector('[data-crew="counts"]')?.textContent.replace(/\s+/g, ' ').trim());
say('  ' + counts);
check('l’équipe est comptée par nature', /1 artistes|1 artiste/.test(counts || '') && /2 au total/.test(counts || ''), String(counts));

// --- 3. attach to moments, then read the road map ---------------------------
say('\n=== 3. RATTACHEMENT ET FEUILLE DE ROUTE ===');
// A short moment renders dense (hour only), so the card is found by its id,
// not by its label — the label is not always drawn.
const attach = async (phaseName, personName) => {
  await click('jourj', 'nav-jourj');
  await wait(700);
  const phaseId = (await state()).phases.find((x) => x.name === phaseName)?.id;
  await p.evaluate((phaseId) => {
    const card = document.querySelector(`[data-phase-id="${phaseId}"]`);
    card?.scrollIntoView({ inline: 'center' });
    card?.querySelector('[data-jourj="open-moment"]')?.click();
  }, phaseId);
  await wait(900);
  const ok = await p.evaluate((personName) => {
    const sel = document.querySelector('[data-jourj="hub-person-existing"]');
    if (!sel) return false;
    const opt = [...sel.options].find((o) => o.textContent.includes(personName));
    if (!opt) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, personName);
  await wait(700);
  await click('jourj', 'hub-close');
  await wait(500);
  return ok;
};
check('le saxophoniste est rattaché au cocktail', await attach('Cocktail', 'MATT SAXO'));
check('et à la première danse', await attach('Première danse', 'MATT SAXO'));
check('la technicienne est rattachée au dîner', await attach('Dîner', 'LEA LUMIERE'));

await click('jourj', 'nav-crew'); await wait(900);
await commit('crew', 'new-name', '');
await openCrew('MATT SAXO');
let rows = await p.evaluate(() => [...document.querySelectorAll('[data-crew="callsheet-row"]')]
  .map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
say('  ' + JSON.stringify(rows));
check('« Ma journée » liste ses deux moments', rows.length === 2, String(rows.length));
check('avec leurs heures réelles',
  rows.length === 2 && rows[0].startsWith('17:30') && rows[1].startsWith('21:45'), rows.join(' | '));

await commit('crew', 'craft-setup', '45');
await commit('crew', 'craft-status', 'Intermittent du spectacle');
rows = await p.evaluate(() => [...document.querySelectorAll('[data-crew="callsheet-row"]')]
  .map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
say('  ' + JSON.stringify(rows));
check('déclarer 45 min d’installation ajoute une arrivée à 16:45',
  rows.length === 3 && rows[0].startsWith('16:45'), rows.join(' | '));
check('le statut renseigné est conservé',
  (await state()).persons.find((x) => /MATT SAXO/.test(x.name))?.craft?.status === 'Intermittent du spectacle');
await shot('02-feuille-de-route');
await noOverflow('Équipe du jour');

// --- 4. propagation recomputes the road maps --------------------------------
say('\n=== 4. DÉPLACER UN MOMENT RECALCULE LES FEUILLES ===');
await click('jourj', 'nav-jourj'); await wait(800);
await p.evaluate(() => {
  const card = [...document.querySelectorAll('[data-jourj="moment"]')].find((c) => c.textContent.includes('Cocktail'));
  card?.scrollIntoView({ inline: 'center' });
});
await wait(500);
// Grab a point that is really inside the card AND inside the viewport — on a
// phone the card is often wider than the screen.
const box = await p.evaluate(() => {
  const card = [...document.querySelectorAll('[data-jourj="moment"]')].find((c) => c.textContent.includes('Cocktail'));
  const r = card.getBoundingClientRect();
  const left = Math.max(r.left, 0);
  const right = Math.min(r.right, window.innerWidth);
  // The product navigation is sticky and wraps on a phone: the grab point must
  // be below it, or the pointer lands on a nav button instead of the card.
  const nav = document.querySelector('nav[aria-label="Navigation"]');
  const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
  const top = Math.max(r.top, navBottom + 12);
  return {
    x: Math.round(left + Math.min(40, (right - left) / 2)),
    y: Math.round(Math.min(Math.max(top + 24, r.top + 24), r.bottom - 24)),
    left: Math.round(r.left),
    width: Math.round(right - left),
  };
});
say('  point de saisie : ' + JSON.stringify(box));
const hit = await p.evaluate(({ x, y }) => {
  const el = document.elementFromPoint(x, y);
  return { tag: el?.tagName, inCard: !!el?.closest('[data-jourj="moment"]'), cls: String(el?.className).slice(0, 40) };
}, box);
say('  élément sous le point : ' + JSON.stringify(hit));
const pxPerHour = await p.evaluate(() => Number(document.querySelector('[data-jourj="scale"]').getAttribute('data-px-per-hour')));
await p.mouse.move(box.x, box.y);
await p.mouse.down();
const travel = Math.min(Math.round(pxPerHour / 2), WIDTH - box.x - 40);
await p.mouse.move(box.x + travel, box.y, { steps: 8 });
await wait(200);
await p.mouse.up();
await wait(900);
await p.evaluate(() => document.querySelector('[data-jourj="ripple-dismiss"]')?.click());
await wait(500);
s = await state();
const cocktail = s.phases.find((x) => x.name === 'Cocktail');
check('le cocktail a bougé', Math.abs(cocktail.start - 17.5) > 0.01, fmt(cocktail.start));

await click('jourj', 'nav-crew'); await wait(900);
await openCrew('MATT SAXO');
rows = await p.evaluate(() => [...document.querySelectorAll('[data-crew="callsheet-row"]')]
  .map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
say('  ' + JSON.stringify(rows));
check('sa feuille de route s’est recalculée toute seule',
  rows.some((r) => r.startsWith(fmt(cocktail.start))), rows.join(' | '));
check('et son arrivée a suivi',
  rows.length > 0 && rows[0].startsWith(fmt(cocktail.start - 0.75)), rows[0] ?? 'aucune ligne');

// --- 5. conflicts -----------------------------------------------------------
say('\n=== 5. CONFLITS DÉTECTÉS ===');
const findings = await p.evaluate(() => [...document.querySelectorAll('[data-crew="finding"]')]
  .map((f) => ({ level: f.getAttribute('data-level'), text: f.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) })));
say('  ' + JSON.stringify(findings.slice(0, 4), null, 1));
check('le Lab d’équipe signale des manques réels', findings.length > 0, String(findings.length));
check('dont les besoins techniques non déclarés',
  findings.some((f) => /Besoins techniques non déclarés/.test(f.text)));
check('et l’absence de document', findings.some((f) => /Aucun document/.test(f.text)));

// a real overlap: the saxophonist in two places at once
await click('jourj', 'nav-jourj'); await wait(700);
const dinerId = (await state()).phases.find((x) => x.name === 'Dîner')?.id;
await p.evaluate((id) => {
  const card = document.querySelector(`[data-phase-id="${id}"]`);
  card?.scrollIntoView({ inline: 'center' });
  card?.querySelector('[data-jourj="open-moment"]')?.click();
}, dinerId);
await wait(900);
await p.evaluate(() => {
  const sel = document.querySelector('[data-jourj="hub-person-existing"]');
  const opt = [...(sel?.options ?? [])].find((o) => o.textContent.includes('MATT SAXO'));
  if (!sel || !opt) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, opt.value);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(600);
await commit('jourj', 'hub-start', fmt((await state()).phases.find((x) => x.name === 'Cocktail').start + 0.25));
await click('jourj', 'hub-close'); await wait(600);
await click('jourj', 'nav-crew'); await wait(900);
const conflicts = await p.evaluate(() => [...document.querySelectorAll('[data-crew="finding"][data-level="conflict"]')]
  .map((f) => f.textContent.replace(/\s+/g, ' ').trim().slice(0, 100)));
say('  ' + JSON.stringify(conflicts));
check('un chevauchement de personne est détecté',
  conflicts.some((c) => /deux endroits/.test(c)), conflicts.join(' | '));
await shot('03-conflit');

// --- 6. scenario, document, search ------------------------------------------
say('\n=== 6. SCÉNARIO, DOCUMENT, RECHERCHE ===');
await click('jourj', 'nav-organisation'); await wait(900);
await setField('scenario', 'name', 'Artiste indisponible');
await click('scenario', 'create'); await wait(900);
s = await state();
check('un scénario spectacle est créé', s.scenarios === 1, String(s.scenarios));

await click('jourj', 'nav-jourj'); await wait(700);
const cocktailId = (await state()).phases.find((x) => x.name === 'Cocktail')?.id;
await p.evaluate((id) => {
  const card = document.querySelector(`[data-phase-id="${id}"]`);
  card?.scrollIntoView({ inline: 'center' });
  card?.querySelector('[data-jourj="open-moment"]')?.click();
}, cocktailId);
await wait(900);
const fileInput = await p.$('[data-jourj="hub-file"]');
if (fileInput) { await fileInput.uploadFile(DOC); await wait(1600); }
await click('jourj', 'hub-close'); await wait(600);
s = await state();
check('le contrat est rattaché au moment',
  s.media.some((m) => m.owner === 'event' && /contrat-saxophoniste/.test(m.name || '')),
  JSON.stringify(s.media));

await click('jourj', 'nav-search'); await wait(700);
await setField('search', 'input', 'saxo');
await wait(700);
const results = await p.evaluate(() => [...document.querySelectorAll('[data-search="result"]')]
  .map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)));
say('  ' + JSON.stringify(results));
check('la recherche trouve par métier', results.some((r) => /Saxophoniste/.test(r)), String(results.length));
check('et rend son contexte', results.some((r) => /moment/.test(r) || /Cocktail/.test(r)));
await click('search', 'close'); await wait(500);
await shot('04-recherche-metier');

// --- 6b. ORCHESTRATION: travel, missions, replacements, documents ----------
say('\n=== 6b. ORCHESTRATION ===');
await click('jourj', 'nav-crew'); await wait(900);
await openCrew('MATT SAXO');

// travel — free text, nothing booked
// The craft fields carry a `craft-` prefix on their test id.
await commit('crew', 'craft-travel-from', 'Bruxelles');
await commit('crew', 'craft-travel-hotel', 'Hôtel du Parc, nuit du 21');
let st = await state();
const trav = st.persons.find((x) => /MATT SAXO/.test(x.name))?.craft?.travel;
check('le déplacement est enregistré tel qu’écrit',
  trav?.from === 'Bruxelles' && /Hôtel du Parc/.test(trav?.hotel || ''), JSON.stringify(trav));

// delegation
await setField('crew', 'mission-new', 'Vérifier le contrat de Matt');
await click('crew', 'mission-submit');
await wait(800);
const missions = await p.evaluate(() => [...document.querySelectorAll('[data-crew="mission"]')]
  .map((m) => m.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)));
check('une mission peut être déléguée', missions.length === 1, JSON.stringify(missions));
await p.evaluate(() => {
  const sel = document.querySelector('[data-crew="mission-status"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, 'to_confirm');
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(700);
check('et son statut évolue',
  (await state()).tasksToConfirm > 0, String((await state()).tasksToConfirm));

// replacements — a proposal, never a swap
await click('crew', 'replacements-open');
await wait(700);
const repl = await p.evaluate(() => ({
  empty: !!document.querySelector('[data-crew="replacements-empty"]'),
  list: [...document.querySelectorAll('[data-crew="replacements-list"] li')].map((l) => l.textContent.trim().slice(0, 60)),
}));
say('  ' + JSON.stringify(repl));
check('la recherche de remplaçant ne propose que des personnes réelles',
  repl.empty || repl.list.length > 0);

// cross-event check
await click('crew', 'crossevents-run');
await wait(900);
const cross = await p.evaluate(() => ({
  empty: !!document.querySelector('[data-crew="crossevents-empty"]'),
  list: [...document.querySelectorAll('[data-crew="crossevent"]')].map((l) => l.textContent.trim().slice(0, 80)),
}));
say('  ' + JSON.stringify(cross));
check('la vérification inter-événements répond', cross.empty || cross.list.length > 0);

// the document desk
await setField('crew', 'doc-recipient', 'ASSOCIATION LES FEES');
await p.evaluate(() => {
  const sel = document.querySelector('[data-crew="doc-person"]');
  const opt = [...sel.options].find((o) => /MATT SAXO/.test(o.textContent));
  if (!opt) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, opt.value);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(400);
await click('crew', 'doc-generate');
await wait(900);
st = await state();
const generated = st.media.filter((m) => /devis/i.test(m.name || ''));
check('un document est produit et rattaché à la personne',
  generated.length === 1 && generated[0].owner === 'person', JSON.stringify(generated));
check('la recherche web est déclarée indisponible, pas simulée',
  await p.evaluate(() => /n’est pas\s+disponible ici|n’est pas disponible ici/.test(
    document.querySelector('[data-crew="doc-web"]')?.textContent.replace(/\s+/g, ' ') || '')));
const docBody = await p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const st2 = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || '{}');
  const m = (st2.media || []).find((x) => /devis/i.test(x.fileName || ''));
  return m ? decodeURIComponent(String(m.source).split(',')[1] || '') : '';
});
check('le document contient le déroulé réel de la personne', /D[ÉE]ROUL[ÉE]/.test(docBody) && /Cocktail/.test(docBody));
check('et marque « À CONFIRMER » ce qui n’est pas connu', /À CONFIRMER/.test(docBody));
check('sans inventer de montant', /Montant : À CONFIRMER/.test(docBody));
await shot('05-orchestration');
await noOverflow('Orchestration');

// --- 7. reload and isolation ------------------------------------------------
say('\n=== 7. RELOAD ET ISOLATION ===');
const before = await state();
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
const after = await state();
check('les métiers survivent au reload',
  after.persons.filter((x) => x.craft).length === before.persons.filter((x) => x.craft).length,
  String(after.persons.filter((x) => x.craft).length));
check('les rattachements aussi',
  JSON.stringify(after.phases.map((x) => x.people.length)) === JSON.stringify(before.phases.map((x) => x.people.length)));
check('les missions et le déplacement survivent au reload',
  after.missions === before.missions
  && after.persons.find((x) => /MATT SAXO/.test(x.name))?.craft?.travel?.from === 'Bruxelles',
  `${after.missions} mission(s)`);

await click('jourj', 'nav-weddings'); await wait(1600);
await click('landing', 'hero-create'); await wait(1200);
await typeInto('Clara', 'PIA'); await typeInto('Alexandre', 'RENE');
await clickText('Continuer'); await wait(400);
await clickText('Continuer'); await wait(400);
await clickText('Générer notre monde'); await wait(3000);
const other = await state();
check('le second mariage n’a aucun artiste', other.persons.filter((x) => x.craft).length === 0);
check('ni moment, ni scénario', other.phases.length === 0 && other.scenarios === 0);
check('aucun asset éditorial dans aucun projet', !other.editorialAnywhere);
await noOverflow('Second mariage');

say(`\n### RÉSULTAT ${WIDTH}px : ${failures} échec(s)`);
writeFileSync(`${OUT}/spectacle-${WIDTH}.log`, log.join('\n'));
await browser.close();
process.exit(failures > 0 ? 1 : 0);
