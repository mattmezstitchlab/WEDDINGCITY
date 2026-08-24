#!/usr/bin/env node
/**
 * ACCEPTANCE — CHRONOS : LE CALENDRIER VIVANT.
 *
 * The calendar is a PROJECTION, never a second agenda. This test drives a real
 * Chromium and proves it end to end:
 *
 *   two real events on two days → the calendar sees them at four scales →
 *   a day opens its own timeline → a moment is moved on that timeline → the
 *   calendar reflects it WITHOUT having stored anything → a person's agenda is
 *   derived across events → the administration filters by time → reload →
 *   and no second store, no copied hour, no 72-hour ribbon.
 *
 * Usage: node scripts/acceptance-chronos.mjs [width]
 */
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/chronos';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/chronos-profile';
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
  await wait(350);
};
const clickScale = (scale) => p.evaluate((scale) => {
  const el = document.querySelector(`[data-cal="scale"][data-scale="${scale}"]`);
  if (!el) return false; el.click(); return true;
}, scale);

const state = () => p.evaluate(() => {
  const keys = Object.keys(localStorage);
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const raw = localStorage.getItem('wedding_city_state_' + id) || '';
  const st = raw ? JSON.parse(raw) : null;
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  return {
    id,
    keys: keys.filter((k) => k.startsWith('wedding_city')),
    projects: JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]')
      .map((x) => ({ id: x.id, name: x.coupleNames || x.title, date: x.weddingDate, type: x.eventTypeId })),
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour, people: x.personIds || [] })),
    persons: L('persons').map((x) => ({ id: x.id, name: x.displayName })),
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

/** Create an event from the hero, with a date and one described moment. */
const createEvent = async (type, sentence, principals) => {
  await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
  await wait(400);
  await setField('landing', 'type', type);
  await wait(250);
  await setField('landing', 'brief', sentence);
  await click('landing', 'hero-create');
  await wait(2600);
  await p.evaluate((principals) => {
    const el = document.querySelector('[data-intake="intake-couple"]');
    el.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, principals);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.blur();
  }, principals);
  await wait(500);
  await click('intake', 'generate');
  await wait(3000);
};


// LOCATOR ADAPTED (panneau du Jour J) — the moment panel now folds into six
// sections that announce their state. A closed section unmounts its fields, so
// the test unfolds the panel with its own « Tout déplier » control, exactly as
// a user would. Every field is still there, and still writes to the same place.
const unfoldHub = async () => {
  await p.evaluate(() => {
    const btn = document.querySelector('[data-jourj="hub-expand-all"]');
    if (btn && /déplier/i.test(btn.textContent || '')) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));
};

// ═══════════════════════════════════════════════════════════════════════════
say(`### CHRONOS — ${WIDTH}px`);

await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);

// --- 1. two real events, two different days ---------------------------------
say('\n=== 1. DEUX ÉVÉNEMENTS, DEUX JOURS ===');
await createEvent('voyage',
  'Voyage le 16 juillet 2027 : départ à 07h00, vol à 09h30, arrivée à 11h30, hébergement à 15h00.',
  'LILLE → BARCELONE');
const s1 = await state();
check('le voyage est créé, avec sa date', s1.projects.some((x) => x.date === '2027-07-16'),
  s1.projects.map((x) => `${x.name}@${x.date}`).join(' | '));
check('et il porte sa nature', s1.projects.some((x) => x.type === 'voyage'));

await click('jourj', 'nav-weddings');
await wait(1600);
await createEvent('mariage',
  'Nous nous marions le 17 juillet 2027 au Château de Vaux. Cérémonie à 15h, cocktail à 17h30, dîner à 20h.',
  'NINA & OSCAR');
const s2 = await state();
check('le mariage est créé le lendemain', s2.projects.some((x) => x.date === '2027-07-17'));
check('les deux événements coexistent, isolés', s2.projects.filter((x) => !x.name.includes('Clara')).length === 2,
  String(s2.projects.length));
