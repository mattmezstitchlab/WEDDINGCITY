#!/usr/bin/env node
/**
 * Wedding City — identity model guard.
 *
 * Asserts the domain model is solid enough that Supabase/OAuth/Google can be
 * plugged in later WITHOUT rebuilding the core:
 *
 *   - every entity has a stable id;
 *   - relations use ids, never roles or display names;
 *   - the migration from legacy agents is complete, additive and IDEMPOTENT;
 *   - the four historical identity bugs are actually fixed.
 */

import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — identity model guard\u001b[0m');

const harness = await compileGameModules();
let boots = 0;
// Web Audio does not exist in Node; the diagnostics bus correctly reports it.
// Silence that expected noise so the report stays readable.
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

async function boot(storage) {
  installBrowserGlobals(storage);
  const restore = silence();
  const mod = await harness.load('weddingStore', `id${++boots}`);
  restore();
  return mod.weddingStore;
}

try {
  // -------------------------------------------------------------------------
  console.log('\n[1/6] Migration derives the model from legacy agents');
  // -------------------------------------------------------------------------
  const storage = createMemoryStorage();
  const store = await boot(storage);
  const report = store.lastMigrationReport;

  r.check(!!report?.ran, 'the identity migration ran at startup');
  r.check(store.persons.length === store.agents.length,
    `a Person exists for every Agent (${store.persons.length} = ${store.agents.length})`);
  r.check(store.guests.length > 0, `Guest entities were created (${store.guests.length})`);
  r.check(store.vendors.length > 0, `Vendor entities were created (${store.vendors.length})`);
  r.check(store.seatingTables.length > 0, `seating tables were created (${store.seatingTables.length})`);
  r.check(store.invitations.length > 0, 'the project invite code became an Invitation record');
  r.check(store.agents.every((a) => !!a.personId), 'every agent carries a personId back-reference');

  // Legacy data preserved: nothing deleted by the migration.
  r.check(store.agents.length > 0 && store.docs.length > 0 && store.tracks.length > 0,
    'legacy demo collections are intact (agents, docs, tracks)');

  // -------------------------------------------------------------------------
  console.log('\n[2/6] Every entity has a stable id and relations use ids');
  // -------------------------------------------------------------------------
  const collections = {
    persons: store.persons, accounts: store.accounts, guests: store.guests,
    vendors: store.vendors, seatingTables: store.seatingTables,
    memberships: store.memberships, invitations: store.invitations,
    dmcIdentities: store.dmcIdentities,
  };
  for (const [name, list] of Object.entries(collections)) {
    const missing = list.filter((e) => typeof e.id !== 'string' || e.id.length === 0);
    const dupes = list.map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
    r.check(missing.length === 0 && dupes.length === 0,
      `${name}: ${list.length} entities, all with unique stable ids`,
      `missing=${missing.length} dupes=${[...new Set(dupes)].join(',')}`);
  }

  r.check(store.guests.every((g) => typeof g.personId === 'string' && g.personId.startsWith('person_')),
    'Guest → Person is an id reference');
  r.check(store.vendors.every((v) => !v.contactPersonId || v.contactPersonId.startsWith('person_')),
    'Vendor → contact Person is an id reference');
  r.check(store.dmcIdentities.every((d) => d.ownerPersonId.startsWith('person_')),
    'DMCIdentity → owner Person is an id reference');

  // -------------------------------------------------------------------------
  console.log('\n[3/6] Migration is idempotent and survives a reload');
  // -------------------------------------------------------------------------
  const before = {
    persons: store.persons.length, guests: store.guests.length,
    vendors: store.vendors.length, tables: store.seatingTables.length,
  };
  store.ensureIdentityModel();
  store.ensureIdentityModel();
  r.check(
    store.persons.length === before.persons && store.guests.length === before.guests &&
    store.vendors.length === before.vendors && store.seatingTables.length === before.tables,
    'running the migration twice more creates nothing (deterministic ids)',
    JSON.stringify({ after: store.persons.length, before: before.persons }));

  store.saveCurrentState();
  const reloaded = await boot(storage);
  r.check(reloaded.persons.length === before.persons, 'persons survive a reload',
    `${reloaded.persons.length} vs ${before.persons}`);
  r.check(reloaded.guests.length === before.guests, 'guests survive a reload');
  r.check(reloaded.vendors.length === before.vendors, 'vendors survive a reload');
  r.check(reloaded.currentPersonId === store.currentPersonId, 'the session person survives a reload');

  // Legacy v2 snapshot (no identity fields) must still migrate cleanly.
  {
    const legacyStorage = createMemoryStorage();
    const seed = await boot(createMemoryStorage());
    const v2 = {
      schemaVersion: 2, project: seed.currentProject, time: 16, savedAt: '2025-01-01T00:00:00.000Z',
      userIdentity: seed.userIdentity, userDmcIdentity: seed.userDmcIdentity,
      places: seed.places, agents: seed.agents.map(({ personId, ...rest }) => rest),
      docs: seed.docs, tasks: seed.tasks, conflicts: seed.conflicts, phases: seed.phases,
      tracks: seed.tracks, reconstructedVenues: seed.reconstructedVenues,
      placedObjects: seed.placedObjects, adSlots: seed.adSlots,
    };
    legacyStorage.setItem('wedding_city_projects_v1', JSON.stringify([seed.currentProject]));
    legacyStorage.setItem('wedding_city_active_project_id_v1', seed.currentProject.id);
    legacyStorage.setItem(`wedding_city_state_${seed.currentProject.id}`, JSON.stringify(v2));

    const upgraded = await boot(legacyStorage);
    r.check(upgraded.persons.length > 0 && upgraded.guests.length > 0,
      'a v2 snapshot with no identity data is migrated on load',
      `persons=${upgraded.persons.length} guests=${upgraded.guests.length}`);
    r.check(upgraded.agents.length === v2.agents.length && upgraded.docs.length === v2.docs.length,
      'the v2 legacy data itself is preserved, not replaced');
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/6] The four historical identity bugs are fixed');
  // -------------------------------------------------------------------------
  {
    // (a) Identity bound to a PERSON, not a role.
    const me = store.currentPersonId;
    const myAgent = store.getAgentForPerson(me);
    r.check(!!myAgent, 'the session person maps to exactly one agent', `agent=${myAgent?.id}`);
    r.check(store.isCurrentUserAgent(myAgent.id), 'that agent is recognised as the current user');

    // Inject a SECOND agent with the same role: under the old role-matching
    // logic both would have rendered as the connected user.
    const twin = { ...myAgent, id: `${myAgent.id}_twin`, name: 'Clone du même rôle', personId: undefined };
    store.agents.push(twin);
    store.ensureIdentityModel();
    const sameRole = store.agents.filter((a) => a.role === myAgent.role);
    r.check(sameRole.length >= 2, `${sameRole.length} agents now share the role "${myAgent.role}"`);
    r.check(store.isCurrentUserAgent(myAgent.id) && !store.isCurrentUserAgent(twin.id),
      'only the real person is the user, despite an identical role (the role-binding bug)');
    store.agents = store.agents.filter((a) => a.id !== twin.id);
    store.persons = store.persons.filter((p) => p.agentId !== twin.id);
    store.guests = store.guests.filter((g) => store.persons.some((p) => p.id === g.personId));
    store.vendors = store.vendors.filter((v) => !v.agentId || store.agents.some((a) => a.id === v.agentId));

    // (b) Playlist votes are per person.
    const track = store.tracks[0];
    store.trackVotes = [];
    track.hasVoted = false;
    const votesBefore = track.votes;
    const unmute = silence();
    store.voteTrack(track.id);
    unmute();
    r.check(store.hasPersonVoted(track.id, me), 'the current person is recorded as having voted');
    r.check(track.votes === votesBefore + 1, 'the vote counter increments');
    const otherPerson = store.persons.find((p) => p.id !== me).id;
    r.check(!store.hasPersonVoted(track.id, otherPerson),
      'another person is NOT marked as having voted (the global-boolean bug)');
    const unmute2 = silence();
    store.voteTrack(track.id);
    unmute2();
    r.check(track.votes === votesBefore + 1, 'the same person cannot vote twice');

    // (c) Guest entity with RSVP.
    const guest = store.guests[0];
    r.check(store.setGuestRsvp(guest.id, 'declined', 'empêchement'), 'RSVP can be set');
    r.check(store.guests.find((g) => g.id === guest.id).rsvp.status === 'declined',
      'the RSVP status is stored on the Guest entity');
    const summary = store.getRsvpSummary();
    r.check(summary.total === store.guests.length && summary.declined >= 1,
      'the RSVP summary is computed from real data', JSON.stringify(summary));
    store.setGuestRsvp(guest.id, 'accepted');

    // (d) Invitations are records with a lifecycle.
    const inv = store.createInvitationForProject('planner');
    r.check(!!store.getInvitationByCode(inv.code), 'a created invitation is retrievable by code');
    r.check(inv.status === 'pending' && inv.scope === 'local',
      'a new invitation is pending and honestly scoped as local',
      `status=${inv.status} scope=${inv.scope}`);
    r.check(store.acceptInvitation(inv.code).ok, 'an invitation can be accepted');
    r.check(store.getInvitationByCode(inv.code).status === 'accepted',
      'acceptance is persisted on the invitation record');
    r.check(store.acceptInvitation('WC-NOPE').reason === 'unknown',
      'an unknown code fails explicitly');
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/6] Seating, capacity and capabilities');
  // -------------------------------------------------------------------------
  {
    const table = store.addSeatingTable(2);
    const [g1, g2, g3] = store.guests;
    r.check(store.assignGuestToTable(g1.id, table.id), 'a guest can be seated');
    r.check(store.guests.find((g) => g.id === g1.id).seating.tableId === table.id,
      'the seat assignment is stored by table id');
    r.check(store.assignGuestToTable(g2.id, table.id), 'a second guest fits a 2-seat table');
    r.check(!store.assignGuestToTable(g3.id, table.id),
      'a third guest is REFUSED: capacity is actually enforced');
    r.check(!store.assignGuestToTable(g3.id, 'table_does_not_exist'),
      'seating at an unknown table is refused');
    const occ = store.getTableOccupancy(table.id);
    r.check(occ.seated === 2 && occ.capacity === 2, 'occupancy is computed from real assignments',
      JSON.stringify(occ));
    store.assignGuestToTable(g1.id, null);
    store.assignGuestToTable(g2.id, null);

    const caps = store.getCurrentCapabilities();
    r.check(Array.isArray(caps) && caps.length > 0, `capabilities resolve (${caps.length})`);
    r.check(typeof store.can('playlist.vote') === 'boolean',
      'can() gives the UI a single place to ask about permissions');
  }

  // -------------------------------------------------------------------------
  console.log('\n[6/6] Referential integrity across the whole model');
  // -------------------------------------------------------------------------
  {
    const { checkReferentialIntegrity, describeBrokenReferences } = await harness.load('integrity', 'ig1');
    const input = {
      persons: store.persons, accounts: store.accounts, guests: store.guests,
      vendors: store.vendors, dmcIdentities: store.dmcIdentities,
      seatingTables: store.seatingTables, memberships: store.memberships,
      invitations: store.invitations, trackVotes: store.trackVotes, tracks: store.tracks,
      currentPersonId: store.currentPersonId,
      places: store.places, agents: store.agents, docs: store.docs,
      tasks: store.tasks, conflicts: store.conflicts, phases: store.phases,
    };
    const rep = checkReferentialIntegrity(input);
    r.check(rep.ok, `all ${rep.checkedReferences} references resolve (identity + world)`,
      describeBrokenReferences(rep.broken, 8));

    // The checker must detect an identity break, not just world breaks.
    const bad = checkReferentialIntegrity({
      ...input,
      guests: [{ ...store.guests[0], personId: 'person_ghost', seating: { tableId: 'table_ghost' } }],
    });
    r.check(!bad.ok && bad.broken.some((b) => b.missingId === 'person_ghost'),
      'a dangling Guest → Person reference is detected');
    r.check(bad.broken.some((b) => b.missingId === 'table_ghost'),
      'a dangling Guest → SeatingTable reference is detected');

    // The graph must classify vendors from the MODEL, not from roles.
    const G = await harness.load('nerveGraph', 'ng9');
    const graph = G.buildNerveGraph({
      guests: store.guests, vendors: store.vendors, seatingTables: store.seatingTables,
      places: store.places, agents: store.agents, docs: store.docs,
      tasks: store.tasks, phases: store.phases,
    });
    const vendorNodes = graph.nodes.filter((n) => n.kind === 'vendor');
    r.check(vendorNodes.length === store.vendors.filter((v) => v.agentId).length,
      `graph vendor nodes come from the Vendor entities (${vendorNodes.length})`);
    r.check(graph.edges.length > 0 && graph.edges.every((e) => graph.byId.has(e.from) && graph.byId.has(e.to)),
      'the graph still contains no phantom edges after the refactor');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll identity model checks passed.\u001b[0m\n');
