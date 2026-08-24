#!/usr/bin/env node
/**
 * AIME — finishing pass guard (WORLD ↔ MIRROR ↔ CANVAS).
 *
 * The earlier suites prove each surface in isolation. This one proves the
 * thing the product actually promises: that the three projections are ONE
 * experience over ONE model.
 *
 * Every round trip below is executed against the real store and the real read
 * model — no fixtures, no mocks, no invented entity.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mAIME — finishing pass: World ↔ Mirror ↔ Canvas\u001b[0m');

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
  const m = await harness.load('weddingStore', fresh ? `fin${++boots}` : undefined);
  un();
  return m.weddingStore;
}

const MIRROR_DIR = path.join(SRC, 'components', 'mirror');
const CANVAS_DIR = path.join(SRC, 'components', 'canvas');
const read = (dir, file) => readFileSync(path.join(dir, file), 'utf8');
const readAll = (dir) => readdirSync(dir).filter((f) => /\.tsx?$/.test(f))
  .map((f) => read(dir, f)).join('\n/* --- */\n');

try {
  const store = await boot();
  const proj = await harness.loadPath('projections/worldModel');
  const un = silence();

  // ---------------------------------------------------------------------------
  console.log('\n[1/6] Every real relation reaches every projection');
  // ---------------------------------------------------------------------------
  {
    const model = proj.projectWorldModel();

    // Personne ↔ Moment
    const phaseWithPeople = store.phases.find((p) => (p.keyAgentIds ?? []).length > 0);
    if (phaseWithPeople) {
      const moment = model.programme.moments.find((m) => m.phaseId === phaseWithPeople.id);
      r.check(moment.persons.length > 0 && moment.persons.length <= moment.keyPersonIds.length,
        'a moment exposes its people as resolved references, not just ids',
        `${moment.persons.length}/${moment.keyPersonIds.length}`);
      r.check(moment.persons.every((p) => store.persons.some((x) => x.id === p.personId)),
        'each of them resolves to a real Person');
      // Final visual audit: a vendor's contact person was rendered twice in the
      // same moment — once as a person, once as the company. The person side
      // now drops whoever is already named as a vendor.
      const vendorContacts = new Set(moment.vendors
        .map((v) => store.vendors.find((x) => x.id === v.vendorId)?.contactPersonId)
        .filter(Boolean));
      r.check(moment.persons.every((p) => !vendorContacts.has(p.personId)),
        'and never repeats someone already named as a vendor of that moment');
      // The same edge, seen from the person.
      const someone = moment.persons[0];
      const guest = model.guests.guests.find((g) => g.personId === someone.personId);
      if (guest) {
        r.check(guest.moments.some((mo) => mo.phaseId === moment.phaseId),
          'the SAME edge is visible from the person side (Personne ↔ Moment)');
      }
    }

    // Personne ↔ Table
    const seated = model.guests.guests.find((g) => g.tableId);
    r.check(!!seated && store.seatingTables.some((t) => t.id === seated.tableId),
      'Personne ↔ Table resolves to a real table');
    const table = model.guests.tables.find((t) => t.tableId === seated.tableId);
    r.check(table.guests.some((g) => g.guestId === seated.guestId),
      'and the table lists the same guest back (both directions agree)');

    // Prestataire ↔ Lieu ↔ Moment
    const vendorWithPlace = model.vendors.vendors.find((v) => v.places.length > 0);
    r.check(!!vendorWithPlace, 'at least one vendor is attached to a real place');
    const place = model.places.places.find((p) => p.placeId === vendorWithPlace.places[0].placeId);
    r.check(place.vendors.some((v) => v.vendorId === vendorWithPlace.vendorId),
      'Prestataire ↔ Lieu agrees in both directions');
    if (place.moments.length > 0) {
      r.check(vendorWithPlace.moments.some((m) => m.phaseId === place.moments[0].phaseId),
        'Lieu ↔ Moment propagates to the vendor (the third edge of the triangle)');
    }

    // Morceau ↔ Moment
    const scheduled = model.music.songs.find((s) => s.phaseId);
    r.check(!!scheduled, 'at least one track is anchored to a moment');
    const host = model.programme.moments.find((m) => m.phaseId === scheduled.phaseId);
    r.check(host.songs.some((s) => s.songId === scheduled.songId),
      'Morceau ↔ Moment agrees in both directions (same songId)');

    // Média ↔ owner: every gallery item knows what it belongs to.
    const photo = store.addMedia({
      kind: 'image', source: 'data:image/png;base64,FINAL',
      ownerKind: 'person', ownerId: seated.personId, title: 'Portrait réel',
    });
    const withMedia = proj.projectWorldModel();
    const galleryItem = withMedia.gallery.find((g) => g.mediaId === photo.id);
    r.check(galleryItem.ownerKind === 'person' && galleryItem.ownerId === seated.personId,
      'a gallery item carries its real owner (Média ↔ Wedding, by id)');
    r.check(galleryItem.ownerLabel === store.getPerson(seated.personId).displayName,
      'and the owner label is resolved, never stored twice', galleryItem.ownerLabel);

    // Personne ↔ Média: the portrait appears with no extra plumbing.
    const guestAfter = withMedia.guests.guests.find((g) => g.personId === seated.personId);
    r.check(guestAfter.portraitSource === 'data:image/png;base64,FINAL',
      'adding a photo in the Canvas makes it a real portrait in the Mirror');
    const momentAfter = withMedia.programme.moments
      .find((m) => m.persons.some((p) => p.personId === seated.personId));
    if (momentAfter) {
      r.check(momentAfter.persons.find((p) => p.personId === seated.personId).portraitSource
        === 'data:image/png;base64,FINAL',
        'the same photo appears on the timeline, from the same MediaAsset');
    }
    store.removeMedia(photo.id);
    r.check(proj.projectWorldModel().guests.guests
      .find((g) => g.personId === seated.personId).portraitSource === null,
      'removing it returns the person to initials — nothing is cached');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[1b/6] 06 MÉDIAS tells the truth about what it can show');
  // ---------------------------------------------------------------------------
  {
    const site = read(MIRROR_DIR, 'MirrorSite.tsx');
    // A song preview is a real MediaAsset, but it is not a photograph: a
    // gallery driven by the raw media count renders an EMPTY section when the
    // only assets are audio. The section counts images, and says the rest.
    r.check(/galleryImages\s*=\s*gallery\.filter\(\(m\) => m\.kind === 'image'\)/.test(site),
      'the gallery decides on IMAGES, not on the raw media count');
    r.check(/galleryImages\.length > 0 \? \(/.test(site),
      'so an audio-only project shows the empty state instead of a blank section');
    r.check(/otherMedia > 0/.test(site),
      'and the non-image files are still accounted for, honestly');

    const track = store.tracks[0];
    const audio = store.addMedia({
      kind: 'audio', source: 'data:audio/mpeg;base64,FINAL',
      ownerKind: 'song', ownerId: track.id, title: 'Extrait',
    });
    const model = proj.projectWorldModel();
    r.check(model.gallery.some((g) => g.mediaId === audio.id),
      'the audio asset IS part of the project media');
    r.check(model.gallery.filter((g) => g.kind === 'image').length === 0,
      'but it is not an image, so the gallery has nothing to display');
    r.check(model.music.songs.find((sg) => sg.songId === track.id).audioSource
      === 'data:audio/mpeg;base64,FINAL',
      'while 05 MUSIQUE can genuinely play it');
    store.removeMedia(audio.id);
  }

  // ---------------------------------------------------------------------------
  console.log('\n[2/6] Temporal drag & drop is a real, persisted mutation');
  // ---------------------------------------------------------------------------
  {
    const before = [...store.phases].sort((a, b) => a.startHour - b.startHour);
    const ids = before.map((p) => p.id);
    const durations = new Map(before.map((p) => [p.id, p.endHour - p.startHour]));
    const firstStart = before[0].startHour;

    const moved = store.movePhaseToIndex(ids[0], 2);
    r.check(moved === true, 'a moment can be moved to another position');

    const after = [...store.phases].sort((a, b) => a.startHour - b.startHour);
    r.check(after.map((p) => p.id).join() !== ids.join(), 'the order really changed');
    r.check(after[2].id === ids[0], 'the moved moment landed at the requested index',
      `${after[2].id} vs ${ids[0]}`);
    r.check(after.every((p) => Math.abs((p.endHour - p.startHour) - durations.get(p.id)) < 1e-9),
      'EVERY moment kept its own duration — nothing was stretched');
    r.check(Math.abs(after[0].startHour - firstStart) < 1e-9,
      'the day still starts at the same real hour — no invented time');
    let overlaps = 0;
    for (let i = 1; i < after.length; i++) if (after[i].startHour < after[i - 1].endHour) overlaps++;
    r.check(overlaps === 0, 'the recomputed programme contains no overlap', String(overlaps));

    // One undo step for the whole move.
    r.check(store.canUndo(), 'the move is undoable');
    store.undo();
    const undone = [...store.phases].sort((a, b) => a.startHour - b.startHour);
    r.check(undone.map((p) => p.id).join() === ids.join(),
      'a single undo restores the whole programme');

    // Persistence.
    store.movePhaseToIndex(ids[0], 2);
    store.saveCurrentState();
    const reloaded = await boot(true);
    const persisted = [...reloaded.phases].sort((a, b) => a.startHour - b.startHour);
    r.check(persisted[2].id === ids[0], 'the move survives a reload');

    // Refusals leave the data untouched.
    const snapshot = store.phases.map((p) => `${p.id}:${p.startHour}`).join('|');
    r.check(store.movePhaseToIndex('phase_does_not_exist', 1) === false,
      'moving an unknown moment fails honestly');
    r.check(store.movePhaseToIndex(ids[0], 2) === false,
      'moving to the position it already occupies changes nothing');
    r.check(store.phases.map((p) => `${p.id}:${p.startHour}`).join('|') === snapshot,
      'a refused move leaves the programme byte-for-byte identical');

    store.undo();
  }

  // ---------------------------------------------------------------------------
  console.log('\n[3/6] Mirror → Canvas opens IN CONTEXT, and comes back');
  // ---------------------------------------------------------------------------
  {
    const model = proj.projectWorldModel();
    store.setProjection('mirror');

    // Section-level: "Composer" in 04 LIEUX must land on the Lieux surface.
    const intentBefore = store.canvasIntent;
    store.openCanvas(undefined, 'places');
    r.check(store.canvasOpen === true, 'the Canvas opens');
    r.check(store.canvasSection === 'places', 'on the requested section');
    r.check(store.canvasIntent === intentBefore + 1,
      'the intent counter lets the same section be requested twice');
    r.check(store.projection === 'mirror',
      'opening the Canvas NEVER throws the reader back into the 3D world');
    r.check(store.getCanvasShell() === 'mirror', 'and the editorial shell is the one used');

    // Entity-level round trips, one per kind, all by stable id.
    const cases = [
      ['event', model.programme.moments[0].phaseId, 'programme'],
      ['person', model.guests.guests[0].personId, 'people'],
      ['vendor', model.vendors.vendors[0].vendorId, 'vendors'],
      ['place', model.places.places[0].placeId, 'places'],
      ['song', model.music.songs[0].songId, 'music'],
    ];
    for (const [kind, id, expectedTab] of cases) {
      store.openCanvas({ kind, id });
      r.check(store.canvasFocus.kind === kind && store.canvasFocus.id === id,
        `Mirror → Canvas keeps the ${kind} identity (${id})`);
      r.check(store.projection === 'mirror', `and stays in the Mirror for a ${kind}`);
      void expectedTab;
    }

    // The Canvas tab mapping is the one the shells use.
    const core = read(CANVAS_DIR, 'CanvasCore.tsx');
    for (const [kind, , expectedTab] of cases) {
      if (kind === 'event') continue;
      r.check(new RegExp(`case '${kind}': return '${expectedTab}'`).test(core),
        `a ${kind} focus maps to the ${expectedTab} surface`);
    }
    const shells = ['WorldCanvasShell.tsx', 'MirrorCanvasShell.tsx'];
    for (const shell of shells) {
      const src = read(CANVAS_DIR, shell);
      r.check(/store\.canvasIntent !== lastIntent/.test(src),
        `${shell} honours a section request from the Mirror`);
    }

    store.closeCanvas();
    r.check(store.canvasOpen === false && store.projection === 'mirror',
      'closing the Canvas returns to the Mirror, not to the World');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[4/6] World ↔ Mirror: the selected identity survives the crossing');
  // ---------------------------------------------------------------------------
  {
    const model = proj.projectWorldModel();
    const guest = model.guests.guests.find((g) => g.canShowInWorld);

    store.setProjection('world');
    store.showPersonInMirror(guest.personId);
    r.check(store.projection === 'mirror', 'World → Mirror switches surface');
    r.check(store.mirrorFocusPersonId === guest.personId,
      'and carries the SAME personId, not an index');

    const shown = store.showPersonInWorld(guest.personId);
    r.check(shown === true && store.projection === 'world',
      'Mirror → World comes back to the same person');
    r.check(store.selectedEntity?.type === 'agent' && store.selectedEntity?.id === guest.agentId,
      'the World selects the agent that projects that very person',
      `${JSON.stringify(store.selectedEntity)} vs ${guest.agentId}`);

    // A person with no spatial projection must be refused, not faked.
    const created = store.createPerson({ displayName: 'Personne sans agent', asGuest: false });
    r.check(store.showPersonInWorld(created.id) === false,
      'a person with no agent is refused rather than shown as someone else');
    store.deletePerson?.(created.id);

    // The veil never remounts the 3D scene.
    const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    r.check(/<ProjectionVeil projection=/.test(app), 'the crossing is rendered by the veil');
    r.check(/<WeddingWorld \/>/.test(app) && !/key=\{weddingStore\.projection\}/.test(app),
      'the World is never re-keyed by the projection — the WebGL context survives');
    const veil = readFileSync(path.join(SRC, 'components', 'ui', 'projectionTransition.css'), 'utf8');
    r.check(/prefers-reduced-motion/.test(veil), 'the transition respects reduced motion');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[5/6] Editorial finish: no dashboard, no fabricated content');
  // ---------------------------------------------------------------------------
  {
    const mirrorAll = readAll(MIRROR_DIR);
    // Comments explain the rules; only real code and copy are judged here.
    const mirrorCode = mirrorAll
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    // The `${fluid(a,b)}px` bug produced `clamp(...)px`, which browsers drop.
    const brokenFluid = [...mirrorAll.matchAll(/\$\{fluid\([^}]*\)\}px/g)];
    r.check(brokenFluid.length === 0,
      'no invalid CSS length is produced by the fluid() helper',
      brokenFluid.slice(0, 3).map((x) => x[0]).join(' | '));

    // Responsive rules that inline styles cannot express really exist.
    const css = read(MIRROR_DIR, 'mirror.css');
    r.check(/@media \(max-width: 680px\)/.test(css), 'the timeline collapses on a phone');
    r.check(/\.wc-gallery/.test(css) && /nth-child\(5n \+ 1\)/.test(css),
      'the gallery composition is asymmetric by design, at any real count');
    r.check(/overflow-x: hidden/.test(css), 'no accidental horizontal scrolling on mobile');
    r.check(/:focus-visible/.test(css), 'every control has a visible keyboard focus state');
    r.check(/pointer: coarse/.test(css), 'touch targets are enlarged on touch devices');
    r.check(/prefers-reduced-motion/.test(css), 'motion is disabled for those who ask');

    // The Mirror still refuses to become an admin surface.
    r.check(!/dashboard|Tableau de bord/i.test(mirrorCode), 'the Mirror is not a dashboard');
    r.check(!/lorem|ipsum|TODO|FIXME/i.test(mirrorCode),
      'no placeholder copy survived the finishing pass');

    // Technical values are checked where they would actually appear: in the
    // projected model itself, not in the source of the components.
    const flat = [];
    const walk = (node, trail) => {
      if (node === null || node === undefined) return;
      if (typeof node === 'string') { flat.push([trail, node]); return; }
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${trail}[${i}]`)); return; }
      if (typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) walk(v, `${trail}.${k}`);
      }
    };
    walk(proj.projectWorldModel(), 'model');
    const leaked = flat.filter(([, v]) => /\b(undefined|NaN)\b|\[object Object\]/.test(v));
    r.check(leaked.length === 0, 'no technical value can leak into the page',
      leaked.slice(0, 3).map(([k, v]) => `${k}=${v}`).join(' | '));

    // Images carry a real alternative text.
    const imgs = [...mirrorCode.matchAll(/<img[\s\S]{0,400}?\/>/g)].map((x) => x[0]);
    const withoutAlt = imgs.filter((tag) => !/alt=/.test(tag));
    r.check(withoutAlt.length === 0, `every image has an alt attribute (${imgs.length} images)`,
      withoutAlt.slice(0, 2).join(' | '));
    const emptyAlt = imgs.filter((tag) => /alt=""/.test(tag));
    r.check(emptyAlt.length === 0,
      'no image is left with an empty alt where a real description exists',
      String(emptyAlt.length));

    // Icon-only controls are labelled.
    const iconButtons = [...mirrorAll.matchAll(/<button[\s\S]{0,600}?>\s*[↑↓↗↶↷✕⠿]\s*<\/button>/g)];
    const unlabelled = iconButtons.filter((m) => !/aria-label/.test(m[0]));
    r.check(unlabelled.length === 0, 'icon-only controls carry an aria-label');

    // Navigation states are announced, not only coloured.
    const nav = read(MIRROR_DIR, 'MirrorNav.tsx');
    r.check(/aria-current/.test(nav), 'the active section is announced to assistive tech');
    r.check(/ArrowRight|ArrowLeft/.test(nav), 'the rail is operable from the keyboard');
    r.check(/position: 'sticky'/.test(nav), 'the rail stays available while scrolling');
  }

  // ---------------------------------------------------------------------------
  console.log('\n[6/6] Performance and honesty invariants still hold');
  // ---------------------------------------------------------------------------
  {
    const mirrorAll = readAll(MIRROR_DIR);
    r.check(/loading="lazy"/.test(mirrorAll), 'images are lazy by default');
    r.check(!/fetch\(|XMLHttpRequest/.test(mirrorAll),
      'rendering the Mirror performs no network call whatsoever');
    r.check(/preload\s*=\s*'none'/.test(readFileSync(path.join(SRC, 'game', 'musicPlayer.ts'), 'utf8')),
      'no audio is downloaded before an explicit Play');

    // No projection may hold its own copy of a domain entity.
    const forbidden = [...readAll(MIRROR_DIR).matchAll(/useState<\s*(Person|Guest|Vendor|Place|Track)\b/g)];
    r.check(forbidden.length === 0, 'no Mirror component keeps a local copy of a domain entity');

    // The World keeps its frameloop suspended behind the Mirror.
    const world = readFileSync(path.join(SRC, 'components', '3d', 'WeddingWorld.tsx'), 'utf8');
    r.check(/frameloop=\{[^}]*'never'/.test(world),
      'the 3D render loop is paused while the Mirror is on screen');

    // The enrichment provider is still lazily loaded.
    const enrichIndex = readFileSync(path.join(SRC, 'game', 'enrichment', 'index.ts'), 'utf8');
    r.check(/import\(\s*'\.\/itunesProvider'\s*\)/.test(enrichIndex),
      'the iTunes provider is still behind a dynamic import');

    // The stylesheet is actually wired in.
    r.check(/import '\.\/mirror\.css'/.test(read(MIRROR_DIR, 'MirrorSite.tsx')),
      'the Mirror stylesheet is imported by the Mirror itself');
    r.check(existsSync(path.join(MIRROR_DIR, 'mirror.css')), 'and it exists');
  }

  un();
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll finishing-pass checks passed.\u001b[0m\n');