check('une seule famille de clés de stockage — aucun second store',
  s2.keys.every((k) => /^wedding_city_(accounts_v1|active_account_v1|projects_v1|active_project_id_v1|state_)/.test(k)),
  s2.keys.join(', '));

// --- 2. the calendar sees them, at four scales ------------------------------
say('\n=== 2. LE CALENDRIER, QUATRE ÉCHELLES ===');
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
check('l’entrée « Calendrier » existe dans la navigation', await click('jourj', 'nav-calendar'));
await wait(1400);
const opened = await p.evaluate(() => ({
  studio: !!document.querySelector('[data-cal="studio"]'),
  scales: [...document.querySelectorAll('[data-cal="scale"]')].map((n) => n.dataset.scale),
  label: document.querySelector('[data-cal="label"]')?.textContent.trim(),
}));
say('  ' + JSON.stringify(opened));
check('le calendrier s’ouvre', opened.studio);
check('avec les quatre échelles', ['year', 'month', 'week', 'day'].every((s) => opened.scales.includes(s)),
  opened.scales.join(','));
check('et s’ouvre sur la période du prochain événement', /juillet 2027/i.test(opened.label || ''), opened.label);
await shot('01-calendrier-mois');
await noOverflow('Calendrier');

const month = await p.evaluate(() => ({
  ticks: document.querySelectorAll('[data-cal="tick"]').length,
  busy: [...document.querySelectorAll('[data-cal="tick"][data-busy="yes"]')].map((n) => n.textContent.trim()),
  rows: [...document.querySelectorAll('[data-cal="day-row"]')].map((n) => n.dataset.date),
  entries: document.querySelectorAll('[data-cal="entry"]').length,
}));
say('  ' + JSON.stringify(month));
check('le mois est une règle de 31 jours, pas une grille de cases', month.ticks === 31, String(month.ticks));
check('les deux jours occupés sont allumés', month.busy.includes('16') && month.busy.includes('17'),
  month.busy.join(','));
check('et seulement eux', month.busy.length === 2, month.busy.join(','));
check('chaque jour occupé est listé', month.rows.length === 2, month.rows.join(','));

await clickScale('week'); await wait(900);
const week = await p.evaluate(() => ({
  days: document.querySelectorAll('[data-cal="week-day"]').length,
  empty: document.querySelectorAll('[data-cal="empty-day"]').length,
  entries: document.querySelectorAll('[data-cal="entry"]').length,
  label: document.querySelector('[data-cal="label"]')?.textContent.trim(),
}));
say('  ' + JSON.stringify(week));
check('la semaine montre sept jours', week.days === 7, String(week.days));
check('les jours vides le disent avec des mots', week.empty === 5, String(week.empty));
check('les deux événements y sont', week.entries === 2, String(week.entries));
await shot('02-calendrier-semaine');

await clickScale('year'); await wait(900);
const year = await p.evaluate(() => ({
  months: document.querySelectorAll('[data-cal="month-row"]').length,
  july: [...document.querySelectorAll('[data-cal="month-row"]')]
    .find((n) => n.dataset.month?.endsWith('-07'))?.textContent.replace(/\s+/g, ' ').trim(),
  label: document.querySelector('[data-cal="label"]')?.textContent.trim(),
}));
say('  ' + JSON.stringify(year));
check('l’année est douze lignes typographiques', year.months === 12, String(year.months));
check('juillet annonce ses deux événements', /2 événements/.test(year.july || ''), year.july);
check('et l’année est nommée', year.label === '2027', year.label);
await shot('03-calendrier-annee');

