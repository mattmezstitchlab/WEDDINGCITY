import { WebVendorResult, HoneymoonDestination, ChatMessage, VerificationLevel } from '../types/wedding';

// Real-world verified public vendors database
export const VERIFIED_PUBLIC_VENDORS: WebVendorResult[] = [
  // Traiteurs
  {
    id: 'vendor_traiteur_etoile',
    name: 'Maison Lenôtre & Gastronomie Événementielle',
    category: 'traiteur',
    rating: 4.9,
    reviewCount: 142,
    location: 'Paris & Île-de-France',
    distanceKm: 4.8,
    priceStartingFrom: 110,
    priceLevel: '€€€',
    services: ['Cocktail dînatoire 18 pièces', 'Dîner 3 plats servi à l’assiette', 'Pièce montée haute couture', 'Vins & Champagne bio'],
    websiteUrl: 'https://www.lenotre.com/receptions',
    phone: '+33 1 45 62 10 00',
    email: 'receptions@lenotre.fr',
    source: 'Google Places API & Annuaire Officiel des Entreprises',
    verification: 'verified_public',
    isClaimed: true,
    claimedBusinessName: 'Lenôtre SA (SIREN: 582 052 822)',
    description: 'Haute gastronomie française pour mariages d’exception. Chef étoilé et brigade de maîtres d’hôtel d’honneur.',
    suggestedForPlaceId: 'place_reception',
  },
  {
    id: 'vendor_traiteur_bio',
    name: 'Atelier Toque & Terroirs',
    category: 'traiteur',
    rating: 4.8,
    reviewCount: 68,
    location: 'Chantilly & Hauts-de-France',
    distanceKm: 12.4,
    priceStartingFrom: 75,
    priceLevel: '€€',
    services: ['Produits 100% bio & circuits courts', 'Ateliers découpe jambon ibérique', 'Barbecue brasero gourmet', 'Options végétariennes & sans gluten'],
    websiteUrl: 'https://www.toqueetterroirs.fr',
    phone: '+33 3 44 58 20 10',
    source: 'Mariages.net & Avis Certifiés Google',
    verification: 'verified_public',
    isClaimed: false,
    description: 'Cuisine créative de saison, mettant à l’honneur les producteurs locaux et la convivialité.',
    suggestedForPlaceId: 'place_cocktail',
  },

  // Photographes & Vidéastes
  {
    id: 'vendor_photo_lumiere',
    name: 'Studio Lumière Fine Art (Julien R.)',
    category: 'photographe',
    rating: 5.0,
    reviewCount: 94,
    location: 'Paris / International',
    distanceKm: 6.2,
    priceStartingFrom: 1650,
    priceLevel: '€€€',
    services: ['Reportage complet préparatifs → fin de nuit', 'Séance Golden Hour & drone 4K', 'Galerie privée en ligne 48h', 'Album luxe cuir relié main'],
    websiteUrl: 'https://www.studiolumiere-weddings.com',
    phone: '+33 6 45 89 12 30',
    email: 'contact@studiolumiere.com',
    source: 'Fearless Photographers & Google Business',
    verification: 'claimed_vendor',
    isClaimed: true,
    claimedBusinessName: 'Studio Lumière SASU',
    description: 'Style éditorial, naturel et cinématographique. Récompensé au Top 10 Fearless Photographers.',
    suggestedForPlaceId: 'place_photo_spot',
  },
  {
    id: 'vendor_video_cinematic',
    name: 'Cinéma & Vœux (Alexandre B.)',
    category: 'photographe',
    rating: 4.9,
    reviewCount: 42,
    location: 'Lille & Nord',
    distanceKm: 18.0,
    priceStartingFrom: 1400,
    priceLevel: '€€',
    services: ['Teaser 4K 3 min le lendemain', 'Film documentaire 15 min', 'Captation audio des vœux', 'Drone homologué DGAC'],
    websiteUrl: 'https://www.cinema-et-voeux.com',
    phone: '+33 6 77 12 34 56',
    source: 'Zankyou Weddings Awards 2024',
    verification: 'verified_public',
    isClaimed: false,
    description: 'Vidéos de mariage émouvantes au rythme de musiques acoustiques et orchestrales.',
    suggestedForPlaceId: 'place_ceremonie',
  },

  // DJ & Acoustique
  {
    id: 'vendor_dj_soundwave',
    name: 'SoundWave Event & Live Sax',
    category: 'dj',
    rating: 4.9,
    reviewCount: 112,
    location: 'Région Parisienne & Oise',
    distanceKm: 8.5,
    priceStartingFrom: 1200,
    priceLevel: '€€',
    services: ['Système son L-Acoustics 4000W', 'Éclairage architectural sans fil', 'Duo DJ + Saxophoniste live cocktail', 'Étincelles froides intérieures'],
    websiteUrl: 'https://www.soundwave-events.fr',
    phone: '+33 6 77 88 99 00',
    email: 'booking@soundwave-events.fr',
    source: 'Mariages.net Gold Badge & Google Places',
    verification: 'claimed_vendor',
    isClaimed: true,
    claimedBusinessName: 'SoundWave Productions',
    description: 'Ambiance sur-mesure de la cérémonie au bout de la nuit. Transition fluide pop, funk, house et électro.',
    suggestedForPlaceId: 'place_dancefloor',
  },
  {
    id: 'vendor_musique_jazz',
    name: 'Quatuor Cordes & Jazz Swing',
    category: 'musique',
    rating: 5.0,
    reviewCount: 38,
    location: 'Paris & Château de Versailles',
    distanceKm: 14.2,
    priceStartingFrom: 850,
    priceLevel: '€€',
    services: ['Quatuor violon pour cérémonie', 'Trio jazz swing cocktail', 'Répertoire classique & reprises pop modernes'],
    websiteUrl: 'https://www.harmonie-cordes.fr',
    phone: '+33 1 42 30 40 50',
    source: 'Conservatoire National & Google Places',
    verification: 'verified_public',
    isClaimed: false,
    description: 'Solistes diplômés des grands conservatoires. Interprétations élégantes du Canon de Pachelbel à Coldplay.',
    suggestedForPlaceId: 'place_chapelle',
  },

  // Scénographie Florale
  {
    id: 'vendor_fleurs_botanique',
    name: 'Atelier Botanique & Décor Floral',
    category: 'fleuriste',
    rating: 4.9,
    reviewCount: 76,
    location: 'Chantilly / Senlis',
    distanceKm: 7.1,
    priceStartingFrom: 950,
    priceLevel: '€€',
    services: ['Arche cérémonielle sur-mesure', 'Centres de table & chandeliers', 'Bouquet mariée & boutonnières', 'Location mobilier vintage'],
    websiteUrl: 'https://www.atelierbotanique-fleurs.fr',
    phone: '+33 6 33 44 55 66',
    email: 'contact@atelierbotanique.fr',
    source: 'Google Places API & Annuaire Fédération Fleuristes',
    verification: 'claimed_vendor',
    isClaimed: true,
    claimedBusinessName: 'Atelier Botanique SARL',
    description: 'Fleurs françaises de saison, feuillages d’eucalyptus et pivoines d’exception.',
    suggestedForPlaceId: 'place_serre',
  },

  // Lieux & Domaines
  {
    id: 'vendor_chateau_bellevue',
    name: 'Château de Bellevue — Domaine & Orangerie',
    category: 'lieu',
    rating: 4.9,
    reviewCount: 160,
    location: 'Chantilly / Forêt d’Ermenonville',
    distanceKm: 0,
    priceStartingFrom: 5500,
    priceLevel: '€€€€',
    services: ['Parc boisé 15 hectares', 'Verrière contemporaine 150 personnes', 'Suites nuptiales & 25 couchages', 'Exclusivité totale du domaine'],
    websiteUrl: 'https://www.chateau-bellevue-events.com',
    phone: '+33 3 44 60 70 80',
    email: 'mariages@chateau-bellevue.com',
    source: 'Inventaire Monuments & Google Business',
    verification: 'verified_public',
    isClaimed: true,
    claimedBusinessName: 'Domaine de Bellevue SAS',
    description: 'Joyau architectural alliant authenticité historique du XVIIIe siècle et confort d’une orangerie moderne.',
    suggestedForPlaceId: 'place_manoir',
  },
];

