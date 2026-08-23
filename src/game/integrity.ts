// ---------------------------------------------------------------------------
// Wedding City — Referential integrity checker.
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// --------------------
// Entities reference each other by id (`connectedDocIds`, `assignedPlaceId`,
// `keyTaskIds`, ...) but nothing ever validated those ids. The World Engine
// shipped worlds whose places/agents/phases pointed at documents and tasks it
// never created (doc_vols_japan, doc_ryokan_kyoto, doc_jr_pass, doc_tech_rider,
// tk_diner_kaiseki, tk_soundcheck). The graph looked connected in the type
// system and was broken at runtime: NeuralConnections drew nothing, inspectors
// showed empty links.
//
// This module makes that class of bug detectable instead of invisible. It is
// used in two places:
//   1. tests, to assert every generated world is self-consistent;
//   2. the System Nerve, as a REAL probe over live store data — replacing a
//      hardcoded "OK" with measured evidence.
//
// Dependency-free apart from types, so it can be used from anywhere.
// ---------------------------------------------------------------------------

import {
  Guest, Person, Vendor, UserAccountV2, DmcIdentityRecord,
  SeatingTable, ProjectMembership, Invitation, TrackVote,
  MediaAsset, PersonRelationship,
} from '../types/identity';
import {
  Agent,
  Place,
  DocumentEntity,
  TaskEntity,
  ConflictEntity,
  TimelinePhase,
} from '../types/wedding';

export interface BrokenReference {
  /** Entity holding the dangling reference, e.g. 'place:pl_dest_1'. */
  from: string;
  /** Field that holds it, e.g. 'connectedDocIds'. */
  field: string;
  /** The id that does not resolve. */
  missingId: string;
  /** What kind of entity the id was supposed to designate. */
  expectedKind: string;
}

export interface IntegrityInput {
  // --- identity model ---
  persons?: Person[];
  accounts?: UserAccountV2[];
  guests?: Guest[];
  vendors?: Vendor[];
  dmcIdentities?: DmcIdentityRecord[];
  seatingTables?: SeatingTable[];
  memberships?: ProjectMembership[];
  invitations?: Invitation[];
  trackVotes?: TrackVote[];
  media?: MediaAsset[];
  relationships?: PersonRelationship[];
  tracks?: { id: string }[];
  /** Full tracks, when link integrity must also be verified. */
  tracksFull?: { id: string; linkedPhaseId?: string }[];
  projectId?: string;
  currentPersonId?: string | null;
  // --- world model ---
  places?: Place[];
  agents?: Agent[];
  docs?: DocumentEntity[];
  tasks?: TaskEntity[];
  conflicts?: ConflictEntity[];
  phases?: TimelinePhase[];
}

export interface IntegrityReport {
  ok: boolean;
  checkedReferences: number;
  broken: BrokenReference[];
}

/**
 * Walk every declared cross-entity reference and report the ones that do not
 * resolve. Undefined/empty references are skipped (they mean "no link"), only
 * non-empty ids pointing at nothing are reported.
 */
