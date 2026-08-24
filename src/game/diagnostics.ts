// ---------------------------------------------------------------------------
// Wedding City — Diagnostics bus.
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// --------------------
// The codebase had 26 empty `catch {}` blocks. A failed localStorage write, a
// blocked AudioContext or a corrupted snapshot all produced exactly nothing:
// no log, no UI signal, no trace. The System Nerve then reported "OK" because
// it had no way of knowing anything had gone wrong.
//
// This module is the single place where runtime problems are recorded, so that:
//   - engines can report failures instead of swallowing them,
//   - the System Nerve can aggregate REAL evidence instead of hardcoded status,
//   - the UI can surface degraded behaviour honestly.
//
// RULE: this module must stay dependency-free (a leaf), like brand.ts.
// Enforced by scripts/check-startup.mjs.
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/** Which subsystem reported the event. Keep in sync with the System Nerve probes. */
export type DiagnosticSource =
  | 'persistence'
  | 'audio'
  | 'connectors'
  | 'render'
  | 'world'
  | 'store'
  | 'app';

export interface DiagnosticEvent {
  id: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  /** Stable machine code, e.g. 'storage_write_failed'. Used for dedupe + repair mapping. */
  code: string;
  message: string;
  /** Anything useful for the CAUSE → IMPACT → SOLUTION → ACTION panel. */
  detail?: Record<string, unknown>;
  firstSeen: string;
  lastSeen: string;
  count: number;
}

const MAX_EVENTS = 200;

const events: DiagnosticEvent[] = [];
const listeners = new Set<(events: readonly DiagnosticEvent[]) => void>();

function notify(): void {
  for (const fn of listeners) {
    try {
      fn(events);
    } catch {
      /* a broken listener must never break reporting itself */
    }
  }
}

function normalizeError(err: unknown): { message: string; detail?: Record<string, unknown> } {
  if (err instanceof Error) {
    return { message: err.message, detail: { name: err.name, stack: err.stack } };
  }
  if (typeof err === 'string') return { message: err };
  if (err === undefined || err === null) return { message: 'Unknown error' };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

/**
 * Record a diagnostic event. Identical (source, code) events are deduplicated
 * and counted rather than flooding the log — an error in a 60 Hz frame loop
 * must not push everything else out of the buffer.
 */
export function reportDiagnostic(input: {
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  code: string;
  message?: string;
  error?: unknown;
  detail?: Record<string, unknown>;
}): DiagnosticEvent {
  const now = new Date().toISOString();
  const normalized = input.error !== undefined ? normalizeError(input.error) : undefined;
  const message = input.message ?? normalized?.message ?? input.code;
  const detail = { ...(normalized?.detail ?? {}), ...(input.detail ?? {}) };

  const existing = events.find((e) => e.source === input.source && e.code === input.code);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
    existing.message = message;
    existing.detail = detail;
    existing.severity = input.severity;
    notify();
    return existing;
  }

  const event: DiagnosticEvent = {
    id: `diag_${input.source}_${input.code}_${Date.now()}`,
    source: input.source,
    severity: input.severity,
    code: input.code,
    message,
    detail,
    firstSeen: now,
    lastSeen: now,
    count: 1,
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();

  // Still write to the console: a developer must not need the UI to see this.
  try {
    const line = `[WeddingCity/${input.source}] ${input.code}: ${message}`;
    if (input.severity === 'error') console.error(line, detail);
    else if (input.severity === 'warning') console.warn(line, detail);
  } catch {
    /* console unavailable */
  }

  notify();
  return event;
}

export function getDiagnostics(): readonly DiagnosticEvent[] {
  return events;
}

export function getDiagnosticsBySource(source: DiagnosticSource): readonly DiagnosticEvent[] {
  return events.filter((e) => e.source === source);
}

export function hasErrors(source?: DiagnosticSource): boolean {
  return events.some((e) => e.severity === 'error' && (source === undefined || e.source === source));
}

export function clearDiagnostics(source?: DiagnosticSource): void {
  for (let i = events.length - 1; i >= 0; i--) {
    if (source === undefined || events[i].source === source) events.splice(i, 1);
  }
  notify();
}

export function subscribeDiagnostics(fn: (events: readonly DiagnosticEvent[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Run a side-effect that is allowed to fail, reporting instead of swallowing.
 * Replaces the `try { ... } catch {}` pattern found throughout the engines.
 */
export function safely<T>(
  ctx: { source: DiagnosticSource; code: string; severity?: DiagnosticSeverity; detail?: Record<string, unknown> },
  fn: () => T,
): T | undefined {
  try {
    return fn();
  } catch (error) {
    reportDiagnostic({
      source: ctx.source,
      severity: ctx.severity ?? 'warning',
      code: ctx.code,
      error,
      detail: ctx.detail,
    });
    return undefined;
  }
}

/**
 * Catch errors that escape React entirely (async callbacks, rAF, promises).
 * Without this they only reach the browser console and the app looks fine
 * while being broken.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __wcErrorHandlersInstalled?: boolean };
  if (w.__wcErrorHandlersInstalled) return;
  w.__wcErrorHandlersInstalled = true;

  window.addEventListener('error', (event) => {
    reportDiagnostic({
      source: 'app',
      severity: 'error',
      code: 'uncaught_error',
      message: event.message || 'Uncaught error',
      detail: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportDiagnostic({
      source: 'app',
      severity: 'error',
      code: 'unhandled_rejection',
      error: (event as PromiseRejectionEvent).reason,
    });
  });
}