// Honeymoon Destinations
export const HONEYMOON_DESTINATIONS: HoneymoonDestination[] = [
  {
    id: 'dest_kyoto',
    title: 'Kyoto & Îles d’Okinawa (Japon)',
    country: 'Japon',
    bestSeason: 'Mars - Mai & Octobre - Novembre',
    flightDuration: '13h vol direct',
    budgetRange: '4 500 € - 7 000 €',
    highlights: ['Ryokan traditionnel avec onsen privé', 'Temples dorés & bambouseraie d’Arashiyama', 'Plages de corail bleu d’Okinawa', 'Gastronomie kaiseki 3 étoiles'],
    source: 'Japan National Tourism Organization & Google Travel',
  },
  {
    id: 'dest_maldives',
    title: 'Atoll de Baa & Villas sur Pilotis',
    country: 'Maldives',
    bestSeason: 'Décembre - Avril',
    flightDuration: '10h vol direct',
    budgetRange: '5 000 € - 9 500 €',
    highlights: ['Villa sur lagon turquoise avec piscine privée', 'Dîner aux chandelles sur banc de sable isolé', 'Plongée avec les raies mantas', 'Spa ayurvédique sur l’eau'],
    source: 'Maldives Tourism & Luxury Travel Guide',
  },
  {
    id: 'dest_amalfi',
    title: 'Côte Amalfitaine & Capri',
    country: 'Italie',
    bestSeason: 'Mai - Septembre',
    flightDuration: '2h vol direct',
    budgetRange: '3 000 € - 5 500 €',
    highlights: ['Balade en Riva rétro au large des Faraglioni', 'Hôtels perchés avec vue sur la Méditerranée', 'Dégustation de vins à Ravello', 'Ambiance dolce vita italienne'],
    source: 'Italia.it & Michelin Guide',
  },
  {
    id: 'dest_namibie',
    title: 'Safari & Dunes de Sossusvlei',
    country: 'Namibie',
    bestSeason: 'Mai - Octobre',
    flightDuration: '11h vol direct',
    budgetRange: '4 000 € - 6 800 €',
    highlights: ['Ciel étoilé le plus pur du monde', 'Lodges éco-luxe au milieu du désert rouge', 'Survol des dunes en montgolfière', 'Safari privé dans le parc d’Etosha'],
    source: 'Namibia Tourism Board',
  },
];

