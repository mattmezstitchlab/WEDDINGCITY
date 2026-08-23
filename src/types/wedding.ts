export type EntityType = 'agent' | 'place' | 'document' | 'task' | 'phase' | 'conflict' | 'route' | 'track' | 'object' | 'venue' | 'web_vendor' | 'connector' | 'ad_slot';

export type AgentRole =
  | 'bride'
  | 'groom'
  | 'wedding_planner'
  | 'photographer'
  | 'videographer'
  | 'dj'
  | 'caterer'
  | 'chef'
  | 'server'
  | 'florist'
  | 'driver'
  | 'musician'
  | 'witness'
  | 'family'
  | 'guest';

export type WeddingMoment = 'ceremonie' | 'cocktail' | 'repas' | 'premiere_danse' | 'soiree';
export type TrackStatus = 'bride_groom' | 'verified' | 'pending';
export type VerificationLevel = 'verified_public' | 'claimed_vendor' | 'ai_estimated' | 'wedding_internal';

export type WorldType =
  | 'wedding'
  | 'travel'
  | 'event'
  | 'concert'
  | 'production'
  | 'business'
  | 'personal'
  | 'family'
  | 'ngo'
  | 'group_trip'
  | 'custom';

export type ConnectorServiceId =
  | 'google_calendar'
  | 'google_drive'
  | 'gmail'
  | 'google_contacts'
  | 'google_photos'
  | 'google_maps'
  | 'outlook'
  | 'onedrive'
  | 'dropbox'
  | 'spotify'
  | 'web_research';

export type ConnectorStatus = 'disconnected' | 'connected' | 'auth_required' | 'syncing' | 'error';
export type DataSourceOrigin = 'USER' | 'GOOGLE_CALENDAR' | 'GOOGLE_DRIVE' | 'GMAIL' | 'SPOTIFY' | 'WEB' | 'PRESTATAIRE' | 'WEDDING_CITY' | 'AI';

// DMC ID Palette & Symbol Definitions
export interface DmcColor {
  code: string;
  name: string;
  hex: string;
  family: 'doré' | 'neutre' | 'noir' | 'bleu' | 'vert' | 'terracotta' | 'pourpre' | 'gris';
}

export interface DmcSymbol {
  id: string;
  name: string;
  glyph: string;
  meaning: string;
}

export interface DmcIdentity {
  dmcCode: string;
  dmcName: string;
  dmcColor: string;
  symbolId: string;
  symbolGlyph: string;
  symbolName: string;
  customBadgeText?: string;
}

// Advertising Grid 3D Slots & Campaigns
export type AdSlotType = 'billboard_3d' | 'led_totem' | 'shop_window' | 'banner_truss';
export type AdContentCategory = 'wedding_program' | 'vendor_showcase' | 'sponsor_official' | 'photo_contest' | 'menu_announcement';

export interface AdDisplaySlot {
  id: string;
  title: string;
  slotType: AdSlotType;
  pos: [number, number, number];
  rotY: number;
  size: [number, number];
  locationZone: string;
  currentCampaign: {
    id: string;
    title: string;
    subtitle: string;
    category: AdContentCategory;
    isSponsored: boolean;
    sponsorName?: string;
    advertiserName: string;
    ctaText: string;
    targetPlaceId?: string;
    themeColor: string;
    badgeLabel: string;
  };
  isClaimed: boolean;
  claimedByVendorId?: string;
}

export interface ConnectorEntity {
  id: ConnectorServiceId;
  name: string;
  category: 'calendar' | 'storage' | 'email' | 'contacts' | 'music' | 'maps' | 'web';
  provider: 'google' | 'microsoft' | 'dropbox' | 'spotify' | 'web';
  status: ConnectorStatus;
  icon: string;
  description: string;
  scopes: string[];
  lastSyncAt?: string;
  detectedItemsCount?: number;
  detectedSummary?: string;
  syncedItemIds: string[];
  sourceLabel: DataSourceOrigin;
  hasPendingChanges?: boolean;
  pendingChangeMessage?: string;
}

