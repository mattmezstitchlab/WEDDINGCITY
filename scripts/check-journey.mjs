#!/usr/bin/env node
/**
 * AIME — journey guard.
 *
 * Every check here corresponds to a defect REALLY OBSERVED in Chromium during
 * the end-to-end acceptance pass (landing → creation → World → Canvas →
 * Mirror → second wedding → project switching → reloads → landing):
 *
 *   1. a brand-new wedding was persisted carrying `customBadgeText:
 *      "Clara & Alexandre"` — the demo couple, written inside a real project,
 *      because DEFAULT_DMC_IDENTITY is a demo constant;
 *   2. the creation surface lets the couple answer "je ne sais pas encore" and
 *      "le lieu n'est pas encore choisi", and the store filled those blanks
 *      with an invented date (2025-09-20) and an invented estate
 *      ("Domaine d'Exception");
 *   3. once a wedding had been opened, nothing in the product led back to the
 *      public site and its "Mes mariages" list — `hasChosenProject()` stayed
 *      true forever;
 *   4. the brand menu opened the legacy creation modal directly, bypassing
 *      startWeddingCreation(), so a visitor arriving from the editorial site
 *      still fell into the spatial panel;
 *   5. the projection capsule, pinned to the top of the World, covered the HUD
 *      pills; the World HUD and the bottom dock overflowed the viewport;
 *   6. a long real name was clipped by the right edge of the Mirror cover.
 *
 * 1–3 are behaviour and are executed against the real store and the real
 * persistence. 4–6 are layout/wiring and are asserted on the source.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — parcours complet\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

const storage = createMemoryStorage();
let boots = 0;
/** A fresh boot against the SAME storage — i.e. a real page reload. */
async function reload() {
  installBrowserGlobals(storage);
  const un = silence();
  const m = await harness.load('weddingStore', `jr${++boots}`);
  un();
  return m.weddingStore;
}

