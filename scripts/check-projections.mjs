#!/usr/bin/env node
/**
 * Wedding City — projections guard.
 *
 * The identity model is only worth something if the visible application is a
 * PROJECTION of it. These tests assert the wiring in both directions:
 *
 *   - the UI resolves entities by id (no role matching, no demo leakage);
 *   - editing in the UI mutates the real model, persists, and updates the
 *     projections (3D links, graph, probes);
 *   - the projection probe detects each documented rupture.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — projections guard\u001b[0m');

const harness = await compileGameModules();
let boots = 0;
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};
async function boot(storage) {
  installBrowserGlobals(storage);
  const un = silence();
  const m = await harness.load('weddingStore', `pr${++boots}`);
  un();
  return m.weddingStore;
}

try {
  const storage = createMemoryStorage();
  const store = await boot(storage);

  // -------------------------------------------------------------------------
  console.log('\n[1/5] The UI reads entities by id, not by role or demo data');
  // -------------------------------------------------------------------------
  {
    const inspector = readFileSync(path.join(SRC, 'components', 'ui', 'EntityInspector.tsx'), 'utf8');
    r.check(/store\.getPersonForAgent\(/.test(inspector), 'inspector resolves the Person by agent id');
    r.check(/store\.getGuestForPerson\(/.test(inspector), 'inspector resolves the Guest facet');
    r.check(/store\.getVendorForAgent\(/.test(inspector), 'inspector resolves the Vendor facet');
    r.check(/store\.getDmcForPerson\(/.test(inspector), 'inspector resolves that person’s own DMC');

    // The exact leak found during the audit: every card showed the CURRENT
    // USER's DMC identity, whoever was selected.
    r.check(!/store\.userDmcIdentity\.(symbolGlyph|dmcCode|dmcName)/.test(inspector),
      'inspector no longer displays the current user’s DMC on every person');

    const voxel = readFileSync(path.join(SRC, 'components', '3d', 'VoxelAgents.tsx'), 'utf8');
    r.check(!/agent\.role\s*===\s*weddingStore\.userIdentity\.role/.test(voxel),
      'VoxelAgents no longer matches the user by role');
    r.check(/isCurrentUserAgent\(agent\.id\)/.test(voxel),
      'VoxelAgents identifies the user by person id');

    // Guard the whole UI surface against a regression to role matching.
    const offenders = [];
    for (const rel of ['components/ui/EntityInspector.tsx', 'components/3d/VoxelAgents.tsx',
                       'components/3d/NeuralConnections.tsx', 'components/3d/InteriorVenueView.tsx']) {
      const src = readFileSync(path.join(SRC, rel), 'utf8');
      if (/\.role\s*===\s*[^=]*userIdentity\.role/.test(src)) offenders.push(rel);
    }
    r.check(offenders.length === 0, 'no UI file identifies the user by comparing roles',
      offenders.join(', '));
  }

  // -------------------------------------------------------------------------
  console.log('\n[2/5] Editing mutates the real model and persists');
  // -------------------------------------------------------------------------
  {
    const guest = store.guests[0];
    const person = store.getPerson(guest.personId);
    r.check(!!person, 'the guest resolves to a real person', guest.personId);

    store.setGuestDietary(guest.id, 'Sans lactose');
    store.setGuestSide(guest.id, 'bride');
    store.setGuestRsvp(guest.id, 'tentative');
    store.setPersonContact(person.id, { email: 'test@example.com', phone: '0600000000' });

    const table = store.addSeatingTable(4);
    r.check(store.assignGuestToTable(guest.id, table.id), 'guest seated through the model');

    // Legacy projection kept in sync so existing views stay correct.
    const agent = store.getAgentForPerson(person.id);
    r.check(agent?.dietary === 'Sans lactose', 'the legacy agent.dietary mirror is updated');
    r.check(agent?.assignedTable === table.number, 'the legacy agent.assignedTable mirror is updated');
    r.check(agent?.phone === '0600000000', 'the legacy agent.phone mirror is updated');

    // Persisted across a reload — i.e. a real mutation, not UI state.
    store.saveCurrentState();
    const reloaded = await boot(storage);
    const g2 = reloaded.guests.find((g) => g.id === guest.id);
    r.check(g2?.dietary === 'Sans lactose', 'dietary survives a reload');
    r.check(g2?.side === 'bride', 'side survives a reload');
    r.check(g2?.rsvp.status === 'tentative', 'RSVP survives a reload');
    r.check(g2?.seating.tableId === table.id, 'seating survives a reload');
    r.check(reloaded.getPerson(person.id)?.email === 'test@example.com',
      'person contact survives a reload');

    const vendor = reloaded.vendors[0];
    reloaded.setVendorStatus(vendor.id, 'quoted');
    reloaded.saveCurrentState();
    const reloaded2 = await boot(storage);
    r.check(reloaded2.vendors.find((v) => v.id === vendor.id)?.status === 'quoted',
      'vendor status edit survives a reload');
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/5] DMC identity is a coherent signature');
  // -------------------------------------------------------------------------
  {
    const s2 = await boot(storage);
    const pid = s2.currentPersonId;
    const un = silence();
    s2.setUserDmcIdentity({
      dmcCode: 'DMC 500', dmcName: 'Vert Émeraude Profond', dmcColor: '#1e382b',
      symbolId: 'sym_star', symbolGlyph: '✦', symbolName: 'Étoile Céleste',
    });
    un();
    const record = s2.getDmcForPerson(pid);
    r.check(record?.dmcCode === 'DMC 500', 'the DMC edit writes through to the owned record');
    r.check(s2.getPerson(pid)?.dmcIdentityId === record?.id,
      'the person points at its DMC record');
    s2.saveCurrentState();
    const s3 = await boot(storage);
    r.check(s3.getDmcForPerson(pid)?.dmcCode === 'DMC 500', 'the DMC record survives a reload');
    r.check(s3.userDmcIdentity.dmcCode === 'DMC 500',
      'the avatar signature field stays consistent with the record');
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/5] Selection propagates into the graph (identity relations)');
  // -------------------------------------------------------------------------
  {
    const s4 = await boot(storage);
    const G = await harness.load('nerveGraph', 'pg1');

    // Seat a guest at a table that has a place, so the relation is spatial.
    const place = s4.places[0];
    const table = s4.addSeatingTable(8, place.id);
    const guest = s4.guests.find((g) => s4.getAgentForPerson(g.personId));
    s4.assignGuestToTable(guest.id, table.id);

    const graph = G.buildNerveGraph({
      guests: s4.guests, vendors: s4.vendors, seatingTables: s4.seatingTables,
      places: s4.places, agents: s4.agents, docs: s4.docs, tasks: s4.tasks, phases: s4.phases,
    });
    const agent = s4.getAgentForPerson(guest.personId);
    const node = graph.nodes.find((n) => n.id.endsWith(`:${agent.id}`));
    r.check(!!node, 'the seated guest has a node in the graph');

    const prop = G.propagateFault(graph, node.id, { direction: 'downstream', maxDepth: 3 });
    r.check(prop.affected.size > 1, 'selecting a person reaches related entities',
      `${prop.affected.size} nodes`);
    const layers = prop.byLayer.map((l) => l.kind);
    r.check(layers.includes('place'), 'the chain reaches places/tables', layers.join(','));

    // Vendor zones must come from the Vendor entity.
    const vendorWithZone = s4.vendors.find((v) => v.agentId && v.placeIds.length > 0);
    if (vendorWithZone) {
      const vNode = graph.nodes.find((n) => n.id === `vendor:${vendorWithZone.agentId}`);
      r.check(!!vNode, 'the vendor is classified from the Vendor entity');
      const out = graph.outgoing.get(vNode.id) ?? [];
      r.check(out.some((t) => t.startsWith('place:')),
        'vendor → zone edges exist in the graph', `${out.length} edges`);
    } else {
      r.check(false, 'expected at least one vendor with a zone');
    }
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/5] The projection probe detects each rupture');
  // -------------------------------------------------------------------------
  {
    const s5 = await boot(createMemoryStorage());
    const { systemNerveEngine } = await harness.load('systemNerveEngine', 'pn1');
    const { weddingStore: shared } = await harness.load('weddingStore');
    void s5;

    let check = await systemNerveEngine.runSingleProbe('PROJECTIONS');
    r.check(check.status === 'VERIFIED', 'a coherent model reports VERIFIED', check.summary);
    r.check(check.evidence.length >= 8, 'the probe attaches detailed evidence',
      `${check.evidence.length} items`);

    // (a) Agent without Person.
    shared.agents.push({
      ...shared.agents[0], id: 'agent_orphan_probe', personId: undefined, name: 'Orphelin',
    });
    check = await systemNerveEngine.runSingleProbe('PROJECTIONS');
    r.check(check.status === 'ERROR' && check.errors.some((e) => e.code === 'agent_without_person'),
      'an Agent without a Person is detected', check.summary);

    // (b) Vendor with dead relations.
    shared.vendors[0].documentIds.push('doc_dead_probe');
    check = await systemNerveEngine.runSingleProbe('PROJECTIONS');
    r.check(check.errors.some((e) => e.code === 'vendor_dead_relations'),
      'a Vendor with dead relations is detected');

    // (c) DMC not linked.
    shared.persons[0].dmcIdentityId = 'dmc_missing_probe';
    check = await systemNerveEngine.runSingleProbe('PROJECTIONS');
    r.check(check.errors.some((e) => e.code === 'dmc_not_linked'),
      'an unlinked DMCIdentity is detected');

    // Repair must be VERIFIED by re-measurement, not self-declared.
    const outcome = await systemNerveEngine.repairFromProbe('PROJECTIONS', 'repair_projections');
    r.check(outcome.executed && outcome.verified,
      'the repair is executed and confirmed by re-measurement',
      `${outcome.beforeStatus} → ${outcome.afterStatus}`);
    r.check(shared.agents.find((a) => a.id === 'agent_orphan_probe')?.personId != null,
      'the orphan agent really got a person');
    r.check(!shared.vendors[0].documentIds.includes('doc_dead_probe'),
      'the dead vendor reference was really removed');
    r.check(shared.persons[0].dmcIdentityId !== 'dmc_missing_probe',
      'the dangling DMC link was really cleared');
    r.check(shared.agents.length > 0 && shared.vendors.length > 0,
      'the repair deleted no entity');

    // (d) Table over capacity is detected.
    const t = shared.addSeatingTable(1);
    const [ga, gb] = shared.guests;
    shared.assignGuestToTable(ga.id, t.id);
    shared.guests.find((g) => g.id === gb.id).seating.tableId = t.id; // force overflow
    check = await systemNerveEngine.runSingleProbe('PROJECTIONS');
    r.check(check.errors.some((e) => e.code === 'table_overcapacity'),
      'a table over capacity is detected');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll projection checks passed.\u001b[0m\n');
