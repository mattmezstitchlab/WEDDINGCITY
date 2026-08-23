#!/usr/bin/env node
/**
 * AIME — Mirror × Canvas integration guard (Phase E).
 *
 * The regression this phase exists to prevent: clicking "Modifier" in the
 * editorial site used to eject the user into the 3D world. The Canvas is a
 * MODE, not a place — it must compose on top of whichever projection is open.
 *
 * Also asserts the two shells share one core: same mutations, same validation,
 * same save state, same undo/redo, same ids, one World Model.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — Mirror × Canvas guard\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

const storage = createMemoryStorage();
let boots = 0;
async function boot(fresh = false) {
  installBrowserGlobals(storage);
  const un = silence();
  const m = await harness.load('weddingStore', fresh ? `me${++boots}` : undefined);
  un();
  return m.weddingStore;
}

try {
  const store = await boot();
  const proj = await harness.loadPath('projections/worldModel');
  const un = silence();

  // -------------------------------------------------------------------------
  console.log('\n[1/6] Opening the Canvas never changes the projection');
  // -------------------------------------------------------------------------
  {
    store.setProjection('mirror');
    store.openCanvas();
    r.check(store.projection === 'mirror',
      'from Mirror, opening the Canvas STAYS in Mirror (the Phase D regression)',
      `projection=${store.projection}`);
    r.check(store.getCanvasShell() === 'mirror', 'the editorial shell is selected');
    store.closeCanvas();

    store.setProjection('world');
    store.openCanvas();
    r.check(store.projection === 'world', 'from World, opening the Canvas stays in World');
    r.check(store.getCanvasShell() === 'world', 'the side-panel shell is selected');
    store.closeCanvas();
  }

  // -------------------------------------------------------------------------
  console.log('\n[2/6] Mirror → Canvas focuses the right entity, by id');
  // -------------------------------------------------------------------------
  {
    store.setProjection('mirror');
    const model = proj.projectWorldModel();

    const cases = [
      { kind: 'person', id: model.guests.guests[0].personId, tab: 'people' },
      { kind: 'vendor', id: model.vendors.vendors[0].vendorId, tab: 'vendors' },
      { kind: 'place', id: model.places.places[0].placeId, tab: 'places' },
      { kind: 'event', id: model.programme.moments[0].phaseId, tab: 'programme' },
      { kind: 'song', id: model.music.songs[0].songId, tab: 'music' },
    ];

    for (const c of cases) {
      store.openCanvas({ kind: c.kind, id: c.id });
      r.check(store.canvasOpen && store.canvasFocus?.kind === c.kind && store.canvasFocus?.id === c.id,
        `Mirror → Canvas on a ${c.kind} focuses exactly that entity`,
        JSON.stringify(store.canvasFocus));
      r.check(store.projection === 'mirror', `…and stays in Mirror for a ${c.kind}`);
    }

    // The tab mapping lives in the core, shared by both shells.
    const core = readFileSync(path.join(SRC, 'components', 'canvas', 'CanvasCore.tsx'), 'utf8');
    for (const c of cases) {
      if (c.kind === 'event') continue;
      r.check(new RegExp(`case '${c.kind}': return '${c.tab}'`).test(core),
        `focus on a ${c.kind} maps to the ${c.tab} surface`);
    }
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/6] Editing from Mirror updates the World Model and Mirror');
  // -------------------------------------------------------------------------
  {
    store.setProjection('mirror');
    const before = proj.projectWorldModel();
    const guest = before.guests.guests.find((g) => g.rsvp !== 'declined');

    store.openCanvas({ kind: 'person', id: guest.personId });
    store.setGuestRsvp(guest.guestId, 'declined');

    const after = proj.projectWorldModel();
    const updated = after.guests.guests.find((g) => g.guestId === guest.guestId);
    r.check(updated.rsvp === 'declined', 'the mutation reached the World Model');
    r.check(after.guests.counts.byRsvp.declined === store.getRsvpSummary().declined,
      'the Mirror aggregates re-derive from the store');
    r.check(store.projection === 'mirror', 'the user was not ejected while editing');
    r.check(store.saveState === 'saved', 'the real save state is reported', store.saveState);

    // Inline creation from the editorial surface.
    const created = store.createPerson({ displayName: 'Camille Test', asGuest: true, rsvp: 'pending' });
    r.check(!!created, 'a person can be created from the Canvas');
    r.check(proj.projectGuests().guests.some((g) => g.personId === created.id),
      'the new person appears immediately in the Mirror projection');

    // Undo/redo is shared, not per shell.
    r.check(store.canUndo() && store.undo(), 'undo works from the Mirror shell');
    r.check(!proj.projectGuests().guests.some((g) => g.personId === created.id),
      'undo removed the person from every projection');
    r.check(store.redo() && proj.projectGuests().guests.some((g) => g.personId === created.id),
      'redo restores it');

    store.setGuestRsvp(guest.guestId, guest.rsvp);
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/6] Mirror → World keeps the same entity id');
  // -------------------------------------------------------------------------
  {
    const model = proj.projectWorldModel();
    const withAgent = model.guests.guests.find((g) => g.canShowInWorld);

    store.setProjection('mirror');
    const ok = store.showPersonInWorld(withAgent.personId);
    r.check(ok && store.projection === 'world', 'Mirror → World switches projection');
    r.check(store.selectedEntity?.id === withAgent.agentId,
      'the very same agent id is selected', String(store.selectedEntity?.id));

    store.showPersonInMirror(withAgent.personId);
    r.check(store.projection === 'mirror' && store.mirrorFocusPersonId === withAgent.personId,
      'World → Mirror returns to the same person, keeping context');
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/6] One core, two shells — no duplicated business logic');
  // -------------------------------------------------------------------------
  {
    const files = {
      core: path.join(SRC, 'components', 'canvas', 'CanvasCore.tsx'),
      world: path.join(SRC, 'components', 'canvas', 'WorldCanvasShell.tsx'),
      mirror: path.join(SRC, 'components', 'canvas', 'MirrorCanvasShell.tsx'),
    };
    for (const [name, f] of Object.entries(files)) {
      r.check(existsSync(f), `${name} shell/core exists`);
    }
    r.check(!existsSync(path.join(SRC, 'components', 'canvas', 'CanvasSurface.tsx')),
      'the Phase D monolith is gone, not duplicated');

    const world = readFileSync(files.world, 'utf8');
    const mirror = readFileSync(files.mirror, 'utf8');

    for (const [name, body] of [['WorldCanvasShell', world], ['MirrorCanvasShell', mirror]]) {
      r.check(/<CanvasCore\s+tab=/.test(body), `${name} renders the shared CanvasCore`);
      // Shells must not mutate the model themselves.
      const mutations = /store\.(createPerson|createVendor|createPlace|createTrack|setGuestRsvp|assignGuestToTable|attachVendorToPhase|setPhaseTime|addMedia|linkPersons)\(/.test(body);
      r.check(!mutations, `${name} contains no business mutation`);
      // No local copy of a domain entity.
      r.check(!/useState<[^>]*\b(Guest|Person|Vendor|Place|Track|MediaAsset)\b/.test(body),
        `${name} keeps no local copy of a domain entity`);
    }

    r.check(/beginMutation|createPerson|createVendor/.test(readFileSync(files.core, 'utf8')) === true,
      'the core is where mutations live');
  }

  // -------------------------------------------------------------------------
  console.log('\n[6/6] Editorial structure, navigation and persistence');
  // -------------------------------------------------------------------------
  {
    const site = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorSite.tsx'), 'utf8');
    for (const idx of ['01', '02', '03', '04', '05', '06']) {
      r.check(new RegExp(`index="${idx}"`).test(site), `section ${idx} is numbered in the Mirror`);
    }
    r.check(/<MirrorNav\s+sections=/.test(site), 'the Mirror renders its section navigation');

    const nav = readFileSync(path.join(SRC, 'components', 'mirror', 'MirrorNav.tsx'), 'utf8');
    r.check(/IntersectionObserver/.test(nav), 'the nav highlight follows the section in view');
    r.check(/scrollIntoView/.test(nav), 'the nav scrolls smoothly to a section');
    r.check(/sections\.filter\(\(s\) => s\.available\)/.test(nav),
      'the nav only lists sections that really have data');

    // Canvas must not resurrect the 3D loop while Mirror is on screen.
    const world3d = readFileSync(path.join(SRC, 'components', '3d', 'WeddingWorld.tsx'), 'utf8');
    r.check(/frameloop=\{store\.projection === 'mirror' \? 'never' : 'always'\}/.test(world3d),
      'the 3D frameloop stays suspended in Mirror, Canvas included');

    // Everything survives a reload.
    store.saveCurrentState();
    const reloaded = await boot(true);
    r.check(reloaded.guests.length === store.guests.length, 'guests survive a reload');
    r.check(reloaded.persons.length === store.persons.length, 'persons survive a reload');
  }

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll Mirror × Canvas checks passed.\u001b[0m\n');
