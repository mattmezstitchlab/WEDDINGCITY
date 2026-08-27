#!/usr/bin/env node
import { createReporter, compileGameModules, installBrowserGlobals, createMemoryStorage } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mDOCUMENT INTELLIGENCE — Relations smoke tests\u001b[0m');
const harness = await compileGameModules();
const storage = createMemoryStorage();
installBrowserGlobals(storage);

const m = await harness.load('documentIntelligence', 'dr1');
const { extractDocumentFacts, extractRelations } = m;

const tests = [
  {
    text: "Sophie confirme le Château de la Motte pour le 12/09/2026. RDV à 14h30. DJ Martin : 1 200 €. Playlist Spotify du mariage.",
    expect: {
      relations: [
        { subjContains: 'Sophie', pred: 'confirms', objContains: 'event at' },
        { subjContains: 'event at', pred: 'has_place', objContains: 'Château' },
        { subjContains: 'event at', pred: 'has_date' , objContains: '12/09/2026' },
        { subjContains: 'DJ Martin', pred: 'charges', objContains: '1200' },
        { subjContains: 'DJ Martin', pred: 'provides_music', objContains: 'spotify' }
      ]
    }
  }
];

for (const t of tests) {
  const facts = extractDocumentFacts(t.text);
  const rels = extractRelations(t.text, facts);
  console.log('\n--', t.text);
  for (const ex of t.expect.relations) {
    const ok = rels.find((r) => (r.subject.includes(ex.subjContains) || r.subject === ex.subjContains) && r.predicate === ex.pred && r.object.toLowerCase().includes((ex.objContains||'').toLowerCase()));
    r.check(Boolean(ok), `relation ${ex.pred} (${ex.subjContains} -> ${ex.objContains})`, `detected: ${JSON.stringify(rels)}`);
  }
}

harness.cleanup();
if (r.failures > 0) process.exit(2);
