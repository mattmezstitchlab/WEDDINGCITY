#!/usr/bin/env node
/**
 * Wedding City — error-handling guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * The codebase had 26 empty `catch {}` blocks and no React error boundary.
 * Consequences, both reproduced before the fix:
 *   - a failing localStorage write produced no log, no UI signal, nothing;
 *   - any render exception unmounted the tree and left a blank page.
 *
 * These tests assert that failures are now RECORDED rather than swallowed,
 * and that the source files that used to swallow them no longer do.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — error-handling guard\u001b[0m');

const harness = await compileGameModules();

try {
  // -------------------------------------------------------------------------
  console.log('\n[1/4] Diagnostics bus records, deduplicates and reports');
  // -------------------------------------------------------------------------
  {
    installBrowserGlobals(createMemoryStorage());
    const d = await harness.load('diagnostics');

    d.clearDiagnostics();
    const silenceConsole = () => { const o = console.error; console.error = () => {}; return () => { console.error = o; }; };
    let restore = silenceConsole();
    d.reportDiagnostic({ source: 'persistence', severity: 'error', code: 'storage_write_failed', message: 'full' });
    d.reportDiagnostic({ source: 'persistence', severity: 'error', code: 'storage_write_failed', message: 'full again' });
    restore();

    const events = d.getDiagnostics();
    r.check(events.length === 1, 'identical events are deduplicated, not flooded', `got ${events.length}`);
    r.check(events[0].count === 2, 'repeat occurrences are counted', `count=${events[0].count}`);
    r.check(d.hasErrors('persistence'), 'hasErrors() reflects a real failure');

    let notified = 0;
    const unsub = d.subscribeDiagnostics(() => { notified++; });
    restore = silenceConsole();
    d.reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed' });
    restore();
    unsub();
    r.check(notified > 0, 'subscribers are notified (System Nerve can react live)');

    d.clearDiagnostics();
    r.check(d.getDiagnostics().length === 0, 'clearDiagnostics() empties the bus');
  }

  // -------------------------------------------------------------------------
  console.log('\n[2/4] A failing localStorage write reaches the bus');
  // -------------------------------------------------------------------------
  {
    const storage = createMemoryStorage();
    installBrowserGlobals(storage);
    // No cache-bust: must be the SAME diagnostics instance the store imports.
    const d = await harness.load('diagnostics');
    const { weddingStore } = await harness.load('weddingStore', 'store2');

    d.clearDiagnostics();
    storage.failWritesWith(new Error('QuotaExceededError: storage is full'));

    const originalError = console.error;
    console.error = () => {};
    try { weddingStore.saveCurrentState(); } finally { console.error = originalError; }

    const events = d.getDiagnosticsBySource('persistence');
    r.check(events.length > 0, 'quota failure is recorded instead of swallowed',
      `diagnostics recorded: ${events.length}`);
    r.check(events.some((e) => e.code === 'storage_write_failed'),
      'failure carries a stable machine code for the repair mapping',
      `codes: ${events.map((e) => e.code).join(', ')}`);
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/4] No silent `catch {}` left in the engines');
  // -------------------------------------------------------------------------
  {
    const gameDir = path.join(SRC, 'game');
    const offenders = [];
    for (const f of readdirSync(gameDir)) {
      if (!/\.tsx?$/.test(f)) continue;
      const src = readFileSync(path.join(gameDir, f), 'utf8');
      // `catch {` with no binding AND no reporting call inside the block.
      // A binding-less `catch {}` whose body is empty or comment-only:
      // the error object is discarded and nothing is recorded.
      const re = /catch\s*\{([^{}]*)\}/g;
      let m;
      while ((m = re.exec(src))) {
        const body = m[1]
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')
          .trim();
        if (body === '') offenders.push(`${f}: empty catch {}`);
      }
    }
    // A couple of deliberate ones remain (guarding the reporter itself against
    // recursion); they are annotated and must stay few.
    // diagnostics.ts keeps a few deliberate empty guards so the reporter can
    // never recurse into itself; they are annotated in-source.
    const allowed = offenders.filter((o) => o.startsWith('diagnostics.ts'));
    const unexpected = offenders.filter((o) => !o.startsWith('diagnostics.ts'));
    r.check(unexpected.length === 0,
      `no error is discarded outside the reporter's own guards (${allowed.length} allowed)`,
      unexpected.join(' | '));
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/4] Error boundaries are actually mounted');
  // -------------------------------------------------------------------------
  {
    const boundary = path.join(SRC, 'components', 'ui', 'ErrorBoundary.tsx');
    r.check(existsSync(boundary), 'ErrorBoundary component exists');

    const main = readFileSync(path.join(SRC, 'main.tsx'), 'utf8');
    r.check(/<ErrorBoundary[\s\S]*<App\s*\/>/.test(main),
      'root boundary wraps <App /> (no more blank-page crashes)');
    r.check(/installGlobalErrorHandlers\(\)/.test(main),
      'global error/unhandledrejection handlers are installed');

    const world = readFileSync(path.join(SRC, 'components', '3d', 'WeddingWorld.tsx'), 'utf8');
    r.check(/<ErrorBoundary[\s\S]*WeddingWorldCanvas/.test(world),
      'the 3D canvas has its own scoped boundary (a WebGL failure spares the UI)');

    const bSrc = readFileSync(boundary, 'utf8');
    r.check(/componentDidCatch[\s\S]*reportDiagnostic/.test(bSrc),
      'boundary reports caught errors to the diagnostics bus');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll error-handling checks passed.\u001b[0m\n');
