#!/usr/bin/env node
/**
 * Wedding City — nervous-system graph guard.
 *
 * The relations existed in the data but were only ever decorative lines in the
 * 3D scene. These tests assert the graph is built from REAL store data, that
 * it never invents edges for dangling ids, and that a fault genuinely
 * propagates along the canonical chain:
 *
 *   DOCUMENT → PRESTATAIRE → TÂCHE → TIMELINE → LIEU → PERSONNES
 */

import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — nerve graph guard\u001b[0m');

const harness = await compileGameModules();

try {
  installBrowserGlobals(createMemoryStorage());
  const { weddingStore } = await harness.load('weddingStore', 'ng1');
  const G = await harness.load('nerveGraph', 'ng2');

  const input = {
    places: weddingStore.places,
    agents: weddingStore.agents,
    docs: weddingStore.docs,
    tasks: weddingStore.tasks,
    phases: weddingStore.phases,
  };
  const graph = G.buildNerveGraph(input);

  // -------------------------------------------------------------------------
  console.log('\n[1/3] Graph is built from real data');
  // -------------------------------------------------------------------------
  r.check(graph.nodes.length > 0 && graph.edges.length > 0,
    `graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  const kinds = new Set(graph.nodes.map((n) => n.kind));
  for (const layer of G.GRAPH_LAYERS) {
    r.check(kinds.has(layer.kind), `layer "${layer.label}" is populated`);
  }

  // Every edge must connect two existing nodes — no phantom links.
  const ids = new Set(graph.nodes.map((n) => n.id));
  const phantom = graph.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to));
  r.check(phantom.length === 0, 'no edge points at a non-existent node',
    phantom.slice(0, 3).map((e) => `${e.from}→${e.to}`).join(', '));

  // Node count must match the source collections exactly (nothing invented).
  const expected = input.docs.length + input.agents.length + input.tasks.length
    + input.phases.length + input.places.length;
  r.check(graph.nodes.length === expected,
    `node count matches source collections (${graph.nodes.length} = ${expected})`);

  // Dangling ids must NOT produce edges.
  const withGhost = G.buildNerveGraph({
    docs: [{ id: 'd1', title: 'Ghost doc', category: 'devis', fileName: 'x', rawTextExcerpt: '',
             connectedAgentIds: ['agent_ghost'], connectedPlaceIds: [], connectedTaskIds: ['task_ghost'], createdAtHour: 10 }],
    agents: [], tasks: [], places: [], phases: [],
  });
  r.check(withGhost.edges.length === 0,
    'dangling references produce no phantom edges', `got ${withGhost.edges.length}`);

  // -------------------------------------------------------------------------
  console.log('\n[2/3] Fault propagation follows the chain');
  // -------------------------------------------------------------------------
  const doc = graph.nodes.find((n) => n.kind === 'document' && n.id.includes('playlist'));
  r.check(!!doc, 'found a document node to fault');

  const prop = G.propagateFault(graph, doc.id, { direction: 'downstream', maxDepth: 4 });
  r.check(prop.affected.size > 1,
    `fault propagates beyond its origin (${prop.affected.size} nodes affected)`);
  r.check(prop.affected.get(doc.id) === 0, 'the origin itself is at depth 0');

  const layersHit = prop.byLayer.map((l) => l.kind);
  for (const expectedKind of ['task', 'phase', 'place']) {
    r.check(layersHit.includes(expectedKind),
      `propagation reaches the "${expectedKind}" layer`, `reached: ${layersHit.join(', ')}`);
  }

  // Depth must actually limit the blast radius.
  const shallow = G.propagateFault(graph, doc.id, { direction: 'downstream', maxDepth: 1 });
  r.check(shallow.affected.size < prop.affected.size,
    `maxDepth limits propagation (${shallow.affected.size} at depth 1 vs ${prop.affected.size} at depth 4)`);

  // An isolated node must not claim to affect anything.
  const isolated = G.propagateFault(withGhost, 'document:d1');
  r.check(isolated.affected.size === 1, 'an isolated node propagates to nothing');
  r.check(/Aucune propagation/.test(G.describePropagation(withGhost, isolated)),
    'describePropagation says so honestly');

  // -------------------------------------------------------------------------
  console.log('\n[3/3] Description is human-readable and accurate');
  // -------------------------------------------------------------------------
  const desc = G.describePropagation(graph, prop);
  r.check(desc.includes(String(prop.affected.size - 1)),
    'description reports the real number of impacted elements', desc);
  console.log(`      \u001b[90m${desc}\u001b[0m`);
  for (const l of prop.byLayer) {
    console.log(`      \u001b[90m${l.label.padEnd(14)} ${l.nodes.length}\u001b[0m`);
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll nerve graph checks passed.\u001b[0m\n');
