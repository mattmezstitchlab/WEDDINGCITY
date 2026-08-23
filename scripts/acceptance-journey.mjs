#!/usr/bin/env node
/**
 * ACCEPTANCE — full product journey, driven in a real Chromium.
 *
 * LANDING → creation modal → project A → World → Canvas → Mirror
 *         → project B → project switching → reloads → landing again.
 *
 * METHOD RULE (learned the hard way): never `import()` the store inside the
 * page. That instantiates a SECOND module instance whose boot rewrites the
 * project being tested. Everything observed here comes from the DOM and from
 * localStorage, which is what the running application actually wrote.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/journey';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/journey-profile';
rmSync(PROFILE, { recursive: true, force: true });

const log = [];
let failures = 0;
const say = (...a) => { const l = a.join(' '); console.log(l); log.push(l); };
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  say(`  ${ok ? 'OK  ' : 'ÉCHEC'} · ${label}${detail ? ' — ' + detail : ''}`);
  return ok;
};

const WIDTH = Number(process.argv[2] || 1440);

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
  if (s.includes('Failed to fetch')) return; // known blocked telemetry
  say('  [erreur page]', s.slice(0, 160));
});

const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}.png`, fullPage: false }); };

const clickText = (t, sel = 'button') => p.evaluate((t, sel) => {
  const el = [...document.querySelectorAll(sel)]
    .find((b) => (b.textContent || '').replace(/\s+/g, ' ').includes(t));
  if (!el) return false;
  el.scrollIntoView({ block: 'center' });
  el.click();
  return true;
}, t, sel);

const typeInto = (matcher, v) => p.evaluate((matcher, v) => {
  const inputs = [...document.querySelectorAll('input')];
  const i = inputs.find((x) => (x.placeholder || '').includes(matcher) || x.type === matcher);
  if (!i) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(i, v);
  i.dispatchEvent(new Event('input', { bubbles: true }));
  i.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, matcher, v);

/** Everything the application really persisted, plus what the DOM really shows. */
const snap = () => p.evaluate(() => {
  const activeId = localStorage.getItem('wedding_city_active_project_id_v1');
  const projects = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]');
  const readProject = (id) => {
    const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || 'null');
    const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
    const raw = localStorage.getItem('wedding_city_state_' + id) || '';
    return {
      id,
      persisted: !!st,
      counts: {
        persons: L('persons').length, guests: L('guests').length, places: L('places').length,
        phases: L('phases').length, tracks: L('tracks').length, media: L('media').length,
        vendors: L('vendors').length, agents: L('agents').length, tables: L('tables').length,
      },
      names: L('persons').map((x) => x.displayName || x.name || '').filter(Boolean),
      trackTitles: L('tracks').map((x) => x.title || ''),
      hasEditorial: /\/editorial\//.test(raw),
      hasClara: /Clara|Alexandre|Bellevue/.test(raw),
    };
  };
  const body = (document.body.innerText || '').replace(/\s+/g, ' ');
  return {
    activeId,
    projects: projects.map((x) => ({ id: x.id, couple: x.coupleNames, isDemo: !!x.isDemo, loc: x.locationName, date: x.weddingDate })),
    active: activeId ? readProject(activeId) : null,
    all: projects.map((x) => readProject(x.id)),
    dom: {
      landing: !!document.querySelector('.wc-landing-cta'),
      mirror: !!document.getElementById('wc-mirror'),
      modal: !!document.querySelector('[role="dialog"][aria-label="Créer mon mariage"]'),
      capsule: !!document.querySelector('[aria-label="Projection"]'),
      // Two shells, one mode: the World side panel says "Canvas · Composition",
      // the Mirror overlay says "Édition · le site devient composable".
      canvas: /Canvas · Composition/i.test(body) || /le site devient composable/i.test(body),
      // The page itself is always overflow:hidden (fixed surfaces), so only the
      // INLINE style the modal writes tells whether it locked the background.
      bodyOverflow: document.body.style.overflow,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      text: body.slice(0, 4000),
    },
    editorialInAnyState: Object.keys(localStorage)
      .filter((k) => k.startsWith('wedding_city_state_'))
      .some((k) => /\/editorial\//.test(localStorage.getItem(k) || '')),
  };
});

