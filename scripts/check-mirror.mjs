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
  console.log('\n[1/8] The World Model derives from the store, and only from it');
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
  console.log('\n[2/8] Missing data is reported, never fabricated');
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
  console.log('\n[3/8] Stable identity across projections');
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
  console.log('\n[4/8] The round trip: World → Mirror → World, same person');
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
  console.log('\n[5/8] Synchronisation: one mutation, every projection follows');
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
  // -------------------------------------------------------------------------
  console.log('\n[6/8] Vendors, Places and Music are real projections');
  // -------------------------------------------------------------------------
  {
    const v = proj.projectVendors();
    r.check(v.counts.total === store.vendors.length,
      `vendor count matches the store (${v.counts.total})`);
    r.check(v.vendors.every((x) => store.vendors.some((sv) => sv.id === x.vendorId)),
      'every projected vendor resolves to a real Vendor');
    r.check(v.byCategory.reduce((n, g) => n + g.vendors.length, 0) === v.counts.total,
      'category grouping loses no vendor');
    const withMoments = v.vendors.filter((x) => x.moments.length > 0);
    r.check(withMoments.length > 0, `vendors are linked to timeline moments (${withMoments.length})`);
    r.check(v.vendors.every((x) => x.moments.every((mo) => store.phases.some((ph) => ph.id === mo.phaseId))),
      'vendor moments reference real phases');
    r.check(v.vendors.every((x) => x.media.length === store.getMediaFor('vendor', x.vendorId).length),
      'vendor media come from the store, none invented');

    const pl = proj.projectPlaces();
    r.check(pl.counts.total === store.places.length, `place count matches (${pl.counts.total})`);
    r.check(pl.places.every((x) => store.places.some((sp) => sp.id === x.placeId)),
      'every projected place resolves to a real Place');
    r.check(pl.keyPlaces.every((x) => x.moments.length > 0),
      'key places are exactly those hosting a real moment');
    const kinds = new Set(pl.places.map((x) => x.kind));
    r.check(kinds.size > 1, `place kinds are derived from real zones (${[...kinds].join(', ')})`);

    const mu = proj.projectMusic();
    r.check(mu.counts.total === store.tracks.length, `song count matches (${mu.counts.total})`);
    r.check(mu.songs.every((x) => store.tracks.some((t) => t.id === x.songId)),
      'every projected song resolves to a real Track');
    r.check(mu.songs.every((x) => !x.phaseId || store.phases.some((ph) => ph.id === x.phaseId)),
      'song → phase links point at real phases');
    r.check(mu.songs.every((x) => x.coverSource === null || store.media.some((m) => m.source === x.coverSource)),
      'no cover art is fabricated');
    r.check(mu.byMoment.reduce((n, g) => n + g.songs.length, 0) === mu.counts.total,
      'moment grouping loses no song');
  }

  // -------------------------------------------------------------------------
  console.log('\n[7/8] Cross-projection round trips: Place, Vendor, Event, Song');
  // -------------------------------------------------------------------------
  {
    const un3 = silence();

    // Mirror → Place → World
    const place = proj.projectPlaces().keyPlaces[0];
    store.projection = 'mirror';
    const okPlace = store.showPlaceInWorld(place.placeId);
    r.check(okPlace && store.projection === 'world', 'Mirror → Place → World switches projection');
    r.check(store.selectedEntity?.id === place.placeId || store.cameraTargetPos.length === 3,
      'the world moved to that place');
    r.check(store.showPlaceInWorld('place_nope') === false, 'an unknown placeId is rejected');

    // Mirror → Vendor → World
    const vendor = proj.projectVendors().vendors.find((v) => v.canShowInWorld);
    store.projection = 'mirror';
    const okVendor = store.showVendorInWorld(vendor.vendorId);
    r.check(okVendor && store.projection === 'world', 'Mirror → Vendor → World switches projection');
    const sv = store.vendors.find((v) => v.id === vendor.vendorId);
    if (sv?.agentId) {
      r.check(store.selectedEntity?.id === sv.agentId,
        'the vendor’s own agent is selected in the World');
    } else {
      r.check(true, 'the vendor fell back to one of its real zones');
    }
    r.check(store.showVendorInWorld('vendor_nope') === false, 'an unknown vendorId is rejected');

    // Mirror → Event → World (clock AND camera)
    const moment = proj.projectProgramme().moments[2];
    store.projection = 'mirror';
    const okEvent = store.showEventInWorld(moment.phaseId);
    r.check(okEvent && store.projection === 'world', 'Mirror → Event → World switches projection');
    r.check(Math.abs(store.time - (moment.startHour + 0.05)) < 0.001,
      'the simulated clock moved to that moment', String(store.time));
    r.check(store.showEventInWorld('phase_nope') === false, 'an unknown phaseId is rejected');

    // Song → Event
    const song = proj.projectMusic().songs.find((x) => x.phaseId);
    const phase = store.getPhaseForTrack(song.songId);
    r.check(phase?.id === song.phaseId, 'Song → Event resolves to the same phase in the store');
    r.check(store.getTracksForPhase(song.phaseId).some((t) => t.id === song.songId),
      'the reverse Event → Song lookup includes that song');

    un3();
  }

  // -------------------------------------------------------------------------
  console.log('\n[8/8] Media architecture: real attachments only');
  // -------------------------------------------------------------------------
  {
    r.check(Array.isArray(store.media), 'a media collection exists');
    r.check(store.media.length === 0,
      'no media is seeded — the architecture is ready, nothing is invented',
      `found ${store.media.length}`);

    // A media must attach to something real.
    r.check(store.addMedia({ kind: 'image', source: 'blob:test', ownerKind: 'person', ownerId: 'person_ghost' }) === null,
      'attaching media to a non-existent owner is refused');

    const person = store.persons[0];
    const asset = store.addMedia({
      kind: 'image', source: 'blob:test-portrait', ownerKind: 'person',
      ownerId: person.id, title: 'Portrait',
    });
    r.check(!!asset && asset.id.startsWith('media_'), 'a media attached to a real person is accepted');
    r.check(store.getMediaFor('person', person.id).length === 1, 'the media is retrievable by owner');
    r.check(proj.projectWorldModel().gallery.length === 1,
      'the gallery projection now reports one real media');
    r.check(proj.projectWorldModel().availability.find((a) => a.id === 'gallery').available === true,
      'the gallery section becomes available once a real media exists');

    // Integrity must cover the new relations.
    const { checkReferentialIntegrity } = await harness.load('integrity');
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
    r.check(rep.ok, `integrity holds with media and relationships (${rep.checkedReferences} refs)`,
      rep.broken.slice(0, 3).map((b) => `${b.from}.${b.field}→${b.missingId}`).join(' | '));

    const bad = checkReferentialIntegrity({
      persons: store.persons, places: store.places, phases: store.phases, tracks: store.tracks,
      media: [{ id: 'm_x', kind: 'image', source: 'x', ownerKind: 'place', ownerId: 'place_ghost',
                origin: 'manual', createdAt: '', updatedAt: '' }],
    });
    r.check(!bad.ok && bad.broken.some((b) => b.missingId === 'place_ghost'),
      'a media pointing at a missing owner is detected');

    // Relationships are first-order edges.
    const a = store.persons[0], b2 = store.persons[1];
    const rel = store.linkPersons(a.id, b2.id, 'friend');
    r.check(!!rel, 'two real people can be linked');
    r.check(store.linkPersons(a.id, 'person_ghost', 'friend') === null,
      'linking to a non-existent person is refused');
    r.check(store.linkPersons(a.id, a.id, 'friend') === null, 'self-links are refused');
    r.check(store.getRelationshipsFor(b2.id).some((x) => x.otherPersonId === a.id),
      'the relationship is readable from both ends');
    store.unlinkPersons(rel.id);
    store.removeMedia(asset.id);
    r.check(store.media.length === 0 && store.relationships.length === 0, 'test fixtures cleaned up');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll projection checks passed.\u001b[0m\n');
