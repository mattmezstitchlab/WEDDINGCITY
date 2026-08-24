#!/usr/bin/env node
/**
 * ACCEPTANCE — LE PANNEAU DU JOUR J.
 *
 * One door per piece of information. This test drives a real Chromium and
 * checks the ten acceptance criteria of the UX pass:
 *
 *   the moment panel folds into six sections → each closed section says what it
 *   holds → the event has its own panel, same shell → the name/date/place of the
 *   event are editable in exactly ONE place → the moment's own fields are no
 *   longer editable in the composition surface → and one can reach a moment from
 *   the calendar, from the search and from the administration.
 *
 * Usage: node scripts/acceptance-panneau.mjs [width]
 */
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/panneau';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/panneau-profile';
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
  if (s.includes('Failed to fetch')) return;
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
const commit = async (attr, tag, value) => {
  await setField(attr, tag, value);
  await p.evaluate((attr, tag) => document.querySelector(`[data-${attr}="${tag}"]`)?.blur(), attr, tag);
  await wait(400);
};

const state = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const raw = localStorage.getItem('wedding_city_state_' + id) || '';
  const st = raw ? JSON.parse(raw) : null;
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  const project = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]')
    .find((x) => x.id === id) || {};
  return {
    id,
    project: { name: project.coupleNames, date: project.weddingDate, place: project.locationName, type: project.eventTypeId },
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour })),
  };
});

const openMomentCard = async (name) => {
  await p.evaluate((name) => {
    const card = [...document.querySelectorAll('[data-jourj="moment"]')]
      .find((c) => (c.textContent || '').includes(name)) || document.querySelector('[data-jourj="moment"]');
    card?.scrollIntoView({ inline: 'center', block: 'nearest' });
    card?.querySelector('[data-jourj="open-moment"]')?.click();
  }, name);
  await wait(900);
};

// LOCATOR ADAPTED (Passe A): Calendrier is reached from the EventPanel rather
// than occupying a permanent top-level navigation slot.
const openCalendar = async () => {
  if (!await click('jourj', 'open-event')) return false;
  await wait(300);
  await click('jourj', 'hub-section-calendar');
  await wait(200);
  return click('jourj', 'event-calendar');
};

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
say(`### PANNEAU DU JOUR J — ${WIDTH}px`);

await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);

// --- a real day to work on --------------------------------------------------
say('\n=== 0. UNE JOURNÉE RÉELLE ===');
await setField('landing', 'brief',
  'Nous nous marions le 18 juillet 2027 au Château de Vaux. Cérémonie à 15h, cocktail à 17h30, dîner à 20h.');
await click('landing', 'hero-create');
await wait(2600);
await p.evaluate(() => {
  const el = document.querySelector('[data-intake="intake-couple"]');
  el.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'NINA & OSCAR');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.blur();
});
await wait(500);
await click('intake', 'generate');
await wait(3000);
const s0 = await state();
check('la journée existe', s0.phases.length === 3, String(s0.phases.length));

// --- 1. the moment panel folds ----------------------------------------------
say('\n=== 1. LE PANNEAU DU MOMENT SE REPLIE ===');
await openMomentCard('Cocktail');
const folded = await p.evaluate(() => {
  const sections = [...document.querySelectorAll('[data-jourj="hub-section"]')];
  return {
    count: sections.length,
    ids: sections.map((s) => s.dataset.section),
    open: sections.filter((s) => s.dataset.open === 'yes').map((s) => s.dataset.section),
    summaries: sections.map((s) => s.querySelector('[data-jourj="hub-section-summary"]')?.textContent.trim()),
    expandAll: !!document.querySelector('[data-jourj="hub-expand-all"]'),
    fieldsVisible: document.querySelectorAll('[data-jourj="hub-menu"], [data-jourj="hub-cost"], [data-jourj="hub-notes"]').length,
  };
});
say('  ' + JSON.stringify(folded));
// PRODUCT DECISION (convergence de la Timeline): a seventh section, « Scénarios »,
// gives the plan B an obvious door on the moment it concerns.
check('le panneau est fait de sept sections', folded.count === 7, String(folded.count));
check('elles couvrent quand/où, qui, ce qu’on y vit, logistique, documents, scénarios, notes',
  ['when', 'who', 'life', 'logistics', 'documents', 'scenarios', 'notes'].every((id) => folded.ids.includes(id)),
  folded.ids.join(','));
// PRODUCT DECISION: every section is now closed on arrival, as the brief asks.
// The panel opens as a control card; nothing is mounted until it is asked for.
check('toutes les sections sont fermées à l’arrivée',
  folded.open.length === 0, folded.open.join(','));
check('le mur de formulaires a disparu (les champs repliés ne sont pas montés)',
  folded.fieldsVisible === 0, String(folded.fieldsVisible));
check('chaque section fermée annonce son état',
  folded.summaries.every((t) => t && t.length > 2), JSON.stringify(folded.summaries));