// innerText applies text-transform, so uppercase labels must be matched
// case-insensitively — "Mes mariages" renders as "MES MARIAGES".
const seesInDom = async (s) => p.evaluate(
  (s) => (document.body.innerText || '').toLowerCase().includes(s.toLowerCase()), s);

/** scrollWidth === viewport, everywhere, at every width. */
const noOverflow = async (label) => {
  const m = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth, vw: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 3)
      .map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 30)}@${Math.round(el.getBoundingClientRect().right)}`),
  }));
  return check(`${label} · aucun débordement horizontal`, m.sw === m.vw,
    `${m.sw}/${m.vw}${m.offenders.length ? ' — ' + m.offenders.join(' | ') : ''}`);
};

// ═══════════════════════════════════════════════════════════════════════════
say(`### PARCOURS D'ACCEPTATION — ${WIDTH}px — profil Chromium vierge`);

// --- 1. LANDING -------------------------------------------------------------
say('\n=== 1. LANDING PUBLIQUE (stockage vierge) ===');
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 60000 });
await wait(2500);
let s = await snap();
check('la landing est affichée', s.dom.landing);
check('aucun projet actif enregistré', !s.activeId, `activeId=${s.activeId}`);
check('aucune donnée de démo présentée comme mariage actif',
  !s.dom.text.includes('Clara & Alexandre') || /démonstration/.test(s.dom.text));
check('la capsule WORLD/MIRROR/CANVAS est absente', !s.dom.capsule);

const landing = await p.evaluate(() => {
  const t = document.body.innerText;
  const nav = document.querySelector('nav[aria-label="Navigation du site"]');
  const navTop = nav ? nav.getBoundingClientRect().top : null;
  const imgs = [...document.querySelectorAll('img')].map((i) => ({
    src: i.getAttribute('src'), nw: i.naturalWidth, nh: i.naturalHeight,
    w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height),
    fit: getComputedStyle(i).objectFit, loading: i.loading,
  }));
  return {
    navTop,
    hasHero: !!document.getElementById('landing-hero'),
    has01: t.includes('01'), has02: t.includes('02'), has03: t.includes('03'),
    hasImmersive: !!document.querySelector('[aria-label="Un jour, des milliers de relations"]'),
    hasMesMariages: t.toLowerCase().includes('mes mariages'),
    ctaCount: [...document.querySelectorAll('button')].filter((b) => b.textContent.includes('Créer mon mariage')).length,
    imgs,
  };
});
check('navigation tout en haut', landing.navTop !== null && landing.navTop <= 1, `top=${landing.navTop}`);
check('hero présent', landing.hasHero);
check('sections 01/02/03', landing.has01 && landing.has02 && landing.has03);
check('bande immersive', landing.hasImmersive);
check('zone « Mes mariages »', landing.hasMesMariages);
check('CTA présents', landing.ctaCount >= 2, `${landing.ctaCount} CTA`);
const loaded = landing.imgs.filter((i) => i.nw > 0);
check('images réellement chargées', loaded.length === landing.imgs.length,
  `${loaded.length}/${landing.imgs.length}`);
check('images non déformées (object-fit: cover)',
  landing.imgs.every((i) => i.fit === 'cover'), landing.imgs.map((i) => i.fit).join(','));
await noOverflow('Landing');
await shot(`01-landing-${WIDTH}`);

// --- 2. CREATION MODAL ------------------------------------------------------
say('\n=== 2. MODALE DE CRÉATION ÉDITORIALE ===');
const projectsBefore = s.projects.length;
await clickText('Créer mon mariage');
await wait(1000);
s = await snap();
check('modale éditoriale ouverte (pas le panneau spatial du World)', s.dom.modal);
check('scroll de fond bloqué', s.dom.bodyOverflow === 'hidden');
check('la landing est toujours en dessous (aucune bascule World)', s.dom.mirror);
await shot(`02-modale-etape1-${WIDTH}`);

const focusInside = await p.evaluate(() =>
  !!document.querySelector('[role="dialog"]')?.contains(document.activeElement));
check('le focus est dans la modale à l’ouverture', focusInside);

