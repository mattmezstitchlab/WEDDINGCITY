// ---------------------------------------------------------------------------
// Shared harness: run Wedding City's engine modules headlessly, under NATIVE
// ESM semantics (no bundling, no minification, no reordering) — i.e. exactly
// how `vite dev` evaluates them in the browser.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const SRC = path.join(ROOT, 'src');

/**
 * Transpile src/game + src/types file-by-file into a throwaway directory.
 *
 * `bundle: false` and `minify: false` are load-bearing: bundling would rewrite
 * evaluation order and minification would inline constants, both of which hide
 * the exact class of startup bug this harness is meant to catch.
 *
 * Output lands inside node_modules so bare specifiers (react, three, ...)
 * resolve through the project's real dependency tree.
 */
export async function compileGameModules() {
  const holder = path.join(ROOT, 'node_modules', '.wc-startup-check');
  mkdirSync(holder, { recursive: true });
  const out = mkdtempSync(path.join(holder, 'run-'));

  const inputs = [];
  for (const dir of ['game', 'game/enrichment', 'types', 'projections', 'design', 'design/tokens']) {
    const abs = path.join(SRC, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) if (f.endsWith('.ts')) inputs.push(path.join(abs, f));
  }

  await esbuild.build({
    entryPoints: inputs,
    outdir: out,
    outbase: SRC,
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    bundle: false,
    minify: false,
    logLevel: 'error',
  });

  // Node requires explicit extensions on relative specifiers.
  for (const dir of ['game', 'game/enrichment', 'types', 'projections', 'design', 'design/tokens']) {
    const abs = path.join(out, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      const fp = path.join(abs, f);
      // Skip nested directories: they are handled by their own entry above.
      if (!f.endsWith('.mjs')) continue;
      const addExt = (m, spec, wrap) => (spec.endsWith('.mjs') ? m : wrap(`${spec}.mjs`));
      writeFileSync(fp, readFileSync(fp, 'utf8')
        // static imports/re-exports
        .replace(/from\s*"(\.[^"]+)"/g, (m, spec) => addExt(m, spec, (x) => `from "${x}"`))
        // dynamic imports — used by the lazily loaded enrichment provider
        .replace(/import\(\s*"(\.[^"]+)"\s*\)/g, (m, spec) => addExt(m, spec, (x) => `import("${x}")`)));
    }
  }

  return {
    dir: out,
    /** Import a game module. `cacheBust` forces a fresh evaluation (simulates a page reload). */
    load: (name, cacheBust) => {
      const href = pathToFileURL(path.join(out, 'game', `${name}.mjs`)).href;
      return import(cacheBust ? `${href}?v=${cacheBust}` : href);
    },
    /** Import any compiled module by path relative to src/, e.g. 'projections/worldModel'. */
    loadPath: (rel, cacheBust) => {
      const href = pathToFileURL(path.join(out, `${rel}.mjs`)).href;
      return import(cacheBust ? `${href}?v=${cacheBust}` : href);
    },
    cleanup: () => rmSync(out, { recursive: true, force: true }),
  };
}

/** An in-memory localStorage that behaves like the real one, including quota errors. */
export function createMemoryStorage(initial = new Map()) {
  const map = new Map(initial);
  let failNextWrite = null;
  return {
    _map: map,
    failWritesWith(err) { failNextWrite = err; },
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (failNextWrite) { const e = failNextWrite; failNextWrite = null; throw e; }
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

/** Minimal browser surface so engine modules can evaluate outside a browser. */
export function installBrowserGlobals(storage) {
  globalThis.localStorage = storage;
  globalThis.sessionStorage = storage;
  if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
  globalThis.window.localStorage = storage;
  globalThis.requestAnimationFrame ??= (cb) => setTimeout(() => cb(Date.now()), 16);
  globalThis.cancelAnimationFrame ??= clearTimeout;
}

// --- tiny assertion helpers -------------------------------------------------

export function createReporter() {
  let failures = 0;
  return {
    pass: (m) => console.log(`  \u001b[32m✓\u001b[0m ${m}`),
    fail: (m) => { failures++; console.log(`  \u001b[31m✗\u001b[0m ${m}`); },
    get failures() { return failures; },
    check(cond, m, detail) {
      if (cond) this.pass(m);
      else { this.fail(m); if (detail) console.log(`      \u001b[33m↳ ${detail}\u001b[0m`); }
    },
  };
}
