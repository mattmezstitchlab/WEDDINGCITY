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
import { RsvpStatus, MediaAsset, RelationshipKind } from '../types/identity';
import { PlaceKind } from '../types/wedding';

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
  notes: string | null;
  /** Real people mobilised by this phase. */
  keyPersonIds: string[];
  /** Vendors intervening at this moment's place. Derived, never stored twice. */
  /** `explicit` = attached by the user, vs derived from the place. */
  vendors: { vendorId: string; companyName: string; category: string; explicit: boolean }[];
  /** Tracks whose moment resolves to this phase. */
  songs: { songId: string; title: string; artist: string; duration: string }[];
  media: MediaProjection[];
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

      // Vendors explicitly attached in the Canvas, PLUS those derived from the
      // moment's place. Explicit links win and are marked, so the Canvas can
      // offer to detach only what the user actually attached.
      const explicitIds = ph.vendorIds ?? [];
      const derived = place ? weddingStore.getVendorsForPlace(place.id) : [];
      const seen = new Set<string>();
      const vendors = [
        ...explicitIds
          .map((id) => weddingStore.vendors.find((v) => v.id === id))
          .filter((v): v is NonNullable<typeof v> => Boolean(v))
          .map((v) => ({ vendorId: v.id, companyName: v.companyName, category: v.category, explicit: true })),
        ...derived.map((v) => ({ vendorId: v.id, companyName: v.companyName, category: v.category, explicit: false })),
      ].filter((v) => (seen.has(v.vendorId) ? false : (seen.add(v.vendorId), true)));
      const songs = weddingStore.getTracksForPhase(ph.id).map((t) => ({
        songId: t.id, title: t.title, artist: t.artist, duration: t.duration,
      }));

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
        notes: ph.notes ?? null,
        keyPersonIds,
        vendors,
        songs,
        media: projectMedia('event', ph.id),
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

// --- Media ------------------------------------------------------------------

export interface MediaProjection {
  mediaId: string;
  kind: MediaAsset['kind'];
  source: string;
  title: string | null;
  caption: string | null;
}

export function projectMedia(ownerKind: MediaAsset['ownerKind'], ownerId: string): MediaProjection[] {
  return weddingStore.getMediaFor(ownerKind, ownerId).map((m) => ({
    mediaId: m.id,
    kind: m.kind,
    source: m.source,
    title: m.title ?? null,
    caption: m.caption ?? null,
  }));
}

// --- Vendors ----------------------------------------------------------------

export interface VendorProjection {
  vendorId: string;
  companyName: string;
  category: string;
  status: string;
  contactPersonId: string | null;
  contactName: string | null;
  agentId: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  notes: string | null;
  documentCount: number;
  taskCount: number;
  places: { placeId: string; name: string }[];
  /** Timeline moments this vendor is involved in, via its zones. */
  moments: { phaseId: string; time: string; title: string }[];
  media: MediaProjection[];
  canShowInWorld: boolean;
}

export interface VendorsProjection {
  vendors: VendorProjection[];
  /** Grouped by category for editorial presentation. */
  byCategory: { category: string; vendors: VendorProjection[] }[];
  counts: { total: number; contracted: number; withContact: number };
  hasData: boolean;
}

export function projectVendors(): VendorsProjection {
  const phases = weddingStore.phases;

  const vendors: VendorProjection[] = weddingStore.vendors.map((v) => {
    const contact = v.contactPersonId ? weddingStore.getPerson(v.contactPersonId) : null;
    const places = v.placeIds
      .map((id) => weddingStore.places.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ placeId: p.id, name: p.name }));
    const placeIdSet = new Set(places.map((p) => p.placeId));
    const moments = phases
      .filter((ph) => ph.primaryPlaceId && placeIdSet.has(ph.primaryPlaceId))
      .sort((a, b) => a.startHour - b.startHour)
      .map((ph) => ({ phaseId: ph.id, time: formatHour(ph.startHour), title: stripLeadingTime(ph.name) }));

    const hasAgent = Boolean(v.agentId && weddingStore.agents.some((a) => a.id === v.agentId));

    return {
      vendorId: v.id,
      companyName: v.companyName,
      category: v.category,
      status: v.status,
      contactPersonId: v.contactPersonId ?? null,
      contactName: contact?.displayName ?? null,
      agentId: v.agentId ?? null,
      phone: v.phone ?? null,
      email: v.email ?? null,
      websiteUrl: v.websiteUrl ?? null,
      notes: v.notes ?? null,
      documentCount: v.documentIds.length,
      taskCount: v.taskIds.length,
      places,
      moments,
      media: projectMedia('vendor', v.id),
      canShowInWorld: hasAgent || places.length > 0,
    };
  }).sort((a, b) => a.companyName.localeCompare(b.companyName, 'fr'));

  const categories = [...new Set(vendors.map((v) => v.category))].sort();

  return {
    vendors,
    byCategory: categories.map((category) => ({
      category, vendors: vendors.filter((v) => v.category === category),
    })),
    counts: {
      total: vendors.length,
      contracted: vendors.filter((v) => v.status === 'contracted').length,
      withContact: vendors.filter((v) => v.phone || v.email || v.websiteUrl).length,
    },
    hasData: vendors.length > 0,
  };
}