// Escape → no phantom creation
await p.keyboard.press('Escape');
await wait(600);
s = await snap();
check('Échap ferme la modale', !s.dom.modal);
check('scroll de fond rendu', s.dom.bodyOverflow !== 'hidden');
check('aucune création fantôme après Échap',
  s.projects.length === projectsBefore && !s.activeId,
  `projets=${s.projects.length} actif=${s.activeId}`);

// Reopen + step validation
await clickText('Créer mon mariage');
await wait(800);
const blocked = await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Continuer'));
  return !!b && b.disabled;
});
check('étape 01 : « Continuer » désactivé sans les deux prénoms', blocked);

await typeInto('Clara', 'ALPHA-ACCEPTATION');
await typeInto('Alexandre', 'BETA-ACCEPTATION');
await wait(300);
await clickText('Continuer');
await wait(600);
s = await snap();
check('après l’étape 01, rien n’est créé', !s.activeId);
check('étape 02 affichée (champ date)', await p.evaluate(() => !!document.querySelector('input[type="date"]')));

await typeInto('date', '2027-06-19');
await wait(300);
await clickText('Continuer');
await wait(600);
check('étape 03 affichée (champ lieu)',
  await p.evaluate(() => !!document.querySelector('input[placeholder*="Domaine"]')));
// back / forward really work
await clickText('Retour');
await wait(500);
check('« Retour » ramène à l’étape 02',
  await p.evaluate(() => !!document.querySelector('input[type="date"]')));
check('la date saisie est conservée',
  await p.evaluate(() => document.querySelector('input[type="date"]')?.value === '2027-06-19'));
await clickText('Continuer');
await wait(500);
await typeInto('Domaine', 'DOMAINE ALPHA');
await wait(300);
s = await snap();
check('avant le bouton final, toujours aucune création', !s.activeId);
await shot(`03-modale-etape3-${WIDTH}`);
await clickText('Générer notre monde');
await wait(3500);

// --- 2b. PROJECT A INITIAL STATE -------------------------------------------
say('\n=== 2b. ÉTAT INITIAL DU PROJET A ===');
s = await snap();
const A_ID = s.activeId;
say(`  projet A = ${A_ID}`);
check('un projet actif existe', !!A_ID);
const projA0 = s.projects.find((x) => x.id === A_ID);
check('couple enregistré', projA0?.couple === 'ALPHA-ACCEPTATION & BETA-ACCEPTATION', projA0?.couple);
check('date enregistrée', String(projA0?.date || '').includes('2027-06-19'), String(projA0?.date));
check('lieu enregistré', projA0?.loc === 'DOMAINE ALPHA', projA0?.loc);
check('la modale s’est fermée', !s.dom.modal);
say('  compteurs A : ' + JSON.stringify(s.active?.counts));
check('A · 2 personnes', s.active?.counts.persons === 2, String(s.active?.counts.persons));
check('A · 0 moment', s.active?.counts.phases === 0, String(s.active?.counts.phases));
check('A · 0 morceau', s.active?.counts.tracks === 0, String(s.active?.counts.tracks));
check('A · 0 média', s.active?.counts.media === 0, String(s.active?.counts.media));
check('A · aucune donnée Clara/Alexandre/Bellevue', !s.active?.hasClara);
check('A · aucun asset éditorial attaché', !s.active?.hasEditorial);
check('aucun /editorial/ dans aucun état persisté', !s.editorialInAnyState);

// --- 3. WORLD OF A ----------------------------------------------------------
say('\n=== 3. WORLD DU PROJET A ===');
await wait(2500);
s = await snap();
check('la capsule apparaît maintenant qu’un projet est ouvert', s.dom.capsule);
check('le World affiche les mariés de A', await seesInDom('ALPHA-ACCEPTATION'));
check('le World n’affiche pas Clara & Alexandre', !(await seesInDom('Clara')));
check('le World n’affiche pas le décor nommé de la démo',
  !(await seesInDom('Bellevue')) && !(await seesInDom('Gare TGV')) && !(await seesInDom('Manoir')));
