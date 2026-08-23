// ---------------------------------------------------------------------------
// AIME — enrichment activation (Phase F.3).
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS, SEPARATE FROM THE PROVIDER
//
// Phase F.3 takes the product decision to ALLOW the iTunes provider to run.
// It does NOT take the decision to run it everywhere: the build environment
// still cannot reach a single music host, so a build that phoned home by
// default would be dishonest.
//
// So the switch lives here, in a dependency-free leaf that contains NO network
// code at all. Three consequences:
//
//   1. The UI can ask "is enrichment available?" synchronously, without ever
//      importing — let alone executing — the provider.
//   2. The provider module itself is loaded LAZILY (dynamic import in
//      ./index.ts) so iTunes code never enters the initial bundle.
//   3. Turning the flag on is an explicit, recorded act, and the source of
//      that decision is readable (`getActivationSource()`).
//
// NETWORK POLICY (enforced by scripts/check-health.mjs, documented in
// docs/NETWORK-POLICY.md):
//   · default = OFF. A default build performs zero outbound requests.
//   · ON requires either a build-time env var or a deliberate user action.
//   · even when ON, no request happens until an explicit "Enrichir" click.
// ---------------------------------------------------------------------------

/** Where the current value comes from. Surfaced in the Canvas, not the Mirror. */
export type ActivationSource = 'default' | 'env' | 'user';

const STORAGE_KEY = 'aime.enrichment.itunes';

interface ActivationState {
  enabled: boolean;
  source: ActivationSource;
}

/** Build-time default: VITE_ENRICHMENT_ITUNES=on enables it for that build. */
function readEnvDefault(): boolean | null {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const raw = env?.VITE_ENRICHMENT_ITUNES;
    if (raw === undefined) return null;
    return raw === 'on' || raw === 'true' || raw === '1';
  } catch {
    return null;
  }
}

/** User-level decision, kept across reloads. Absent = never decided. */
function readStoredPreference(): boolean | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'on') return true;
    if (raw === 'off') return false;
    return null;
  } catch {
    // Private mode, quota, disabled storage: absence of a preference.
    return null;
  }
}

function writeStoredPreference(value: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
  } catch {
    // A preference we cannot persist is still honoured for this session.
  }
}

function resolveInitial(): ActivationState {
  const stored = readStoredPreference();
  if (stored !== null) return { enabled: stored, source: 'user' };
  const env = readEnvDefault();
  if (env !== null) return { enabled: env, source: 'env' };
  return { enabled: false, source: 'default' };
}

let state: ActivationState = resolveInitial();

/** Whether the iTunes provider is allowed to perform requests right now. */
export function isItunesEnabled(): boolean {
  return state.enabled;
}

export function getActivationSource(): ActivationSource {
  return state.source;
}

/**
 * Explicit activation. `persist` records the choice for later sessions.
 *
 * This only grants PERMISSION. It performs no request, loads no provider and
 * does not claim the service is reachable — that is only ever proven by a real
 * search returning real candidates.
 */
export function setItunesEnabled(value: boolean, options: { persist?: boolean } = {}): void {
  state = { enabled: value, source: options.persist === false ? state.source : 'user' };
  if (options.persist !== false) writeStoredPreference(value);
}

/** Forget the user decision and fall back to the build-time default. */
export function resetItunesActivation(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  state = resolveInitial();
}

/** Human-readable, for the Canvas. Never shown in the Mirror. */
export function describeActivation(): string {
  if (!state.enabled) {
    return state.source === 'user'
      ? 'Recherche automatique désactivée (choix enregistré).'
      : 'Recherche automatique désactivée par défaut.';
  }
  return state.source === 'env'
    ? 'Recherche automatique activée par la configuration du build.'
    : 'Recherche automatique activée (choix enregistré).';
}

export const ITUNES_ACTIVATION_STORAGE_KEY = STORAGE_KEY;
