// ---------------------------------------------------------------------------
// Wedding City — Identity model: factories, capabilities and migration.
// ---------------------------------------------------------------------------
// The migration is the delicate part. Existing installs (and the shipped demo)
// only have `Agent[]`. We must derive Person / Guest / Vendor from them WITHOUT
// losing anything and WITHOUT changing what the 3D world renders.
//
// Two rules make that safe:
//   1. IDs are DERIVED DETERMINISTICALLY from the agent id, so running the
//      migration twice produces the same ids and never duplicates.
//   2. The migration is ADDITIVE. Agents are not deleted or rewritten; they
//      only gain a `personId` back-reference.
// ---------------------------------------------------------------------------

import { Agent, AgentRole, DmcIdentity, WeddingProject } from '../types/wedding';
import {
  Capability,
  DmcIdentityRecord,
  Guest,
  IdentityState,
  Invitation,
  MembershipRole,
  Person,
  ProjectMembership,
  SeatingTable,
  UserAccountV2,
  Vendor,
  VendorCategory,
} from '../types/identity';

// ---------------------------------------------------------------------------
// Deterministic id derivation
// ---------------------------------------------------------------------------
// Same input → same id, always. This is what makes the migration idempotent.

export const personIdForAgent = (agentId: string) => `person_${agentId}`;
export const guestIdForPerson = (personId: string) => `guest_${personId}`;
export const vendorIdForAgent = (agentId: string) => `vendor_${agentId}`;
export const dmcIdForPerson = (personId: string) => `dmc_${personId}`;
export const tableIdForNumber = (projectId: string, n: number) => `table_${projectId}_${n}`;
export const membershipIdFor = (projectId: string, accountId: string) => `member_${projectId}_${accountId}`;
export const invitationIdForCode = (code: string) => `invite_${code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;

let sequence = 0;
/** For genuinely new entities, where no deterministic source exists. */
export function freshId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}${sequence.toString(36)}`;
}

const nowIso = () => new Date().toISOString();

function stamp<T extends object>(value: T): T & { createdAt: string; updatedAt: string } {
  const at = nowIso();
  return { ...value, createdAt: at, updatedAt: at };
}

// ---------------------------------------------------------------------------
// Role classification
// ---------------------------------------------------------------------------

/** Roles that represent a service provider rather than an attendee. */
export const VENDOR_ROLES: ReadonlySet<AgentRole> = new Set<AgentRole>([
  'photographer', 'videographer', 'dj', 'caterer', 'chef', 'server',
  'florist', 'driver', 'musician', 'wedding_planner',
]);

/** Roles that represent someone attending the wedding. */
export const GUEST_ROLES: ReadonlySet<AgentRole> = new Set<AgentRole>([
  'guest', 'family', 'witness', 'bride', 'groom',
]);

const ROLE_TO_VENDOR_CATEGORY: Partial<Record<AgentRole, VendorCategory>> = {
  photographer: 'photographe',
  videographer: 'photographe',
  dj: 'dj',
  musician: 'musique',
  caterer: 'traiteur',
  chef: 'traiteur',
  server: 'traiteur',
  florist: 'fleuriste',
  driver: 'transport',
  wedding_planner: 'autre',
};

export function vendorCategoryForRole(role: AgentRole): VendorCategory {
  return ROLE_TO_VENDOR_CATEGORY[role] ?? 'autre';
}

// ---------------------------------------------------------------------------
// Capabilities — what future permission checks will read
// ---------------------------------------------------------------------------

const ALL_CAPS: Capability[] = [
  'project.edit', 'budget.view', 'budget.edit', 'guests.view', 'guests.edit',
  'vendors.view', 'vendors.edit', 'documents.view', 'documents.edit',
  'tasks.edit', 'playlist.vote', 'playlist.manage', 'invitations.manage', 'ads.manage',
];

