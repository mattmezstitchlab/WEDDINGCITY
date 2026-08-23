// ---------------------------------------------------------------------------
// Wedding City — Persistence schema: THE single source of truth.
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// --------------------
// The persisted shape used to be hand-written in FOUR places that drifted
// apart from one another:
//
//   1. the `PersistedWeddingState` interface   (the declared shape)
//   2. `weddingStore.saveCurrentState()`       (the writer)
//   3. `weddingStore.initFromPersistence()`    (reader #1, on boot)
//   4. `weddingStore.loadProject()`            (reader #2, on project switch)
//
// Adding a field meant editing four spots. Forgetting one produced NO error —
// not at compile time, not at runtime — the value silently fell back to its
// default. That is exactly how `phases`, `adSlots` and `userDmcIdentity` were
// lost on every reload: `phases` was written by (2) but absent from (3) and (4);
// `adSlots` and `userDmcIdentity` were never written at all.
//
// THE FIX
// -------
// One declarative field table (`PERSISTED_FIELDS`) drives BOTH serialization
// and deserialization. Reader and writer literally iterate the same array, so
// they cannot diverge. A compile-time exhaustiveness check (bottom of file)
// fails the build if a field is added to the persisted shape but not to the
// table. Divergence is now structurally impossible rather than merely unlikely.
//
// RULE: to persist a new piece of state, add it to `PersistedDomainState` AND
// to `PERSISTED_FIELDS`. TypeScript enforces the pair.
// ---------------------------------------------------------------------------

import {
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
  AdDisplaySlot,
  DmcIdentity,
} from '../types/wedding';

/**
 * Bump when the persisted shape changes in a way that needs a migration.
 *  v1 — implicit/legacy: no `schemaVersion`; missing `adSlots` + `userDmcIdentity`;
 *       `phases` written but never read back.
 *  v2 — versioned; `adSlots` and `userDmcIdentity` persisted; `phases` restored.
 */
export const SCHEMA_VERSION = 2;

/** Every piece of project state that survives a reload. */
export interface PersistedDomainState {
  time: number;
  userIdentity: UserIdentity;
  userDmcIdentity: DmcIdentity;
  places: Place[];
  agents: Agent[];
  docs: DocumentEntity[];
  tasks: TaskEntity[];
  conflicts: ConflictEntity[];
  phases: TimelinePhase[];
  tracks: TrackEntity[];
  reconstructedVenues: ReconstructedVenue[];
  placedObjects: PlacedObject[];
  adSlots: AdDisplaySlot[];
}

export type PersistedDomainKey = keyof PersistedDomainState;

interface FieldSpec<K extends PersistedDomainKey = PersistedDomainKey> {
  key: K;
  /** 'list' fields are arrays; 'value' fields are scalars/objects. */
  kind: 'list' | 'value';
  /**
   * Only meaningful for lists. When true, a persisted EMPTY array is treated
   * as "nothing saved" and the default is used instead.
   *
   * This preserves the historical behaviour of `initFromPersistence()` for
   * seeded collections (an empty `places` array meant a broken snapshot), while
   * collections the user can legitimately empty (conflicts, tasks, docs...)
   * keep their empty state. Getting this wrong is what made "resolve the last
   * conflict, reload, it's back" happen.
   */
  emptyListMeansUnset?: boolean;
}

/**
 * THE table. Reader and writer both iterate this — they cannot drift.
 */
