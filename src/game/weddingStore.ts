import {
  Agent,
  AgentRole,
  Place,
  DocumentEntity,
  TaskEntity,
  ConflictEntity,
  TimelinePhase,
  TimelineScenario,
  GridWave,
  NeuralPulse,
  ImportPresetFile,
  UserIdentity,
  TransitVehicle,
  TrackEntity,
  WeddingMoment,
  UserAccount,
  WeddingProject,
  WorldType,
  ReconstructedVenue,
  PlacedObject,
  DmcIdentity,
  AdDisplaySlot,
} from '../types/wedding';
import { generateWorldFromDescription } from './worldEngine';
import type { IntakePlan } from './projectIntake';
import { DEFAULT_DMC_IDENTITY } from './dmcPalette';
import { INITIAL_AD_SLOTS } from './advertisingEngine';
import { weddingAudio } from './audio';
import {
  hasChosenProject,
  getStoredProjects,
  saveWeddingProject,
  getActiveProjectId,
  setActiveProjectId,
  clearActiveProjectId,
  savePersistedState,
  loadPersistedState,
  getActiveAccount,
  saveUserAccount,
  logoutUser,
  getStoredAccounts,
} from './persistence';

// Apple Vision Pro & Spatial Design System Constants.
// Values now live in ./brand (dependency-free) to avoid the module cycle that
// crashed startup. Re-exported here so every existing import keeps working.
import { BRAND_ACCENT } from './brand';

