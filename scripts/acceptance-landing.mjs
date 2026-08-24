#!/usr/bin/env node
/**
 * ACCEPTANCE — Mirror as a public landing, and wedding creation from it.
 *
 * Driven in a real browser, from a clean profile. Nothing is written to
 * storage by the script; the store is never imported into the page.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = '/tmp/landing';
mkdirSync(OUT, { recursive: true });
const log = [];
const say = (...a) => { const l = a.join(' '); console.log(l); log.push(l); };

const browser = await puppeteer.launch({ executablePath: '/tmp/chromium', headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars'],
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp/swiftshader:/tmp' } });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => say('  [erreur page]', String(e).slice(0, 120)));

const wait = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); say('  📷', n); };
const clickText = (t) => page.evaluate((x) => {
  const el = [...document.querySelectorAll('button, [role="button"], a')]
    .find((b) => b.textContent.replace(/\s+/g, ' ').trim().includes(x));
  if (!el) return false; el.click(); return true;
}, t);

const snap = () => page.evaluate(() => {
  const id = localStorage.getItem('wedding_city_active_project_id_v1');
  const projects = JSON.parse(localStorage.getItem('wedding_city_projects_v1') || '[]');
  const active = projects.find((p) => p.id === id) || null;
  const st = JSON.parse(localStorage.getItem('wedding_city_state_' + id) || 'null');
  const L = (k) => (Array.isArray(st?.[k]) ? st[k] : []);
  const body = document.body.innerText.replace(/\s+/g, ' ');
  return {
    activeId: id, couple: active?.coupleNames ?? null,
    projects: projects.map((p) => p.coupleNames || p.title),
    counts: { places: L('places').length, phases: L('phases').length,
      persons: L('persons').length, tracks: L('tracks').length },
    persons: L('persons').map((p) => p.displayName),
    tracks: L('tracks').map((t) => t.title),
    isLanding: /devient un monde/.test(body),
    hasCapsule: /WORLD MIRROR CANVAS/.test(body),
    mirrorMounted: Boolean(document.getElementById('wc-mirror')),
    demoContent: /Clara Dubois|Gare TGV|Château de Bellevue/.test(body),
    hud: (document.querySelector('[title="Ouvrir le menu principal Wedding City"]')?.innerText || '').replace(/\s+/g, ' ').trim(),
  };
});
const brief = (s) => `${s.activeId ?? 'AUCUN'} · ${s.couple ?? '—'} · lieux=${s.counts.places} `
  + `moments=${s.counts.phases} personnes=${s.counts.persons} morceaux=${s.counts.tracks}`;

/**
 * Two doors, one creation.
 *  · from the public site → the editorial surface (three questions);
 *  · from the World brand menu → the existing spatial panel (one form).
 * Both end on createRealWedding.
 */
const createEditorial = async (one, two, date, place) => {
  const cta = await clickText('Créer mon mariage');
  await wait(1300);
  const fill = (ph, v) => page.evaluate((ph, v) => {
    const i = [...document.querySelectorAll('input')]
      .find((x) => (x.placeholder || '').includes(ph) || x.type === ph);
    if (!i) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v);
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, ph, v);
  await fill('Clara', one);
  await fill('Alexandre', two);
  await wait(300);
  await clickText('Continuer'); await wait(700);
  await fill('date', date); await wait(250);
  await clickText('Continuer'); await wait(700);
  await fill('Domaine', place); await wait(250);
  const gen = await clickText('Générer notre monde');
  await wait(3200);
  return { cta, gen };
};

const createFromWorldPanel = async (couple, place) => {
  const cta = await clickText('Créer un Mariage');
  await wait(1200);
  await page.evaluate((c, pl) => {
    const set = (el, v) => { if (!el) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true })); };
    const i = [...document.querySelectorAll('input')];
    set(i.find((x) => /Sophie & Julien/.test(x.placeholder || '')), c);
    set(i.find((x) => /Chantilly/.test(x.placeholder || '')), pl);
  }, couple, place);
  await wait(400);
  const gen = await clickText('Générer le Monde');
  await wait(3000);
  return { cta, gen };
};

