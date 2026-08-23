// ---------------------------------------------------------------------------
// Wedding City — Health probe contract.
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// --------------------
// The System Nerve Center used to declare the health of 22 modules with string
// literals written directly in the source: `status: 'OK'` for DATABASE, for
// OCR, for NARRATION... None of it was measured. The panel asserted that the
// OCR worked while no OCR existed, and that connectors were configured while
// the codebase contained zero network calls.
//
// This contract inverts the responsibility: a module no longer gets DESCRIBED
// by the Nerve, it EXPOSES its own health check, backed by evidence. The Nerve
// only aggregates.
//
// THE GOVERNING RULE
// ------------------
// Nothing may be reported as VERIFIED unless a probe actually executed and
// observed it. The default is UNKNOWN, never OK. `createUnverified()` below
// exists to make the honest default the easy one.
// ---------------------------------------------------------------------------

/**
 * 🟢 VERIFIED         — executed and observed working, with evidence.
 * 🟠 PARTIAL          — really implemented, but incomplete or degraded.
 * 🟡 MOCK             — UI/engine present, data or results are hardcoded.
 * 🔴 ERROR            — a defect was reproduced by the probe.
 * ⚪ NOT_IMPLEMENTED  — no mechanism exists in the codebase.
 * ⚫ UNKNOWN          — not measurable here (needs a device, secret or service).
 */
export type ProbeStatus =
  | 'VERIFIED'
  | 'PARTIAL'
  | 'MOCK'
  | 'ERROR'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN';

export const PROBE_STATUS_GLYPH: Record<ProbeStatus, string> = {
  VERIFIED: '🟢',
  PARTIAL: '🟠',
  MOCK: '🟡',
  ERROR: '🔴',
  NOT_IMPLEMENTED: '⚪',
  UNKNOWN: '⚫',
};

export const PROBE_STATUS_LABEL: Record<ProbeStatus, string> = {
  VERIFIED: 'VÉRIFIÉ',
  PARTIAL: 'PARTIEL',
  MOCK: 'SIMULÉ',
  ERROR: 'ERREUR',
  NOT_IMPLEMENTED: 'ABSENT',
  UNKNOWN: 'INCONNU',
};

/** A problem, expressed as CAUSE → IMPACT → SOLUTION so it is actionable. */
export interface HealthIssue {
  /** Stable machine code, e.g. 'phases_not_restored'. */
  code: string;
  message: string;
  cause: string;
  impact: string;
  solution: string;
}

/** A measured fact backing the status. Without evidence, a probe cannot claim VERIFIED. */
export interface HealthEvidence {
  label: string;
  value: string;
}

export interface HealthRepairAction {
  id: string;
  label: string;
  /** What the repair will actually do — no silent magic. */
  description: string;
}

export interface HealthCheck {
  id: string;
  name: string;
  category: 'core' | 'world_3d' | 'data' | 'ai_engine' | 'audio' | 'integration';
  status: ProbeStatus;
  /** ISO timestamp of the last real execution, or null if never run. */
  lastCheck: string | null;
  /** Other probe ids this module relies on. */
  dependencies: string[];
  errors: HealthIssue[];
  warnings: HealthIssue[];
  evidence: HealthEvidence[];
  repairable: boolean;
  repairAction?: HealthRepairAction;
  /** How long the probe took, when it ran. */
  durationMs?: number;
  /** One-line human summary. */
  summary: string;
}

/** What a module must implement to be observable by the System Nerve. */
export interface HealthProbe {
  id: string;
  name: string;
  category: HealthCheck['category'];
  dependencies?: string[];
  /** Execute the check. Must only return VERIFIED on observed evidence. */
  run: () => HealthCheck | Promise<HealthCheck>;
  /** Optional repair, matching `repairAction.id`. Returns whether it succeeded. */
  repair?: (actionId: string) => boolean | Promise<boolean>;
}

/**
 * The honest default: a module that has never been probed is UNKNOWN, not OK.
 * This is what prevents the old "everything is green" illusion from returning.
 */
export function createUnverified(
  probe: Pick<HealthProbe, 'id' | 'name' | 'category' | 'dependencies'>,
): HealthCheck {
  return {
    id: probe.id,
    name: probe.name,
    category: probe.category,
    status: 'UNKNOWN',
    lastCheck: null,
    dependencies: probe.dependencies ?? [],
    errors: [],
    warnings: [],
    evidence: [],
    repairable: false,
    summary: 'Jamais vérifié — aucun diagnostic exécuté.',
  };
}

export interface AggregateHealth {
  total: number;
  byStatus: Record<ProbeStatus, number>;
  /** Share of modules genuinely verified. Deliberately NOT counting MOCK as healthy. */
  verifiedRatio: number;
  lastFullScanAt: string | null;
  isScanning: boolean;
  totalErrors: number;
  totalWarnings: number;
}
