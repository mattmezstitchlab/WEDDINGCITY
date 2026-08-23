import { UserAccount, WeddingProject } from '../types/wedding';
import { reportDiagnostic } from './diagnostics';
import {
  PersistedDomainState,
  SCHEMA_VERSION,
  migrateSnapshot,
} from './persistenceSchema';

const ACCOUNTS_KEY = 'wedding_city_accounts_v1';
const ACTIVE_ACCOUNT_KEY = 'wedding_city_active_account_v1';
const PROJECTS_KEY = 'wedding_city_projects_v1';
const ACTIVE_PROJECT_ID_KEY = 'wedding_city_active_project_id_v1';
const PROJECT_STATE_PREFIX = 'wedding_city_state_';

/**
 * On-disk snapshot = the domain slice (defined ONCE in persistenceSchema.ts)
 * plus storage envelope fields. The domain half is never re-declared here, so
 * it cannot drift from the reader/writer again.
 */
export type PersistedWeddingState = PersistedDomainState & {
  project: WeddingProject;
  schemaVersion: number;
  savedAt: string;
};

// ---------------- ACCOUNTS MANAGEMENT ----------------

export function getStoredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    reportStorageFailure('load', ACCOUNTS_KEY, err);
    return [];
  }
}

export function saveUserAccount(account: UserAccount): void {
  try {
    const accounts = getStoredAccounts();
    const existingIdx = accounts.findIndex((a) => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
    if (existingIdx >= 0) {
      accounts[existingIdx] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    setActiveAccount(account);
  } catch (err) {
    reportStorageFailure('save', ACCOUNTS_KEY, err);
  }
}

export function getActiveAccount(): UserAccount | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    reportStorageFailure('load', ACTIVE_ACCOUNT_KEY, err);
    return null;
  }
}

export function setActiveAccount(account: UserAccount | null): void {
  try {
    if (account) {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  } catch (err) {
    reportStorageFailure('save', ACTIVE_ACCOUNT_KEY, err);
  }
}

export function logoutUser(): void {
  setActiveAccount(null);
}

// ---------------- PROJECTS MANAGEMENT ----------------

export function getStoredProjects(): WeddingProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) {
      const demoProject: WeddingProject = {
        id: 'proj_demo_clara_alexandre',
        title: 'Mariage de Clara & Alexandre',
        worldType: 'wedding',
        coupleNames: 'Clara & Alexandre',
        weddingDate: '2025-06-14',
        locationName: 'Château de Bellevue & Parc',
        budgetTarget: 25000,
        guestCountTarget: 120,
        ownerId: 'account_demo',
        isDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inviteCode: 'WC-2025-CLARA',
      };
      localStorage.setItem(PROJECTS_KEY, JSON.stringify([demoProject]));
      return [demoProject];
    }
    return JSON.parse(raw);
  } catch (err) {
    reportStorageFailure('load', PROJECTS_KEY, err);
    return [];
  }
}

export function saveWeddingProject(project: WeddingProject): void {
  try {
    const projects = getStoredProjects();
    const existingIdx = projects.findIndex((p) => p.id === project.id);
    if (existingIdx >= 0) {
      projects[existingIdx] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.unshift({ ...project, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    reportStorageFailure('save', PROJECTS_KEY, err);
  }
}

/**
 * Whether this browser has ever opened a wedding.
 *
 * getActiveProjectId() below always answers with the demo, which is convenient
 * for the engine but means the product had no notion of "no wedding yet". The
 * Mirror needs that notion to be able to act as a public landing page, so the
 * question is asked separately here — the storage key is the only truth.
 */
export function hasChosenProject(): boolean {
  try {
    return Boolean(localStorage.getItem(ACTIVE_PROJECT_ID_KEY));
  } catch {
    return false;
  }
}

export function getActiveProjectId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    return raw || 'proj_demo_clara_alexandre';
  } catch (err) {
    reportStorageFailure('load', ACTIVE_PROJECT_ID_KEY, err);
    return 'proj_demo_clara_alexandre';
  }
}

export function setActiveProjectId(projectId: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
  } catch (err) {
    reportStorageFailure('save', ACTIVE_PROJECT_ID_KEY, err);
  }
}

// ---------------- FULL WEDDING STATE PERSISTENCE ----------------

/** Returns whether the write actually reached storage — never assumed. */
export function savePersistedState(
  projectId: string,
  state: Omit<PersistedWeddingState, 'savedAt' | 'schemaVersion'>,
): boolean {
  try {
    const payload: PersistedWeddingState = {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${PROJECT_STATE_PREFIX}${projectId}`, JSON.stringify(payload));
    return true;
  } catch (err) {
    // Storage failures (quota exceeded, private mode, corrupted profile) used
    // to vanish into an empty catch. Surface them so the System Nerve can
    // report "data not persisted" instead of the user losing work silently.
    reportStorageFailure('save', projectId, err);
    return false;
  }
}

export function loadPersistedState(projectId: string): PersistedWeddingState | null {
  try {
    const raw = localStorage.getItem(`${PROJECT_STATE_PREFIX}${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Legacy snapshots (no schemaVersion) are upgraded, never discarded.
    return migrateSnapshot(parsed) as unknown as PersistedWeddingState;
  } catch (err) {
    reportStorageFailure('load', projectId, err);
    return null;
  }
}

export function deleteStoredProject(projectId: string): void {
  try {
    const projects = getStoredProjects().filter((p) => p.id !== projectId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    localStorage.removeItem(`${PROJECT_STATE_PREFIX}${projectId}`);
    if (getActiveProjectId() === projectId) {
      setActiveProjectId('proj_demo_clara_alexandre');
    }
  } catch (err) {
    reportStorageFailure('save', projectId, err);
  }
}

// ---------------------------------------------------------------------------
// Storage failure reporting
// ---------------------------------------------------------------------------

export interface StorageFailure {
  op: 'save' | 'load';
  projectId: string;
  message: string;
  at: string;
}

const storageFailures: StorageFailure[] = [];

function reportStorageFailure(op: 'save' | 'load', projectId: string, err: unknown): void {
  const failure: StorageFailure = {
    op,
    projectId,
    message: err instanceof Error ? err.message : String(err),
    at: new Date().toISOString(),
  };
  storageFailures.push(failure);
  if (storageFailures.length > 25) storageFailures.shift();
  reportDiagnostic({
    source: 'persistence',
    severity: 'error',
    code: op === 'save' ? 'storage_write_failed' : 'storage_read_failed',
    error: err,
    detail: { projectId, op },
  });
}

/** Consumed by the System Nerve to turn silent data loss into a visible status. */
export function getStorageFailures(): readonly StorageFailure[] {
  return storageFailures;
}

export function clearStorageFailures(): void {
  storageFailures.length = 0;
}
