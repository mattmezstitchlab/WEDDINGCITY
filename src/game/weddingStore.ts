import {
  Agent,
  AgentRole,
  Place,
  DocumentEntity,
  TaskEntity,
  ConflictEntity,
  TimelinePhase,
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
import { DEFAULT_DMC_IDENTITY } from './dmcPalette';
import { INITIAL_AD_SLOTS } from './advertisingEngine';
import { weddingAudio } from './audio';
import {
  getStoredProjects,
  saveWeddingProject,
  getActiveProjectId,
  setActiveProjectId,
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
    userDmcIdentity: DEFAULT_DMC_IDENTITY,
    places: INITIAL_PLACES,
    agents: INITIAL_AGENTS,
    docs: INITIAL_DOCS,
    tasks: INITIAL_TASKS,
    conflicts: INITIAL_CONFLICTS,
    phases: TIMELINE_PHASES,
    tracks: INITIAL_TRACKS,
    reconstructedVenues: INITIAL_RECONSTRUCTED_VENUES,
    placedObjects: INITIAL_RECONSTRUCTED_VENUES[0].objects,
    adSlots: INITIAL_AD_SLOTS,
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
      const activeProjId = getActiveProjectId();
      const projects = getStoredProjects();
      const proj = projects.find((p) => p.id === activeProjId) || projects[0];
      if (proj) {
        this.currentProject = proj;
        const saved = loadPersistedState(proj.id);
        if (saved) {
          // Single restore path (shared with loadProject). Defaults are the
          // values the store was constructed with, so a partial/legacy
          // snapshot degrades field-by-field instead of wiping state.
          this.lastRestoreReport = applyDomain(this, saved, serializeDomain(this));
        }
      }
    } catch {
      // safe fallback
    }
  }

  public saveCurrentState() {
    try {
      savePersistedState(this.currentProject.id, {
        project: this.currentProject,
        // Single serializer — driven by PERSISTED_FIELDS, so this can never
        // fall out of sync with the restore path again.
        ...serializeDomain(this),
      });
      saveWeddingProject(this.currentProject);
    } catch {
      // safe fallback
    }
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

  public getActivePhase(): TimelinePhase {
    const current = this.phases.find((p) => this.time >= p.startHour && this.time < p.endHour);
    return current || this.phases[0];
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
    const code = `WC-${new Date(params.weddingDate).getFullYear() || 2025}-${params.coupleNames.split('&')[0].trim().toUpperCase()}`;

    const newProject: WeddingProject = {
      id: newId,
      title: `Mariage de ${params.coupleNames}`,
      worldType: 'wedding',
      coupleNames: params.coupleNames,
      weddingDate: params.weddingDate || '2025-09-20',
      locationName: params.locationName || 'Domaine d’Exception',
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

    this.userIdentity = {
      role: params.userRole,
      name: params.userName || params.coupleNames.split('&')[0].trim(),
      roleTitle: params.userRole === 'wedding_planner' ? 'Wedding Planner' : params.userRole === 'bride' ? 'La Mariée' : params.userRole === 'groom' ? 'Le Marié' : 'Organisateur',
      outfitColor: BRAND_ACCENT,
      accessory: 'planner',
      avatarIcon: 'planner',
      isCreated: true,
    };

    this.time = 14.0;
    this.places = [...INITIAL_PLACES];
    this.agents = [...INITIAL_AGENTS];
    this.docs = [...INITIAL_DOCS];
    this.tasks = [...INITIAL_TASKS];
    this.conflicts = [...INITIAL_CONFLICTS];
    this.tracks = [...INITIAL_TRACKS];
    this.reconstructedVenues = [...INITIAL_RECONSTRUCTED_VENUES];
    this.placedObjects = [...INITIAL_RECONSTRUCTED_VENUES[0].objects];

    const names = params.coupleNames.split('&');
    if (names.length >= 2) {
      const bride = this.agents.find((a) => a.role === 'bride');
      if (bride) bride.name = names[0].trim();
      const groom = this.agents.find((a) => a.role === 'groom');
      if (groom) groom.name = names[1].trim();
    }

    this.saveCurrentState();
    this.createWeddingModalOpen = false;
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

    // Load generated entities
    this.time = 12.0;
    this.places = generated.places;
    this.agents = generated.agents;
    this.docs = generated.docs;
    this.tasks = generated.tasks;
    this.phases = generated.phases;
    this.tracks = generated.tracks;
    this.conflicts = [];
    this.reconstructedVenues = [...INITIAL_RECONSTRUCTED_VENUES];
    this.placedObjects = [...INITIAL_RECONSTRUCTED_VENUES[0].objects];

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
    const saved = loadPersistedState(projectId);
    // Same single restore path as boot. When there is no snapshot, every field
    // simply falls back to its pristine default.
    this.lastRestoreReport = applyDomain(this, saved, createDefaultDomainState());

    weddingAudio.playNeuralWave();
    this.brandMenuOpen = false;
    this.focusPlace('place_ceremonie');
    this.notify();
  }

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

  public voteTrack(trackId: string) {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;

    if (!track.hasVoted) {
      track.votes += 1;
      track.hasVoted = true;
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
    this.tracks = this.tracks.filter((t) => t.id !== trackId);
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