try {
  say('=== 1. PREMIÈRE OUVERTURE (profil neuf) ===');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 60000 });
  await wait(3000);
  const s0 = await snap();
  say('  ' + brief(s0));
  say('  landing affichée :', s0.isLanding, '| capsule visible :', s0.hasCapsule,
    '| contenu de démo :', s0.demoContent, '| projet actif :', s0.activeId);
  await shot('01-landing');

  say('\n=== 2. CRÉER ALPHA DEPUIS LA LANDING ===');
  const created = await createEditorial('ALPHA-UN', 'ALPHA-DEUX', '2027-03-05', 'DOMAINE ALPHA');
  say('  CTA/génération :', JSON.stringify(created));
  const sA = await snap();
  say('  ' + brief(sA), '| HUD:', sA.hud.slice(0, 40));
  say('  monde vide ?', sA.counts.places === 0 && sA.counts.phases === 0 && sA.counts.tracks === 0,
    '| personnes saisies :', JSON.stringify(sA.persons));
  say('  arrivé dans le World :', !sA.mirrorMounted, '| capsule :', sA.hasCapsule);
  await shot('02-apres-creation-world');

  say('\n=== 3. CANVAS : ajouter une personne et un morceau ===');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().toUpperCase() === 'CANVAS')?.click());
  await wait(1800);
  const made = await page.evaluate(async () => {
    const out = {};
    const rail = (re) => [...document.querySelectorAll('nav button')].find((b) => re.test(b.textContent));
    rail(/Personnes/i)?.click(); await new Promise((r) => setTimeout(r, 700));
    const add = [...document.querySelectorAll('button')].find((b) => /Ajouter une personne/i.test(b.textContent));
    if (add) { add.click(); await new Promise((r) => setTimeout(r, 500));
      const inp = [...document.querySelectorAll('input')].find((i) => /Prénom/i.test(i.placeholder || ''));
      if (inp) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, 'ZORGLUB ALPHA');
        inp.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 200));
        [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Créer')?.click(); out.person = 'ok'; } }
    await new Promise((r) => setTimeout(r, 800));
    rail(/Musique/i)?.click(); await new Promise((r) => setTimeout(r, 700));
    const t = [...document.querySelectorAll('button')].find((b) => /Ajouter un morceau/i.test(b.textContent));
    if (t) { t.click(); out.track = 'ok'; }
    return out;
  });
  say('  créations :', JSON.stringify(made));
  await wait(1400);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Terminer/.test(b.textContent))?.click());
  await wait(1000);
  const sA2 = await snap();
  say('  ' + brief(sA2));
  await shot('03-canvas');

  say('\n=== 4. MIRROR DU MARIAGE A ===');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().toUpperCase() === 'MIRROR')?.click());
  await wait(2000);
  const sA3 = await snap();
  const mirrorText = await page.evaluate(() => {
    const r = document.getElementById('wc-mirror');
    return r ? r.innerText.replace(/\s+/g, ' ').slice(0, 200) : 'ABSENT';
  });
  say('  landing ?', sA3.isLanding, '| Mirror :', mirrorText.slice(0, 150));
  await shot('04-mirror-A');

  say('\n=== 5. CRÉER BETA DEPUIS LE MENU, PUIS ALTERNER ===');
  // Back to the World, where the brand menu lives, then the same modal.
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((b) => b.textContent.trim().toUpperCase() === 'WORLD')?.click());
  await wait(1400);
  await page.evaluate(() => document.querySelector('[title="Ouvrir le menu principal Wedding City"]')?.click());
  await wait(800);
  const createdB = await createFromWorldPanel('BETA-UN & BETA-DEUX', 'CHALET BETA');
  say('  création B :', JSON.stringify(createdB));
  const sB = await snap();
  say('  ' + brief(sB), '| ZORGLUB dans B :', sB.persons.some((n) => /ZORGLUB/.test(n)));
  await shot('05-projet-B');

  const openProject = async (label) => {
    const isOpen = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Créer un Mariage/.test(b.textContent)));
    if (!isOpen) { await page.evaluate(() => document.querySelector('[title="Ouvrir le menu principal Wedding City"]')?.click()); await wait(700); }
    const ok = await clickText(label); await wait(2400); return ok;
  };
  const okA = await openProject('ALPHA-UN');
  const sA4 = await snap();
  say(`  → A (${okA}) : ` + brief(sA4), '| ZORGLUB :', sA4.persons.some((n) => /ZORGLUB/.test(n)));
  const okB = await openProject('BETA-UN');
  const sB2 = await snap();
  say(`  → B (${okB}) : ` + brief(sB2), '| ZORGLUB (fuite ?) :', sB2.persons.some((n) => /ZORGLUB/.test(n)));

  say('\n=== 6. RELOAD SUR B, PUIS RETOUR A + RELOAD ===');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await wait(3000);
  const sB3 = await snap();
  say('  B après reload : ' + brief(sB3), '| landing ?', sB3.isLanding);
  await openProject('ALPHA-UN');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  await wait(3000);
  const sA5 = await snap();
  say('  A après reload : ' + brief(sA5), '| ZORGLUB :', sA5.persons.some((n) => /ZORGLUB/.test(n)));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().toUpperCase() === 'MIRROR')?.click());
  await wait(1800);
  const finalMirror = await page.evaluate(() => {
    const r = document.getElementById('wc-mirror');
    return r ? r.innerText.replace(/\s+/g, ' ').slice(0, 180) : 'ABSENT';
  });
  say('  Mirror final :', finalMirror.slice(0, 150));
  await shot('06-mirror-A-final');
} finally {
  writeFileSync(`${OUT}/log.txt`, log.join('\n'));
  await browser.close();
}