// --- Places -----------------------------------------------------------------

export interface PlaceProjection {
  placeId: string;
  name: string;
  code: string;
  kind: PlaceKind;
  address: string | null;
  gps: string | null;
  description: string | null;
  capacity: number | null;
  /** Active window as stored on the place. */
  window: string | null;
  moments: { phaseId: string; time: string; title: string }[];
  vendors: { vendorId: string; companyName: string; category: string }[];
  tableCount: number;
  media: MediaProjection[];
  /** Places always have a spatial representation in this product. */
  canShowInWorld: boolean;
}

export interface PlacesProjection {
  places: PlaceProjection[];
  /** Only places that actually host a timeline moment. */
  keyPlaces: PlaceProjection[];
  counts: { total: number; withMoments: number; totalCapacity: number };
  hasData: boolean;
}

export function projectPlaces(): PlacesProjection {
  const places: PlaceProjection[] = weddingStore.places.map((p) => {
    const moments = weddingStore.getPhasesForPlace(p.id)
      .sort((a, b) => a.startHour - b.startHour)
      .map((ph) => ({ phaseId: ph.id, time: formatHour(ph.startHour), title: stripLeadingTime(ph.name) }));

    return {
      placeId: p.id,
      name: p.name,
      code: p.code,
      kind: weddingStore.getPlaceKind(p.id),
      address: p.address ?? null,
      gps: p.gpsCoordinates ?? null,
      description: p.description ?? null,
      capacity: typeof p.capacity === 'number' ? p.capacity : null,
      window: typeof p.activeFromHour === 'number' && typeof p.activeToHour === 'number'
        ? `${formatHour(p.activeFromHour)} – ${formatHour(p.activeToHour)}`
        : null,
      moments,
      vendors: weddingStore.getVendorsForPlace(p.id).map((v) => ({
        vendorId: v.id, companyName: v.companyName, category: v.category,
      })),
      tableCount: weddingStore.seatingTables.filter((t) => t.placeId === p.id).length,
      media: projectMedia('place', p.id),
      canShowInWorld: true,
    };
  });

  const keyPlaces = places.filter((p) => p.moments.length > 0);

  return {
    places,
    keyPlaces,
    counts: {
      total: places.length,
      withMoments: keyPlaces.length,
      totalCapacity: places.reduce((n, p) => n + (p.capacity ?? 0), 0),
    },
    hasData: places.length > 0,
  };
}

// --- Music ------------------------------------------------------------------

export interface SongProjection {
  songId: string;
  title: string;
  artist: string;
  duration: string;
  moment: string;
  status: string;
  votes: number;
  bpm: number | null;
  /** Timeline anchor, explicit or deterministically derived from the moment. */
  phaseId: string | null;
  phaseTitle: string | null;
  phaseTime: string | null;
  media: MediaProjection[];
  /** Cover art only when a real media exists. Never a generated placeholder. */
  coverSource: string | null;
}

export interface MusicProjection {
  songs: SongProjection[];
  /** Songs grouped under the timeline moment they belong to. */
  byMoment: { phaseId: string | null; phaseTitle: string; phaseTime: string | null; songs: SongProjection[] }[];
  counts: { total: number; scheduled: number; validated: number };
  hasData: boolean;
}

