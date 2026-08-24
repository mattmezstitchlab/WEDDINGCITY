// ---------------------------------------------------------------------------
// Guest constellation — projection layer.
// ---------------------------------------------------------------------------
// PURE FUNCTION: store data in, geometry out. No React, no random, no
// fabricated value. Rendering is a separate concern, which makes the whole
// projection unit-testable.
//
// THE DATA RULE (PHASE-A §5, enforced by scripts/check-dataviz.mjs)
// -----------------------------------------------------------------
// Every visual attribute must trace back to a real field of the store.
// Nothing is invented, nothing is padded, nothing is estimated.
//
// WHY MULTI-DIMENSIONAL
// ---------------------
// RSVP alone would render a single flat colour today: the demo currently has
// 27/27 accepted, because the migration faithfully recorded that the demo
// agents were physically present. Rather than fabricate refusals to make the
// picture prettier, the constellation encodes several REAL dimensions at once,
// so it stays informative even when one of them is uniform.
// ---------------------------------------------------------------------------

import { Guest, Person, SeatingTable, RsvpStatus } from '../types/identity';
import { Agent } from '../types/wedding';

export interface ConstellationNode {
  /** Guest entity id — the node IS the entity, not a copy of it. */
  guestId: string;
  personId: string;
  /** Spatial projection, when this person has one. */
  agentId?: string;
  label: string;
  /** REAL RSVP status. Drives colour. */
  rsvp: RsvpStatus;
  /** Table this guest is seated at, or null when unplaced. */
  tableId: string | null;
  tableLabel: string | null;
  /** 1 + plusOnes. Drives node size. */
  headcount: number;
  /** Real dietary requirement, or null. Drives a discreet glyph. */
  dietary: string | null;
  side: Guest['side'];
  /** Owned DMC colour, or null when the person has none. Drives the ring. */
  dmcColor: string | null;
  /** Layout position, in a normalised 0..1 space. */
  x: number;
  y: number;
  /** Cluster index: which group the node was laid out in. */
  cluster: number;
}

export interface ConstellationCluster {
  id: string;
  label: string;
  /** Real capacity when this cluster is a table; null for the unplaced group. */
  capacity: number | null;
  /** Real occupancy, counting plus-ones. */
  seated: number;
  x: number;
  y: number;
  radius: number;
  isUnplaced: boolean;
  /** Measured, not assumed: seated > capacity. */
  overCapacity: boolean;
}

export interface ConstellationModel {
  nodes: ConstellationNode[];
  clusters: ConstellationCluster[];
  /** Counts derived from the nodes themselves — never hardcoded. */
  totals: {
    guests: number;
    headcount: number;
    byRsvp: Record<RsvpStatus, number>;
    placed: number;
    unplaced: number;
    withDietary: number;
    withDmc: number;
    tables: number;
    capacity: number;
  };
}

export interface ConstellationInput {
  guests: Guest[];
  persons: Person[];
  seatingTables: SeatingTable[];
  agents: Agent[];
  /** personId → DMC hex, resolved by the caller from the DMC records. */
  dmcByPerson?: Map<string, string>;
}

/**
 * Deterministic angular offset for a node inside its cluster.
 * Derived from the guest id, NOT random: the same guest always sits at the
 * same place, so the picture is stable across renders and reloads.
 */
function stableAngle(seed: string, index: number, count: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const jitter = ((h % 1000) / 1000 - 0.5) * 0.28;
  return (index / Math.max(1, count)) * Math.PI * 2 + jitter;
}