/** The six editorial sections, shared by the Mirror and the Canvas. */
export type CanvasSection = 'programme' | 'people' | 'vendors' | 'places' | 'music' | 'media';
import { PlaceKind } from '../types/wedding';
import {
  Person,
  PersonCraft, UserAccountV2, DmcIdentityRecord, Guest, Vendor, SeatingTable,
  ProjectMembership, Invitation, TrackVote, Capability, MembershipRole, RsvpStatus,
  MediaAsset, MediaKind, MediaOwnerKind, MediaProvenance, EntityOrigin,
  PersonRelationship, RelationshipKind,
} from '../types/identity';
import {
  migrateIdentityModel, MigrationReport, emptyIdentityState, capabilitiesForRole,
  membershipRoleForAgentRole, personIdForAgent, guestIdForPerson, createGuestFromAgent,
  createSeatingTable, createInvitation, createMembership, createAccount, createDmcRecord,
  dmcIdForPerson, tableIdForNumber, freshId, invitationIdForCode,
} from './identityModel';
import { reportDiagnostic } from './diagnostics';
import {
  PersistedDomainState,
  serializeDomain,
  applyDomain,
} from './persistenceSchema';
export {
  BRAND_ACCENT,
  BRAND_BG,
  BRAND_SURFACE,
  BRAND_SURFACE_HOVER,
  BRAND_BORDER,
  BRAND_BORDER_ACTIVE,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from './brand';

// Initial Reconstructed Venues
export const INITIAL_RECONSTRUCTED_VENUES: ReconstructedVenue[] = [
  {
    id: 'venue_orangerie',
    name: 'Grand Pavillon Orangerie & Banquet',
    style: 'verriere',
    confidenceScore: 91,
    detectedElements: {
      walls: 'Acier noir & verre trempé',
      doors: 4,
      windows: 16,
      tables: 10,
      lighting: 'Lustres en laiton & lanternes de table',
      flooring: 'Parquet en chêne massif blanchi',
      ceiling: 'Verrière panoramique voûtée',
      stage: true,
      bar: true,
      dancefloor: true,
    },
    zones: [
      { id: 'zone_hall_banquet', name: 'Grand Hall des Tables', type: 'dining', bounds: { minX: -14, maxX: 14, minZ: -10, maxZ: 10 }, capacity: 120, description: 'Espace principal du dîner 3 plats' },
      { id: 'zone_bar_lounge', name: 'Espace Bar & Dégustation', type: 'bar', bounds: { minX: -14, maxX: -4, minZ: -12, maxZ: -6 }, capacity: 30, description: 'Bar en marbre et tabourets hauts' },
      { id: 'zone_stage_discours', name: 'Scène Scénographique & Micro', type: 'stage', bounds: { minX: -4, maxX: 4, minZ: -14, maxZ: -10 }, capacity: 15, description: 'Scène des discours des témoins' },
      { id: 'zone_kitchen_back', name: 'Office Traiteur & Cuisine Chef', type: 'kitchen', bounds: { minX: 8, maxX: 14, minZ: -14, maxZ: -8 }, capacity: 10, description: 'Préparation et dressage gastronomique' },
      { id: 'zone_terrace_ext', name: 'Terrasse d’Honneur & Vue Parc', type: 'terrace', bounds: { minX: -14, maxX: 14, minZ: 10, maxZ: 16 }, capacity: 50, description: 'Accès extérieur avec vue sur les fontaines' },
    ],
    objects: [
      { id: 'obj_head_table', name: 'Table d’Honneur des Mariés', category: 'table', pos: [0, 0, -6], rotY: 0, scale: 1.2, venueId: 'venue_orangerie', zoneId: 'zone_hall_banquet', tableCapacity: 8 },
      { id: 'obj_round_t1', name: 'Table 1 • Famille Proche', category: 'table', pos: [-6, 0, -2], rotY: 0, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_hall_banquet', tableCapacity: 10 },
      { id: 'obj_round_t2', name: 'Table 2 • Témoins & Amis', category: 'table', pos: [0, 0, -1], rotY: 0, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_hall_banquet', tableCapacity: 10 },
      { id: 'obj_round_t3', name: 'Table 3 • Amis Fac', category: 'table', pos: [6, 0, -2], rotY: 0, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_hall_banquet', tableCapacity: 10 },
      { id: 'obj_round_t4', name: 'Table 4 • Collègues', category: 'table', pos: [-6, 0, 4], rotY: 0, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_hall_banquet', tableCapacity: 10 },
      { id: 'obj_round_t5', name: 'Table 5 • Amis Enfance', category: 'table', pos: [0, 0, 5], rotY: 0, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_hall_banquet', tableCapacity: 10 },
      { id: 'obj_round_t6', name: 'Table 6 • Famille Éloignée', category: 'table', pos: [6, 0, 4], rotY: 0, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_hall_banquet', tableCapacity: 10 },
      { id: 'obj_bar_counter', name: 'Bar en Marbre Noir & Laiton', category: 'bar', pos: [-9, 0, -10], rotY: Math.PI / 4, scale: 1.1, venueId: 'venue_orangerie', zoneId: 'zone_bar_lounge' },
      { id: 'obj_stage_platform', name: 'Scène surélevée & Pupitre', category: 'stage', pos: [0, 0, -11], rotY: 0, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_stage_discours' },
      { id: 'obj_lounge_sofa_1', name: 'Canapé en Velours Vert Sauge', category: 'lounge', pos: [-10, 0, 2], rotY: Math.PI / 2, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_bar_lounge' },
      { id: 'obj_lounge_sofa_2', name: 'Canapé en Velours Terracotta', category: 'lounge', pos: [10, 0, 2], rotY: -Math.PI / 2, scale: 1.0, venueId: 'venue_orangerie', zoneId: 'zone_bar_lounge' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'venue_manoir',
    name: 'Château d’Honneur & Loges Nuptiales',
    style: 'chateau',
    confidenceScore: 94,
    detectedElements: {
      walls: 'Pierre de taille calcaire XVIIIe',
      doors: 6,
      windows: 12,
      tables: 3,
      lighting: 'Lustres en cristal de Bohème & appliques',
      flooring: 'Dalles de pierre & tapis de Perse',
      ceiling: 'Moulures et rosaces classiques',
      stage: false,
      bar: false,
      dancefloor: false,
    },
    zones: [
      { id: 'zone_manoir_salon', name: 'Grand Salon d’Honneur', type: 'hall', bounds: { minX: -10, maxX: 10, minZ: -8, maxZ: 8 }, capacity: 35, description: 'Cheminée d’époque et préparatifs' },
      { id: 'zone_manoir_dressing', name: 'Dressing & Coiffure Mariée', type: 'dressing', bounds: { minX: -10, maxX: -2, minZ: -14, maxZ: -8 }, capacity: 10, description: 'Salon de maquillage et habillage' },
      { id: 'zone_manoir_temoins', name: 'Salon Privé des Témoins', type: 'dressing', bounds: { minX: 2, maxX: 10, minZ: -14, maxZ: -8 }, capacity: 12, description: 'Dégustation champagne et nœuds papillon' },
    ],
    objects: [
      { id: 'obj_manoir_table', name: 'Table Centrale de Réunion Planning', category: 'table', pos: [0, 0, 0], rotY: 0, scale: 1.0, venueId: 'venue_manoir', zoneId: 'zone_manoir_salon', tableCapacity: 8 },
      { id: 'obj_manoir_sofa_1', name: 'Fauteuil Crapaud Doré', category: 'lounge', pos: [-5, 0, 0], rotY: Math.PI / 2, scale: 1.0, venueId: 'venue_manoir', zoneId: 'zone_manoir_salon' },
      { id: 'obj_manoir_sofa_2', name: 'Méridienne Classique', category: 'lounge', pos: [5, 0, 0], rotY: -Math.PI / 2, scale: 1.0, venueId: 'venue_manoir', zoneId: 'zone_manoir_salon' },
    ],
    createdAt: new Date().toISOString(),
  },
];

// Initial Collaborative Wedding Tracks
export const INITIAL_TRACKS: TrackEntity[] = [
  {
    id: 'track_lover',
    title: 'Lover',
    artist: 'Taylor Swift',
    moment: 'premiere_danse',
    status: 'bride_groom',
    bpm: 68,
    energy: 3,
    duration: '3:41',
    suggestedBy: 'Clara & Alexandre',
    note: 'Ouverture officielle du bal',
    votes: 38,
  },
  {
    id: 'track_september',
    title: 'September',
    artist: 'Earth, Wind & Fire',
    moment: 'soiree',
    status: 'bride_groom',
    bpm: 126,
    energy: 5,
    duration: '3:35',
    suggestedBy: 'Clara & Alexandre',
    note: 'Incontournable pour chauffer le dancefloor',
    votes: 42,
  },
  {
    id: 'track_daft_punk',
    title: 'One More Time',
    artist: 'Daft Punk',
    moment: 'soiree',
    status: 'verified',
    bpm: 128,
    energy: 5,
    duration: '5:20',
    suggestedBy: 'Thomas (Témoin)',
    note: 'À passer au pic de la nuit !',
    votes: 27,
  },
  {
    id: 'track_stevie',
    title: 'Signed, Sealed, Delivered',
    artist: 'Stevie Wonder',
    moment: 'ceremonie',
    status: 'bride_groom',
    bpm: 109,
    energy: 4,
    duration: '2:40',
    suggestedBy: 'Alexandre (Le Marié)',
    note: 'Sortie d’honneur après le grand oui',
    votes: 29,
  },
  {
    id: 'track_chet_baker',
    title: 'My Funny Valentine',
    artist: 'Chet Baker',
    moment: 'cocktail',
    status: 'verified',
    bpm: 84,
    energy: 2,
    duration: '2:18',
    suggestedBy: 'Sophie (Wedding Planner)',
    note: 'Ambiance jazz feutrée au belvédère',
    votes: 19,
  },
  {
    id: 'track_bill_withers',
    title: 'Lovely Day',
    artist: 'Bill Withers',
    moment: 'cocktail',
    status: 'verified',
    bpm: 98,
    energy: 3,
    duration: '4:15',
    suggestedBy: 'Emma (Invitée)',
    note: 'Parfait pour le vin d’honneur en terrasse',
    votes: 24,
  },
  {
    id: 'track_grover',
    title: 'Just the Two of Us',
    artist: 'Grover Washington Jr.',
    moment: 'repas',
    status: 'verified',
    bpm: 96,
    energy: 3,
    duration: '3:58',
    suggestedBy: 'Julien (Photographe)',
    note: 'Fond musical doux pour le dîner gastronomique',
    votes: 21,
  },
  {
    id: 'track_dua_lipa',
    title: 'Levitating',
    artist: 'Dua Lipa',
    moment: 'soiree',
    status: 'pending',
    bpm: 103,
    energy: 4,
    duration: '3:23',
    suggestedBy: 'Lucas (Invité)',
    note: 'Grosse énergie pour la fête',
    votes: 14,
  },
  {
    id: 'track_blinding_lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    moment: 'soiree',
    status: 'pending',
    bpm: 171,
    energy: 5,
    duration: '3:20',
    suggestedBy: 'Camille (Invitée)',
    note: 'Pour danser tous ensemble',
    votes: 11,
  },
  {
    id: 'track_pachelbel',
    title: 'Canon in D (Violon & Quatuor)',
    artist: 'Johann Pachelbel',
    moment: 'ceremonie',
    status: 'bride_groom',
    bpm: 72,
    energy: 2,
    duration: '4:30',
    suggestedBy: 'Clara (La Mariée)',
    note: 'Entrée majestueuse de la mariée dans l’allée',
    votes: 35,
  },
];

// 12 Geolocated Regional Wedding Hubs
export const INITIAL_PLACES: Place[] = [
  {
    id: 'place_mairie',
    name: 'Hôtel de Ville & Cérémonie Civile',
    code: 'MAIRIE',
    zone: 'mairie',
    pos: [-42, 0, 28],
    gpsCoordinates: '48.8566° N, 2.3522° E',
    capacity: 80,
    currentPax: 6,
    description: 'Hôtel de Ville historique, salle des mariages républicains et parvis pavé d’honneur.',
    icon: 'mairie',
    themeColor: '#e2b448',
    activeFromHour: 13.5,
    activeToHour: 15.2,
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_witness_1', 'agent_driver'],
    connectedDocIds: ['doc_declaration_mairie', 'doc_planning_master'],
    connectedTaskIds: ['task_signature_registre', 'task_depart_cortege'],
  },
  {
    id: 'place_parking',
    name: 'Hub Gare TGV & Parking Cortège',
    code: 'GARE / PARKING',
    zone: 'parking',
    pos: [-42, 0, 10],
    gpsCoordinates: '48.8512° N, 2.3480° E',
    capacity: 120,
    currentPax: 18,
    description: 'Point de ralliement des navettes VIP, berline décapotable des mariés et stationnement.',
    icon: 'transport',
    themeColor: '#94a3b8',
    activeFromHour: 13.0,
    activeToHour: 16.0,
    connectedAgentIds: ['agent_driver', 'agent_planner'],
    connectedDocIds: ['doc_transport_navettes'],
    connectedTaskIds: ['task_accueil_navettes', 'task_dechargement_fleurs'],
  },
  {
    id: 'place_hotel',
    name: 'Hôtel des Invités & Suites VIP',
    code: 'HÔTEL & LODGES',
    zone: 'parking',
    pos: [-42, 0, -10],
    gpsCoordinates: '48.8530° N, 2.3500° E',
    capacity: 90,
    currentPax: 22,
    description: 'Boutique hôtel du domaine, hébergement des familles proches et suites de repos.',
    icon: 'hotel',
    themeColor: '#e2b448',
    activeFromHour: 10.0,
    activeToHour: 27.0,
    connectedAgentIds: ['agent_witness_1', 'agent_planner'],
    connectedDocIds: ['doc_transport_navettes'],
    connectedTaskIds: ['task_accueil_navettes'],
  },
  {
    id: 'place_chapelle',
    name: 'Chapelle Historique & Oliviers',
    code: 'CHAPELLE',
    zone: 'ceremonie',
    pos: [-28, 0, -22],
    gpsCoordinates: '48.8590° N, 2.3560° E',
    capacity: 60,
    currentPax: 0,
    description: 'Chapelle romane en pierre de taille, vitraux d’époque et parvis sous les oliviers.',
    icon: 'chapelle',
    themeColor: '#e2b448',
    activeFromHour: 12.0,
    activeToHour: 16.0,
    connectedAgentIds: ['agent_musician_1', 'agent_bride'],
    connectedDocIds: ['doc_planning_master'],
    connectedTaskIds: ['task_habillage_mariee'],
  },
  {
    id: 'place_manoir',
    name: 'Manoir d’Honneur & Loges Nuptiales',
    code: 'DOMAINE PRIVÉ',
    zone: 'manoir',
    pos: [-12, 0, -22],
    gpsCoordinates: '48.8620° N, 2.3610° E',
    capacity: 40,
    currentPax: 4,
    description: 'Château en pierre de taille, salon de coiffure / habillage et loges de préparation.',
    icon: 'manoir',
    themeColor: '#e2b448',
    activeFromHour: 10.0,
    activeToHour: 14.5,
    isInteriorExplorable: true,
    reconstructedVenueId: 'venue_manoir',
    interiorBounds: { width: 22, depth: 18, height: 7 },
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_planner', 'agent_florist'],
    connectedDocIds: ['doc_planning_master', 'doc_contrat_domaine'],
    connectedTaskIds: ['task_habillage_mariee', 'task_check_coiffure'],
  },
  {
    id: 'place_serre',
    name: 'Atelier Floral & Serre Botanique',
    code: 'ATELIER FLORAL',
    zone: 'manoir',
    pos: [-2, 0, -32],
    gpsCoordinates: '48.8635° N, 2.3625° E',
    capacity: 20,
    currentPax: 2,
    description: 'Serre horticole, composition des bouquets d’eucalyptus et centres de table.',
    icon: 'florist',
    themeColor: '#94a3b8',
    activeFromHour: 9.0,
    activeToHour: 15.0,
    connectedAgentIds: ['agent_florist'],
    connectedDocIds: ['doc_contrat_fleuriste'],
    connectedTaskIds: ['task_dechargement_fleurs'],
  },
  {
    id: 'place_ceremonie',
    name: 'Grand Parc & Allée Laïque',
    code: 'CÉRÉMONIE LAÏQUE',
    zone: 'ceremonie',
    pos: [-12, 0, 6],
    gpsCoordinates: '48.8645° N, 2.3640° E',
    capacity: 150,
    currentPax: 0,
    description: 'Allée d’honneur centrale en lin blanc, 120 chaises en chêne et arche d’eucalyptus.',
    icon: 'ceremonie',
    themeColor: '#e2b448',
    activeFromHour: 15.0,
    activeToHour: 17.0,
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_photographer', 'agent_videographer', 'agent_musician_1'],
    connectedDocIds: ['doc_voeux_maries', 'doc_contrat_photo'],
    connectedTaskIds: ['task_echange_alliances', 'task_lancer_petales'],
  },
  {
    id: 'place_cocktail',
    name: 'Belvédère & Fontaine Royale',
    code: 'COCKTAIL & JARDINS',
    zone: 'cocktail',
    pos: [10, 0, 8],
    gpsCoordinates: '48.8655° N, 2.3685° E',
    capacity: 160,
    currentPax: 0,
    description: 'Fontaine sculptée, tentes nomades en lin tendu, bar à cocktails et jazz lounge.',
    icon: 'cocktail',
    themeColor: '#e2b448',
    activeFromHour: 16.5,
    activeToHour: 19.5,
    connectedAgentIds: ['agent_caterer_lead', 'agent_photographer', 'agent_dj', 'agent_planner'],
    connectedDocIds: ['doc_devis_traiteur', 'doc_contrat_fleuriste'],
    connectedTaskIds: ['task_ouverture_buffet', 'task_photos_famille', 'task_payer_acompte_traiteur'],
  },
  {
    id: 'place_photo_spot',
    name: 'Studio Photo & Spot Golden Hour',
    code: 'SPOT PHOTO',
    zone: 'cocktail',
    pos: [24, 0, 28],
    gpsCoordinates: '48.8675° N, 2.3710° E',
    capacity: 30,
    currentPax: 0,
    description: 'Belvédère panoramique dominant le domaine pour les séances de couple au coucher du soleil.',
    icon: 'photo',
    themeColor: '#e2b448',
    activeFromHour: 18.0,
    activeToHour: 20.5,
    connectedAgentIds: ['agent_photographer', 'agent_bride', 'agent_groom', 'agent_videographer'],
    connectedDocIds: ['doc_contrat_photo'],
    connectedTaskIds: ['task_photos_famille'],
  },
  {
    id: 'place_reception',
    name: 'Grand Pavillon Orangerie & Banquet',
    code: 'GRAND BANQUET',
    zone: 'reception',
    pos: [32, 0, -12],
    gpsCoordinates: '48.8670° N, 2.3720° E',
    capacity: 140,
    currentPax: 0,
    description: 'Verrière contemporaine en acier noir et verre, 10 tables rondes dressées et cuisine gastronomique.',
    icon: 'banquet',
    themeColor: '#e2b448',
    activeFromHour: 19.2,
    activeToHour: 23.0,
    isInteriorExplorable: true,
    reconstructedVenueId: 'venue_orangerie',
    interiorBounds: { width: 30, depth: 22, height: 8 },
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_caterer_lead', 'agent_witness_1', 'agent_planner'],
    connectedDocIds: ['doc_plan_tables', 'doc_menu_degustation', 'doc_devis_traiteur'],
    connectedTaskIds: ['task_service_plat_chaud', 'task_discours_temoins', 'task_decoupe_gateau'],
  },
  {
    id: 'place_dancefloor',
    name: 'Piste Clubbing, Scène DJ & Pyrotechnie',
    code: 'DANCEFLOOR / CLUB',
    zone: 'dancefloor',
    pos: [14, 0, -32],
    gpsCoordinates: '48.8685° N, 2.3750° E',
    capacity: 150,
    currentPax: 0,
    description: 'Piste en ardoise sombre, régie acoustique SoundWave 4000W, lyres beam et étincelles.',
    icon: 'dancefloor',
    themeColor: '#e2b448',
    activeFromHour: 22.0,
    activeToHour: 27.0,
    connectedAgentIds: ['agent_dj', 'agent_bride', 'agent_groom', 'agent_photographer'],
    connectedDocIds: ['doc_contrat_dj', 'doc_playlist_premiere_danse'],
    connectedTaskIds: ['task_ouverture_bal', 'task_lancer_confettis'],
  },
  {
    id: 'place_brunch',
    name: 'Espace Brunch & Lounge du Lendemain',
    code: 'BRUNCH DU LENDEMAIN',
    zone: 'cocktail',
    pos: [32, 0, 18],
    gpsCoordinates: '48.8690° N, 2.3770° E',
    capacity: 100,
    currentPax: 0,
    description: 'Terrasse ensoleillée, bar à café de spécialité, food truck gourmet et salon d’extérieur.',
    icon: 'brunch',
    themeColor: '#e2b448',
    activeFromHour: 10.0,
    activeToHour: 16.0,
    connectedAgentIds: ['agent_caterer_lead', 'agent_planner'],
    connectedDocIds: ['doc_planning_master'],
    connectedTaskIds: ['task_ouverture_buffet'],
  },
];

// Moving Transit Vehicles
export const INITIAL_VEHICLES: TransitVehicle[] = [
  {
    id: 'veh_roadster',
    name: 'Berline Jaguar Vintage (Mariés)',
    type: 'wedding_car',
    pos: [-42, 0, 28],
    targetPos: [-12, 0, 6],
    rotation: 0,
    speed: 6.5,
    color: '#e2b448',
    status: 'Transfert Mairie → Domaine',
  },
  {
    id: 'veh_shuttle_1',
    name: 'Navette VIP Invités #1',
    type: 'shuttle_bus',
    pos: [-42, 0, 10],
    targetPos: [-12, 0, 6],
    rotation: 0,
    speed: 5.0,
    color: '#334155',
    status: 'Transfert Gare TGV → Cérémonie',
  },
  {
    id: 'veh_truck_catering',
    name: 'Camion Logistique Traiteur',
    type: 'catering_truck',
    pos: [32, 0, 0],
    targetPos: [32, 0, -12],
    rotation: 0,
    speed: 4.0,
    color: '#1e293b',
    status: 'Approvisionnement cuisine gastronomique',
  },
];

// Initial Agents
export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'agent_bride',
    name: 'Clara Dubois',
    role: 'bride',
    title: 'La Mariée',
    avatarIcon: '👰',
    avatarColor: '#f8fafc',
    currentPos: [-12, 0, 6],
    targetPos: [-12, 0, 6],
    speed: 3.2,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    phone: '+33 6 12 34 56 78',
    arrivalHour: 10.0,
    departureHour: 27.0,
    mood: 96,
    thoughtText: 'La scénographie et la musique sont synchronisées.',
    connectedDocIds: ['doc_planning_master', 'doc_voeux_maries', 'doc_plan_tables'],
    connectedTaskIds: ['task_habillage_mariee', 'task_echange_alliances', 'task_ouverture_bal'],
    connectedAgentIds: ['agent_groom', 'agent_planner', 'agent_photographer', 'agent_witness_1'],
    connectedPlaceIds: ['place_mairie', 'place_manoir', 'place_ceremonie', 'place_cocktail', 'place_reception', 'place_dancefloor'],
  },
  {
    id: 'agent_groom',
    name: 'Alexandre Meyer',
    role: 'groom',
    title: 'Le Marié',
    avatarIcon: '🤵',
    avatarColor: '#1e293b',
    currentPos: [-11.5, 0, 6],
    targetPos: [-11.5, 0, 6],
    speed: 3.2,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    phone: '+33 6 87 65 43 21',
    arrivalHour: 10.0,
    departureHour: 27.0,
    mood: 94,
    thoughtText: 'Prêt pour l’échange des alliances.',
    connectedDocIds: ['doc_planning_master', 'doc_declaration_mairie'],
    connectedTaskIds: ['task_echange_alliances', 'task_ouverture_bal'],
    connectedAgentIds: ['agent_bride', 'agent_witness_1', 'agent_planner'],
    connectedPlaceIds: ['place_mairie', 'place_manoir', 'place_ceremonie', 'place_cocktail', 'place_reception', 'place_dancefloor'],
  },
  {
    id: 'agent_photographer',
    name: 'Julien Renard',
    role: 'photographer',
    title: 'Photographe Scénographe',
    avatarIcon: '📷',
    avatarColor: '#e2b448',
    currentPos: [-10, 0, 5],
    targetPos: [-10, 0, 5],
    speed: 4.0,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    phone: '+33 6 45 89 12 30',
    arrivalHour: 14.5,
    departureHour: 23.5,
    mood: 90,
    thoughtText: 'Lumière dorée idéale pour le cocktail.',
    isConflict: true,
    conflictReason: 'Présence contrat décalée de 30 min par rapport au planning initial',
    connectedDocIds: ['doc_contrat_photo', 'doc_facture_photo'],
    connectedTaskIds: ['task_photos_famille', 'task_echange_alliances'],
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_videographer', 'agent_planner'],
    connectedPlaceIds: ['place_ceremonie', 'place_cocktail', 'place_reception', 'place_photo_spot'],
  },
  {
    id: 'agent_videographer',
    name: 'Studio Lumière (Marc)',
    role: 'videographer',
    title: 'Vidéaste & Drone 4K',
    avatarIcon: '🎥',
    avatarColor: '#94a3b8',
    currentPos: [-9.5, 0, 7],
    targetPos: [-9.5, 0, 7],
    speed: 3.8,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    phone: '+33 6 99 22 11 44',
    arrivalHour: 14.5,
    departureHour: 23.0,
    mood: 94,
    thoughtText: 'Plans aériens 4K au-dessus du domaine prêts.',
    connectedDocIds: ['doc_contrat_photo'],
    connectedTaskIds: ['task_echange_alliances'],
    connectedAgentIds: ['agent_photographer', 'agent_planner'],
    connectedPlaceIds: ['place_ceremonie', 'place_cocktail', 'place_photo_spot'],
  },
  {
    id: 'agent_caterer_lead',
    name: 'Maison Gourmet (Chef Antoine)',
    role: 'chef',
    title: 'Chef Traiteur Gastronomique',
    avatarIcon: '👨‍🍳',
    avatarColor: '#f8fafc',
    currentPos: [32, 0, -10],
    targetPos: [32, 0, -10],
    speed: 3.0,
    rotation: 0,
    assignedPlaceId: 'place_reception',
    phone: '+33 4 78 52 30 10',
    arrivalHour: 12.0,
    departureHour: 24.0,
    mood: 88,
    thoughtText: 'Cuisson basse température du filet de bœuf en cours.',
    connectedDocIds: ['doc_devis_traiteur', 'doc_menu_degustation', 'doc_plan_tables'],
    connectedTaskIds: ['task_ouverture_buffet', 'task_service_plat_chaud', 'task_payer_acompte_traiteur', 'task_decoupe_gateau'],
    connectedAgentIds: ['agent_planner', 'agent_bride'],
    connectedPlaceIds: ['place_cocktail', 'place_reception', 'place_brunch'],
  },
  {
    id: 'agent_dj',
    name: 'SoundWave Live (Lucas)',
    role: 'dj',
    title: 'Sound Designer & DJ',
    avatarIcon: '🎧',
    avatarColor: '#334155',
    currentPos: [14, 0, -33],
    targetPos: [14, 0, -33],
    speed: 3.5,
    rotation: 0,
    assignedPlaceId: 'place_dancefloor',
    phone: '+33 6 77 88 99 00',
    arrivalHour: 13.0,
    departureHour: 27.0,
    mood: 96,
    thoughtText: 'Régie DJ connectée. Playlist collaborative en direct.',
    connectedDocIds: ['doc_contrat_dj', 'doc_playlist_premiere_danse'],
    connectedTaskIds: ['task_ouverture_bal', 'task_lancer_confettis'],
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_planner'],
    connectedPlaceIds: ['place_dancefloor', 'place_cocktail'],
  },
  {
    id: 'agent_florist',
    name: 'Atelier Botanique (Chloé)',
    role: 'florist',
    title: 'Scénographe Florale',
    avatarIcon: '🌿',
    avatarColor: '#475569',
    currentPos: [-11, 0, 5],
    targetPos: [-11, 0, 5],
    speed: 3.0,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    phone: '+33 6 33 44 55 66',
    arrivalHour: 10.5,
    departureHour: 16.0,
    mood: 98,
    thoughtText: 'Arche d’eucalyptus et pivoines blanches dressée.',
    connectedDocIds: ['doc_contrat_fleuriste'],
    connectedTaskIds: ['task_dechargement_fleurs'],
    connectedAgentIds: ['agent_planner', 'agent_bride'],
    connectedPlaceIds: ['place_serre', 'place_ceremonie', 'place_reception'],
  },
  {
    id: 'agent_planner',
    name: 'Sophie Étoile',
    role: 'wedding_planner',
    title: 'Cheffe d’Orchestre du Jour J',
    avatarIcon: '📋',
    avatarColor: '#e2b448',
    currentPos: [-8, 0, 6],
    targetPos: [-8, 0, 6],
    speed: 4.5,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    phone: '+33 6 00 11 22 33',
    arrivalHour: 8.0,
    departureHour: 27.0,
    mood: 100,
    thoughtText: 'Worldmap synchronisée. Flux musicaux et logistiques 100% connectés.',
    connectedDocIds: ['doc_planning_master', 'doc_devis_traiteur', 'doc_contrat_photo', 'doc_contrat_dj'],
    connectedTaskIds: ['task_payer_acompte_traiteur', 'task_accueil_navettes'],
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_photographer', 'agent_caterer_lead', 'agent_dj'],
    connectedPlaceIds: ['place_mairie', 'place_parking', 'place_manoir', 'place_ceremonie', 'place_cocktail', 'place_reception', 'place_dancefloor'],
  },
  {
    id: 'agent_witness_1',
    name: 'Thomas Morel',
    role: 'witness',
    title: 'Témoin du Marié',
    avatarIcon: '🥂',
    avatarColor: '#334155',
    currentPos: [-13, 0, 5.5],
    targetPos: [-13, 0, 5.5],
    speed: 3.0,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    arrivalHour: 11.0,
    departureHour: 27.0,
    mood: 92,
    thoughtText: 'Alliances confiées et discours peaufiné.',
    connectedDocIds: ['doc_plan_tables'],
    connectedTaskIds: ['task_discours_temoins'],
    connectedAgentIds: ['agent_groom', 'agent_bride'],
    connectedPlaceIds: ['place_mairie', 'place_manoir', 'place_reception'],
  },
  {
    id: 'agent_driver',
    name: 'Jean-Luc (Chauffeur)',
    role: 'driver',
    title: 'Chauffeur Berline & Navettes',
    avatarIcon: '🎩',
    avatarColor: '#1e293b',
    currentPos: [-42, 0, 26],
    targetPos: [-42, 0, 26],
    speed: 3.0,
    rotation: 0,
    assignedPlaceId: 'place_mairie',
    arrivalHour: 13.0,
    departureHour: 16.0,
    mood: 94,
    thoughtText: 'Itinéraire GPS Mairie → Domaine optimisé.',
    connectedDocIds: ['doc_transport_navettes'],
    connectedTaskIds: ['task_accueil_navettes'],
    connectedAgentIds: ['agent_bride', 'agent_groom'],
    connectedPlaceIds: ['place_mairie', 'place_parking'],
  },
  {
    id: 'agent_musician_1',
    name: 'Quatuor Harmonie (Violon)',
    role: 'musician',
    title: 'Soliste Cérémonie',
    avatarIcon: '🎻',
    avatarColor: '#64748b',
    currentPos: [-13.5, 0, 7.5],
    targetPos: [-13.5, 0, 7.5],
    speed: 3.0,
    rotation: 0,
    assignedPlaceId: 'place_ceremonie',
    arrivalHour: 14.0,
    departureHour: 19.0,
    mood: 95,
    thoughtText: 'Canon de Pachelbel prêt.',
    connectedDocIds: ['doc_planning_master'],
    connectedTaskIds: ['task_echange_alliances'],
    connectedAgentIds: ['agent_planner'],
    connectedPlaceIds: ['place_chapelle', 'place_ceremonie', 'place_cocktail'],
  },
  // Generated Guest Agents
  ...Array.from({ length: 24 }).map((_, i) => {
    const tableNum = (i % 6) + 1;
    const names = [
      'Camille V.', 'Lucas B.', 'Emma P.', 'Hugo D.', 'Léa M.', 'Arthur T.',
      'Chloé R.', 'Gabriel S.', 'Manon L.', 'Louis F.', 'Sarah B.', 'Paul N.',
      'Juliette K.', 'Maxime C.', 'Inès W.', 'Antoine G.', 'Victoire H.', 'Romain J.',
      'Mathilde V.', 'Théo M.', 'Alice D.', 'Clément B.', 'Zoé E.', 'Nathan P.'
    ];
    const colors = ['#f8fafc', '#334155', '#475569', '#64748b', '#cbd5e1', '#94a3b8', '#1e293b'];
    return {
      id: `agent_guest_${i + 1}`,
      name: names[i] || `Invité ${i + 1}`,
      role: 'guest' as const,
      title: `Invité • Table ${tableNum}`,
      avatarIcon: '👤',
      avatarColor: colors[i % colors.length],
      currentPos: [(-14 + (i % 6) * 1.5) + (Math.random() - 0.5) * 0.5, 0, (8 + Math.floor(i / 6) * 1.5)] as [number, number, number],
      targetPos: [(-14 + (i % 6) * 1.5), 0, (8 + Math.floor(i / 6) * 1.5)] as [number, number, number],
      speed: 2.5 + Math.random() * 0.8,
      rotation: Math.random() * Math.PI * 2,
      assignedPlaceId: 'place_ceremonie',
      assignedTable: tableNum,
      dietary: i === 2 ? 'Végétarien' : i === 7 ? 'Sans gluten' : i === 14 ? 'Allergie fruits de mer' : 'Standard',
      arrivalHour: 14.2 + (i % 5) * 0.1,
      departureHour: 27.0,
      mood: 88 + Math.floor(Math.random() * 12),
      thoughtText: i === 14 ? 'Allergie fruits de mer notifiée' : 'Super playlist sur la piste',
      connectedDocIds: ['doc_plan_tables'],
      connectedTaskIds: ['task_photos_famille'],
      connectedAgentIds: ['agent_bride', 'agent_groom'],
      connectedPlaceIds: ['place_ceremonie', 'place_cocktail', 'place_reception', 'place_dancefloor'],
    };
  }),
];

// Initial Documents
export const INITIAL_DOCS: DocumentEntity[] = [
  // --- Documents that were REFERENCED by places/agents/tasks/phases but never
  // --- created, leaving 12 dangling links in the default wedding. Detected by
  // --- checkReferentialIntegrity(); see scripts/check-health.mjs.
  {
    id: 'doc_transport_navettes',
    title: 'Plan de Transport & Navettes Invités',
    category: 'planning',
    fileName: 'Navettes_Invites_Bellevue.pdf',
    rawTextExcerpt: 'Deux navettes 32 places. Rotation hôtel → domaine à 14h30 et 16h00. Retours 01h00 et 02h30. Prestataire : Bellevue Transferts.',
    amount: 1450,
    depositAmount: 450,
    isPaid: true,
    extractedDate: '14 Juin 2025',
    extractedHour: '14:30',
    connectedAgentIds: ['agent_driver'],
    connectedPlaceIds: ['place_parking', 'place_hotel'],
    connectedTaskIds: [],
    createdAtHour: 10,
  },
  {
    id: 'doc_contrat_domaine',
    title: 'Contrat de Location — Domaine de Bellevue',
    category: 'contrat',
    fileName: 'Contrat_Domaine_Bellevue_Signe.pdf',
    rawTextExcerpt: 'Location du manoir et du parc du 13 au 15 Juin. Capacité 150 personnes. Caution 3 000 €. Fin de musique amplifiée à 02h00.',
    amount: 9800,
    depositAmount: 2940,
    isPaid: true,
    extractedDate: '13 Juin 2025',
    extractedHour: '10:00',
    connectedAgentIds: [],
    connectedPlaceIds: ['place_manoir'],
    connectedTaskIds: [],
    createdAtHour: 10,
  },
  {
    id: 'doc_menu_degustation',
    title: 'Menu Dégustation & Régimes Spéciaux',
    category: 'devis',
    fileName: 'Menu_Traiteur_Degustation.pdf',
    rawTextExcerpt: 'Cocktail 8 pièces, entrée, plat, fromages, pièce montée. 120 couverts dont 6 végétariens, 2 sans gluten, 1 sans lactose.',
    amount: 11400,
    depositAmount: 3420,
    isPaid: false,
    extractedDate: '14 Juin 2025',
    extractedHour: '19:30',
    connectedAgentIds: ['agent_caterer_lead'],
    connectedPlaceIds: ['place_reception'],
    connectedTaskIds: [],
    createdAtHour: 11,
  },
  {
    id: 'doc_playlist_premiere_danse',
    title: 'Playlist Ouverture de Bal & Consignes DJ',
    category: 'planning',
    fileName: 'Playlist_Premiere_Danse.pdf',
    rawTextExcerpt: 'Première danse à 22h45. Titre d’ouverture puis montée progressive. Pas de musique amplifiée après 02h00.',
    amount: 0,
    depositAmount: 0,
    isPaid: true,
    extractedDate: '14 Juin 2025',
    extractedHour: '22:45',
    connectedAgentIds: ['agent_dj'],
    connectedPlaceIds: ['place_dancefloor'],
    connectedTaskIds: ['task_ouverture_bal'],
    createdAtHour: 12,
  },
  {
    id: 'doc_facture_photo',
    title: 'Facture Photographe — Reportage Complet',
    category: 'facture',
    fileName: 'Facture_Photographe_JourJ.pdf',
    rawTextExcerpt: 'Reportage 12h, second shooter, retouches 400 photos, album 30x30. Solde à régler sous 30 jours.',
    amount: 3200,
    depositAmount: 960,
    isPaid: false,
    extractedDate: '14 Juin 2025',
    extractedHour: '12:00',
    connectedAgentIds: ['agent_photographer'],
    connectedPlaceIds: [],
    connectedTaskIds: [],
    createdAtHour: 11,
  },
  {
    id: 'doc_planning_master',
    title: 'Master Planning Jour J — V8',
    category: 'planning',
    fileName: 'Planning_General_Mariage_Clara_Alexandre.pdf',
    rawTextExcerpt: 'Orchestration complète du 14 Juin. Début préparatifs 10h00, Cérémonie 15h30, Cocktail 17h00, Repas 19h30, Pièce montée 22h30.',
    extractedDate: '14 Juin 2025',
    extractedHour: '10:00 - 03:00',
    connectedAgentIds: ['agent_planner', 'agent_bride', 'agent_groom'],
    connectedPlaceIds: ['place_mairie', 'place_manoir', 'place_ceremonie', 'place_cocktail', 'place_reception', 'place_dancefloor'],
    connectedTaskIds: ['task_habillage_mariee', 'task_echange_alliances', 'task_ouverture_buffet', 'task_service_plat_chaud', 'task_ouverture_bal'],
    createdAtHour: 10.0,
  },
  {
    id: 'doc_declaration_mairie',
    title: 'Déclaration & Livret Républicain Mairie',
    category: 'contrat',
    fileName: 'Acte_Civil_Mairie_Paris_75001.pdf',
    amount: 150,
    isPaid: true,
    rawTextExcerpt: 'Publication des bans et célébration civile fixée à 14h00. Remise du livret de famille.',
    extractedHour: '14:00',
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_witness_1'],
    connectedPlaceIds: ['place_mairie'],
    connectedTaskIds: ['task_signature_registre'],
    createdAtHour: 10.0,
  },
  {
    id: 'doc_devis_traiteur',
    title: 'Devis Traiteur — Maison Gourmet',
    category: 'devis',
    fileName: 'Devis_Maison_Gourmet_100pax.pdf',
    amount: 4800,
    depositAmount: 1500,
    isPaid: false,
    rawTextExcerpt: 'Prestation 100 personnes cocktail dînatoire + dîner 3 plats. Acompte de 1 500 € à régler avant le service du plat chaud.',
    extractedHour: '17:00 & 19:30',
    connectedAgentIds: ['agent_caterer_lead', 'agent_planner'],
    connectedPlaceIds: ['place_cocktail', 'place_reception'],
    connectedTaskIds: ['task_ouverture_buffet', 'task_service_plat_chaud', 'task_payer_acompte_traiteur'],
    createdAtHour: 10.0,
  },
  {
    id: 'doc_contrat_photo',
    title: 'Contrat Photographe — Julien Renard',
    category: 'contrat',
    fileName: 'Contrat_Photo_Julien_Renard_2025.pdf',
    amount: 1650,
    depositAmount: 600,
    isPaid: true,
    rawTextExcerpt: 'Couverture préparatifs + cérémonie + cocktail + dîner. Présence 14h30 à 23h30. Golden hour shoot programmé à 18h45.',
    extractedHour: '14:30 - 23:30',
    connectedAgentIds: ['agent_photographer', 'agent_videographer'],
    connectedPlaceIds: ['place_ceremonie', 'place_cocktail', 'place_reception'],
    connectedTaskIds: ['task_photos_famille', 'task_echange_alliances'],
    createdAtHour: 10.0,
  },
  {
    id: 'doc_contrat_dj',
    title: 'Fiche Technique DJ & Playlist — SoundWave',
    category: 'contrat',
    fileName: 'Contrat_DJ_SoundWave_Lighting.pdf',
    amount: 1200,
    depositAmount: 400,
    isPaid: true,
    rawTextExcerpt: 'Système son 4kW, lyres beam DMX, étincelles froides intérieures, première danse sur "Lover", playlist collaborative activée.',
    extractedHour: '17:00 - 04:00',
    connectedAgentIds: ['agent_dj', 'agent_planner'],
    connectedPlaceIds: ['place_cocktail', 'place_dancefloor'],
    connectedTaskIds: ['task_ouverture_bal', 'task_lancer_confettis'],
    createdAtHour: 10.0,
  },
  {
    id: 'doc_plan_tables',
    title: 'Plan de Table & Régimes',
    category: 'plan_table',
    fileName: 'Plan_de_Table_100_Convives.xlsx',
    rawTextExcerpt: '10 Tables rondes. Table 1: Mariés & Témoins. Table 2: Famille. 12 Menus Végétariens, 2 Sans Gluten, 1 Allergie fruits de mer.',
    connectedAgentIds: ['agent_caterer_lead', 'agent_witness_1', 'agent_guest_3', 'agent_guest_8', 'agent_guest_15'],
    connectedPlaceIds: ['place_reception'],
    connectedTaskIds: ['task_service_plat_chaud'],
    createdAtHour: 10.0,
  },
  {
    id: 'doc_contrat_fleuriste',
    title: 'Facture Florale — Atelier Botanique',
    category: 'facture',
    fileName: 'Facture_Fleurs_Arche_CentresTable.pdf',
    amount: 2100,
    isPaid: true,
    rawTextExcerpt: 'Arche florale cérémonie, 10 centres de table, bouquet mariée, boutonnières.',
    extractedHour: 'Livraison 11:00',
    connectedAgentIds: ['agent_florist', 'agent_bride'],
    connectedPlaceIds: ['place_serre', 'place_ceremonie', 'place_reception'],
    connectedTaskIds: ['task_dechargement_fleurs'],
    createdAtHour: 10.0,
  },
  {
    id: 'doc_voeux_maries',
    title: 'Livret des Vœux des Mariés',
    category: 'note',
    fileName: 'Voeux_Clara_Alexandre.txt',
    rawTextExcerpt: 'Échange des alliances, lecture des vœux mutuels, musique violon.',
    extractedHour: '16:15',
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_musician_1'],
    connectedPlaceIds: ['place_ceremonie'],
    connectedTaskIds: ['task_echange_alliances'],
    createdAtHour: 10.0,
  },
];

// Initial Tasks
export const INITIAL_TASKS: TaskEntity[] = [
  // Referenced by place_manoir.connectedTaskIds but never created.
  {
    id: 'task_check_coiffure',
    title: 'Vérifier coiffure & maquillage des mariées',
    category: 'logistique',
    dueHour: 13,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_bride',
    assignedPlaceId: 'place_manoir',
    connectedDocIds: [],
    connectedAgentIds: ['agent_bride'],
  },
  {
    id: 'task_habillage_mariee',
    title: 'Habillage & Préparatifs des Mariés',
    category: 'prestataire',
    dueHour: 13.0,
    isDone: true,
    urgent: false,
    assignedAgentId: 'agent_bride',
    assignedPlaceId: 'place_manoir',
    connectedDocIds: ['doc_planning_master'],
    connectedAgentIds: ['agent_bride', 'agent_planner'],
  },
  {
    id: 'task_signature_registre',
    title: 'Signature Registre Républicain à la Mairie',
    category: 'ceremonie',
    dueHour: 14.2,
    isDone: true,
    urgent: true,
    assignedAgentId: 'agent_bride',
    assignedPlaceId: 'place_mairie',
    connectedDocIds: ['doc_declaration_mairie'],
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_witness_1'],
  },
  {
    id: 'task_depart_cortege',
    title: 'Départ du Cortège Mairie → Domaine',
    category: 'logistique',
    dueHour: 14.8,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_driver',
    assignedPlaceId: 'place_mairie',
    connectedDocIds: ['doc_planning_master'],
    connectedAgentIds: ['agent_driver', 'agent_bride', 'agent_groom'],
  },
  {
    id: 'task_dechargement_fleurs',
    title: 'Installation Scénographie & Arche',
    category: 'logistique',
    dueHour: 13.5,
    isDone: true,
    urgent: false,
    assignedAgentId: 'agent_florist',
    assignedPlaceId: 'place_ceremonie',
    connectedDocIds: ['doc_contrat_fleuriste'],
    connectedAgentIds: ['agent_florist'],
  },
  {
    id: 'task_accueil_navettes',
    title: 'Arrivée des Navettes & Accueil Invités',
    category: 'logistique',
    dueHour: 14.5,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_driver',
    assignedPlaceId: 'place_parking',
    connectedDocIds: ['doc_planning_master'],
    connectedAgentIds: ['agent_driver', 'agent_planner'],
  },
  {
    id: 'task_echange_alliances',
    title: 'Cérémonie Laïque & Vœux Mutuels',
    category: 'ceremonie',
    dueHour: 16.0,
    isDone: false,
    urgent: true,
    assignedAgentId: 'agent_bride',
    assignedPlaceId: 'place_ceremonie',
    connectedDocIds: ['doc_voeux_maries', 'doc_contrat_photo'],
    connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_photographer', 'agent_musician_1'],
  },
  {
    id: 'task_lancer_petales',
    title: 'Sortie de Cérémonie & Pétales',
    category: 'ceremonie',
    dueHour: 16.6,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_planner',
    assignedPlaceId: 'place_ceremonie',
    connectedDocIds: ['doc_planning_master'],
    connectedAgentIds: ['agent_planner', 'agent_photographer'],
  },
  {
    id: 'task_ouverture_buffet',
    title: 'Ouverture du Cocktail & Dégustation',
    category: 'animation',
    dueHour: 17.0,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_caterer_lead',
    assignedPlaceId: 'place_cocktail',
    connectedDocIds: ['doc_devis_traiteur'],
    connectedAgentIds: ['agent_caterer_lead', 'agent_planner'],
  },
  {
    id: 'task_photos_famille',
    title: 'Séance Photos Scénographiques Golden Hour',
    category: 'animation',
    dueHour: 18.2,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_photographer',
    assignedPlaceId: 'place_photo_spot',
    connectedDocIds: ['doc_contrat_photo'],
    connectedAgentIds: ['agent_photographer', 'agent_bride', 'agent_groom', 'agent_videographer'],
  },
  {
    id: 'task_payer_acompte_traiteur',
    title: 'Règlement de l’acompte traiteur (1 500 €)',
    category: 'paiement',
    dueHour: 19.0,
    isDone: false,
    urgent: true,
    cost: 1500,
    assignedAgentId: 'agent_planner',
    assignedPlaceId: 'place_reception',
    connectedDocIds: ['doc_devis_traiteur'],
    connectedAgentIds: ['agent_caterer_lead', 'agent_planner'],
  },
  {
    id: 'task_service_plat_chaud',
    title: 'Entrée des Mariés & Dîner Gastronomique',
    category: 'logistique',
    dueHour: 19.8,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_caterer_lead',
    assignedPlaceId: 'place_reception',
    connectedDocIds: ['doc_devis_traiteur', 'doc_plan_tables'],
    connectedAgentIds: ['agent_caterer_lead', 'agent_bride', 'agent_groom'],
  },
  {
    id: 'task_discours_temoins',
    title: 'Discours des Témoins',
    category: 'animation',
    dueHour: 21.0,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_witness_1',
    assignedPlaceId: 'place_reception',
    connectedDocIds: ['doc_plan_tables'],
    connectedAgentIds: ['agent_witness_1', 'agent_bride', 'agent_groom'],
  },
  {
    id: 'task_decoupe_gateau',
    title: 'Pièce Montée & Fontaine d’Étincelles',
    category: 'animation',
    dueHour: 22.3,
    isDone: false,
    urgent: true,
    assignedAgentId: 'agent_caterer_lead',
    assignedPlaceId: 'place_reception',
    connectedDocIds: ['doc_devis_traiteur'],
    connectedAgentIds: ['agent_caterer_lead', 'agent_bride', 'agent_groom', 'agent_dj'],
  },
  {
    id: 'task_ouverture_bal',
    title: 'Ouverture du Bal des Mariés',
    category: 'animation',
    dueHour: 22.8,
    isDone: false,
    urgent: true,
    assignedAgentId: 'agent_dj',
    assignedPlaceId: 'place_dancefloor',
    connectedDocIds: ['doc_contrat_dj', 'doc_playlist_premiere_danse'],
    connectedAgentIds: ['agent_dj', 'agent_bride', 'agent_groom', 'agent_photographer'],
  },
  {
    id: 'task_lancer_confettis',
    title: 'Soirée Acoustique & Effets Lumineux',
    category: 'animation',
    dueHour: 23.5,
    isDone: false,
    urgent: false,
    assignedAgentId: 'agent_dj',
    assignedPlaceId: 'place_dancefloor',
    connectedDocIds: ['doc_contrat_dj'],
    connectedAgentIds: ['agent_dj'],
  },
];

// Initial Conflicts
export const INITIAL_CONFLICTS: ConflictEntity[] = [
  {
    id: 'conflict_photo_time',
    title: 'Décalage Horaire Photographe',
    description: 'Le contrat du photographe indique 15h30, or la cérémonie laïque débute à 15h00. Risque de rupture de continuité visuelle.',
    severity: 'high',
    sourceEntityId: 'agent_photographer',
    impactedEntityIds: ['agent_photographer', 'agent_bride', 'doc_contrat_photo', 'place_ceremonie'],
    suggestedSolution: 'Ajuster l’arrivée à 14h30 via un avenant express au contrat.',
    isResolved: false,
    impactCategory: 'horaire',
  },
  {
    id: 'conflict_traiteur_acompte',
    title: 'Acompte Traiteur en Attente',
    description: 'Le devis traiteur requiert la validation de l’acompte de 1 500 € avant le démarrage du service.',
    severity: 'high',
    sourceEntityId: 'doc_devis_traiteur',
    impactedEntityIds: ['doc_devis_traiteur', 'task_payer_acompte_traiteur', 'agent_caterer_lead'],
    suggestedSolution: 'Valider le paiement de l’acompte par virement instantané.',
    isResolved: false,
    impactCategory: 'budget',
  },
  {
    id: 'conflict_guest_allergy',
    title: 'Régime Non Notifié en Cuisine',
    description: 'Romain J. (Table 3) présente une allergie sévère aux fruits de mer non spécifiée sur la fiche chef.',
    severity: 'medium',
    sourceEntityId: 'agent_guest_15',
    impactedEntityIds: ['agent_guest_15', 'agent_caterer_lead', 'doc_plan_tables'],
    suggestedSolution: 'Éditer un menu de substitution (Volaille aux morilles).',
    isResolved: false,
    impactCategory: 'logistique',
  },
];

// Timeline Phases
export const TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'phase_matin',
    startHour: 10.0,
    endHour: 13.5,
    name: '10:00 — Préparatifs au Manoir',
    subtitle: 'Installation des prestataires, habillage et coiffure au Manoir',
    icon: 'manoir',
    primaryPlaceId: 'place_manoir',
    highlightAction: 'Mise en place florale & balances acoustiques',
    bgAtmosphere: 'morning',
    keyAgentIds: ['agent_bride', 'agent_groom', 'agent_florist', 'agent_planner'],
    keyDocIds: ['doc_planning_master', 'doc_contrat_fleuriste'],
    keyTaskIds: ['task_habillage_mariee', 'task_dechargement_fleurs'],
    ambientTrack: 'prep',
  },
  {
    id: 'phase_mairie',
    startHour: 13.5,
    endHour: 15.0,
    name: '13:30 — Cérémonie Civile à la Mairie',
    subtitle: 'Signature du registre républicain et départ du cortège',
    icon: 'mairie',
    primaryPlaceId: 'place_mairie',
    highlightAction: 'Signature civile & départ des berlines',
    bgAtmosphere: 'afternoon',
    keyAgentIds: ['agent_bride', 'agent_groom', 'agent_driver', 'agent_witness_1'],
    keyDocIds: ['doc_declaration_mairie'],
    keyTaskIds: ['task_signature_registre', 'task_depart_cortege'],
    ambientTrack: 'prep',
  },
  {
    id: 'phase_ceremonie',
    startHour: 15.0,
    endHour: 17.0,
    name: '15:30 — Cérémonie Laïque & Vœux',
    subtitle: 'Grand parc, allée centrale, lectures, échange des alliances',
    icon: 'ceremonie',
    primaryPlaceId: 'place_ceremonie',
    highlightAction: 'Échange des alliances & sortie d’honneur',
    bgAtmosphere: 'golden',
    keyAgentIds: ['agent_bride', 'agent_groom', 'agent_photographer', 'agent_videographer', 'agent_musician_1'],
    keyDocIds: ['doc_voeux_maries', 'doc_contrat_photo'],
    keyTaskIds: ['task_echange_alliances', 'task_lancer_petales'],
    ambientTrack: 'ceremony',
  },
  {
    id: 'phase_cocktail',
    startHour: 17.0,
    endHour: 19.5,
    name: '17:00 — Cocktail & Jardins Belvédère',
    subtitle: 'Fontaine royale, dégustation, ambiance jazz lounge & photos',
    icon: 'cocktail',
    primaryPlaceId: 'place_cocktail',
    highlightAction: 'Cocktail & séance photo golden hour',
    bgAtmosphere: 'golden',
    keyAgentIds: ['agent_bride', 'agent_groom', 'agent_caterer_lead', 'agent_photographer', 'agent_dj'],
    keyDocIds: ['doc_devis_traiteur', 'doc_contrat_photo'],
    keyTaskIds: ['task_ouverture_buffet', 'task_photos_famille'],
    ambientTrack: 'jazz',
  },
  {
    id: 'phase_repas',
    startHour: 19.5,
    endHour: 22.5,
    name: '19:30 — Banquet & Orangerie',
    subtitle: 'Entrée des mariés, service du dîner 3 plats & interventions',
    icon: 'banquet',
    primaryPlaceId: 'place_reception',
    highlightAction: 'Service gastronomique & pièce montée',
    bgAtmosphere: 'dusk',
    keyAgentIds: ['agent_bride', 'agent_groom', 'agent_caterer_lead', 'agent_witness_1'],
    keyDocIds: ['doc_plan_tables', 'doc_devis_traiteur'],
    keyTaskIds: ['task_service_plat_chaud', 'task_payer_acompte_traiteur', 'task_discours_temoins', 'task_decoupe_gateau'],
    ambientTrack: 'dinner',
  },
  {
    id: 'phase_premiere_danse',
    startHour: 22.5,
    endHour: 23.5,
    name: '22:30 — Ouverture de Bal',
    subtitle: 'Première danse des mariés sous éclairage architectural',
    icon: 'dancefloor',
    primaryPlaceId: 'place_dancefloor',
    highlightAction: 'Chorégraphie des mariés',
    bgAtmosphere: 'night',
    keyAgentIds: ['agent_bride', 'agent_groom', 'agent_dj', 'agent_photographer'],
    keyDocIds: ['doc_contrat_dj', 'doc_playlist_premiere_danse'],
    keyTaskIds: ['task_ouverture_bal'],
    ambientTrack: 'party',
  },
  {
    id: 'phase_soiree',
    startHour: 23.5,
    endHour: 27.0,
    name: '23:30 — Soirée Dansante & Clôture',
    subtitle: 'Mix DJ SoundWave, bar de nuit et pyrotechnie',
    icon: 'dancefloor',
    primaryPlaceId: 'place_dancefloor',
    highlightAction: 'Set DJ & show lumineux',
    bgAtmosphere: 'night',
    keyAgentIds: ['agent_dj', 'agent_bride', 'agent_groom'],
    keyDocIds: ['doc_contrat_dj'],
    keyTaskIds: ['task_lancer_confettis'],
    ambientTrack: 'party',
  },
];

// Preset realistic documents for Chaos Importer
export const CHAOS_PRESETS: ImportPresetFile[] = [
  {
    id: 'preset_devis_traiteur',
    name: 'Devis_Maison_Gourmet_100pax.pdf',
    icon: 'document',
    size: '1.4 MB',
    type: 'PDF',
    label: 'Devis Traiteur & Service',
    description: 'Prestation 100 couverts, 4 maîtres d’hôtel, acompte 1500€, service 19h30.',
    previewSnippet: 'MAISON GOURMET - Traiteur Événementiel\nTotal TTC: 4 800,00 €\nAcompte: 1 500,00 €\nInstallation: 17h00 | Début service: 19h30',
    extractedSummary: {
      agentsCount: 2,
      tasksCount: 3,
      docsCount: 1,
      budget: 4800,
      conflictsFound: 1,
    },
  },
  {
    id: 'preset_contrat_dj',
    name: 'Contrat_DJ_SoundWave_Live.pdf',
    icon: 'dancefloor',
    size: '890 KB',
    type: 'PDF',
    label: 'Contrat Acoustique & DJ',
    description: 'Régie son 4000W, lyres architecturales, étincelles froides, bal à 22h30.',
    previewSnippet: 'SOUNDWAVE ACOUSTICS\nArtiste: Lucas D. (DJ SoundWave)\nPrestation: 1 200 € | Horaires: 17h00 - 04h00',
    extractedSummary: {
      agentsCount: 1,
      tasksCount: 2,
      docsCount: 1,
      budget: 1200,
      conflictsFound: 0,
    },
  },
  {
    id: 'preset_sms_photographe',
    name: 'SMS_Photographe_Planning.txt',
    icon: 'photo',
    size: '12 KB',
    type: 'SMS',
    label: 'Transmission Horaires Photographe',
    description: 'Confirmation de Julien R. pour le shooting des préparatifs et du cocktail.',
    previewSnippet: 'Julien Photographe (+33 6 45 89 12 30)\n"Brief bien validé. Présence confirmée à 14h30 pour le cortège et golden hour à 18h45."',
    extractedSummary: {
      agentsCount: 1,
      tasksCount: 2,
      docsCount: 1,
      budget: 1650,
      conflictsFound: 1,
    },
  },
  {
    id: 'preset_plan_tables',
    name: 'Plan_de_Table_Invites.xlsx',
    icon: 'document',
    size: '420 KB',
    type: 'XLSX',
    label: 'Plan de Table & Spécifications',
    description: 'Affectation des 10 tables rondes, régimes alimentaires et restrictions.',
    previewSnippet: 'TABLE 1 (Honneur) - Clara, Alexandre, Témoins\nTABLE 2 (Famille) - Parents & Proches\nNotes: 12 végétariens, 1 allergie fruits de mer',
    extractedSummary: {
      agentsCount: 24,
      tasksCount: 1,
      docsCount: 1,
      budget: 0,
      conflictsFound: 1,
    },
  },
  {
    id: 'preset_facture_fleurs',
    name: 'Facture_Fleurs_Arche.pdf',
    icon: 'florist',
    size: '640 KB',
    type: 'PDF',
    label: 'Facture Scénographie Florale',
    description: 'Arche florale cérémonie, allée en pétales, 10 centres de table.',
    previewSnippet: 'ATELIER BOTANIQUE\nArche eucalyptus & roses blanches\nMontant: 2 100 € - Statut: Payé',
    extractedSummary: {
      agentsCount: 1,
      tasksCount: 1,
      docsCount: 1,
      budget: 2100,
      conflictsFound: 0,
    },
  },
  {
    id: 'preset_sms_meteo',
    name: 'Bulletin_Meteo_Domaine.txt',
    icon: 'alert',
    size: '8 KB',
    type: 'SMS',
    label: 'Bulletin Météo & Repli Cocktail',
    description: 'Vent léger prévu en fin d’après-midi. Tentes nomades opérationnelles.',
    previewSnippet: 'MÉTÉO FRANCE\nConditions optimales. Rafale modérée possible à 17h15.\nTentes nomades déployées.',
    extractedSummary: {
      agentsCount: 0,
      tasksCount: 1,
      docsCount: 1,
      budget: 0,
      conflictsFound: 0,
    },
  },
];

// Wedding Store Class with Real Persistent Multi-Project Architecture
/** Default avatar identity. Single definition, shared by the class field and the reset factory. */
export const DEFAULT_USER_IDENTITY: UserIdentity = {
  role: 'wedding_planner',
  name: 'Sophie Étoile',
  roleTitle: 'Cheffe d\u2019Orchestre du Jour J',
  outfitColor: '#e2b448',
  accessory: 'clipboard',
  avatarIcon: 'planner',
  isCreated: true,
};

/**
 * Deep copy, so callers cannot mutate the module-level INITIAL_* constants.
 *
 * `[...INITIAL_AD_SLOTS]` only copies the array — the element objects stay
 * shared. Claiming an ad slot therefore mutated the "pristine" constant
 * itself, which leaked state across project switches and made defaults
 * non-pristine. Cloning removes that whole class of contamination.
 */
function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Pristine defaults for every persisted field. Declared once, used by both the
 * "no snapshot" and the "partial snapshot" paths.
 */
function createDefaultDomainState(): PersistedDomainState {
  return clone({
    time: 15.4,
    userIdentity: DEFAULT_USER_IDENTITY,
    // MEASURED IN THE BROWSER (journey acceptance): DEFAULT_DMC_IDENTITY
    // carries `customBadgeText: 'Clara & Alexandre'`, so every brand-new
    // wedding was persisted with the demo couple written inside it. An empty
    // world knows no names until someone types them.
    userDmcIdentity: { ...DEFAULT_DMC_IDENTITY, customBadgeText: '' },
    places: INITIAL_PLACES,
    agents: INITIAL_AGENTS,
    docs: INITIAL_DOCS,
    tasks: INITIAL_TASKS,
    conflicts: INITIAL_CONFLICTS,
    phases: TIMELINE_PHASES,
    tracks: INITIAL_TRACKS,
    // A day starts with no parallel branch, demo included.
    scenarios: [],
    reconstructedVenues: INITIAL_RECONSTRUCTED_VENUES,
    placedObjects: INITIAL_RECONSTRUCTED_VENUES[0].objects,
    adSlots: INITIAL_AD_SLOTS,
    // Identity model starts empty; migrateIdentityModel() derives it from the
    // agents right after restore, so a fresh project is populated too.
    persons: [], accounts: [], dmcIdentities: [], guests: [], vendors: [],
    seatingTables: [], memberships: [], invitations: [], trackVotes: [],
    media: [], relationships: [],
    currentPersonId: null,
  });
}

/**
 * A brand-new project's domain: EMPTY.
 *
 * MEASURED IN THE BROWSER (multi-project acceptance): creating a wedding
 * through the real form produced a project that already contained the demo —
 * 12 places called "Hôtel de Ville & Cérémonie Civile", 35 people called
 * "Clara Dubois"…, 10 tracks, 7 phases. A couple creating their wedding
 * inherited somebody else's.
 *
 * A new project therefore starts with nothing but what its creator typed. The
 * empty states across World, Mirror and Canvas already explain what is missing
 * and how to add it, so an empty project is legible rather than broken.
 */
/** The light at that hour of the day. Derived, never asked. */
function atmosphereForHour(hour: number): TimelinePhase['bgAtmosphere'] {
  const h = ((hour % 24) + 24) % 24;
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 19.5) return 'golden';
  if (h < 21.5) return 'dusk';
  return 'night';
}

function createEmptyDomainState(): PersistedDomainState {
  return clone({
    time: 15.0,
    userIdentity: DEFAULT_USER_IDENTITY,
    userDmcIdentity: DEFAULT_DMC_IDENTITY,
    places: [], agents: [], docs: [], tasks: [], conflicts: [], phases: [],
    tracks: [], scenarios: [], reconstructedVenues: [], placedObjects: [], adSlots: [],
    persons: [], accounts: [], dmcIdentities: [], guests: [], vendors: [],
    seatingTables: [], memberships: [], invitations: [], trackVotes: [],
    media: [], relationships: [],
    currentPersonId: null,
  });
}

class WeddingStore {
  public version: number = 0;
  public time: number = 15.4;
  public isPlaying: boolean = true;
  public speed: number = 1.0;
  public viewMode: 'world' | 'timeline' = 'world';

  // Navigation / Modal States
  public showIdentityModal: boolean = false;
  public brandMenuOpen: boolean = false;
  public createWeddingModalOpen: boolean = false;
  /**
   * The editorial creation surface (Mirror). Same business path as the World
   * panel — see startWeddingCreation — but dressed for the public site.
   */
  public weddingCreationOpen: boolean = false;
  public landingPageModalOpen: boolean = false;
  public guideDocModalOpen: boolean = false;
  public inviteModalOpen: boolean = false;
  public authModalOpen: boolean = false;
  public djBoothModalOpen: boolean = false;
  public projectSettingsModalOpen: boolean = false;
  public importLocationModalOpen: boolean = false;
  public worldResearchModalOpen: boolean = false;
  public spatialAgentDrawerOpen: boolean = false;
  public claimVendorModalOpen: boolean = false;
  public claimedVendorTarget: any = null;
  public worldLabModalOpen: boolean = false;
  public connectorsModalOpen: boolean = false;
  public adSlotModalOpen: boolean = false;
  public selectedAdSlotId: string | null = null;
  public systemNerveModalOpen: boolean = false;
  /** Composition-mode surface: guest constellation (Phase B prototype). */
  public constellationOpen: boolean = false;

  // -------------------------------------------------------------------------
  // PROJECTIONS (Phase C)
  //
  // Editorial sections shared by Mirror and Canvas (01..06). Declared here
  // because the store carries the intent from one surface to the other.
  //
  // (see CANVAS_TABS in components/canvas/CanvasCore — same six ids)
  // One World Model, several renderers. This is only WHICH projection is on
  // screen — never a second copy of the data.
  // -------------------------------------------------------------------------
  public projection: 'world' | 'mirror' = 'world';
  /**
   * False until this browser has opened or created a wedding.
   *
   * The store still holds a project (the demo) so the engine always has
   * something coherent to work with, but the interface must NOT present it:
   * a first-time visitor lands on the Mirror as a public site, and no demo
   * data is shown until they choose or create a wedding.
   */
  public projectChosen: boolean = true;
  /** Entity the user arrived on when crossing from another projection. */
  public mirrorFocusPersonId: string | null = null;

  /** Real persistence state, surfaced by the Canvas. Never optimistic. */
  public saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  public lastSavedAt: string | null = null;

  // Canvas context: what the user is currently composing.
  public canvasOpen: boolean = false;
  public canvasFocus: { kind: 'event' | 'person' | 'vendor' | 'place' | 'song'; id: string } | null = null;
  /** Section the Canvas should open on when no single entity is focused. */
  public canvasSection: CanvasSection | null = null;
  /**
   * Incremented every time a surface asks the Canvas to open somewhere.
   * The shells compare it to what they last honoured, so clicking "Composer"
   * in 04 LIEUX always lands on 04 — even if the user had wandered to 05 and
   * the requested section has not changed.
   */
  public canvasIntent: number = 0;

  // Real World -> 3D World / Interior State
  public interiorMode: boolean = false;
  public activeVenueId: string | null = null;
  public constructionMode: boolean = false;
  public reconstructedVenues: ReconstructedVenue[] = clone(INITIAL_RECONSTRUCTED_VENUES);
  public placedObjects: PlacedObject[] = clone(INITIAL_RECONSTRUCTED_VENUES[0].objects);
  public selectedObjectId: string | null = null;
  public avatarPos: [number, number, number] = [0, 0, 8];
  public avatarRot: number = 0;

  // Advertising Grid 3D Slots
  public adSlots: AdDisplaySlot[] = clone(INITIAL_AD_SLOTS);

  // DMC ID Identity (DMC Color + DMC Symbol)
  public userDmcIdentity: DmcIdentity = clone(DEFAULT_DMC_IDENTITY);

  // -------------------------------------------------------------------------
  // First-order identity model (schema v3).
  //
  // `Agent` remains the spatial projection; these are the domain identities.
  // Everything here is related by stable ID — never by role or display name.
  // -------------------------------------------------------------------------
  public persons: Person[] = [];
  public accounts: UserAccountV2[] = [];
  public dmcIdentities: DmcIdentityRecord[] = [];
  public guests: Guest[] = [];
  public vendors: Vendor[] = [];
  public seatingTables: SeatingTable[] = [];
  public memberships: ProjectMembership[] = [];
  public invitations: Invitation[] = [];
  public trackVotes: TrackVote[] = [];
  /**
   * Media assets. Starts EMPTY and is never seeded: the architecture is ready,
   * but no photo is invented to make the product look finished.
   */
  public media: MediaAsset[] = [];
  /** First-order edges between people. */
  public relationships: PersonRelationship[] = [];
  /** The person this session acts as. Replaces role-based avatar matching. */
  public currentPersonId: string | null = null;
  /** Result of the last identity migration, surfaced by the System Nerve. */
  public lastMigrationReport: MigrationReport | null = null;

  // Active Project & Account
  public currentProject: WeddingProject = {
    id: 'proj_demo_clara_alexandre',
    title: 'Mariage de Clara & Alexandre',
    worldType: 'wedding',
    coupleNames: 'Clara & Alexandre',
    weddingDate: '2025-06-14',
    locationName: 'Château de Bellevue & Parc',
    budgetTarget: 25000,
    guestCountTarget: 120,
    ownerId: 'account_demo',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inviteCode: 'WC-2025-CLARA',
  };

  public activeAccount: UserAccount | null = null;

  // Identity state
  public userIdentity: UserIdentity = clone(DEFAULT_USER_IDENTITY);

  public introCinematicActive: boolean = false;
  public introProgress: number = 1.0;

  public places: Place[] = clone(INITIAL_PLACES);
  public vehicles: TransitVehicle[] = [...INITIAL_VEHICLES];
  public agents: Agent[] = clone(INITIAL_AGENTS);
  public docs: DocumentEntity[] = clone(INITIAL_DOCS);
  public tasks: TaskEntity[] = clone(INITIAL_TASKS);
  public conflicts: ConflictEntity[] = clone(INITIAL_CONFLICTS);
  public phases: TimelinePhase[] = clone(TIMELINE_PHASES);
  /** Temporary branches of the day. See the SCÉNARIOS block below. */
  public scenarios: TimelineScenario[] = [];
  public activeScenarioId: string | null = null;
  public tracks: TrackEntity[] = clone(INITIAL_TRACKS);

  public selectedEntity: {
    type: 'agent' | 'place' | 'document' | 'task' | 'phase' | 'conflict' | 'route' | 'track' | 'object' | 'venue';
    id: string;
  } | null = null;

  public hoveredEntityId: string | null = null;
  public cameraTargetPos: [number, number, number] = [-12, 2, 6];

  public gridWaves: GridWave[] = [];
  public neuralPulses: NeuralPulse[] = [];

  public specialFx: {
    cameraFlashing: boolean;
    confettiBurst: boolean;
    sparklersActive: boolean;
    fireworksActive: boolean;
  } = {
    cameraFlashing: false,
    confettiBurst: false,
    sparklersActive: false,
    fireworksActive: false,
  };

  private listeners: Set<() => void> = new Set();

  /**
   * What the last restore actually recovered vs. silently defaulted.
   * Exposed so the System Nerve can report non-persisted state instead of
   * letting it disappear without a trace.
   */
  public lastRestoreReport: ReturnType<typeof applyDomain> | null = null;

  constructor() {
    this.initFromPersistence();
  }

  private initFromPersistence() {
    try {
      this.activeAccount = getActiveAccount();
      this.projectChosen = hasChosenProject();
      // The product opens on the Mirror, always: the public site when no
      // wedding has been chosen, the Jour J timeline when one has.
      this.projection = 'mirror';
      const activeProjId = getActiveProjectId();
      const projects = getStoredProjects();
      const proj = projects.find((p) => p.id === activeProjId) || projects[0];
      if (proj) {
        this.currentProject = proj;
        const saved = loadPersistedState(proj.id);
        // MEASURED IN THE BROWSER (multi-project acceptance): the fallback used
        // to be `serializeDomain(this)` — the class fields, which are the DEMO.
        // A real wedding legitimately has no places, no agents and no phases,
        // and `emptyListMeansUnset` turns those empty lists into "absent", so
        // after a reload the demo estate came back and 20 demo guests appeared
        // in someone else's wedding. The fallback now depends on the project:
        // the demo falls back to the demo, a real wedding to an empty world.
        const fallback = proj.isDemo ? serializeDomain(this) : createEmptyDomainState();
        // A real project with no snapshot yet must also start empty, not with
        // the constants the class was constructed with.
        this.lastRestoreReport = applyDomain(this, saved ?? null, fallback);
        this.ensureIdentityModel();
      }
    } catch (error) {
      reportDiagnostic({ source: 'store', severity: 'error', code: 'store_persist_failed', error });
    }
  }

  // =========================================================================
  // CANVAS MUTATIONS
  //
  // Every one of these VALIDATES before touching the store, returns a
  // structured outcome, and persists. A projection never writes its own copy.
  // =========================================================================

  /**
   * Open the composition surface WITHOUT changing projection.
   *
   * Phase D forced `projection = 'world'`, which threw an editorial user back
   * into the 3D scene the moment they clicked "Modifier". The Canvas is a mode,
   * not a place: it now composes on top of whichever projection is open, and
   * the shell adapts (side panel over World, editorial surface inside Mirror).
   */
  /**
   * THE single entry point for "create my wedding".
   *
   * Every call-to-action — landing navigation, hero, end of page, brand menu —
   * goes through this one method, so there is exactly one creation flow and it
   * is the one already validated by the multi-project acceptance pass.
   */
  public startWeddingCreation(): void {
    this.brandMenuOpen = false;
    this.worldLabModalOpen = false;
    // Two doors, one room. From the public site (or before any wedding is
    // open) the editorial surface opens; from inside the 3D world the existing
    // spatial panel stays. Both end on createRealWedding.
    if (!this.projectChosen || this.projection === 'mirror') {
      this.weddingCreationOpen = true;
      this.createWeddingModalOpen = false;
    } else {
      this.createWeddingModalOpen = true;
    }
    this.notify();
  }

  /** Leave the creation surface without creating anything. */
  public cancelWeddingCreation(): void {
    this.weddingCreationOpen = false;
    this.createWeddingModalOpen = false;
    this.notify();
  }

  /** A wedding is now open: the landing must step aside. */
  private markProjectChosen(): void {
    this.projectChosen = true;
  }

  /**
   * Close the current wedding and go back to the public site.
   *
   * MEASURED IN THE BROWSER (journey acceptance): after the first wedding was
   * opened, nothing in the product led back to the landing and its
   * "Mes mariages" list — the only exit was clearing the browser storage.
   *
   * This is a NAVIGATION, not a deletion: every project and every snapshot
   * stays exactly where it is. Only "which wedding is open" is forgotten, and
   * the selections that belong to that wedding are dropped so no id survives
   * into the next one.
   */
  public returnToLanding(): void {
    this.saveCurrentState();
    clearActiveProjectId();
    this.projectChosen = false;
    this.projection = 'mirror';
    this.canvasOpen = false;
    this.canvasFocus = null;
    this.canvasSection = null;
    this.selectedEntity = null;
    this.mirrorFocusPersonId = null;
    this.interiorMode = false;
    this.brandMenuOpen = false;
    this.weddingCreationOpen = false;
    this.createWeddingModalOpen = false;
    this.notify();
  }

  public openCanvas(
    focus?: { kind: 'event' | 'person' | 'vendor' | 'place' | 'song'; id: string },
    section?: CanvasSection,
  ): void {
    this.canvasOpen = true;
    this.showIdentityModal = false;
    if (focus) this.canvasFocus = focus;
    // A section hint lets the Mirror open the Canvas ALREADY on the matching
    // surface ("Composer" in 04 LIEUX opens 04 Lieux), with no extra
    // navigation. An entity focus still wins, since it is more specific.
    if (section) { this.canvasSection = section; this.canvasIntent++; }
    else if (focus) { this.canvasSection = null; this.canvasIntent++; }
    this.notify();
  }

  /** Which shell should wrap the Canvas core, derived from the active projection. */
  public getCanvasShell(): 'world' | 'mirror' {
    return this.projection === 'mirror' ? 'mirror' : 'world';
  }

  public closeCanvas(): void {
    this.canvasOpen = false;
    this.notify();
  }

  public setCanvasFocus(focus: { kind: 'event' | 'person' | 'vendor' | 'place' | 'song'; id: string } | null): void {
    this.canvasFocus = focus;
    this.notify();
  }



  // --- D2: moments ---------------------------------------------------------

  public setPhaseTitle(phaseId: string, name: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase || !name.trim()) return false;
    this.beginMutation('Renommer le moment');
    phase.name = name.trim();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setPhaseNotes(phaseId: string, notes: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    this.beginMutation('Note du moment');
    phase.notes = notes.trim() || undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Move a moment in time. Refuses an inverted or out-of-day window. */
  public setPhaseTime(phaseId: string, startHour: number, endHour?: number): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    const duration = endHour !== undefined ? endHour - startHour : phase.endHour - phase.startHour;
    if (!this.canPlacePhase(startHour, duration)) return false;
    this.beginMutation('Déplacer le moment');
    this.applyPhaseTime(phase, startHour, duration);
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Single validation rule for every temporal move. */
  private canPlacePhase(startHour: number, duration: number): boolean {
    if (!Number.isFinite(startHour) || !Number.isFinite(duration) || duration <= 0) return false;
    return startHour >= 0 && startHour + duration <= 30;
  }

  private applyPhaseTime(phase: { startHour: number; endHour: number }, startHour: number, duration: number): void {
    phase.startHour = startHour;
    phase.endHour = startHour + duration;
  }

  /**
   * Move a moment to another position in the programme (drag & drop, or the
   * keyboard equivalent).
   *
   * WHAT IT DOES, EXACTLY: the moments are re-chained in the new order from the
   * earliest existing start time, and EACH MOMENT KEEPS ITS OWN DURATION.
   * Nothing is invented — no new hour appears out of thin air, the first start
   * and every duration come from the data — and the result can never overlap.
   *
   * One `beginMutation`, so the whole move is a single undo step; one save, so
   * it survives a reload; one `notify`, so World, Mirror and Canvas re-derive
   * together.
   *
   * Returns false when the move is impossible or would change nothing.
   */
  public movePhaseToIndex(phaseId: string, targetIndex: number): boolean {
    const ordered = [...this.phases].sort((a, b) => a.startHour - b.startHour);
    const from = ordered.findIndex((p) => p.id === phaseId);
    if (from < 0) return false;
    const to = Math.max(0, Math.min(ordered.length - 1, Math.trunc(targetIndex)));
    if (to === from) return false;

    const reordered = [...ordered];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const durations = new Map(ordered.map((p) => [p.id, p.endHour - p.startHour]));
    const firstStart = ordered[0].startHour;

    // Validate the whole plan BEFORE touching anything: a refused move must
    // leave the programme exactly as it was.
    let cursor = firstStart;
    for (const p of reordered) {
      const duration = durations.get(p.id) ?? 0;
      if (!this.canPlacePhase(cursor, duration)) return false;
      cursor += duration;
    }

    this.beginMutation('Réordonner le programme');
    cursor = firstStart;
    for (const p of reordered) {
      const duration = durations.get(p.id) ?? 0;
      this.applyPhaseTime(p, cursor, duration);
      cursor += duration;
    }
    this.saveCurrentState();
    this.notify();
    return true;
  }

  // =========================================================================
  // THE MOMENT IS THE PRODUCT
  //
  // A wedding is built one moment at a time, from an empty day. Everything
  // below writes to the SAME phases array the World and the Mirror already
  // read, so a moment created here exists everywhere at once. Nothing is ever
  // pre-filled: a new moment carries only what the couple typed.
  // =========================================================================

  /**
   * Create a moment on the day.
   *
   * `startHour` and `durationHours` are real numbers of hours (14.5 = 14:30).
   * The moment is placed exactly where it is asked to be; it is NOT chained
   * after the previous one, because two moments can legitimately overlap
   * (the photographer shoots while the room is being set up).
   */
  public createPhase(input: {
    name: string;
    startHour: number;
    durationHours?: number;
    subtitle?: string;
    placeId?: string | null;
  }): TimelinePhase | null {
    const name = input.name?.trim();
    if (!name) return null;
    const duration = input.durationHours && input.durationHours > 0 ? input.durationHours : 1;
    if (!this.canPlacePhase(input.startHour, duration)) return null;

    this.beginMutation('Ajouter un moment');
    const phase: TimelinePhase = {
      id: freshId('phase'),
      startHour: input.startHour,
      endHour: input.startHour + duration,
      name,
      subtitle: input.subtitle?.trim() || '',
      icon: 'moment',
      primaryPlaceId: input.placeId && this.places.some((p) => p.id === input.placeId) ? input.placeId : '',
      highlightAction: '',
      bgAtmosphere: atmosphereForHour(input.startHour),
      keyAgentIds: [],
      keyDocIds: [],
      keyTaskIds: [],
      ambientTrack: 'prep',
    };
    this.phases.push(phase);
    this.phases.sort((a, b) => a.startHour - b.startHour);
    this.saveCurrentState();
    this.notify();
    return phase;
  }

  /** Remove a moment. What was attached to it survives; only the link goes. */
  public deletePhase(phaseId: string): boolean {
    const idx = this.phases.findIndex((p) => p.id === phaseId);
    if (idx < 0) return false;
    this.beginMutation('Supprimer le moment');
    this.phases.splice(idx, 1);
    for (const t of this.tracks) if (t.linkedPhaseId === phaseId) t.linkedPhaseId = undefined;
    for (const t of this.tasks) if (t.phaseId === phaseId) t.phaseId = undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /**
   * Move a moment in time AND carry everything that follows it.
   *
   * This is the chain the day really has: pushing the dinner back pushes the
   * speeches, the cake and the first dance with it. The shift is computed from
   * the moment's own displacement and applied to every LATER moment, in one
   * undo step. Returns the ids that moved with it, so the interface can say
   * exactly what happened instead of guessing.
   */
  public shiftPhaseAndFollowing(phaseId: string, newStartHour: number): { moved: string[] } | null {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return null;
    const delta = newStartHour - phase.startHour;
    if (!Number.isFinite(delta) || Math.abs(delta) < 1e-6) return null;

    const followers = this.phases.filter((p) => p.id !== phaseId && p.startHour >= phase.startHour);
    const plan = [phase, ...followers];
    for (const p of plan) {
      if (!this.canPlacePhase(p.startHour + delta, p.endHour - p.startHour)) return null;
    }

    this.beginMutation('Décaler le moment et la suite');
    for (const p of plan) this.applyPhaseTime(p, p.startHour + delta, p.endHour - p.startHour);
    this.phases.sort((a, b) => a.startHour - b.startHour);
    this.saveCurrentState();
    this.notify();
    return { moved: followers.map((p) => p.id) };
  }

  /**
   * Carry the moments that come AFTER one, by the same delta.
   *
   * Called when the couple accepts the proposal shown after a move ("décaler
   * aussi les 3 moments suivants ?"). The consequence is never applied
   * silently — the timeline asks first, this executes the answer.
   */
  public shiftPhasesAfter(phaseId: string, delta: number): { moved: string[] } | null {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase || !Number.isFinite(delta) || Math.abs(delta) < 1e-6) return null;
    // "After" is judged on where the moved moment came FROM, so a moment
    // dragged later still carries the ones that used to follow it.
    const origin = phase.startHour - delta;
    const followers = this.phases.filter((p) => p.id !== phaseId && p.startHour >= origin);
    if (followers.length === 0) return null;
    for (const p of followers) {
      if (!this.canPlacePhase(p.startHour + delta, p.endHour - p.startHour)) return null;
    }
    this.beginMutation('Décaler la suite de la journée');
    for (const p of followers) this.applyPhaseTime(p, p.startHour + delta, p.endHour - p.startHour);
    this.phases.sort((a, b) => a.startHour - b.startHour);
    this.saveCurrentState();
    this.notify();
    return { moved: followers.map((p) => p.id) };
  }

  /** Which moments a move would carry, without moving anything. */
  public phasesAfter(phaseId: string): TimelinePhase[] {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return [];
    return this.phases
      .filter((p) => p.id !== phaseId && p.startHour >= phase.startHour)
      .sort((a, b) => a.startHour - b.startHour);
  }

  /** Change only the length of a moment. */
  public setPhaseDuration(phaseId: string, durationHours: number): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    if (!this.canPlacePhase(phase.startHour, durationHours)) return false;
    this.beginMutation('Durée du moment');
    this.applyPhaseTime(phase, phase.startHour, durationHours);
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setPhaseSubtitle(phaseId: string, subtitle: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    this.beginMutation('Description du moment');
    phase.subtitle = subtitle.trim();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  // --- the moment's dimensions --------------------------------------------

  public attachPersonToPhase(phaseId: string, personId: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase || !this.persons.some((p) => p.id === personId)) return false;
    const current = phase.personIds ?? [];
    if (current.includes(personId)) return true;
    this.beginMutation('Ajouter une personne au moment');
    phase.personIds = [...current, personId];
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public detachPersonFromPhase(phaseId: string, personId: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase?.personIds?.includes(personId)) return false;
    this.beginMutation('Retirer une personne du moment');
    phase.personIds = phase.personIds.filter((id) => id !== personId);
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public attachTrackToPhase(phaseId: string, trackId: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    const track = this.tracks.find((t) => t.id === trackId);
    if (!phase || !track) return false;
    const current = phase.trackIds ?? [];
    this.beginMutation('Musique du moment');
    if (!current.includes(trackId)) phase.trackIds = [...current, trackId];
    // One truth: the track also knows which moment it belongs to.
    track.linkedPhaseId = phaseId;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public detachTrackFromPhase(phaseId: string, trackId: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    this.beginMutation('Retirer le morceau du moment');
    phase.trackIds = (phase.trackIds ?? []).filter((id) => id !== trackId);
    const track = this.tracks.find((t) => t.id === trackId);
    if (track?.linkedPhaseId === phaseId) track.linkedPhaseId = undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** A task written on a moment. `dueHour` defaults to the moment's start. */
  public createTaskForPhase(phaseId: string, title: string, cost?: number): TaskEntity | null {
    const phase = this.phases.find((p) => p.id === phaseId);
    const clean = title?.trim();
    if (!phase || !clean) return null;
    this.beginMutation('Ajouter une tâche');
    const task: TaskEntity = {
      id: freshId('task'),
      title: clean,
      category: 'logistique',
      phaseId,
      dueHour: phase.startHour,
      isDone: false,
      urgent: false,
      cost: Number.isFinite(cost) && (cost as number) > 0 ? cost : undefined,
      sourceOrigin: 'USER',
      connectedDocIds: [],
      connectedAgentIds: [],
    };
    this.tasks.push(task);
    phase.taskIds = [...(phase.taskIds ?? []), task.id];
    phase.keyTaskIds = [...(phase.keyTaskIds ?? []), task.id];
    this.saveCurrentState();
    this.notify();
    return task;
  }

  /**
   * The real length of a track, as written on the sleeve ("3:45").
   *
   * It matters temporally: the hub compares the music asked for to the length
   * of the moment, and offers to lengthen the moment when the two disagree.
   */
  public setTrackDuration(trackId: string, duration: string): boolean {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return false;
    const clean = duration.trim();
    if (clean && !/^\d{1,2}:[0-5]\d$/.test(clean)) return false;
    this.beginMutation('Durée du morceau');
    track.duration = clean;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public toggleTaskDone(taskId: string): boolean {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return false;
    this.beginMutation('Tâche faite');
    task.isDone = !task.isDone;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Free lines: the shots the couple really asked for. */
  public addPhaseShot(phaseId: string, shot: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    const clean = shot?.trim();
    if (!phase || !clean) return false;
    this.beginMutation('Ajouter un plan à photographier');
    phase.shots = [...(phase.shots ?? []), clean];
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public removePhaseShot(phaseId: string, index: number): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase?.shots || index < 0 || index >= phase.shots.length) return false;
    this.beginMutation('Retirer un plan');
    phase.shots = phase.shots.filter((_, i) => i !== index);
    if (phase.shots.length === 0) phase.shots = undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setPhaseMeal(phaseId: string, meal: { menu?: string; allergies?: string; headcount?: number }): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    this.beginMutation('Repas du moment');
    const next = { ...(phase.meal ?? {}), ...meal };
    const cleaned = {
      menu: next.menu?.trim() || undefined,
      allergies: next.allergies?.trim() || undefined,
      headcount: Number.isFinite(next.headcount) && (next.headcount as number) > 0 ? next.headcount : undefined,
    };
    phase.meal = cleaned.menu || cleaned.allergies || cleaned.headcount ? cleaned : undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setPhaseLogistics(phaseId: string, logistics: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    this.beginMutation('Logistique du moment');
    phase.logistics = logistics.trim() || undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setPhaseBudget(phaseId: string, budget: { amount?: number; deposit?: number; paid?: boolean }): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    this.beginMutation('Budget du moment');
    const next = { ...(phase.budget ?? {}), ...budget };
    const amount = Number.isFinite(next.amount) && (next.amount as number) >= 0 ? next.amount : undefined;
    const deposit = Number.isFinite(next.deposit) && (next.deposit as number) >= 0 ? next.deposit : undefined;
    phase.budget = amount !== undefined || deposit !== undefined || next.paid
      ? { amount, deposit, paid: next.paid }
      : undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** What the day costs, summed from what was really entered on the moments. */
  public getTimelineBudget(): { committed: number; deposits: number; paid: number; withBudget: number } {
    let committed = 0; let deposits = 0; let paid = 0; let withBudget = 0;
    for (const p of this.phases) {
      if (!p.budget) continue;
      withBudget++;
      committed += p.budget.amount ?? 0;
      deposits += p.budget.deposit ?? 0;
      if (p.budget.paid) paid += p.budget.amount ?? 0;
    }
    return { committed, deposits, paid, withBudget };
  }

  /** Attach a media already in the project to a moment (re-owning it). */
  public attachMediaToPhase(mediaId: string, phaseId: string): boolean {
    const asset = this.media.find((m) => m.id === mediaId);
    if (!asset || !this.phases.some((p) => p.id === phaseId)) return false;
    this.beginMutation('Rattacher le document au moment');
    asset.ownerKind = 'event';
    asset.ownerId = phaseId;
    asset.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Everything hanging on a moment, resolved. Pure read, no invention. */
  public getPhaseHub(phaseId: string) {
    const phase = this.phases.find((p) => p.id === phaseId) ?? null;
    if (!phase) return null;
    const persons = (phase.personIds ?? [])
      .map((id) => this.persons.find((p) => p.id === id))
      .filter(Boolean);
    const vendors = (phase.vendorIds ?? [])
      .map((id) => this.vendors.find((v) => v.id === id))
      .filter(Boolean);
    const tracks = this.tracks.filter(
      (t) => (phase.trackIds ?? []).includes(t.id) || t.linkedPhaseId === phase.id,
    );
    const tasks = this.tasks.filter((t) => t.phaseId === phase.id);
    const media = this.media.filter((m) => m.ownerKind === 'event' && m.ownerId === phase.id);
    const place = this.places.find((p) => p.id === phase.primaryPlaceId) ?? null;
    return { phase, persons, vendors, tracks, tasks, media, place };
  }

  /**
   * Turn a validated intake plan into the project itself.
   *
   * The plan comes from projectIntake (pure reading) AND from the corrections
   * the user made on screen: only the items still marked `keep` are created.
   * One mutation, one save — so the whole "chaos → journée" step is a single
   * undo, and a reload gives back exactly this.
   *
   * It creates NOTHING that is not in the plan: no default moment, no filler
   * guest, no invented venue.
   */
  public applyIntakePlan(plan: IntakePlan): {
    phases: number; people: number; vendors: number; places: number; tracks: number;
  } {
    this.beginMutation('Construire la journée à partir des documents');
    const out = { phases: 0, people: 0, vendors: 0, places: 0, tracks: 0 };

    for (const place of plan.places.filter((x) => x.keep)) {
      if (this.createPlaceSilently(place.name)) out.places++;
    }

    for (const moment of plan.moments.filter((m) => m.keep)) {
      const duration = Math.max(0.25, moment.endHour - moment.startHour);
      if (!this.canPlacePhase(moment.startHour, duration)) continue;
      const phase: TimelinePhase = {
        id: freshId('phase'),
        startHour: moment.startHour,
        endHour: moment.startHour + duration,
        name: moment.label,
        subtitle: '',
        icon: 'moment',
        primaryPlaceId: '',
        highlightAction: '',
        bgAtmosphere: atmosphereForHour(moment.startHour),
        keyAgentIds: [], keyDocIds: [], keyTaskIds: [],
        ambientTrack: 'prep',
      };
      this.phases.push(phase);
      out.phases++;
    }
    this.phases.sort((a, b) => a.startHour - b.startHour);

    for (const person of plan.people.filter((x) => x.keep)) {
      if (this.intakePerson(person.name)) out.people++;
    }
    for (const vendor of plan.vendors.filter((x) => x.keep)) {
      if (this.createVendorSilently(vendor.name)) out.vendors++;
    }
    for (const track of plan.tracks.filter((x) => x.keep)) {
      if (this.createTrackSilently(track.title, track.artist)) out.tracks++;
    }

    if (plan.guestCountTarget && this.currentProject) {
      this.currentProject = { ...this.currentProject, guestCountTarget: plan.guestCountTarget };
      saveWeddingProject(this.currentProject);
    }

    this.ensureIdentityModel();
    this.saveCurrentState();
    this.notify();
    return out;
  }

  /**
   * Same shape as createPlace(), minus its own undo step: the whole intake is
   * ONE mutation. Refuses a name that already exists, so re-reading the same
   * documents never duplicates a venue.
   */
  private createPlaceSilently(name: string): Place | null {
    const clean = name?.trim();
    if (!clean) return null;
    if (this.places.some((p) => p.name.toLowerCase() === clean.toLowerCase())) return null;
    const index = this.places.length;
    const angle = (index / 12) * Math.PI * 2;
    const place: Place = {
      id: freshId('place'),
      name: clean,
      code: clean.slice(0, 12).toUpperCase(),
      kind: 'other',
      zone: 'manoir',
      pos: [Math.cos(angle) * 34, 0, Math.sin(angle) * 34],
      gpsCoordinates: '',
      capacity: 0,
      currentPax: 0,
      description: '',
      icon: 'manoir',
      themeColor: BRAND_ACCENT,
      activeFromHour: 10,
      activeToHour: 24,
      connectedAgentIds: [],
      connectedDocIds: [],
      connectedTaskIds: [],
    };
    this.places.push(place);
    return place;
  }

  /** Reuses the existing silent person factory, and refuses a duplicate name. */
  private intakePerson(displayName: string): Person | null {
    const clean = displayName?.trim();
    if (!clean) return null;
    if (this.persons.some((p) => p.displayName.toLowerCase() === clean.toLowerCase())) return null;
    const at = new Date().toISOString();
    const person = this.createPersonSilently(clean);
    this.guests.push({
      id: freshId('guest'),
      projectId: this.currentProject.id,
      personId: person.id,
      rsvp: { status: 'pending', plusOnes: 0 },
      seating: {},
      side: 'both',
      origin: 'manual',
      createdAt: at, updatedAt: at,
    });
    return person;
  }

  private createVendorSilently(companyName: string): Vendor | null {
    const clean = companyName?.trim();
    if (!clean) return null;
    if (this.vendors.some((v) => v.companyName.toLowerCase() === clean.toLowerCase())) return null;
    const at = new Date().toISOString();
    const vendor: Vendor = {
      id: freshId('vendor'),
      projectId: this.currentProject.id,
      companyName: clean,
      category: 'autre',
      status: 'prospect',
      documentIds: [], taskIds: [], placeIds: [],
      origin: 'manual',
      createdAt: at, updatedAt: at,
    };
    this.vendors.push(vendor);
    return vendor;
  }

  private createTrackSilently(title: string, artist: string): TrackEntity | null {
    const t = title?.trim();
    if (!t) return null;
    if (this.tracks.some((x) => x.title.toLowerCase() === t.toLowerCase())) return null;
    const track: TrackEntity = {
      id: freshId('trk'), title: t, artist: artist?.trim() || '—',
      moment: 'soiree', status: 'pending', bpm: 0, energy: 3, duration: '',
      suggestedBy: 'Import', votes: 0,
    };
    this.tracks.push(track);
    return track;
  }

  // =========================================================================
  // SPECTACLE — those who make the moment happen.
  //
  // NO NEW ENTITY (see docs/AUDIT-SPECTACLE.md): a performer is a Person with a
  // craft, their presence is the moment they are attached to, their contract is
  // a MediaAsset, their setup is a Task. The call sheet below is a PROJECTION —
  // never stored — so moving a moment recomputes every road map at once.
  // =========================================================================

  /** Give a person a craft, or correct it. Everything is optional. */
  public setPersonCraft(personId: string, patch: Partial<PersonCraft>): boolean {
    const person = this.persons.find((p) => p.id === personId);
    if (!person) return false;
    const role = (patch.role ?? person.craft?.role ?? '').trim();
    if (!role) return false;
    this.beginMutation('Métier de la personne');
    const next: PersonCraft = { ...(person.craft ?? { role }), ...patch, role };
    // Empty strings are absences, not values.
    for (const key of ['speciality', 'status', 'zone', 'fee', 'notes', 'professionalNumber', 'vendorId'] as const) {
      const value = next[key];
      if (typeof value === 'string' && !value.trim()) delete next[key];
    }
    person.craft = next;
    person.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public removePersonCraft(personId: string): boolean {
    const person = this.persons.find((p) => p.id === personId);
    if (!person?.craft) return false;
    this.beginMutation('Retirer le métier');
    person.craft = undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public addCraftRequirement(personId: string, requirement: string): boolean {
    const person = this.persons.find((p) => p.id === personId);
    const clean = requirement?.trim();
    if (!person?.craft || !clean) return false;
    this.beginMutation('Besoin technique');
    person.craft.requirements = [...(person.craft.requirements ?? []), clean];
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public removeCraftRequirement(personId: string, index: number): boolean {
    const person = this.persons.find((p) => p.id === personId);
    const list = person?.craft?.requirements;
    if (!person?.craft || !list || index < 0 || index >= list.length) return false;
    this.beginMutation('Retirer un besoin technique');
    person.craft.requirements = list.filter((_, i) => i !== index);
    if (person.craft.requirements.length === 0) person.craft.requirements = undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Everyone who works the day: a person with a craft. */
  public getCrew(): Person[] {
    return this.persons
      .filter((p) => Boolean(p.craft?.role))
      .sort((a, b) => (a.craft!.role).localeCompare(b.craft!.role, 'fr'));
  }

  /** The crew expected at one moment. */
  public getCrewForPhase(phaseId: string): Person[] {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return [];
    return (phase.personIds ?? [])
      .map((id) => this.persons.find((p) => p.id === id))
      .filter((p): p is Person => Boolean(p?.craft?.role));
  }

  /**
   * « MA JOURNÉE » — one person's road map, derived from the timeline.
   *
   * Arrival, setup and teardown appear ONLY when the person declared how long
   * they need: no default 30 minutes is invented. Every row carries the id of
   * the moment it comes from, so nothing here is a copy.
   */
  public getCallSheet(personId: string): {
    person: Person;
    rows: { hour: number; label: string; kind: 'setup' | 'moment' | 'teardown'; phaseId?: string; placeName?: string }[];
    firstHour: number | null;
    lastHour: number | null;
  } | null {
    const person = this.persons.find((p) => p.id === personId);
    if (!person) return null;

    const moments = this.phases
      .filter((p) => (p.personIds ?? []).includes(personId))
      .sort((a, b) => a.startHour - b.startHour);

    const rows: { hour: number; label: string; kind: 'setup' | 'moment' | 'teardown'; phaseId?: string; placeName?: string }[] = [];
    const placeName = (id: string) => this.places.find((pl) => pl.id === id)?.name;

    if (moments.length > 0) {
      const setup = person.craft?.setupMinutes;
      if (setup && setup > 0) {
        rows.push({
          hour: moments[0].startHour - setup / 60,
          label: `Arrivée et installation (${setup} min)`,
          kind: 'setup',
          placeName: placeName(moments[0].primaryPlaceId),
        });
      }
      for (const m of moments) {
        rows.push({ hour: m.startHour, label: m.name, kind: 'moment', phaseId: m.id, placeName: placeName(m.primaryPlaceId) });
      }
      const teardown = person.craft?.teardownMinutes;
      const last = moments[moments.length - 1];
      if (teardown && teardown > 0) {
        rows.push({ hour: last.endHour, label: `Démontage (${teardown} min)`, kind: 'teardown', placeName: placeName(last.primaryPlaceId) });
      }
    }

    rows.sort((a, b) => a.hour - b.hour);
    return {
      person,
      rows,
      firstHour: rows.length ? rows[0].hour : null,
      lastHour: rows.length ? rows[rows.length - 1].hour : null,
    };
  }

  /**
   * What the crew makes visible: someone expected in two places at once, a
   * craft with no moment, a declared need nobody has answered.
   *
   * Read-only, deterministic, and silent when there is nothing to say.
   */
  public crewFindings(): { level: 'conflict' | 'gap'; personId: string; title: string; detail: string }[] {
    const out: { level: 'conflict' | 'gap'; personId: string; title: string; detail: string }[] = [];
    const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

    for (const person of this.getCrew()) {
      const moments = this.phases
        .filter((p) => (p.personIds ?? []).includes(person.id))
        .sort((a, b) => a.startHour - b.startHour);

      for (let i = 0; i < moments.length - 1; i++) {
        if (moments[i].endHour > moments[i + 1].startHour + 1e-6) {
          out.push({
            level: 'conflict',
            personId: person.id,
            title: `${person.displayName} est attendu·e à deux endroits`,
            detail: `${moments[i].name} finit à ${clock(moments[i].endHour)} et ${moments[i + 1].name} commence à ${clock(moments[i + 1].startHour)}.`,
          });
        }
      }

      const setup = person.craft?.setupMinutes ?? 0;
      if (setup > 0 && moments.length > 0 && moments[0].startHour - setup / 60 < 0) {
        out.push({
          level: 'conflict',
          personId: person.id,
          title: `${person.displayName} n’a pas le temps de s’installer`,
          detail: `${setup} min d’installation avant ${clock(moments[0].startHour)} sortent de la journée.`,
        });
      }

      if (moments.length === 0) {
        out.push({
          level: 'gap',
          personId: person.id,
          title: `${person.displayName} n’est rattaché·e à aucun moment`,
          detail: `${person.craft?.role} sans horaire : personne ne saura quand l’attendre.`,
        });
      }

      const hasContract = this.media.some((m) => m.ownerKind === 'person' && m.ownerId === person.id);
      if (!hasContract && moments.length > 0) {
        out.push({
          level: 'gap',
          personId: person.id,
          title: `Aucun document pour ${person.displayName}`,
          detail: 'Contrat, fiche technique ou fiche de route : rien n’est rattaché à cette personne.',
        });
      }

      if (!person.craft?.requirements || person.craft.requirements.length === 0) {
        out.push({
          level: 'gap',
          personId: person.id,
          title: `Besoins techniques non déclarés — ${person.displayName}`,
          detail: 'Son, lumière, électricité, loge, repas : rien n’a été écrit, donc rien ne peut être vérifié.',
        });
      }
    }
    return out;
  }

  /** Who is working between two hours — the question the day J asks. */
  public whoWorksBetween(fromHour: number, toHour: number): {
    person: Person; moments: string[];
  }[] {
    const out: { person: Person; moments: string[] }[] = [];
    for (const person of this.getCrew()) {
      const moments = this.phases
        .filter((p) => (p.personIds ?? []).includes(person.id))
        .filter((p) => p.startHour < toHour && p.endHour > fromHour)
        .sort((a, b) => a.startHour - b.startHour);
      if (moments.length > 0) out.push({ person, moments: moments.map((m) => m.name) });
    }
    return out;
  }

  /**
   * UNIVERSAL SEARCH — one query, every kind of thing in the project.
   *
   * Reads only what exists: no ranking model, no fuzzy magic, no web. Each
   * result says where it lives, so a person is a door into their context.
   */
  public searchEverything(query: string): {
    kind: 'person' | 'moment' | 'place' | 'vendor' | 'track' | 'document' | 'task' | 'table';
    id: string; label: string; context: string;
  }[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hit = (s?: string) => Boolean(s && s.toLowerCase().includes(q));
    const out: {
      kind: 'person' | 'moment' | 'place' | 'vendor' | 'track' | 'document' | 'task' | 'table';
      id: string; label: string; context: string;
    }[] = [];
    const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

    for (const p of this.persons) {
      // A craft is searchable: « saxophoniste », « intermittent », « lumière ».
      const craft = p.craft;
      if (!hit(p.displayName) && !hit(p.email) && !hit(p.phone)
        && !hit(craft?.role) && !hit(craft?.speciality) && !hit(craft?.status)
        && !(craft?.requirements ?? []).some((r) => hit(r))) continue;
      const moments = this.phases.filter((ph) => (ph.personIds ?? []).includes(p.id));
      const guest = this.guests.find((g) => g.personId === p.id);
      const table = guest?.seating.tableId
        ? this.seatingTables.find((t) => t.id === guest.seating.tableId)?.label
        : null;
      out.push({
        kind: 'person', id: p.id, label: craft?.role ? `${p.displayName} · ${craft.role}` : p.displayName,
        context: [
          craft?.status,
          moments.length ? `${moments.length} moment${moments.length > 1 ? 's' : ''} : ${moments.map((m) => m.name).join(', ')}` : 'aucun moment',
          table ? `table ${table}` : null,
        ].filter(Boolean).join(' · '),
      });
    }
    for (const ph of this.phases) {
      if (!hit(ph.name) && !hit(ph.subtitle)) continue;
      out.push({ kind: 'moment', id: ph.id, label: ph.name, context: `${clock(ph.startHour)} → ${clock(ph.endHour)}` });
    }
    for (const pl of this.places) {
      if (!hit(pl.name) && !hit(pl.address)) continue;
      const used = this.phases.filter((ph) => ph.primaryPlaceId === pl.id);
      out.push({ kind: 'place', id: pl.id, label: pl.name, context: used.length ? used.map((u) => u.name).join(', ') : 'aucun moment' });
    }
    for (const v of this.vendors) {
      if (!hit(v.companyName) && !hit(v.email) && !hit(v.phone)) continue;
      const covers = this.phases.filter((ph) => (ph.vendorIds ?? []).includes(v.id));
      out.push({
        kind: 'vendor', id: v.id, label: v.companyName,
        context: covers.length
          ? `${clock(covers[0].startHour)} → ${clock(covers[covers.length - 1].endHour)} · ${covers.map((c) => c.name).join(', ')}`
          : 'aucun moment',
      });
    }
    for (const t of this.tracks) {
      if (!hit(t.title) && !hit(t.artist)) continue;
      const phase = this.phases.find((ph) => ph.id === t.linkedPhaseId);
      out.push({ kind: 'track', id: t.id, label: `${t.title} · ${t.artist}`, context: phase ? phase.name : 'hors programme' });
    }
    for (const m of this.media) {
      if (!hit(m.title) && !hit(m.fileName)) continue;
      const phase = m.ownerKind === 'event' ? this.phases.find((ph) => ph.id === m.ownerId) : null;
      out.push({ kind: 'document', id: m.id, label: m.title || m.fileName || 'Document', context: phase ? phase.name : m.ownerKind });
    }
    for (const t of this.tasks) {
      if (!hit(t.title)) continue;
      const phase = this.phases.find((ph) => ph.id === t.phaseId);
      out.push({ kind: 'task', id: t.id, label: t.title, context: phase ? phase.name : 'sans moment' });
    }
    for (const t of this.seatingTables) {
      if (!hit(t.label)) continue;
      const { seated, capacity } = this.getTableOccupancy(t.id);
      out.push({ kind: 'table', id: t.id, label: t.label, context: `${seated}/${capacity} places` });
    }
    return out.slice(0, 40);
  }

  /**
   * PROJECT INTELLIGENCE — what is missing, what contradicts itself.
   *
   * Deterministic reading of the real data. No model, no guess: every line is
   * a fact about the project, with the number that produced it.
   */
  public projectFindings(): { level: 'gap' | 'conflict' | 'ok'; title: string; detail: string }[] {
    const out: { level: 'gap' | 'conflict' | 'ok'; title: string; detail: string }[] = [];
    const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
    const phases = [...this.phases].sort((a, b) => a.startHour - b.startHour);

    if (phases.length === 0) {
      out.push({ level: 'gap', title: 'La journée est vide', detail: 'Aucun moment n’est posé : la pellicule attend le premier.' });
    }
    for (let i = 0; i < phases.length - 1; i++) {
      if (phases[i].endHour > phases[i + 1].startHour + 1e-6) {
        out.push({
          level: 'conflict',
          title: `${phases[i].name} et ${phases[i + 1].name} se chevauchent`,
          detail: `${clock(phases[i].startHour)}–${clock(phases[i].endHour)} contre ${clock(phases[i + 1].startHour)}–${clock(phases[i + 1].endHour)}.`,
        });
      }
      const gap = phases[i + 1].startHour - phases[i].endHour;
      if (gap > 2) {
        out.push({
          level: 'gap',
          title: `${Math.round(gap * 10) / 10} h sans rien entre ${phases[i].name} et ${phases[i + 1].name}`,
          detail: `De ${clock(phases[i].endHour)} à ${clock(phases[i + 1].startHour)}, aucun moment n’est prévu.`,
        });
      }
    }
    const noPlace = phases.filter((p) => !p.primaryPlaceId);
    if (noPlace.length > 0) {
      out.push({ level: 'gap', title: `${noPlace.length} moment(s) sans lieu`, detail: noPlace.map((p) => p.name).join(', ') });
    }
    const noPeople = phases.filter((p) => (p.personIds ?? []).length === 0);
    if (phases.length > 0 && noPeople.length === phases.length) {
      out.push({
        level: 'gap',
        title: 'Personne n’est rattaché à un moment',
        detail: 'Les personnes existent peut-être, mais aucune n’est attendue à une heure précise.',
      });
    }
    const unseated = this.guests.filter((g) => !g.seating.tableId);
    if (this.seatingTables.length > 0 && unseated.length > 0) {
      out.push({ level: 'gap', title: `${unseated.length} invité(s) sans table`, detail: 'Le plan de table n’est pas terminé.' });
    }
    for (const t of this.seatingTables) {
      const { seated, capacity } = this.getTableOccupancy(t.id);
      if (seated > capacity) {
        out.push({ level: 'conflict', title: `${t.label} dépasse sa capacité`, detail: `${seated} personnes pour ${capacity} places.` });
      }
    }
    const unattached = this.media.filter((m) => m.ownerKind === 'wedding');
    if (unattached.length > 0) {
      out.push({ level: 'gap', title: `${unattached.length} document(s) non rattaché(s)`, detail: 'Ils existent, mais aucun moment ne les porte.' });
    }
    const pending = this.tasks.filter((t) => !t.isDone);
    if (pending.length > 0) {
      out.push({ level: 'gap', title: `${pending.length} tâche(s) à faire`, detail: pending.slice(0, 3).map((t) => t.title).join(' · ') });
    }
    if (out.length === 0 && phases.length > 0) {
      out.push({ level: 'ok', title: 'Rien à signaler', detail: 'Aucun chevauchement, aucun trou, aucun dépassement de capacité.' });
    }
    return out;
  }

  // =========================================================================
  // SCÉNARIOS — a parallel day, next to the real one.
  //
  // TECHNICAL AUDIT BEHIND THIS DESIGN (see docs/AUDIT-V2.md):
  //   · source of truth  : this.phases, and nothing else;
  //   · snapshot         : serializeDomain/applyDomain already clone the whole
  //                        domain, so cloning the phases alone is safe and
  //                        cheap — a scenario is just that clone, with the
  //                        SAME ids so a difference reads moment by moment;
  //   · rollback         : discarding a scenario deletes the branch; nothing
  //                        else was ever touched;
  //   · propagation      : the branch reuses the same arithmetic as the real
  //                        timeline (shift the moment, carry the followers);
  //   · isolation        : scenarios live inside the project snapshot, so they
  //                        cannot travel between weddings;
  //   · duplication risk : none — no second timeline engine, no second store.
  //
  // THE RULE: the main timeline is never modified until the couple applies the
  // scenario — entirely, or one line at a time.
  // =========================================================================

  /** Branch the day. The scenario starts as an exact copy of today's plan. */
  public createScenario(name: string): TimelineScenario | null {
    const clean = name?.trim();
    if (!clean) return null;
    this.beginMutation('Créer un scénario');
    const scenario: TimelineScenario = {
      id: freshId('scen'),
      name: clean,
      createdAt: new Date().toISOString(),
      phases: clone(this.phases),
    };
    this.scenarios = [...this.scenarios, scenario];
    this.activeScenarioId = scenario.id;
    this.saveCurrentState();
    this.notify();
    return scenario;
  }

  public setActiveScenario(scenarioId: string | null): void {
    if (scenarioId && !this.scenarios.some((s) => s.id === scenarioId)) return;
    this.activeScenarioId = scenarioId;
    this.notify();
  }

  public renameScenario(scenarioId: string, name: string): boolean {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    const clean = name?.trim();
    if (!scenario || !clean) return false;
    this.beginMutation('Renommer le scénario');
    scenario.name = clean;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Delete a branch. The real day never knew it existed. */
  public discardScenario(scenarioId: string): boolean {
    const before = this.scenarios.length;
    this.beginMutation('Abandonner le scénario');
    this.scenarios = this.scenarios.filter((s) => s.id !== scenarioId);
    if (this.activeScenarioId === scenarioId) this.activeScenarioId = null;
    this.saveCurrentState();
    this.notify();
    return this.scenarios.length < before;
  }

  /**
   * Move a moment INSIDE a scenario. `withFollowing` carries everything that
   * came after it, exactly like the real timeline does.
   */
  public scenarioShiftPhase(
    scenarioId: string,
    phaseId: string,
    deltaHours: number,
    withFollowing = true,
  ): boolean {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    const phase = scenario?.phases.find((p) => p.id === phaseId);
    if (!scenario || !phase || !Number.isFinite(deltaHours) || Math.abs(deltaHours) < 1e-6) return false;

    const origin = phase.startHour;
    const targets = withFollowing
      ? scenario.phases.filter((p) => p.startHour >= origin)
      : [phase];
    for (const p of targets) {
      if (!this.canPlacePhase(p.startHour + deltaHours, p.endHour - p.startHour)) return false;
    }
    this.beginMutation('Modifier le scénario');
    for (const p of targets) this.applyPhaseTime(p, p.startHour + deltaHours, p.endHour - p.startHour);
    scenario.phases.sort((a, b) => a.startHour - b.startHour);
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Change a moment's place inside a scenario (the « plan B » case). */
  public scenarioSetPhasePlace(scenarioId: string, phaseId: string, placeId: string | null): boolean {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    const phase = scenario?.phases.find((p) => p.id === phaseId);
    if (!scenario || !phase) return false;
    if (placeId !== null && !this.places.some((p) => p.id === placeId)) return false;
    this.beginMutation('Lieu du scénario');
    phase.primaryPlaceId = placeId ?? '';
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** What this scenario would change, moment by moment. Pure read. */
  public scenarioDiff(scenarioId: string): {
    phaseId: string; name: string;
    fromStart: number; toStart: number; deltaMinutes: number;
    fromPlaceId: string; toPlaceId: string;
    changed: boolean;
  }[] {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return [];
    return scenario.phases.map((branch) => {
      const real = this.phases.find((p) => p.id === branch.id);
      const fromStart = real?.startHour ?? branch.startHour;
      const fromPlaceId = real?.primaryPlaceId ?? '';
      const deltaMinutes = Math.round((branch.startHour - fromStart) * 60);
      return {
        phaseId: branch.id,
        name: branch.name,
        fromStart,
        toStart: branch.startHour,
        deltaMinutes,
        fromPlaceId,
        toPlaceId: branch.primaryPlaceId,
        changed: deltaMinutes !== 0 || fromPlaceId !== branch.primaryPlaceId,
      };
    }).sort((a, b) => a.toStart - b.toStart);
  }

  /**
   * Bring a scenario into the real day — all of it, or only the moments given.
   * One mutation, so a single undo puts the day back exactly as it was.
   */
  public applyScenario(scenarioId: string, onlyPhaseIds?: string[]): { applied: string[] } | null {
    const scenario = this.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return null;
    const wanted = new Set(onlyPhaseIds ?? scenario.phases.map((p) => p.id));

    const plan = scenario.phases.filter((p) => wanted.has(p.id) && this.phases.some((r) => r.id === p.id));
    for (const p of plan) {
      if (!this.canPlacePhase(p.startHour, p.endHour - p.startHour)) return null;
    }

    this.beginMutation('Appliquer le scénario');
    const applied: string[] = [];
    for (const branch of plan) {
      const real = this.phases.find((p) => p.id === branch.id);
      if (!real) continue;
      const changed = real.startHour !== branch.startHour
        || real.endHour !== branch.endHour
        || real.primaryPlaceId !== branch.primaryPlaceId;
      real.startHour = branch.startHour;
      real.endHour = branch.endHour;
      real.primaryPlaceId = branch.primaryPlaceId;
      if (changed) applied.push(real.id);
    }
    this.phases.sort((a, b) => a.startHour - b.startHour);
    this.saveCurrentState();
    this.notify();
    return { applied };
  }

  /**
   * What a re-ordering WOULD do, without doing it.
   *
   * The Canvas asks before it moves: the user sees « Dîner 19:30 → 20:00 » for
   * every consequence, and validates. Pure read — same arithmetic as
   * movePhaseToIndex, no mutation, no save, no notify.
   */
  public previewMoveToIndex(phaseId: string, targetIndex: number): {
    id: string; name: string; from: number; to: number;
  }[] | null {
    const ordered = [...this.phases].sort((a, b) => a.startHour - b.startHour);
    const from = ordered.findIndex((p) => p.id === phaseId);
    if (from < 0) return null;
    const to = Math.max(0, Math.min(ordered.length - 1, Math.trunc(targetIndex)));
    if (to === from) return null;

    const reordered = [...ordered];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const durations = new Map(ordered.map((p) => [p.id, p.endHour - p.startHour]));
    let cursor = ordered[0].startHour;
    const out: { id: string; name: string; from: number; to: number }[] = [];
    for (const p of reordered) {
      const duration = durations.get(p.id) ?? 0;
      if (!this.canPlacePhase(cursor, duration)) return null;
      if (Math.abs(cursor - p.startHour) > 1e-6) {
        out.push({ id: p.id, name: p.name, from: p.startHour, to: cursor });
      }
      cursor += duration;
    }
    return out;
  }

  /** Attach a moment to a place. `null` detaches. */
  public setPhasePlace(phaseId: string, placeId: string | null): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    if (placeId !== null && !this.places.some((p) => p.id === placeId)) return false;
    this.beginMutation('Changer le lieu du moment');
    phase.primaryPlaceId = placeId ?? '';
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public attachVendorToPhase(phaseId: string, vendorId: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!phase || !vendor) return false;
    const current = phase.vendorIds ?? [];
    if (current.includes(vendorId)) return true;
    this.beginMutation('Associer un prestataire');
    phase.vendorIds = [...current, vendorId];
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public detachVendorFromPhase(phaseId: string, vendorId: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase?.vendorIds?.includes(vendorId)) return false;
    this.beginMutation('Retirer un prestataire');
    phase.vendorIds = phase.vendorIds.filter((id) => id !== vendorId);
    this.saveCurrentState();
    this.notify();
    return true;
  }

  // --- D3: people ----------------------------------------------------------

  /**
   * Create a real Person, optionally with its Guest facet.
   * Returns the person, or null when the input is invalid.
   */
  public createPerson(input: {
    displayName: string;
    givenName?: string;
    familyName?: string;
    email?: string;
    phone?: string;
    notes?: string;
    asGuest?: boolean;
    rsvp?: RsvpStatus;
    dietary?: string;
    side?: Guest['side'];
    tableId?: string | null;
  }): Person | null {
    const name = input.displayName?.trim();
    if (!name) return null;
    if (input.tableId && !this.seatingTables.some((t) => t.id === input.tableId)) return null;

    this.beginMutation('Créer une personne');
    const at = new Date().toISOString();
    const person: Person = {
      id: freshId('person'),
      displayName: name,
      givenName: input.givenName?.trim() || undefined,
      familyName: input.familyName?.trim() || undefined,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      origin: 'manual',
      createdAt: at,
      updatedAt: at,
    };
    this.persons.push(person);

    if (input.asGuest !== false) {
      const guest: Guest = {
        id: guestIdForPerson(person.id),
        projectId: this.currentProject.id,
        personId: person.id,
        rsvp: { status: input.rsvp ?? 'pending', plusOnes: 0 },
        seating: { tableId: input.tableId ?? undefined },
        dietary: input.dietary?.trim() || undefined,
        side: input.side ?? 'unknown',
        origin: 'manual',
        createdAt: at,
        updatedAt: at,
      };
      this.guests.push(guest);
    }

    this.saveCurrentState();
    this.notify();
    return person;
  }

  public updatePerson(personId: string, patch: {
    displayName?: string; givenName?: string; familyName?: string;
    email?: string; phone?: string; notes?: string;
  }): boolean {
    const person = this.persons.find((p) => p.id === personId);
    if (!person) return false;
    if (patch.displayName !== undefined && !patch.displayName.trim()) return false;
    this.beginMutation('Modifier une personne');
    if (patch.displayName !== undefined) person.displayName = patch.displayName.trim();
    if (patch.givenName !== undefined) person.givenName = patch.givenName.trim() || undefined;
    if (patch.familyName !== undefined) person.familyName = patch.familyName.trim() || undefined;
    if (patch.email !== undefined) person.email = patch.email.trim() || undefined;
    if (patch.phone !== undefined) person.phone = patch.phone.trim() || undefined;
    if (patch.notes !== undefined) person.notes = patch.notes.trim() || undefined;
    person.updatedAt = new Date().toISOString();
    const agent = this.getAgentForPerson(personId);
    if (agent && patch.displayName !== undefined) agent.name = person.displayName;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  // --- D4: vendors ---------------------------------------------------------

  public createVendor(input: {
    companyName: string;
    category: Vendor['category'];
    contactName?: string;
    phone?: string;
    email?: string;
    websiteUrl?: string;
    notes?: string;
    placeIds?: string[];
  }): Vendor | null {
    const name = input.companyName?.trim();
    if (!name) return null;
    const places = (input.placeIds ?? []).filter((id) => this.places.some((p) => p.id === id));
    if ((input.placeIds ?? []).length !== places.length) return null;

    this.beginMutation('Créer un prestataire');
    const at = new Date().toISOString();

    // A named contact becomes a real Person, not a duplicated string.
    let contactPersonId: string | undefined;
    if (input.contactName?.trim()) {
      const contact = this.createPersonSilently(input.contactName.trim(), input.phone, input.email);
      contactPersonId = contact.id;
    }

    const vendor: Vendor = {
      id: freshId('vendor'),
      projectId: this.currentProject.id,
      companyName: name,
      category: input.category,
      status: 'prospect',
      contactPersonId,
      documentIds: [],
      taskIds: [],
      placeIds: places,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      websiteUrl: input.websiteUrl?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      origin: 'manual',
      createdAt: at,
      updatedAt: at,
    };
    this.vendors.push(vendor);
    this.saveCurrentState();
    this.notify();
    return vendor;
  }

  /** Internal: a Person with no Guest facet and no extra history entry. */
  private createPersonSilently(displayName: string, phone?: string, email?: string): Person {
    const at = new Date().toISOString();
    const person: Person = {
      id: freshId('person'), displayName,
      phone: phone?.trim() || undefined, email: email?.trim() || undefined,
      origin: 'manual', createdAt: at, updatedAt: at,
    };
    this.persons.push(person);
    return person;
  }

  public updateVendor(vendorId: string, patch: {
    companyName?: string; category?: Vendor['category']; status?: Vendor['status'];
    phone?: string; email?: string; websiteUrl?: string; notes?: string;
  }): boolean {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!vendor) return false;
    if (patch.companyName !== undefined && !patch.companyName.trim()) return false;
    this.beginMutation('Modifier un prestataire');
    if (patch.companyName !== undefined) vendor.companyName = patch.companyName.trim();
    if (patch.category !== undefined) vendor.category = patch.category;
    if (patch.status !== undefined) vendor.status = patch.status;
    if (patch.phone !== undefined) vendor.phone = patch.phone.trim() || undefined;
    if (patch.email !== undefined) vendor.email = patch.email.trim() || undefined;
    if (patch.websiteUrl !== undefined) vendor.websiteUrl = patch.websiteUrl.trim() || undefined;
    if (patch.notes !== undefined) vendor.notes = patch.notes.trim() || undefined;
    vendor.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  // --- D5: places ----------------------------------------------------------

  public createPlace(input: {
    name: string; code?: string; kind?: PlaceKind; address?: string;
    gpsCoordinates?: string; capacity?: number; description?: string;
  }): Place | null {
    const name = input.name?.trim();
    if (!name) return null;
    this.beginMutation('Créer un lieu');
    // Position derived from the existing ring so the place really exists in
    // the 3D world instead of sitting at the origin.
    const index = this.places.length;
    const angle = (index / 12) * Math.PI * 2;
    const place: Place = {
      id: freshId('place'),
      name,
      code: (input.code?.trim() || name.slice(0, 12)).toUpperCase(),
      kind: input.kind,
      address: input.address?.trim() || undefined,
      zone: 'manoir',
      pos: [Math.cos(angle) * 34, 0, Math.sin(angle) * 34],
      gpsCoordinates: input.gpsCoordinates?.trim() || '',
      capacity: input.capacity ?? 0,
      currentPax: 0,
      description: input.description?.trim() || '',
      icon: 'manoir',
      themeColor: BRAND_ACCENT,
      activeFromHour: 10,
      activeToHour: 24,
      connectedAgentIds: [],
      connectedDocIds: [],
      connectedTaskIds: [],
    };
    this.places.push(place);
    this.saveCurrentState();
    this.notify();
    return place;
  }

  public updatePlace(placeId: string, patch: {
    name?: string; address?: string; gpsCoordinates?: string;
    capacity?: number; description?: string; kind?: PlaceKind;
  }): boolean {
    const place = this.places.find((p) => p.id === placeId);
    if (!place) return false;
    if (patch.name !== undefined && !patch.name.trim()) return false;
    this.beginMutation('Modifier un lieu');
    if (patch.name !== undefined) place.name = patch.name.trim();
    if (patch.address !== undefined) place.address = patch.address.trim() || undefined;
    if (patch.gpsCoordinates !== undefined) place.gpsCoordinates = patch.gpsCoordinates.trim();
    if (patch.capacity !== undefined && patch.capacity >= 0) place.capacity = patch.capacity;
    if (patch.description !== undefined) place.description = patch.description.trim();
    if (patch.kind !== undefined) place.kind = patch.kind;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  // --- D6: music -----------------------------------------------------------

  public createTrack(input: {
    title: string; artist: string; duration?: string;
    moment?: WeddingMoment; phaseId?: string | null;
  }): TrackEntity | null {
    const title = input.title?.trim();
    const artist = input.artist?.trim();
    if (!title || !artist) return null;
    if (input.phaseId && !this.phases.some((p) => p.id === input.phaseId)) return null;

    this.beginMutation('Ajouter un morceau');
    const track: TrackEntity = {
      id: freshId('trk'),
      title,
      artist,
      moment: input.moment ?? 'soiree',
      status: 'pending',
      bpm: 0,
      energy: 3,
      duration: input.duration?.trim() || '',
      suggestedBy: this.getCurrentPerson()?.displayName ?? 'Canvas',
      votes: 0,
      linkedPhaseId: input.phaseId ?? undefined,
    };
    this.tracks.unshift(track);
    this.saveCurrentState();
    this.notify();
    return track;
  }

  // -------------------------------------------------------------------------
  // MEDIA
  //
  // Attached to a real entity, by stable id. No seeding, no placeholder.
  // -------------------------------------------------------------------------

  public addMedia(input: {
    kind: MediaKind;
    source: string;
    ownerKind: MediaOwnerKind;
    ownerId: string;
    title?: string;
    caption?: string;
    fileName?: string;
    byteSize?: number;
    /**
     * Defaults to 'manual' — an upload. Enrichment passes 'research' at
     * creation time (Phase F.3) rather than patching the asset afterwards, so
     * an asset is never briefly mislabelled as manual.
     */
    origin?: EntityOrigin;
    /** Required in practice for non-manual assets: where it came from. */
    provenance?: MediaProvenance;
  }): MediaAsset | null {
    // A media must belong to something that exists.
    if (!this.mediaOwnerExists(input.ownerKind, input.ownerId)) return null;
    const at = new Date().toISOString();
    const asset: MediaAsset = {
      id: freshId('media'),
      kind: input.kind,
      source: input.source,
      title: input.title,
      caption: input.caption,
      ownerKind: input.ownerKind,
      ownerId: input.ownerId,
      fileName: input.fileName,
      byteSize: input.byteSize,
      origin: input.origin ?? 'manual',
      provenance: input.provenance,
      createdAt: at,
      updatedAt: at,
    };
    this.media.push(asset);
    this.saveCurrentState();
    this.notify();
    return asset;
  }

  public removeMedia(mediaId: string): boolean {
    const idx = this.media.findIndex((m) => m.id === mediaId);
    if (idx < 0) return false;
    this.media.splice(idx, 1);
    for (const p of this.persons) {
      if (p.portraitMediaId === mediaId) p.portraitMediaId = undefined;
    }
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public mediaOwnerExists(kind: MediaOwnerKind, id: string): boolean {
    switch (kind) {
      case 'person': return this.persons.some((p) => p.id === id);
      case 'place': return this.places.some((p) => p.id === id);
      case 'vendor': return this.vendors.some((v) => v.id === id);
      case 'event': return this.phases.some((p) => p.id === id);
      case 'song': return this.tracks.some((t) => t.id === id);
      case 'wedding': return this.currentProject.id === id;
      default: return false;
    }
  }

  /**
   * Media attached to an entity, MANUAL FIRST.
   *
   * A file the user uploaded always precedes one obtained by enrichment, so
   * automatic data can never visually override a deliberate choice.
   */
  public getMediaFor(kind: MediaOwnerKind, id: string): MediaAsset[] {
    const rank = (m: MediaAsset) => (m.origin === 'manual' ? 0 : m.origin === 'research' ? 1 : 2);
    return this.media
      .filter((m) => m.ownerKind === kind && m.ownerId === id)
      .sort((a, b) => rank(a) - rank(b));
  }

  /**
   * Deterministic portrait resolution:
   *   1. `portraitMediaId` when it points at a VALID image;
   *   2. otherwise the first image attached to that person.
   *
   * The validity check matters: a dangling or non-image portraitMediaId used
   * to return null, which hid a perfectly good photo behind a stale pointer.
   */
  public getPortraitFor(personId: string): MediaAsset | null {
    const person = this.getPerson(personId);
    const images = this.media.filter(
      (m) => m.ownerKind === 'person' && m.ownerId === personId && m.kind === 'image',
    );
    if (person?.portraitMediaId) {
      const explicit = images.find((m) => m.id === person.portraitMediaId);
      if (explicit) return explicit;
    }
    return images[0] ?? null;
  }

  // -------------------------------------------------------------------------
  // RELATIONSHIPS between people
  // -------------------------------------------------------------------------

  public linkPersons(fromPersonId: string, toPersonId: string, kind: RelationshipKind, note?: string): PersonRelationship | null {
    if (fromPersonId === toPersonId) return null;
    if (!this.getPerson(fromPersonId) || !this.getPerson(toPersonId)) return null;
    const existing = this.relationships.find(
      (r) => r.fromPersonId === fromPersonId && r.toPersonId === toPersonId && r.kind === kind,
    );
    if (existing) return existing;
    const rel: PersonRelationship = {
      id: freshId('rel'), fromPersonId, toPersonId, kind, note,
      createdAt: new Date().toISOString(),
    };
    this.relationships.push(rel);
    this.saveCurrentState();
    this.notify();
    return rel;
  }

  public unlinkPersons(relationshipId: string): boolean {
    const idx = this.relationships.findIndex((r) => r.id === relationshipId);
    if (idx < 0) return false;
    this.relationships.splice(idx, 1);
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Both directions: a relationship is readable from either end. */
  public getRelationshipsFor(personId: string): { relationship: PersonRelationship; otherPersonId: string }[] {
    return this.relationships
      .filter((r) => r.fromPersonId === personId || r.toPersonId === personId)
      .map((r) => ({
        relationship: r,
        otherPersonId: r.fromPersonId === personId ? r.toPersonId : r.fromPersonId,
      }));
  }

  public setPersonNotes(personId: string, notes: string): boolean {
    const person = this.persons.find((p) => p.id === personId);
    if (!person) return false;
    person.notes = notes.trim() || undefined;
    person.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setVendorNotes(vendorId: string, notes: string): boolean {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!vendor) return false;
    vendor.notes = notes.trim() || undefined;
    vendor.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  // -------------------------------------------------------------------------
  // MUSIC ↔ TIMELINE
  //
  // A track is a temporal component of the world, not just a playlist row.
  // -------------------------------------------------------------------------

  /** Deterministic mapping from a musical moment to a real timeline phase. */
  public getPhaseForTrack(trackId: string): TimelinePhase | null {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return null;
    if (track.linkedPhaseId) {
      return this.phases.find((p) => p.id === track.linkedPhaseId) ?? null;
    }
    // Fall back to the moment, matched against real phase ids.
    const byMoment = this.phases.find((p) => p.id === `phase_${track.moment}`);
    if (byMoment) return byMoment;
    const MOMENT_TO_AMBIENT: Record<string, string> = {
      ceremonie: 'ceremony', cocktail: 'jazz', repas: 'dinner',
      premiere_danse: 'party', soiree: 'party',
    };
    const ambient = MOMENT_TO_AMBIENT[track.moment];
    return ambient ? this.phases.find((p) => p.ambientTrack === ambient) ?? null : null;
  }

  public linkTrackToPhase(trackId: string, phaseId: string | null): boolean {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return false;
    if (phaseId !== null && !this.phases.some((p) => p.id === phaseId)) return false;
    track.linkedPhaseId = phaseId ?? undefined;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public getTracksForPhase(phaseId: string): TrackEntity[] {
    return this.tracks.filter((t) => this.getPhaseForTrack(t.id)?.id === phaseId);
  }

  // -------------------------------------------------------------------------
  // PLACES
  // -------------------------------------------------------------------------

  /** Functional classification, derived from the zone when not explicitly set. */
  public getPlaceKind(placeId: string): PlaceKind {
    const place = this.places.find((p) => p.id === placeId);
    if (!place) return 'other';
    if (place.kind) return place.kind;
    const ZONE_TO_KIND: Record<string, PlaceKind> = {
      mairie: 'civil',
      ceremonie: 'ceremony',
      cocktail: 'cocktail',
      reception: 'dinner',
      dancefloor: 'dancefloor',
      manoir: 'main_venue',
      parking: 'parking',
      hotel: 'accommodation',
    };
    return ZONE_TO_KIND[place.zone] ?? 'other';
  }

  /** Vendors that declared this place among their zones of intervention. */
  public getVendorsForPlace(placeId: string): Vendor[] {
    return this.vendors.filter((v) => v.placeIds.includes(placeId));
  }

  public getPhasesForPlace(placeId: string): TimelinePhase[] {
    return this.phases.filter((p) => p.primaryPlaceId === placeId);
  }

  // -------------------------------------------------------------------------
  // CROSS-PROJECTION NAVIGATION
  //
  // Every hop travels by STABLE ENTITY ID (personId), never by visual index.
  // That is what guarantees "click Paul in Mirror → find exactly Paul in
  // World", and back, without duplicating anything.
  // -------------------------------------------------------------------------

  public setProjection(projection: 'world' | 'mirror'): void {
    if (this.projection === projection) return;
    this.projection = projection;
    weddingAudio.playClick();
    this.notify();
  }

  /**
   * Mirror → World. Focuses the 3D camera on the agent that projects this
   * person, and selects it so the inspector and neural links follow.
   * Returns false when the person has no spatial projection, so the UI can
   * say so instead of silently doing nothing.
   */
  public showPersonInWorld(personId: string): boolean {
    const agent = this.getAgentForPerson(personId);
    if (!agent) return false;

    this.projection = 'world';
    this.constellationOpen = false;
    this.showIdentityModal = false;
    this.interiorMode = false;
    this.selectEntity('agent', agent.id);
    this.cameraTargetPos = [agent.currentPos[0], agent.currentPos[1] + 1.5, agent.currentPos[2]];
    this.spawnGridWave(agent.currentPos, BRAND_ACCENT);
    this.notify();
    return true;
  }

  /** World → Mirror, landing on that person's editorial representation. */
  public showPersonInMirror(personId: string): boolean {
    if (!this.getPerson(personId)) return false;
    this.projection = 'mirror';
    this.mirrorFocusPersonId = personId;
    this.notify();
    return true;
  }

  /** Mirror → World for a place. Only succeeds if the place really exists. */
  public showPlaceInWorld(placeId: string): boolean {
    if (!this.places.some((p) => p.id === placeId)) return false;
    this.projection = 'world';
    this.constellationOpen = false;
    this.showIdentityModal = false;
    this.focusPlace(placeId);
    return true;
  }

  /** Mirror → World for a vendor, via its spatial projection. */
  public showVendorInWorld(vendorId: string): boolean {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!vendor) return false;
    if (vendor.agentId && this.agents.some((a) => a.id === vendor.agentId)) {
      const person = this.getPersonForAgent(vendor.agentId);
      if (person) return this.showPersonInWorld(person.id);
    }
    // No agent: fall back to its first real zone rather than doing nothing.
    const zone = vendor.placeIds.find((id) => this.places.some((p) => p.id === id));
    return zone ? this.showPlaceInWorld(zone) : false;
  }

  /** Mirror → World for a timeline moment: move the clock AND the camera. */
  public showEventInWorld(phaseId: string): boolean {
    const phase = this.phases.find((p) => p.id === phaseId);
    if (!phase) return false;
    this.projection = 'world';
    this.constellationOpen = false;
    this.showIdentityModal = false;
    this.setTime(phase.startHour + 0.05);
    if (phase.primaryPlaceId && this.places.some((p) => p.id === phase.primaryPlaceId)) {
      this.focusPlace(phase.primaryPlaceId);
    } else {
      this.notify();
    }
    return true;
  }

  public clearMirrorFocus(): void {
    if (this.mirrorFocusPersonId === null) return;
    this.mirrorFocusPersonId = null;
    this.notify();
  }

  // -------------------------------------------------------------------------
  // IDENTITY MODEL
  // -------------------------------------------------------------------------

  /**
   * Derive the identity entities from legacy state when they are missing.
   *
   * Idempotent (ids are deterministic) and additive: agents are never deleted,
   * only given a `personId` back-reference. Safe to call after every restore.
   */
  public ensureIdentityModel(): MigrationReport {
    const needsMigration = this.persons.length === 0;

    const { state, report, agentPatches } = migrateIdentityModel({
      project: this.currentProject,
      agents: this.agents,
      tracks: this.tracks.map((t) => ({ id: t.id, hasVoted: t.hasVoted, votes: t.votes })),
      legacyAccount: this.activeAccount
        ? {
            id: this.activeAccount.id,
            email: this.activeAccount.email,
            name: this.activeAccount.name,
            role: this.activeAccount.role,
          }
        : null,
      legacyUserIdentity: { role: this.userIdentity.role, name: this.userIdentity.name },
      legacyDmc: this.userDmcIdentity,
      existing: {
        ...emptyIdentityState(),
        persons: this.persons, accounts: this.accounts, dmcIdentities: this.dmcIdentities,
        guests: this.guests, vendors: this.vendors, seatingTables: this.seatingTables,
        memberships: this.memberships, invitations: this.invitations,
        trackVotes: this.trackVotes, media: this.media,
        relationships: this.relationships, currentPersonId: this.currentPersonId,
      },
    });

    this.persons = state.persons;
    this.accounts = state.accounts;
    this.dmcIdentities = state.dmcIdentities;
    this.guests = state.guests;
    this.vendors = state.vendors;
    this.seatingTables = state.seatingTables;
    this.memberships = state.memberships;
    this.invitations = state.invitations;
    this.trackVotes = state.trackVotes;
    this.media = state.media ?? this.media;
    this.relationships = state.relationships ?? this.relationships;
    this.currentPersonId = state.currentPersonId;

    // Link agents back to their person, without touching anything else.
    for (const patch of agentPatches) {
      const agent = this.agents.find((a) => a.id === patch.agentId);
      if (agent) agent.personId = patch.personId;
    }

    this.lastMigrationReport = report;
    if (needsMigration) this.saveCurrentState();
    return report;
  }

  // --- Lookups (by id, always) ---------------------------------------------

  public getPerson(personId: string | null | undefined): Person | null {
    if (!personId) return null;
    return this.persons.find((p) => p.id === personId) ?? null;
  }

  public getCurrentPerson(): Person | null {
    return this.getPerson(this.currentPersonId);
  }

  public getPersonForAgent(agentId: string): Person | null {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent?.personId) return this.getPerson(agent.personId);
    return this.persons.find((p) => p.agentId === agentId) ?? null;
  }

  public getAgentForPerson(personId: string): Agent | null {
    const person = this.getPerson(personId);
    if (person?.agentId) return this.agents.find((a) => a.id === person.agentId) ?? null;
    return this.agents.find((a) => a.personId === personId) ?? null;
  }

  /**
   * Is this agent the connected user?
   *
   * Replaces `agent.role === userIdentity.role`, which made every person
   * sharing a role look like the user.
   */
  public isCurrentUserAgent(agentId: string): boolean {
    if (!this.currentPersonId) return false;
    const agent = this.agents.find((a) => a.id === agentId);
    return agent?.personId === this.currentPersonId;
  }

  public getGuestForPerson(personId: string): Guest | null {
    return this.guests.find((g) => g.personId === personId) ?? null;
  }

  public getVendorForAgent(agentId: string): Vendor | null {
    return this.vendors.find((v) => v.agentId === agentId) ?? null;
  }

  public getDmcForPerson(personId: string): DmcIdentityRecord | null {
    return this.dmcIdentities.find((d) => d.ownerPersonId === personId) ?? null;
  }

  // --- Guests: RSVP and seating --------------------------------------------

  public setGuestRsvp(guestId: string, status: RsvpStatus, note?: string): boolean {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest) return false;
    // An RSVP is a real decision: it belongs to the same undo history as every
    // other mutation, and the aggregates re-derive from it automatically.
    this.beginMutation('Modifier une réponse');
    guest.rsvp = { ...guest.rsvp, status, note, respondedAt: new Date().toISOString() };
    guest.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setGuestPlusOnes(guestId: string, plusOnes: number): boolean {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest) return false;
    guest.rsvp = { ...guest.rsvp, plusOnes: Math.max(0, Math.floor(plusOnes)) };
    guest.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Seat a guest. Returns false when the table is unknown or already full. */
  public assignGuestToTable(guestId: string, tableId: string | null): boolean {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest) return false;

    if (tableId === null) {
      guest.seating = { tableId: undefined, seatIndex: undefined };
      guest.updatedAt = new Date().toISOString();
      this.saveCurrentState();
      this.notify();
      return true;
    }

    const table = this.seatingTables.find((t) => t.id === tableId);
    if (!table) return false;

    const seated = this.guests.filter((g) => g.seating.tableId === tableId && g.id !== guestId);
    const occupancy = seated.reduce((n, g) => n + 1 + g.rsvp.plusOnes, 0);
    if (occupancy + 1 + guest.rsvp.plusOnes > table.capacity) return false;

    guest.seating = { tableId, seatIndex: occupancy };
    guest.updatedAt = new Date().toISOString();
    // Keep the legacy agent field in sync so the 3D view keeps working.
    const agent = this.getAgentForPerson(guest.personId);
    if (agent) agent.assignedTable = table.number;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public getTableOccupancy(tableId: string): { seated: number; capacity: number } {
    const table = this.seatingTables.find((t) => t.id === tableId);
    const seated = this.guests
      .filter((g) => g.seating.tableId === tableId)
      .reduce((n, g) => n + 1 + g.rsvp.plusOnes, 0);
    return { seated, capacity: table?.capacity ?? 0 };
  }

  public addSeatingTable(capacity = 8, placeId?: string): SeatingTable {
    const next = this.seatingTables.reduce((m, t) => Math.max(m, t.number), 0) + 1;
    const table = createSeatingTable(this.currentProject.id, next, capacity, placeId);
    this.seatingTables.push(table);
    this.saveCurrentState();
    this.notify();
    return table;
  }

  public setGuestDietary(guestId: string, dietary: string): boolean {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest) return false;
    guest.dietary = dietary.trim() || undefined;
    guest.updatedAt = new Date().toISOString();
    // Keep the legacy agent field in sync so existing views stay correct.
    const agent = this.getAgentForPerson(guest.personId);
    if (agent) agent.dietary = guest.dietary;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setGuestSide(guestId: string, side: Guest['side']): boolean {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest) return false;
    guest.side = side;
    guest.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setVendorStatus(vendorId: string, status: Vendor['status']): boolean {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!vendor) return false;
    vendor.status = status;
    vendor.updatedAt = new Date().toISOString();
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public setPersonContact(personId: string, patch: { email?: string; phone?: string }): boolean {
    const person = this.persons.find((p) => p.id === personId);
    if (!person) return false;
    if (patch.email !== undefined) person.email = patch.email.trim() || undefined;
    if (patch.phone !== undefined) person.phone = patch.phone.trim() || undefined;
    person.updatedAt = new Date().toISOString();
    const agent = this.getAgentForPerson(personId);
    if (agent && patch.phone !== undefined) agent.phone = person.phone;
    this.saveCurrentState();
    this.notify();
    return true;
  }

  /** Timeline phases this agent is explicitly mobilised by. */
  public getPhasesForAgent(agentId: string): TimelinePhase[] {
    return this.phases.filter((p) => (p.keyAgentIds ?? []).includes(agentId));
  }

  /** The place whose activity window currently contains the simulated hour. */
  public getCurrentPlaceForAgent(agentId: string): Place | null {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return null;
    // Nearest place to the agent's live position: this is the zone it is
    // actually standing in, not the one it was statically assigned to.
    let best: Place | null = null;
    let bestDist = Infinity;
    for (const place of this.places) {
      const dx = place.pos[0] - agent.currentPos[0];
      const dz = place.pos[2] - agent.currentPos[2];
      const d = dx * dx + dz * dz;
      if (d < bestDist) { bestDist = d; best = place; }
    }
    return best;
  }

  /** Documents attached to a vendor OR to its agent projection. */
  public getDocumentsForVendor(vendorId: string): DocumentEntity[] {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!vendor) return [];
    const ids = new Set(vendor.documentIds);
    return this.docs.filter((d) => ids.has(d.id));
  }

  public getRsvpSummary(): Record<RsvpStatus, number> & { total: number; expectedHeads: number } {
    const summary = { pending: 0, accepted: 0, declined: 0, tentative: 0, total: 0, expectedHeads: 0 };
    for (const g of this.guests) {
      summary[g.rsvp.status]++;
      summary.total++;
      if (g.rsvp.status === 'accepted') summary.expectedHeads += 1 + g.rsvp.plusOnes;
    }
    return summary;
  }

  // --- Permissions (model in place; not yet enforced on mutations) ----------

  public getCurrentMembership(): ProjectMembership | null {
    if (!this.activeAccount) return null;
    return this.memberships.find(
      (m) => m.projectId === this.currentProject.id && m.accountId === this.activeAccount!.id,
    ) ?? null;
  }

  /**
   * Capability check for the current session.
   *
   * Deliberately permissive today: with no server, refusing actions locally
   * would be security theatre. It gives the UI a single, honest place to ask
   * the question, so enforcement can be switched on with the backend.
   */
  public can(capability: Capability): boolean {
    const membership = this.getCurrentMembership();
    if (!membership) return true; // no account yet: single-user local mode
    return membership.capabilities.includes(capability);
  }

  public getCurrentCapabilities(): Capability[] {
    const membership = this.getCurrentMembership();
    if (membership) return membership.capabilities;
    return capabilitiesForRole('owner');
  }

  // --- Invitations ----------------------------------------------------------

  public createInvitationForProject(role: MembershipRole = 'guest', guestId?: string): Invitation {
    const code = `WC-${Date.now().toString(36).toUpperCase()}`;
    const invitation = createInvitation(
      this.currentProject.id, code, role, this.activeAccount?.id, guestId,
    );
    this.invitations.push(invitation);
    this.saveCurrentState();
    this.notify();
    return invitation;
  }

  public getInvitationByCode(code: string): Invitation | null {
    const id = invitationIdForCode(code);
    return this.invitations.find((i) => i.id === id) ?? null;
  }

  /** Mark an invitation as accepted and create the matching membership. */
  public acceptInvitation(code: string): { ok: boolean; reason?: string } {
    const invitation = this.getInvitationByCode(code);
    if (!invitation) return { ok: false, reason: 'unknown' };
    if (invitation.status === 'revoked') return { ok: false, reason: 'revoked' };

    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();
    invitation.acceptedByAccountId = this.activeAccount?.id;
    invitation.updatedAt = invitation.acceptedAt;

    if (this.activeAccount && this.currentPersonId) {
      const existing = this.memberships.find(
        (m) => m.projectId === invitation.projectId && m.accountId === this.activeAccount!.id,
      );
      if (!existing) {
        this.memberships.push(createMembership(
          invitation.projectId, this.activeAccount.id, this.currentPersonId,
          invitation.role, invitation.id,
        ));
      }
    }
    this.saveCurrentState();
    this.notify();
    return { ok: true };
  }

  /**
   * Persist the current state and REPORT THE REAL OUTCOME.
   *
   * `saveState` is driven by whether the write actually reached storage, so
   * the Canvas can never display "Enregistré" for a mutation that was lost
   * (Phase D §20).
   */
  public saveCurrentState(): boolean {
    this.saveState = 'saving';
    try {
      const ok = savePersistedState(this.currentProject.id, {
        project: this.currentProject,
        // Single serializer — driven by PERSISTED_FIELDS, so this can never
        // fall out of sync with the restore path again.
        ...serializeDomain(this),
      });
      saveWeddingProject(this.currentProject);
      this.saveState = ok ? 'saved' : 'error';
      this.lastSavedAt = ok ? new Date().toISOString() : this.lastSavedAt;
      return ok;
    } catch (error) {
      reportDiagnostic({ source: 'store', severity: 'error', code: 'store_persist_failed', error });
      this.saveState = 'error';
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // MUTATION HISTORY (undo / redo at World Model level)
  //
  // History is kept on the DOMAIN SNAPSHOT, not per projection: one timeline
  // of truth, exactly like the data itself. Snapshots reuse serializeDomain(),
  // so a new persisted field is covered automatically.
  // -------------------------------------------------------------------------

  private undoStack: { label: string; snapshot: PersistedDomainState }[] = [];
  private redoStack: { label: string; snapshot: PersistedDomainState }[] = [];
  private readonly historyLimit = 40;

  /** Capture the state BEFORE a mutation. Call at the start of a Canvas edit. */
  public beginMutation(label: string): void {
    this.undoStack.push({ label, snapshot: clone(serializeDomain(this)) });
    if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
    // A new branch invalidates the redo path.
    this.redoStack = [];
  }

  public canUndo(): boolean { return this.undoStack.length > 0; }
  public canRedo(): boolean { return this.redoStack.length > 0; }
  public undoLabel(): string | null { return this.undoStack[this.undoStack.length - 1]?.label ?? null; }
  public redoLabel(): string | null { return this.redoStack[this.redoStack.length - 1]?.label ?? null; }

  public undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.redoStack.push({ label: entry.label, snapshot: clone(serializeDomain(this)) });
    applyDomain(this, entry.snapshot, createDefaultDomainState());
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.undoStack.push({ label: entry.label, snapshot: clone(serializeDomain(this)) });
    applyDomain(this, entry.snapshot, createDefaultDomainState());
    this.saveCurrentState();
    this.notify();
    return true;
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public notify() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  public setUserIdentity(identity: Partial<UserIdentity>) {
    this.userIdentity = { ...this.userIdentity, ...identity, isCreated: true };
    this.saveCurrentState();
    this.notify();
  }

  public startIntroCinematic() {
    this.introCinematicActive = true;
    this.introProgress = 0.0;
    this.notify();
  }

  public setUserDmcIdentity(dmc: DmcIdentity) {
    this.userDmcIdentity = { ...dmc };
    this.userIdentity.outfitColor = dmc.dmcColor;
    this.userIdentity.accessory = dmc.symbolGlyph;
    this.userIdentity.avatarIcon = dmc.symbolGlyph;

    // Write through to the OWNED DMCIdentity record so the signature is
    // coherent everywhere: avatar colour, chest badge, inspector card and
    // neural graph all read the same entity instead of a loose global field.
    if (this.currentPersonId) {
      const existing = this.dmcIdentities.find((d) => d.ownerPersonId === this.currentPersonId);
      if (existing) {
        Object.assign(existing, dmc, { updatedAt: new Date().toISOString() });
      } else {
        this.dmcIdentities.push(createDmcRecord(this.currentPersonId, dmc));
      }
      const person = this.persons.find((p) => p.id === this.currentPersonId);
      if (person) {
        person.dmcIdentityId = dmcIdForPerson(this.currentPersonId);
        person.updatedAt = new Date().toISOString();
      }
    }

    weddingAudio.playResolveSuccess();
    this.saveCurrentState();
    this.notify();
  }

  public openAdSlot(slotId: string) {
    this.selectedAdSlotId = slotId;
    this.adSlotModalOpen = true;
    const slot = this.adSlots.find((s) => s.id === slotId);
    if (slot) {
      this.cameraTargetPos = [slot.pos[0], slot.pos[1] + 1.5, slot.pos[2]];
    }
    weddingAudio.playClick();
    this.notify();
  }

  public claimAdSlot(slotId: string, campaignData: {
    title: string;
    subtitle: string;
    category: any;
    advertiserName: string;
    ctaText: string;
    isSponsored: boolean;
    sponsorName?: string;
  }) {
    const slot = this.adSlots.find((s) => s.id === slotId);
    if (!slot) return;

    slot.isClaimed = true;
    slot.currentCampaign = {
      id: `camp_${Date.now()}`,
      title: campaignData.title,
      subtitle: campaignData.subtitle,
      category: campaignData.category,
      isSponsored: campaignData.isSponsored,
      sponsorName: campaignData.sponsorName,
      advertiserName: campaignData.advertiserName,
      ctaText: campaignData.ctaText || 'En savoir plus →',
      themeColor: BRAND_ACCENT,
      badgeLabel: campaignData.isSponsored ? 'SPONSORISÉ' : 'ANNONCE MARIAGE',
    };

    weddingAudio.playResolveSuccess();
    this.spawnGridWave([slot.pos[0], 0, slot.pos[2]], BRAND_ACCENT);
    this.saveCurrentState();
    this.notify();
  }

  /**
   * The phase the simulated clock is inside, or the first one.
   *
   * MEASURED IN THE BROWSER: this used to be typed as always returning a
   * phase, but an empty programme made it return `undefined`, and the HUD
   * crashed on `currentPhase.name` the moment a brand-new wedding was created.
   * The type now tells the truth and every caller handles the empty day.
   */
  public getActivePhase(): TimelinePhase | null {
    const current = this.phases.find((p) => this.time >= p.startHour && this.time < p.endHour);
    return current ?? this.phases[0] ?? null;
  }

  public getActiveTrack(): TrackEntity {
    let moment: WeddingMoment = 'ceremonie';
    if (this.time < 13.5) moment = 'ceremonie';
    else if (this.time < 17.0) moment = 'ceremonie';
    else if (this.time < 19.5) moment = 'cocktail';
    else if (this.time < 22.5) moment = 'repas';
    else if (this.time < 23.5) moment = 'premiere_danse';
    else moment = 'soiree';

    const trackInMoment = this.tracks.find((t) => t.moment === moment && t.status !== 'pending');
    return trackInMoment || this.tracks[0];
  }

  // Real World -> 3D World / Venue Interior Methods
  public enterVenue(placeId: string) {
    const place = this.places.find((p) => p.id === placeId);
    if (!place) return;

    this.interiorMode = true;
    this.activeVenueId = place.reconstructedVenueId || 'venue_orangerie';
    this.avatarPos = [0, 0, 8];
    this.avatarRot = 0;

    // Load venue objects
    const venue = this.reconstructedVenues.find((v) => v.id === this.activeVenueId) || this.reconstructedVenues[0];
    this.placedObjects = venue ? [...venue.objects] : [...INITIAL_RECONSTRUCTED_VENUES[0].objects];

    weddingAudio.playClick();
    weddingAudio.playNeuralWave();
    this.cameraTargetPos = [0, 1.5, 0];
    this.notify();
  }

  public exitVenue() {
    this.interiorMode = false;
    this.activeVenueId = null;
    this.constructionMode = false;
    weddingAudio.playClick();
    this.focusPlace('place_ceremonie');
    this.notify();
  }

  public toggleConstructionMode(enable?: boolean) {
    this.constructionMode = enable !== undefined ? enable : !this.constructionMode;
    weddingAudio.playClick();
    this.notify();
  }

  public addPlacedObject(objData: Omit<PlacedObject, 'id' | 'venueId'>) {
    weddingAudio.playClick();
    const newObj: PlacedObject = {
      id: `obj_${Date.now()}`,
      venueId: this.activeVenueId || 'venue_orangerie',
      ...objData,
    };
    this.placedObjects.push(newObj);

    // Save to active reconstructed venue
    const venue = this.reconstructedVenues.find((v) => v.id === (this.activeVenueId || 'venue_orangerie'));
    if (venue) {
      venue.objects = [...this.placedObjects];
    }

    this.selectedObjectId = newObj.id;
    this.saveCurrentState();
    this.notify();
  }

  public removePlacedObject(objectId: string) {
    weddingAudio.playClick();
    this.placedObjects = this.placedObjects.filter((o) => o.id !== objectId);
    const venue = this.reconstructedVenues.find((v) => v.id === (this.activeVenueId || 'venue_orangerie'));
    if (venue) {
      venue.objects = [...this.placedObjects];
    }
    this.selectedObjectId = null;
    this.saveCurrentState();
    this.notify();
  }

  public updatePlacedObject(objectId: string, update: Partial<PlacedObject>) {
    const obj = this.placedObjects.find((o) => o.id === objectId);
    if (!obj) return;
    Object.assign(obj, update);
    const venue = this.reconstructedVenues.find((v) => v.id === (this.activeVenueId || 'venue_orangerie'));
    if (venue) {
      venue.objects = [...this.placedObjects];
    }
    this.saveCurrentState();
    this.notify();
  }

  public assignAgentToObject(agentId: string, objectId: string) {
    const agent = this.agents.find((a) => a.id === agentId);
    const obj = this.placedObjects.find((o) => o.id === objectId);
    if (!agent || !obj) return;

    agent.assignedObjectId = objectId;
    if (!obj.assignedAgentIds) obj.assignedAgentIds = [];
    if (!obj.assignedAgentIds.includes(agentId)) {
      obj.assignedAgentIds.push(agentId);
    }

    weddingAudio.playResolveSuccess();
    this.saveCurrentState();
    this.notify();
  }

  public importRealLocationFromPhotos(data: {
    name: string;
    style: 'chateau' | 'grange' | 'verriere' | 'jardin' | 'moderne';
    photoName?: string;
    confidenceScore?: number;
    detectedTables?: number;
    description?: string;
  }) {
    weddingAudio.playImportChaos();
    weddingAudio.playNeuralWave();

    const venueId = `venue_custom_${Date.now()}`;
    const placeId = `place_custom_${Date.now()}`;

    const newVenue: ReconstructedVenue = {
      id: venueId,
      name: data.name,
      style: data.style,
      confidenceScore: data.confidenceScore || 89,
      detectedElements: {
        walls: data.style === 'grange' ? 'Pierres sèches & poutres de chêne' : data.style === 'chateau' ? 'Pierre de taille calcaire' : 'Verrière acier noir contemporaine',
        doors: 4,
        windows: 12,
        tables: data.detectedTables || 8,
        lighting: 'Lustres dorés & appliques chaudes',
        flooring: 'Parquet chêne & pierre polie',
        ceiling: 'Poutres apparentes & verrière voûtée',
        stage: true,
        bar: true,
        dancefloor: true,
      },
      zones: [
        { id: `${venueId}_hall`, name: 'Grand Hall Réception Reconstruit', type: 'dining', bounds: { minX: -14, maxX: 14, minZ: -10, maxZ: 10 }, capacity: 120, description: 'Salle reconstituée d’après vos photos' },
        { id: `${venueId}_bar`, name: 'Bar & Lounge Cocktail', type: 'bar', bounds: { minX: -14, maxX: -4, minZ: -12, maxZ: -6 }, capacity: 30, description: 'Comptoir de service cocktail' },
        { id: `${venueId}_stage`, name: 'Scène & Dancefloor', type: 'stage', bounds: { minX: -4, maxX: 4, minZ: -14, maxZ: -10 }, capacity: 20, description: 'Scène des mariés et musique' },
      ],
      objects: [
        { id: `obj_${Date.now()}_head`, name: 'Table d’Honneur Reconstituée', category: 'table', pos: [0, 0, -6], rotY: 0, scale: 1.2, venueId, tableCapacity: 8 },
        { id: `obj_${Date.now()}_t1`, name: 'Table 1 • Reconstituée', category: 'table', pos: [-6, 0, -1], rotY: 0, scale: 1.0, venueId, tableCapacity: 10 },
        { id: `obj_${Date.now()}_t2`, name: 'Table 2 • Reconstituée', category: 'table', pos: [6, 0, -1], rotY: 0, scale: 1.0, venueId, tableCapacity: 10 },
        { id: `obj_${Date.now()}_t3`, name: 'Table 3 • Reconstituée', category: 'table', pos: [-6, 0, 4], rotY: 0, scale: 1.0, venueId, tableCapacity: 10 },
        { id: `obj_${Date.now()}_t4`, name: 'Table 4 • Reconstituée', category: 'table', pos: [6, 0, 4], rotY: 0, scale: 1.0, venueId, tableCapacity: 10 },
        { id: `obj_${Date.now()}_bar`, name: 'Bar en Laiton Détecté', category: 'bar', pos: [-9, 0, -10], rotY: Math.PI / 4, scale: 1.1, venueId },
        { id: `obj_${Date.now()}_stage`, name: 'Scène Scénographique', category: 'stage', pos: [0, 0, -11], rotY: 0, scale: 1.0, venueId },
      ],
      createdAt: new Date().toISOString(),
    };

    this.reconstructedVenues.unshift(newVenue);

    const newPlace: Place = {
      id: placeId,
      name: data.name,
      code: 'LIEU RECONSTRUIT',
      zone: 'reception',
      pos: [22, 0, 14],
      gpsCoordinates: '48.8680° N, 2.3740° E',
      capacity: 120,
      currentPax: 0,
      description: data.description || `Environnement 3D reconstitué par IA d’après vos photos (${data.style.toUpperCase()})`,
      icon: 'manoir',
      themeColor: '#e2b448',
      activeFromHour: 17.0,
      activeToHour: 27.0,
      isInteriorExplorable: true,
      reconstructedVenueId: venueId,
      interiorBounds: { width: 28, depth: 22, height: 8 },
      connectedAgentIds: ['agent_bride', 'agent_groom', 'agent_caterer_lead'],
      connectedDocIds: ['doc_planning_master'],
      connectedTaskIds: ['task_service_plat_chaud'],
    };

    this.places.push(newPlace);

    // Auto-create verification task
    const newTask: TaskEntity = {
      id: `task_venue_${Date.now()}`,
      title: `Valider l’implantation 3D : ${data.name}`,
      category: 'logistique',
      dueHour: 18.0,
      isDone: false,
      urgent: false,
      assignedAgentId: 'agent_planner',
      assignedPlaceId: placeId,
      connectedDocIds: ['doc_planning_master'],
      connectedAgentIds: ['agent_planner', 'agent_bride'],
    };
    this.tasks.unshift(newTask);

    this.importLocationModalOpen = false;
    this.saveCurrentState();

    // Directly enter the new venue!
    this.enterVenue(placeId);
  }

  // Real Project Management Methods
  public createRealWedding(params: {
    coupleNames: string;
    weddingDate: string;
    locationName: string;
    userRole: AgentRole;
    userName: string;
    budgetTarget?: number;
    guestCountTarget?: number;
  }) {
    weddingAudio.playWeddingChimes();
    const newId = `proj_${Date.now()}`;
    const code = `WC-${new Date(params.weddingDate).getFullYear() || new Date().getFullYear()}-${params.coupleNames.split('&')[0].trim().toUpperCase()}`;

    const newProject: WeddingProject = {
      id: newId,
      title: `Mariage de ${params.coupleNames}`,
      worldType: 'wedding',
      coupleNames: params.coupleNames,
      // Nothing is invented here. The creation surface explicitly lets the
      // couple answer "je ne sais pas encore" / "le lieu n’est pas encore
      // choisi"; filling those blanks with a fake date and a fake estate name
      // made the World and the Mirror state something untrue. Empty stays
      // empty, and every projection already knows how to say so.
      weddingDate: params.weddingDate || '',
      locationName: params.locationName || '',
      budgetTarget: params.budgetTarget || 25000,
      guestCountTarget: params.guestCountTarget || 100,
      ownerId: this.activeAccount?.id || 'account_user',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inviteCode: code,
    };

    saveWeddingProject(newProject);
    setActiveProjectId(newId);
    this.currentProject = newProject;
    this.markProjectChosen();
    // PRODUCT DECISION (Jour J pass): a new wedding lands on ITS DAY — the
    // empty timeline — not inside a 3D world. The World stays in the code and
    // keeps working; it is simply no longer the door.
    this.projection = 'mirror';

    this.userIdentity = {
      role: params.userRole,
      name: params.userName || params.coupleNames.split('&')[0].trim(),
      roleTitle: params.userRole === 'wedding_planner' ? 'Wedding Planner' : params.userRole === 'bride' ? 'La Mariée' : params.userRole === 'groom' ? 'Le Marié' : 'Organisateur',
      outfitColor: BRAND_ACCENT,
      accessory: 'planner',
      avatarIcon: 'planner',
      isCreated: true,
    };

    // The new world starts EMPTY — see createEmptyDomainState. Copying the demo
    // here also shared its objects between projects (`[...INITIAL_X]` is a
    // shallow copy), so editing one wedding could reach into another.
    applyDomain(this, null, createEmptyDomainState());

    // The only people who exist at this point are the ones the creator typed.
    // They are real data, so they become real Persons — but they get NO
    // spatial projection: inventing a position in the 3D world would be
    // fabricating. The World says so explicitly instead.
    // The badge belongs to THIS wedding, not to the constant it came from.
    this.userDmcIdentity = { ...this.userDmcIdentity, customBadgeText: params.coupleNames };

    const names = params.coupleNames.split('&').map((n) => n.trim()).filter(Boolean);
    for (const displayName of names.slice(0, 2)) {
      this.createPerson({ displayName, asGuest: false });
    }

    this.saveCurrentState();
    this.createWeddingModalOpen = false;
    this.weddingCreationOpen = false;
    this.brandMenuOpen = false;
    this.focusPlace('place_ceremonie');
    this.spawnGridWave([0, 0, 0], BRAND_ACCENT);
    this.notify();
  }

  // Universal World Engine: Create Any World with AI
  public createWorldWithAi(params: {
    prompt: string;
    worldType: WorldType;
    title?: string;
    location?: string;
    budget?: number;
  }) {
    weddingAudio.playWeddingChimes();
    weddingAudio.playImportChaos();

    const generated = generateWorldFromDescription(params);
    const newId = `world_${params.worldType}_${Date.now()}`;
    const code = `WORLD-${params.worldType.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProject: WeddingProject = {
      id: newId,
      title: generated.title,
      worldType: params.worldType,
      coupleNames: generated.title,
      weddingDate: '2025-07-20',
      locationName: params.location || 'Monde Spatial Universel',
      budgetTarget: generated.budget,
      guestCountTarget: 100,
      ownerId: this.activeAccount?.id || 'account_user',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inviteCode: code,
    };

    saveWeddingProject(newProject);
    setActiveProjectId(newId);
    this.currentProject = newProject;
    this.markProjectChosen();
    this.projection = 'world';

    // MEASURED IN THE BROWSER (World Lab acceptance): this used to overwrite
    // only places/agents/docs/tasks/phases/tracks and leave EVERYTHING ELSE
    // from the previously open project in place. A two-week roadtrip in Japan
    // was therefore created carrying the wedding demo's 35 people, 27 guests,
    // 8 vendors and 6 seating tables — and a second generated world inherited
    // whatever had just been edited in the first one.
    //
    // The world is now built on an EMPTY domain, exactly like a new wedding,
    // and only the generated entities are placed into it.
    applyDomain(this, null, createEmptyDomainState());

    this.time = 12.0;
    this.places = generated.places;
    this.agents = generated.agents;
    this.docs = generated.docs;
    this.tasks = generated.tasks;
    this.phases = generated.phases;
    this.tracks = generated.tracks;
    // `[...INITIAL_RECONSTRUCTED_VENUES]` was a shallow copy of a demo
    // constant: two projects ended up sharing the very same objects. A
    // generated world has no reconstructed venue until one is really built.
    this.reconstructedVenues = [];
    this.placedObjects = [];

    // The generated agents are real entities of THIS world, so they get their
    // identity projection (Person/Guest/DMC) derived here, from them alone.
    this.ensureIdentityModel();

    this.userIdentity = {
      role: 'wedding_planner',
      name: 'Directeur de Projet',
      roleTitle: 'Pilote Spatiale',
      outfitColor: BRAND_ACCENT,
      accessory: 'planner',
      avatarIcon: 'planner',
      isCreated: true,
    };

    this.saveCurrentState();
    this.worldLabModalOpen = false;
    this.brandMenuOpen = false;
    this.interiorMode = false;
    this.cameraTargetPos = [0, 2, 0];
    this.spawnGridWave([0, 0, 0], BRAND_ACCENT);
    this.notify();
  }

  public loadProject(projectId: string) {
    const projects = getStoredProjects();
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    setActiveProjectId(projectId);
    this.currentProject = proj;
    this.markProjectChosen();
    // Opening a wedding means opening its day.
    this.projection = 'mirror';
    const saved = loadPersistedState(projectId);
    // Same single restore path as boot. With no snapshot, the fallback depends
    // on WHICH project this is: the demo falls back to the demo, any real
    // wedding falls back to an empty world — never to somebody else's data.
    const fallback = proj.isDemo ? createDefaultDomainState() : createEmptyDomainState();
    this.lastRestoreReport = applyDomain(this, saved, fallback);
    this.ensureIdentityModel();

    // Nothing from the previous project may stay selected: those ids do not
    // exist here. Measured risk from the acceptance pass.
    this.canvasFocus = null;
    this.canvasSection = null;
    this.selectedEntity = null;
    this.mirrorFocusPersonId = null;
    this.interiorMode = false;

    weddingAudio.playNeuralWave();
    this.brandMenuOpen = false;
    this.focusPlace('place_ceremonie');
    this.notify();
  }

  // -------------------------------------------------------------------------
  // Invitations — real local resolution.
  //
  // Previously the invite link (`/?code=...&role=...`) was generated and
  // copied, but NOTHING in the app ever read it, and the "Rejoindre" form kept
  // its code in component state and threw it away. Both paths are now real.
  //
  // HONEST SCOPE: resolution is local to this browser's stored projects. There
  // is no server, so a code created on another device cannot resolve here —
  // that requires the backend (roadmap P3) and is reported as such instead of
  // being faked.
  // -------------------------------------------------------------------------

  /** Find a stored project by invite code (case/whitespace tolerant). */
  public resolveInviteCode(code: string): WeddingProject | null {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) return null;
    const projects = getStoredProjects();
    return projects.find((p) => (p.inviteCode || '').trim().toUpperCase() === normalized) || null;
  }

  /**
   * Join a project from an invite code, optionally applying a role.
   * Returns a structured outcome so the UI can explain failures truthfully.
   */
  public joinProjectByCode(
    code: string,
    role?: string,
  ): { ok: boolean; reason?: 'empty' | 'unknown'; project?: WeddingProject } {
    const normalized = (code || '').trim();
    if (!normalized) return { ok: false, reason: 'empty' };

    const project = this.resolveInviteCode(normalized);
    if (!project) return { ok: false, reason: 'unknown' };

    this.loadProject(project.id);
    if (role) this.applyInviteRole(role);
    this.saveCurrentState();
    this.notify();
    return { ok: true, project };
  }

  /** Map an invite role onto the local identity, when it is a role we know. */
  public applyInviteRole(role: string): void {
    const known: Record<string, AgentRole> = {
      guest: 'guest',
      vendor: 'caterer',
      planner: 'wedding_planner',
      bride: 'bride',
      groom: 'groom',
      photographer: 'photographer',
      dj: 'dj',
    };
    const mapped = known[(role || '').toLowerCase()];
    if (!mapped) return;
    this.userIdentity = { ...this.userIdentity, role: mapped, isCreated: true };
  }

  /**
   * Consume `?code=...&role=...` from the current URL, if present.
   * Called once at startup. Returns the outcome so the UI can surface it.
   */
  public consumeInviteFromUrl(search?: string): { ok: boolean; reason?: string; code?: string } | null {
    if (typeof window === 'undefined' && search === undefined) return null;
    const raw = search ?? window.location.search;
    if (!raw) return null;

    let params: URLSearchParams;
    try {
      params = new URLSearchParams(raw);
    } catch {
      return null;
    }

    const code = params.get('code');
    if (!code) return null;
    const role = params.get('role') || undefined;

    const result = this.joinProjectByCode(code, role);
    this.lastInviteResult = result.ok
      ? { ok: true, code }
      : { ok: false, code, reason: result.reason };
    return this.lastInviteResult;
  }

  /** Outcome of the last invite consumption, for honest UI feedback. */
  public lastInviteResult: { ok: boolean; code?: string; reason?: string } | null = null;

  public switchToDemoWedding() {
    this.loadProject('proj_demo_clara_alexandre');
  }

  // User Account Authentication
  public loginUser(email: string, name: string, role: AgentRole) {
    const newAccount: UserAccount = {
      id: `acc_${Date.now()}`,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    };
    saveUserAccount(newAccount);
    this.activeAccount = newAccount;
    this.authModalOpen = false;
    weddingAudio.playResolveSuccess();
    this.notify();
  }

  public logout() {
    logoutUser();
    this.activeAccount = null;
    this.brandMenuOpen = false;
    this.switchToDemoWedding();
    weddingAudio.playClick();
    this.notify();
  }

  // DJ Zone Methods
  public setDjBoothOpen(open: boolean) {
    this.djBoothModalOpen = open;
    if (open) {
      weddingAudio.playClick();
      this.focusPlace('place_dancefloor');
    }
    this.notify();
  }

  public addTrack(trackData: {
    title: string;
    artist: string;
    moment: WeddingMoment;
    suggestedBy: string;
    note?: string;
    bpm?: number;
    energy?: number;
  }) {
    weddingAudio.playTrackUpvote();
    weddingAudio.playNeuralWave();

    const bpm = trackData.bpm || (trackData.moment === 'soiree' ? 128 : trackData.moment === 'cocktail' ? 95 : trackData.moment === 'premiere_danse' ? 70 : 105);
    const energy = trackData.energy || (trackData.moment === 'soiree' ? 5 : trackData.moment === 'cocktail' ? 3 : 4);

    const newTrack: TrackEntity = {
      id: `track_${Date.now()}`,
      title: trackData.title,
      artist: trackData.artist,
      moment: trackData.moment,
      status: trackData.suggestedBy.toLowerCase().includes('marié') || trackData.suggestedBy.toLowerCase().includes('clara') || trackData.suggestedBy.toLowerCase().includes('alexandre') ? 'bride_groom' : 'pending',
      bpm,
      energy,
      duration: '3:30',
      suggestedBy: trackData.suggestedBy,
      note: trackData.note,
      votes: 1,
      hasVoted: true,
    };

    this.tracks.unshift(newTrack);
    this.spawnGridWave([14, 0, -32], BRAND_ACCENT);
    this.spawnNeuralPulse([14, 0, -32], [-12, 0, 6], '#ffffff');
    this.saveCurrentState();
    this.notify();
  }

  /** Has THIS person already voted for the track? */
  public hasPersonVoted(trackId: string, personId?: string | null): boolean {
    const pid = personId ?? this.currentPersonId;
    if (!pid) return false;
    return this.trackVotes.some((v) => v.trackId === trackId && v.personId === pid);
  }

  public getTrackVoters(trackId: string): Person[] {
    return this.trackVotes
      .filter((v) => v.trackId === trackId)
      .map((v) => this.getPerson(v.personId))
      .filter((p): p is Person => p !== null);
  }

  public voteTrack(trackId: string) {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;

    // Votes are now recorded PER PERSON. `hasVoted` used to be a boolean on
    // the track itself, so the first vote marked the song as "already voted"
    // for every single user. It is kept in sync below purely for backward
    // compatibility with existing UI reads.
    const personId = this.currentPersonId;
    const already = personId ? this.hasPersonVoted(trackId, personId) : track.hasVoted;

    if (!already) {
      if (personId) {
        this.trackVotes.push({ trackId, personId, votedAt: new Date().toISOString() });
      }
      track.votes += 1;
      track.hasVoted = personId ? this.hasPersonVoted(trackId, personId) : true;
      weddingAudio.playTrackUpvote();

      if (track.votes >= 10 && track.status === 'pending') {
        track.status = 'verified';
      }
      this.spawnGridWave([14, 0, -32], BRAND_ACCENT);
      this.saveCurrentState();
      this.notify();
    }
  }

  public validateTrack(trackId: string) {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;
    track.status = 'verified';
    weddingAudio.playResolveSuccess();
    this.spawnGridWave([14, 0, -32], '#10b981');
    this.saveCurrentState();
    this.notify();
  }

  public removeTrack(trackId: string) {
    this.beginMutation('Retirer un morceau');
    this.tracks = this.tracks.filter((t) => t.id !== trackId);
    // Votes must not outlive their track (would break integrity).
    this.trackVotes = this.trackVotes.filter((v) => v.trackId !== trackId);
    weddingAudio.playClick();
    this.saveCurrentState();
    this.notify();
  }

  public smartHarmonizePlaylist() {
    weddingAudio.playDjHarmonize();
    weddingAudio.playNeuralWave();

    const momentOrder: Record<WeddingMoment, number> = {
      ceremonie: 1,
      cocktail: 2,
      repas: 3,
      premiere_danse: 4,
      soiree: 5,
    };

    this.tracks.sort((a, b) => {
      if (momentOrder[a.moment] !== momentOrder[b.moment]) {
        return momentOrder[a.moment] - momentOrder[b.moment];
      }
      return b.votes - a.votes;
    });

    this.spawnGridWave([14, 0, -32], BRAND_ACCENT);
    this.spawnGridWave([-12, 0, 6], '#ffffff');
    this.spawnGridWave([10, 0, 8], BRAND_ACCENT);
    this.saveCurrentState();
    this.notify();
  }

  public simulateGuestSuggestion() {
    const guestNames = ['Camille (Amie fac)', 'Antoine (Témoin)', 'Mathilde (Cousine)', 'Hugo (Ami enfance)', 'Sarah (Invitée)'];
    const trackPicks = [
      { title: 'Dancing Queen', artist: 'ABBA', moment: 'soiree' as WeddingMoment, bpm: 101, energy: 4 },
      { title: 'Fly Me to the Moon', artist: 'Frank Sinatra', moment: 'cocktail' as WeddingMoment, bpm: 88, energy: 2 },
      { title: 'Can’t Stop the Feeling!', artist: 'Justin Timberlake', moment: 'soiree' as WeddingMoment, bpm: 113, energy: 5 },
      { title: 'Stand by Me', artist: 'Ben E. King', moment: 'repas' as WeddingMoment, bpm: 90, energy: 3 },
    ];
    const pick = trackPicks[Math.floor(Math.random() * trackPicks.length)];
    const guest = guestNames[Math.floor(Math.random() * guestNames.length)];

    this.addTrack({
      title: pick.title,
      artist: pick.artist,
      moment: pick.moment,
      suggestedBy: guest,
      note: 'Proposition collaborative envoyée depuis la DJ Zone !',
      bpm: pick.bpm,
      energy: pick.energy,
    });
  }

  public getBudgetMetrics() {
    const totalCommitted = this.docs.reduce((acc, d) => acc + (d.amount || 0), 0);
    const totalDeposits = this.docs.reduce((acc, d) => acc + (d.depositAmount || 0), 0);
    const paidDocsTotal = this.docs.filter((d) => d.isPaid).reduce((acc, d) => acc + (d.amount || 0), 0);
    const unresolvedConflicts = this.conflicts.filter((c) => !c.isResolved).length;
    const completedTasks = this.tasks.filter((t) => t.isDone).length;
    const totalTasks = this.tasks.length;

    return {
      totalCommitted,
      totalDeposits,
      paidDocsTotal,
      unresolvedConflicts,
      completedTasks,
      totalTasks,
      completionRate: Math.round((completedTasks / Math.max(1, totalTasks)) * 100),
      guestSatisfaction: Math.min(100, Math.max(60, 100 - unresolvedConflicts * 6 + completedTasks * 2)),
    };
  }

  public setTime(newTime: number) {
    this.time = Math.max(10.0, Math.min(27.0, newTime));
    this.updateAgentsForTime();
    this.updateVehiclesForTime();
    this.notify();
  }

  public toggleOrchestration() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      weddingAudio.playClick();
      weddingAudio.playNeuralWave();
    }
    this.notify();
  }

  public setSpeed(newSpeed: number) {
    this.speed = newSpeed;
    weddingAudio.playClick();
    this.notify();
  }

  public setViewMode(mode: 'world' | 'timeline') {
    this.viewMode = mode;
    weddingAudio.playClick();
    this.notify();
  }

  public selectEntity(type: 'agent' | 'place' | 'document' | 'task' | 'phase' | 'conflict' | 'route' | 'track' | 'object' | 'venue', id: string) {
    this.selectedEntity = { type, id };
    weddingAudio.playClick();

    const pos = this.getEntityPosition(type, id);
    if (pos) {
      this.spawnGridWave(pos, BRAND_ACCENT);
      this.cameraTargetPos = [pos[0], pos[1] + 1.5, pos[2]];
    }

    this.notify();
  }

  public clearSelection() {
    this.selectedEntity = null;
    this.selectedObjectId = null;
    this.notify();
  }

  public setHoveredEntity(id: string | null) {
    if (this.hoveredEntityId !== id) {
      this.hoveredEntityId = id;
      this.notify();
    }
  }

  public focusPlace(placeId: string) {
    const place = this.places.find((p) => p.id === placeId);
    if (place) {
      this.cameraTargetPos = [place.pos[0], place.pos[1] + 1.5, place.pos[2]];
      this.selectEntity('place', place.id);
    }
  }

  public getEntityPosition(type: string, id: string): [number, number, number] | null {
    if (type === 'agent') {
      const a = this.agents.find((x) => x.id === id);
      return a ? a.currentPos : null;
    }
    if (type === 'place') {
      const p = this.places.find((x) => x.id === id);
      return p ? p.pos : null;
    }
    if (type === 'track') {
      return [14, 0, -32];
    }
    if (type === 'object') {
      const o = this.placedObjects.find((x) => x.id === id);
      return o ? o.pos : null;
    }
    if (type === 'document') {
      const d = this.docs.find((x) => x.id === id);
      if (d && d.connectedPlaceIds.length > 0) {
        const p = this.places.find((x) => x.id === d.connectedPlaceIds[0]);
        return p ? p.pos : [0, 0, 0];
      }
      return [0, 0, 0];
    }
    if (type === 'task') {
      const t = this.tasks.find((x) => x.id === id);
      if (t && t.assignedPlaceId) {
        const p = this.places.find((x) => x.id === t.assignedPlaceId);
        return p ? p.pos : [0, 0, 0];
      }
      return [0, 0, 0];
    }
    if (type === 'conflict') {
      const c = this.conflicts.find((x) => x.id === id);
      if (c) {
        return this.getEntityPosition('agent', c.sourceEntityId) || this.getEntityPosition('document', c.sourceEntityId) || [0, 0, 0];
      }
    }
    if (type === 'phase') {
      const ph = this.phases.find((x) => x.id === id);
      if (ph) {
        const p = this.places.find((x) => x.id === ph.primaryPlaceId);
        return p ? p.pos : [0, 0, 0];
      }
    }
    return null;
  }

  public spawnGridWave(center: [number, number, number], color = BRAND_ACCENT) {
    this.gridWaves.push({
      id: `wave_${Date.now()}_${Math.random()}`,
      center,
      radius: 0.5,
      maxRadius: 28,
      color,
      speed: 18,
      strength: 1.0,
    });
  }

  public spawnNeuralPulse(from: [number, number, number], to: [number, number, number], color = '#ffffff') {
    this.neuralPulses.push({
      id: `pulse_${Date.now()}_${Math.random()}`,
      from,
      to,
      progress: 0,
      color,
      speed: 1.8,
    });
  }

  public tick(delta: number) {
    if (this.introCinematicActive) {
      this.introProgress = Math.min(1.0, this.introProgress + delta * 0.45);
      if (this.introProgress >= 1.0) {
        this.introCinematicActive = false;
      }
      this.notify();
    }

    if (this.isPlaying) {
      const timeStep = delta * this.speed * 0.04;
      this.time += timeStep;
      if (this.time >= 27.0) {
        this.time = 10.0;
      }

      this.tasks.forEach((t) => {
        if (!t.isDone && this.time >= t.dueHour + 0.1 && t.category !== 'paiement') {
          t.isDone = true;
        }
      });

      this.updateAgentsForTime();
      this.updateVehiclesForTime();
      this.checkSpecialMoments();
    }

    let agentMoved = false;
    this.agents.forEach((agent) => {
      const dx = agent.targetPos[0] - agent.currentPos[0];
      const dz = agent.targetPos[2] - agent.currentPos[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        agentMoved = true;
        const step = Math.min(dist, agent.speed * delta * (this.isPlaying ? Math.min(this.speed, 3) : 1));
        const nx = agent.currentPos[0] + (dx / dist) * step;
        const nz = agent.currentPos[2] + (dz / dist) * step;
        agent.currentPos = [nx, 0, nz];
        agent.rotation = Math.atan2(dx, dz);
      }
    });

    this.vehicles.forEach((veh) => {
      const dx = veh.targetPos[0] - veh.pos[0];
      const dz = veh.targetPos[2] - veh.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 0.1) {
        const step = Math.min(dist, veh.speed * delta * (this.isPlaying ? Math.min(this.speed, 2) : 1));
        veh.pos[0] += (dx / dist) * step;
        veh.pos[2] += (dz / dist) * step;
        veh.rotation = Math.atan2(dx, dz);
      }
    });

    for (let i = this.gridWaves.length - 1; i >= 0; i--) {
      const wave = this.gridWaves[i];
      wave.radius += wave.speed * delta;
      wave.strength = Math.max(0, 1 - wave.radius / wave.maxRadius);
      if (wave.radius >= wave.maxRadius) {
        this.gridWaves.splice(i, 1);
      }
    }

    for (let i = this.neuralPulses.length - 1; i >= 0; i--) {
      const pulse = this.neuralPulses[i];
      pulse.progress += pulse.speed * delta;
      if (pulse.progress >= 1) {
        this.neuralPulses.splice(i, 1);
      }
    }

    if (this.isPlaying || agentMoved || this.gridWaves.length > 0 || this.neuralPulses.length > 0) {
      this.notify();
    }
  }

  private updateVehiclesForTime() {
    const roadster = this.vehicles.find((v) => v.id === 'veh_roadster');
    const shuttle = this.vehicles.find((v) => v.id === 'veh_shuttle_1');

    if (this.time < 13.5) {
      if (roadster) roadster.targetPos = [-12, 0, -22];
      if (shuttle) shuttle.targetPos = [-42, 0, 10];
    } else if (this.time < 15.0) {
      if (roadster) roadster.targetPos = [-42, 0, 28];
      if (shuttle) shuttle.targetPos = [-42, 0, 28];
    } else if (this.time < 17.0) {
      if (roadster) roadster.targetPos = [-12, 0, 6];
      if (shuttle) shuttle.targetPos = [-12, 0, 6];
    } else if (this.time < 19.5) {
      if (roadster) roadster.targetPos = [10, 0, 8];
      if (shuttle) shuttle.targetPos = [10, 0, 8];
    } else {
      if (roadster) roadster.targetPos = [32, 0, -12];
      if (shuttle) shuttle.targetPos = [14, 0, -32];
    }
  }

  private updateAgentsForTime() {
    const currentPhase = this.getActivePhase();
    if (!currentPhase) return; // an empty programme moves nobody
    const primaryPlace = this.places.find((p) => p.id === currentPhase.primaryPlaceId);
    if (!primaryPlace) return;

    this.agents.forEach((agent) => {
      if (agent.role === 'bride') {
        if (this.time < 13.5) agent.targetPos = [-12, 0, -22];
        else if (this.time < 15.0) agent.targetPos = [-42, 0, 28];
        else if (this.time < 17.0) agent.targetPos = [-12, 0, 6];
        else if (this.time < 19.5) agent.targetPos = [10, 0, 8];
        else if (this.time < 22.5) agent.targetPos = [32, 0, -12];
        else agent.targetPos = [14, 0, -32];
      } else if (agent.role === 'groom') {
        if (this.time < 13.5) agent.targetPos = [-11, 0, -21];
        else if (this.time < 15.0) agent.targetPos = [-41.5, 0, 28];
        else if (this.time < 17.0) agent.targetPos = [-11.5, 0, 6];
        else if (this.time < 19.5) agent.targetPos = [10.5, 0, 8.2];
        else if (this.time < 22.5) agent.targetPos = [32.5, 0, -12];
        else agent.targetPos = [14.5, 0, -32];
      } else if (agent.role === 'photographer') {
        if (this.time < 13.5) agent.targetPos = [-10, 0, -20];
        else if (this.time < 15.0) agent.targetPos = [-40, 0, 27];
        else if (this.time < 17.0) agent.targetPos = [-9.5, 0, 5.5];
        else if (this.time < 19.5) agent.targetPos = [12.5, 0, 9.5];
        else if (this.time < 22.5) agent.targetPos = [29.5, 0, -10.5];
        else agent.targetPos = [16.5, 0, -30];
      } else if (agent.role === 'videographer') {
        if (this.time < 13.5) agent.targetPos = [-9.5, 0, -19.5];
        else if (this.time < 15.0) agent.targetPos = [-39.5, 0, 29];
        else if (this.time < 17.0) agent.targetPos = [-9.5, 0, 7.0];
        else if (this.time < 19.5) agent.targetPos = [8.5, 0, 10.0];
        else if (this.time < 22.5) agent.targetPos = [34.5, 0, -11.0];
        else agent.targetPos = [12.5, 0, -30];
      } else if (agent.role === 'caterer' || agent.role === 'chef' || agent.role === 'server') {
        if (this.time < 16.5) agent.targetPos = [34, 0, -8];
        else if (this.time < 19.5) agent.targetPos = [11, 0, 10];
        else if (this.time < 22.5) agent.targetPos = [31, 0, -11];
        else agent.targetPos = [33, 0, -9];
      } else if (agent.role === 'dj') {
        if (this.time < 16.5) agent.targetPos = [14, 0, -33];
        else if (this.time < 19.5) agent.targetPos = [11.5, 0, 6.5];
        else agent.targetPos = [14, 0, -33];
      } else if (agent.role === 'guest') {
        if (this.time < 13.5) {
          agent.targetPos = [-42 + (Math.sin(agent.id.charCodeAt(6)) * 3), 0, 10 + (Math.cos(agent.id.charCodeAt(6)) * 3)];
        } else if (this.time < 15.0) {
          agent.targetPos = [-42 + (Math.sin(agent.id.charCodeAt(6)) * 2), 0, 28 + (Math.cos(agent.id.charCodeAt(6)) * 2)];
        } else if (this.time < 17.0) {
          const row = (agent.assignedTable || 1) - 1;
          const col = (agent.id.charCodeAt(agent.id.length - 1) % 4) - 2;
          agent.targetPos = [-12 + col * 1.4, 0, 6 + row * 1.3];
        } else if (this.time < 19.5) {
          const angle = (agent.id.charCodeAt(agent.id.length - 1) * 1.3);
          const rad = 2.5 + (agent.id.charCodeAt(6) % 4) * 1.0;
          agent.targetPos = [10 + Math.cos(angle) * rad, 0, 8 + Math.sin(angle) * rad];
        } else if (this.time < 22.5) {
          const tIdx = (agent.assignedTable || 1) - 1;
          const tRow = Math.floor(tIdx / 3);
          const tCol = tIdx % 3;
          const angle = (agent.id.charCodeAt(agent.id.length - 1) * 1.5);
          agent.targetPos = [28 + tCol * 3.5 + Math.cos(angle) * 1.0, 0, -15 + tRow * 3.5 + Math.sin(angle) * 1.0];
        } else {
          const angle = (agent.id.charCodeAt(agent.id.length - 1) * 2.0);
          const rad = 1.0 + (agent.id.charCodeAt(6) % 4) * 0.8;
          agent.targetPos = [14 + Math.cos(angle) * rad, 0, -32 + Math.sin(angle) * rad];
        }
      }
    });
  }

  private lastTriggerHour: number = 0;
  private checkSpecialMoments() {
    const roundedTime = Math.floor(this.time * 10) / 10;
    if (roundedTime !== this.lastTriggerHour) {
      this.lastTriggerHour = roundedTime;

      if (Math.abs(this.time - 16.0) < 0.1) {
        weddingAudio.playWeddingChimes();
        this.triggerCameraFlash();
      }
      if (Math.abs(this.time - 17.2) < 0.1) {
        weddingAudio.playChampagneClink();
      }
      if (Math.abs(this.time - 22.8) < 0.1) {
        this.specialFx.sparklersActive = true;
        this.triggerCameraFlash();
      }
      if (Math.abs(this.time - 24.0) < 0.1) {
        this.specialFx.fireworksActive = true;
        this.specialFx.confettiBurst = true;
      }
    }
  }

  public triggerCameraFlash() {
    weddingAudio.playCameraFlash();
    this.specialFx.cameraFlashing = true;
    setTimeout(() => {
      this.specialFx.cameraFlashing = false;
      this.notify();
    }, 180);
    this.notify();
  }

  public resolveConflict(conflictId: string) {
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict || conflict.isResolved) return;

    conflict.isResolved = true;
    weddingAudio.playResolveSuccess();
    weddingAudio.playNeuralWave();

    if (conflictId === 'conflict_photo_time') {
      const photoAgent = this.agents.find((a) => a.id === 'agent_photographer');
      if (photoAgent) {
        photoAgent.isConflict = false;
        photoAgent.arrivalHour = 14.5;
        photoAgent.thoughtText = 'Horaires synchronisés à 14h30.';
      }
      const photoDoc = this.docs.find((d) => d.id === 'doc_contrat_photo');
      if (photoDoc) {
        photoDoc.extractedHour = '14:30 - 23:30 (Avenant validé)';
      }
    } else if (conflictId === 'conflict_traiteur_acompte') {
      const task = this.tasks.find((t) => t.id === 'task_payer_acompte_traiteur');
      if (task) task.isDone = true;
      const doc = this.docs.find((d) => d.id === 'doc_devis_traiteur');
      if (doc) doc.isPaid = true;
    } else if (conflictId === 'conflict_guest_allergy') {
      const guest = this.agents.find((a) => a.id === 'agent_guest_15');
      if (guest) {
        guest.thoughtText = 'Menu de substitution confirmé en cuisine.';
      }
    }

    conflict.impactedEntityIds.forEach((entId) => {
      const pos = this.getEntityPosition('agent', entId) || this.getEntityPosition('place', entId) || [0, 0, 0];
      this.spawnGridWave(pos, BRAND_ACCENT);
    });

    this.saveCurrentState();
    this.notify();
  }

  public importChaosFile(preset: ImportPresetFile | { name: string; rawText: string; amount?: number; depositAmount?: number }) {
    weddingAudio.playImportChaos();
    weddingAudio.playNeuralWave();

    let newDoc: DocumentEntity;
    const nowHour = this.time;

    if ('previewSnippet' in preset) {
      newDoc = {
        id: `doc_import_${Date.now()}`,
        title: preset.label,
        category: preset.type === 'PDF' ? 'facture' : preset.type === 'SMS' ? 'sms' : 'note',
        fileName: preset.name,
        amount: preset.extractedSummary.budget > 0 ? preset.extractedSummary.budget : undefined,
        depositAmount: preset.extractedSummary.budget > 0 ? Math.round(preset.extractedSummary.budget * 0.3) : undefined,
        isPaid: false,
        rawTextExcerpt: preset.previewSnippet,
        extractedDate: '14 Juin 2025',
        extractedHour: `${Math.floor(nowHour)}:00`,
        connectedAgentIds: ['agent_planner', 'agent_bride'],
        connectedPlaceIds: ['place_ceremonie', 'place_cocktail'],
        connectedTaskIds: [],
        createdAtHour: nowHour,
      };
    } else {
      newDoc = {
        id: `doc_import_${Date.now()}`,
        title: `Document Importé — ${preset.name}`,
        category: 'note',
        fileName: preset.name,
        amount: preset.amount,
        depositAmount: preset.depositAmount,
        isPaid: false,
        rawTextExcerpt: preset.rawText,
        extractedDate: '14 Juin 2025',
        extractedHour: `${Math.floor(nowHour)}:00`,
        connectedAgentIds: ['agent_planner', 'agent_bride'],
        connectedPlaceIds: ['place_ceremonie'],
        connectedTaskIds: [],
        createdAtHour: nowHour,
      };
    }

    this.docs.unshift(newDoc);

    const newTask: TaskEntity = {
      id: `task_auto_${Date.now()}`,
      title: `Valider l’extraction : ${newDoc.title}`,
      category: newDoc.amount ? 'paiement' : 'logistique',
      dueHour: Math.min(24, Math.floor(nowHour) + 1.5),
      isDone: false,
      urgent: true,
      cost: newDoc.depositAmount,
      assignedAgentId: 'agent_planner',
      assignedPlaceId: 'place_manoir',
      connectedDocIds: [newDoc.id],
      connectedAgentIds: ['agent_planner', 'agent_bride'],
    };
    this.tasks.unshift(newTask);
    newDoc.connectedTaskIds.push(newTask.id);

    this.spawnGridWave([0, 0, 0], BRAND_ACCENT);
    this.spawnGridWave([-12, 0, 6], '#ffffff');
    this.spawnGridWave([10, 0, 8], BRAND_ACCENT);

    this.selectEntity('document', newDoc.id);
    this.saveCurrentState();
    this.notify();
  }
}

export const weddingStore = new WeddingStore();
