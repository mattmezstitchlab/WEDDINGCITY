#!/usr/bin/env node
/**
 * Wedding City — Startup / module-graph regression guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * The app once crashed on startup with:
 *   ReferenceError: Cannot access 'BRAND_ACCENT' before initialization
 *
 * Neither `tsc --noEmit` nor `vite build` caught it:
 *   - tsc does not model temporal-dead-zone errors across module cycles.
 *   - `vite build` minifies, and esbuild INLINED the string literal, which
 *     made the faulty binding vanish. Production worked purely by accident.
 *
 * So this guard does the only thing that actually reproduces the bug: it
 * compiles each module SEPARATELY (no bundler, no inlining, no reordering)
 * and imports the entry modules under **native ESM semantics** — exactly the
 * evaluation order Vite uses in dev.
 *
 * CHECK 1 — native ESM evaluation of every engine module.
 * CHECK 2 — no import cycles among src/game engine modules.
 * CHECK 3 — src/game/brand.ts stays dependency-free.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

let failures = 0;
const pass = (m) => console.log(`  \u001b[32m✓\u001b[0m ${m}`);
const fail = (m) => { failures++; console.log(`  \u001b[31m✗\u001b[0m ${m}`); };

// ---------------------------------------------------------------------------
// CHECK 1 — native ESM evaluation (reproduces `vite dev`)
// ---------------------------------------------------------------------------
async function checkNativeEsmStartup() {
  console.log('\n[1/4] Native ESM startup (reproduces `vite dev` evaluation order)');

  // Emit INSIDE the project so bare specifiers (react, three, ...) resolve
  // through the real node_modules, exactly as Vite would resolve them.
  const holder = path.join(ROOT, 'node_modules', '.wc-startup-check');
  mkdirSync(holder, { recursive: true });
  const out = mkdtempSync(path.join(holder, 'run-'));
  try {
    // Transpile file-by-file. NO bundling: module boundaries and evaluation
    // order are preserved exactly as the browser/Vite would see them.
    const inputs = [];
    // `design` joined the engine graph when the intake became type-aware
    // (design/eventTypes) — the boot check must transpile it too.
    for (const dir of ['game', 'game/enrichment', 'types', 'design', 'design/tokens']) {
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
      bundle: false,     // critical: preserve real module boundaries
      minify: false,     // critical: no constant inlining that would hide TDZ
      logLevel: 'error',
    });

    // Node needs explicit extensions on relative specifiers.
    for (const dir of ['game', 'game/enrichment', 'types', 'design', 'design/tokens']) {
      const abs = path.join(out, dir);
      if (!existsSync(abs)) continue;
      for (const f of readdirSync(abs)) {
        const fp = path.join(abs, f);
        if (!f.endsWith('.mjs')) continue;
        const addExt = (m, spec, wrap) => (spec.endsWith('.mjs') ? m : wrap(`${spec}.mjs`));
        writeFileSync(fp, readFileSync(fp, 'utf8')
          .replace(/from\s*"(\.[^"]+)"/g, (m, spec) => addExt(m, spec, (x) => `from "${x}"`))
          // dynamic import of the lazily loaded enrichment provider
          .replace(/import\(\s*"(\.[^"]+)"\s*\)/g, (m, spec) => addExt(m, spec, (x) => `import("${x}")`)));
      }
    }

    // Minimal browser surface so modules can evaluate headlessly.
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    globalThis.sessionStorage = globalThis.localStorage;
    if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
    globalThis.requestAnimationFrame ??= (cb) => setTimeout(() => cb(Date.now()), 16);
    globalThis.cancelAnimationFrame ??= clearTimeout;

    // weddingStore first: it is the module that used to explode.
    const gameDir = path.join(out, 'game');
    const mods = readdirSync(gameDir).filter((f) => f.endsWith('.mjs'));
    const ordered = ['weddingStore.mjs', ...mods.filter((m) => m !== 'weddingStore.mjs')];

    for (const m of ordered) {
      try {
        await import(pathToFileURL(path.join(gameDir, m)).href);
        pass(`${m} evaluates under native ESM`);
      } catch (e) {
        fail(`${m} → ${e.constructor.name}: ${e.message}`);
        if (/before initialization/.test(e.message)) {
          console.log('      \u001b[33m↳ Temporal-dead-zone via a module cycle. ' +
            'Move the shared constant into a dependency-free module.\u001b[0m');
        }
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// CHECK 2 — no import cycles between engine modules
// ---------------------------------------------------------------------------
function checkNoCycles() {
  console.log('\n[2/4] Import cycles in src/game');

  const dir = path.join(SRC, 'game');
  const graph = new Map();
  for (const f of readdirSync(dir)) {
    if (!/\.tsx?$/.test(f)) continue;
    const id = f.replace(/\.tsx?$/, '');
    const src = readFileSync(path.join(dir, f), 'utf8');
    const deps = new Set();
    for (const re of [/(?:import|export)[\s\S]*?from\s*['"]\.\/([\w.-]+)['"]/g,
                      /import\s*\(\s*['"]\.\/([\w.-]+)['"]\s*\)/g]) {
      let m; while ((m = re.exec(src))) deps.add(m[1].replace(/\.tsx?$/, ''));
    }
    graph.set(id, deps);
  }

  const cycles = [];
  const state = new Map();
  const walk = (n, stack) => {
    if (state.get(n) === 'done') return;
    if (state.get(n) === 'open') { cycles.push([...stack.slice(stack.indexOf(n)), n]); return; }
    state.set(n, 'open'); stack.push(n);
    for (const d of graph.get(n) ?? []) if (graph.has(d)) walk(d, stack);
    stack.pop(); state.set(n, 'done');
  };
  for (const n of graph.keys()) walk(n, []);

  if (cycles.length === 0) pass(`no cycles among ${graph.size} engine modules`);
  else for (const c of cycles) fail(`cycle: ${c.join(' → ')}`);
}

// ---------------------------------------------------------------------------
// CHECK 3 — brand.ts must stay dependency-free
// ---------------------------------------------------------------------------
function checkBrandIsLeaf() {
  console.log('\n[3/4] src/game/brand.ts is dependency-free');
  const p = path.join(SRC, 'game', 'brand.ts');
  if (!existsSync(p)) { fail('src/game/brand.ts is missing — the TDZ fix was reverted'); return; }
  const bad = [...readFileSync(p, 'utf8').matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (bad.length) fail(`brand.ts must import nothing, found: ${bad.join(', ')}`);
  else pass('brand.ts imports nothing');
}

// ---------------------------------------------------------------------------
// CHECK 4 — dead modules (roadmap 1.11)
// Files unreachable from the real entry point are reported, not deleted:
// they may hold logic worth recovering (input.ts was exactly that case).
// ---------------------------------------------------------------------------
function checkDeadModules() {
  console.log('\n[4/4] Unreachable modules under src/');

  const resolve = (fromFile, spec) => {
    if (!spec.startsWith('.')) return null;
    const abs = path.resolve(path.dirname(fromFile), spec);
    for (const cand of [abs, `${abs}.ts`, `${abs}.tsx`, path.join(abs, 'index.ts'), path.join(abs, 'index.tsx')]) {
      if (existsSync(cand) && !cand.endsWith(path.sep)) {
        try { if (readFileSync(cand)) return cand; } catch { /* dir */ }
      }
    }
    return null;
  };

  const allFiles = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.tsx?$/.test(e.name)) allFiles.push(fp);
    }
  };
  walk(SRC);

  const entry = path.join(SRC, 'main.tsx');
  const reached = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (!f || reached.has(f)) continue;
    reached.add(f);
    const src = readFileSync(f, 'utf8');
    for (const re of [/(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g, /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g]) {
      let m; while ((m = re.exec(src))) {
        const target = resolve(f, m[1]);
        if (target) stack.push(target);
      }
    }
  }

  const dead = allFiles.filter((f) => !reached.has(f)).map((f) => path.relative(SRC, f)).sort();
  // PRODUCT DECISION (Jour J pass): the projection capsule was retired from
  // the product — the Mirror is the product and the 3D World is no longer
  // offered as a destination. The component is kept, unreferenced, rather than
  // deleted, because the World tooling still uses that vocabulary.
  const KNOWN_DEAD = [
    'SceneShell.tsx',
    'game/ChaseCamera.tsx', 'game/GameFlow.tsx', 'game/loop.ts', 'game/mouseLook.ts',
    'components/ui/ProjectionSwitcher.tsx',
    // Timeline-first product: the old Organisation scenario editor and the
    // long landing asset registry are intentionally not mounted in the main
    // wedding experience. Their source remains for the dormant/legacy surfaces.
    'components/mirror/organisation/ScenariosPanel.tsx',
    'design/editorialRegistry.ts',
  ];
  const unexpected = dead.filter((f) => !KNOWN_DEAD.includes(f));
  const revived = KNOWN_DEAD.filter((f) => !dead.includes(f));

  console.log(`      reachable: ${reached.size} · dead: ${dead.length}`);
  for (const f of dead) console.log(`      \u001b[33m·\u001b[0m ${f} (unreachable from main.tsx)`);
  if (revived.length) console.log(`      \u001b[32m·\u001b[0m now reachable again: ${revived.join(', ')}`);

  if (unexpected.length === 0) pass(`dead-module inventory matches the documented list (${dead.length})`);
  else fail(`new unreachable module(s) appeared: ${unexpected.join(', ')}`);
}

console.log('\u001b[1mWedding City — startup & module-graph guard\u001b[0m');
await checkNativeEsmStartup();
checkNoCycles();
checkBrandIsLeaf();
checkDeadModules();

if (failures) { console.log(`\n\u001b[31m${failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll startup checks passed.\u001b[0m\n');