await noOverflow('World A');
// HUD geometry: nothing in the top chrome may sit on top of anything else.
const hud = await p.evaluate(() => {
  // The projection capsule is fixed at the top centre of the World; the HUD
  // pills live in the same band. Compare the capsule with every interactive
  // pill that is NOT one of its own children.
  const capsule = document.querySelector('[role="tablist"][aria-label="Projection"]');
  if (!capsule) return { overlaps: ['capsule absente'] };
  const c = capsule.getBoundingClientRect();
  const overlaps = [];
  for (const el of document.querySelectorAll('button, [title]')) {
    if (capsule.contains(el) || el.contains(capsule)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 12 || r.top > 160) continue;
    const ox = Math.min(c.right, r.right) - Math.max(c.left, r.left);
    const oy = Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top);
    if (ox > 2 && oy > 2) {
      overlaps.push(`${(el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 24)} [${Math.round(ox)}×${Math.round(oy)}px]`);
    }
  }
  return { capsule: [Math.round(c.left), Math.round(c.top), Math.round(c.right), Math.round(c.bottom)], overlaps: overlaps.slice(0, 8) };
});
check('HUD du World : la capsule ne recouvre aucun contrôle',
  hud.overlaps.length === 0, hud.overlaps.join(' || '));
await shot(`04-world-A-${WIDTH}`);

// --- 4. CANVAS OF A ---------------------------------------------------------
say('\n=== 4. CANVAS DU PROJET A ===');
await p.keyboard.press('KeyK');
await wait(1500);
check('le Canvas est ouvert', (await snap()).dom.canvas);
await clickText('Personnes');
await wait(800);
await clickText('+ Ajouter une personne');
await wait(500);
await typeInto('Prénom Nom', 'ZORGLUB ACCEPTATION');
await wait(300);
await clickText('Créer');
await wait(1200);
s = await snap();
check('A contient 3 personnes après création', s.active?.counts.persons === 3, String(s.active?.counts.persons));
check('ZORGLUB ACCEPTATION persisté dans A',
  (s.active?.names || []).some((n) => n.includes('ZORGLUB')), (s.active?.names || []).join(' / '));

