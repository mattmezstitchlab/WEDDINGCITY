import {
  UserAccount,
  WeddingProject,
  Agent,
  Place,
  DocumentEntity,
  TaskEntity,
  ConflictEntity,
  TrackEntity,
  TimelinePhase,
  UserIdentity,
  ReconstructedVenue,
  PlacedObject,
} from '../types/wedding';

const ACCOUNTS_KEY = 'wedding_city_accounts_v1';
const ACTIVE_ACCOUNT_KEY = 'wedding_city_active_account_v1';
const PROJECTS_KEY = 'wedding_city_projects_v1';
const ACTIVE_PROJECT_ID_KEY = 'wedding_city_active_project_id_v1';
const PROJECT_STATE_PREFIX = 'wedding_city_state_';

export interface PersistedWeddingState {
  project: WeddingProject;
  time: number;
  userIdentity: UserIdentity;
  places: Place[];
  agents: Agent[];
  docs: DocumentEntity[];
  tasks: TaskEntity[];
  conflicts: ConflictEntity[];
  phases: TimelinePhase[];
  tracks: TrackEntity[];
  reconstructedVenues?: ReconstructedVenue[];
  placedObjects?: PlacedObject[];
  savedAt: string;
}

// ---------------- ACCOUNTS MANAGEMENT ----------------

export function getStoredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
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
  } catch {
    // safe fallback
  }
}

export function getActiveAccount(): UserAccount | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
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
  } catch {
    // safe fallback
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
  } catch {
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
  } catch {
    // safe fallback
  }
}

export function getActiveProjectId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    return raw || 'proj_demo_clara_alexandre';
  } catch {
    return 'proj_demo_clara_alexandre';
  }
}

export function setActiveProjectId(projectId: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
  } catch {
    // safe fallback
  }
}

// ---------------- FULL WEDDING STATE PERSISTENCE ----------------

export function savePersistedState(projectId: string, state: Omit<PersistedWeddingState, 'savedAt'>): void {
  try {
    const payload: PersistedWeddingState = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${PROJECT_STATE_PREFIX}${projectId}`, JSON.stringify(payload));
  } catch {
    // safe fallback
  }
}

export function loadPersistedState(projectId: string): PersistedWeddingState | null {
  try {
    const raw = localStorage.getItem(`${PROJECT_STATE_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
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
  } catch {
    // safe fallback
  }
}
