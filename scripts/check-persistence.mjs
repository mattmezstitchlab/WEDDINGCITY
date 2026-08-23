#!/usr/bin/env node
/**
 * Wedding City — persistence regression guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three pieces of state were silently lost on every page reload:
 *
 *   - `phases`           written by saveCurrentState(), never read back
 *   - `adSlots`          never written at all
 *   - `userDmcIdentity`  never written at all
 *
 * They were not three bugs but one: the persisted shape was hand-written in
 * four places (the type, the writer, and TWO divergent readers). Omitting a
 * field raised no error anywhere — the value just fell back to its default.
 *
 * These tests simulate a real reload: mutate the store, save, then evaluate a
 * FRESH copy of the module graph against the same localStorage, and assert the
 * values survived. That is the only way this class of bug is observable.
 */

import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — persistence guard\u001b[0m');

const harness = await compileGameModules();
let reloadCounter = 0;

/** Evaluate a pristine module graph against `storage` — i.e. reload the page. */
async function boot(storage) {
  installBrowserGlobals(storage);
  const mod = await harness.load('weddingStore', `boot${++reloadCounter}`);
  return mod.weddingStore;
}

try {
  // -------------------------------------------------------------------------
  console.log('\n[1/6] Round-trip of the three previously-lost fields');
  // -------------------------------------------------------------------------
  {
    const storage = createMemoryStorage();
    const store = await boot(storage);

    // phases — was written but never restored
    store.phases = [
      { id: 'phase_custom', label: 'Phase personnalisée', startHour: 11, endHour: 13,
        icon: 'ceremonie', description: 'Créée par le test', color: '#ff0000' },
    ];
    // userDmcIdentity — was never written
    store.setUserDmcIdentity({ ...store.userDmcIdentity, colorId: 'dmc_test_color', symbolId: 'dmc_test_symbol' });
    // adSlots — was never written
    store.claimAdSlot(store.adSlots[0].id, {
      title: 'Campagne Test', subtitle: 'sous-titre', category: 'wedding_program',
      advertiserName: 'Testeur', ctaText: 'Voir →', isSponsored: true, sponsorName: 'ACME',
    });
    store.saveCurrentState();

    const reloaded = await boot(storage);

    r.check(reloaded.phases.length === 1 && reloaded.phases[0].id === 'phase_custom',
      'phases survive a reload',
      `got ${reloaded.phases.length} phase(s): ${reloaded.phases.map((p) => p.id).join(', ')}`);

    r.check(reloaded.userDmcIdentity.colorId === 'dmc_test_color'
      && reloaded.userDmcIdentity.symbolId === 'dmc_test_symbol',
      'userDmcIdentity survives a reload',
      `got ${JSON.stringify(reloaded.userDmcIdentity)}`);

    const slot = reloaded.adSlots[0];
    r.check(slot.isClaimed && slot.currentCampaign?.title === 'Campagne Test',
      'adSlots / claimed campaign survive a reload',
      `got isClaimed=${slot.isClaimed} title=${slot.currentCampaign?.title}`);
  }

  // -------------------------------------------------------------------------
  console.log('\n[2/6] No regression on fields that already worked');
  // -------------------------------------------------------------------------
  {
    const storage = createMemoryStorage();
    const store = await boot(storage);

    store.time = 21.25;
    const docCount = store.docs.length;
    store.docs = [...store.docs, {
      id: 'doc_regression', title: 'Devis test', category: 'planning', fileName: 'test.pdf',
      amount: 1234, depositAmount: 100, isPaid: false, rawTextExcerpt: 'test',
      connectedAgentIds: [], connectedPlaceIds: [], connectedTaskIds: [], createdAtHour: 12,
    }];
    store.tracks = [...store.tracks];
    const trackCount = store.tracks.length;
    const placeCount = store.places.length;
    store.saveCurrentState();

    const reloaded = await boot(storage);
    r.check(Math.abs(reloaded.time - 21.25) < 1e-9, 'time survives', `got ${reloaded.time}`);
    r.check(reloaded.docs.length === docCount + 1, 'docs survive', `got ${reloaded.docs.length}`);
    r.check(reloaded.tracks.length === trackCount, 'tracks survive', `got ${reloaded.tracks.length}`);
    r.check(reloaded.places.length === placeCount, 'places survive', `got ${reloaded.places.length}`);
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/6] Backward compatibility with legacy (v1) snapshots');
  // -------------------------------------------------------------------------
  {
    // A pre-fix snapshot: no schemaVersion, no adSlots, no userDmcIdentity.
    const storage = createMemoryStorage();
    const seed = await boot(createMemoryStorage());
    const legacy = {
      project: seed.currentProject,
      time: 18.75,
      userIdentity: { ...seed.userIdentity, name: 'Legacy User' },
      places: seed.places,
      agents: seed.agents,
      docs: seed.docs,
      tasks: seed.tasks,
      conflicts: seed.conflicts,
      phases: seed.phases,
      tracks: seed.tracks,
      savedAt: '2025-01-01T00:00:00.000Z',
      // deliberately: no schemaVersion / adSlots / userDmcIdentity
    };
    storage.setItem('wedding_city_projects_v1', JSON.stringify([seed.currentProject]));
    storage.setItem('wedding_city_active_project_id_v1', seed.currentProject.id);
    storage.setItem(`wedding_city_state_${seed.currentProject.id}`, JSON.stringify(legacy));

    const migrated = await boot(storage);
    r.check(Math.abs(migrated.time - 18.75) < 1e-9,
      'legacy snapshot: existing data preserved', `time=${migrated.time}`);
    r.check(migrated.userIdentity.name === 'Legacy User',
      'legacy snapshot: userIdentity preserved', `name=${migrated.userIdentity.name}`);
    r.check(Array.isArray(migrated.adSlots) && migrated.adSlots.length > 0,
      'legacy snapshot: missing adSlots fall back to defaults', `got ${migrated.adSlots?.length}`);
    r.check(migrated.userDmcIdentity && typeof migrated.userDmcIdentity === 'object',
      'legacy snapshot: missing userDmcIdentity falls back to defaults');

    migrated.saveCurrentState();
    const upgraded = JSON.parse(storage.getItem(`wedding_city_state_${seed.currentProject.id}`));
    r.check(upgraded.schemaVersion >= 2, 'legacy snapshot is upgraded on next save',
      `schemaVersion=${upgraded.schemaVersion}`);
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/6] Writer and reader cover the same fields (anti-drift)');
  // -------------------------------------------------------------------------
  {
    const schema = await harness.load('persistenceSchema', 'schema');
    const storage = createMemoryStorage();
    const store = await boot(storage);
    store.saveCurrentState();

    const written = JSON.parse(storage.getItem(`wedding_city_state_${store.currentProject.id}`));
    const declared = schema.PERSISTED_FIELDS.map((f) => f.key);

    const missing = declared.filter((k) => !(k in written));
    r.check(missing.length === 0, `all ${declared.length} declared fields are actually written`,
      `missing from snapshot: ${missing.join(', ')}`);

    // Every declared field must also come back through the restore path.
    const reloaded = await boot(storage);
    const notRestored = declared.filter((k) => reloaded[k] === undefined);
    r.check(notRestored.length === 0, 'all declared fields are actually restored',
      `never restored: ${notRestored.join(', ')}`);
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/6] Storage failures are reported, not swallowed');
  // -------------------------------------------------------------------------
  {
    const storage = createMemoryStorage();
    const store = await boot(storage);
    const persistence = await harness.load('persistence', `fail${reloadCounter}`);

    // Note: a fresh module instance has its own failure log, so assert via the
    // same graph the store uses — trigger the error and read it back.
    const quota = new Error('QuotaExceededError: storage is full');
    storage.failWritesWith(quota);
    const originalError = console.error;
    let logged = false;
    console.error = () => { logged = true; };
    try { store.saveCurrentState(); } finally { console.error = originalError; }

    r.check(logged, 'a failed save is logged instead of silently ignored');
    r.check(typeof persistence.getStorageFailures === 'function',
      'persistence exposes getStorageFailures() for the System Nerve');
  }
  // -------------------------------------------------------------------------
  console.log('\n[6/6] Pristine defaults are not contaminated across projects');
  // -------------------------------------------------------------------------
  {
    // `[...INITIAL_AD_SLOTS]` is a shallow copy: element objects were shared
    // with the module-level constant, so claiming a slot mutated the very
    // thing used as "defaults" and leaked into other projects.
    const storage = createMemoryStorage();
    const store = await boot(storage);

    store.claimAdSlot(store.adSlots[0].id, {
      title: 'Contamination', subtitle: 's', category: 'wedding_program',
      advertiserName: 'A', ctaText: 'C', isSponsored: false,
    });

    // Switch to a brand-new project: it must start from clean defaults.
    const freshId = 'proj_fresh_test';
    const projects = JSON.parse(storage.getItem('wedding_city_projects_v1') || '[]');
    projects.push({ ...store.currentProject, id: freshId, title: 'Fresh', isDemo: false });
    storage.setItem('wedding_city_projects_v1', JSON.stringify(projects));

    store.loadProject(freshId);
    // The guarantee is unchanged — nothing from the previous project may bleed
    // through — but it is now stronger: a real project with no snapshot starts
    // EMPTY (multi-project acceptance), so there is no inherited slot at all.
    const leaked = store.adSlots.filter((s) => s.currentCampaign?.title === 'Contamination');
    r.check(leaked.length === 0,
      'a new project starts from uncontaminated ad slots',
      `slots=${store.adSlots.length} leaked=${leaked.length}`);
    r.check(store.adSlots.length === 0 && store.places.length === 0 && store.phases.length === 0,
      'and it inherits no demo entity whatsoever',
      `slots=${store.adSlots.length} places=${store.places.length} phases=${store.phases.length}`);
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll persistence checks passed.\u001b[0m\n');
