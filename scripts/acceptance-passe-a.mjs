#!/usr/bin/env node
/**
 * ACCEPTANCE — Passe A : convergence structurelle.
 *
 * Parcours réel Chromium :
 *   Hero → Intake existant → Timeline → MomentHub → fiche transverse → retour
 *   au même MomentHub, avec cinq onglets de fiches et aucun accès World.
 *
 * Cette acceptation ne teste volontairement ni le futur rapport métier, ni la
 * simulation, ni le cadrage intelligent après génération. Elle verrouille la
 * responsabilité des surfaces de cette passe uniquement.
 */
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/passe-a';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/passe-a-profile';
rmSync(PROFILE, { recursive: true, force: true });
const WIDTH = Number(process.argv[2] || 1440);
let failures = 0;
const say = (...a) => console.log(a.join(' '));
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  say(`  ${ok ? 'OK  ' : 'ÉCHEC'} · ${label}${detail ? ` — ${detail}` : ''}`);
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
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: WIDTH < 500 ? 844 : 900 });
page.on('pageerror', (error) => {
  if (!String(error).includes('Failed to fetch')) say('  [erreur page]', String(error).slice(0, 220));
});

const wait = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));
const click = (selector) => page.evaluate((selector) => {
  const element = document.querySelector(selector);
  if (!element) return false;
  element.click();
  return true;
}, selector);
const setField = async (selector, value) => {
  const found = await page.$eval(selector, (element, value) => {
    element.focus();
    const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
    return true;
  }, value).catch(() => false);
  await wait(350);
  return found;
};
const text = () => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
const state = () => page.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const project = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]').find((p) => p.id === id);
  const snapshot = JSON.parse(localStorage.getItem(`wedding_city_state_${id}`) || 'null');
  return {
    id,
    project: project ? { name: project.coupleNames, date: project.weddingDate, place: project.locationName } : null,
    phases: Array.isArray(snapshot?.phases) ? snapshot.phases.map((p) => ({ id: p.id, name: p.name, start: p.startHour })) : [],
    persons: Array.isArray(snapshot?.persons) ? snapshot.persons.map((p) => p.displayName) : [],
    places: Array.isArray(snapshot?.places) ? snapshot.places.map((p) => p.name) : [],
  };
});

