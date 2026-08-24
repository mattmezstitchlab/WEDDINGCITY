#!/usr/bin/env node
/**
 * AIME — generated-world isolation guard (World Lab / createWorldWithAi).
 *
 * Written after a browser acceptance pass of the SECOND creation path found
 * that a generated world inherited the identity model of whatever project was
 * open: a two-week roadtrip in Japan was created carrying the wedding demo's
 * 35 people, 27 guests, 8 vendors and 6 seating tables — and a second
 * generated world inherited whatever had just been edited in the first one.
 *
 * WHAT createWorldWithAi ACTUALLY IS (asserted below, because the name is
 * misleading): a LOCAL, DETERMINISTIC generator. It calls
 * generateWorldFromDescription(), which picks a hardcoded archetype by
 * worldType and returns literal entities. No model, no network, no randomness
 * in the entities themselves. The free-text prompt is used as a TITLE; it does
 * not influence what is generated.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — generated worlds (World Lab)\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

const storage = createMemoryStorage();
let boots = 0;
async function reload() {
  installBrowserGlobals(storage);
  const un = silence();
  const m = await harness.load('weddingStore', `wl${++boots}`);
  un();
  return m.weddingStore;
}

try {
  const store = await reload();
  const un = silence();
  const demoId = store.currentProject.id;
  const demoCounts = {
    places: store.places.length, persons: store.persons.length,
    guests: store.guests.length, vendors: store.vendors.length,
    phases: store.phases.length, tracks: store.tracks.length,
  };

  // ---------------------------------------------------------------------------
  console.log('\n[1/5] A generated world is a project of its own');
  // ---------------------------------------------------------------------------
  store.createWorldWithAi({ prompt: 'PREMIER MONDE IA', worldType: 'travel', title: 'PREMIER MONDE IA' });
  const worldA = store.currentProject.id;

  r.check(worldA.startsWith('world_travel_'), 'it gets its own project id', worldA);
  r.check(worldA !== demoId, 'distinct from the demo');
  r.check(store.currentProject.worldType === 'travel', 'and carries its world type');
  store.saveCurrentState();
  r.check(Boolean(storage.getItem(`wedding_city_state_${worldA}`)),
    'with its own storage key');
  r.check(storage.getItem('wedding_city_active_project_id_v1') === worldA,
    'and it becomes the active project');

  r.check(store.places.length > 0 && store.phases.length > 0,
    'the generator really produced entities',
    `places=${store.places.length} phases=${store.phases.length}`);

  // ---------------------------------------------------------------------------
  console.log('\n[2/5] It inherits NOTHING from the project that was open');
  // ---------------------------------------------------------------------------
  r.check(!store.persons.some((p) => /Clara Dubois|Sophie Étoile|Julien Renard/.test(p.displayName)),
    'no person from the demo', store.persons.map((p) => p.displayName).slice(0, 4).join(', '));
  r.check(store.guests.length < demoCounts.guests,
    'not the demo guest list', `${store.guests.length} vs ${demoCounts.guests}`);
  r.check(store.seatingTables.length === 0, 'no seating table from the demo',
    String(store.seatingTables.length));
  r.check(store.media.length === 0 && store.relationships.length === 0,
    'no media, no relationship');
  r.check(!store.places.some((p) => /Gare TGV|Manoir d’Honneur/.test(p.name)),
    'no place from the demo');
  r.check(store.reconstructedVenues.length === 0,
    'and no reconstructed venue copied from the demo constants',
    String(store.reconstructedVenues.length));

  // The identity model is derived from the GENERATED agents, not inherited.
  r.check(store.persons.length === store.agents.length,
    'its people are exactly the projection of its own agents',
    `${store.persons.length} personnes / ${store.agents.length} agents`);

  // ---------------------------------------------------------------------------
  console.log('\n[3/5] Two generated worlds share no mutable state');
  // ---------------------------------------------------------------------------
  const traveller = store.createPerson({ displayName: 'VOYAGEUR ALPHA', asGuest: true, rsvp: 'pending' });
  const song = store.createTrack({ title: 'HYMNE ALPHA', artist: 'Alpha' });
  store.saveCurrentState();
  r.check(Boolean(traveller) && Boolean(song), 'A can be edited like any project');
  const aPlace = store.places[0];
  aPlace.name = 'TOKYO RENOMMÉ PAR A';
  store.saveCurrentState();

  store.createWorldWithAi({ prompt: 'SECOND MONDE IA', worldType: 'concert', title: 'SECOND MONDE IA' });
  const worldB = store.currentProject.id;
  r.check(worldB !== worldA, 'the second world is another project', worldB);
  r.check(!store.persons.some((p) => /VOYAGEUR ALPHA/.test(p.displayName)),
    'A\u2019s person did not leak into B');
  r.check(!store.tracks.some((t) => t.title === 'HYMNE ALPHA'), 'A\u2019s track did not leak into B');
  r.check(!store.places.some((p) => p.name === 'TOKYO RENOMMÉ PAR A'),
    'and A\u2019s renamed place did not leak into B — no shared object');

  // Same archetype twice: entities must be fresh instances, never shared.
  store.createWorldWithAi({ prompt: 'TROISIÈME', worldType: 'travel', title: 'TROISIÈME' });
  const worldC = store.currentProject.id;
  const cPlace = store.places[0];
  cPlace.name = 'TOKYO RENOMMÉ PAR C';
  store.saveCurrentState();
  store.loadProject(worldA);
  r.check(store.places[0].name === 'TOKYO RENOMMÉ PAR A',
    'two worlds of the SAME archetype hold independent objects',
    store.places[0].name);
  void worldC;

  // ---------------------------------------------------------------------------
  console.log('\n[4/5] Empty stays empty, and the demo stays the demo');
  // ---------------------------------------------------------------------------
  store.loadProject(worldB);
  const bPlaces = store.places.length;
  const bGuests = store.guests.length;
  r.check(bGuests === 0, 'a generated world with no guest keeps none', String(bGuests));

  const reloaded = await reload();
  r.check(reloaded.currentProject.id === worldB, 'a reload restores the generated world',
    reloaded.currentProject.id);
  r.check(reloaded.places.length === bPlaces && reloaded.guests.length === 0,
    'with its own entities, and its empty lists still empty',
    `places=${reloaded.places.length} guests=${reloaded.guests.length}`);
  r.check(!reloaded.persons.some((p) => /Clara Dubois/.test(p.displayName)),
    'the demo does not creep back in through a fallback');

  reloaded.loadProject(worldA);
  r.check(reloaded.persons.some((p) => /VOYAGEUR ALPHA/.test(p.displayName)),
    'A still has what was created in it');
  reloaded.loadProject(demoId);
  r.check(reloaded.places.length === demoCounts.places
    && reloaded.persons.length === demoCounts.persons
    && reloaded.guests.length === demoCounts.guests,
    'and the demo is byte-for-byte the demo',
    `${reloaded.places.length}/${reloaded.persons.length}/${reloaded.guests.length}`);

  // ---------------------------------------------------------------------------
  console.log('\n[5/5] What the code actually does, and what the UI offers');
  // ---------------------------------------------------------------------------
  {
    const storeSrc = readFileSync(path.join(SRC, 'game', 'weddingStore.ts'), 'utf8');
    const engine = readFileSync(path.join(SRC, 'game', 'worldEngine.ts'), 'utf8');
    const lab = readFileSync(path.join(SRC, 'components', 'ui', 'WorldLabModal.tsx'), 'utf8');
    const menu = readFileSync(path.join(SRC, 'components', 'ui', 'BrandMenuModal.tsx'), 'utf8');

    r.check(/applyDomain\(this, null, createEmptyDomainState\(\)\);[\s\S]{0,400}this\.places = generated\.places/
      .test(storeSrc),
      'createWorldWithAi builds on an empty domain before placing its entities');
    r.check(!/this\.reconstructedVenues = \[\.\.\.INITIAL_RECONSTRUCTED_VENUES\]/.test(storeSrc),
      'it no longer copies demo constants by reference');

    // The name promises AI. The code is a local deterministic generator.
    r.check(!/fetch\s*\(|openai|anthropic|api\.|http/i.test(
      engine.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')),
      'the generator performs no network call — there is no model behind it');
    r.check(!/Math\.random\(/.test(engine), 'and it is deterministic');
    r.check(/WORLD_ARCHETYPES\.find\(\(a\) => a\.id === params\.worldType\)/.test(engine),
      'it selects a hardcoded archetype from the world type');

    r.check(/store\.createWorldWithAi\(/.test(lab), 'the World Lab is what calls it');

    // A generated world has real coordinates; the 3D scene must show them.
    const markers = readFileSync(path.join(SRC, 'components', '3d', 'PlaceMarkers.tsx'), 'utf8');
    const world3d = readFileSync(path.join(SRC, 'components', '3d', 'WeddingWorld.tsx'), 'utf8');
    const estate = readFileSync(path.join(SRC, 'components', '3d', 'EstateEnvironment.tsx'), 'utf8');
    r.check(/store\.places\.filter\(\(p\) => !ESTATE_PLACE_IDS\.includes\(p\.id\)\)/.test(markers),
      'places the hand-built estate does not depict are still projected in space');
    r.check(/<PlaceMarkers \/>/.test(world3d), 'and the World mounts them');
    r.check(/planeGeometry args=\{\[260, 220\]\}[\s\S]{0,400}gridHelper/.test(estate),
      'the ground and the grid remain for every project, demo or not');
    r.check(/getStoredProjects\(\)/.test(menu) && /store\.loadProject\(p\.id\)/.test(menu),
      'and every generated world is reachable again from the project list');
  }

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll generated-world checks passed.\u001b[0m\n');
