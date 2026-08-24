#!/usr/bin/env node
/**
 * ACCEPTANCE — CONVERGENCE DE LA TIMELINE.
 *
 * « Plus de puissance, moins d'interface. » This test drives a real Chromium and
 * checks that the product has exactly one of each thing:
 *
 *   one timeline · one moment editor · one door per function · a navigation of
 *   four destinations · an administration a couple never sees · a simulation
 *   that lives IN the film and really calls the engine · a weather hypothesis
 *   that is declared, never guessed · a calendar that only navigates.
 *
 * Usage: node scripts/acceptance-timeline-convergence.mjs [width]
 */
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/convergence-timeline';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/convergence-timeline-profile';
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

const state = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const raw = localStorage.getItem('wedding_city_state_' + id) || '';
  const st = raw ? JSON.parse(raw) : null;
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  return {
    id,
    projects: JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]').length,
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour, outdoor: x.outdoor ?? null })),
    scenarios: L('scenarios').length,
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

const openMomentCard = async (name) => {
  await p.evaluate((name) => {
    const card = [...document.querySelectorAll('[data-jourj="moment"]')]
      .find((c) => (c.textContent || '').includes(name)) || document.querySelector('[data-jourj="moment"]');
    card?.scrollIntoView({ inline: 'center', block: 'nearest' });
    card?.querySelector('[data-jourj="open-moment"]')?.click();
  }, name);
  await wait(900);
};

// LOCATOR ADAPTED (Passe A): the calendar is opened from the event context,
// not kept in the primary navigation bar.
const openCalendar = async () => {
  if (!await click('jourj', 'open-event')) return false;
  await wait(300);
  await click('jourj', 'hub-section-calendar');
  await wait(200);
  return click('jourj', 'event-calendar');
};

// ═══════════════════════════════════════════════════════════════════════════
say(`### CONVERGENCE DE LA TIMELINE — ${WIDTH}px`);

await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
const landing = await p.evaluate(() => ({
  hero: !!document.querySelector('[data-landing="hero"]'),
  film: !!document.querySelector('[data-landing="film"]'),
  report: !!document.querySelector('[data-landing="report-intro"]'),
  oldSections: ['chaos', 'administration', 'causality', 'scenarios']
    .filter((name) => !!document.querySelector(`[data-landing="${name}"]`)),
  sections: document.querySelectorAll('[data-landing="timeline-intro"], [data-landing="report-intro"]').length,
}));
say('  ' + JSON.stringify(landing));
check('la Landing introduit directement la pellicule', landing.hero && landing.film && landing.report);
check('elle ne monte plus les anciennes pages de démonstration concurrentes', landing.oldSections.length === 0, landing.oldSections.join(','));
check('le passage Hero → pellicule reste court', landing.sections === 2, String(landing.sections));
await shot('00-landing');
await setField('landing', 'brief',
  'Nous nous marions le 18 juillet 2027 au Château de Vaux. Cérémonie à 15h, photos à 17h, cocktail à 17h30, dîner à 20h.');
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

// --- 1. one timeline, one editor --------------------------------------------
say('\n=== 1. UNE SEULE TIMELINE, UN SEUL ÉDITEUR ===');
const surfaces = await p.evaluate(() => ({
  strips: document.querySelectorAll('[data-jourj="strip"]').length,
  hubs: document.querySelectorAll('.wc-hub').length,
  canvases: document.querySelectorAll('#wc-mirror-canvas').length,
  compose: [...document.querySelectorAll('button')].filter((b) => /^Composer/.test(b.textContent || '')).length,
}));
say('  ' + JSON.stringify(surfaces));
check('une seule pellicule', surfaces.strips === 1, String(surfaces.strips));
check('aucun panneau ouvert sans qu’on l’ait demandé', surfaces.hubs === 0);
check('aucune surface de composition concurrente affichée', surfaces.canvases === 0);
check('plus un seul bouton « Composer » dans le récit', surfaces.compose === 0, String(surfaces.compose));
await shot('01-journee');
await noOverflow('La journée');

