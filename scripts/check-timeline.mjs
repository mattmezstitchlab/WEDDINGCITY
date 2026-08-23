#!/usr/bin/env node
/**
 * AIME — JOUR J guard.
 *
 * The product changed shape in this pass: the Mirror is the product, and the
 * timeline of the day is the Mirror. These checks lock down what that means,
 * and every one of them corresponds to something exercised for real in
 * Chromium by scripts/acceptance-jourj.mjs:
 *
 *   • a wedding really starts empty, and a moment is created by a human;
 *   • a moment is a HUB: place, people, vendors, music, shots, meal,
 *     logistics, budget, documents, notes — all attached to that hour;
 *   • moving a moment proposes the consequence on the rest of the day, and
 *     never rewrites it silently;
 *   • the pictures of the moments are PRODUCT assets and never enter the
 *     wedding's data;
 *   • a document is read locally and proposes a moment, without an engine;
 *   • the 3D World is no longer a destination anywhere in the product.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — Jour J\u001b[0m');

const harness = await compileGameModules();
const silence = () => {
  const e = console.error, w = console.warn;
  console.error = () => {}; console.warn = () => {};
  return () => { console.error = e; console.warn = w; };
};

const storage = createMemoryStorage();
let boots = 0;
async function reload() {
  installBrowserGlobals(storage);
  const un = silence();
  const m = await harness.load('weddingStore', `jj${++boots}`);
  un();
  return m.weddingStore;
}

const read = (...p) => readFileSync(path.join(SRC, ...p), 'utf8');

try {
  // -------------------------------------------------------------------------
  console.log('\n[1/5] A day starts empty, and fills up one moment at a time');
  // -------------------------------------------------------------------------
  let store = await reload();
  const un = silence();

  store.createRealWedding({
    coupleNames: 'ANNA-JOURJ & BORIS-JOURJ',
    weddingDate: '2027-06-19',
    locationName: 'DOMAINE JOURJ',
    userRole: 'wedding_planner',
    userName: 'ANNA-JOURJ',
  });
  const projectId = store.currentProject.id;
  r.check(store.phases.length === 0, 'a new wedding has no moment at all', String(store.phases.length));

  const ceremonie = store.createPhase({ name: 'Cérémonie', startHour: 15, durationHours: 1 });
  const diner = store.createPhase({ name: 'Dîner', startHour: 19.5, durationHours: 2 });
  const soiree = store.createPhase({ name: 'Soirée', startHour: 22.5, durationHours: 3 });
  r.check(Boolean(ceremonie && diner && soiree) && store.phases.length === 3,
    'three moments exist, exactly where they were put',
    store.phases.map((p) => `${p.startHour}`).join(' '));
  r.check(ceremonie.keyAgentIds.length === 0 && ceremonie.keyDocIds.length === 0
    && !ceremonie.personIds && !ceremonie.budget,
    'a fresh moment carries nothing but its name and its hour');
  r.check(store.createPhase({ name: '   ', startHour: 12 }) === null,
    'a moment without a name is refused');
  // The model's day is 00:00 → 30:00 (06:00 the next morning); beyond that a
  // moment is refused. The strip stretches to cover whatever exists inside it.
  r.check(store.createPhase({ name: 'Impossible', startHour: 31 }) === null,
    'a moment outside the day is refused');
  r.check(store.createPhase({ name: 'Impossible', startHour: 29.5, durationHours: 1 }) === null,
    'and so is one that would end after the end of the night');

  // -------------------------------------------------------------------------
  console.log('\n[2/5] The moment is a hub');
  // -------------------------------------------------------------------------
  const place = store.createPlace({ name: 'ORANGERIE JOURJ' });
  store.setPhasePlace(diner.id, place.id);
  const camille = store.createPerson({ displayName: 'CAMILLE TEMOIN', asGuest: true, rsvp: 'pending' });
  store.attachPersonToPhase(diner.id, camille.id);
  const vendor = store.createVendor({ companyName: 'MAISON ACCEPTATION', category: 'traiteur' });
  store.attachVendorToPhase(diner.id, vendor.id);
  const track = store.createTrack({ title: 'PREMIERE VALSE', artist: 'DUO JOURJ' });
  store.attachTrackToPhase(diner.id, track.id);
  store.createTaskForPhase(diner.id, 'Confirmer les couverts');
  store.addPhaseShot(diner.id, 'Table des grands-parents');
  store.setPhaseMeal(diner.id, { menu: 'Menu automnal', headcount: 96 });
  store.setPhaseLogistics(diner.id, 'Livraison à 17:30');
  store.setPhaseBudget(diner.id, { amount: 4250, deposit: 1500 });
  store.setPhaseNotes(diner.id, 'Prévoir un micro');

  const hub = store.getPhaseHub(diner.id);
  r.check(hub.place?.id === place.id, 'the moment knows its place');
  r.check(hub.persons.length === 1 && hub.persons[0].displayName === 'CAMILLE TEMOIN',
    'and who is expected there');
  r.check(hub.vendors.length === 1, 'and who works there');
  r.check(hub.tracks.length === 1, 'and what is played');
  r.check(hub.tasks.length === 1 && hub.tasks[0].phaseId === diner.id, 'and what remains to be done');
  r.check(hub.phase.shots?.length === 1, 'and which photograph is expected');
  r.check(hub.phase.meal?.headcount === 96, 'and how many people eat');
  r.check(hub.phase.budget?.amount === 4250, 'and what it costs');
  r.check(store.getTimelineBudget().committed === 4250 && store.getTimelineBudget().deposits === 1500,
    'the day sums the money that was really entered',
    JSON.stringify(store.getTimelineBudget()));

  const media = store.addMedia({
    kind: 'document', source: 'data:text/plain;base64,QQ==',
    ownerKind: 'event', ownerId: diner.id, title: 'contrat.txt', fileName: 'contrat.txt',
  });
  r.check(Boolean(media), 'a document can hang on a moment');
  store.attachMediaToPhase(media.id, soiree.id);
  r.check(store.getPhaseHub(soiree.id).media.length === 1
    && store.getPhaseHub(diner.id).media.length === 0,
    'and can be moved to the moment it really concerns');

  // Everything above must survive a reload of the app.
  store.saveCurrentState();
  store = await reload();
  const reloaded = store.getPhaseHub(store.phases.find((p) => p.name === 'Dîner').id);
  r.check(store.currentProject.id === projectId, 'the same wedding comes back');
  r.check(reloaded.persons.length === 1 && reloaded.vendors.length === 1
    && reloaded.tracks.length === 1 && reloaded.tasks.length === 1
    && reloaded.phase.budget?.amount === 4250,
    'and the moment kept everything that was hung on it',
    JSON.stringify({ p: reloaded.persons.length, v: reloaded.vendors.length, t: reloaded.tracks.length }));

  // -------------------------------------------------------------------------
  console.log('\n[3/5] Moving a moment, and the chain of the day');
  // -------------------------------------------------------------------------
  const c = store.phases.find((p) => p.name === 'Cérémonie');
  const d = store.phases.find((p) => p.name === 'Dîner');
  const s2 = store.phases.find((p) => p.name === 'Soirée');
  const dinerBefore = d.startHour;
  const soireeBefore = s2.startHour;

  r.check(store.setPhaseTime(c.id, 15.5), 'a moment can be moved in time');
  r.check(Math.abs(c.endHour - c.startHour - 1) < 1e-6, 'and keeps its own duration');
  r.check(d.startHour === dinerBefore && s2.startHour === soireeBefore,
    'moving one moment does NOT silently move the others');

  const ripple = store.shiftPhasesAfter(c.id, 0.5);
  r.check(ripple?.moved.length === 2, 'accepting the consequence carries what follows',
    JSON.stringify(ripple));
  r.check(Math.abs(d.startHour - (dinerBefore + 0.5)) < 1e-6
    && Math.abs(s2.startHour - (soireeBefore + 0.5)) < 1e-6,
    'by exactly the same delta',
    `${d.startHour} / ${s2.startHour}`);
  r.check(store.phasesAfter(c.id).length === 2, 'the timeline can say what a move would carry');

  const before = store.phases.length;
  store.deletePhase(s2.id);
  r.check(store.phases.length === before - 1, 'a moment can be removed');
  r.check(store.media.length === 1, 'and what was attached to it is not destroyed with it');

  // -------------------------------------------------------------------------
  console.log('\n[4/5] Pictures belong to the product, facts belong to the document');
  // -------------------------------------------------------------------------
  const imagery = await harness.load('../design/momentImagery', 'img1').catch(() => null);
  const raw = storage.getItem(`wedding_city_state_${projectId}`) || '';
  r.check(!/\/editorial\//.test(raw),
    'no moment illustration is ever written into the wedding’s data');

  const src = read('design', 'momentImagery.ts');
  r.check(/ownMediaSource/.test(src) && /isProductAsset: false/.test(src),
    'the couple’s own photograph always wins over the product picture');
  r.check(!/weddingStore|from '\.\.\/game/.test(src),
    'the imagery module cannot reach the engine, so it cannot leak into it');
  for (const key of ['preparatifs', 'ceremonie', 'cocktail', 'diner', 'discours', 'bal', 'soiree', 'moment']) {
    r.check(src.includes(`'${key}'`), `an image exists for the ${key} archetype`);
  }

  const di = await harness.load('../game/documentIntelligence', 'di1');
  const text = 'CONTRAT TRAITEUR\nService du dîner à 19:45, installation à 17:30.\n'
    + 'Montant total : 4 250 € — acompte 1 500 €\ncontact@maison.fr — 06 12 34 56 78\nPrévoir deux menus sans gluten.';
  const facts = di.extractDocumentFacts(text);
  r.check(facts.hours.includes(19.75) && facts.hours.includes(17.5),
    'the hours written in a document are read', JSON.stringify(facts.hours));
  r.check(facts.amounts.includes(4250) && facts.amounts.includes(1500),
    'so are the amounts', JSON.stringify(facts.amounts));
  r.check(facts.emails.length === 1 && facts.phones.length === 1, 'so is the way to reach them');
  r.check(facts.actions.length === 1, 'and what has to be done', JSON.stringify(facts.actions));
  r.check(facts.unreadable === false, 'a readable document is not called unreadable');
  r.check(di.extractDocumentFacts('%PDF-1.4\u0000\u0001').unreadable === true,
    'and a binary one says so instead of inventing');

  const candidates = di.suggestMoments(facts, text, store.phases.map((p) => ({
    id: p.id, name: p.name, startHour: p.startHour, endHour: p.endHour,
  })));
  r.check(candidates.length > 0, 'a moment is proposed for the document', JSON.stringify(candidates[0] ?? null));
  r.check(candidates.every((x) => typeof x.reason === 'string' && x.reason.length > 20),
    'and the proposal explains itself in a sentence');
  r.check(/confirme/i.test(read('components', 'mirror', 'timeline', 'MomentHub.tsx'))
    || /Rattacher plutôt/.test(read('components', 'mirror', 'timeline', 'MomentHub.tsx')),
    'the human confirms — nothing is filed automatically');

  // -------------------------------------------------------------------------
  console.log('\n[5/5] The Mirror is the product; the World is not a destination');
  // -------------------------------------------------------------------------
  const site = read('components', 'mirror', 'MirrorSite.tsx');
  const app = read('App.tsx');
  const nav = read('components', 'mirror', 'MirrorNav.tsx');
  const studio = read('components', 'mirror', 'timeline', 'TimelineStudio.tsx');
  const css = read('components', 'mirror', 'timeline', 'timeline.css');

  r.check(site.indexOf('<TimelineStudio />') > 0, 'the timeline is what the Mirror renders first');
  r.check(site.indexOf('<TimelineStudio />') < site.indexOf('<MirrorProjection'),
    'and the editorial story comes after the day, in the same page');
  r.check(!/setProjection\('world'\)/.test(site) && !/setProjection\('world'\)/.test(nav),
    'nothing in the product sends the couple into the 3D World');
  r.check(!/<ProjectionSwitcher \/>/.test(app), 'and the projection capsule is gone from the surface');
  r.check(/data-jourj="nav-jourj"/.test(site) && /data-jourj="nav-weddings"/.test(site)
    && /data-jourj="nav-create"/.test(site),
    'the whole navigation is three entries: Jour J, Mes mariages, Créer');

  const storeSrc = read('game', 'weddingStore.ts');
  r.check(/this\.projection = 'mirror';\s*\n\s*\/\/ Opening a wedding|Opening a wedding means opening its day/.test(storeSrc),
    'opening a wedding opens its day');
  r.check(/PRODUCT DECISION \(Jour J pass\)[\s\S]{0,260}this\.projection = 'mirror'/.test(storeSrc),
    'and creating one lands on the empty timeline, not in a 3D world');

  // The drag surface is the CARD, not a handle — the reported bug.
  r.check(/className={`wc-jourj-moment/.test(studio) && /onPointerDown={\(e\) => onMomentPointerDown\(e, phase\.id\)}/.test(studio),
    'the whole card is the drag surface, so an icon can never travel alone');
  r.check(/const left = isDragged \? drag!\.left : xForHour\(phase\.startHour\)/.test(studio),
    'and the card itself is repositioned during the drag');
  r.check(/data-jourj="drop-time"/.test(studio), 'the target hour is shown while dragging');

  // The recurring CSS trap: nothing responsive may live inline.
  r.check(/@media \(max-width: 680px\)/.test(css) && /--jourj-strip-h/.test(css),
    'every responsive value of the studio lives in the stylesheet');
  r.check(!/@media/.test(studio), 'and none of it is inline in the component');

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll Jour J checks passed.\u001b[0m\n');
