#!/usr/bin/env node
/**
 * Wedding City — interaction & data-integrity guard.
 *
 * Covers roadmap items 1.6 (WASD), 1.7 ("Reconstruire" button) and
 * 1.8 (World Engine orphan references).
 *
 * Each of these was verified broken before the fix:
 *   1.6 — InteriorVenueView read a `keys.current` ref that nothing ever wrote.
 *   1.7 — the "Reconstruire →" button had no onClick at all.
 *   1.8 — generated Travel/Concert worlds referenced doc_vols_japan,
 *         doc_ryokan_kyoto, doc_jr_pass, doc_tech_rider, tk_diner_kaiseki and
 *         tk_soundcheck without ever creating them.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — interaction & integrity guard\u001b[0m');

const harness = await compileGameModules();

/** Minimal DOM event plumbing so input.ts can be exercised headlessly. */
function installKeyboardCapableWindow() {
  const listeners = new Map();
  const win = {
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    dispatch: (type, event) => { for (const fn of listeners.get(type) ?? []) fn(event); },
    _listeners: listeners,
  };
  globalThis.window = win;
  return win;
}

try {
  // -------------------------------------------------------------------------
  console.log('\n[1/4] WASD avatar movement (roadmap 1.6)');
  // -------------------------------------------------------------------------
  {
    const win = installKeyboardCapableWindow();
    const input = await harness.load('input', 'input1');

    const uninstall = input.installInput();
    r.check(win._listeners.has('keydown'), 'installInput() actually registers a keydown listener');

    // Nothing held → no movement.
    let axes = input.moveAxes();
    r.check(axes.x === 0 && axes.y === 0, 'idle: no movement');

    // W → forward
    win.dispatch('keydown', { code: 'KeyW', key: 'w', target: null, preventDefault() {} });
    axes = input.moveAxes();
    r.check(axes.y === 1 && axes.x === 0, 'W moves forward', `got x=${axes.x} y=${axes.y}`);

    // W+D → normalized diagonal (length 1, not 1.41)
    win.dispatch('keydown', { code: 'KeyD', key: 'd', target: null, preventDefault() {} });
    axes = input.moveAxes();
    const len = Math.hypot(axes.x, axes.y);
    r.check(Math.abs(len - 1) < 1e-9, 'diagonals are normalized (no speed boost)', `length=${len}`);

    // keyup releases
    win.dispatch('keyup', { code: 'KeyW', key: 'w', target: null });
    axes = input.moveAxes();
    r.check(axes.y === 0, 'releasing W stops forward movement', `y=${axes.y}`);

    // Arrow keys work too (release D first so the axis is not a diagonal).
    win.dispatch('keyup', { code: 'KeyD', key: 'd', target: null });
    win.dispatch('keydown', { code: 'ArrowUp', key: 'ArrowUp', target: null, preventDefault() {} });
    r.check(input.moveAxes().y === 1, 'arrow keys are supported', `y=${input.moveAxes().y}`);
    win.dispatch('keyup', { code: 'ArrowUp', key: 'ArrowUp', target: null });

    // Typing in a field must NOT drive the avatar.
    win.dispatch('keydown', { code: 'KeyW', key: 'w', target: { tagName: 'INPUT' }, preventDefault() {} });
    r.check(input.moveAxes().y === 0, 'typing "w" in a text field does not move the avatar',
      `y=${input.moveAxes().y}`);

    // blur clears stuck keys (alt-tab while holding W)
    win.dispatch('keydown', { code: 'KeyW', key: 'w', target: null, preventDefault() {} });
    win.dispatch('blur', {});
    r.check(input.moveAxes().y === 0, 'window blur clears held keys (no stuck movement)');

    uninstall();

    // The component must consume the shared module, not a dead local ref.
    const view = readFileSync(path.join(SRC, 'components', '3d', 'InteriorVenueView.tsx'), 'utf8');
    r.check(/installInput\(\)/.test(view) && /moveAxes\(\)/.test(view),
      'InteriorVenueView uses the real input module');
    r.check(!/keys\.current/.test(view),
      'the dead `keys.current` ref is gone');

    const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    r.check(/isTypingTarget\(e\.target\)/.test(app),
      'global E/I/N/C/L/M/T shortcuts are suppressed while typing');
  }

  // -------------------------------------------------------------------------
  console.log('\n[2/4] "Reconstruire →" button (roadmap 1.7)');
  // -------------------------------------------------------------------------
  {
    const src = readFileSync(path.join(SRC, 'components', 'ui', 'ImportLocationModal.tsx'), 'utf8');
    const btn = src.slice(src.indexOf('Reconstruire') - 1200, src.indexOf('Reconstruire'));
    r.check(/onClick=\{\(e\)\s*=>/.test(btn), 'the button now has its own onClick handler');
    r.check(/stopPropagation\(\)/.test(btn), 'it stops propagation (no double import via the card)');
    r.check(/aria-label=/.test(btn), 'it is labelled for assistive technology');
    r.check(/disabled=\{isScanning\}/.test(btn), 'it is disabled while a scan is running');
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/4] World Engine generates a self-consistent graph (roadmap 1.8)');
  // -------------------------------------------------------------------------
  {
    installBrowserGlobals(createMemoryStorage());
    const { generateWorldFromDescription } = await harness.load('worldEngine', 'we1');
    const { checkReferentialIntegrity, describeBrokenReferences } = await harness.load('integrity', 'int1');

    for (const worldType of ['wedding', 'travel', 'concert', 'corporate']) {
      const world = generateWorldFromDescription({
        worldType,
        prompt: `Test world ${worldType}`,
        title: `Projet ${worldType}`,
        location: 'Paris',
        budget: 30000,
      });
      const report = checkReferentialIntegrity(world);
      r.check(report.ok,
        `world "${worldType}": ${report.checkedReferences} references all resolve`,
        describeBrokenReferences(report.broken));
    }

    // The checker must actually be capable of detecting a break.
    const broken = checkReferentialIntegrity({
      places: [{ id: 'p1', connectedDocIds: ['doc_ghost'], connectedAgentIds: [], connectedTaskIds: [] }],
      docs: [],
    });
    r.check(!broken.ok && broken.broken[0]?.missingId === 'doc_ghost',
      'the integrity checker detects a dangling reference (self-test)');
  }
  // -------------------------------------------------------------------------
  console.log('\n[4/4] Invitation link and join code are actually consumed');
  // -------------------------------------------------------------------------
  {
    const storage = createMemoryStorage();
    installBrowserGlobals(storage);
    const { weddingStore } = await harness.load('weddingStore', 'invite1');

    const code = weddingStore.currentProject.inviteCode;
    r.check(!!code, 'the demo project exposes an invite code', `code=${code}`);

    // Resolution: the code must resolve to a real stored project.
    const resolved = weddingStore.resolveInviteCode(code);
    r.check(resolved?.id === weddingStore.currentProject.id,
      'a valid code resolves to its project', `resolved=${resolved?.id}`);

    r.check(weddingStore.resolveInviteCode(` ${code.toLowerCase()} `)?.id === resolved?.id,
      'resolution tolerates case and whitespace');

    // Join with a role really applies the role.
    // (Web Audio is unavailable in Node; the diagnostics bus correctly reports
    // it, so we silence the expected console noise here.)
    const originalError = console.error;
    console.error = () => {};
    const join = weddingStore.joinProjectByCode(code, 'planner');
    console.error = originalError;
    r.check(join.ok, 'joinProjectByCode succeeds on a valid code', JSON.stringify(join));
    r.check(weddingStore.userIdentity.role === 'wedding_planner',
      'the invite role is applied to the local identity',
      `role=${weddingStore.userIdentity.role}`);

    // Failure paths must be explicit, not silently "successful".
    r.check(weddingStore.joinProjectByCode('').reason === 'empty', 'an empty code is rejected');
    const unknown = weddingStore.joinProjectByCode('WC-DOES-NOT-EXIST');
    r.check(!unknown.ok && unknown.reason === 'unknown',
      'an unknown code fails explicitly instead of pretending to work',
      JSON.stringify(unknown));

    // URL consumption — the whole point of the shared link.
    const fromUrl = weddingStore.consumeInviteFromUrl(`?code=${code}&role=guest`);
    r.check(fromUrl?.ok === true, 'a ?code= URL is consumed at startup', JSON.stringify(fromUrl));
    r.check(weddingStore.userIdentity.role === 'guest',
      'the role from the URL is applied', `role=${weddingStore.userIdentity.role}`);
    r.check(weddingStore.consumeInviteFromUrl('?foo=bar') === null,
      'a URL without a code is ignored');

    const main = readFileSync(path.join(SRC, 'main.tsx'), 'utf8');
    r.check(/consumeInviteFromUrl\(\)/.test(main), 'startup actually calls consumeInviteFromUrl()');

    const entry = readFileSync(path.join(SRC, 'components', 'entry', 'IdentityEntryFlow.tsx'), 'utf8');
    r.check(/joinProjectByCode\(joinCode\)/.test(entry),
      '"Accéder" uses the typed code instead of discarding it');
    r.check(/joinError/.test(entry), 'the join form surfaces an honest error message');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll interaction & integrity checks passed.\u001b[0m\n');