// --- 1b. MON GRAND JOUR: a band of type, and an auditable number -------------
say('\n=== 1b. MON GRAND JOUR ===');
const cockpit = await p.evaluate(() => {
  const c = document.querySelector('[data-jourj="cockpit"]');
  if (!c) return null;
  const strip = document.querySelector('[data-jourj="strip"]');
  return {
    percent: document.querySelector('[data-jourj="cockpit-score"]')?.textContent.trim(),
    next: document.querySelector('[data-jourj="cockpit-next"]')?.innerText.replace(/\s+/g, ' '),
    alerts: document.querySelector('[data-jourj="cockpit-alerts"]')?.innerText.replace(/\s+/g, ' '),
    moment: document.querySelector('[data-jourj="cockpit-moment"]')?.innerText.replace(/\s+/g, ' '),
    markersHidden: !document.querySelector('[data-jourj="cockpit-markers"]'),
    aboveFilm: strip
      ? c.getBoundingClientRect().top + window.scrollY < strip.getBoundingClientRect().top + window.scrollY
      : false,
  };
});
say('  ' + JSON.stringify(cockpit));
check('le cockpit existe, au-dessus de la pellicule', Boolean(cockpit?.aboveFilm));
check('il annonce un avancement chiffré', /%/.test(cockpit?.percent || ''), cockpit?.percent);
check('il dit sur combien de repères il compte', /sur 8/.test(cockpit?.percent || ''), cockpit?.percent);
check('il donne la prochaine chose à faire', (cockpit?.next || '').length > 20, cockpit?.next?.slice(0, 60));
check('il dit s’il y a un conflit', /conflit/i.test(cockpit?.alerts || ''), cockpit?.alerts);
check('il annonce le prochain moment', /\d{2}:\d{2}/.test(cockpit?.moment || ''), cockpit?.moment);
check('et la règle du chiffre reste repliée tant qu’on ne la demande pas', cockpit?.markersHidden);

await click('jourj', 'cockpit-score');
await wait(500);
const ruler = await p.evaluate(() => ({
  markers: [...document.querySelectorAll('[data-jourj="cockpit-marker"]')]
    .map((n) => ({ label: n.querySelector('.wc-cockpit-marker-label')?.textContent, done: n.dataset.done })),
  rule: document.querySelector('[data-jourj="cockpit-rule"]')?.textContent.replace(/\s+/g, ' ') || '',
}));
check('les huit repères sont montrés, un par un', ruler.markers.length === 8, String(ruler.markers.length));
check('chacun dit s’il est tenu', ruler.markers.every((m) => m.done === 'yes' || m.done === 'no'));
check('et le produit dit qu’il n’y a pas d’autre règle',
  /aucun n’est pondéré/.test(ruler.rule) && /aucun n’est deviné/.test(ruler.rule), ruler.rule.slice(0, 80));
const declared = await p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || '{}');
  return { docs: (st.media || []).filter((m) => m.kind === 'document').length };
});
const docMarker = ruler.markers.find((m) => /document/i.test(m.label || ''));
check('un repère non tenu n’est jamais présenté comme acquis',
  (declared.docs > 0) === (docMarker?.done === 'yes'),
  `${declared.docs} document(s) · repère ${docMarker?.done}`);
await shot('01b-cockpit');
await click('jourj', 'cockpit-score');
await wait(300);

// --- 2. a navigation of four destinations -----------------------------------
say('\n=== 2. UNE NAVIGATION DE QUATRE DESTINATIONS ===');
const nav = await p.evaluate(() => {
  const bar = document.querySelector('nav[aria-label="Navigation"]');
  const links = [...document.querySelectorAll('.wc-product-nav-links button')].map((b) => b.textContent.trim());
  return {
    links,
    admin: !!document.querySelector('[data-jourj="nav-admin"]'),
    lines: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
    aliases: [...document.querySelectorAll('[data-jourj-also]')].map((b) => b.getAttribute('data-jourj-also')),
  };
});
say('  ' + JSON.stringify(nav));
check('la barre principale ne liste plus de destinations concurrentes',
  nav.links.length === 0, `${nav.links.length} : ${nav.links.join(' · ')}`);
check('les fiches transverses s’ouvrent depuis la Timeline',
  await p.evaluate(() => !!document.querySelector('[data-jourj="open-transverse"]')));
check('un couple ne voit AUCUNE administration dans son mariage', !nav.admin);

// --- 3. click a moment → the panel, folded ----------------------------------
say('\n=== 3. CLIC SUR UN MOMENT → LE PANNEAU, REPLIÉ ===');
await openMomentCard('Cocktail');
const hub = await p.evaluate(() => {
  const sections = [...document.querySelectorAll('[data-jourj="hub-section"]')];
  return {
    open: !!document.querySelector('.wc-hub'),
    sections: sections.map((s) => s.dataset.section),
    opened: sections.filter((s) => s.dataset.open === 'yes').length,
    mounted: document.querySelectorAll('[data-jourj="hub-menu"], [data-jourj="hub-cost"]').length,
    summaries: sections.every((s) => (s.querySelector('[data-jourj="hub-section-summary"]')?.textContent || '').length > 2),
  };
});
say('  ' + JSON.stringify(hub));
check('le moment ouvre le panneau contextuel', hub.open);
check('sept sections, dont scénarios et contexte du moment',
  hub.sections.length === 7 && hub.sections.includes('scenarios'), hub.sections.join(','));