try {
  say(`### PASSE A — ${WIDTH}px`);
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(2600);

  say('\n=== 1. HERO → TIMELINE ===');
  check('le champ Hero est présent', await page.$('[data-landing="brief"]') !== null);
  await setField('[data-landing="brief"]', 'Nous nous marions le 18 juillet 2027 au Château de Vaux. Cérémonie à 14h, cocktail à 17h, dîner à 20h.');
  check('le Hero ouvre le parcours Intake', await click('[data-landing="hero-create"]'));
  await wait(2400);
  check('le rapport Intake est la surface de revue', await page.$('[data-intake="review"]') !== null);
  await setField('[data-intake="intake-couple"]', 'NINA & OSCAR');
  check('la génération est validée depuis le rapport', await click('[data-intake="generate"]'));
  await wait(2800);
  const created = await state();
  check('le projet réel est créé', Boolean(created.id));
  check('la Timeline contient les moments du projet', created.phases.length === 3, String(created.phases.length));
  check('le projet ne passe pas par Composer pour arriver au Jour J', await page.$('#jour-j') !== null);
  const firstFrame = await page.evaluate(() => {
    const strip = document.querySelector('[data-jourj="strip"]');
    const card = document.querySelector('[data-jourj="moment"]');
    if (!strip || !card) return null;
    const sr = strip.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    return { scrollLeft: strip.scrollLeft, visible: cr.right > sr.left && cr.left < sr.right };
  });
  check('la première arrivée cadre le premier moment réel', Boolean(firstFrame?.visible), JSON.stringify(firstFrame));

  say('\n=== 2. LA TIMELINE OUVRE LE MOMENT ===');
  check('une seule pellicule de pilotage est montée', await page.$$('[data-jourj="strip"]').then((x) => x.length === 1));
  check('un moment s’ouvre depuis la pellicule', await click('#jour-j [data-jourj="open-moment"]'));
  await wait(700);
  check('le MomentHub apparaît dans le même produit', await page.$('[data-jourj="hub"]') !== null);
  check('le Hub est contextuel au moment ouvert', /Cérémonie/.test(await page.$eval('[data-jourj="hub"]', (e) => e.getAttribute('aria-label') || '')));
  check('les sections du Hub sont résumées et fermées', await page.evaluate(() => {
    const sections = [...document.querySelectorAll('[data-jourj="hub-section"]')];
    return sections.length === 7 && sections.every((s) => s.getAttribute('data-open') === 'no');
  }));

  // The relation is created from the Hub, then its transverse fiche is opened.
  await click('[data-jourj="hub-section-who"]');
  await wait(200);
  check('une personne peut être ajoutée au moment depuis le Hub', await setField('[data-jourj="hub-person-new"]', 'PHOTOGRAPHE TEST'));
  check('la relation personne → moment est créée par le Hub', await click('[data-jourj="hub-person-new-submit"]'));
  await wait(700);
  check('la personne apparaît dans la relation du moment', await page.$('[data-jourj="hub-person-chip"]') !== null);
  check('la fiche transverse est proposée depuis la relation', await click('[data-jourj="hub-person-chip"]'));
  await wait(250);
  check('le détail de relation s’ouvre dans le Hub', await page.$('[data-jourj="hub-person-links"]') !== null);
  check('la fiche transverse s’ouvre depuis ce contexte', await click('[data-jourj="hub-person-open"]'));
  await wait(800);

  say('\n=== 3. MOMENT → FICHE → RETOUR ===');
  const transverse = await page.evaluate(() => {
    const canvas = document.querySelector('#wc-mirror-canvas');
    const rect = canvas?.getBoundingClientRect();
    return {
      open: Boolean(canvas),
      title: canvas?.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim() || '',
      tabs: [...canvas?.querySelectorAll('nav button') || []].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
      drawer: rect ? { left: Math.round(rect.left), width: Math.round(rect.width) } : null,
      returnContext: Boolean(canvas?.querySelector('[data-canvas="return-context"]')),
      worldButtons: [...canvas?.querySelectorAll('button') || []].filter((b) => /Monde|Explorer/.test(b.textContent || '')).length,
      programmeTab: [...canvas?.querySelectorAll('nav button') || []].some((b) => /Ordre du jour|Programme/.test(b.textContent || '')),
    };
  });
  say('  ' + JSON.stringify(transverse));
  check('la fiche transverse s’ouvre dans la coquille latérale', transverse.open
    && transverse.drawer?.width <= 720
    && (WIDTH < 720 ? transverse.drawer?.left === 0 : transverse.drawer?.left > 0));
  check('elle affiche la fiche Personnes, pas un Ordre du jour', /Personnes/.test(transverse.title) && !transverse.programmeTab);
  check('Composer ne contient plus que cinq fiches transverses', transverse.tabs.length === 5, transverse.tabs.join(' | '));
  check('le contexte du moment est conservé', transverse.returnContext);
  check('aucun accès World n’est visible dans la fiche', transverse.worldButtons === 0);
  check('le bouton de retour est explicite', await page.$('[data-canvas="close"]') !== null && /Retour au moment/.test(await page.$eval('[data-canvas="close"]', (e) => e.textContent || '')));
  check('la fiche revient au même MomentHub', await click('[data-canvas="close"]'));
  await wait(900);
  check('le MomentHub est rouvert après le retour', await page.$('[data-jourj="hub"]') !== null);
  check('le retour conserve le même moment', /Cérémonie/.test(await page.$eval('[data-jourj="hub"]', (e) => e.getAttribute('aria-label') || '')));

  say('\n=== 4. LE MOMENT RESTE L’UNIQUE ÉDITEUR ===');
  await click('[data-jourj="hub-section-when"]');
  await wait(200);
  check('le titre est modifiable dans le MomentHub', await page.$('[data-jourj="hub-title"]') !== null);
  await setField('[data-jourj="hub-title"]', 'Cérémonie civile');
  const edited = await state();
  check('la modification est écrite dans le moment réel', edited.phases.some((p) => p.name === 'Cérémonie civile'));
  await click('[data-jourj="hub-close"]');
  await wait(600);
  check('la Timeline relit le titre modifié', /Cérémonie civile/.test(await text()));

  say('\n=== 5. NAVIGATION ET WORLD ===');
  const navigation = await page.evaluate(() => ({
    topButtons: [...document.querySelector('nav[aria-label="Navigation"]')?.querySelectorAll('button') || []].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
    hasCalendarTop: Boolean(document.querySelector('[data-jourj="nav-calendar"]')),
    visibleWorld: [...document.querySelectorAll('#wc-mirror button, #wc-mirror a, #wc-mirror-canvas button, #wc-mirror-canvas a')]
      .filter((b) => /Monde|World|Explorer dans/.test(b.textContent || '')).map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
    strips: document.querySelectorAll('[data-jourj="strip"]').length,
  }));
  say('  ' + JSON.stringify(navigation));
  check('la navigation principale est réduite aux actions', navigation.topButtons.length <= 3, navigation.topButtons.join(' | '));
  check('les fiches s’ouvrent depuis la Timeline plutôt que la navigation globale', await page.$('[data-jourj="open-transverse"]') !== null);
  check('le Calendrier n’est plus au même niveau que les lieux', !navigation.hasCalendarTop);
  check('aucune action de l’expérience principale ne mène au World', navigation.visibleWorld.length === 0, navigation.visibleWorld.join(' | '));
  check('il n’existe pas de seconde pellicule', navigation.strips === 1);

  // The calendar remains reachable as a navigation action from EventPanel.
  check('le panneau événement s’ouvre depuis la Timeline', await click('[data-jourj="open-event"]'));
  await wait(350);
  await click('[data-jourj="hub-section-calendar"]');
  await wait(200);
  check('le Calendrier est une action du contexte événement', await click('[data-jourj="event-calendar"]'));
  await wait(650);
  check('le Calendrier s’ouvre sans devenir un éditeur', await page.$('[data-cal="studio"]') !== null && await page.$$('[data-cal="studio"] input[type="text"], [data-cal="studio"] textarea').then((x) => x.length === 0));
  await click('[data-cal="close"]');

  say('\n=== 6. RESPONSABILITÉS RENDUES ===');
  check('Timeline → MomentHub → fiche → retour est le chemin observé',
    transverse.open && transverse.returnContext && transverse.tabs.length === 5);
  check('aucune mention World ne reste dans les contrôles actifs', !/\b(World|Monde)\b/.test(await text()));

  await page.screenshot({ path: `${OUT}/passe-a-${WIDTH}.png` });
  say(`\n### ${failures === 0 ? 'TOUT EST VERT' : `${failures} ÉCHEC(S)`} — ${WIDTH}px`);
} finally {
  await browser.close();
}

process.exit(failures ? 1 : 0);
