#!/usr/bin/env node
/**
 * Wedding City — dataviz fidelity guard.
 *
 * Enforces the two non-negotiable rules of the Soft Spatial UI phase:
 *
 *   §10  A visualisation may only display data that comes from the store, or
 *        is deterministically derived from it. No decorative figures, no
 *        placeholder percentages, no invented entities.
 *
 *   §8   A DMC colour is a SIGNAL: dot, ring, line, halo, badge, border.
 *        Never a container background, never a large coloured fill.
 *
 * These are checked statically (source inspection) AND dynamically (the
 * projection is run against the real store and compared to it).
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — dataviz fidelity guard\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

/** Components that render data and are therefore subject to these rules. */
const DATAVIZ_FILES = [
  'components/ui/GuestConstellation.tsx',
  'components/ui/NerveGraphPanel.tsx',
];

try {
  // -------------------------------------------------------------------------
  console.log('\n[1/4] The projection is a pure function of the store');
  // -------------------------------------------------------------------------
  installBrowserGlobals(createMemoryStorage());
  const un = silence();
  const { weddingStore: store } = await harness.load('weddingStore', 'dv1');
  un();
  const { buildConstellation } = await harness.load('constellation', 'dv2');

  const dmcByPerson = new Map(store.dmcIdentities.map((d) => [d.ownerPersonId, d.dmcColor]));
  const input = {
    guests: store.guests, persons: store.persons,
    seatingTables: store.seatingTables, agents: store.agents, dmcByPerson,
  };
  const model = buildConstellation(input);

  // Every figure must match the store exactly.
  r.check(model.totals.guests === store.guests.length,
    `guest count matches the store (${model.totals.guests} = ${store.guests.length})`);
  r.check(model.nodes.length === store.guests.length,
    'one node per real Guest, no more, no fewer');
  r.check(model.totals.tables === store.seatingTables.length,
    `table count matches the store (${model.totals.tables} = ${store.seatingTables.length})`);
  r.check(model.totals.capacity === store.seatingTables.reduce((n, t) => n + t.capacity, 0),
    'total capacity matches the store');

  const storeRsvp = store.getRsvpSummary();
  r.check(model.totals.byRsvp.accepted === storeRsvp.accepted
    && model.totals.byRsvp.pending === storeRsvp.pending
    && model.totals.byRsvp.declined === storeRsvp.declined
    && model.totals.byRsvp.tentative === storeRsvp.tentative,
    'the RSVP breakdown equals getRsvpSummary()',
    `${JSON.stringify(model.totals.byRsvp)} vs ${JSON.stringify(storeRsvp)}`);
  r.check(model.totals.headcount === storeRsvp.total
    ? true
    : model.totals.headcount === store.guests.reduce((n, g) => n + 1 + g.rsvp.plusOnes, 0),
    'headcount is derived, not hardcoded');

  // Every node must reference an entity that really exists.
  const ghosts = model.nodes.filter((n) => !store.guests.some((g) => g.id === n.guestId));
  r.check(ghosts.length === 0, 'no node references a non-existent guest');
  const badPersons = model.nodes.filter((n) => !store.persons.some((p) => p.id === n.personId));
  r.check(badPersons.length === 0, 'every node resolves to a real Person');
  const badAgents = model.nodes.filter((n) => n.agentId && !store.agents.some((a) => a.id === n.agentId));
  r.check(badAgents.length === 0, 'every agentId on a node exists');

  // DMC rings only for people who really own a DMC identity.
  const fakeDmc = model.nodes.filter((n) => n.dmcColor
    && !store.dmcIdentities.some((d) => d.ownerPersonId === n.personId));
  r.check(fakeDmc.length === 0, 'no node is given a DMC colour it does not own');
  r.check(model.totals.withDmc === store.dmcIdentities.filter(
    (d) => store.guests.some((g) => g.personId === d.ownerPersonId)).length,
    'the DMC count matches real owned identities', String(model.totals.withDmc));

  // Dietary marks only where the field is genuinely set.
  const fakeDiet = model.nodes.filter((n) => n.dietary
    && !store.guests.some((g) => g.id === n.guestId && g.dietary === n.dietary));
  r.check(fakeDiet.length === 0, 'dietary marks reflect the real field');

  // -------------------------------------------------------------------------
  console.log('\n[2/4] The projection is deterministic and reacts to real edits');
  // -------------------------------------------------------------------------
  const again = buildConstellation(input);
  r.check(JSON.stringify(again.nodes.map((n) => [n.guestId, n.x, n.y]))
    === JSON.stringify(model.nodes.map((n) => [n.guestId, n.x, n.y])),
    'layout is deterministic — no Math.random(), stable across renders');

  const src = readFileSync(path.join(SRC, 'game', 'constellation.ts'), 'utf8');
  r.check(!/Math\.random\(/.test(src), 'the projection contains no randomness');
  r.check(!/Date\.now\(/.test(src), 'the projection contains no time-dependent value');

  // A real edit must move the picture.
  const g0 = store.guests[0];
  const before = model.totals.byRsvp.accepted;
  store.setGuestRsvp(g0.id, 'declined');
  const after = buildConstellation({ ...input, guests: store.guests });
  r.check(after.totals.byRsvp.declined === 1 && after.totals.byRsvp.accepted === before - 1,
    'changing a real RSVP changes the visualisation',
    JSON.stringify(after.totals.byRsvp));
  store.setGuestRsvp(g0.id, 'accepted');

  // Over-capacity is measured, not decorative.
  const t = store.addSeatingTable(1);
  store.assignGuestToTable(store.guests[0].id, t.id);
  store.guests[1].seating.tableId = t.id; // force a real overflow
  const over = buildConstellation({ ...input, guests: store.guests, seatingTables: store.seatingTables });
  r.check(over.clusters.some((c) => c.id === t.id && c.overCapacity),
    'over-capacity is computed from real occupancy');
  store.guests[1].seating.tableId = undefined;
  store.assignGuestToTable(store.guests[0].id, null);

  // -------------------------------------------------------------------------
  console.log('\n[3/4] §10 — no fabricated figures in dataviz components');
  // -------------------------------------------------------------------------
  for (const rel of DATAVIZ_FILES) {
    const file = path.join(SRC, rel);
    if (!existsSync(file)) { r.check(false, `${rel} exists`); continue; }
    const body = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');

    // Percentages and counts written as literals are the classic tell.
    const fabricated = [
      ...body.matchAll(/(?:value|count|total|percent|score|amount)\s*[:=]\s*(\d{2,})/gi),
    ].map((m) => m[0]);
    r.check(fabricated.length === 0, `${rel}: no hardcoded data figure`,
      fabricated.slice(0, 4).join(' | '));

    // Placeholder arrays of fake entities.
    const fakeArrays = [...body.matchAll(/\[\s*\{\s*name\s*:\s*['"]/g)];
    r.check(fakeArrays.length === 0, `${rel}: no inline array of fake entities`);

    r.check(/weddingStore\.|store\./.test(body), `${rel}: actually reads the store`);
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/4] §8 — DMC is a signal, never a background');
  // -------------------------------------------------------------------------
  for (const rel of [...DATAVIZ_FILES, 'components/ui/EntityInspector.tsx']) {
    const file = path.join(SRC, rel);
    if (!existsSync(file)) continue;
    const body = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

    // A DMC colour used raw as a background fill.
    const bgFill = [...body.matchAll(/background(?:Color)?\s*:\s*[^,;\n]*dmc(?:Color|\.color)?[^,;\n]*/gi)]
      .map((m) => m[0].trim())
      // Approved signal helpers are allowed: dmcTint() is an alpha halo,
      // dmcDotStyle()/dmcSliceStyle() are size-bounded dots and slices.
      .filter((x) => !/dmcTint\(|dmcDotStyle\(|dmcSliceStyle\(/.test(x));
    r.check(bgFill.length === 0, `${rel}: no DMC colour used as a background fill`,
      bgFill.slice(0, 3).join(' | '));
  }

  const tokens = readFileSync(path.join(SRC, 'design', 'tokens', 'dmc.ts'), 'utf8');
  r.check(/maxSurfaceRatio:\s*0\.15/.test(tokens),
    'the 15 % DMC surface ceiling is declared in the tokens');
  r.check(/DMC_NEUTRAL/.test(tokens),
    'a neutral fallback exists, so "no DMC" is not given an invented colour');
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll dataviz fidelity checks passed.\u001b[0m\n');