export const ROLE_CAPABILITIES: Record<MembershipRole, Capability[]> = {
  owner: [...ALL_CAPS],
  planner: [
    'project.edit', 'budget.view', 'budget.edit', 'guests.view', 'guests.edit',
    'vendors.view', 'vendors.edit', 'documents.view', 'documents.edit',
    'tasks.edit', 'playlist.vote', 'playlist.manage', 'invitations.manage',
  ],
  partner: [
    'project.edit', 'budget.view', 'guests.view', 'guests.edit', 'vendors.view',
    'documents.view', 'tasks.edit', 'playlist.vote', 'playlist.manage', 'invitations.manage',
  ],
  vendor: ['documents.view', 'documents.edit', 'tasks.edit', 'vendors.view'],
  guest: ['playlist.vote'],
  viewer: ['guests.view', 'vendors.view', 'documents.view', 'budget.view'],
};

export function capabilitiesForRole(role: MembershipRole): Capability[] {
  return [...(ROLE_CAPABILITIES[role] ?? [])];
}

/** Map a legacy AgentRole onto a membership role. */
export function membershipRoleForAgentRole(role: AgentRole): MembershipRole {
  if (role === 'bride' || role === 'groom') return 'partner';
  if (role === 'wedding_planner') return 'planner';
  if (VENDOR_ROLES.has(role)) return 'vendor';
  return 'guest';
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function createPersonFromAgent(agent: Agent, origin: Person['origin'] = 'demo_migration'): Person {
  return stamp({
    id: personIdForAgent(agent.id),
    displayName: agent.name,
    email: undefined,
    phone: agent.phone,
    agentId: agent.id,
    origin,
  }) as Person;
}

export function createGuestFromAgent(agent: Agent, projectId: string, personId: string): Guest {
  const side: Guest['side'] =
    agent.role === 'bride' ? 'bride' : agent.role === 'groom' ? 'groom' : 'unknown';
  return stamp({
    id: guestIdForPerson(personId),
    projectId,
    personId,
    // Demo agents are physically present in the simulation, so 'accepted' is
    // the faithful representation of the existing data — not an invention.
    rsvp: { status: 'accepted' as const, plusOnes: 0, respondedAt: undefined },
    seating: { tableId: undefined, seatIndex: undefined },
    dietary: agent.dietary,
    side,
    origin: 'demo_migration' as const,
  }) as Guest;
}

export function createVendorFromAgent(agent: Agent, projectId: string, personId: string): Vendor {
  return stamp({
    id: vendorIdForAgent(agent.id),
    projectId,
    companyName: agent.name,
    category: vendorCategoryForRole(agent.role),
    // Demo vendors already have documents and tasks attached, i.e. they are
    // engaged. 'contracted' reflects the data rather than assuming a sale.
    status: (agent.connectedDocIds?.length ? 'contracted' : 'prospect') as Vendor['status'],
    contactPersonId: personId,
    agentId: agent.id,
    documentIds: [...(agent.connectedDocIds ?? [])],
    taskIds: [...(agent.connectedTaskIds ?? [])],
    placeIds: [agent.assignedPlaceId, ...(agent.connectedPlaceIds ?? [])].filter(Boolean) as string[],
    phone: agent.phone,
    origin: 'demo_migration' as const,
  }) as Vendor;
}

export function createDmcRecord(personId: string, dmc: DmcIdentity): DmcIdentityRecord {
  return stamp({ ...dmc, id: dmcIdForPerson(personId), ownerPersonId: personId }) as DmcIdentityRecord;
}

export function createAccount(
  email: string, personId: string, legacyRole?: AgentRole, id?: string,
): UserAccountV2 {
  return stamp({
    id: id ?? freshId('acc'),
    email,
    personId,
    legacyRole,
    origin: 'manual' as const,
  }) as UserAccountV2;
}

export function createMembership(
  projectId: string, accountId: string, personId: string, role: MembershipRole, invitationId?: string,
): ProjectMembership {
  return stamp({
    id: membershipIdFor(projectId, accountId),
    projectId, accountId, personId, role,
    capabilities: capabilitiesForRole(role),
    invitationId,
  }) as ProjectMembership;
}

export function createInvitation(
  projectId: string, code: string, role: MembershipRole, createdByAccountId?: string, guestId?: string,
): Invitation {
  return stamp({
    id: invitationIdForCode(code),
    projectId,
    code: code.trim().toUpperCase(),
    role,
    status: 'pending' as const,
    guestId,
    createdByAccountId,
    // No server exists: an invitation can only be resolved in this browser.
    scope: 'local' as const,
  }) as Invitation;
}

export function createSeatingTable(
  projectId: string, number: number, capacity = 8, placeId?: string,
): SeatingTable {
  return stamp({
    id: tableIdForNumber(projectId, number),
    projectId,
    number,
    label: `Table ${number}`,
    capacity,
    placeId,
  }) as SeatingTable;
}

// ---------------------------------------------------------------------------
// MIGRATION
// ---------------------------------------------------------------------------

export interface MigrationReport {
  ran: boolean;
  personsCreated: number;
  guestsCreated: number;
  vendorsCreated: number;
  tablesCreated: number;
  dmcCreated: number;
  accountsMigrated: number;
  membershipsCreated: number;
  invitationsCreated: number;
  votesMigrated: number;
  agentsLinked: number;
  notes: string[];
}

export function emptyIdentityState(): IdentityState {
  return {
    persons: [], accounts: [], dmcIdentities: [], guests: [], vendors: [],
    seatingTables: [], memberships: [], invitations: [], trackVotes: [],
    currentPersonId: null,
  };
}

export interface MigrationInput {
  project: WeddingProject;
  agents: Agent[];
  tracks: { id: string; hasVoted?: boolean; votes: number }[];
  legacyAccount?: { id: string; email: string; name: string; role: AgentRole } | null;
  legacyUserIdentity?: { role: AgentRole; name: string };
  legacyDmc?: DmcIdentity;
  existing?: IdentityState;
}

/**
 * Derive the identity model from legacy state.
 *
 * IDEMPOTENT: deterministic ids mean re-running it adds nothing. Existing
 * entities are preserved as-is; only what is genuinely missing gets created.
 * Nothing from the legacy data is deleted.
 */
export function migrateIdentityModel(input: MigrationInput): {
  state: IdentityState;
  report: MigrationReport;
  agentPatches: { agentId: string; personId: string }[];
} {
  const state: IdentityState = input.existing
    ? {
        ...emptyIdentityState(),
        ...input.existing,
        persons: [...(input.existing.persons ?? [])],
        accounts: [...(input.existing.accounts ?? [])],
        dmcIdentities: [...(input.existing.dmcIdentities ?? [])],
        guests: [...(input.existing.guests ?? [])],
        vendors: [...(input.existing.vendors ?? [])],
        seatingTables: [...(input.existing.seatingTables ?? [])],
        memberships: [...(input.existing.memberships ?? [])],
        invitations: [...(input.existing.invitations ?? [])],
        trackVotes: [...(input.existing.trackVotes ?? [])],
      }
    : emptyIdentityState();

  const report: MigrationReport = {
    ran: true, personsCreated: 0, guestsCreated: 0, vendorsCreated: 0, tablesCreated: 0,
    dmcCreated: 0, accountsMigrated: 0, membershipsCreated: 0, invitationsCreated: 0,
    votesMigrated: 0, agentsLinked: 0, notes: [],
  };
  const agentPatches: { agentId: string; personId: string }[] = [];

  const hasPerson = (id: string) => state.persons.some((p) => p.id === id);
  const projectId = input.project.id;

  // 1. A Person for every Agent.
  for (const agent of input.agents) {
    const personId = personIdForAgent(agent.id);
    if (!hasPerson(personId)) {
      state.persons.push(createPersonFromAgent(agent));
      report.personsCreated++;
    }
    if (agent.personId !== personId) {
      agentPatches.push({ agentId: agent.id, personId });
      report.agentsLinked++;
    }

    // 2. Guest or Vendor facet, according to the role.
    if (GUEST_ROLES.has(agent.role)) {
      const guestId = guestIdForPerson(personId);
      if (!state.guests.some((g) => g.id === guestId)) {
        const guest = createGuestFromAgent(agent, projectId, personId);
        // Preserve the legacy table assignment if one existed.
        if (typeof agent.assignedTable === 'number') {
          guest.seating.tableId = tableIdForNumber(projectId, agent.assignedTable);
        }
        state.guests.push(guest);
        report.guestsCreated++;
      }
    } else if (VENDOR_ROLES.has(agent.role)) {
      const vendorId = vendorIdForAgent(agent.id);
      if (!state.vendors.some((v) => v.id === vendorId)) {
        state.vendors.push(createVendorFromAgent(agent, projectId, personId));
        report.vendorsCreated++;
      }
    }
  }

  // 3. Seating tables referenced by the legacy `assignedTable` numbers.
  const tableNumbers = new Set(
    input.agents.map((a) => a.assignedTable).filter((n): n is number => typeof n === 'number'),
  );
  for (const n of [...tableNumbers].sort((a, b) => a - b)) {
    const id = tableIdForNumber(projectId, n);
    if (!state.seatingTables.some((t) => t.id === id)) {
      state.seatingTables.push(createSeatingTable(projectId, n));
      report.tablesCreated++;
    }
  }

  // 4. Legacy account → UserAccountV2 + Person + membership.
  if (input.legacyAccount) {
    const acc = input.legacyAccount;
    if (!state.accounts.some((a) => a.id === acc.id)) {
      // Reuse the person of the matching agent when possible, so the account
      // maps onto someone who actually exists in the world.
      const match = input.agents.find(
        (ag) => ag.name.toLowerCase() === acc.name.toLowerCase(),
      );
      const personId = match ? personIdForAgent(match.id) : `person_account_${acc.id}`;
      if (!hasPerson(personId)) {
        state.persons.push(stamp({
          id: personId, displayName: acc.name, email: acc.email, origin: 'manual' as const,
        }) as Person);
        report.personsCreated++;
      }
      const person = state.persons.find((p) => p.id === personId)!;
      person.accountId = acc.id;
      person.email = person.email ?? acc.email;

      state.accounts.push(createAccount(acc.email, personId, acc.role, acc.id));
      report.accountsMigrated++;

      const role = membershipRoleForAgentRole(acc.role);
      const mid = membershipIdFor(projectId, acc.id);
      if (!state.memberships.some((m) => m.id === mid)) {
        state.memberships.push(createMembership(projectId, acc.id, personId, role));
        report.membershipsCreated++;
      }
      state.currentPersonId = state.currentPersonId ?? personId;
    }
  }

  // 5. The session's person, when there is no account: bind to the agent that
  //    matches the legacy role — ONCE — and then use the id forever after.
  if (!state.currentPersonId && input.legacyUserIdentity) {
    const match =
      input.agents.find((a) => a.name === input.legacyUserIdentity!.name) ??
      input.agents.find((a) => a.role === input.legacyUserIdentity!.role);
    if (match) {
      state.currentPersonId = personIdForAgent(match.id);
      report.notes.push(
        `Identité de session rattachée à ${match.name} (${match.id}) puis figée par identifiant.`,
      );
    }
  }

  // 6. DMC identity → owned record.
  if (input.legacyDmc && state.currentPersonId) {
    const dmcId = dmcIdForPerson(state.currentPersonId);
    if (!state.dmcIdentities.some((d) => d.id === dmcId)) {
      state.dmcIdentities.push(createDmcRecord(state.currentPersonId, input.legacyDmc));
      report.dmcCreated++;
    }
    const person = state.persons.find((p) => p.id === state.currentPersonId);
    if (person) person.dmcIdentityId = dmcId;
  }

  // 7. Project invite code → Invitation record.
  if (input.project.inviteCode) {
    const invId = invitationIdForCode(input.project.inviteCode);
    if (!state.invitations.some((i) => i.id === invId)) {
      state.invitations.push(
        createInvitation(projectId, input.project.inviteCode, 'guest', input.legacyAccount?.id),
      );
      report.invitationsCreated++;
    }
  }

  // 8. Global `hasVoted` booleans → per-person votes.
  //    The legacy flag cannot say WHO voted; attributing it to the current
  //    person is the only faithful reading, and it is recorded as such.
  if (state.currentPersonId) {
    for (const track of input.tracks) {
      if (!track.hasVoted) continue;
      const already = state.trackVotes.some(
        (v) => v.trackId === track.id && v.personId === state.currentPersonId,
      );
      if (!already) {
        state.trackVotes.push({
          trackId: track.id,
          personId: state.currentPersonId,
          votedAt: nowIso(),
        });
        report.votesMigrated++;
      }
    }
    if (report.votesMigrated > 0) {
      report.notes.push(
        `${report.votesMigrated} vote(s) globaux attribués à la personne de session : l’ancien modèle ne stockait pas le votant.`,
      );
    }
  }

  return { state, report, agentPatches };
}
