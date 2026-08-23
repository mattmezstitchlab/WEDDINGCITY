// ---------------------------------------------------------------------------
// AIME — World Model (read model shared by every projection).
// ---------------------------------------------------------------------------
//                              WORLD MODEL
//                                   │
//                 ┌─────────────────┼─────────────────┐
//              WORLD             MIRROR             CANVAS
//            (3D scene)       (editorial site)      (editor)
//
// THE RULE
// --------
// There is ONE truth: `weddingStore`. This module does not hold state, does
// not cache and does not own anything. It is a pure derivation that shapes the
// store into what a projection needs to render.
//
// Consequences, by construction:
//   · Mirror cannot drift from World: both read the same derivation.
//   · A mutation anywhere re-derives everything on the next render.
//   · No second data model, no local Mirror state, no hardcoded values.
//
// STABLE IDENTITY
// ---------------
// Every projected item carries the real entity id (`personId`, `guestId`,
// `phaseId`, `placeId`, ...). A projection must NEVER identify an entity by
// its visual index — that is what makes Mirror → World navigation exact.
//
// AVAILABILITY
// ------------
// Each section reports `hasData`. A projection hides or empty-states a section
// instead of inventing content for it (Phase C §14/§15).
// ---------------------------------------------------------------------------

import { weddingStore } from '../game/weddingStore';
import { RsvpStatus } from '../types/identity';

// --- Hero -------------------------------------------------------------------

export interface HeroProjection {
  projectId: string;
  title: string;
  coupleNames: string;
  /** ISO date as stored, plus a formatted French version. Never invented. */
  isoDate: string | null;
  formattedDate: string | null;
  /** Days until the wedding, derived from the real date. Null if no date. */
  daysUntil: number | null;
  locationName: string | null;
  worldType: string;
  hasData: boolean;
}

function formatFrenchDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function projectHero(): HeroProjection {
  const p = weddingStore.currentProject;
  const iso = p.weddingDate || null;
  const formatted = iso ? formatFrenchDate(iso) : null;

  let daysUntil: number | null = null;
  if (iso) {
    const target = new Date(iso);
    if (!Number.isNaN(target.getTime())) {
      const today = new Date();
      const ms = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
      daysUntil = Math.round(ms / 86400000);
    }
  }

  return {
    projectId: p.id,
    title: p.title,
    coupleNames: p.coupleNames,
    isoDate: iso,
    formattedDate: formatted,
    daysUntil,
    locationName: p.locationName || null,
    worldType: p.worldType,
    hasData: Boolean(p.title || p.coupleNames),
  };
}

// --- Programme --------------------------------------------------------------

export interface ProgrammeMoment {
  phaseId: string;
  /** "15:30" — derived from the real startHour, not typed by hand. */
  time: string;
  endTime: string;
  startHour: number;
  endHour: number;
  /** Phase name with any leading "10:00 — " stripped: the time is shown separately. */
  title: string;
  subtitle: string | null;
  highlight: string | null;
  placeId: string | null;
  placeName: string | null;
  /** True when the simulated clock is inside this phase. */
  isCurrent: boolean;
  /** Real people mobilised by this phase. */
  keyPersonIds: string[];
}

export interface ProgrammeProjection {
  moments: ProgrammeMoment[];
  hasData: boolean;
}