export function checkReferentialIntegrity(input: IntegrityInput): IntegrityReport {
  const places = input.places ?? [];
  const agents = input.agents ?? [];
  const docs = input.docs ?? [];
  const tasks = input.tasks ?? [];
  const conflicts = input.conflicts ?? [];
  const phases = input.phases ?? [];

  const ids = {
    place: new Set(places.map((p) => p.id)),
    agent: new Set(agents.map((a) => a.id)),
    doc: new Set(docs.map((d) => d.id)),
    task: new Set(tasks.map((t) => t.id)),
  };
  // Conflicts point at "some entity", so accept any known id.
  const anyId = new Set<string>([...ids.place, ...ids.agent, ...ids.doc, ...ids.task]);

  const broken: BrokenReference[] = [];
  let checked = 0;

  const verify = (from: string, field: string, kind: keyof typeof ids | 'any', value: unknown) => {
    const list = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    for (const raw of list) {
      if (typeof raw !== 'string' || raw.length === 0) continue;
      checked++;
      const known = kind === 'any' ? anyId : ids[kind];
      if (!known.has(raw)) broken.push({ from, field, missingId: raw, expectedKind: kind });
    }
  };

  for (const p of places) {
    verify(`place:${p.id}`, 'connectedAgentIds', 'agent', p.connectedAgentIds);
    verify(`place:${p.id}`, 'connectedDocIds', 'doc', p.connectedDocIds);
    verify(`place:${p.id}`, 'connectedTaskIds', 'task', p.connectedTaskIds);
  }

  for (const a of agents) {
    verify(`agent:${a.id}`, 'assignedPlaceId', 'place', a.assignedPlaceId);
    verify(`agent:${a.id}`, 'connectedDocIds', 'doc', a.connectedDocIds);
    verify(`agent:${a.id}`, 'connectedTaskIds', 'task', a.connectedTaskIds);
    verify(`agent:${a.id}`, 'connectedAgentIds', 'agent', a.connectedAgentIds);
    verify(`agent:${a.id}`, 'connectedPlaceIds', 'place', a.connectedPlaceIds);
  }

  for (const d of docs) {
    verify(`doc:${d.id}`, 'connectedAgentIds', 'agent', d.connectedAgentIds);
    verify(`doc:${d.id}`, 'connectedPlaceIds', 'place', d.connectedPlaceIds);
    verify(`doc:${d.id}`, 'connectedTaskIds', 'task', d.connectedTaskIds);
  }

  for (const t of tasks) {
    verify(`task:${t.id}`, 'assignedAgentId', 'agent', t.assignedAgentId);
    verify(`task:${t.id}`, 'assignedPlaceId', 'place', t.assignedPlaceId);
    verify(`task:${t.id}`, 'connectedDocIds', 'doc', t.connectedDocIds);
    verify(`task:${t.id}`, 'connectedAgentIds', 'agent', t.connectedAgentIds);
  }

  for (const c of conflicts) {
    verify(`conflict:${c.id}`, 'sourceEntityId', 'any', c.sourceEntityId);
    verify(`conflict:${c.id}`, 'impactedEntityIds', 'any', c.impactedEntityIds);
  }

  for (const ph of phases) {
    verify(`phase:${ph.id}`, 'primaryPlaceId', 'place', ph.primaryPlaceId);
    verify(`phase:${ph.id}`, 'keyAgentIds', 'agent', ph.keyAgentIds);
    verify(`phase:${ph.id}`, 'keyDocIds', 'doc', ph.keyDocIds);
    verify(`phase:${ph.id}`, 'keyTaskIds', 'task', ph.keyTaskIds);
  }

  // -------------------------------------------------------------------------
  // Identity model. Every relation here must be an ID that resolves.
  // -------------------------------------------------------------------------
  const persons = input.persons ?? [];
  const guests = input.guests ?? [];
  const vendors = input.vendors ?? [];
  const accounts = input.accounts ?? [];
  const dmcIdentities = input.dmcIdentities ?? [];
  const seatingTables = input.seatingTables ?? [];
  const memberships = input.memberships ?? [];
  const invitations = input.invitations ?? [];
  const trackVotes = input.trackVotes ?? [];

  const personIds = new Set(persons.map((p) => p.id));
  const accountIds = new Set(accounts.map((a) => a.id));
  const guestIds = new Set(guests.map((g) => g.id));
  const dmcIds = new Set(dmcIdentities.map((d) => d.id));
  const tableIds = new Set(seatingTables.map((t) => t.id));
  const invitationIds = new Set(invitations.map((i) => i.id));
  const trackIds = new Set((input.tracks ?? []).map((t) => t.id));

  const verifySet = (from: string, field: string, kind: string, known: Set<string>, value: unknown) => {
    const list = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    for (const raw of list) {
      if (typeof raw !== 'string' || raw.length === 0) continue;
      checked++;
      if (!known.has(raw)) broken.push({ from, field, missingId: raw, expectedKind: kind });
    }
  };

  for (const p of persons) {
    verifySet(`person:${p.id}`, 'agentId', 'agent', ids.agent, p.agentId);
    verifySet(`person:${p.id}`, 'dmcIdentityId', 'dmcIdentity', dmcIds, p.dmcIdentityId);
    verifySet(`person:${p.id}`, 'accountId', 'account', accountIds, p.accountId);
  }
  for (const a of accounts) {
    verifySet(`account:${a.id}`, 'personId', 'person', personIds, a.personId);
  }
  for (const d of dmcIdentities) {
    verifySet(`dmc:${d.id}`, 'ownerPersonId', 'person', personIds, d.ownerPersonId);
  }
  for (const g of guests) {
    verifySet(`guest:${g.id}`, 'personId', 'person', personIds, g.personId);
    verifySet(`guest:${g.id}`, 'seating.tableId', 'seatingTable', tableIds, g.seating?.tableId);
    verifySet(`guest:${g.id}`, 'invitationId', 'invitation', invitationIds, g.invitationId);
  }
  for (const v of vendors) {
    verifySet(`vendor:${v.id}`, 'contactPersonId', 'person', personIds, v.contactPersonId);
    verifySet(`vendor:${v.id}`, 'agentId', 'agent', ids.agent, v.agentId);
    verifySet(`vendor:${v.id}`, 'documentIds', 'doc', ids.doc, v.documentIds);
    verifySet(`vendor:${v.id}`, 'taskIds', 'task', ids.task, v.taskIds);
    verifySet(`vendor:${v.id}`, 'placeIds', 'place', ids.place, v.placeIds);
  }
  for (const t of seatingTables) {
    verifySet(`table:${t.id}`, 'placeId', 'place', ids.place, t.placeId);
  }
  for (const m of memberships) {
    verifySet(`membership:${m.id}`, 'accountId', 'account', accountIds, m.accountId);
    verifySet(`membership:${m.id}`, 'personId', 'person', personIds, m.personId);
    verifySet(`membership:${m.id}`, 'invitationId', 'invitation', invitationIds, m.invitationId);
  }
  for (const i of invitations) {
    verifySet(`invitation:${i.id}`, 'guestId', 'guest', guestIds, i.guestId);
    verifySet(`invitation:${i.id}`, 'acceptedByAccountId', 'account', accountIds, i.acceptedByAccountId);
    verifySet(`invitation:${i.id}`, 'createdByAccountId', 'account', accountIds, i.createdByAccountId);
  }
  for (const v of trackVotes) {
    verifySet('trackVote', 'personId', 'person', personIds, v.personId);
    if (trackIds.size > 0) verifySet('trackVote', 'trackId', 'track', trackIds, v.trackId);
  }
  for (const a of input.agents ?? []) {
    verifySet(`agent:${a.id}`, 'personId', 'person', personIds, a.personId);
  }

  // Media must belong to an entity that exists, and portraits must resolve.
  const mediaIds = new Set((input.media ?? []).map((m) => m.id));
  const ownerSets: Record<string, Set<string>> = {
    person: personIds, place: ids.place, vendor: new Set((input.vendors ?? []).map((v) => v.id)),
    event: new Set((input.phases ?? []).map((p) => p.id)), song: trackIds,
    wedding: new Set(input.projectId ? [input.projectId] : []),
  };
  for (const m of input.media ?? []) {
    const known = ownerSets[m.ownerKind];
    if (known && known.size > 0) verifySet(`media:${m.id}`, 'ownerId', m.ownerKind, known, m.ownerId);
  }
  for (const p of persons) {
    verifySet(`person:${p.id}`, 'portraitMediaId', 'media', mediaIds, p.portraitMediaId);
  }
  for (const rel of input.relationships ?? []) {
    verifySet(`relationship:${rel.id}`, 'fromPersonId', 'person', personIds, rel.fromPersonId);
    verifySet(`relationship:${rel.id}`, 'toPersonId', 'person', personIds, rel.toPersonId);
  }
  // A track linked to a phase must point at a phase that exists.
  const phaseIds = new Set((input.phases ?? []).map((p) => p.id));
  for (const t of (input.tracksFull ?? [])) {
    verifySet(`track:${t.id}`, 'linkedPhaseId', 'phase', phaseIds, t.linkedPhaseId);
  }
  if (input.currentPersonId) {
    verifySet('session', 'currentPersonId', 'person', personIds, input.currentPersonId);
  }

  return { ok: broken.length === 0, checkedReferences: checked, broken };
}

/** Human-readable summary for logs and the System Nerve evidence field. */
export function describeBrokenReferences(broken: BrokenReference[], limit = 5): string {
  if (broken.length === 0) return 'Aucune référence orpheline.';
  const head = broken.slice(0, limit)
    .map((b) => `${b.from}.${b.field} → ${b.missingId} (${b.expectedKind} introuvable)`)
    .join(' ; ');
  return broken.length > limit ? `${head} … +${broken.length - limit}` : head;
}