check('et un seul geste déplie tout', folded.expandAll);
await shot('01-panneau-replie');
await noOverflow('Panneau du moment');

// each summary must say something true, not a label
const summaries = folded.summaries.join(' | ');
check('les résumés disent l’état réel, pas un titre répété',
  /15:00|17:30|aucun lieu|Château/.test(summaries) && /aucun document|document/.test(summaries),
  summaries.slice(0, 140));

// --- 2. opening a section reveals its fields, unchanged ---------------------
say('\n=== 2. OUVRIR UNE SECTION REND SES CHAMPS, INCHANGÉS ===');
await click('jourj', 'hub-section-logistics');
await wait(500);
const opened = await p.evaluate(() => ({
  cost: !!document.querySelector('[data-jourj="hub-cost"]'),
  logistics: !!document.querySelector('[data-jourj="hub-logistics"]'),
  open: document.querySelector('[data-section="logistics"]')?.dataset.open,
}));
check('la section logistique & budget s’ouvre', opened.open === 'yes');
check('et ses champs sont bien là', opened.cost && opened.logistics, JSON.stringify(opened));
await commit('jourj', 'hub-cost', '4250');
const s1 = await state();
check('un champ replié puis ouvert écrit toujours au même endroit',
  await p.evaluate(() => {
    const id = localStorage.getItem('wedding_city_active_project_id_v1');
    const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || '{}');
    return (st.phases || []).some((x) => x.budget && x.budget.amount === 4250);
  }));

// --- 3. the title of a moment is edited ON the moment -----------------------
say('\n=== 3. LE NOM DU MOMENT SE CORRIGE SUR LE MOMENT ===');
// The name lives in « Quand & où », which is now folded like the rest.
await click('jourj', 'hub-section-when');
await wait(400);
const hasTitle = await p.evaluate(() => !!document.querySelector('[data-jourj="hub-title"]'));
check('le champ du nom existe dans le moment', hasTitle);
await commit('jourj', 'hub-title', 'COCKTAIL AU JARDIN');
const s2 = await state();
check('et il écrit sur le bon moment',
  s2.phases.some((x) => x.name === 'COCKTAIL AU JARDIN'),
  s2.phases.map((x) => x.name).join(', '));
await click('jourj', 'hub-close');
await wait(600);

// --- 4. the event has its own panel, same shell -----------------------------
say('\n=== 4. L’ÉVÉNEMENT A SON PROPRE PANNEAU ===');
check('la porte « L’événement » existe sur la journée', await click('jourj', 'open-event'));
await wait(900);
const ev = await p.evaluate(() => {
  const panel = document.querySelector('[data-jourj="event-panel"]');
  const sections = [...document.querySelectorAll('[data-jourj="hub-section"]')];
  return {
    panel: !!panel,
    sameShell: panel ? panel.classList.contains('wc-hub') : false,
    sections: sections.map((s) => s.dataset.section),
    summaries: sections.map((s) => s.querySelector('[data-jourj="hub-section-summary"]')?.textContent.trim()),
    fields: ['event-name', 'event-date', 'event-place', 'event-type']
      .filter((t) => !!document.querySelector(`[data-jourj="${t}"]`)),
  };
});
say('  ' + JSON.stringify(ev));
check('il s’ouvre dans la même géométrie que le moment — un seul panneau', ev.panel && ev.sameShell);
check('il porte l’événement, la journée, les plans B et le calendrier',
  ['event', 'day', 'scenarios', 'calendar'].every((id) => ev.sections.includes(id)), ev.sections.join(','));
check('ses sections fermées annoncent elles aussi leur état',
  ev.summaries.every((t) => t && t.length > 2), JSON.stringify(ev.summaries).slice(0, 160));
check('le nom, la nature, la date et le lieu y sont modifiables',
  ev.fields.length === 4, ev.fields.join(','));
await shot('02-panneau-evenement');
await noOverflow('Panneau de l’événement');

await commit('jourj', 'event-place', 'CHÂTEAU DE VAUX — ORANGERIE');
await commit('jourj', 'event-date', '2027-07-19');
const s3 = await state();
check('le lieu de l’événement est enregistré', s3.project.place === 'CHÂTEAU DE VAUX — ORANGERIE', String(s3.project.place));
check('la date de l’événement est enregistrée', s3.project.date === '2027-07-19', String(s3.project.date));
await commit('jourj', 'event-date', 'pas une date');
const s4 = await state();
check('une date qui n’en est pas une est refusée, sans rien casser', s4.project.date === '2027-07-19', String(s4.project.date));

// a moment opens from the event panel — after opening « La journée », because
// a folded section really does unmount its content. That is the behaviour under
// test, not a workaround.
await click('jourj', 'hub-section-day');
await wait(500);
check('la liste des moments vit dans « La journée »',
  await p.evaluate(() => document.querySelectorAll('[data-jourj="event-open-moment"]').length >= 1));
