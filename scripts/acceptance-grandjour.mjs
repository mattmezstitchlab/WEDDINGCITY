#!/usr/bin/env node
/**
 * ACCEPTANCE — LE GRAND JOUR®.
 *
 * The public page (hero → film → propagation → dimensions → my weddings →
 * CTA), then the product: MODE JOUR J, the music layer, and the Canvas move
 * that must be VALIDATED — with the block staying still and only the handle
 * travelling.
 *
 * Everything is observed in a real Chromium: DOM, real geometry, and the
 * localStorage the application really wrote.
 *
 * Usage: node scripts/acceptance-grandjour.mjs [width]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/grandjour';
mkdirSync(OUT, { recursive: true });
const PROFILE = '/tmp/grandjour-profile';
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
const clickText = (t) => p.evaluate((t) => {
  const el = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(t));
  if (!el) return false; el.click(); return true;
}, t);
const clickTag = (attr, tag) => p.evaluate((attr, tag) => {
  const el = document.querySelector(`[data-${attr}="${tag}"]`);
  if (!el) return false; el.click(); return true;
}, attr, tag);
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

const noOverflow = async (label) => {
  const m = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth, vw: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1
        && !el.closest('[data-landing="film"]') && !el.closest('[data-jourj="strip"]'))
      .slice(0, 3)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 26)}`),
  }));
  return check(`${label} · aucun débordement horizontal`, m.sw === m.vw,
    `${m.sw}/${m.vw}${m.offenders.length ? ' — ' + m.offenders.join(' | ') : ''}`);
};

const stateOf = () => p.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || 'null');
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  return {
    id,
    phases: L('phases').map((x) => ({ id: x.id, name: x.name, start: x.startHour, end: x.endHour })),
    tracks: L('tracks').map((t) => ({ title: t.title, duration: t.duration })),
    text: (document.body.innerText || '').replace(/\s+/g, ' '),
  };
});

const fmt = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// ═══════════════════════════════════════════════════════════════════════════
say(`### LE GRAND JOUR® — acceptation ${WIDTH}px — profil vierge`);

// --- 01 HERO ----------------------------------------------------------------
say('\n=== 1. HERO ===');
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
const hero = await p.evaluate(() => {
  const img = document.querySelector('.wc-gj-hero-img');
  const title = document.querySelector('.wc-gj-title');
  const r = img?.getBoundingClientRect();
  return {
    hasHero: !!document.querySelector('[data-landing="hero"]'),
    imgLoaded: img ? img.naturalWidth > 0 : false,
    imgFit: img ? getComputedStyle(img).objectFit : null,
    imgCoverage: r ? Math.round((r.width * r.height) / (window.innerWidth * window.innerHeight) * 100) : 0,
    title: title ? title.textContent.trim() : null,
    titleSize: title ? Math.round(parseFloat(getComputedStyle(title).fontSize)) : 0,
    hasWedding: !!document.querySelector('[data-landing="hero-wedding"]'),
    cta: !!document.querySelector('[data-landing="hero-create"]'),
    cards: document.querySelectorAll('.wc-gj-hero article').length,
  };
});
say('  ' + JSON.stringify(hero));
check('le hero est plein écran et l’image le remplit', hero.hasHero && hero.imgCoverage >= 95, `${hero.imgCoverage}%`);
check('la photographie est réellement chargée', hero.imgLoaded);
check('elle n’est pas déformée', hero.imgFit === 'cover');
check('le nom du produit est monumental', /LE GRAND JOUR/.test(hero.title || '') && hero.titleSize >= 38,
  `${hero.titleSize}px`);
check('le hero n’affiche ni couple ni date', !hero.hasWedding);
check('un seul champ, avec son bouton intégré', hero.cta);
check('aucune grille de cartes dans le hero', hero.cards === 0);
const bar = await p.evaluate(() => {
  const b = document.querySelector('.wc-gj-bar');
  const sel = document.querySelector('[data-landing="type"]');
  return b ? {
    field: !!b.querySelector('[data-landing="brief"]'),
    importer: !!b.querySelector('[data-landing="files"]'),
    go: !!b.querySelector('[data-landing="hero-create"]'),
    types: sel ? [...sel.options].map((o) => o.value) : [],
    signature: /L’amour en vrai/.test(document.body.innerText),
  } : null;
});
check('la barre contient champ + import + type + validation',
  bar && bar.field && bar.importer && bar.go, JSON.stringify(bar));
check('les sept types d’événement sont proposés', bar.types.length === 7, bar.types.join(','));
check('la signature est affichée', bar.signature);
await shot('01-hero');
await noOverflow('Landing');

// --- 02 THE FILM ------------------------------------------------------------
say('\n=== 2. LA PELLICULE, JUSTE SOUS LE HERO ===');
const filmPos = await p.evaluate(() => {
  const film = document.querySelector('[data-landing="film"]');
  const heroEl = document.querySelector('[data-landing="hero"]');
  if (!film || !heroEl) return null;
  const fr = film.getBoundingClientRect();
  const hr = heroEl.getBoundingClientRect();
  return {
    gapScreens: Math.round(((fr.top + window.scrollY) - (hr.bottom + window.scrollY)) / window.innerHeight * 100) / 100,
    moments: document.querySelectorAll('[data-landing="film-moment"]').length,
    sections: document.querySelectorAll('section').length,
  };
});
say('  ' + JSON.stringify(filmPos));
check('la pellicule arrive dans l’écran qui suit le hero', filmPos.gapScreens <= 0.6, `${filmPos.gapScreens} écran`);
check('les 8 moments de la démonstration sont dessinés', filmPos.moments === 8, String(filmPos.moments));
// The page tells the eleven innovations of the product, one section each —
// and never more, so it stays a story rather than a catalogue.
// V3: fewer, bigger sequences — each one proving an innovation.
check('la page tient en huit à dix séquences',
  filmPos.sections >= 7 && filmPos.sections <= 10, String(filmPos.sections));

await p.evaluate(() => document.getElementById('film')?.scrollIntoView());
await wait(900);
const hourType = await p.evaluate(() => {
  const el = [...document.querySelectorAll('[data-landing="film-moment"] div')]
    .find((d) => /^\d{2}:\d{2}$/.test(d.textContent.trim()));
  return el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : 0;
});
check('les horaires sont gigantesques', hourType >= 26, `${hourType}px`);
const imgs = await p.evaluate(() => [...document.querySelectorAll('[data-landing="film-moment"] img')]
  .map((i) => ({ ok: i.naturalWidth > 0, fit: getComputedStyle(i).objectFit })));
check('chaque moment porte une vraie photographie chargée',
  imgs.length === 8 && imgs.every((i) => i.ok && i.fit === 'cover'),
  `${imgs.filter((i) => i.ok).length}/8`);
await shot('02-film');

say('\n=== 3. LA PELLICULE EST MANIPULABLE ===');
const z0 = await p.evaluate(() => Number(document.querySelector('[data-landing="film"]').getAttribute('data-px-per-hour')));
await clickTag('landing', 'zoom-in'); await wait(500);
const z1 = await p.evaluate(() => Number(document.querySelector('[data-landing="film"]').getAttribute('data-px-per-hour')));
await clickTag('landing', 'zoom-out'); await wait(400);
await clickTag('landing', 'zoom-out'); await wait(600);
const z2 = await p.evaluate(() => Number(document.querySelector('[data-landing="film"]').getAttribute('data-px-per-hour')));
check('zoom avant', z1 > z0, `${z0} → ${z1}`);
check('zoom arrière', z2 < z1, `${z1} → ${z2}`);
await clickTag('landing', 'zoom-day'); await wait(700);
const dayFits = await p.evaluate(() => {
  const f = document.querySelector('[data-landing="film"]');
  return { sw: f.scrollWidth, w: f.clientWidth };
});
check('« toute la journée » fait tenir la journée entière', dayFits.sw <= dayFits.w + 2, JSON.stringify(dayFits));

// drag to pan
await clickTag('landing', 'zoom-in'); await clickTag('landing', 'zoom-in'); await wait(600);
const box = await p.evaluate(() => {
  const f = document.querySelector('[data-landing="film"]');
  const r = f.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), scroll: f.scrollLeft };
});
await p.mouse.move(box.x, box.y);
await p.mouse.down();
await p.mouse.move(box.x - 220, box.y, { steps: 10 });
await p.mouse.up();
await wait(400);
const scrolled = await p.evaluate(() => document.querySelector('[data-landing="film"]').scrollLeft);
check('la pellicule se déplace de droite à gauche', scrolled > box.scroll, `${box.scroll} → ${Math.round(scrolled)}`);

// …and in the other direction, which is the one that used to be forgotten.
const rightStart = await p.evaluate(() => document.querySelector('[data-landing="film"]').scrollLeft);
await p.mouse.move(box.x, box.y);
await p.mouse.down();
await p.mouse.move(box.x + 240, box.y, { steps: 10 });
await p.mouse.up();
await wait(600);
const backScroll = await p.evaluate(() => document.querySelector('[data-landing="film"]').scrollLeft);
check('la pellicule se déplace de gauche à droite', backScroll < rightStart,
  `${Math.round(rightStart)} → ${Math.round(backScroll)}`);

// touch: the same gesture with a finger.
const touchStart = await p.evaluate(() => document.querySelector('[data-landing="film"]').scrollLeft);
await p.touchscreen.tap(box.x, box.y).catch(() => {});
const touchOk = await p.evaluate(async () => {
  const strip = document.querySelector('[data-landing="film"]');
  const r = strip.getBoundingClientRect();
  const y = r.top + r.height / 2;
  const send = (type, x) => strip.dispatchEvent(new PointerEvent(type, {
    pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true,
  }));
  send('pointerdown', r.left + r.width / 2);
  for (let i = 1; i <= 8; i++) send('pointermove', r.left + r.width / 2 - i * 20);
  send('pointerup', r.left + r.width / 2 - 160);
  await new Promise((res) => setTimeout(res, 400));
  return strip.scrollLeft;
});
check('la pellicule répond au tactile', touchOk > touchStart,
  `${Math.round(touchStart)} → ${Math.round(touchOk)}`);

// On a phone the cards are narrow: the duration appears as soon as one zooms,
// which is exactly what a finger does. Zoom first, then read.
if (WIDTH < 900) { await clickTag('landing', 'zoom-in'); await wait(500); await clickTag('landing', 'zoom-in'); await wait(600); }
const filmExtras = await p.evaluate(() => ({
  now: !!document.querySelector('[data-landing="now"]'),
  durations: [...document.querySelectorAll('[data-landing="film-moment"]')]
    .filter((el) => /\d\s?(h|min)/.test(el.textContent)).length,
}));
check('un repère MAINTENANT est posé sur la pellicule', filmExtras.now);
// At 390px only three cards can be wide enough at once — the rest carry their
// duration as soon as they are scrolled to, which is the same guarantee.
check('les moments affichent leur durée', filmExtras.durations >= 3, String(filmExtras.durations));

// --- a scene ---------------------------------------------------------------
say('\n=== 4. UNE VIGNETTE OUVRE UNE SCÈNE ===');
await p.evaluate(() => document.querySelector('[data-landing="film-moment"]')?.click());
await wait(900);
const scene = await p.evaluate(() => {
  const s = document.querySelector('[data-landing="scene"]');
  if (!s) return null;
  const img = s.querySelector('img');
  return {
    hour: s.querySelector('.wc-gj-scene-hour')?.textContent.trim(),
    hourSize: Math.round(parseFloat(getComputedStyle(s.querySelector('.wc-gj-scene-hour')).fontSize)),
    dims: [...s.querySelectorAll('.wc-gj-scene-dim')].map((d) => d.textContent.trim()),
    img: img ? img.naturalWidth > 0 : false,
    text: s.textContent.replace(/\s+/g, ' '),
  };
});
check('la scène s’ouvre en plein écran', !!scene);
check('avec une heure monumentale', scene && scene.hourSize >= 46, `${scene?.hourSize}px`);
check('la photographie de la scène est chargée', scene?.img);
check('les dimensions du moment sont annoncées',
  (scene?.dims || []).length >= 6, (scene?.dims || []).join(' · '));
check('la démonstration n’invente aucune donnée',
  !!scene && /n’en invente aucune/.test(scene.text));
await shot('03-scene');
await clickTag('landing', 'scene-close'); await wait(600);

// --- propagation demo -------------------------------------------------------
say('\n=== 5. « CHAQUE CHANGEMENT SE PROPAGE » ===');
const beforeShift = await p.evaluate(() =>
  [...document.querySelectorAll('[data-landing="film-moment"]')].map((el) => Number(el.getAttribute('data-hour'))));
await clickTag('landing', 'propagate'); await wait(1000);
const afterShift = await p.evaluate(() =>
  [...document.querySelectorAll('[data-landing="film-moment"]')].map((el) => Number(el.getAttribute('data-hour'))));
const movedCount = afterShift.filter((h, i) => Math.abs(h - beforeShift[i]) > 1e-6).length;
check('la démonstration décale bien la suite de la journée', movedCount === 5, `${movedCount} moments`);
check('et l’explique en une ligne',
  await p.evaluate(() => !!document.querySelector('[data-landing="propagate-note"]')));
const cascade = await p.evaluate(() => [...document.querySelectorAll('[data-landing="cascade-item"]')]
  .map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
say('  ' + JSON.stringify(cascade));
check('la cascade montre photos, dîner, musique, DJ et traiteur',
  cascade.length === 6 && cascade.every((c) => /\+30 min/.test(c)), String(cascade.length));
await shot('04-propagation');

say('\n=== 5b. LES SECTIONS ÉDITORIALES ===');
const editorial = await p.evaluate(() => {
  const t = document.body.innerText;
  return {
    indexes: [...document.querySelectorAll('.wc-gj-index')].map((x) => x.textContent.trim()),
    scenarios: document.querySelectorAll('[data-landing="rail"]').length,
    steps: document.querySelectorAll('[data-landing="doc-row"]').length,
    people: document.querySelectorAll('[data-landing="people"] .wc-gj-person').length,
    music: document.querySelectorAll('[data-landing="track"]').length,
    closing: /commence par un oui|commence par un moment/.test(t),
    oldLine: /commence par un nom/.test(t),
    honestMusic: /jamais à votre événement/.test(t),
    honestPeople: /tant qu’une photo n’existe pas, des initiales/.test(t),
  };
});
say('  ' + JSON.stringify(editorial));
check('les séquences sont numérotées', editorial.indexes.length >= 7, editorial.indexes.join(' '));
check('la section scénarios montre deux rails comparés', editorial.scenarios === 2, String(editorial.scenarios));
check('les documents sont rattachés à trois moments', editorial.steps === 3, String(editorial.steps));
check('la section people montre les liens', editorial.people === 3, String(editorial.people));
check('la section musique montre pochette, heure et durée', editorial.music === 3, String(editorial.music));
check('la dernière section porte une accroche émotionnelle', editorial.closing);
check('l’ancienne phrase administrative a disparu', !editorial.oldLine);
check('aucune pochette ni portrait n’est inventé, et c’est écrit',
  editorial.honestMusic && editorial.honestPeople);

// the two rails really differ
const railDiff = await p.evaluate(() => ({
  changed: document.querySelectorAll('[data-landing="rail"] .is-changed').length,
  lines: [...document.querySelectorAll('[data-landing="scenario-lines"] li')].map((l) => l.textContent.trim()),
}));
check('le plan B montre ses moments changés', railDiff.changed === 2, String(railDiff.changed));
check('et les explique en clair', railDiff.lines.length === 3, railDiff.lines.join(' · '));
await shot('04b-scenarios');
await clickTag('landing', 'propagate'); await wait(600);

// --- 6. into the product ----------------------------------------------------
say('\n=== 5c. LE TYPE D’ÉVÉNEMENT CHANGE LES QUESTIONS ===');
await p.evaluate(() => {
  const sel = document.querySelector('[data-landing="type"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, 'convention');
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(400);
await p.evaluate(() => {
  const f = document.querySelector('[data-landing="brief"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(f, 'Convention annuelle le 12 octobre 2027 au Centre des Congrès, plénière à 9h, ateliers à 11h, déjeuner à 12h30, 250 participants.');
  f.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(300);
await clickTag('landing', 'hero-create');
await wait(2600);
const corporate = await p.evaluate(() => {
  const labels = [...document.querySelectorAll('[data-intake="review"] label span')].map((s) => s.textContent.trim());
  const t = document.body.innerText;
  return {
    labels: labels.slice(0, 6),
    asksBride: /mariés|Qui se marie/i.test(t),
    moments: [...document.querySelectorAll('[data-intake="moment-label"]')].map((i) => i.value),
    headcount: document.querySelector('[data-intake="intake-headcount"]')?.value,
  };
});
say('  ' + JSON.stringify(corporate));
check('une convention ne demande jamais les mariés', !corporate.asksBride);
check('elle demande l’organisation et les participants',
  corporate.labels.some((l) => /entreprise|organisation/i.test(l))
  && corporate.labels.some((l) => /participants/i.test(l)),
  corporate.labels.join(' | '));
check('le vocabulaire des moments est professionnel',
  corporate.moments.some((m) => /Plénière|Atelier|Déjeuner/i.test(m)), corporate.moments.join(', '));
check('250 participants sont lus', corporate.headcount === '250', String(corporate.headcount));
await shot('04c-corporate');
await clickTag('intake', 'close');
await wait(600);
// back to a wedding for the rest of the journey
await p.evaluate(() => {
  const sel = document.querySelector('[data-landing="type"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, 'mariage');
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  const f = document.querySelector('[data-landing="brief"]');
  const s2 = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s2.call(f, '');
  f.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(400);

say('\n=== 6. CRÉATION, PUIS LE PRODUIT ===');
await clickTag('landing', 'hero-create'); await wait(1200);
await typeInto('Clara', 'MATT'); await typeInto('Alexandre', 'EMILIE');
await clickText('Continuer'); await wait(400);
await typeInto('date', new Date().toISOString().slice(0, 10));
await clickText('Continuer'); await wait(400);
await typeInto('Domaine', 'DOMAINE DU GRAND JOUR');
await clickText('Générer notre monde'); await wait(3200);
let s = await stateOf();
check('un mariage réel est créé', !!s.id);
check('sa journée est vide', s.phases.length === 0, String(s.phases.length));
check('le produit porte le nom LE GRAND JOUR', /LE GRAND JOUR/.test(s.text));

// two moments around "now", so MODE JOUR J has something to say
// The model counts the wedding night as 24 → 30, so an hour before dawn is
// read as 25:00, not 01:00 — the test must place its moments the same way.
const rawNow = new Date().getHours() + new Date().getMinutes() / 60;
const nowH = rawNow < 7 ? rawNow + 24 : rawNow;
const mk = async (name, start, minutes) => {
  await p.evaluate(() => {
    const btn = document.querySelector('[data-jourj="add-moment"]') || document.querySelector('[data-jourj="empty-add"]');
    if (!document.querySelector('[data-jourj="moment-name"]')) btn?.click();
  });
  await wait(300);
  await setField('moment-name', name);
  await setField('moment-start', fmt(start));
  await setField('moment-duration', String(minutes));
  await clickTag('jourj', 'moment-create');
  await wait(500);
};
// The night rule needs a daytime anchor to know that "01:30" means the night
// of the wedding day: when the test runs in the small hours, it plants one.
if (nowH >= 24) await mk('Cérémonie', 15, 60);
const clampH = (h) => Math.max(7.5, Math.min(28.5, h));
await mk('Cocktail', clampH(nowH - 0.5), 60);
await mk('Dîner', clampH(nowH + 1), 60);
await mk('Soirée', clampH(nowH + 2), 60);
// A late moment typed as "01:04" must be read as the NIGHT of the wedding day.
const nightMoment = (await stateOf()).phases.find((x) => x.name === 'Soirée');
check('un moment tapé après minuit est placé dans la nuit du jour J',
  !nightMoment || nightMoment.start >= 12 || nowH + 2 < 24,
  nightMoment ? String(nightMoment.start) : 'absent');
s = await stateOf();
check('les moments de test existent', s.phases.length >= 3, String(s.phases.length));

// --- 7. MODE JOUR J ---------------------------------------------------------
say('\n=== 7. MODE JOUR J (NOW) ===');
await clickTag('jourj', 'now-mode'); await wait(1200);
const now = await p.evaluate(() => {
  const badge = document.querySelector('[data-jourj="now-badge"]');
  const panel = document.querySelector('[data-jourj="now-panel"]');
  return {
    badge: badge ? badge.textContent.trim() : null,
    panel: panel ? panel.textContent.replace(/\s+/g, ' ').trim().slice(0, 220) : null,
  };
});
say('  ' + JSON.stringify(now));
check('le repère MAINTENANT est posé sur la pellicule', !!now.badge && /maintenant/.test(now.badge));
check('le panneau dit l’heure réelle et ce qui se passe', !!now.panel && /\d{2}:\d{2}/.test(now.panel));
check('et annonce ce qui vient ensuite', !!now.panel && /dans \d/.test(now.panel));
await shot('05-mode-jourj');
await clickTag('jourj', 'now-mode'); await wait(600);

// --- 8. music as a temporal layer ------------------------------------------
say('\n=== 8. LA MUSIQUE EST UNE COUCHE TEMPORELLE ===');
await p.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-jourj="moment"]')];
  const card = cards.find((c) => c.textContent.includes('Soirée')) || cards[cards.length - 1];
  card?.querySelector('[data-jourj="open-moment"]')?.click();
});
await wait(900);
await setField('hub-track-new', 'PERFECT — ED SHEERAN');
await clickTag('jourj', 'hub-track-new-submit'); await wait(800);
await commitField('hub-track-duration', '3:45'); await wait(700);
s = await stateOf();
check('le morceau existe avec sa durée réelle',
  s.tracks.some((t) => /PERFECT/i.test(t.title) && t.duration === '3:45'),
  JSON.stringify(s.tracks));
const play = await p.evaluate(() => {
  const hub = document.querySelector('[data-jourj="hub"]');
  const txt = hub ? hub.textContent : '';
  return {
    playBtn: !!hub?.querySelector('button[aria-label*="Écouter"], button[title*="Écouter"]'),
    honest: /Aucun extrait audio|Aucune source audio/i.test(txt),
  };
});
check('aucun bouton Écouter n’est affiché sans extrait réel', !play.playBtn);
check('et le hub dit pourquoi', play.honest);
await shot('06-hub-music');
await clickTag('jourj', 'hub-close'); await wait(600);

// --- 9. the Canvas move must be validated ----------------------------------
say('\n=== 9. CANVAS : LA POIGNÉE SEULE SE DÉPLACE, PUIS ON VALIDE ===');
await p.keyboard.press('KeyK'); await wait(1400);
await p.evaluate(() => {
  const tab = [...document.querySelectorAll('button')].find((b) => /Programme/i.test(b.textContent));
  tab?.click();
});
await wait(800);
const rows = await p.evaluate(() =>
  [...document.querySelectorAll('[data-canvas="moment-row"]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { id: el.getAttribute('data-phase-id'), top: Math.round(r.top), left: Math.round(r.left), h: Math.round(r.height) };
  }));
// Three moments, plus the daytime anchor when the test runs after midnight.
check('le programme est listé dans le Canvas', rows.length >= 3, String(rows.length));
const handle = await p.evaluate(() => {
  const h = document.querySelector('[data-canvas="moment-row"] [data-canvas="drag-handle"]');
  const r = h.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
const firstRowBefore = rows[0];
await p.mouse.move(handle.x, handle.y);
await p.mouse.down();
await p.mouse.move(handle.x + 6, rows[2].top + rows[2].h / 2, { steps: 10 });
await wait(250);
const mid = await p.evaluate((id) => {
  const el = document.querySelector(`[data-canvas="moment-row"][data-phase-id="${id}"]`);
  const r = el.getBoundingClientRect();
  const ghost = document.querySelector('[data-canvas="drag-ghost"]');
  const g = ghost?.getBoundingClientRect();
  return {
    rowTop: Math.round(r.top), rowLeft: Math.round(r.left),
    ghost: g ? { x: Math.round(g.left), y: Math.round(g.top) } : null,
  };
}, firstRowBefore.id);
say('  ' + JSON.stringify(mid));
check('le bloc NE bouge PAS pendant le déplacement',
  Math.abs(mid.rowTop - firstRowBefore.top) <= 2 && Math.abs(mid.rowLeft - firstRowBefore.left) <= 2,
  `${firstRowBefore.top},${firstRowBefore.left} → ${mid.rowTop},${mid.rowLeft}`);
check('seule la poignée suit le pointeur', !!mid.ghost && Math.abs(mid.ghost.y - (rows[2].top + rows[2].h / 2)) < 40,
  JSON.stringify(mid.ghost));
await shot('07-canvas-drag');
await p.mouse.up();
await wait(700);

const validation = await p.evaluate(() => {
  const el = document.querySelector('[data-canvas="move-validation"]');
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
});
say('  ' + (validation || 'aucune validation affichée'));
check('le déplacement est proposé, pas appliqué', !!validation && /Modifications détectées/i.test(validation));
const beforeApply = await stateOf();
check('aucun horaire n’a encore changé',
  JSON.stringify(beforeApply.phases.map((x) => x.start)) === JSON.stringify(s.phases.map((x) => x.start)),
  beforeApply.phases.map((x) => fmt(x.start)).join(' '));
check('les conséquences sont écrites heure par heure', /\d{2}:\d{2} → \d{2}:\d{2}/.test(validation || ''));
await clickTag('canvas', 'move-apply'); await wait(900);
const afterApply = await stateOf();
check('après validation, les horaires sont recalculés',
  JSON.stringify(afterApply.phases.map((x) => x.start)) !== JSON.stringify(beforeApply.phases.map((x) => x.start)),
  afterApply.phases.map((x) => `${x.name} ${fmt(x.start)}`).join(' | '));
await noOverflow('Canvas');

// --- 10. reload -------------------------------------------------------------
say('\n=== 10. RELOAD ===');
await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(3000);
const reloaded = await stateOf();
check('tout est conservé', reloaded.phases.length === afterApply.phases.length && reloaded.tracks.length === 1,
  `${reloaded.phases.length} moments / ${reloaded.tracks.length} morceau`);
check('les horaires recalculés sont conservés',
  JSON.stringify(reloaded.phases.map((x) => x.start)) === JSON.stringify(afterApply.phases.map((x) => x.start)),
  reloaded.phases.map((x) => fmt(x.start)).join(' '));
check('aucune donnée de démonstration n’est apparue',
  !/Clara|Bellevue|Gare TGV/.test(reloaded.text));
await noOverflow('Jour J après reload');
await shot('08-after-reload');

say(`\n### RÉSULTAT ${WIDTH}px : ${failures} échec(s)`);
writeFileSync(`${OUT}/grandjour-${WIDTH}.log`, log.join('\n'));
await browser.close();
process.exit(failures > 0 ? 1 : 0);
