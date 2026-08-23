#!/usr/bin/env node
/**
 * Wedding City — System Nerve honesty guard (roadmap 1.10 / 1.7 / 1.8).
 *
 * WHY THIS EXISTS
 * ---------------
 * The System Nerve Center used to declare 22 module statuses as string
 * literals in the source. It asserted DATABASE: OK, OCR: OK, NARRATION: OK,
 * while no OCR and no narration existed and nothing was measured.
 *
 * These tests enforce the governing rule of the new architecture:
 *
 *   NOTHING may report VERIFIED / OK unless a probe actually observed it.
 *
 * The last test is the important one: it cross-checks each engine's SELF-
 * DECLARED capabilities against what the source really contains, so a module
 * cannot quietly start claiming to be real while making no network calls.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC, ROOT } from './lib/esm-harness.mjs';

const r = createReporter();
console.log('\u001b[1mWedding City — System Nerve honesty guard\u001b[0m');

const harness = await compileGameModules();

try {
  installBrowserGlobals(createMemoryStorage());
  const registry = await harness.load('healthRegistry', 'hr1');

  // -------------------------------------------------------------------------
  console.log('\n[1/6] Probes return measured results with evidence');
  // -------------------------------------------------------------------------
  const checks = await registry.runAllProbes();
  r.check(checks.length > 0, `${checks.length} probes executed`);

  const validStatuses = new Set(['VERIFIED', 'PARTIAL', 'MOCK', 'ERROR', 'NOT_IMPLEMENTED', 'UNKNOWN']);
  const badStatus = checks.filter((c) => !validStatuses.has(c.status));
  r.check(badStatus.length === 0, 'every probe uses one of the six declared statuses',
    badStatus.map((c) => `${c.id}=${c.status}`).join(', '));

  // The core rule.
  const verifiedWithoutEvidence = checks.filter((c) => c.status === 'VERIFIED' && c.evidence.length === 0);
  r.check(verifiedWithoutEvidence.length === 0,
    'no probe claims VERIFIED without attaching evidence',
    verifiedWithoutEvidence.map((c) => c.id).join(', '));

  const missingTimestamp = checks.filter((c) => !c.lastCheck);
  r.check(missingTimestamp.length === 0, 'every executed probe records lastCheck',
    missingTimestamp.map((c) => c.id).join(', '));

  const contractOk = checks.every((c) =>
    Array.isArray(c.dependencies) && Array.isArray(c.errors) &&
    Array.isArray(c.warnings) && Array.isArray(c.evidence) &&
    typeof c.repairable === 'boolean');
  r.check(contractOk, 'every check satisfies the HealthCheck contract (status/lastCheck/dependencies/errors/warnings/evidence/repairable)');

  const repairables = checks.filter((c) => c.repairable);
  r.check(repairables.every((c) => c.repairAction && c.repairAction.id && c.repairAction.label),
    'every repairable check declares a concrete repairAction',
    repairables.map((c) => c.id).join(', '));

  // Each issue must be actionable: CAUSE → IMPACT → SOLUTION.
  const allIssues = checks.flatMap((c) => [...c.errors, ...c.warnings]);
  const incomplete = allIssues.filter((i) => !i.cause || !i.impact || !i.solution);
  r.check(incomplete.length === 0,
    `all ${allIssues.length} issues carry CAUSE → IMPACT → SOLUTION`,
    incomplete.map((i) => i.code).join(', '));

  // -------------------------------------------------------------------------
  console.log('\n[2/6] Real measurements actually happen');
  // -------------------------------------------------------------------------
  {
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));

    r.check(byId.PERSISTENCE?.status === 'VERIFIED' || byId.PERSISTENCE?.status === 'PARTIAL',
      'persistence probe measured a real round trip', `status=${byId.PERSISTENCE?.status}`);

    r.check(byId.DATA_INTEGRITY?.status === 'VERIFIED',
      'data-integrity probe validated the live graph', byId.DATA_INTEGRITY?.summary);
    r.check(/\d+/.test(byId.DATA_INTEGRITY?.evidence?.[0]?.value ?? ''),
      'integrity probe reports a real reference count',
      JSON.stringify(byId.DATA_INTEGRITY?.evidence?.[0]));

    // No DOM in node → WebGL must be UNKNOWN, never a fake OK.
    r.check(byId.RENDER_3D?.status === 'UNKNOWN',
      'WebGL probe reports UNKNOWN when it cannot measure (never a fake OK)',
      `status=${byId.RENDER_3D?.status}`);
  }

  // -------------------------------------------------------------------------
  console.log('\n[3/6] Simulated and absent modules are labelled truthfully');
  // -------------------------------------------------------------------------
  {
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
    r.check(byId.CONNECTORS?.status === 'MOCK', 'connectors declared 🟡 MOCK, not OK', `status=${byId.CONNECTORS?.status}`);
    r.check(byId.WEB_RESEARCH?.status === 'MOCK', 'web research declared 🟡 MOCK', `status=${byId.WEB_RESEARCH?.status}`);
    r.check(byId.OCR?.status === 'PARTIAL', 'OCR declared 🟠 PARTIAL (text only)', `status=${byId.OCR?.status}`);
    r.check(byId.AUTH?.status === 'NOT_IMPLEMENTED', 'authentication declared ⚪ ABSENT', `status=${byId.AUTH?.status}`);
    // The capability model now exists (memberships + capabilities bound to real
    // ids), so ABSENT would be wrong. But nothing is enforced, so VERIFIED
    // would be a lie. PARTIAL is the only honest answer.
    r.check(byId.PERMISSIONS?.status === 'PARTIAL',
      'permissions declared 🟠 PARTIAL (model exists, nothing enforced)',
      `status=${byId.PERMISSIONS?.status}`);
    r.check(byId.PERMISSIONS?.warnings.some((w) => w.code === 'permissions_not_enforced'),
      'permissions explicitly warn that no rule is applied');
    r.check(byId.PERMISSIONS?.evidence.some((e) => /non/i.test(e.value) && /application/i.test(e.label)),
      'evidence states enforcement is off, client and server side');
    r.check(byId.INVITATIONS?.status === 'PARTIAL', 'invitations declared 🟠 PARTIAL (local only)', `status=${byId.INVITATIONS?.status}`);

    const agg = registry.aggregate(checks, new Date().toISOString());
    r.check(agg.byStatus.MOCK >= 2, 'aggregate counts simulated modules separately', JSON.stringify(agg.byStatus));
    // MOCK must not inflate the health ratio.
    const mockCounted = agg.verifiedRatio > (agg.byStatus.VERIFIED / agg.total) + 1e-9;
    r.check(!mockCounted, 'simulated modules do NOT count towards the verified ratio');
  }

  // -------------------------------------------------------------------------
  console.log('\n[4/6] Unprobed modules are forced to UNKNOWN, never left "OK"');
  // -------------------------------------------------------------------------
  {
    const { systemNerveEngine } = await harness.load('systemNerveEngine', 'sne1');
    const before = systemNerveEngine.getModules().filter((m) => m.status === 'OK').length;

    await systemNerveEngine.runProbes();
    const modules = systemNerveEngine.getModules();
    const coverage = systemNerveEngine.getProbeCoverage();

    const stillFakeOk = modules.filter((m) => coverage.unprobed.includes(m.id) && m.status !== 'UNKNOWN');
    r.check(stillFakeOk.length === 0,
      `all ${coverage.unprobed.length} unprobed modules report UNKNOWN`,
      stillFakeOk.map((m) => `${m.id}=${m.status}`).join(', '));

    const after = modules.filter((m) => m.status === 'OK').length;
    r.check(after < before,
      `hardcoded OK count dropped from ${before} to ${after} after real probing`);

    const okWithoutTimestamp = modules.filter((m) => m.status === 'OK' && !m.lastTestTimestamp);
    r.check(okWithoutTimestamp.length === 0,
      'no module reports OK without a recorded test timestamp',
      okWithoutTimestamp.map((m) => m.id).join(', '));
  }

  // -------------------------------------------------------------------------
  console.log('\n[5/6] Self-declared capabilities match the actual source');
  // -------------------------------------------------------------------------
  {
    // An engine may only claim `network: true` if it really performs requests.
    const cases = [
      { file: 'connectorEngine.ts', constName: 'CONNECTOR_CAPABILITIES' },
      { file: 'researchEngine.ts', constName: 'RESEARCH_CAPABILITIES' },
    ];
    for (const { file, constName } of cases) {
      const src = readFileSync(path.join(SRC, 'game', file), 'utf8');
      const declaresNetwork = /network:\s*true/.test(src);
      // Ignore the word inside the capability comment block itself.
      const body = src.replace(/\/\*[\s\S]*?\*\//g, '');
      const reallyCalls = /\bfetch\s*\(|XMLHttpRequest|axios\./.test(body);
      r.check(declaresNetwork === reallyCalls,
        `${constName}.network declaration matches reality (declared=${declaresNetwork}, real=${reallyCalls})`);
    }

    // ------------------------------------------------------------------
    // NETWORK POLICY — revised in Phase F.3, never bypassed.
    //
    // Phase F.2 rule: "no engine performs network calls, and the only
    // provider ships hard-disabled".
    // Phase F.3 decision: the iTunes provider MAY be activated. The rule
    // therefore becomes, and is asserted below:
    //
    //   1. No engine at the ROOT of src/game may call the network.
    //   2. Only src/game/enrichment/ may, because that is its declared purpose.
    //   3. The switch lives in a network-free leaf (enrichment/activation.ts)
    //      and its resolved DEFAULT is OFF: a default build makes zero
    //      outbound requests. Turning it on requires either the build-time
    //      env var VITE_ENRICHMENT_ITUNES or a deliberate user action.
    //   4. The provider module is reached only through a DYNAMIC import, so
    //      the code that owns `fetch` is neither bundled into the initial
    //      chunk nor evaluated in a default build.
    //   5. Even enabled, a request happens only on an explicit user action —
    //      never at import time, never during a render.
    //   6. A failed request must be reported as "unreachable", never as
    //      "no match found".
    //
    // Why it still ships off: the build environment cannot reach any music
    // host (itunes, spotify, musicbrainz, coverartarchive, deezer all refuse;
    // npm and github answer 200). The integration remains UNVERIFIED from
    // here, and unverified code must not run by default.
    // Full rationale: docs/NETWORK-POLICY.md
    // ------------------------------------------------------------------
    const gameFiles = readdirSync(path.join(SRC, 'game')).filter((f) => f.endsWith('.ts'));
    const networkUsers = gameFiles.filter((f) => {
      const body = readFileSync(path.join(SRC, 'game', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      return /\bfetch\s*\(/.test(body);
    });
    r.check(networkUsers.length === 0,
      'no root engine performs network calls (would contradict the MOCK labels)',
      networkUsers.join(', '));

    const enrichDir = path.join(SRC, 'game', 'enrichment');
    if (existsSync(enrichDir)) {
      const provider = readFileSync(path.join(enrichDir, 'itunesProvider.ts'), 'utf8');
      const activation = readFileSync(path.join(enrichDir, 'activation.ts'), 'utf8');
      const index = readFileSync(path.join(enrichDir, 'index.ts'), 'utf8');

      r.check(/\bfetch\s*\(/.test(provider),
        'the enrichment provider is a real implementation, not a stub');
      r.check(/UNVERIFIED/.test(provider),
        'its unverified status is documented in the source');

      // 3 — the resolved default is OFF, in a file that cannot call out.
      r.check(!/\bfetch\s*\(/.test(activation.replace(/\/\*[\s\S]*?\*\//g, '')),
        'the activation switch itself performs no network call');
      r.check(/return \{ enabled: false, source: 'default' \};/.test(activation),
        'enrichment is DISABLED by default when nothing was configured');
      r.check(/VITE_ENRICHMENT_ITUNES/.test(activation),
        'activation is possible at build time through an explicit env var');

      // 4 — no static path to the provider: only a dynamic import.
      const staticImporters = [];
      const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const fp = path.join(dir, entry.name);
          if (entry.isDirectory()) { walk(fp); continue; }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue;
          const body = readFileSync(fp, 'utf8');
          if (/(?:import|export)[^\n]*from\s*['"][^'"]*itunesProvider['"]/.test(body)) {
            staticImporters.push(path.relative(SRC, fp));
          }
        }
      };
      walk(SRC);
      r.check(staticImporters.length === 0,
        'the provider is never imported statically (kept out of the initial bundle)',
        staticImporters.join(', '));
      r.check(/import\(\s*'\.\/itunesProvider'\s*\)/.test(index),
        'the provider is reached through a dynamic import, on demand only');

      // 5 — the provider re-checks the flag before doing anything.
      r.check(/if \(!isItunesEnabled\(\)\) return \[\];/.test(provider),
        'it returns no candidates and makes no request while disabled');
      r.check(/await ensureProvidersReady\(\);/.test(index),
        'loading the provider happens inside searchEnrichment, not at import time');

      // 6 — an unreachable service is never reported as an empty result.
      r.check(/ProviderUnreachableError/.test(provider) && /provider_unreachable/.test(index),
        'a failed request is reported as unreachable, not as "no match found"');

      // The policy is written down, not just enforced.
      const policy = path.join(ROOT, 'docs', 'NETWORK-POLICY.md');
      r.check(existsSync(policy), 'the network policy is documented in docs/NETWORK-POLICY.md');
      if (existsSync(policy)) {
        const text = readFileSync(policy, 'utf8');
        r.check(/VITE_ENRICHMENT_ITUNES/.test(text) && /itunes\.apple\.com/.test(text),
          'the document names the flag and the single host that may be contacted');
      }
    }
  }
  // -------------------------------------------------------------------------
  console.log('\n[6/6] Repairs are verified by re-measurement, never self-declared');
  // -------------------------------------------------------------------------
  {
    const { systemNerveEngine } = await harness.load('systemNerveEngine', 'sne2');
    // No cache-bust: must be the SAME store instance the engine's probes read.
    const { weddingStore } = await harness.load('weddingStore');
    await systemNerveEngine.runProbes();

    // A) An unknown repair action must fail honestly.
    const unknown = await systemNerveEngine.repairFromProbe('PERSISTENCE', 'no_such_action');
    r.check(unknown.executed === false && unknown.verified === false,
      'an unknown repair action reports executed=false, verified=false',
      JSON.stringify({ executed: unknown.executed, verified: unknown.verified }));
    r.check(!!unknown.beforeStatus && !!unknown.afterStatus && !!unknown.checkedAt,
      'every repair outcome records before/after status and a timestamp');

    // B) Inject a REAL fault and confirm the probe detects it.
    weddingStore.places[0].connectedDocIds = [
      ...weddingStore.places[0].connectedDocIds, 'doc_injected_ghost',
    ];
    const broken = await systemNerveEngine.runSingleProbe('DATA_INTEGRITY');
    r.check(broken.status === 'ERROR', 'injected dangling reference is detected as ERROR', broken.summary);
    r.check(broken.repairable === true && !!broken.repairAction,
      'a faulty module exposes a concrete repairAction',
      JSON.stringify(broken.repairAction));

    // C) The repair runs AND is confirmed by re-measurement.
    const fixed = await systemNerveEngine.repairFromProbe('DATA_INTEGRITY', 'prune_broken_refs');
    r.check(fixed.executed && fixed.verified,
      'a genuine repair is executed AND verified by re-measurement',
      `${fixed.beforeStatus} → ${fixed.afterStatus} · ${fixed.message}`);
    r.check(fixed.beforeStatus === 'ERROR' && fixed.afterStatus === 'VERIFIED',
      'the status transition is recorded', `${fixed.beforeStatus} → ${fixed.afterStatus}`);
    r.check(!weddingStore.places[0].connectedDocIds.includes('doc_injected_ghost'),
      'the repair really removed the dangling reference from the data');

    // D) Repairing again, now that nothing is broken, must NOT claim a fix.
    const again = await systemNerveEngine.repairFromProbe('DATA_INTEGRITY', 'prune_broken_refs');
    r.check(again.verified === false,
      'repairing a healthy module does NOT report a verified fix',
      `verified=${again.verified} — ${again.message}`);
    r.check(/pas en défaut|rien à corriger/i.test(again.message),
      'the message explains that nothing needed fixing', again.message);

    // E) Single-probe run refreshes only that probe.
    const single = await systemNerveEngine.runSingleProbe('TIMELINE');
    r.check(single?.id === 'TIMELINE' && !!single.lastCheck,
      '[RETESTER] re-runs a single probe with a fresh timestamp');
  }
} finally {
  harness.cleanup();
}

if (r.failures) { console.log(`\n\u001b[31m${r.failures} check(s) failed.\u001b[0m\n`); process.exit(1); }
console.log('\n\u001b[32mAll System Nerve honesty checks passed.\u001b[0m\n');