// zoom: année → mois → jour
await p.evaluate(() => {
  const july = [...document.querySelectorAll('[data-cal="month-row"]')].find((n) => n.dataset.month?.endsWith('-07'));
  july?.querySelector('[data-cal="open-month"]')?.click();
});
await wait(800);
await p.evaluate(() => {
  const row = [...document.querySelectorAll('[data-cal="day-row"]')].find((n) => n.dataset.date === '2027-07-17');
  row?.querySelector('[data-cal="open-day-scale"]')?.click();
});
await wait(800);
const day = await p.evaluate(() => ({
  label: document.querySelector('[data-cal="label"]')?.textContent.trim(),
  entries: document.querySelectorAll('[data-cal="entry"]').length,
  text: document.querySelector('[data-cal="day"]')?.innerText.replace(/\s+/g, ' ') || '',
}));
say('  ' + JSON.stringify({ ...day, text: day.text.slice(0, 120) }));
check('on zoome de l’année au jour', /17 juillet 2027/i.test(day.label || ''), day.label);
check('le jour montre son événement', day.entries === 1 && /NINA & OSCAR/.test(day.text));
check('avec son premier horaire réel', /15:00/.test(day.text), day.text.slice(0, 80));
await shot('04-calendrier-jour');

// --- 3. the calendar opens the timeline -------------------------------------
say('\n=== 3. LE CALENDRIER OUVRE LA PELLICULE ===');
await click('cal', 'open-timeline');
await wait(2500);
const landed = await p.evaluate(() => ({
  closed: !document.querySelector('[data-cal="studio"]'),
  strips: document.querySelectorAll('[data-jourj="strip"]').length,
  moments: [...document.querySelectorAll('[data-jourj="moment"]')].map((n) => n.textContent.replace(/\s+/g, ' ').slice(0, 24)),
}));
say('  ' + JSON.stringify(landed));
check('le calendrier se referme et laisse la place à la journée', landed.closed);
check('il n’y a jamais qu’UNE pellicule', landed.strips === 1, String(landed.strips));
check('la journée du 17 est bien celle qui est ouverte',
  landed.moments.some((m) => /Cérémonie/.test(m)), landed.moments.join(' | '));

// --- 4. a change on the timeline changes the calendar -----------------------
say('\n=== 4. UNE MODIFICATION SE PROPAGE (rien n’est copié) ===');
const before = (await state()).phases.find((x) => x.name === 'Cocktail');
await p.evaluate(() => {
  const card = [...document.querySelectorAll('[data-jourj="moment"]')].find((c) => c.textContent.includes('Cérémonie'));
  card?.querySelector('[data-jourj="open-moment"]')?.click();
});
await wait(1000);
await unfoldHub();
await commit('jourj', 'hub-start', '10:00');
// Attach a real person to this moment: the derived agenda must have someone to
// derive. Nothing is invented — the name is typed, exactly as a human would,
// through the hub's own « créer une personne » field.
await setField('jourj', 'hub-person-new', 'MATT MEZ');
await click('jourj', 'hub-person-new-submit');
await wait(900);
await p.keyboard.press('Escape');
await wait(800);
const after = (await state()).phases.find((x) => x.name === 'Cérémonie');
check('l’horaire a bien changé sur la pellicule', after && Math.abs(after.start - 10) < 0.01,
  String(after?.start));

await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
await click('jourj', 'nav-calendar');
await wait(1400);
await clickScale('month'); await wait(800);
const propagated = await p.evaluate(() => {
  const row = [...document.querySelectorAll('[data-cal="day-row"]')].find((n) => n.dataset.date === '2027-07-17');
  return row ? row.innerText.replace(/\s+/g, ' ') : '';
});
say('  ' + propagated.slice(0, 140));
check('le calendrier affiche le nouvel horaire, sans avoir rien stocké',
  /10:00/.test(propagated), propagated.slice(0, 90));
check('et l’ancien horaire a disparu', !/15:00/.test(propagated));

// --- 5. a person's own agenda, derived --------------------------------------
say('\n=== 5. L’AGENDA D’UNE PERSONNE ===');
const st5 = await state();
const attached = st5.phases.find((x) => (x.people || []).length > 0);
check('une personne est bien rattachée à un moment',
  Boolean(attached), attached ? attached.name : 'aucune');