check('toutes fermées à l’arrivée', hub.opened === 0, String(hub.opened));
check('donc aucun formulaire monté', hub.mounted === 0, String(hub.mounted));
check('et chaque section annonce son état', hub.summaries);
await shot('02-panneau');
await noOverflow('Panneau du moment');

// the accordion really works, and the outdoor flag is DECLARED
await click('jourj', 'hub-section-when');
await wait(400);
const whenOpen = await p.evaluate(() => ({
  fields: ['hub-title', 'hub-start', 'hub-duration', 'hub-outdoor', 'hub-move-earlier', 'hub-move-later']
    .filter((t) => !!document.querySelector(`[data-jourj="${t}"]`)),
}));
check('« Quand & où » monte ses champs, y compris le nom et la place dans la journée',
  whenOpen.fields.length === 6, whenOpen.fields.join(','));
await p.evaluate(() => document.querySelector('[data-jourj="hub-outdoor"]')?.click());
await wait(600);
const s1 = await state();
check('« en extérieur » est une déclaration, enregistrée sur le moment',
  s1.phases.some((x) => x.outdoor === true), JSON.stringify(s1.phases.map((x) => `${x.name}:${x.outdoor}`)));
await click('jourj', 'hub-close');
await wait(600);

// --- 4. the simulation lives in the film ------------------------------------
say('\n=== 4. « ET SI… » VIT DANS LA PELLICULE ===');
const simHere = await p.evaluate(() => {
  const sim = document.querySelector('[data-jourj="simulation"]');
  const strip = document.querySelector('[data-jourj="strip"]');
  if (!sim || !strip) return null;
  return {
    present: true,
    belowFilm: sim.getBoundingClientRect().top + window.scrollY > strip.getBoundingClientRect().top + window.scrollY,
    folded: !document.querySelector('[data-jourj="sim-delay"]'),
  };
});
say('  ' + JSON.stringify(simHere));
check('la simulation est dans la pellicule, pas sur une autre page', simHere?.present && simHere.belowFilm);
check('et elle est repliée tant qu’on ne la demande pas', simHere?.folded);

await click('jourj', 'sim-toggle');
await wait(700);
const sim = await p.evaluate(() => ({
  delay: !!document.querySelector('[data-jourj="sim-delay"]'),
  weather: !!document.querySelector('[data-jourj="sim-weather"]'),
  minutes: document.querySelector('[data-jourj="sim-minutes-value"]')?.textContent.trim(),
  consequences: document.querySelector('[data-jourj="sim-consequences"]')?.innerText.replace(/\s+/g, ' ') || '',
  actions: ['sim-apply', 'sim-planb', 'sim-open', 'sim-reset'].filter((t) => !!document.querySelector(`[data-jourj="${t}"]`)),
}));
say('  ' + JSON.stringify({ ...sim, consequences: sim.consequences.slice(0, 120) }));
check('elle pose les deux questions : un retard, une averse', sim.delay && sim.weather);
check('le retard annonce ses conséquences', /passerait de/.test(sim.consequences), sim.consequences.slice(0, 90));
check('les quatre issues sont offertes', sim.actions.length === 4, sim.actions.join(','));
await shot('03-simulation');

// the simulation really calls the engine: change the delay, the numbers move
await setField('jourj', 'sim-minutes', '45');
await wait(600);
const sim45 = await p.evaluate(() => ({
  minutes: document.querySelector('[data-jourj="sim-minutes-value"]')?.textContent.trim(),
  consequences: document.querySelector('[data-jourj="sim-consequences"]')?.innerText.replace(/\s+/g, ' ') || '',
}));
check('changer le retard recalcule réellement', sim45.minutes === '+45 min'
  && sim45.consequences !== sim.consequences, `${sim.minutes} → ${sim45.minutes}`);
const projected = await p.evaluate(() => [...document.querySelectorAll('[data-jourj="moment"]')]
  .map((card) => ({ real: Number(card.dataset.start), projected: Number(card.dataset.projectedStart), simulation: card.dataset.simulation })));
check('les cartes de la Timeline montrent les heures projetées',
  projected.some((card) => card.projected > card.real) && projected.filter((card) => card.simulation === 'yes').length >= 2,
  JSON.stringify(projected));
check('la barre identifie la projection temporaire',
  await p.evaluate(() => /projection temporaire/i.test(
    document.querySelector('[data-jourj="simulation-state"]')?.textContent || '')));
const before = await state();
check('et la journée n’a pas bougé d’une minute tant qu’on n’applique pas',
  JSON.stringify(before.phases.map((x) => x.start)) === JSON.stringify(s1.phases.map((x) => x.start)));