await clickText('Musique');
await wait(800);
await clickText('+ Ajouter un morceau');
await wait(1200);
// rename the track inline to a name we can trace
const renamed = await p.evaluate(() => {
  const el = [...document.querySelectorAll('*')]
    .find((n) => n.children.length === 0 && n.textContent.trim() === 'Nouveau morceau');
  if (!el) return false;
  el.click();
  return true;
});
await wait(500);
if (renamed) {
  await p.evaluate(() => {
    const i = document.activeElement;
    if (!(i instanceof HTMLInputElement)) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(i, 'ACCEPTATION TRACK');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await p.keyboard.press('Enter');
  await wait(1000);
}
s = await snap();
check('A contient 1 morceau', s.active?.counts.tracks === 1, String(s.active?.counts.tracks));
await noOverflow('Canvas A');
check('le morceau porte le titre saisi',
  (s.active?.trackTitles || []).some((t) => t.includes('ACCEPTATION TRACK')),
  (s.active?.trackTitles || []).join(' / '));
await shot(`05-canvas-A-${WIDTH}`);

// --- 5. MIRROR OF A ---------------------------------------------------------
say('\n=== 5. MIRROR DU PROJET A ===');
// The World shell closes with ✕, the Mirror overlay with « Terminer ».
await p.evaluate(() => {
  const x = document.querySelector('button[aria-label="Fermer"]');
  if (x) { x.click(); return; }
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Terminer'))?.click();
});
await wait(900);
check('le Canvas est refermé', !(await snap()).dom.canvas);
await p.keyboard.down('Shift'); await p.keyboard.press('KeyM'); await p.keyboard.up('Shift');
await wait(2000);
s = await snap();
check('le Mirror est affiché', s.dom.mirror && !s.dom.landing && !s.dom.canvas);
check('le Mirror affiche le couple A', await seesInDom('ALPHA-ACCEPTATION'));
check('le Mirror affiche ZORGLUB ACCEPTATION', await seesInDom('ZORGLUB'));
check('le Mirror affiche le morceau créé', await seesInDom('ACCEPTATION TRACK'));
check('le Mirror n’affiche aucune donnée de la démo',
  !(await seesInDom('Clara')) && !(await seesInDom('Bellevue')));
check('la capsule est présente dans le Mirror', s.dom.capsule);
await noOverflow('Mirror A');
await shot(`06-mirror-A-${WIDTH}`);

// --- 6. PROJECT B -----------------------------------------------------------
say('\n=== 6. CRÉATION DU PROJET B ===');
// Real entry point: the Mirror footer leads back to the public site, and the
// site is where a wedding is created. No storage is touched by hand.
let opened = null;
const backToSite = await clickText('Mes mariages');
await wait(1800);
if ((await snap()).dom.landing) {
  opened = 'Mirror → Mes mariages → landing';
  check('« Mes mariages » ramène à la landing depuis un projet ouvert', true);
  check('revenir au site ne supprime aucun projet',
    (await snap()).projects.length >= 2, String((await snap()).projects.length));
  await clickText('Créer mon mariage');
  await wait(1200);
} else {
  check('« Mes mariages » ramène à la landing depuis un projet ouvert', false,
    `bouton trouvé=${backToSite}`);
}
say('  entrée de création utilisée : ' + (opened || 'menu World'));
s = await snap();
check('la modale de création est ouverte pour B', s.dom.modal || await p.evaluate(() => !!document.querySelector('[role="dialog"]')));
await shot(`07-modale-B-${WIDTH}`);
await typeInto('Clara', 'GAMMA-ACCEPTATION');
await typeInto('Alexandre', 'DELTA-ACCEPTATION');
await wait(300);
await clickText('Continuer'); await wait(600);
await typeInto('date', '2028-09-02'); await wait(300);
await clickText('Continuer'); await wait(600);
await typeInto('Domaine', 'DOMAINE BETA'); await wait(300);
await clickText('Générer notre monde');
await wait(3500);
s = await snap();
const B_ID = s.activeId;
say(`  projet B = ${B_ID}`);
check('B est un projet distinct de A', B_ID && B_ID !== A_ID, `${A_ID} vs ${B_ID}`);
const readOf = (id) => s.all.find((x) => x.id === id);
const a = readOf(A_ID); const b = readOf(B_ID);
say('  A : ' + JSON.stringify(a?.counts));
say('  B : ' + JSON.stringify(b?.counts));
check('A conserve 3 personnes', a?.counts.persons === 3, String(a?.counts.persons));
check('A conserve 1 morceau', a?.counts.tracks === 1, String(a?.counts.tracks));
check('B a 2 personnes', b?.counts.persons === 2, String(b?.counts.persons));
check('B a 0 morceau', b?.counts.tracks === 0, String(b?.counts.tracks));
check('B ne contient pas ZORGLUB', !(b?.names || []).some((n) => n.includes('ZORGLUB')));
check('B ne contient pas ACCEPTATION TRACK', !(b?.trackTitles || []).some((t) => t.includes('ACCEPTATION')));
check('B ne contient aucune donnée de la démo', !b?.hasClara);
check('B sans asset éditorial', !b?.hasEditorial);

// --- 7. PROJECT SWITCHING ---------------------------------------------------
say('\n=== 7. SÉLECTEUR DE PROJETS : A → B → A → Démo → B → A ===');
const DEMO_ID = 'proj_demo_clara_alexandre';
const openProject = async (id, label) => {
  // Real UI path: the World brand menu project list.
  const inMirror = await p.evaluate(() => !!document.getElementById('wc-mirror'));
  if (inMirror) {
    await p.evaluate(() => {
      const btn = [...document.querySelectorAll('[aria-label="Projection"] button')]
        .find((x) => /World/i.test(x.textContent || ''));
      btn?.click();
    });
    await wait(1500);
  }
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.title === 'Ouvrir le menu principal Wedding City');
    el?.click();
  });
  await wait(800);
  const clicked = await p.evaluate((label) => {
    const btn = [...document.querySelectorAll('button')]
      .find((x) => (x.textContent || '').includes(label) && /[◇◆]/.test(x.textContent));
    if (!btn) return false;
    btn.click(); return true;
  }, label);
  await wait(2200);
  return clicked;
};