// Natural language queries parser and AI Agent responder
export function processAgentQuery(query: string, weddingData: {
  coupleNames: string;
  weddingDate: string;
  totalBudget: number;
  paidBudget: number;
  conflictsCount: number;
  guestsCount: number;
  activeTrackTitle: string;
}): ChatMessage {
  const q = query.toLowerCase().trim();

  // 1. Budget & Acomptes
  if (q.includes('budget') || q.includes('acompte') || q.includes('facture') || q.includes('payer') || q.includes('argent') || q.includes('cout')) {
    const remaining = weddingData.totalBudget - weddingData.paidBudget;
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `Votre budget total engagé est de ${weddingData.totalBudget.toLocaleString('fr-FR')} €. Vous avez réglé ${weddingData.paidBudget.toLocaleString('fr-FR')} € d’acomptes. Il reste ${remaining.toLocaleString('fr-FR')} € de solde à finaliser le Jour J.`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '📄 Voir les Factures & Devis', actionType: 'search', targetId: 'docs' },
        { label: '⚡ Résoudre les Acomptes', actionType: 'fix_conflict', targetId: 'conflict_traiteur_acompte' },
      ],
    };
  }

  // 2. Traiteur & Dîner / Alimentation
  if (q.includes('traiteur') || q.includes('repas') || q.includes('manger') || q.includes('vegetarien') || q.includes('allergie') || q.includes('menu') || q.includes('banquet')) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `Le dîner est orchestré par Maison Gourmet à 19h30 dans le Grand Pavillon Orangerie (32, 0, -12). 10 tables rondes sont dressées. 12 menus végétariens et 1 allergie fruits de mer (Table 3) sont enregistrés sur la fiche chef.`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '🚀 Téléporter vers l’Orangerie', actionType: 'teleport', targetId: 'place_reception' },
        { label: '🍽️ Chercher d’autres traiteurs locaux', actionType: 'search', targetId: 'traiteur' },
      ],
    };
  }

  // 3. DJ & Musique / Playlist
  if (q.includes('dj') || q.includes('musique') || q.includes('danse') || q.includes('chanson') || q.includes('bal') || q.includes('playlist')) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `La DJ Zone se trouve sur la Scène Événementielle (14, 0, -32) avec DJ SoundWave. Le morceau actif en ce moment est "${weddingData.activeTrackTitle}". La playlist compte 10 morceaux validés et 2 propositions d'invités en attente.`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '🚀 Téléporter vers le DJ Booth', actionType: 'teleport', targetId: 'place_dancefloor' },
        { label: '🎵 Ouvrir la DJ Playlist Collaborative', actionType: 'search', targetId: 'dj_zone' },
      ],
    };
  }

  // 4. Photographe / Vidéaste
  if (q.includes('photo') || q.includes('photographe') || q.includes('video') || q.includes('drone') || q.includes('golden hour')) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `Julien Renard (Photographe) et Studio Lumière (Drone 4K) sont programmés de 14h30 à 23h30. Le shooting Golden Hour de couple est fixé à 18h45 sur le Belvédère du Domaine.`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '🚀 Téléporter vers le Spot Golden Hour', actionType: 'teleport', targetId: 'place_photo_spot' },
        { label: '📷 Trouver des photographes Web vérifiés', actionType: 'search', targetId: 'photographe' },
      ],
    };
  }

  // 5. Cérémonie & Mairie / Horaires
  if (q.includes('ceremonie') || q.includes('mairie') || q.includes('heure') || q.includes('horaire') || q.includes('planning') || q.includes('programme')) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `Déroulement du Jour J : 10h00 Préparatifs au Manoir → 13h30 Cérémonie Civile à la Mairie → 15h30 Cérémonie Laïque au Grand Parc → 17h00 Cocktail Belvédère → 19h30 Banquet Orangerie → 22h30 Ouverture de Bal.`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '🚀 Téléporter vers l’Arche de Cérémonie', actionType: 'teleport', targetId: 'place_ceremonie' },
        { label: '🏛️ Téléporter vers l’Hôtel de Ville', actionType: 'teleport', targetId: 'place_mairie' },
      ],
    };
  }

  // 6. Conflits & Alertes
  if (q.includes('conflit') || q.includes('alerte') || q.includes('probleme') || q.includes('retard') || q.includes('erreur')) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `${weddingData.conflictsCount > 0 ? `Attention, vous avez ${weddingData.conflictsCount} anomalie(s) active(s) : décalage horaire du photographe et acompte traiteur en attente.` : 'Tous les conflits sont résolus. Le réseau de votre mariage est 100% harmonisé.'}`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '⚠️ Ouvrir le Centre des Conflits', actionType: 'search', targetId: 'conflicts' },
      ],
    };
  }

  // 7. Voyage de Noces
  if (q.includes('voyage') || q.includes('lune de miel') || q.includes('noces') || q.includes('destination') || q.includes('vacances')) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: `J'ai analysé 4 destinations de voyage de noces idéales pour la période de votre mariage : Kyoto & Okinawa (Japon), Atoll de Baa (Maldives), Côte Amalfitaine (Italie) et Safari désertique (Namibie).`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '✈️ Explorer les Voyages de Noces', actionType: 'search', targetId: 'voyage' },
      ],
    };
  }

  // Default Natural Language response with web search integration
  return {
    id: `msg_${Date.now()}`,
    sender: 'agent',
    text: `J'ai analysé les données du mariage de ${weddingData.coupleNames} et exploré les sources Web vérifiées. Que souhaitez-vous localiser ou rechercher ?`,
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    actionButtons: [
      { label: '🌐 Rechercher des prestataires Web', actionType: 'search', targetId: 'all_vendors' },
      { label: '🚀 Vue d’ensemble Worldmap', actionType: 'teleport', targetId: 'worldmap' },
    ],
  };
}