export interface ExternalSyncItem {
  id: string;
  connectorId: ConnectorServiceId;
  title: string;
  type: 'event' | 'file' | 'email' | 'contact' | 'track' | 'photo';
  dateOrAmount?: string;
  senderOrLocation?: string;
  sourceSnippet: string;
  status: 'ready_to_import' | 'imported' | 'modified_external';
  impactDescription?: string;
}

export interface WorldArchetype {
  id: WorldType;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  description: string;
  samplePrompt: string;
  defaultLocation: string;
  defaultBudget: number;
  activeModules: string[];
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: AgentRole;
  createdAt: string;
}

export interface WeddingProject {
  id: string;
  title: string;
  worldType: WorldType;
  coupleNames: string;
  weddingDate: string;
  locationName: string;
  budgetTarget: number;
  guestCountTarget: number;
  ownerId: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  inviteCode: string;
  themeColor?: string;
}

export interface WebVendorResult {
  id: string;
  name: string;
  category: 'traiteur' | 'photographe' | 'dj' | 'fleuriste' | 'lieu' | 'robe' | 'transport' | 'musique' | 'voyage' | 'autre';
  rating: number;
  reviewCount: number;
  location: string;
  distanceKm?: number;
  priceStartingFrom?: number;
  priceLevel: '€' | '€€' | '€€€' | '€€€€';
  services: string[];
  websiteUrl: string;
  phone?: string;
  email?: string;
  source: string;
  verification: VerificationLevel;
  isClaimed: boolean;
  claimedBusinessName?: string;
  description: string;
  photoSnippet?: string;
  suggestedForPlaceId?: string;
}

export interface HoneymoonDestination {
  id: string;
  title: string;
  country: string;
  bestSeason: string;
  flightDuration: string;
  budgetRange: string;
  highlights: string[];
  source: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionButtons?: { label: string; actionType: 'teleport' | 'search' | 'add_vendor' | 'fix_conflict'; targetId?: string }[];
  detectedIntent?: string;
}

export interface TrackEntity {
  id: string;
  title: string;
  artist: string;
  moment: WeddingMoment;
  status: TrackStatus;
  bpm: number;
  energy: number;
  duration: string;
  suggestedBy: string;
  note?: string;
  votes: number;
  hasVoted?: boolean;
  sourceOrigin?: DataSourceOrigin;
}

export interface UserIdentity {
  role: AgentRole;
  name: string;
  roleTitle: string;
  outfitColor: string;
  accessory: string;
  avatarIcon: string;
  isCreated: boolean;
  dmc?: DmcIdentity;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  title: string;
  avatarIcon: string;
  avatarColor: string;
  currentPos: [number, number, number];
  targetPos: [number, number, number];
  speed: number;
  rotation: number;
  assignedPlaceId: string;
  assignedTable?: number;
  assignedObjectId?: string;
  phone?: string;
  dietary?: string;
  arrivalHour: number;
  departureHour: number;
  mood: number;
  thoughtText?: string;
  isConflict?: boolean;
  conflictReason?: string;
  sourceOrigin?: DataSourceOrigin;
  connectedDocIds: string[];
  connectedTaskIds: string[];
  connectedAgentIds: string[];
  connectedPlaceIds: string[];
}

export interface VenueZone {
  id: string;
  name: string;
  type: 'hall' | 'dining' | 'bar' | 'dancefloor' | 'stage' | 'kitchen' | 'terrace' | 'dressing';
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  capacity: number;
  description: string;
}

export interface PlacedObject {
  id: string;
  name: string;
  category: 'table' | 'chair' | 'bar' | 'stage' | 'arch' | 'lounge' | 'speaker' | 'light' | 'decor';
  pos: [number, number, number];
  rotY: number;
  scale: number;
  venueId: string;
  zoneId?: string;
  assignedAgentIds?: string[];
  tableCapacity?: number;
  color?: string;
}

