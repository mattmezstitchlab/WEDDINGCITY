#!/usr/bin/env node
/**
 * Wedding City / AIME — projections guard (Phase C).
 *
 * Proves the central claim of the architecture:
 *
 *   ONE World Model → several projections, no duplication, no second store.
 *
 * The success criterion from the brief is tested literally:
 *   World → Mirror → same data → click a person → same identity → back to
 *   World → exactly the same person.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — World / Mirror projections guard\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

try {
  installBrowserGlobals(createMemoryStorage());
  const un = silence();
  // No cache-bust: must be the SAME store instance the read model imports.
  const { weddingStore: store } = await harness.load('weddingStore');
  un();
  // The read model lives in src/projections, outside the game engine.
  const proj = await harness.loadPath('projections/worldModel');

  // -------------------------------------------------------------------------
  console.log('\n[1/5] The World Model derives from the store, and only from it');
  // -------------------------------------------------------------------------
  const m = proj.projectWorldModel();

  r.check(m.hero.coupleNames === store.currentProject.coupleNames,
    'hero couple comes from the project', m.hero.coupleNames);
  r.check(m.hero.locationName === store.currentProject.locationName,
    'hero location comes from the project');
  r.check(m.hero.isoDate === store.currentProject.weddingDate,
    'hero date is the stored date, not reformatted data');
  r.check(m.programme.moments.length === store.phases.length,
    `programme has one moment per real phase (${m.programme.moments.length})`);
  r.check(m.guests.counts.total === store.guests.length,
    `guests count matches the store (${m.guests.counts.total})`);
  r.check(m.guests.counts.tables === store.seatingTables.length,
    'table count matches the store');
  r.check(m.guests.counts.capacity === store.seatingTables.reduce((n, t) => n + t.capacity, 0),
    'capacity is summed from real tables');

  const storeRsvp = store.getRsvpSummary();
  r.check(m.guests.counts.byRsvp.accepted === storeRsvp.accepted
    && m.guests.counts.byRsvp.declined === storeRsvp.declined,
    'RSVP breakdown equals getRsvpSummary()');

  // Derived values must be computed, not stored twice.
  const srcModel = readFileSync(path.join(SRC, 'projections', 'worldModel.ts'), 'utf8');
  r.check(!/Math\.random\(/.test(srcModel), 'the projection contains no randomness');
  r.check(!/=\s*\[\s*\{\s*(?:name|title)\s*:\s*['"]/.test(srcModel),
    'the projection declares no inline fixture data');
  r.check(/weddingStore\./.test(srcModel), 'the projection reads the real store');

  // -------------------------------------------------------------------------
  console.log('\n[2/5] Missing data is reported, never fabricated');
  // -------------------------------------------------------------------------
  const story = m.availability.find((a) => a.id === 'story');
  const gallery = m.availability.find((a) => a.id === 'gallery');
  r.check(story && story.available === false && !!story.reason,
    'the story section is declared unavailable, with a reason', story?.reason);
  r.check(gallery && gallery.available === false && !!gallery.reason,
    'the gallery section is declared unavailable, with a reason');

  const mirrorSrc = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorSite.tsx'), 'utf8');
  r.check(/EmptyState/.test(mirrorSrc), 'Mirror renders honest empty states');
  r.check(!/https?:\/\/[^"']*\.(jpg|png|webp)/i.test(mirrorSrc),
    'Mirror embeds no stock or placeholder imagery');
  const hardFigures = [...mirrorSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/(?:value|count|total)\s*[:=]\s*(\d{2,})/gi)].map((x) => x[0]);
  r.check(hardFigures.length === 0, 'Mirror contains no hardcoded figure',
    hardFigures.slice(0, 3).join(' | '));
  r.check(/presentStatuses/.test(mirrorSrc),
    'Mirror only lists RSVP statuses that actually occur');

  // -------------------------------------------------------------------------
  console.log('\n[3/5] Stable identity across projections');
  // -------------------------------------------------------------------------
  const withAgent = m.guests.guests.find((g) => g.canShowInWorld);
  r.check(!!withAgent, 'at least one projected guest has a spatial projection');
  r.check(store.persons.some((p) => p.id === withAgent.personId),
    'the projected personId resolves to a real Person');
  r.check(store.guests.some((g) => g.id === withAgent.guestId),
    'the projected guestId resolves to a real Guest');
  r.check(store.agents.some((a) => a.id === withAgent.agentId),
    'the projected agentId resolves to a real Agent');

  const noIndexIds = m.guests.guests.every((g) => typeof g.personId === 'string'
    && g.personId.startsWith('person_'));
  r.check(noIndexIds, 'entities are identified by stable id, never by visual index');

  const phaseIdsReal = m.programme.moments.every((x) => store.phases.some((p) => p.id === x.phaseId));
  r.check(phaseIdsReal, 'every programme moment carries a real phaseId');

  // -------------------------------------------------------------------------
  console.log('\n[4/5] The round trip: World → Mirror → World, same person');
  // -------------------------------------------------------------------------
  {
    const personId = withAgent.personId;
    const agentId = withAgent.agentId;

    // WORLD → MIRROR
    store.projection = 'world';
    const okToMirror = store.showPersonInMirror(personId);
    r.check(okToMirror, 'showPersonInMirror succeeds for a real person');
    r.check(store.projection === 'mirror', 'the projection switched to Mirror');
    r.check(store.mirrorFocusPersonId === personId,
      'Mirror is focused on that exact personId', store.mirrorFocusPersonId);

    // Mirror sees the same entity, derived fresh.
    const inMirror = proj.projectGuests().guests.find((g) => g.personId === personId);
    r.check(!!inMirror && inMirror.guestId === withAgent.guestId,
      'Mirror shows the same guest entity');

    // MIRROR → WORLD
    const un2 = silence();
    const okToWorld = store.showPersonInWorld(personId);
    un2();
    r.check(okToWorld, 'showPersonInWorld succeeds');
    r.check(store.projection === 'world', 'the projection switched back to World');
    r.check(store.selectedEntity?.type === 'agent' && store.selectedEntity.id === agentId,
      'World selected exactly the same agent', JSON.stringify(store.selectedEntity));

    const agent = store.agents.find((a) => a.id === agentId);
    r.check(Math.abs(store.cameraTargetPos[0] - agent.currentPos[0]) < 0.001,
      'the camera targets that agent’s real position');

    // A person with no spatial projection must fail honestly.
    const orphan = store.persons.find((p) => !store.getAgentForPerson(p.id));
    if (orphan) {
      r.check(store.showPersonInWorld(orphan.id) === false,
        'a person without a 3D projection reports failure instead of pretending');
    } else {
      r.check(true, 'every person currently has a spatial projection');
    }
    r.check(store.showPersonInWorld('person_does_not_exist') === false,
      'an unknown id is rejected');
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/5] Synchronisation: one mutation, every projection follows');
  // -------------------------------------------------------------------------
  {
    const target = m.guests.guests.find((g) => g.tableId) ?? m.guests.guests[0];
    const before = proj.projectGuests();
    const beforeStatus = before.guests.find((g) => g.guestId === target.guestId).rsvp;

    store.setGuestRsvp(target.guestId, beforeStatus === 'declined' ? 'accepted' : 'declined');

    const after = proj.projectGuests();
    const afterStatus = after.guests.find((g) => g.guestId === target.guestId).rsvp;
    r.check(afterStatus !== beforeStatus,
      'changing the store changes the Mirror projection', `${beforeStatus} → ${afterStatus}`);
    r.check(after.counts.byRsvp[afterStatus] === store.getRsvpSummary()[afterStatus],
      'aggregate counts stay equal to the store after mutation');

    // Moving a table must be reflected too.
    const table = store.seatingTables[0];
    store.assignGuestToTable(target.guestId, table.id);
    const moved = proj.projectGuests().guests.find((g) => g.guestId === target.guestId);
    r.check(moved.tableId === table.id, 'a seating change is reflected in the projection');
    r.check(moved.tableLabel === table.label, 'the projected table label is derived, not stored');

    store.setGuestRsvp(target.guestId, beforeStatus);

    // No second source of truth anywhere in the Mirror tree.
    for (const rel of ['components/mirror/MirrorSite.tsx', 'components/mirror/MirrorPrimitives.tsx']) {
      const body = readFileSync(path.join(SRC, rel), 'utf8');
      r.check(!/useState<[^>]*\b(Guest|Person|Vendor)\b/.test(body),
        `${rel}: keeps no local copy of domain entities`);
    }
    r.check(existsSync(path.join(SRC, 'projections', 'worldModel.ts')),
      'a single shared read model exists');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll projection checks passed.\u001b[0m\n');
