#!/usr/bin/env node
/**
 * AIME — multi-project isolation guard.
 *
 * Written after a browser acceptance pass found three real defects:
 *
 *   1. creating a wedding through the real form copied the DEMO into it
 *      (12 places, 35 people, 10 tracks, 7 phases);
 *   2. after a reload, a real project fell back to the demo, because empty
 *      lists are treated as \"absent\" and the fallback was the demo;
 *   3. nothing in the interface could reopen a previously created wedding.
 *
 * (3) is a UI affordance, asserted on the source. (1) and (2) are behaviour,
 * and are executed here against the real store and the real persistence.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — multi-project isolation\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

const storage = createMemoryStorage();
let boots = 0;
/** A fresh boot of the app against the SAME storage — i.e. a page reload. */
async function reload() {
  installBrowserGlobals(storage);
  const un = silence();
  const m = await harness.load('weddingStore', `mp${++boots}`);
  un();
  return m.weddingStore;
}

try {
  // ---------------------------------------------------------------------------
  console.log('\n[1/5] A new wedding inherits nothing from the demo');
  // ---------------------------------------------------------------------------
  const store = await reload();
  const un = silence();

  const demoId = store.currentProject.id;
  r.check(store.currentProject.isDemo === true, 'the app boots on the demo project', demoId);
  const demoCounts = {
    places: store.places.length, persons: store.persons.length,
    phases: store.phases.length, tracks: store.tracks.length,
  };
  r.check(demoCounts.places > 0 && demoCounts.phases > 0, 'which does have data',
    JSON.stringify(demoCounts));

  store.createRealWedding({
    coupleNames: 'ALPHA-UN & ALPHA-DEUX',
    weddingDate: '2027-03-05',
    locationName: 'DOMAINE ALPHA UNIQUE',
    userRole: 'wedding_planner',
    userName: 'Alpha',
  });
  const projectA = store.currentProject.id;

  r.check(projectA !== demoId, 'creating a wedding switches to a NEW project id', projectA);
  r.check(store.currentProject.coupleNames === 'ALPHA-UN & ALPHA-DEUX',
    'with the names that were typed');
  r.check(store.places.length === 0, 'it has NO place from the demo', String(store.places.length));
  r.check(store.agents.length === 0, 'no agent', String(store.agents.length));
  r.check(store.phases.length === 0, 'no phase', String(store.phases.length));
  r.check(store.tracks.length === 0, 'no track', String(store.tracks.length));
  r.check(store.docs.length === 0 && store.tasks.length === 0 && store.conflicts.length === 0,
    'no document, task or conflict');
  r.check(!store.persons.some((p) => /Clara|Alexandre Meyer/.test(p.displayName)),
    'nobody from the demo', store.persons.map((p) => p.displayName).join(', '));

  // The only people are the ones the creator typed — real data, not invented.
  r.check(store.persons.length === 2, 'the two spouses exist as real Persons',
    store.persons.map((p) => p.displayName).join(' & '));
  r.check(store.persons.every((p) => !store.getAgentForPerson(p.id)),
    'and they have NO spatial projection — no position is invented for them');

  // ---------------------------------------------------------------------------
  console.log('\n[2/5] Editing project A never reaches the demo');
  // ---------------------------------------------------------------------------
  const zorglub = store.createPerson({ displayName: 'ZORGLUB ALPHA', asGuest: true, rsvp: 'pending' });
  const track = store.createTrack({ title: 'HYMNE ALPHA', artist: 'Alpha' });
  const place = store.createPlace ? store.createPlace({ name: 'SALLE ALPHA' }) : null;
  store.saveCurrentState();

  r.check(Boolean(zorglub) && store.persons.some((p) => p.displayName === 'ZORGLUB ALPHA'),
    'a person created in A exists in A');
  r.check(Boolean(track) && store.tracks.some((t) => t.title === 'HYMNE ALPHA'),
    'a track created in A exists in A');

  store.loadProject(demoId);
  r.check(store.currentProject.id === demoId, 'switching back to the demo works');
  r.check(!store.persons.some((p) => p.displayName === 'ZORGLUB ALPHA'),
    'ZORGLUB does NOT appear in the demo');
  r.check(!store.tracks.some((t) => t.title === 'HYMNE ALPHA'),
    'the track does NOT appear in the demo');
  r.check(store.places.length === demoCounts.places && store.phases.length === demoCounts.phases,
    'and the demo is intact', `${store.places.length}/${store.phases.length}`);
  if (place) {
    r.check(!store.places.some((p) => p.name === 'SALLE ALPHA'), 'the place stayed in A');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[3/5] Switching projects clears the previous selection');
  // ---------------------------------------------------------------------------
  store.openCanvas({ kind: 'person', id: store.persons[0].id });
  store.selectEntity('place', store.places[0].id);
  store.loadProject(projectA);
  r.check(store.canvasFocus === null, 'no Canvas focus survives the crossing');
  r.check(store.selectedEntity === null, 'no entity from the other project stays selected');
  r.check(store.mirrorFocusPersonId === null, 'and the Mirror does not keep a stale person');

  // ---------------------------------------------------------------------------
  console.log('\n[4/5] A reload restores the ACTIVE project, not the demo');
  // ---------------------------------------------------------------------------
  {
    // Project A is active and has been saved. Boot the whole app again.
    store.saveCurrentState();
    const reloaded = await reload();
    r.check(reloaded.currentProject.id === projectA,
      'the active project is restored after a reload', reloaded.currentProject.id);
    r.check(reloaded.persons.some((p) => p.displayName === 'ZORGLUB ALPHA'),
      'its own data is restored');
    // A holds exactly what this test created — one place, no phase, no agent —
    // and NOT the demo's 12 places / 7 phases / 35 agents.
    r.check(reloaded.phases.length === 0 && reloaded.agents.length === 0
      && reloaded.places.every((p) => p.name === 'SALLE ALPHA'),
      'a nearly empty project stays its own instead of falling back to the demo',
      `places=[${reloaded.places.map((p) => p.name).join(', ')}] `
      + `phases=${reloaded.phases.length} agents=${reloaded.agents.length}`);
    r.check(reloaded.tracks.length === 1 && reloaded.tracks[0].title === 'HYMNE ALPHA',
      'and its own track is the only one', reloaded.tracks.map((t) => t.title).join(', '));
    r.check(!reloaded.persons.some((p) => /Clara/.test(p.displayName)),
      'no demo person reappears');

    // The demo itself must still restore its own data.
    reloaded.loadProject(demoId);
    r.check(reloaded.places.length === demoCounts.places,
      'the demo still restores the demo', String(reloaded.places.length));
  }

  // ---------------------------------------------------------------------------
  console.log('\n[5/5] The interface can actually reach every project');
  // ---------------------------------------------------------------------------
  {
    const menu = readFileSync(path.join(SRC, 'components', 'ui', 'BrandMenuModal.tsx'), 'utf8');
    r.check(/getStoredProjects\(\)/.test(menu),
      'the menu lists the projects that really exist');
    r.check(/store\.loadProject\(p\.id\)/.test(menu),
      'and opening one switches to it by id');

    const estate = readFileSync(path.join(SRC, 'components', '3d', 'EstateEnvironment.tsx'), 'utf8');
    // The estate's BUILDINGS are skipped for a project that does not have the
    // places they depict; the ground and grid stay (a generated world was
    // otherwise floating in pure black — World Lab acceptance).
    r.check(/if \(depictedPlaces < 3\) \{/.test(estate)
      && /ESTATE_PLACE_IDS/.test(estate),
      'the hardcoded estate is not drawn for a project that does not have those places');
    r.check(/planeGeometry args=\{\[260, 220\]\}/.test(estate.split('if (depictedPlaces < 3) {')[1] || ''),
      'but every project keeps a ground to stand on');

    const dock = readFileSync(path.join(SRC, 'components', 'ui', 'BottomOrchestrator.tsx'), 'utf8');
    r.check(/store\.phases/.test(dock) && !/hour: 10\.0, label: 'Préparatifs'/.test(dock),
      'the day and the zones in the dock come from the active project');

    const storeSrc = readFileSync(path.join(SRC, 'game', 'weddingStore.ts'), 'utf8');
    r.check(/proj\.isDemo \? serializeDomain\(this\) : createEmptyDomainState\(\)/.test(storeSrc),
      'boot falls back to an empty world for a real project, to the demo for the demo');
    r.check(/proj\.isDemo \? createDefaultDomainState\(\) : createEmptyDomainState\(\)/.test(storeSrc),
      'and so does loadProject');
    r.check(!/this\.places = \[\.\.\.INITIAL_PLACES\]/.test(storeSrc),
      'creating a wedding no longer copies the demo arrays');
  }

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll multi-project checks passed.\u001b[0m\n');