await p.evaluate(() => document.querySelector('[data-jourj="event-open-moment"]')?.click());
await wait(900);
check('depuis l’événement, un moment s’ouvre',
  await p.evaluate(() => !!document.querySelector('[data-jourj="hub"]')));
await click('jourj', 'hub-close');
await wait(500);

// --- 5. no duplicate editing in the composition surface ---------------------
say('\n=== 5. PLUS DE DOUBLE PORTE POUR LA MÊME DONNÉE ===');
// PRODUCT DECISION (Passe A): « Composer » no longer opens a programme. The
// keyboard entry now opens only the five transverse sheets, while a moment is
// opened by the Timeline and edited by MomentHub.
await p.keyboard.press('KeyK');
await wait(900);
const canvasDup = await p.evaluate(() => ({
  hasCanvas: Boolean(document.querySelector('#wc-mirror-canvas')),
  tabs: [...document.querySelectorAll('#wc-mirror-canvas nav button')].map((b) => b.textContent.trim()),
  momentRows: document.querySelectorAll('#wc-mirror-canvas [data-canvas="moment-row"]').length,
}));
check('la surface des fiches existe toujours', canvasDup.hasCanvas);
check('elle n’expose que cinq fiches transverses', canvasDup.tabs.length === 5, canvasDup.tabs.join(' | '));
check('elle ne contient plus de programme ni de moment à éditer', canvasDup.momentRows === 0);
const canvasSrc = await fetch('http://localhost:5173/src/components/canvas/CanvasCore.tsx').then((r) => r.text());
check('elle n’écrit plus l’heure d’un moment', !/store\.setPhaseTime\(/.test(canvasSrc));
check('ni son titre', !/store\.setPhaseTitle\(/.test(canvasSrc));
check('ni son lieu', !/store\.setPhasePlace\(/.test(canvasSrc));
check('ni ses notes', !/store\.setPhaseNotes\(/.test(canvasSrc));
check('ni ses prestataires', !/store\.attachVendorToPhase\(/.test(canvasSrc));
await click('canvas', 'close');
await wait(500);

// --- 6. every entrance reaches the same moment ------------------------------
say('\n=== 6. TOUTES LES ENTRÉES MÈNENT AU MÊME MOMENT ===');
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
await click('jourj', 'nav-search');
await wait(800);
await p.evaluate(() => {
  const el = document.querySelector('[data-search="panel"] input');
  el.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'COCKTAIL');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(800);
await p.evaluate(() => {
  const r = [...document.querySelectorAll('[data-search="result"]')].find((n) => n.dataset.kind === 'moment');
  r?.click();
});
await wait(1200);
check('depuis la recherche, le moment s’ouvre',
  await p.evaluate(() => !!document.querySelector('[data-jourj="hub"]')));
await click('jourj', 'hub-close');
await wait(500);

await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
await openCalendar();
await wait(1300);
await p.evaluate(() => {
  const day = document.querySelector('[data-cal="scale"][data-scale="day"]');
  day?.click();
});
await wait(900);
const calMoments = await p.evaluate(() => document.querySelectorAll('[data-cal="open-moment"]').length);
check('le calendrier liste les moments de la journée', calMoments >= 1, String(calMoments));
if (calMoments > 0) {
  await p.evaluate(() => document.querySelector('[data-cal="open-moment"]')?.click());
  await wait(1600);
  check('et l’un d’eux ouvre son moment sur la pellicule',
    await p.evaluate(() => !!document.querySelector('[data-jourj="hub"]')));
  check('le calendrier s’est refermé — on ne se perd pas entre deux surfaces',
    await p.evaluate(() => !document.querySelector('[data-cal="studio"]')));
  await click('jourj', 'hub-close');
  await wait(500);
} else {
  await click('cal', 'close');
  await wait(500);
}
await shot('03-navigation-contextuelle');

// --- 7. the source of truth is still single ---------------------------------
say('\n=== 7. UNE SEULE SOURCE DE VÉRITÉ ===');
await p.reload({ waitUntil: 'domcontentloaded' });
await wait(3200);
const s5 = await state();
check('le nom corrigé du moment a survécu',
  s5.phases.some((x) => x.name === 'COCKTAIL AU JARDIN'), s5.phases.map((x) => x.name).join(', '));
check('la date corrigée de l’événement aussi', s5.project.date === '2027-07-19', String(s5.project.date));
check('toujours une seule pellicule',
  await p.evaluate(() => document.querySelectorAll('[data-jourj="strip"]').length) <= 1);
check('et un seul panneau à la fois',
  await p.evaluate(() => document.querySelectorAll('.wc-hub').length) === 0);

say(`\n### ${failures === 0 ? 'TOUT EST VERT' : failures + ' ÉCHEC(S)'} — ${WIDTH}px`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
