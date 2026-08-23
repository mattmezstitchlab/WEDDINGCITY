// ---------------------------------------------------------------------------
// Wedding City — First-order identity & domain entities.
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// --------------------
// Before this, "people" only existed as `Agent` — a SPATIAL object carrying a
// role, a 3D position and a mood. Everything identity-related was therefore
// derived from a role string or a display name:
//
//   - the connected user's avatar was matched by `agent.role === userIdentity.role`,
//     so two people sharing a role were literally the same person on screen;
//   - guests did not exist at all (no RSVP, no seating, no dietary owner);
//   - vendors existed only as static search results or as documents;
//   - playlist votes were a boolean ON THE TRACK, so one vote muted everyone;
//   - invitations were codes with no record and no lifecycle;
//   - permissions had nothing to attach to.
//
// THE MODEL
// ---------
//   UserAccount ──1:1──▶ Person ──0:1──▶ DMCIdentity
//        │                 │  ▲
//        │                 │  └── Agent (spatial projection, by agentId)
//        │                 ├──0:1──▶ Guest    (this person, at this wedding)
//        │                 └──0:1──▶ Vendor   (contact for a company)
//        └──1:N──▶ ProjectMembership ──▶ capabilities
//   Invitation ──▶ Guest / ProjectMembership
//
// `Agent` is deliberately NOT replaced: it remains the simulation/rendering
// representation. `Person` is the identity. They are linked by stable ids in
// both directions, so the 3D world keeps working untouched.
//
// RULE: relations use IDs. Never a role, never a display name.
// ---------------------------------------------------------------------------

import { AgentRole, DmcIdentity } from './wedding';

// --- Branded-ish id aliases: documentation value, zero runtime cost ---------
export type AccountId = string;
export type PersonId = string;
export type GuestId = string;
export type VendorId = string;
export type DmcIdentityId = string;
export type InvitationId = string;
export type MembershipId = string;
export type SeatingTableId = string;
export type ProjectId = string;
export type AgentId = string;

/** Where an entity came from — essential for auditing a migration. */
export type EntityOrigin =
  | 'demo_migration'   // derived from the pre-existing demo agents
  | 'manual'           // created through the UI
  | 'import'           // came from a file or connector
  | 'invitation'       // created when an invite was accepted
  | 'research';        // promoted from a web research result

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Person — the identity of a human being, independent of any role
// ---------------------------------------------------------------------------
export interface Person extends Timestamped {
  id: PersonId;
  displayName: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  /** Spatial projection in the simulated world, when this person has one. */
  agentId?: AgentId;
  /** Owned DMC identity (colour + symbol). */
  dmcIdentityId?: DmcIdentityId;
  /** Account this person signs in with, when they have one. */
  accountId?: AccountId;
  origin: EntityOrigin;
}

// ---------------------------------------------------------------------------
// UserAccount — credentials/session holder. Points at a Person.
// ---------------------------------------------------------------------------
export interface UserAccountV2 extends Timestamped {
  id: AccountId;
  email: string;
  /** The human behind the account. */
  personId: PersonId;
  /** Kept for backward compatibility with the legacy UserAccount shape. */
  legacyRole?: AgentRole;
  origin: EntityOrigin;
}

// ---------------------------------------------------------------------------
// DMCIdentity — now an entity owned by a Person, not a floating blob
// ---------------------------------------------------------------------------
export interface DmcIdentityRecord extends DmcIdentity, Timestamped {
  id: DmcIdentityId;
  ownerPersonId: PersonId;
}

// ---------------------------------------------------------------------------
// Guest — a Person invited to a specific project
// ---------------------------------------------------------------------------
export type RsvpStatus = 'pending' | 'accepted' | 'declined' | 'tentative';
export type WeddingSide = 'bride' | 'groom' | 'both' | 'unknown';

export interface Guest extends Timestamped {
  id: GuestId;
  projectId: ProjectId;
  personId: PersonId;
  rsvp: {
    status: RsvpStatus;
    respondedAt?: string;
    /** Additional people this guest brings. */
    plusOnes: number;
    note?: string;
  };
  seating: {
    tableId?: SeatingTableId;
    seatIndex?: number;
  };
  dietary?: string;
  side: WeddingSide;
  /** Invitation that produced this guest, when applicable. */
  invitationId?: InvitationId;
  origin: EntityOrigin;
}

