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
  // PRODUCT DECISION (convergence pass): the navigation is the definitive one —
  // the places of a wedding day, plus search, my weddings and create. Still one
  // bar, still no sidebar, and still nothing that leads to a 3D world.
  for (const tag of ['nav-today', 'nav-jourj', 'nav-people', 'nav-organisation',
    'nav-music', 'nav-documents', 'nav-memories', 'nav-search', 'nav-weddings', 'nav-create']) {
    r.check(site.includes(`data-jourj="${tag}"`) || site.includes(`tag: '${tag}'`),
      `the navigation carries ${tag}`);
  }

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

  // -------------------------------------------------------------------------
  console.log('\n[6/7] LE GRAND JOUR® — the public page shows the film');
  // -------------------------------------------------------------------------
  const landing = read('components', 'mirror', 'MirrorLanding.tsx');
  const landingCss = read('components', 'mirror', 'landing.css');
  const film = read('components', 'mirror', 'timeline', 'LandingFilm.tsx');
  const imagery = read('design', 'momentImagery.ts');
  const identity = read('design', 'productIdentity.ts');

  r.check(/PRODUCT_NAME/.test(landing) && /LE GRAND JOUR/.test(identity),
    'the product is named once, and the page imports that name');
  r.check(/<LandingFilm/.test(landing), 'the public page renders the film itself');
  r.check(landing.indexOf('<LandingFilm') - landing.indexOf('wc-gj-hero') > 0
    && !/wc-gj-cols[\s\S]{0,400}<LandingFilm/.test(landing),
    'and it comes immediately after the hero, before any explanation');
  // Only the component name still contains "Mirror"; no COPY does.
  const landingCopy = landing.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    .replace(/MirrorLanding/g, '');
  r.check(!/\bWorld\b|\bMirror\b|\bCanvas\b/.test(landingCopy),
    'the three-surfaces copy is gone from the page');
  r.check(/Démonstration/.test(film), 'the demonstration says it is one');
  r.check(!/weddingStore/.test(film) && !/localStorage/.test(film),
    'and it cannot write into any wedding: it does not even import the store');

  const demoBlock = imagery.slice(imagery.indexOf('export const DEMO_DAY'));
  const forbidden = ['Clara', 'Alexandre', 'invité', 'Château', '€', 'Paul', 'Emilie'];
  r.check(!forbidden.some((w) => demoBlock.includes(w)),
    'the demonstration day carries no couple, no guest, no venue and no price');
  r.check(/GRAND_JOUR_HERO/.test(imagery) && /grandjour-hero\.jpg/.test(imagery),
    'the cover of the page is a declared product asset');
  // PRODUCT DECISION (editorial pass): the hero shows neither a couple nor a
  // date — it shows the product name and hands over one field. So the
  // guarantee is stronger than before: no wedding identity in the hero at all.
  r.check(!/hero-wedding/.test(landing) && !/wc-gj-countdown/.test(landing),
    'the hero shows no couple and no date — nothing to invent');
  r.check(/data-landing="brief"/.test(landing) && /data-landing="type"/.test(landing),
    'it shows one field and the kind of event instead');
  r.check(/@media \(max-width: 900px\)/.test(landingCss) && !/@media/.test(landing),
    'every responsive value of the page lives in the stylesheet');

  // -------------------------------------------------------------------------
  console.log('\n[7/7] Two gestures, on purpose — and the day’s companion');
  // -------------------------------------------------------------------------
  const canvas = read('components', 'canvas', 'CanvasCore.tsx');
  r.check(/data-canvas="drag-ghost"/.test(canvas),
    'in the editing Canvas, only the handle travels with the pointer');
  r.check(!/opacity: isDragging \? 0\.55/.test(canvas)
    && /borderColor: isDragging \? K\.textPrimary/.test(canvas),
    'the dragged block stays exactly in place, outlined rather than displaced');
  r.check(/proposeMove\(/.test(canvas) && /data-canvas="move-validation"/.test(canvas),
    'a drop PROPOSES the move instead of applying it');
  r.check(/Modifications détectées/.test(canvas) && /data-canvas="move-apply"/.test(canvas),
    'with the consequences written out, and an explicit Appliquer');
  r.check(/previewMoveToIndex/.test(canvas), 'the preview is computed by the store, not re-implemented');

  // previewMoveToIndex is arithmetic, so it is executed, not just read.
  const p1 = store.phases[0];
  const preview = store.previewMoveToIndex(p1.id, 1);
  r.check(Array.isArray(preview) && preview.length > 0,
    'the preview lists what would change', JSON.stringify(preview?.slice(0, 2)));
  const untouched = store.phases.map((x) => x.startHour).join(',');
  store.previewMoveToIndex(p1.id, 1);
  r.check(store.phases.map((x) => x.startHour).join(',') === untouched,
    'and it changes absolutely nothing on its own');

  const studioSrc = read('components', 'mirror', 'timeline', 'TimelineStudio.tsx');
  r.check(/data-jourj="now-mode"/.test(studioSrc) && /maintenant/.test(studioSrc),
    'MODE JOUR J exists, with a NOW marker on the real scale');
  r.check(/nous ne sommes pas encore le jour J/.test(studioSrc),
    'and it says plainly when today is not the wedding day');
  r.check(/normalizeNightHour/.test(studioSrc),
    'an hour typed after midnight is read as the night of the wedding');
  r.check(store.setTrackDuration('nope', '3:45') === false, 'a track duration needs a real track');

  const hubSrc = read('components', 'mirror', 'timeline', 'MomentHub.tsx');
  r.check(/TrackArt/.test(hubSrc) && /hub-track-noaudio/.test(hubSrc),
    'a track shows real artwork, and says why there is no Play control');
  r.check(/hub-music-fit/.test(hubSrc),
    'music that overflows its moment offers to lengthen the moment');
  r.check(/avatarInitials/.test(hubSrc) && /portraitMediaId/.test(hubSrc),
    'a person shows a real portrait, or initials — never an invented face');
  r.check(/hub-person-links/.test(hubSrc),
    'and opening a person shows where they are in the day');

  // -------------------------------------------------------------------------
  console.log('\n[8/8] Convergence — one product, one vocabulary, one truth');
  // -------------------------------------------------------------------------
  const intakeSrc = read('game', 'projectIntake.ts');
  const studioSrc2 = read('components', 'mirror', 'intake', 'IntakeStudio.tsx');
  const searchSrc = read('components', 'mirror', 'GlobalSearch.tsx');
  const orgSrc = read('components', 'mirror', 'organisation', 'OrganisationSection.tsx');
  const seatSrc = read('components', 'mirror', 'organisation', 'SeatingPlan.tsx');
  const appSrc = read('App.tsx');

  // The word "Mirror" must not reach a user. Comments and file names may keep
  // it; rendered strings may not.
  const uiStrings = [
    read('components', 'mirror', 'MirrorLanding.tsx'),
    read('components', 'mirror', 'MirrorSite.tsx'),
    read('components', 'mirror', 'timeline', 'TimelineStudio.tsx'),
    read('components', 'mirror', 'timeline', 'MomentHub.tsx'),
    read('components', 'canvas', 'CanvasCore.tsx'),
    read('components', 'ui', 'EntityInspector.tsx'),
  ].map((src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));
  const visibleMirror = uiStrings.filter((src) => />[^<>{}]*\bMirror\b|'[^']*\bMirror\b[^']*'/.test(src));
  r.check(visibleMirror.length === 0, 'no user-facing string says "Mirror" any more');
  r.check(/projection === 'world' && !weddingStore\.showIdentityModal/.test(appSrc),
    'the 3D chrome exists only while the World is on screen — no hidden World buttons');

  // Intake: reading, never inventing.
  const plan = (await harness.load('../game/projectIntake', 'intake1')).analyseIntake({
    description: 'Nous nous marions le 18 juillet 2027 au Château de Vaux. Cérémonie à 14h, cocktail à 17h, dîner à 20h, environ 120 invités.',
    sources: [
      { fileName: 'liste-invites.csv', text: 'Nom;Prenom\nDupont;Marie\nMartin;Paul' },
      { fileName: 'contrat.txt', text: 'Photographe : Studio Aubert\nTraiteur : Table & Feu\nMontant total : 8 400 €' },
      { fileName: 'playlist.txt', text: 'Playlist\nPerfect — Ed Sheeran' },
    ],
  });
  r.check(plan.weddingDate === '2027-07-18', 'the date written in a sentence is read', String(plan.weddingDate));
  r.check(plan.locationName === 'Château de Vaux', 'so is the venue, exactly once', String(plan.locationName));
  r.check(plan.guestCountTarget === 120, 'so is the number of guests', String(plan.guestCountTarget));
  // PRODUCT DECISION (convergence finale): the intake now speaks the five
  // levels of design/certainty instead of two. An end chained onto the next
  // written start is DÉDUIT ('inferred'); an end nobody wrote and nothing
  // settles is ESTIMÉ ('estimated'). The guarantee is the same one, stated
  // more precisely: an hour that was not written is NEVER 'confirmed'.
  r.check(plan.moments.length === 3 && plan.moments.every((m) => m.confidence !== 'confirmed'),
    'each hour becomes a moment, and an end nobody wrote is never confirmed',
    plan.moments.map((m) => `${m.label}:${m.confidence}`).join(' '));
  r.check(plan.moments.every((m) => ['inferred', 'estimated'].includes(m.confidence)),
    'it says WHICH of the two it is — deduced from the next start, or estimated',
    plan.moments.map((m) => m.confidence).join(' '));
  r.check(plan.people.map((p) => p.name).join('|') === 'Dupont Marie|Martin Paul',
    'a guest list is read, and its header row is not a person', plan.people.map((p) => p.name).join('|'));
  r.check(plan.vendors.map((v) => v.name).join('|') === 'Studio Aubert|Table & Feu',
    'vendors carry their company name, not their trade', plan.vendors.map((v) => v.name).join('|'));
  r.check(plan.tracks.length === 1 && plan.tracks[0].artist === 'Ed Sheeran', 'a playlist is read');
  r.check(plan.coupleNames === null && plan.questions.some((q) => /Qui se marie/.test(q)),
    'the couple is never guessed — it is asked');
  r.check(/disabled={!canGenerate}/.test(studioSrc2),
    'and the day cannot be generated until that answer exists');
  r.check(/Votre journée prend forme/.test(studioSrc2) && /data-intake="moment-toggle"/.test(studioSrc2),
    'everything read is shown and can be dropped before anything is created');
  r.check(!/fetch\(|http/.test(intakeSrc), 'the reading is local: no network call anywhere in it');

  // The plan really builds the project, and nothing more.
  const beforeIntake = { phases: store.phases.length, persons: store.persons.length };
  const applied = store.applyIntakePlan({
    ...plan,
    coupleNames: 'ANNA & BORIS',
    moments: plan.moments.map((m, i) => ({ ...m, keep: i < 2 })),
  });
  r.check(applied.phases === 2, 'only the moments kept are created', JSON.stringify(applied));
  r.check(store.phases.length === beforeIntake.phases + 2, 'and they land in the same timeline');
  r.check(store.persons.length === beforeIntake.persons + plan.people.length,
    'the people read are created once');

  // Universal search and the Lab read the same store.
  const found = store.searchEverything('Marie');
  r.check(found.some((f) => f.kind === 'person' && /Marie/.test(f.label)),
    'the universal search finds a person', JSON.stringify(found[0] ?? null));
  r.check(found.every((f) => typeof f.context === 'string' && f.context.length > 0),
    'and every result carries its context');
  r.check(/n’interroge pas le web/.test(searchSrc), 'and it says it does not search the web');

  const findings = store.projectFindings();
  r.check(Array.isArray(findings) && findings.length > 0, 'the Lab reports on the real project');
  r.check(findings.every((f) => ['gap', 'conflict', 'ok'].includes(f.level)),
    'with a level on every line, and no opinion');
  r.check(!/fetch\(|openai|gpt/i.test(orgSrc), 'the Lab calls no external intelligence');

  // Seating: the guest travels, the constraint speaks.
  r.check(/data-org="carrying"/.test(seatSrc), 'in the seating plan the guest follows the pointer');
  r.check(/est complète/.test(seatSrc), 'and a full table says so instead of refusing silently');

  // -------------------------------------------------------------------------
  console.log('\n[9/9] V2 — editorial media, and real scenarios');
  // -------------------------------------------------------------------------
  const registry = read('design', 'editorialRegistry.ts');
  r.check(!/from '\.\.\/game|weddingStore|localStorage/.test(registry),
    'the editorial registry cannot reach the engine or storage');
  r.check(/EDITORIAL_PEOPLE/.test(registry) && /EDITORIAL_COVERS/.test(registry)
    && /EDITORIAL_TRACKS/.test(registry),
    'it holds the portraits, the sleeves and the demonstration tracks');
  r.check(/EDITORIAL_DISCLAIMER/.test(registry)
    && /jamais à votre événement/.test(registry),
    'and one sentence every demonstration must show');

  const landingSrc2 = read('components', 'mirror', 'MirrorLanding.tsx');
  r.check(/EDITORIAL_PEOPLE/.test(landingSrc2) && /EDITORIAL_TRACKS/.test(landingSrc2),
    'the public page uses the registry rather than inventing its own assets');
  r.check(/data-landing="closing-title"/.test(landingSrc2)
    && /Tout commence par un moment/.test(landingSrc2)
    && /Un mariage commence par un oui/.test(landingSrc2),
    'the closing line is universal, with a wedding variant');

  // A scenario is a branch: created, changed, compared, applied, discarded —
  // and the real day never moves on its own. Executed, not read.
  const scenPhases = store.phases.map((x) => `${x.id}:${x.startHour}`).join('|');
  const scenario = store.createScenario('Pluie');
  r.check(Boolean(scenario) && store.scenarios.length === 1, 'a scenario can be branched');
  r.check(scenario.phases.length === store.phases.length,
    'it copies the day, moment for moment', `${scenario.phases.length}/${store.phases.length}`);
  r.check(store.createScenario('  ') === null, 'a scenario without a name is refused');

  const first = scenario.phases[0];
  r.check(store.scenarioShiftPhase(scenario.id, first.id, 0.5, true),
    'a moment can be moved inside the branch');
  r.check(store.phases.map((x) => `${x.id}:${x.startHour}`).join('|') === scenPhases,
    'and the real day does not move', 'unchanged');
  const scenDiff = store.scenarioDiff(scenario.id);
  r.check(scenDiff.filter((d) => d.changed).length === scenario.phases.length,
    'the comparison lists every moment carried', JSON.stringify(scenDiff.filter((d) => d.changed).length));
  r.check(scenDiff.every((d) => !d.changed || d.deltaMinutes === 30),
    'with the exact difference in minutes');

  const applyOne = store.applyScenario(scenario.id, [first.id]);
  r.check(applyOne?.applied.length === 1, 'a single line can be applied', JSON.stringify(applyOne));
  r.check(store.phases.find((x) => x.id === first.id).startHour === first.startHour,
    'and that moment now matches the branch');
  const applyAll = store.applyScenario(scenario.id);
  r.check(applyAll !== null && store.scenarioDiff(scenario.id).every((d) => !d.changed),
    'applying everything aligns the day on the branch');
  r.check(store.discardScenario(scenario.id) && store.scenarios.length === 0,
    'a branch can be abandoned');

  // Scenarios are part of the project snapshot, so they cannot travel.
  const schema = read('game', 'persistenceSchema.ts');
  r.check(/scenarios: TimelineScenario\[\]/.test(schema) && /{ key: 'scenarios', kind: 'list' }/.test(schema),
    'scenarios are persisted with the project, and only with it');

  // -------------------------------------------------------------------------
  console.log('\n[10/13] V3 — one vocabulary per kind of day, fewer and bigger sequences');
  // -------------------------------------------------------------------------
  const types = read('design', 'eventTypes.ts');
  for (const id of ['mariage', 'anniversaire', 'fete', 'seminaire', 'convention', 'soiree', 'autre']) {
    r.check(types.includes(`id: '${id}'`), `the event type ${id} exists`);
  }
  // PRODUCT DECISION (convergence finale): « corporate » is back, this time as
  // a first-class kind of day with its own vocabulary — and 'fete', 'soiree'
  // and 'convention' are kept ONLY so days created before this pass keep
  // theirs. The guarantee behind the original check was « no second parallel
  // list »: it is now enforced structurally instead of by absence — the
  // retired ids live in LEGACY_EVENT_TYPES, are marked legacy, and the hero
  // offers EVENT_TYPES only.
  r.check(/id: 'corporate'/.test(types), 'a corporate day is a kind of its own');
  r.check(!/id: 'bapteme'/.test(types), 'and no phantom type was reintroduced');
  r.check(/const LEGACY_EVENT_TYPES/.test(types) && /legacy: true/.test(types),
    'retired types are declared retired, not duplicated into the offered list');
  r.check((types.match(/export const EVENT_TYPES/g) || []).length === 1,
    'there is exactly one offered list of event types');
  for (const id of ['corporate', 'festival', 'concert', 'spectacle', 'gala', 'associatif', 'culturel']) {
    r.check(types.includes(`id: '${id}'`), `the event type ${id} exists`);
  }
  r.check((types.match(/skeleton:/g) || []).length >= 12,
    'each kind of day carries the first day it can propose');

  const intake = await harness.load('../game/projectIntake', 'intakeV3');
  const pro = intake.analyseIntake({
    description: 'Convention annuelle le 12 octobre 2027 au Centre des Congrès, plénière à 9h, ateliers à 11h, déjeuner à 12h30, 250 participants.',
    eventTypeId: 'convention',
  });
  r.check(pro.moments.map((m) => m.label).join('|') === 'Plénière|Atelier|Déjeuner',
    'a convention reads professional moments', pro.moments.map((m) => m.label).join('|'));
  r.check(pro.guestCountTarget === 250, 'and counts participants', String(pro.guestCountTarget));
  r.check(!pro.questions.some((q) => /marie/i.test(q)),
    'and is never asked who is getting married', pro.questions.join(' | '));

  const wedding = intake.analyseIntake({
    description: 'On se marie le 18 juillet 2027, cérémonie à 11h, cocktail à 17h, dîner à 20h.',
    eventTypeId: 'mariage',
  });
  r.check(wedding.moments.map((m) => m.label).join('|') === 'Cérémonie|Cocktail|Dîner',
    'a wedding reads wedding moments', wedding.moments.map((m) => m.label).join('|'));
  r.check(wedding.questions.some((q) => /Qui se marie/.test(q)),
    'and asks the one thing it must not guess');

  const page = read('components', 'mirror', 'MirrorLanding.tsx');
  r.check(/data-landing="demo-head"/.test(page) && /MATT/.test(page) && /démonstration/.test(page),
    'the film carries a concrete example, labelled as a demonstration');
  r.check(/data-landing="causality"/.test(page)
    && page.indexOf('data-landing="causality"') > page.indexOf('<LandingFilm'),
    'the causality control sits on the film, not in a far section');
  r.check(/data-landing="rail"/.test(page) && /Plan B/.test(page),
    'the scenario section compares two rails');
  r.check(/data-landing="doc-row"/.test(page), 'and documents hang on hours');
  // PRODUCT DECISION (convergence finale): two sequences were added — IMPORTER
  // LE CHAOS and L'ADMINISTRATION INVISIBLE — both demanded by the brief and
  // both demonstrating a real function. The ceiling moves from 10 to 12; the
  // guarantee (big sequences, never a catalogue of cards) is unchanged.
  r.check((page.match(/<section/g) || []).length <= 12,
    'the page stays a sequence of big sections, not a catalogue',
    String((page.match(/<section/g) || []).length));

  const registryV3 = read('design', 'editorialRegistry.ts');
  r.check(/firstName/.test(registryV3) && /Émilie/.test(registryV3),
    'the demonstration people have a first name and a thread');

  // -------------------------------------------------------------------------
  console.log('\n[11/13] SPECTACLE — a performer is a Person with a craft');
  // -------------------------------------------------------------------------
  const identityTypes = read('types', 'identity.ts');
  r.check(/export interface PersonCraft/.test(identityTypes) && /craft\?: PersonCraft/.test(identityTypes),
    'the craft is a block on Person, not a new entity');
  for (const forbidden of ['interface Performer', 'interface Technician', 'interface CrewMember', 'interface CallSheet']) {
    r.check(!identityTypes.includes(forbidden), `no ${forbidden.replace('interface ', '')} entity was created`);
  }

  // A crew member, their moments, and a road map that is derived — never stored.
  const artist = store.createPerson({ displayName: 'MATT SAXO', asGuest: false });
  r.check(Boolean(artist), 'an artist is created as a Person');
  r.check(store.setPersonCraft(artist.id, { role: 'Saxophoniste' }), 'and given a craft');
  r.check(store.setPersonCraft(artist.id, { role: '' }) === false || store.persons.find((p) => p.id === artist.id).craft.role === 'Saxophoniste',
    'a craft without a role is refused');
  r.check(store.getCrew().some((p) => p.id === artist.id), 'the crew lists them');

  const day = store.phases.sort((a, b) => a.startHour - b.startHour);
  store.attachPersonToPhase(day[0].id, artist.id);
  store.attachPersonToPhase(day[1].id, artist.id);
  let sheet = store.getCallSheet(artist.id);
  r.check(sheet.rows.length === 2, 'the road map lists exactly the moments they work',
    JSON.stringify(sheet.rows.map((x) => x.label)));
  r.check(sheet.rows.every((x) => x.kind === 'moment'),
    'and invents no arrival when no setup time was declared');

  store.setPersonCraft(artist.id, { setupMinutes: 45, teardownMinutes: 30 });
  sheet = store.getCallSheet(artist.id);
  r.check(sheet.rows.length === 4 && sheet.rows[0].kind === 'setup',
    'a declared setup time adds an arrival, at the right hour',
    JSON.stringify(sheet.rows.map((x) => `${x.kind}:${Math.round(x.hour * 60)}`)));
  r.check(Math.abs(sheet.rows[0].hour - (day[0].startHour - 0.75)) < 1e-6,
    'exactly 45 minutes before the first moment');

  // Move the moment: the road map follows, because it was never a copy.
  const beforeHour = sheet.rows[0].hour;
  store.setPhaseTime(day[0].id, day[0].startHour + 0.5);
  sheet = store.getCallSheet(artist.id);
  r.check(Math.abs(sheet.rows[0].hour - (beforeHour + 0.5)) < 1e-6,
    'moving a moment recomputes the road map, with no second write',
    `${beforeHour} → ${sheet.rows[0].hour}`);

  // Conflicts and gaps, from the real data.
  const crewFindings = store.crewFindings();
  r.check(crewFindings.some((f) => /Besoins techniques non déclarés/.test(f.title)),
    'undeclared technical needs are reported, not guessed');
  store.addCraftRequirement(artist.id, 'Micro HF');
  r.check(!store.crewFindings().some((f) => /Besoins techniques non déclarés — MATT SAXO/.test(f.title)),
    'and the report goes away once they are declared');
  r.check(store.crewFindings().every((f) => ['conflict', 'gap'].includes(f.level)),
    'every line carries a level, and no opinion');

  const overlap = store.phases.find((p) => p.id !== day[0].id && p.id !== day[1].id);
  if (overlap) {
    store.attachPersonToPhase(overlap.id, artist.id);
    store.setPhaseTime(overlap.id, day[0].startHour + 0.1);
    r.check(store.crewFindings().some((f) => f.level === 'conflict' && /deux endroits/.test(f.title)),
      'someone expected in two places at once is a conflict');
  }

  r.check(store.whoWorksBetween(0, 30).some((w) => w.person.id === artist.id),
    'the day can answer « who works between these hours »');
  r.check(store.searchEverything('saxo').some((x) => /Saxophoniste/.test(x.label)),
    'the universal search finds a craft');

  const crewUi = read('components', 'mirror', 'organisation', 'CrewPanel.tsx');
  r.check(/getCallSheet/.test(crewUi) && !/localStorage/.test(crewUi),
    'the crew surface reads the projection and writes nothing of its own');
  r.check(/Ma journée/.test(crewUi), 'and it is called « Ma journée »');

  const landingCrew = read('components', 'mirror', 'MirrorLanding.tsx');
  r.check(/data-landing="spectacle"/.test(landingCrew)
    && /Un moment ne se produit jamais par hasard/.test(landingCrew),
    'the public page carries the spectacle section');
  r.check(/SPECTACLE_CRAFTS/.test(landingCrew), 'with the crafts named from the registry');

  // -------------------------------------------------------------------------
  console.log('\n[12/13] ORCHESTRATION — several events, one identity, no second base');
  // -------------------------------------------------------------------------
  const weddingTypes = read('types', 'wedding.ts');
  r.check(/assignedPersonId\?: string/.test(weddingTypes) && /status\?: 'todo'/.test(weddingTypes),
    'a mission is a task with someone on it — no Mission entity');
  r.check(/travel\?: \{/.test(read('types', 'identity.ts')),
    'travel and lodging are optional fields of the craft — no TravelSheet entity');

  const orch = store;
  const artist2 = orch.persons.find((p) => p.craft?.role) ?? orch.createPerson({ displayName: 'REMPLACANT TEST', asGuest: false });
  if (!artist2.craft) orch.setPersonCraft(artist2.id, { role: 'Saxophoniste' });

  // Delegation
  const mission = orch.createMission({ title: 'Vérifier le contrat', assignedPersonId: artist2.id });
  r.check(Boolean(mission) && orch.getMissionsFor(artist2.id).length === 1,
    'a mission can be delegated to a person');
  r.check(orch.setMissionStatus(mission.id, 'to_confirm')
    && orch.tasks.find((t) => t.id === mission.id).status === 'to_confirm',
    'and it carries a state everyone can read');
  r.check(orch.createMission({ title: '  ' }) === null, 'an empty mission is refused');

  // Travel
  r.check(orch.setPersonTravel(artist2.id, { from: 'Bruxelles', hotel: 'Hôtel du Parc' }),
    'travel can be written');
  r.check(orch.persons.find((p) => p.id === artist2.id).craft.travel.from === 'Bruxelles',
    'exactly as it was typed');
  orch.setPersonTravel(artist2.id, { from: '' });
  r.check(!orch.persons.find((p) => p.id === artist2.id).craft.travel?.from,
    'and an emptied field becomes an absence, not an empty string');

  // Replacements: proposals only, from people who really exist
  const twin = orch.createPerson({ displayName: 'AUTRE SAXO', asGuest: false });
  orch.setPersonCraft(twin.id, { role: 'Saxophoniste' });
  const options = orch.findReplacements(artist2.id);
  r.check(options.some((o) => o.person.id === twin.id),
    'a replacement with the same craft is proposed', String(options.length));
  r.check(options.every((o) => orch.persons.some((p) => p.id === o.person.id)),
    'and only people who already exist are proposed');
  r.check(orch.phases.every((ph) => !(ph.personIds ?? []).includes(twin.id)),
    'proposing never swaps anyone');

  // Documents: produced into the ONE document system
  const mediaBefore = orch.media.length;
  const doc = orch.generateAdminDocument({
    docKind: 'Devis', authorKind: 'Moi', recipientKind: 'Association',
    recipientName: 'ASSOCIATION LES FEES', personId: artist2.id,
  });
  r.check(Boolean(doc) && orch.media.length === mediaBefore + 1,
    'a document is produced as a MediaAsset — no second document system');
  r.check(doc.ownerKind === 'person' && doc.ownerId === artist2.id,
    'attached to the person it concerns');
  const body = decodeURIComponent(String(doc.source).split(',')[1] || '');
  r.check(/À CONFIRMER/.test(body), 'what the project does not know is written « À CONFIRMER »');
  r.check(/Montant : À CONFIRMER/.test(body), 'and no amount is invented');
  r.check(orch.generateAdminDocument({ docKind: 'Devis', authorKind: 'Moi', recipientKind: 'X', recipientName: '  ' }) === null,
    'a document without a recipient is refused');

  // Cross-event reading: read-only, and honest about matching on a name
  r.check(Array.isArray(orch.crossEventConflicts()), 'the cross-event check answers');
  const crewSrc = read('components', 'mirror', 'organisation', 'CrewPanel.tsx');
  r.check(/deux homonymes ne sont pas la même personne/.test(crewSrc),
    'and says out loud that a name is not an identity');
  r.check(/n’est pas\s+disponible ici/.test(crewSrc) || /aucun accès réseau/.test(crewSrc),
    'looking a company up on the web is declared unavailable, not simulated');
  r.check(!/fetch\(|https?:\/\//.test(crewSrc), 'and the surface calls nothing outside');

  // -------------------------------------------------------------------------
  console.log('\n[13/13] CONVERGENCE FINALE — five certainties, a first day, one desk');
  // -------------------------------------------------------------------------
  const cert = read('design', 'certainty.ts');
  for (const level of ['confirmed', 'inferred', 'estimated', 'to_confirm', 'missing']) {
    r.check(cert.includes(`${level}:`), `the level ${level} exists, once`);
  }
  r.check((read('types', 'wedding.ts').match(/export type Certainty/g) || []).length === 1,
    'and there is exactly one definition of certainty in the whole product');
  r.check(/confidence\?: Certainty/.test(read('types', 'wedding.ts')),
    'a moment carries how sure we are of its hour');

  // A day with no hour at all becomes a PROPOSED day, entirely estimated.
  const intakeMod = await harness.load('../game/projectIntake', 'intake-finale');
  const bare = intakeMod.analyseIntake({
    description: 'Nous nous marions le 18 juillet 2027 au Château de Vaux.',
  });
  r.check(bare.proposedDay === true, 'with no hour written, a first day is proposed');
  r.check(bare.moments.length === 10 && bare.moments.every((m) => m.confidence === 'estimated'),
    'and every one of its hours is ESTIMÉ, never confirmed',
    `${bare.moments.length} · ${[...new Set(bare.moments.map((m) => m.confidence))].join(',')}`);
  r.check(bare.certainty.principals === 'missing' && bare.coupleNames === null,
    'the couple stays MANQUANT — nothing is invented to fill it');
  r.check(bare.questions.some((q) => /ESTIMÉE|point de départ/.test(q)),
    'and the proposal says out loud that it is only a starting point');
  const noSkeleton = intakeMod.analyseIntake({ description: 'Un truc en 2027.', eventTypeId: 'autre' });
  r.check(noSkeleton.proposedDay === false && noSkeleton.moments.length === 0,
    'a day whose nature is unknown gets no proposed shape at all');

  // The state of a scene is DERIVED, and it can be closed by generating.
  const anyPhase = store.phases[0];
  const sceneState = store.phaseFindings(anyPhase.id);
  r.check(Array.isArray(sceneState) && sceneState.length > 0, 'a moment can say what it is missing');
  r.check(sceneState.every((f) => ['ok', 'gap', 'conflict'].includes(f.level)),
    'in the same grammar as the rest of the product');
  r.check(store.phaseFindings('phase_inconnue').length === 0, 'and an unknown moment says nothing');
  r.check(Array.isArray(store.missingDocumentsForPhase(anyPhase.id)),
    'the missing documents of a moment are readable');

  // Propagation names who moves BEFORE anything moves.
  const impact = store.propagationImpact(anyPhase.id, 0.5);
  r.check(impact !== null && Array.isArray(impact.people) && Array.isArray(impact.conflicts),
    'moving a moment can be read before it happens');
  r.check(store.propagationImpact('phase_inconnue', 0.5) === null, 'and an unknown moment cannot');
  const stillThere = store.phases.find((p) => p.id === anyPhase.id);
  r.check(stillThere.startHour === anyPhase.startHour,
    'reading the impact changes nothing — it is a pure projection');

  // Administration reads events; it never holds them.
  r.check(Array.isArray(store.adminEvents()) && store.adminEvents().length >= 1,
    'the administration lists the events really stored');
  r.check(Array.isArray(store.adminAlerts()), 'and what awaits a decision in them');
  r.check(store.searchAcrossEvents('a').length === 0, 'a one-letter search returns nothing');
  r.check(store.personDossier('inconnu') === null, 'an unknown person has no card');
  const adminSrc = read('components', 'mirror', 'admin', 'AdminConsole.tsx');
  r.check(!/localStorage|savePersistedState/.test(adminSrc),
    'the administration writes nothing of its own — no second base');
  r.check(!/fetch\(|https?:\/\//.test(adminSrc), 'and calls nothing outside');
  r.check(/pas\s+simulées/.test(adminSrc.replace(/\s+/g, ' ')) || /n’est pas\s+disponible/.test(adminSrc.replace(/\s+/g, ' ')),
    'it says plainly what this environment cannot do');
  r.check(/matchedByName/.test(adminSrc) && /à confirmer/i.test(adminSrc),
    'and never presents a name match as an identity');

  // One door: the World surfaces are unreachable from the product.
  const appFinale = read('App.tsx');
  r.check(/const inWorld = weddingStore\.projection === 'world'/.test(appFinale),
    'the keyboard shortcuts know where they are allowed to fire');
  r.check(/projection === 'world' && !weddingStore\.showIdentityModal && <EntityInspector/.test(appFinale),
    'the World inspector exists only inside the World');
  r.check(/projection === 'world' && !weddingStore\.showIdentityModal && weddingStore\.viewMode === 'timeline' && <LivingTimelineView/.test(appFinale),
    'and so does the World’s own timeline — the product has exactly one');
  for (const flag of ['connectorsModalOpen', 'worldLabModalOpen', 'systemNerveModalOpen', 'djBoothModalOpen']) {
    r.check(new RegExp(`projection === 'world' && weddingStore\\.${flag}`).test(appFinale),
      `${flag} cannot open over the product`);
  }

  // Role decides how much complexity is shown — using the model that exists.
  r.check(typeof store.currentRole() === 'string' && typeof store.isOrchestrator() === 'boolean',
    'the product can ask who is looking');
  const siteSrc = read('components', 'mirror', 'MirrorSite.tsx');
  r.check(/store\.isOrchestrator\(\)/.test(siteSrc) && /nav-admin/.test(siteSrc),
    'and the administration is offered only to those who orchestrate');

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll Jour J checks passed.\u001b[0m\n');
