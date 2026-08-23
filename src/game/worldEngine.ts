import {
  WorldType,
  WorldArchetype,
  Place,
  Agent,
  TaskEntity,
  DocumentEntity,
  TimelinePhase,
  TrackEntity,
} from '../types/wedding';
import { BRAND_ACCENT } from './weddingStore';

// 11 Universal World Archetypes for the World Lab
export const WORLD_ARCHETYPES: WorldArchetype[] = [
  {
    id: 'wedding',
    title: 'MARIAGE (Wedding City)',
    subtitle: 'Organisation complète, prestataires, Jour J & scénographie',
    icon: '💍',
    badge: 'Flagship World',
    description: 'Le monde de référence pour orchestrer chaque détail du mariage : cérémonie, banquet, DJ, traiteur, budget et invités.',
    samplePrompt: 'Mariage de Clara & Alexandre au Château de Bellevue, 120 invités, cocktail en terrasse, dîner 3 plats, ouverture de bal.',
    defaultLocation: 'Château de Bellevue & Grand Parc',
    defaultBudget: 25000,
    activeModules: ['Worldmap 3D', 'Data Graph', 'DJ Zone', 'OCR Chaos', 'Timeline', 'Budget'],
  },
  {
    id: 'travel',
    title: 'VOYAGE (Travel World)',
    subtitle: 'Itinéraire, étapes, réservations, spots secrets & budget',
    icon: '✈️',
    badge: 'Exploration',
    description: 'Transformez un voyage ou une lune de miel en monde vivant : étapes quotidiennes, hôtels, vols, trains, restaurants et activités.',
    samplePrompt: 'Roadtrip de 2 semaines au Japon : Tokyo Shibuya, Mont Fuji, temples de Kyoto et îles d’Okinawa pour 2 personnes.',
    defaultLocation: 'Japon (Tokyo • Kyoto • Hakone)',
    defaultBudget: 6500,
    activeModules: ['Worldmap 3D', 'Itinéraire', 'Hébergements', 'Réservations', 'Budget Devise', 'Timeline'],
  },
  {
    id: 'event',
    title: 'ÉVÉNEMENT (Event City)',
    subtitle: 'Séminaire, festival, gala, plénières & intervenants',
    icon: '🎪',
    badge: 'Entreprise & Culture',
    description: 'Planifiez et simulez un événement d’envergure avec régie technique, intervenants, stands, catering et flux de participants.',
    samplePrompt: 'Séminaire annuel Tech & Innovation 200 personnes : plénière le matin, 4 ateliers l’après-midi, cocktail networking le soir.',
    defaultLocation: 'Palais des Congrès & Espaces Salons',
    defaultBudget: 45000,
    activeModules: ['Worldmap 3D', 'Intervenants', 'Plénières', 'Ateliers', 'Catering', 'Timeline'],
  },
  {
    id: 'concert',
    title: 'CONCERT / TOURNÉE (Tour World)',
    subtitle: 'Scènes, setlists, régie sono, loges & billetterie',
    icon: '🎸',
    badge: 'Musique Live',
    description: 'Orchestrez une tournée, un concert ou un festival musical : line-up, balances son, catering artistes et transport du matériel.',
    samplePrompt: 'Tournée SoundWave Live 5 dates : balances à 16h, première partie à 20h, show principal à 21h30, régie lumière et merch.',
    defaultLocation: 'Zénith & Scènes Événementielles',
    defaultBudget: 35000,
    activeModules: ['Scènes 3D', 'Setlist & DJ', 'Régie Technique', 'Merchandising', 'Timeline'],
  },
  {
    id: 'production',
    title: 'PRODUCTION (Film & Shoot)',
    subtitle: 'Tournage, repérages, casting, caméras & planning',
    icon: '🎬',
    badge: 'Cinéma & Vidéo',
    description: 'Gérez une production audiovisuelle ou un shooting photo : feuilles de service, loges, matériel caméra, décors et météo.',
    samplePrompt: 'Tournage d’un court-métrage de 3 jours : scènes extérieures le matin (Golden Hour), studio l’après-midi, équipe de 15 personnes.',
    defaultLocation: 'Studios de Tournage & Décors Naturels',
    defaultBudget: 18000,
    activeModules: ['Plateaux 3D', 'Feuilles de Service', 'Casting & Équipe', 'Matériel', 'Timeline'],
  },
  {
    id: 'business',
    title: 'PROJET PROFESSIONNEL (Startup & Launch)',
    subtitle: 'Roadmap produit, jalons, équipes, budget & livrables',
    icon: '🚀',
    badge: 'Startup & Produit',
    description: 'Visualisez spatialement le lancement d’un produit, une levée de fonds ou la roadmap stratégique d’une entreprise.',
    samplePrompt: 'Lancement d’une application mobile FinTech : bêta-test, relations presse, campagne marketing et Demo Day investisseurs.',
    defaultLocation: 'HQ Innov & Station F',
    defaultBudget: 50000,
    activeModules: ['Roadmap Spatiale', 'Équipes & Rôles', 'Jalons & Livrables', 'Finances', 'Timeline'],
  },
  {
    id: 'personal',
    title: 'PROJET PERSONNEL (Life & Goal)',
    subtitle: 'Rénovation maison, déménagement, défi sportif',
    icon: '🏡',
    badge: 'Projet de Vie',
    description: 'Orchestrez un grand projet de vie personnel : travaux de rénovation, déménagement complexe ou préparation d’un marathon.',
    samplePrompt: 'Rénovation complète d’une maison de campagne : maçonnerie, plomberie, électricité, décoration et emménagement.',
    defaultLocation: 'Maison de Campagne & Ateliers',
    defaultBudget: 40000,
    activeModules: ['Plan 3D', 'Artisans & Devis', 'Matériaux', 'Planning Travaux', 'Budget'],
  },
  {
    id: 'family',
    title: 'FAMILLE & TRIBU (Family World)',
    subtitle: 'Grande réunion de famille, cousinade, anniversaires',
    icon: '👨‍👩‍👧‍👦',
    badge: 'Communauté Proche',
    description: 'Rassemblez votre tribu pour un week-end d’anniversaire ou des vacances collectives : hébergements, repas et activités partagées.',
    samplePrompt: 'Cousinade des 50 ans : 45 personnes réunies dans un gîte en Dordogne, grand barbecue, tournois de jeux et soirée souvenirs.',
    defaultLocation: 'Grand Gîte & Parc Familial',
    defaultBudget: 8000,
    activeModules: ['Hébergements 3D', 'Plan de Table', 'Repas Partagés', 'Activités', 'Cagnotte'],
  },
  {
    id: 'ngo',
    title: 'ASSOCIATION & ONG (Community World)',
    subtitle: 'Actions terrain, bénévoles, levée de fonds & galas',
    icon: '🤝',
    badge: 'Impact Social',
    description: 'Coordonnez une association humanitaire, un gala caritatif ou une opération solidaire sur le terrain.',
    samplePrompt: 'Gala de charité annuel et collecte solidaire : dîner de bienfaisance, vente aux enchères d’art, 150 donateurs.',
    defaultLocation: 'Espace Solidarité & Salle de Réception',
    defaultBudget: 15000,
    activeModules: ['Missions 3D', 'Bénévoles', 'Dons & Financement', 'Partenaires', 'Timeline'],
  },
  {
    id: 'group_trip',
    title: 'VOYAGE DE GROUPE (Group Roadtrip)',
    subtitle: 'Roadtrip entre amis, vans, bivouac & dépenses',
    icon: '🚐',
    badge: 'Aventure',
    description: 'Partez à l’aventure entre amis : étapes de route, campings, spots secrets, partage des dépenses et playlist commune.',
    samplePrompt: 'Roadtrip en 3 vans sur la Wild Atlantic Way en Irlande : 8 amis, falaises de Moher, pubs traditionnels et surf.',
    defaultLocation: 'Irlande (Wild Atlantic Way)',
    defaultBudget: 5000,
    activeModules: ['Itinéraire GPS', 'Vans & Bivouac', 'Dépenses Communes', 'Playlist Route', 'Timeline'],
  },
  {
    id: 'custom',
    title: 'PROJET LIBRE (Custom World Engine)',
    subtitle: 'Créez votre propre monde spatial sur-mesure',
    icon: '🌐',
    badge: 'Moteur Universel',
    description: 'Définissez librement vos propres pôles géolocalisés, vos acteurs, vos tâches et vos flux d’orchestration personnalisés.',
    samplePrompt: 'Projet sur-mesure combinant architecture spatiale, données interconnectées et simulation temporelle.',
    defaultLocation: 'Monde Spatial Universel',
    defaultBudget: 20000,
    activeModules: ['Worldmap 3D', 'Entités Libres', 'Connexions', 'Recherche Web', 'Timeline Universelle'],
  },
];