function formatHour(h: number): string {
  const hours = Math.floor(h) % 24;
  const mins = Math.round((h % 1) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Phase names embed their own time ("10:00 — Préparatifs"); avoid showing it twice. */
function stripLeadingTime(name: string): string {
  return name.replace(/^\s*\d{1,2}\s*[:h]\s*\d{0,2}\s*[—–-]\s*/, '').trim() || name;
}

export function projectProgramme(): ProgrammeProjection {
  const now = weddingStore.time;
  const moments = [...weddingStore.phases]
    .sort((a, b) => a.startHour - b.startHour)
    .map((ph) => {
      const place = ph.primaryPlaceId
        ? weddingStore.places.find((p) => p.id === ph.primaryPlaceId) ?? null
        : null;
      const keyPersonIds = (ph.keyAgentIds ?? [])
        .map((agentId) => weddingStore.getPersonForAgent(agentId)?.id)
        .filter((id): id is string => Boolean(id));

      return {
        phaseId: ph.id,
        time: formatHour(ph.startHour),
        endTime: formatHour(ph.endHour),
        startHour: ph.startHour,
        endHour: ph.endHour,
        title: stripLeadingTime(ph.name),
        subtitle: ph.subtitle || null,
        highlight: ph.highlightAction || null,
        placeId: place?.id ?? null,
        placeName: place?.name ?? null,
        isCurrent: now >= ph.startHour && now < ph.endHour,
        keyPersonIds,
      };
    });

  return { moments, hasData: moments.length > 0 };
}

// --- Guests -----------------------------------------------------------------

export interface GuestProjection {
  guestId: string;
  personId: string;
  /** Present only when this person has a spatial projection in the World. */
  agentId: string | null;
  displayName: string;
  rsvp: RsvpStatus;
  plusOnes: number;
  tableId: string | null;
  tableLabel: string | null;
  dietary: string | null;
  side: string;
  dmcColor: string | null;
  dmcCode: string | null;
  /** True when the person can be focused in the 3D World. */
  canShowInWorld: boolean;
}

export interface TableProjection {
  tableId: string;
  label: string;
  number: number;
  capacity: number;
  seated: number;
  placeId: string | null;
  placeName: string | null;
  guests: GuestProjection[];
  overCapacity: boolean;
}

export interface GuestsProjection {
  guests: GuestProjection[];
  tables: TableProjection[];
  unplaced: GuestProjection[];
  counts: {
    total: number;
    headcount: number;
    byRsvp: Record<RsvpStatus, number>;
    tables: number;
    capacity: number;
    withDietary: number;
  };
  /** RSVP statuses actually present — a projection must not advertise empty ones. */
  presentStatuses: RsvpStatus[];
  hasData: boolean;
}

function projectGuest(guestId: string): GuestProjection | null {
  const g = weddingStore.guests.find((x) => x.id === guestId);
  if (!g) return null;
  const person = weddingStore.getPerson(g.personId);
  const agent = weddingStore.getAgentForPerson(g.personId);
  const dmc = weddingStore.getDmcForPerson(g.personId);
  const table = g.seating.tableId
    ? weddingStore.seatingTables.find((t) => t.id === g.seating.tableId) ?? null
    : null;
  const dietary = g.dietary && g.dietary.trim() && g.dietary !== 'Standard' ? g.dietary : null;

  return {
    guestId: g.id,
    personId: g.personId,
    agentId: agent?.id ?? null,
    displayName: person?.displayName ?? g.personId,
    rsvp: g.rsvp.status,
    plusOnes: g.rsvp.plusOnes,
    tableId: table?.id ?? null,
    tableLabel: table?.label ?? null,
    dietary,
    side: g.side,
    dmcColor: dmc?.dmcColor ?? null,
    dmcCode: dmc?.dmcCode ?? null,
    canShowInWorld: Boolean(agent),
  };
}

export function projectGuests(): GuestsProjection {
  const guests = weddingStore.guests
    .map((g) => projectGuest(g.id))
    .filter((g): g is GuestProjection => g !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));

  const tables: TableProjection[] = [...weddingStore.seatingTables]
    .sort((a, b) => a.number - b.number)
    .map((t) => {
      const seatedGuests = guests.filter((g) => g.tableId === t.id);
      const seated = seatedGuests.reduce((n, g) => n + 1 + g.plusOnes, 0);
      const place = t.placeId ? weddingStore.places.find((p) => p.id === t.placeId) ?? null : null;
      return {
        tableId: t.id,
        label: t.label,
        number: t.number,
        capacity: t.capacity,
        seated,
        placeId: place?.id ?? null,
        placeName: place?.name ?? null,
        guests: seatedGuests,
        overCapacity: seated > t.capacity,
      };
    });

  const byRsvp: Record<RsvpStatus, number> = { pending: 0, accepted: 0, declined: 0, tentative: 0 };
  for (const g of guests) byRsvp[g.rsvp]++;

  return {
    guests,
    tables,
    unplaced: guests.filter((g) => !g.tableId),
    counts: {
      total: guests.length,
      headcount: guests.reduce((n, g) => n + 1 + g.plusOnes, 0),
      byRsvp,
      tables: tables.length,
      capacity: tables.reduce((n, t) => n + t.capacity, 0),
      withDietary: guests.filter((g) => g.dietary).length,
    },
    presentStatuses: (Object.keys(byRsvp) as RsvpStatus[]).filter((s) => byRsvp[s] > 0),
    hasData: guests.length > 0,
  };
}

// --- Sections not yet backed by data ----------------------------------------

export interface SectionAvailability {
  id: string;
  label: string;
  available: boolean;
  /** Why it is unavailable — shown as an honest empty state, never faked. */
  reason?: string;
}

/**
 * What the store can and cannot feed today.
 * Used by Mirror to decide between rendering, empty-stating, or hiding.
 */
export function projectAvailability(): SectionAvailability[] {
  const hero = projectHero();
  const programme = projectProgramme();
  const guests = projectGuests();

  return [
    { id: 'hero', label: 'Identité', available: hero.hasData },
    { id: 'programme', label: 'Programme', available: programme.hasData },
    { id: 'guests', label: 'Invités', available: guests.hasData },
    {
      id: 'story', label: 'Notre histoire', available: false,
      reason: 'Aucun champ de récit n’existe dans le modèle de données.',
    },
    {
      id: 'gallery', label: 'Galerie', available: false,
      reason: 'Aucun média n’est stocké : les documents importés ne contiennent pas d’images.',
    },
  ];
}

/** Everything a projection needs, derived in one pass. */
export interface WorldModelProjection {
  hero: HeroProjection;
  programme: ProgrammeProjection;
  guests: GuestsProjection;
  availability: SectionAvailability[];
  /** Store version, so renderers can memoise on real mutations. */
  version: number;
}

export function projectWorldModel(): WorldModelProjection {
  return {
    hero: projectHero(),
    programme: projectProgramme(),
    guests: projectGuests(),
    availability: projectAvailability(),
    version: weddingStore.version,
  };
}
