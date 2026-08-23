// ---------------------------------------------------------------------------
// Wedding City — Nervous-system graph.
// ---------------------------------------------------------------------------
// The relations already exist in the data (connectedDocIds, assignedPlaceId,
// keyTaskIds, ...) but were only ever drawn as decorative lines in the 3D
// scene. This module turns them into an explicit, queryable graph so that:
//
//   - the canonical chain can be visualised:
//       DOCUMENT → PRESTATAIRE → TÂCHE → TIMELINE → LIEU → PERSONNES
//   - a fault on one node can be PROPAGATED to everything it affects.
//
// This is the substrate for "Wedding City as the nervous system of a wedding":
// an incident is no longer a line in a log, it is a blast radius in the graph.
// ---------------------------------------------------------------------------

import { Guest, Vendor, SeatingTable } from '../types/identity';
import {
  Agent,
  Place,
  DocumentEntity,
  TaskEntity,
  ConflictEntity,
  TimelinePhase,
} from '../types/wedding';

export type GraphNodeKind = 'document' | 'vendor' | 'task' | 'phase' | 'place' | 'person';

/** Canonical layer order of the nervous system, used for layout and reading. */
export const GRAPH_LAYERS: { kind: GraphNodeKind; label: string }[] = [
  { kind: 'document', label: 'DOCUMENTS' },
  { kind: 'vendor', label: 'PRESTATAIRES' },
  { kind: 'task', label: 'TÂCHES' },
  { kind: 'phase', label: 'TIMELINE' },
  { kind: 'place', label: 'LIEUX' },
  { kind: 'person', label: 'PERSONNES' },
];

/** Roles considered service providers rather than family/guests. */
const VENDOR_ROLES = new Set([
  'photographer', 'caterer', 'dj', 'florist', 'officiant',
  'wedding_planner', 'driver', 'videographer', 'musician', 'baker',
]);

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sublabel?: string;
  /** Layer index, from GRAPH_LAYERS. */
  layer: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Why these two are linked, for the tooltip. */
  relation: string;
}

export interface NerveGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  byId: Map<string, GraphNode>;
  /** Adjacency in both directions, for propagation. */
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

export interface GraphInput {
  /**
   * First-order entities. When provided, vendor/person classification comes
   * from the DATA MODEL (vendor.agentId / guest.personId) instead of guessing
   * from `agent.role` — which is the whole point of the identity refactor.
   */
  guests?: Guest[];
  vendors?: Vendor[];
  seatingTables?: SeatingTable[];
  places?: Place[];
  agents?: Agent[];
  docs?: DocumentEntity[];
  tasks?: TaskEntity[];
  conflicts?: ConflictEntity[];
  phases?: TimelinePhase[];
}

const nodeId = (kind: GraphNodeKind, id: string) => `${kind}:${id}`;

/**
 * Build the graph from live store collections.
 * Only edges whose BOTH ends exist are emitted — dangling ids are reported by
 * checkReferentialIntegrity(), not silently drawn as phantom links.
 */