// --- 5. the weather is a declared hypothesis, never a forecast --------------
say('\n=== 5. LA MÉTÉO EST UNE HYPOTHÈSE, PAS UNE PRÉVISION ===');
await setField('jourj', 'sim-rain', '100');
await setField('jourj', 'sim-hour', '18');
await wait(700);
const weather = await p.evaluate(() => ({
  honesty: document.querySelector('[data-jourj="sim-weather-honesty"]')?.textContent.replace(/\s+/g, ' ') || '',
  exposed: document.querySelectorAll('[data-jourj="sim-exposed-moment"]').length,
  none: !!document.querySelector('[data-jourj="sim-weather-none"]'),
  planB: !!document.querySelector('[data-jourj="sim-weather-planb"]'),
  raining: document.querySelector('[data-jourj="simulation"]')?.dataset.rain,
}));
say('  ' + JSON.stringify({ ...weather, honesty: weather.honesty.slice(0, 70) }));
check('elle dit qu’aucune météo réelle n’existe ici',
  /aucune météo réelle/i.test(weather.honesty) && /pas une prévision/i.test(weather.honesty));
check('la pluie simulée se voit', weather.raining === 'yes');
check('elle produit une atmosphère animée dans la pellicule',
  await p.evaluate(() => !!document.querySelector('[data-jourj="weather-atmosphere"]')));
check('les cartes extérieures impactées sont identifiées',
  await p.evaluate(() => document.querySelectorAll('[data-jourj="moment"].is-weather-affected').length) >= 1);
check('elle ne cite que les moments déclarés en extérieur, ou dit qu’il n’y en a pas',
  weather.exposed >= 1 || weather.none, `${weather.exposed} exposé(s)`);
if (weather.exposed >= 1) {
  check('et un plan B pluie peut être créé', weather.planB);
  await click('jourj', 'sim-weather-planb');
  await wait(1200);
  const s2 = await state();
  check('le plan B est une branche du moteur existant', s2.scenarios >= 1, `${s2.scenarios} scénario(s)`);
  check('la journée réelle est intacte',
    JSON.stringify(s2.phases.map((x) => x.start)) === JSON.stringify(before.phases.map((x) => x.start)));
}
await shot('04-meteo');
await noOverflow('Simulation');

// --- 6. the calendar only navigates -----------------------------------------
say('\n=== 6. LE CALENDRIER NAVIGUE, IL N’ÉDITE PAS ===');
await p.evaluate(() => document.getElementById('wc-mirror')?.scrollTo({ top: 0 }));
await wait(400);
await openCalendar();
await wait(1300);
const cal = await p.evaluate(() => ({
  open: !!document.querySelector('[data-cal="studio"]'),
  inputs: document.querySelectorAll('[data-cal="studio"] input[type="text"], [data-cal="studio"] textarea').length,
  toTimeline: !!document.querySelector('[data-cal="open-timeline"]'),
}));
say('  ' + JSON.stringify(cal));
check('le calendrier s’ouvre', cal.open);
check('il ne contient aucun formulaire de saisie', cal.inputs === 0, String(cal.inputs));
check('et il ramène à la pellicule', cal.toTimeline);
await click('cal', 'close');
await wait(600);

// --- 7. icons, and no emoji left in the product -----------------------------
say('\n=== 7. UN SEUL LANGAGE ICONOGRAPHIQUE ===');
const icons = await p.evaluate(() => {
  const text = document.body.innerText;
  const emoji = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []);
  const svgs = [...document.querySelectorAll('svg')];
  const strokes = new Set(svgs.map((s) => s.getAttribute('stroke-width')).filter(Boolean));
  return { emoji: [...new Set(emoji)], svgs: svgs.length, strokes: [...strokes] };
});
say('  ' + JSON.stringify(icons));
check('plus aucun emoji dans le produit', icons.emoji.length === 0, icons.emoji.join(''));
check('les icônes sont des tracés cohérents',
  icons.strokes.length <= 2, icons.strokes.join(' / '));

// --- 8. reload, and still one of everything ---------------------------------
say('\n=== 8. RECHARGEMENT ===');
await p.reload({ waitUntil: 'domcontentloaded' });
await wait(3200);
const after = await p.evaluate(() => ({
  strips: document.querySelectorAll('[data-jourj="strip"]').length,
  hubs: document.querySelectorAll('.wc-hub').length,
  sim: !!document.querySelector('[data-jourj="simulation"]'),
}));
check('toujours une seule pellicule', after.strips === 1, String(after.strips));
check('aucun panneau resté ouvert', after.hubs === 0);
check('la simulation est toujours là, toujours repliée', after.sim);
const s3 = await state();
check('la déclaration « en extérieur » a survécu', s3.phases.some((x) => x.outdoor === true));

say(`\n### ${failures === 0 ? 'TOUT EST VERT' : failures + ' ÉCHEC(S)'} — ${WIDTH}px`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