try {
  // -------------------------------------------------------------------------
  console.log('\n[1/4] A new wedding carries no demo data and invents nothing');
  // -------------------------------------------------------------------------
  let store = await reload();
  const un = silence();
  const demoId = store.currentProject.id;

  // The couple answered the names, and skipped the date and the venue.
  store.createRealWedding({
    coupleNames: 'ALPHA-ACCEPTATION & BETA-ACCEPTATION',
    weddingDate: '',
    locationName: '',
    userRole: 'wedding_planner',
    userName: 'ALPHA-ACCEPTATION',
  });
  const projectA = store.currentProject.id;

  r.check(store.currentProject.weddingDate === '',
    'an unanswered date stays empty — no 2025-09-20 is invented',
    JSON.stringify(store.currentProject.weddingDate));
  r.check(store.currentProject.locationName === '',
    'an unanswered venue stays empty — no "Domaine d’Exception" is invented',
    JSON.stringify(store.currentProject.locationName));

  const rawA = storage.getItem(`wedding_city_state_${projectA}`) || '';
  r.check(!/Clara|Alexandre Meyer|Bellevue/.test(rawA),
    'nothing of the demo is written into the new project’s snapshot');
  r.check(store.userDmcIdentity.customBadgeText === 'ALPHA-ACCEPTATION & BETA-ACCEPTATION',
    'the DMC badge names THIS couple, not the demo one',
    store.userDmcIdentity.customBadgeText);
  r.check(!/\/editorial\//.test(rawA),
    'no landing illustration is attached to the wedding’s data');
  r.check(store.media.length === 0, 'and the wedding has no media at all',
    String(store.media.length));

  // -------------------------------------------------------------------------
  console.log('\n[2/4] Returning to the site closes the wedding without deleting it');
  // -------------------------------------------------------------------------
  store.createPerson({ displayName: 'ZORGLUB ACCEPTATION', asGuest: true, rsvp: 'pending' });
  store.createTrack({ title: 'ACCEPTATION TRACK', artist: '—' });
  store.saveCurrentState();
  const personsBefore = store.persons.length;

  store.openCanvas({ kind: 'person', id: store.persons[0].id });
  store.returnToLanding();

  r.check(store.projectChosen === false, 'the product is back on the public site');
  r.check(!storage.getItem('wedding_city_active_project_id_v1'),
    'no wedding is open any more');
  r.check(store.projection === 'mirror', 'and that site is the Mirror');
  r.check(store.canvasOpen === false && store.canvasFocus === null,
    'no composition selection survives the exit');
  const projects = JSON.parse(storage.getItem('wedding_city_projects_v1') || '[]');
  r.check(projects.some((p) => p.id === projectA) && projects.some((p) => p.id === demoId),
    'every wedding is still listed — leaving is a navigation, not a deletion',
    `${projects.length} projets`);
  r.check(Boolean(storage.getItem(`wedding_city_state_${projectA}`)),
    'and its data is still on disk');

  // A reload while on the landing must not silently adopt a wedding.
  store = await reload();
  r.check(store.projectChosen === false,
    'a reload on the landing does not adopt a project by itself');

  // Reopening from "Mes mariages" restores exactly that wedding.
  store.loadProject(projectA);
  r.check(store.currentProject.id === projectA, 'reopening A from the list opens A');
  r.check(store.persons.length === personsBefore
    && store.persons.some((p) => p.displayName === 'ZORGLUB ACCEPTATION'),
    'with everything that was composed in it',
    store.persons.map((p) => p.displayName).join(' / '));
  r.check(store.tracks.some((t) => t.title === 'ACCEPTATION TRACK'),
    'including its music');

  // -------------------------------------------------------------------------
  console.log('\n[3/4] One creation flow, one way back');
  // -------------------------------------------------------------------------
  const menu = readFileSync(path.join(SRC, 'components', 'ui', 'BrandMenuModal.tsx'), 'utf8');
  r.check(/store\.startWeddingCreation\(\)/.test(menu)
    && !/store\.createWeddingModalOpen = true/.test(menu),
    'the brand menu goes through startWeddingCreation, never straight to the legacy modal');
  r.check(/store\.returnToLanding\(\)/.test(menu),
    'and it offers the way back to "Mes mariages"');

  const site = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorSite.tsx'), 'utf8');
  r.check(/store\.returnToLanding\(\)/.test(site),
    'the Mirror offers it too — the site is not a dead end');
  r.check(site.indexOf('<MirrorNav') < site.indexOf('<MirrorHero'),
    'imposed vertical order: navigation, then the content, then (fixed) the capsule');

  // -------------------------------------------------------------------------
  console.log('\n[4/4] Nothing is pinned where something else already is');
  // -------------------------------------------------------------------------
  const switcher = readFileSync(path.join(SRC, 'components', 'ui', 'ProjectionSwitcher.tsx'), 'utf8');
  r.check(!/top: 'max\(14px/.test(switcher),
    'the capsule is no longer pinned over the World HUD');

  const nav = readFileSync(path.join(SRC, 'components', 'ui', 'TopNavigation.tsx'), 'utf8');
  r.check(/flexWrap: 'wrap'/.test(nav),
    'the World HUD wraps instead of running past the right edge');

  const dock = readFileSync(path.join(SRC, 'components', 'ui', 'BottomOrchestrator.tsx'), 'utf8');
  r.check(/flexWrap: 'wrap'/.test(dock), 'so does the bottom dock');
  r.check(/bottom: 68/.test(dock),
    'and it leaves the bottom lane to the capsule');
  r.check(/overflowX: 'auto'/.test(dock),
    'the milestone strip scrolls on a phone rather than pushing the dock off screen');

  const css = readFileSync(path.join(SRC, 'components', 'mirror', 'mirror.css'), 'utf8');
  r.check(/\.wc-hero-title\s*\{[^}]*overflow-wrap:\s*anywhere/.test(css),
    'a long real name wraps in the cover instead of being cut off at 390px');

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll journey checks passed.\u001b[0m\n');