// NOTE: `as const satisfies` (not a plain type annotation) is load-bearing —
// it keeps the literal key types so the exhaustiveness check below is real.
export const PERSISTED_FIELDS = [
  { key: 'time', kind: 'value' },
  { key: 'userIdentity', kind: 'value' },
  { key: 'userDmcIdentity', kind: 'value' },
  { key: 'places', kind: 'list', emptyListMeansUnset: true },
  { key: 'agents', kind: 'list', emptyListMeansUnset: true },
  { key: 'docs', kind: 'list' },
  { key: 'tasks', kind: 'list' },
  { key: 'conflicts', kind: 'list' },
  { key: 'phases', kind: 'list', emptyListMeansUnset: true },
  { key: 'tracks', kind: 'list' },
  { key: 'reconstructedVenues', kind: 'list', emptyListMeansUnset: true },
  { key: 'placedObjects', kind: 'list' },
  { key: 'adSlots', kind: 'list', emptyListMeansUnset: true },
] as const satisfies readonly FieldSpec[];

// ---------------------------------------------------------------------------
// Serialization / deserialization — one implementation each.
// ---------------------------------------------------------------------------

/** Read the persisted slice out of any object exposing those fields. */
export function serializeDomain(source: PersistedDomainState): PersistedDomainState {
  const out = {} as PersistedDomainState;
  for (const field of PERSISTED_FIELDS as readonly FieldSpec[]) {
    (out as unknown as Record<string, unknown>)[field.key] = source[field.key];
  }
  return out;
}

export interface ApplyReport {
  restored: PersistedDomainKey[];
  defaulted: PersistedDomainKey[];
}

/**
 * Write a snapshot onto a target, falling back to `defaults` per field.
 * Returns which fields came from the snapshot vs. the defaults — the System
 * Nerve can surface this instead of the loss being silent.
 */
export function applyDomain(
  target: PersistedDomainState,
  snapshot: Partial<PersistedDomainState> | null | undefined,
  defaults: PersistedDomainState,
): ApplyReport {
  const report: ApplyReport = { restored: [], defaulted: [] };

  for (const field of PERSISTED_FIELDS as readonly FieldSpec[]) {
    const raw = snapshot ? (snapshot as Record<string, unknown>)[field.key] : undefined;
    let usable = raw !== undefined && raw !== null;

    if (usable && field.kind === 'list') {
      if (!Array.isArray(raw)) usable = false;
      else if (field.emptyListMeansUnset && raw.length === 0) usable = false;
    }
    // `time: 0` is legitimate; only reject genuinely absent scalars.
    if (usable && field.kind === 'value' && typeof raw === 'number' && Number.isNaN(raw)) {
      usable = false;
    }

    const value = usable ? raw : defaults[field.key];
    (target as unknown as Record<string, unknown>)[field.key] = value;
    (usable ? report.restored : report.defaulted).push(field.key);
  }

  return report;
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Bring any historical snapshot up to the current schema version.
 * Legacy (v1) payloads have no `schemaVersion` and simply lack the newer
 * fields — `applyDomain` then fills them from defaults. Nothing is discarded,
 * so existing user data keeps working.
 */
export function migrateSnapshot<T extends Record<string, unknown>>(raw: T): T & { schemaVersion: number } {
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  const migrated: Record<string, unknown> = { ...raw };

  if (version < 2) {
    // v1 → v2: no destructive change. `adSlots`/`userDmcIdentity` were never
    // written, and `phases` was written but never read; leaving them absent
    // lets the defaults apply while preserving every field that does exist.
    migrated.schemaVersion = 2;
  }

  migrated.schemaVersion = SCHEMA_VERSION;
  return migrated as T & { schemaVersion: number };
}

// ---------------------------------------------------------------------------
// Compile-time guarantee that the table covers the shape, exactly.
// If either assignment errors, `PERSISTED_FIELDS` and `PersistedDomainState`
// have drifted apart — which is the bug class this file exists to prevent.
// ---------------------------------------------------------------------------

type CoveredKey = (typeof PERSISTED_FIELDS)[number]['key'];

const _noFieldForgotten: Exclude<PersistedDomainKey, CoveredKey> extends never ? true : never = true;
const _noUnknownField: Exclude<CoveredKey, PersistedDomainKey> extends never ? true : never = true;
void _noFieldForgotten;
void _noUnknownField;