export interface ReconstructedVenue {
  id: string;
  name: string;
  style: 'chateau' | 'grange' | 'verriere' | 'jardin' | 'moderne';
  confidenceScore: number;
  photoUrl?: string;
  detectedElements: {
    walls: string;
    doors: number;
    windows: number;
    tables: number;
    lighting: string;
    flooring: string;
    ceiling: string;
    stage: boolean;
    bar: boolean;
    dancefloor: boolean;
  };
  zones: VenueZone[];
  objects: PlacedObject[];
  createdAt: string;
}

export interface Place {
  id: string;
  name: string;
  code: string;
  zone: 'mairie' | 'manoir' | 'ceremonie' | 'cocktail' | 'reception' | 'dancefloor' | 'parking';
  pos: [number, number, number];
  gpsCoordinates: string;
  capacity: number;
  currentPax: number;
  description: string;
  icon: string;
  themeColor: string;
  activeFromHour: number;
  activeToHour: number;
  isInteriorExplorable?: boolean;
  reconstructedVenueId?: string;
  interiorBounds?: { width: number; depth: number; height: number };
  connectedAgentIds: string[];
  connectedDocIds: string[];
  connectedTaskIds: string[];
}

export interface TransitVehicle {
  id: string;
  name: string;
  type: 'wedding_car' | 'shuttle_bus' | 'catering_truck';
  pos: [number, number, number];
  targetPos: [number, number, number];
  rotation: number;
  speed: number;
  color: string;
  status: string;
}

export interface DocumentEntity {
  id: string;
  title: string;
  category: 'devis' | 'facture' | 'contrat' | 'plan_table' | 'sms' | 'note' | 'planning';
  fileName: string;
  amount?: number;
  depositAmount?: number;
  isPaid?: boolean;
  rawTextExcerpt: string;
  extractedDate?: string;
  extractedHour?: string;
  sourceOrigin?: DataSourceOrigin;
  connectedAgentIds: string[];
  connectedPlaceIds: string[];
  connectedTaskIds: string[];
  createdAtHour: number;
}

export interface TaskEntity {
  id: string;
  title: string;
  category: 'logistique' | 'paiement' | 'prestataire' | 'ceremonie' | 'animation';
  dueHour: number;
  isDone: boolean;
  urgent: boolean;
  cost?: number;
  assignedAgentId?: string;
  assignedPlaceId?: string;
  sourceOrigin?: DataSourceOrigin;
  connectedDocIds: string[];
  connectedAgentIds: string[];
}

export interface ConflictEntity {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  sourceEntityId: string;
  impactedEntityIds: string[];
  suggestedSolution: string;
  isResolved: boolean;
  impactCategory: 'horaire' | 'budget' | 'logistique' | 'meteo';
}

export interface TimelinePhase {
  id: string;
  startHour: number;
  endHour: number;
  name: string;
  subtitle: string;
  icon: string;
  primaryPlaceId: string;
  highlightAction: string;
  bgAtmosphere: 'morning' | 'afternoon' | 'golden' | 'dusk' | 'night';
  keyAgentIds: string[];
  keyDocIds: string[];
  keyTaskIds: string[];
  ambientTrack: 'prep' | 'ceremony' | 'jazz' | 'dinner' | 'party';
}

export interface NeuralPulse {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  progress: number;
  color: string;
  speed: number;
}

export interface GridWave {
  id: string;
  center: [number, number, number];
  radius: number;
  maxRadius: number;
  color: string;
  speed: number;
  strength: number;
}

export interface ImportPresetFile {
  id: string;
  name: string;
  icon: string;
  size: string;
  type: string;
  label: string;
  description: string;
  previewSnippet: string;
  extractedSummary: {
    agentsCount: number;
    tasksCount: number;
    docsCount: number;
    budget: number;
    conflictsFound: number;
  };
}