// AI World Generator: Builds custom spatial world from natural language description or archetype
export function generateWorldFromDescription(params: {
  prompt: string;
  worldType: WorldType;
  title?: string;
  location?: string;
  budget?: number;
}): {
  title: string;
  places: Place[];
  agents: Agent[];
  tasks: TaskEntity[];
  docs: DocumentEntity[];
  phases: TimelinePhase[];
  tracks: TrackEntity[];
  budget: number;
} {
  const archetype = WORLD_ARCHETYPES.find((a) => a.id === params.worldType) || WORLD_ARCHETYPES[0];
  const title = params.title || `Monde : ${archetype.title.split('(')[0].trim()}`;
  const budget = params.budget || archetype.defaultBudget;
  const loc = params.location || archetype.defaultLocation;

  // Custom Hubs generated based on World Type
  let places: Place[] = [];
  let agents: Agent[] = [];
  let phases: TimelinePhase[] = [];

  if (params.worldType === 'travel') {
    places = [
      { id: 'pl_dest_1', name: 'Tokyo • Quartier Shibuya & Arrivée', code: 'TOKYO HQ', zone: 'mairie', pos: [-42, 0, 28], gpsCoordinates: '35.6580° N, 139.7016° E', capacity: 20, currentPax: 4, description: 'Hôtel boutique, street food et passage piéton emblématique.', icon: 'hotel', themeColor: '#e2b448', activeFromHour: 10, activeToHour: 24, connectedAgentIds: ['ag_traveler_1', 'ag_traveler_2'], connectedDocIds: ['doc_vols_japan'], connectedTaskIds: ['tk_checkin_tokyo'] },
      { id: 'pl_dest_2', name: 'Mont Fuji • Vue Panoramique & Lac', code: 'MONT FUJI', zone: 'parking', pos: [-42, 0, 10], gpsCoordinates: '35.3606° N, 138.7274° E', capacity: 40, currentPax: 0, description: 'Étape nature, sanctuaire shinto et téléphérique du mont.', icon: 'photo', themeColor: '#94a3b8', activeFromHour: 8, activeToHour: 18, connectedAgentIds: ['ag_traveler_1'], connectedDocIds: [], connectedTaskIds: [] },
      { id: 'pl_dest_3', name: 'Kyoto • Quartier Gion & Temples', code: 'KYOTO GION', zone: 'ceremonie', pos: [-12, 0, 6], gpsCoordinates: '35.0037° N, 135.7772° E', capacity: 30, currentPax: 0, description: 'Ryokan traditionnel avec onsen et allée des bambous.', icon: 'chapelle', themeColor: '#e2b448', activeFromHour: 12, activeToHour: 22, connectedAgentIds: ['ag_traveler_1', 'ag_traveler_2'], connectedDocIds: ['doc_ryokan_kyoto'], connectedTaskIds: ['tk_diner_kaiseki'] },
      { id: 'pl_dest_4', name: 'Marché Tsukiji • Dégustation Gastronomie', code: 'MARCHÉ FOOD', zone: 'cocktail', pos: [10, 0, 8], gpsCoordinates: '35.6654° N, 139.7707° E', capacity: 50, currentPax: 0, description: 'Comptoirs de sushis frais et thé matcha d’exception.', icon: 'cocktail', themeColor: '#e2b448', activeFromHour: 11, activeToHour: 16, connectedAgentIds: ['ag_traveler_1'], connectedDocIds: [], connectedTaskIds: [] },
      { id: 'pl_dest_5', name: 'Gare Shinkansen • Train Grande Vitesse', code: 'SHINKANSEN', zone: 'reception', pos: [32, 0, -12], gpsCoordinates: '35.6812° N, 139.7671° E', capacity: 60, currentPax: 0, description: 'Liaison express entre Tokyo et Kyoto.', icon: 'transport', themeColor: '#e2b448', activeFromHour: 7, activeToHour: 23, connectedAgentIds: ['ag_traveler_1'], connectedDocIds: ['doc_jr_pass'], connectedTaskIds: [] },
      { id: 'pl_dest_6', name: 'Plage d’Okinawa • Repos & Lagon', code: 'OKINAWA', zone: 'dancefloor', pos: [14, 0, -32], gpsCoordinates: '26.2124° N, 127.6809° E', capacity: 40, currentPax: 0, description: 'Villas de bord de mer et snorkeling coraux.', icon: 'brunch', themeColor: '#e2b448', activeFromHour: 9, activeToHour: 24, connectedAgentIds: ['ag_traveler_2'], connectedDocIds: [], connectedTaskIds: [] },
    ];

    agents = [
      { id: 'ag_traveler_1', name: 'Alexandre (Capitaine)', role: 'groom', title: 'Voyageur Principal', avatarIcon: '✈️', avatarColor: '#1e293b', currentPos: [-42, 0, 28], targetPos: [-42, 0, 28], speed: 3.5, rotation: 0, assignedPlaceId: 'pl_dest_1', arrivalHour: 10, departureHour: 24, mood: 98, thoughtText: 'Passeports prêts et JR Pass activé !', connectedDocIds: ['doc_vols_japan'], connectedTaskIds: ['tk_checkin_tokyo'], connectedAgentIds: ['ag_traveler_2'], connectedPlaceIds: ['pl_dest_1', 'pl_dest_3'] },
      { id: 'ag_traveler_2', name: 'Clara (Exploratrice)', role: 'bride', title: 'Co-Voyageuse', avatarIcon: '🌸', avatarColor: '#f8fafc', currentPos: [-41, 0, 28], targetPos: [-41, 0, 28], speed: 3.5, rotation: 0, assignedPlaceId: 'pl_dest_1', arrivalHour: 10, departureHour: 24, mood: 100, thoughtText: 'Hâte de voir les ruelles de Kyoto au crépuscule.', connectedDocIds: ['doc_ryokan_kyoto'], connectedTaskIds: ['tk_diner_kaiseki'], connectedAgentIds: ['ag_traveler_1'], connectedPlaceIds: ['pl_dest_1', 'pl_dest_3'] },
    ];

    phases = [
      { id: 'ph_j1', startHour: 10, endHour: 14, name: 'Jour 1 — Arrivée Tokyo & Check-in', subtitle: 'Transfert aéroport Narita et installation à Shibuya', icon: 'transport', primaryPlaceId: 'pl_dest_1', highlightAction: 'Récupération des billets & dégustation ramen', bgAtmosphere: 'afternoon', keyAgentIds: ['ag_traveler_1', 'ag_traveler_2'], keyDocIds: ['doc_vols_japan'], keyTaskIds: ['tk_checkin_tokyo'], ambientTrack: 'prep' },
      { id: 'ph_j2', startHour: 14, endHour: 19, name: 'Jour 2 — Shinkansen vers Kyoto', subtitle: 'Traversée à 300 km/h avec vue sur le Mont Fuji', icon: 'chapelle', primaryPlaceId: 'pl_dest_3', highlightAction: 'Arrivée au Ryokan & bain chaud onsen', bgAtmosphere: 'golden', keyAgentIds: ['ag_traveler_1', 'ag_traveler_2'], keyDocIds: ['doc_ryokan_kyoto'], keyTaskIds: ['tk_diner_kaiseki'], ambientTrack: 'ceremony' },
    ];
  } else if (params.worldType === 'concert') {
    places = [
      { id: 'pl_stage_main', name: 'Main Stage • Scène Festival 10kW', code: 'MAIN STAGE', zone: 'dancefloor', pos: [14, 0, -32], gpsCoordinates: '48.8685° N, 2.3750° E', capacity: 2000, currentPax: 0, description: 'Scène principale, lyres beam DMX et retour son scène.', icon: 'dancefloor', themeColor: '#e2b448', activeFromHour: 16, activeToHour: 27, connectedAgentIds: ['ag_artist_lead'], connectedDocIds: ['doc_tech_rider'], connectedTaskIds: ['tk_soundcheck'] },
      { id: 'pl_backstage', name: 'Loges Artistes & Espace VIP', code: 'LOGES VIP', zone: 'manoir', pos: [-12, 0, -22], gpsCoordinates: '48.8620° N, 2.3610° E', capacity: 40, currentPax: 8, description: 'Catering privé, loges de chauffe vocale et repos.', icon: 'manoir', themeColor: '#e2b448', activeFromHour: 12, activeToHour: 27, connectedAgentIds: ['ag_artist_lead'], connectedDocIds: [], connectedTaskIds: [] },
      { id: 'pl_merch_booth', name: 'Stand Merchandising & Billetterie', code: 'MERCH / BILLET', zone: 'parking', pos: [-42, 0, 10], gpsCoordinates: '48.8512° N, 2.3480° E', capacity: 150, currentPax: 0, description: 'Vente des t-shirts, vinyles et contrôle des accès QR code.', icon: 'transport', themeColor: '#94a3b8', activeFromHour: 14, activeToHour: 24, connectedAgentIds: [], connectedDocIds: [], connectedTaskIds: [] },
    ];

    agents = [
      { id: 'ag_artist_lead', name: 'Lucas (Lead Vocal / DJ)', role: 'dj', title: 'Artiste Principal', avatarIcon: '🎤', avatarColor: '#e2b448', currentPos: [14, 0, -32], targetPos: [14, 0, -32], speed: 4.0, rotation: 0, assignedPlaceId: 'pl_stage_main', arrivalHour: 14, departureHour: 27, mood: 98, thoughtText: 'Setlist prête, 128 BPM sur le final !', connectedDocIds: ['doc_tech_rider'], connectedTaskIds: ['tk_soundcheck'], connectedAgentIds: [], connectedPlaceIds: ['pl_stage_main', 'pl_backstage'] },
    ];

    phases = [
      { id: 'ph_tour_prep', startHour: 14, endHour: 18, name: '16:00 — Balances & Soundcheck', subtitle: 'Réglage des niveaux sonores et éclairages DMX', icon: 'dancefloor', primaryPlaceId: 'pl_stage_main', highlightAction: 'Test acoustique L-Acoustics 10kW', bgAtmosphere: 'afternoon', keyAgentIds: ['ag_artist_lead'], keyDocIds: ['doc_tech_rider'], keyTaskIds: ['tk_soundcheck'], ambientTrack: 'prep' },
      { id: 'ph_tour_live', startHour: 20, endHour: 25, name: '21:30 — Show Live & Pyrotechnie', subtitle: 'Concert principal et lasers au pic de la nuit', icon: 'dancefloor', primaryPlaceId: 'pl_stage_main', highlightAction: 'Setlist 14 morceaux & étincelles', bgAtmosphere: 'night', keyAgentIds: ['ag_artist_lead'], keyDocIds: [], keyTaskIds: [], ambientTrack: 'party' },
    ];
  } else {
    // Default Modular Generic Places
    places = [
      { id: 'pl_hub_1', name: `${title} • Quartier Général`, code: 'HQ CENTRAL', zone: 'manoir', pos: [-12, 0, -22], gpsCoordinates: '48.8566° N, 2.3522° E', capacity: 50, currentPax: 4, description: 'Centre d’orchestration et pilotage opérationnel.', icon: 'manoir', themeColor: '#e2b448', activeFromHour: 9, activeToHour: 24, connectedAgentIds: ['ag_owner'], connectedDocIds: ['doc_master_plan'], connectedTaskIds: ['tk_init'] },
      { id: 'pl_hub_2', name: 'Espace Réception & Événement', code: 'SALLE ÉVÉNEMENT', zone: 'reception', pos: [32, 0, -12], gpsCoordinates: '48.8670° N, 2.3720° E', capacity: 120, currentPax: 0, description: 'Grand espace contemporain avec scènes et tables.', icon: 'banquet', themeColor: '#e2b448', activeFromHour: 14, activeToHour: 24, connectedAgentIds: ['ag_owner'], connectedDocIds: [], connectedTaskIds: [] },
      { id: 'pl_hub_3', name: 'Scène de Présentation & Lancement', code: 'SCÈNE SHOW', zone: 'dancefloor', pos: [14, 0, -32], gpsCoordinates: '48.8685° N, 2.3750° E', capacity: 100, currentPax: 0, description: 'Plateforme scénographique et son.', icon: 'dancefloor', themeColor: '#e2b448', activeFromHour: 18, activeToHour: 26, connectedAgentIds: ['ag_owner'], connectedDocIds: [], connectedTaskIds: [] },
    ];

    agents = [
      { id: 'ag_owner', name: 'Directeur de Projet', role: 'wedding_planner', title: 'Pilote Opérationnel', avatarIcon: '📋', avatarColor: '#e2b448', currentPos: [-12, 0, -22], targetPos: [-12, 0, -22], speed: 4.0, rotation: 0, assignedPlaceId: 'pl_hub_1', arrivalHour: 8, departureHour: 24, mood: 95, thoughtText: 'Orchestration du projet en direct.', connectedDocIds: ['doc_master_plan'], connectedTaskIds: ['tk_init'], connectedAgentIds: [], connectedPlaceIds: ['pl_hub_1', 'pl_hub_2'] },
    ];

    phases = [
      { id: 'ph_master_1', startHour: 10, endHour: 15, name: '10:00 — Lancement & Déploiement', subtitle: 'Coordination générale et accueil des acteurs', icon: 'manoir', primaryPlaceId: 'pl_hub_1', highlightAction: 'Briefing d’ouverture', bgAtmosphere: 'morning', keyAgentIds: ['ag_owner'], keyDocIds: ['doc_master_plan'], keyTaskIds: ['tk_init'], ambientTrack: 'prep' },
      { id: 'ph_master_2', startHour: 18, endHour: 24, name: '19:30 — Clôture & Célébration', subtitle: 'Moment fort et partage collectif', icon: 'dancefloor', primaryPlaceId: 'pl_hub_3', highlightAction: 'Animation & cocktail', bgAtmosphere: 'night', keyAgentIds: ['ag_owner'], keyDocIds: [], keyTaskIds: [], ambientTrack: 'party' },
    ];
  }

  const tasks: TaskEntity[] = [
    { id: 'tk_init', title: `Valider la feuille de route : ${title}`, category: 'logistique', dueHour: 11, isDone: true, urgent: false, assignedAgentId: agents[0]?.id, assignedPlaceId: places[0]?.id, connectedDocIds: ['doc_master_plan'], connectedAgentIds: [agents[0]?.id] },
    { id: 'tk_budget', title: `Vérifier l’allocation du budget (${budget.toLocaleString('fr-FR')} €)`, category: 'paiement', dueHour: 14, isDone: false, urgent: true, cost: Math.round(budget * 0.3), assignedAgentId: agents[0]?.id, assignedPlaceId: places[0]?.id, connectedDocIds: ['doc_master_plan'], connectedAgentIds: [agents[0]?.id] },
    { id: 'tk_checkin_tokyo', title: 'Finaliser les réservations d’hébergement', category: 'logistique', dueHour: 16, isDone: false, urgent: false, assignedAgentId: agents[0]?.id, assignedPlaceId: places[0]?.id, connectedDocIds: ['doc_master_plan'], connectedAgentIds: [agents[0]?.id] },
  ];

  const docs: DocumentEntity[] = [
    { id: 'doc_master_plan', title: `Plan Directeur — ${title}`, category: 'planning', fileName: 'Master_Plan.pdf', amount: budget, depositAmount: Math.round(budget * 0.3), isPaid: false, rawTextExcerpt: `PROJET : ${title}\nLocalisation : ${loc}\nBudget prévisionnel : ${budget} €\nFeuille de route générée par le World Engine.`, extractedDate: '2025', extractedHour: '10:00 - 24:00', connectedAgentIds: [agents[0]?.id], connectedPlaceIds: [places[0]?.id], connectedTaskIds: ['tk_init', 'tk_budget'], createdAtHour: 10 },
  ];

  const tracks: TrackEntity[] = [
    { id: 'trk_ambient_1', title: 'Horizon Glow', artist: 'World Audio Engine', moment: 'cocktail', status: 'verified', bpm: 95, energy: 3, duration: '3:40', suggestedBy: 'IA World Engine', note: 'Ambiance sonore spatiale', votes: 12 },
    { id: 'trk_ambient_2', title: 'Night Drive', artist: 'Spatial Wave', moment: 'soiree', status: 'verified', bpm: 124, energy: 5, duration: '4:10', suggestedBy: 'IA World Engine', note: 'Rythme pour la session festive', votes: 18 },
  ];

  return {
    title,
    places,
    agents,
    tasks,
    docs,
    phases,
    tracks,
    budget,
  };
}
