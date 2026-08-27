#!/usr/bin/env node
import { createReporter, compileGameModules, installBrowserGlobals, createMemoryStorage } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mDOCUMENT INTELLIGENCE — Extraction smoke tests\u001b[0m');
const harness = await compileGameModules();
const storage = createMemoryStorage();
installBrowserGlobals(storage);

const m = await harness.load('documentIntelligence', 'di1');
const { extractDocumentFacts } = m;

const cases = [
  {
    text: "RDV avec Sophie au Château de la Motte à 14h30. DJ Martin 1 200 €. Playlist Spotify du mariage.",
    expect: {
      people: ['Sophie', 'DJ Martin', 'Martin'],
      placesLike: ['Château', 'Chateau', 'Motte'],
      hours: [14.5],
      resourcesMin: 1,
      musicLike: ['spotify']
    }
  },
  {
    text: "Contact: pierre.dupont@example.com; téléphone +33 6 12 34 56 78. Devis 4500 € pour le traiteur.",
    expect: { emails: ['pierre.dupont@example.com'], phones: ['+33 6 12 34 56 78'], resourcesMin: 1 }
  },
  {
    text: "Mariage le 15/06/2026. Cérémonie à 14:00, cocktail 17:00, dîner 20:00.",
    expect: { datesMin: 1, hoursCount: 3, eventsLike: ['Mariage', 'cérémonie', 'dîner'] }
  }
];

for (const test of cases) {
  const facts = extractDocumentFacts(test.text);
  console.log('\n--', test.text);

  if (test.expect.people) {
    const found = test.expect.people.some((p) => facts.people.join(' ').includes(p));
    r.check(found, `people detected includes one of ${JSON.stringify(test.expect.people)}`, `detected: ${JSON.stringify(facts.people)}`);
  }
  if (test.expect.placesLike) {
    const foundP = test.expect.placesLike.some((p) => facts.places.join(' ').toLowerCase().includes(p.toLowerCase()));
    r.check(foundP, `place-like token detected among ${JSON.stringify(test.expect.placesLike)}`, `detected: ${JSON.stringify(facts.places)}`);
  }
  if (test.expect.hours) {
    r.check(JSON.stringify(facts.hours) === JSON.stringify(test.expect.hours), `hours exact match ${JSON.stringify(test.expect.hours)}`, `detected: ${JSON.stringify(facts.hours)}`);
  }
  if (test.expect.resourcesMin) {
    r.check(facts.resources.length >= test.expect.resourcesMin, `resources >= ${test.expect.resourcesMin}`, `detected: ${JSON.stringify(facts.resources)}`);
  }
  if (test.expect.musicLike) {
    const ok = test.expect.musicLike.some((k) => facts.music.join(' ').toLowerCase().includes(k));
    r.check(ok, `music detected contains ${JSON.stringify(test.expect.musicLike)}`, `detected: ${JSON.stringify(facts.music)}`);
  }
  if (test.expect.emails) {
    r.check(JSON.stringify(facts.emails) === JSON.stringify(test.expect.emails), `emails match`, `detected: ${JSON.stringify(facts.emails)}`);
  }
  if (test.expect.phones) {
    r.check(facts.phones.length === test.expect.phones.length, `phones count ${test.expect.phones.length}`, `detected: ${JSON.stringify(facts.phones)}`);
  }
  if (test.expect.datesMin) {
    r.check(facts.dates.length >= test.expect.datesMin, `dates >= ${test.expect.datesMin}`, `detected: ${JSON.stringify(facts.dates)}`);
  }
  if (test.expect.hoursCount) {
    r.check(facts.hours.length === test.expect.hoursCount, `hours count ${test.expect.hoursCount}`, `detected: ${JSON.stringify(facts.hours)}`);
  }
  if (test.expect.eventsLike) {
    const ok = test.expect.eventsLike.some((k) => facts.events.join(' ').toLowerCase().includes(k.toLowerCase()));
    r.check(ok, `events detect includes one of ${JSON.stringify(test.expect.eventsLike)}`, `detected: ${JSON.stringify(facts.events)}`);
  }
}

harness.cleanup();
if (r.failures > 0) process.exit(2);