export interface SeatingTable extends Timestamped {
  id: SeatingTableId;
  projectId: ProjectId;
  /** Human-facing number, e.g. "Table 4". */
  number: number;
  label: string;
  capacity: number;
  /** Where the table physically is. */
  placeId?: string;
  /** The 3D object representing it, when the venue has been furnished. */
  objectId?: string;
}

// ---------------------------------------------------------------------------
// Vendor — a company engaged on a project, with a contact Person
// ---------------------------------------------------------------------------
export type VendorCategory =
  | 'traiteur' | 'photographe' | 'dj' | 'fleuriste' | 'lieu'
  | 'robe' | 'transport' | 'musique' | 'voyage' | 'autre';

export type VendorStatus = 'prospect' | 'quoted' | 'contracted' | 'cancelled';

export interface Vendor extends Timestamped {
  id: VendorId;
  projectId: ProjectId;
  companyName: string;
  category: VendorCategory;
  status: VendorStatus;
  /** Who to talk to. */
  contactPersonId?: PersonId;
  /** Spatial projection, when the vendor is present in the world. */
  agentId?: AgentId;
  /** Relations, by id — never by name. */
  documentIds: string[];
  taskIds: string[];
  placeIds: string[];
  /** The web research result this vendor was promoted from, if any. */
  webVendorId?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  origin: EntityOrigin;
}

// ---------------------------------------------------------------------------
// Membership & capabilities — the anchor future permissions will attach to
// ---------------------------------------------------------------------------
export type MembershipRole = 'owner' | 'planner' | 'partner' | 'vendor' | 'guest' | 'viewer';

export type Capability =
  | 'project.edit'
  | 'budget.view'
  | 'budget.edit'
  | 'guests.view'
  | 'guests.edit'
  | 'vendors.view'
  | 'vendors.edit'
  | 'documents.view'
  | 'documents.edit'
  | 'tasks.edit'
  | 'playlist.vote'
  | 'playlist.manage'
  | 'invitations.manage'
  | 'ads.manage';

export interface ProjectMembership extends Timestamped {
  id: MembershipId;
  projectId: ProjectId;
  accountId: AccountId;
  personId: PersonId;
  role: MembershipRole;
  /** Resolved from the role at creation; stored so it can be overridden later. */
  capabilities: Capability[];
  invitationId?: InvitationId;
}

// ---------------------------------------------------------------------------
// Invitation — a real record with a lifecycle, not just a copied string
// ---------------------------------------------------------------------------
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invitation extends Timestamped {
  id: InvitationId;
  projectId: ProjectId;
  /** The shareable code embedded in the link. */
  code: string;
  role: MembershipRole;
  status: InvitationStatus;
  /** Pre-assigned guest, when inviting a specific person. */
  guestId?: GuestId;
  createdByAccountId?: AccountId;
  acceptedByAccountId?: AccountId;
  acceptedAt?: string;
  expiresAt?: string;
  /**
   * HONEST SCOPE. 'local' means the code can only be resolved in the browser
   * that created it — there is no server. Never presented as remote sharing.
   */
  scope: 'local' | 'remote';
}

// ---------------------------------------------------------------------------
// Playlist votes — per person, replacing the global boolean on the track
// ---------------------------------------------------------------------------
export interface TrackVote {
  trackId: string;
  personId: PersonId;
  votedAt: string;
}

// ---------------------------------------------------------------------------
// The identity slice of project state
// ---------------------------------------------------------------------------
export interface IdentityState {
  persons: Person[];
  accounts: UserAccountV2[];
  dmcIdentities: DmcIdentityRecord[];
  guests: Guest[];
  vendors: Vendor[];
  seatingTables: SeatingTable[];
  memberships: ProjectMembership[];
  invitations: Invitation[];
  trackVotes: TrackVote[];
  /** The person the current session acts as. Replaces role-based matching. */
  currentPersonId: PersonId | null;
}