export function projectMusic(): MusicProjection {
  const songs: SongProjection[] = weddingStore.tracks.map((t) => {
    const phase = weddingStore.getPhaseForTrack(t.id);
    const media = projectMedia('song', t.id);
    return {
      songId: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      moment: t.moment,
      status: t.status,
      votes: t.votes,
      bpm: typeof t.bpm === 'number' ? t.bpm : null,
      phaseId: phase?.id ?? null,
      phaseTitle: phase ? stripLeadingTime(phase.name) : null,
      phaseTime: phase ? formatHour(phase.startHour) : null,
      media,
      coverSource: media.find((m) => m.kind === 'image')?.source ?? null,
    };
  });

  // Grouped in real timeline order.
  const phaseOrder = new Map(
    [...weddingStore.phases].sort((a, b) => a.startHour - b.startHour).map((p, i) => [p.id, i]),
  );
  const groups = new Map<string, SongProjection[]>();
  for (const s of songs) {
    const key = s.phaseId ?? '__unscheduled__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const byMoment = [...groups.entries()]
    .sort((a, b) => (phaseOrder.get(a[0]) ?? 999) - (phaseOrder.get(b[0]) ?? 999))
    .map(([key, list]) => ({
      phaseId: key === '__unscheduled__' ? null : key,
      phaseTitle: key === '__unscheduled__' ? 'Hors programme' : (list[0].phaseTitle ?? key),
      phaseTime: key === '__unscheduled__' ? null : list[0].phaseTime,
      songs: list,
    }));

  return {
    songs,
    byMoment,
    counts: {
      total: songs.length,
      scheduled: songs.filter((s) => s.phaseId).length,
      validated: songs.filter((s) => s.status === 'verified').length,
    },
    hasData: songs.length > 0,
  };
}

// --- Person relationships ---------------------------------------------------

export interface RelationshipProjection {
  relationshipId: string;
  kind: RelationshipKind;
  otherPersonId: string;
  otherName: string;
  note: string | null;
}

export function projectRelationships(personId: string): RelationshipProjection[] {
  return weddingStore.getRelationshipsFor(personId).map(({ relationship, otherPersonId }) => ({
    relationshipId: relationship.id,
    kind: relationship.kind,
    otherPersonId,
    otherName: weddingStore.getPerson(otherPersonId)?.displayName ?? otherPersonId,
    note: relationship.note ?? null,
  }));
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
  const vendors = projectVendors();
  const places = projectPlaces();
  const music = projectMusic();
  const mediaCount = weddingStore.media.length;

  return [
    { id: 'hero', label: 'Identité', available: hero.hasData },
    { id: 'programme', label: 'Programme', available: programme.hasData },
    { id: 'guests', label: 'Invités', available: guests.hasData },
    { id: 'vendors', label: 'Prestataires', available: vendors.hasData },
    { id: 'places', label: 'Lieux', available: places.hasData },
    { id: 'music', label: 'Musique', available: music.hasData },
    {
      id: 'story', label: 'Notre histoire', available: false,
      reason: 'Aucun champ de récit n’existe dans le modèle de données.',
    },
    {
      id: 'gallery', label: 'Galerie', available: mediaCount > 0,
      reason: mediaCount > 0 ? undefined
        : 'Aucun média n’a encore été ajouté. L’architecture Media existe et attend un premier fichier.',
    },
  ];
}

/** Everything a projection needs, derived in one pass. */
export interface WorldModelProjection {
  hero: HeroProjection;
  programme: ProgrammeProjection;
  guests: GuestsProjection;
  vendors: VendorsProjection;
  places: PlacesProjection;
  music: MusicProjection;
  gallery: MediaProjection[];
  availability: SectionAvailability[];
  /** Store version, so renderers can memoise on real mutations. */
  version: number;
}

export function projectWorldModel(): WorldModelProjection {
  return {
    hero: projectHero(),
    programme: projectProgramme(),
    guests: projectGuests(),
    vendors: projectVendors(),
    places: projectPlaces(),
    music: projectMusic(),
    // Every media in the project, whatever it is attached to.
    gallery: weddingStore.media.map((m) => ({
      mediaId: m.id, kind: m.kind, source: m.source,
      title: m.title ?? null, caption: m.caption ?? null,
    })),
    availability: projectAvailability(),
    version: weddingStore.version,
  };
}
