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

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { compileGameModules, createMemoryStorage, installBrowserGlobals, createReporter, SRC } from './lib/esm-harness.mjs';

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

    // Nothing in src/ should perform network calls while modules claim MOCK.
    const gameFiles = readdirSync(path.join(SRC, 'game')).filter((f) => f.endsWith('.ts'));
    const networkUsers = gameFiles.filter((f) => {
      const body = readFileSync(path.join(SRC, 'game', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      return /\bfetch\s*\(/.test(body);
    });
    r.check(networkUsers.length === 0,
      'no engine silently performs network calls (would contradict the MOCK labels)',
      networkUsers.join(', '));
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