const expectActive = async (id, label, mustSee, mustNotSee) => {
  const cur = await snap();
  check(`${label} : projet actif correct`, cur.activeId === id, `${cur.activeId}`);
  for (const t of mustSee) check(`${label} : le World montre « ${t} »`, await seesInDom(t));
  for (const t of mustNotSee) check(`${label} : le World ne montre pas « ${t} »`, !(await seesInDom(t)));
  const leak = await p.evaluate(() => {
    const t = document.body.innerText;
    return { zorglub: t.includes('ZORGLUB'), track: t.includes('ACCEPTATION TRACK') };
  });
  return { cur, leak };
};

for (const [id, label, see, notSee] of [
  [A_ID, 'ALPHA-ACCEPTATION', ['ALPHA-ACCEPTATION'], ['GAMMA-ACCEPTATION', 'Clara']],
  [B_ID, 'GAMMA-ACCEPTATION', ['GAMMA-ACCEPTATION'], ['ALPHA-ACCEPTATION', 'Clara']],
  [A_ID, 'ALPHA-ACCEPTATION', ['ALPHA-ACCEPTATION'], ['GAMMA-ACCEPTATION']],
  [DEMO_ID, 'Clara', ['Clara'], ['ALPHA-ACCEPTATION', 'GAMMA-ACCEPTATION']],
  [B_ID, 'GAMMA-ACCEPTATION', ['GAMMA-ACCEPTATION'], ['Clara', 'ALPHA-ACCEPTATION']],
  [A_ID, 'ALPHA-ACCEPTATION', ['ALPHA-ACCEPTATION'], ['Clara', 'GAMMA-ACCEPTATION']],
]) {
  const ok = await openProject(id, label);
  say(`  → bascule vers ${label} (${ok ? 'via la liste du menu' : 'BOUTON INTROUVABLE'})`);
  await expectActive(id, label, see, notSee);
}
await shot(`08-switch-final-${WIDTH}`);

// --- 8. RELOADS -------------------------------------------------------------
say('\n=== 8. RELOADS RÉELS ===');
const reloadAndCheck = async (id, label, see, notSee) => {
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(3000);
  const cur = await snap();
  check(`${label} : après reload, projet actif correct`, cur.activeId === id, String(cur.activeId));
  check(`${label} : après reload, aucune landing parasite`, !cur.dom.landing);
  for (const t of see) check(`${label} : après reload, « ${t} » visible`, await seesInDom(t));
  for (const t of notSee) check(`${label} : après reload, « ${t} » absent`, !(await seesInDom(t)));
  return cur;
};
let cur = await reloadAndCheck(A_ID, 'A', ['ALPHA-ACCEPTATION'], ['Clara', 'GAMMA-ACCEPTATION']);
let ra = cur.all.find((x) => x.id === A_ID);
check('A après reload : 3 personnes', ra?.counts.persons === 3, String(ra?.counts.persons));
check('A après reload : 1 morceau', ra?.counts.tracks === 1, String(ra?.counts.tracks));

await openProject(B_ID, 'GAMMA-ACCEPTATION');
cur = await reloadAndCheck(B_ID, 'B', ['GAMMA-ACCEPTATION'], ['ALPHA-ACCEPTATION', 'Clara']);
let rb = cur.all.find((x) => x.id === B_ID);
check('B après reload : 2 personnes', rb?.counts.persons === 2, String(rb?.counts.persons));
check('B après reload : 0 morceau', rb?.counts.tracks === 0, String(rb?.counts.tracks));

await openProject(DEMO_ID, 'Clara');
cur = await reloadAndCheck(DEMO_ID, 'Démo', ['Clara'], ['ALPHA-ACCEPTATION', 'GAMMA-ACCEPTATION', 'ZORGLUB']);
let rd = cur.all.find((x) => x.id === DEMO_ID);
say('  démo : ' + JSON.stringify(rd?.counts));
check('la démo ne contient pas ZORGLUB', !(rd?.names || []).some((n) => n.includes('ZORGLUB')));
check('la démo ne contient pas ACCEPTATION TRACK', !(rd?.trackTitles || []).some((t) => t.includes('ACCEPTATION')));