export function buildConstellation(input: ConstellationInput): ConstellationModel {
  const { guests, persons, seatingTables, agents } = input;
  const dmcByPerson = input.dmcByPerson ?? new Map<string, string>();

  const personById = new Map(persons.map((p) => [p.id, p]));
  const agentByPerson = new Map(
    agents.filter((a) => a.personId).map((a) => [a.personId as string, a]),
  );

  // --- group guests by their REAL table assignment ---
  const groups = new Map<string, Guest[]>();
  const UNPLACED = '__unplaced__';
  for (const g of guests) {
    const key = g.seating.tableId ?? UNPLACED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(g);
  }

  // Tables with no guest still deserve a cluster: empty seats are information.
  for (const t of seatingTables) if (!groups.has(t.id)) groups.set(t.id, []);

  const tableKeys = [...groups.keys()].filter((k) => k !== UNPLACED)
    .sort((a, b) => {
      const ta = seatingTables.find((t) => t.id === a)?.number ?? 0;
      const tb = seatingTables.find((t) => t.id === b)?.number ?? 0;
      return ta - tb;
    });

  const clusters: ConstellationCluster[] = [];
  const nodes: ConstellationNode[] = [];

  // Tables laid out on a ring; unplaced guests drift at the periphery so
  // "3 people still to seat" is visible rather than being a counter.
  const ringRadius = 0.31;
  const cx = 0.5;
  const cy = 0.5;

  tableKeys.forEach((tableId, i) => {
    const table = seatingTables.find((t) => t.id === tableId);
    const members = groups.get(tableId)!;
    const angle = (i / Math.max(1, tableKeys.length)) * Math.PI * 2 - Math.PI / 2;
    const gx = cx + Math.cos(angle) * ringRadius;
    const gy = cy + Math.sin(angle) * ringRadius;

    const seated = members.reduce((n, g) => n + 1 + g.rsvp.plusOnes, 0);
    const capacity = table?.capacity ?? null;

    clusters.push({
      id: tableId,
      label: table?.label ?? tableId,
      capacity,
      seated,
      x: gx,
      y: gy,
      radius: 0.085,
      isUnplaced: false,
      overCapacity: capacity !== null && seated > capacity,
    });

    members.forEach((g, idx) => {
      nodes.push(makeNode(g, idx, members.length, gx, gy, 0.052, i));
    });
  });

  const unplaced = groups.get(UNPLACED) ?? [];
  if (unplaced.length > 0) {
    const seated = unplaced.reduce((n, g) => n + 1 + g.rsvp.plusOnes, 0);
    clusters.push({
      id: UNPLACED,
      label: 'Non placés',
      capacity: null,
      seated,
      x: cx,
      y: cy,
      radius: 0.055,
      isUnplaced: true,
      overCapacity: false,
    });
    unplaced.forEach((g, idx) => {
      nodes.push(makeNode(g, idx, unplaced.length, cx, cy, 0.038, -1));
    });
  }

  function makeNode(
    g: Guest, idx: number, count: number, gx: number, gy: number, spread: number, cluster: number,
  ): ConstellationNode {
    const person = personById.get(g.personId);
    const agent = agentByPerson.get(g.personId);
    const angle = stableAngle(g.id, idx, count);
    // Two concentric rows keep larger tables readable.
    const row = idx >= 8 ? 1 : 0;
    const r = spread * (row === 0 ? 1 : 1.5);
    const table = seatingTables.find((t) => t.id === g.seating.tableId);
    const dietary = g.dietary && g.dietary.trim() && g.dietary !== 'Standard' ? g.dietary : null;

    return {
      guestId: g.id,
      personId: g.personId,
      agentId: agent?.id,
      label: person?.displayName ?? g.personId,
      rsvp: g.rsvp.status,
      tableId: g.seating.tableId ?? null,
      tableLabel: table?.label ?? null,
      headcount: 1 + g.rsvp.plusOnes,
      dietary,
      side: g.side,
      dmcColor: dmcByPerson.get(g.personId) ?? null,
      x: gx + Math.cos(angle) * r,
      y: gy + Math.sin(angle) * r,
      cluster,
    };
  }

  const byRsvp: Record<RsvpStatus, number> = { pending: 0, accepted: 0, declined: 0, tentative: 0 };
  for (const n of nodes) byRsvp[n.rsvp]++;

  return {
    nodes,
    clusters,
    totals: {
      guests: nodes.length,
      headcount: nodes.reduce((n, x) => n + x.headcount, 0),
      byRsvp,
      placed: nodes.filter((n) => n.tableId).length,
      unplaced: nodes.filter((n) => !n.tableId).length,
      withDietary: nodes.filter((n) => n.dietary).length,
      withDmc: nodes.filter((n) => n.dmcColor).length,
      tables: clusters.filter((c) => !c.isUnplaced).length,
      capacity: clusters.reduce((n, c) => n + (c.capacity ?? 0), 0),
    },
  };
}

/** Colour per RSVP status. Muted on purpose — signal, not neon. */
export const RSVP_COLOR: Record<RsvpStatus, string> = {
  accepted: '#7fb79a',
  pending: '#d9b877',
  tentative: '#8fb0c6',
  declined: '#c98f9c',
};

export const RSVP_LABEL: Record<RsvpStatus, string> = {
  accepted: 'Présent',
  pending: 'En attente',
  tentative: 'Incertain',
  declined: 'Absent',
};