export function buildNerveGraph(input: GraphInput): NerveGraph {
  const places = input.places ?? [];
  const agents = input.agents ?? [];
  const docs = input.docs ?? [];
  const tasks = input.tasks ?? [];
  const phases = input.phases ?? [];

  const guests = input.guests ?? [];
  const vendors = input.vendors ?? [];
  const seatingTables = input.seatingTables ?? [];

  // Authoritative vendor classification, by ID.
  const vendorAgentIds = new Set(vendors.map((v) => v.agentId).filter(Boolean) as string[]);
  const hasIdentityModel = vendors.length > 0 || guests.length > 0;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const byId = new Map<string, GraphNode>();

  const layerOf = (kind: GraphNodeKind) => GRAPH_LAYERS.findIndex((l) => l.kind === kind);

  const addNode = (kind: GraphNodeKind, id: string, label: string, sublabel?: string) => {
    const key = nodeId(kind, id);
    if (byId.has(key)) return key;
    const node: GraphNode = { id: key, kind, label, sublabel, layer: layerOf(kind) };
    nodes.push(node);
    byId.set(key, node);
    return key;
  };

  for (const d of docs) {
    addNode('document', d.id, d.title, d.category);
  }
  for (const a of agents) {
    // Prefer the identity model; fall back to the role heuristic only when it
    // has not been migrated yet.
    const isVendor = hasIdentityModel ? vendorAgentIds.has(a.id) : VENDOR_ROLES.has(a.role);
    addNode(isVendor ? 'vendor' : 'person', a.id, a.name, a.title || a.role);
  }
  for (const t of tasks) addNode('task', t.id, t.title, t.category);
  for (const ph of phases) addNode('phase', ph.id, ph.name, `${ph.startHour}h → ${ph.endHour}h`);
  for (const p of places) addNode('place', p.id, p.name, p.code);

  const agentKey = (id: string) => {
    const a = agents.find((x) => x.id === id);
    if (!a) return null;
    const isVendor = hasIdentityModel ? vendorAgentIds.has(a.id) : VENDOR_ROLES.has(a.role);
    return nodeId(isVendor ? 'vendor' : 'person', a.id);
  };

  const link = (from: string | null, to: string | null, relation: string) => {
    if (!from || !to || !byId.has(from) || !byId.has(to) || from === to) return;
    if (edges.some((e) => e.from === from && e.to === to)) return;
    edges.push({ from, to, relation });
  };

  // DOCUMENT → PRESTATAIRE / TÂCHE / LIEU
  for (const d of docs) {
    const from = nodeId('document', d.id);
    for (const id of d.connectedAgentIds ?? []) link(from, agentKey(id), 'document confié à');
    for (const id of d.connectedTaskIds ?? []) link(from, nodeId('task', id), 'document déclenche');
    for (const id of d.connectedPlaceIds ?? []) link(from, nodeId('place', id), 'document concerne');
  }

  // PRESTATAIRE / PERSONNE → TÂCHE / LIEU
  for (const a of agents) {
    const from = agentKey(a.id);
    for (const id of a.connectedTaskIds ?? []) link(from, nodeId('task', id), 'responsable de');
    if (a.assignedPlaceId) link(from, nodeId('place', a.assignedPlaceId), 'affecté à');
    for (const id of a.connectedPlaceIds ?? []) link(from, nodeId('place', id), 'intervient à');
  }

  // TÂCHE → LIEU / PERSONNE
  for (const t of tasks) {
    const from = nodeId('task', t.id);
    if (t.assignedPlaceId) link(from, nodeId('place', t.assignedPlaceId), 'se déroule à');
    if (t.assignedAgentId) link(from, agentKey(t.assignedAgentId), 'assignée à');
  }

  // TIMELINE → TÂCHE / LIEU / PERSONNE / DOCUMENT
  for (const ph of phases) {
    const from = nodeId('phase', ph.id);
    for (const id of ph.keyTaskIds ?? []) link(from, nodeId('task', id), 'phase orchestre');
    for (const id of ph.keyAgentIds ?? []) link(from, agentKey(id), 'phase mobilise');
    for (const id of ph.keyDocIds ?? []) link(nodeId('document', id), from, 'document cadre la phase');
    if (ph.primaryPlaceId) link(from, nodeId('place', ph.primaryPlaceId), 'phase se tient à');
  }

  // LIEU → PERSONNES
  for (const p of places) {
    const from = nodeId('place', p.id);
    for (const id of p.connectedAgentIds ?? []) link(from, agentKey(id), 'lieu accueille');
  }

  // VENDOR entity relations (by id): Vendor → Document → Zone → Tasks.
  for (const v of vendors) {
    const from = v.agentId ? agentKey(v.agentId) : null;
    if (!from) continue;
    for (const docId of v.documentIds) link(nodeId('document', docId), from, 'contrat du prestataire');
    for (const taskId of v.taskIds) link(from, nodeId('task', taskId), 'prestation à réaliser');
    for (const placeId of v.placeIds) link(from, nodeId('place', placeId), 'zone d’intervention');
  }

  // GUEST entity relations: Guest → Table → Place, and Guest → Person.
  for (const g of guests) {
    const table = g.seating.tableId ? seatingTables.find((t) => t.id === g.seating.tableId) : undefined;
    if (!table?.placeId) continue;
    const agent = agents.find((a) => a.personId === g.personId);
    if (agent) link(agentKey(agent.id), nodeId('place', table.placeId), `placé à ${table.label}`);
  }

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    if (!outgoing.has(e.from)) outgoing.set(e.from, []);
    outgoing.get(e.from)!.push(e.to);
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to)!.push(e.from);
  }

  return { nodes, edges, byId, outgoing, incoming };
}

export interface PropagationResult {
  origin: string;
  /** Node id → number of hops from the origin. */
  affected: Map<string, number>;
  /** Affected nodes grouped by layer, in canonical order. */
  byLayer: { kind: GraphNodeKind; label: string; nodes: GraphNode[] }[];
  maxDepth: number;
}

/**
 * Propagate a fault from one node along the graph.
 *
 * Direction 'downstream' answers "what does this break?", which is the
 * operational question: a wrong document breaks a task, which breaks a phase,
 * which strands people at a place.
 */
export function propagateFault(
  graph: NerveGraph,
  originId: string,
  options: { direction?: 'downstream' | 'upstream' | 'both'; maxDepth?: number } = {},
): PropagationResult {
  const direction = options.direction ?? 'downstream';
  const maxDepth = options.maxDepth ?? 4;

  const affected = new Map<string, number>();
  if (!graph.byId.has(originId)) {
    return { origin: originId, affected, byLayer: [], maxDepth: 0 };
  }

  affected.set(originId, 0);
  let frontier = [originId];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    depth++;
    const next: string[] = [];
    for (const id of frontier) {
      const neighbours: string[] = [];
      if (direction === 'downstream' || direction === 'both') neighbours.push(...(graph.outgoing.get(id) ?? []));
      if (direction === 'upstream' || direction === 'both') neighbours.push(...(graph.incoming.get(id) ?? []));
      for (const n of neighbours) {
        if (affected.has(n)) continue;
        affected.set(n, depth);
        next.push(n);
      }
    }
    frontier = next;
  }

  const byLayer = GRAPH_LAYERS.map((layer) => ({
    kind: layer.kind,
    label: layer.label,
    nodes: [...affected.keys()]
      .map((id) => graph.byId.get(id)!)
      .filter((n) => n && n.kind === layer.kind),
  })).filter((l) => l.nodes.length > 0);

  return {
    origin: originId,
    affected,
    byLayer,
    maxDepth: affected.size > 1 ? Math.max(...affected.values()) : 0,
  };
}

/** Human-readable propagation chain, e.g. for an incident description. */
export function describePropagation(graph: NerveGraph, result: PropagationResult): string {
  if (result.affected.size <= 1) return 'Aucune propagation détectée.';
  const parts = result.byLayer.map((l) => `${l.nodes.length} ${l.label.toLowerCase()}`);
  return `${result.affected.size - 1} élément(s) impactés sur ${result.maxDepth} niveau(x) : ${parts.join(' · ')}.`;
}