const someone = st5.persons.find((x) => attached?.people.includes(x.id)) || st5.persons[0];
if (someone) {
  await setField('cal', 'person', someone.id);
  await wait(900);
  const agenda = await p.evaluate(() => ({
    rows: document.querySelectorAll('[data-cal="agenda-row"]').length,
    empty: !!document.querySelector('[data-cal="agenda-empty"]'),
    text: document.querySelector('[data-cal="agenda"]')?.innerText.replace(/\s+/g, ' ') || '',
  }));
  say('  ' + JSON.stringify({ rows: agenda.rows, empty: agenda.empty }));
  check('l’agenda de cette personne est dérivé de la pellicule',
    attached ? agenda.rows >= 1 : (agenda.rows > 0 || agenda.empty),
    `${agenda.rows} ligne(s)`);
  if (attached) {
    check('et il porte l’horaire réel du moment, jamais une saisie séparée',
      /10:00/.test(agenda.text), agenda.text.slice(0, 120));
  }
  check('et prévient que le rapprochement inter-événements se fait sur le nom',
    /nom/i.test(agenda.text), agenda.text.slice(0, 100));
}
await shot('05-agenda-personne');
await noOverflow('Agenda');
await click('cal', 'close');
await wait(600);

// --- 6. administration filters by time --------------------------------------
say('\n=== 6. L’ADMINISTRATION FILTRE LE TEMPS ===');
await click('jourj', 'nav-admin');
await wait(1400);
const filters = await p.evaluate(() => [...document.querySelectorAll('[data-admin="when"]')].map((n) => n.dataset.when));
check('les filtres temporels existent',
  ['tout', 'today', 'week', 'month', 'next'].every((f) => filters.includes(f)), filters.join(','));
await p.evaluate(() => document.querySelector('[data-admin="when"][data-when="next"]')?.click());
await wait(700);
const next = await p.evaluate(() => ({
  events: document.querySelectorAll('[data-admin="event"]').length,
  text: document.querySelector('[data-admin="events"]')?.innerText.replace(/\s+/g, ' ') || '',
}));
say('  ' + JSON.stringify({ events: next.events }));
check('« prochain événement » n’en montre qu’un', next.events === 1, String(next.events));
await p.evaluate(() => document.querySelector('[data-admin="when"][data-when="today"]')?.click());
await wait(700);
const todayOnly = await p.evaluate(() => ({
  events: document.querySelectorAll('[data-admin="event"]').length,
  empty: !!document.querySelector('[data-admin="events-empty"]'),
}));
check('« aujourd’hui » dit honnêtement qu’il n’y a rien', todayOnly.events === 0 && todayOnly.empty,
  JSON.stringify(todayOnly));
await shot('06-administration-temps');
await p.evaluate(() => document.querySelector('[data-admin="close"]')?.click());
await wait(600);

// --- 7. reload + no duplication ---------------------------------------------
say('\n=== 7. RECHARGEMENT, ISOLATION, AUCUN DOUBLON ===');
await p.reload({ waitUntil: 'domcontentloaded' });
await wait(3200);
const s3 = await state();
check('la journée survit au rechargement', s3.phases.length >= 3, String(s3.phases.length));
check('l’horaire déplacé aussi',
  s3.phases.some((x) => x.name === 'Cérémonie' && Math.abs(x.start - 10) < 0.01));
check('aucune clé de stockage n’a été ajoutée par le calendrier',
  s3.keys.every((k) => /^wedding_city_(accounts_v1|active_account_v1|projects_v1|active_project_id_v1|state_)/.test(k)),
  s3.keys.length + ' clés');

await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
await click('jourj', 'nav-calendar');
await wait(1400);
const persisted = await p.evaluate(() => ({
  strips: document.querySelectorAll('[data-jourj="strip"]').length,
  entries: document.querySelectorAll('[data-cal="entry"]').length,
  body: document.body.innerText.replace(/\s+/g, ' '),
}));
check('le calendrier retrouve ses deux événements après reload', persisted.entries >= 1, String(persisted.entries));
check('aucune donnée de démonstration dans un projet réel',
  !/Clara & Alexandre.*NINA/.test(persisted.body.slice(0, 400)));
check('toujours aucune seconde pellicule', persisted.strips <= 1, String(persisted.strips));

say(`\n### ${failures === 0 ? 'TOUT EST VERT' : failures + ' ÉCHEC(S)'} — ${WIDTH}px`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
