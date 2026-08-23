#!/usr/bin/env node
/**
 * AIME — Canvas composition guard (Phase D).
 *
 * Runs the brief's §27 scenario literally:
 *   create a person → seat them → attach to a moment → create a relationship
 *   → add a media → attach a vendor → attach a song → save
 * then verifies the result in World, in Mirror, in the store, and AFTER RELOAD.
 *
 * Also verifies that invalid mutations are refused rather than silently
 * corrupting the model.
 */

import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — Canvas composition guard\u001b[0m');

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
  const m = await harness.load('weddingStore', fresh ? `cv${++boots}` : undefined);
  un();
  return m.weddingStore;
}

try {
  const store = await boot();
  const proj = await harness.loadPath('projections/worldModel');
  const un = silence();

  // -------------------------------------------------------------------------
  console.log('\n[1/6] Invalid mutations are refused');
  // -------------------------------------------------------------------------
  r.check(store.createPerson({ displayName: '   ' }) === null, 'a person with a blank name is refused');
  r.check(store.createPerson({ displayName: 'X', tableId: 'table_ghost' }) === null,
    'a person seated at a non-existent table is refused');
  r.check(store.createVendor({ companyName: '', category: 'autre' }) === null,
    'a vendor with no name is refused');
  r.check(store.createVendor({ companyName: 'V', category: 'autre', placeIds: ['place_ghost'] }) === null,
    'a vendor attached to a non-existent place is refused');
  r.check(store.createPlace({ name: '' }) === null, 'a place with no name is refused');
  r.check(store.createTrack({ title: 'T', artist: '' }) === null, 'a track with no artist is refused');
  r.check(store.createTrack({ title: 'T', artist: 'A', phaseId: 'phase_ghost' }) === null,
    'a track linked to a non-existent phase is refused');
  r.check(store.setPhasePlace(store.phases[0].id, 'place_ghost') === false,
    'attaching a moment to a non-existent place is refused');
  r.check(store.attachVendorToPhase('phase_ghost', store.vendors[0].id) === false,
    'attaching a vendor to a non-existent moment is refused');
  r.check(store.setPhaseTime(store.phases[0].id, 10, 9) === false, 'an inverted time window is refused');
  r.check(store.addMedia({ kind: 'image', source: 'x', ownerKind: 'person', ownerId: 'person_ghost' }) === null,
    'a media attached to nothing is refused');
  r.check(store.linkPersons(store.persons[0].id, store.persons[0].id, 'friend') === null,
    'a self-relationship is refused');

  // -------------------------------------------------------------------------
  console.log('\n[2/6] The §27 composition scenario');
  // -------------------------------------------------------------------------
  const table = store.seatingTables[0];
  const phase = store.phases[2];
  const vendor = store.vendors[0];

  const person = store.createPerson({
    displayName: 'Paul Martin', asGuest: true, rsvp: 'accepted',
    dietary: 'Végétarien', side: 'groom', tableId: table.id,
  });
  r.check(!!person && person.id.startsWith('person_'), 'a real Person is created with a stable id');

  const guest = store.guests.find((g) => g.personId === person.id);
  r.check(!!guest, 'the Guest facet is created alongside');
  r.check(guest.seating.tableId === table.id, 'the guest is seated at the chosen table');
  r.check(guest.rsvp.status === 'accepted' && guest.dietary === 'Végétarien',
    'RSVP and dietary are stored on the Guest entity');

  const other = store.persons.find((p) => p.id !== person.id);
  const rel = store.linkPersons(person.id, other.id, 'friend');
  r.check(!!rel, 'a relationship to another real person is created');

  const media = store.addMedia({
    kind: 'image', source: 'data:image/png;base64,AAAA', ownerKind: 'person',
    ownerId: person.id, title: 'Portrait Paul',
  });
  r.check(!!media, 'a media is attached to that person');

  r.check(store.attachVendorToPhase(phase.id, vendor.id), 'a vendor is attached to the moment');
  const track = store.createTrack({ title: 'Test Song', artist: 'Test Artist', phaseId: phase.id });
  r.check(!!track, 'a song is created and linked to the moment');
  r.check(store.setPhaseNotes(phase.id, 'Note de composition'), 'the moment carries a note');

  r.check(store.saveState === 'saved', 'the save state reflects a REAL successful write', store.saveState);

  // -------------------------------------------------------------------------
  console.log('\n[3/6] Everything exists in the projections');
  // -------------------------------------------------------------------------
  const model = proj.projectWorldModel();

  const inGuests = model.guests.guests.find((g) => g.personId === person.id);
  r.check(!!inGuests, 'MIRROR: the new person appears in the guests projection');
  r.check(inGuests.tableLabel === table.label, 'MIRROR: their table is projected');
  r.check(inGuests.dietary === 'Végétarien', 'MIRROR: their dietary is projected');

  const moment = model.programme.moments.find((m) => m.phaseId === phase.id);
  r.check(moment.vendors.some((v) => v.vendorId === vendor.id && v.explicit),
    'MIRROR: the vendor appears on the moment, marked as explicitly attached');
  r.check(moment.songs.some((sg) => sg.songId === track.id),
    'MIRROR: the song appears on the moment');
  r.check(moment.notes === 'Note de composition', 'MIRROR: the note is projected');

  r.check(model.gallery.some((g) => g.mediaId === media.id),
    'MIRROR: the media appears in the gallery projection');
  r.check(model.availability.find((a) => a.id === 'gallery').available === true,
    'MIRROR: the gallery section becomes available');

  r.check(proj.projectRelationships(person.id).some((x) => x.otherPersonId === other.id),
    'the relationship is projected');

  // WORLD: a person created in Canvas has no agent yet — reported, not faked.
  r.check(store.showPersonInWorld(person.id) === false,
    'WORLD: a person with no spatial projection reports it instead of pretending');
  const seated = store.getAgentForPerson(other.id);
  if (seated) {
    r.check(store.showPersonInWorld(other.id) === true, 'WORLD: an existing person is focusable');
  } else {
    r.check(true, 'WORLD: no comparable agent to focus');
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/6] Single source of truth + integrity');
  // -------------------------------------------------------------------------
  const { checkReferentialIntegrity, describeBrokenReferences } = await harness.load('integrity');
  const rep = checkReferentialIntegrity({
    persons: store.persons, accounts: store.accounts, guests: store.guests,
    vendors: store.vendors, dmcIdentities: store.dmcIdentities,
    seatingTables: store.seatingTables, memberships: store.memberships,
    invitations: store.invitations, trackVotes: store.trackVotes,
    media: store.media, relationships: store.relationships,
    tracks: store.tracks, tracksFull: store.tracks, projectId: store.currentProject.id,
    currentPersonId: store.currentPersonId,
    places: store.places, agents: store.agents, docs: store.docs,
    tasks: store.tasks, conflicts: store.conflicts, phases: store.phases,
  });
  r.check(rep.ok, `integrity holds after composition (${rep.checkedReferences} refs)`,
    describeBrokenReferences(rep.broken, 5));

  const personCount = store.persons.filter((p) => p.id === person.id).length;
  r.check(personCount === 1, 'the person exists exactly once — no duplication across projections');

  // -------------------------------------------------------------------------
  console.log('\n[5/6] Undo / redo operate on the World Model');
  // -------------------------------------------------------------------------
  const beforeUndo = store.phases.find((p) => p.id === phase.id).notes;
  r.check(store.canUndo(), 'history recorded the mutations');
  r.check(store.undo(), 'undo succeeds');
  r.check(store.phases.find((p) => p.id === phase.id).notes !== beforeUndo,
    'undo really reverted the last mutation');
  r.check(store.canRedo() && store.redo(), 'redo succeeds');
  r.check(store.phases.find((p) => p.id === phase.id).notes === beforeUndo,
    'redo restored the mutation');

  // -------------------------------------------------------------------------
  console.log('\n[6/6] Everything survives a reload');
  // -------------------------------------------------------------------------
  store.saveCurrentState();
  const reloaded = await boot(true);

  r.check(reloaded.persons.some((p) => p.id === person.id), 'the person survives a reload');
  const g2 = reloaded.guests.find((g) => g.personId === person.id);
  r.check(g2?.seating.tableId === table.id, 'the seating survives a reload');
  r.check(g2?.dietary === 'Végétarien', 'the dietary survives a reload');
  r.check(reloaded.relationships.some((x) => x.id === rel.id), 'the relationship survives a reload');
  r.check(reloaded.media.some((m) => m.id === media.id), 'the media survives a reload');
  r.check(reloaded.tracks.some((t) => t.id === track.id), 'the track survives a reload');
  r.check(reloaded.phases.find((p) => p.id === phase.id)?.vendorIds?.includes(vendor.id),
    'the vendor attachment survives a reload');
  r.check(reloaded.phases.find((p) => p.id === phase.id)?.notes === 'Note de composition',
    'the moment note survives a reload');

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll Canvas composition checks passed.\u001b[0m\n');