await openProject(A_ID, 'ALPHA-ACCEPTATION');
cur = await reloadAndCheck(A_ID, 'A (2e)', ['ALPHA-ACCEPTATION'], ['Clara']);
ra = cur.all.find((x) => x.id === A_ID);
check('A toujours 3 personnes / 1 morceau',
  ra?.counts.persons === 3 && ra?.counts.tracks === 1,
  `${ra?.counts.persons}p ${ra?.counts.tracks}t`);

// --- 9. BACK TO THE LANDING -------------------------------------------------
say('\n=== 9. RETOUR À LA LANDING / MES MARIAGES ===');

/** Real UI path out of an open wedding: Mirror footer → « Mes mariages ». */
const goToLanding = async () => {
  const inMirror = await p.evaluate(() => !!document.getElementById('wc-mirror'));
  if (!inMirror) {
    await p.keyboard.down('Shift'); await p.keyboard.press('KeyM'); await p.keyboard.up('Shift');
    await wait(1800);
  }
  const clicked = await clickText('Mes mariages');
  await wait(1800);
  return clicked;
};

check('une sortie vers le site existe depuis un projet ouvert', await goToLanding());
s = await snap();
check('la landing est revenue', s.dom.landing);
check('aucun projet actif après retour au site', !s.activeId, String(s.activeId));
check('aucun projet n’a été supprimé en revenant au site', s.projects.length === 3,
  `${s.projects.length} projets`);
check('la capsule disparaît à nouveau sur la landing', !s.dom.capsule);

const listed = await p.evaluate(() =>
  [...document.querySelectorAll('li button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
say('  Mes mariages : ' + JSON.stringify(listed));
check('A est listé', listed.some((x) => x.includes('ALPHA-ACCEPTATION')));
check('B est listé', listed.some((x) => x.includes('GAMMA-ACCEPTATION')));
check('la démo est listée comme démonstration', listed.some((x) => /démonstration/.test(x)));
await shot(`09-landing-mes-mariages-${WIDTH}`);

// A reload while on the landing must NOT silently adopt a project.
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(2500);
s = await snap();
check('après reload sur la landing, toujours la landing', s.dom.landing);
check('après reload sur la landing, aucun projet actif', !s.activeId, String(s.activeId));

const openFromLanding = async (label, id, see, notSee) => {
  await p.evaluate((label) => {
    const b = [...document.querySelectorAll('li button')].find((x) => x.textContent.includes(label));
    b?.click();
  }, label);
  await wait(2800);
  const cur = await snap();
  check(`« ${label} » depuis la landing ouvre le bon projet`, cur.activeId === id, String(cur.activeId));
  check(`« ${label} » : la landing a disparu`, !cur.dom.landing);
  for (const t of see) check(`« ${label} » : « ${t} » visible`, await seesInDom(t));
  for (const t of notSee) check(`« ${label} » : « ${t} » absent`, !(await seesInDom(t)));
  return cur;
};
await openFromLanding('ALPHA-ACCEPTATION', A_ID, ['ALPHA-ACCEPTATION'], ['GAMMA-ACCEPTATION', 'Clara']);
await goToLanding();
await openFromLanding('GAMMA-ACCEPTATION', B_ID, ['GAMMA-ACCEPTATION'], ['ALPHA-ACCEPTATION', 'Clara']);
await goToLanding();
await openFromLanding('Clara', DEMO_ID, ['Clara'], ['ALPHA-ACCEPTATION', 'GAMMA-ACCEPTATION']);

// --- 10. EDITORIAL ASSET ISOLATION -----------------------------------------
say('\n=== 10. ISOLATION DES ASSETS ÉDITORIAUX ===');
s = await snap();
for (const st of s.all) {
  check(`${st.id} · aucun chemin /editorial/`, !st.hasEditorial);
  if (st.id !== DEMO_ID) check(`${st.id} · 0 média`, st.counts.media === 0, String(st.counts.media));
}
check('aucun état persisté ne contient /editorial/', !s.editorialInAnyState);

say(`\n### RÉSULTAT ${WIDTH}px : ${failures} échec(s)`);
writeFileSync(`${OUT}/journey-${WIDTH}.log`, log.join('\n'));
await browser.close();
process.exit(failures > 0 ? 1 : 0);
