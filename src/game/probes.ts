// ---------------------------------------------------------------------------
// Wedding City — Domain health probes.
// ---------------------------------------------------------------------------
// One probe per functional module. Each MUST measure something real and attach
// evidence. A probe that cannot measure returns UNKNOWN — never OK.
//
// Split out of healthRegistry.ts to keep the registry readable; registered
// there. Depends only on engines + types, so no cycle is introduced.
// ---------------------------------------------------------------------------

import { HealthCheck, HealthProbe, createUnverified } from '../types/health';
import { weddingStore } from './weddingStore';
import { DMC_PALETTE, DMC_SYMBOLS } from './dmcPalette';
import { loadPersistedState } from './persistence';
import { generateWorldFromDescription } from './worldEngine';
import { ALL_WORLD_TYPES } from '../types/wedding';
import { checkReferentialIntegrity, describeBrokenReferences } from './integrity';
import { getDiagnosticsBySource } from './diagnostics';

const now = () => new Date().toISOString();

function mk(
  id: string,
  name: string,
  category: HealthCheck['category'],
  dependencies: string[],
  patch: Partial<HealthCheck>,
): HealthCheck {
  return { ...createUnverified({ id, name, category, dependencies }), lastCheck: now(), ...patch };
}

// ---------------------------------------------------------------------------
// DOCUMENTS — registry consistency, amounts, and payload weight
// ---------------------------------------------------------------------------
export const documentsProbe: HealthProbe = {
  id: 'DOCUMENTS',
  name: 'Registre des documents & contrats',
  category: 'data',
  dependencies: ['PERSISTENCE', 'DATA_INTEGRITY'],
  run: () => {
    const docs = weddingStore.docs;
    const withAmount = docs.filter((d) => typeof d.amount === 'number' && d.amount > 0);
    const paid = docs.filter((d) => d.isPaid).length;
    const dataUrlDocs = docs.filter((d) => (d.rawTextExcerpt || '').startsWith('data:'));
    const totalChars = docs.reduce((n, d) => n + (d.rawTextExcerpt?.length ?? 0), 0);
    const duplicateIds = docs.map((d) => d.id).filter((id, i, arr) => arr.indexOf(id) !== i);

    const evidence = [
      { label: 'Documents enregistrés', value: String(docs.length) },
      { label: 'Avec montant exploitable', value: `${withAmount.length} / ${docs.length}` },
      { label: 'Marqués payés', value: String(paid) },
      { label: 'Contenu binaire non analysé (Data URL)', value: String(dataUrlDocs.length) },
      { label: 'Poids texte cumulé', value: `${Math.round(totalChars / 1024)} Ko` },
      { label: 'Identifiants dupliqués', value: String(duplicateIds.length) },
    ];

    if (duplicateIds.length > 0) {
      return mk('DOCUMENTS', documentsProbe.name, 'data', ['PERSISTENCE'], {
        status: 'ERROR',
        summary: `${duplicateIds.length} document(s) partagent le même identifiant.`,
        evidence,
        errors: [{
          code: 'duplicate_document_ids',
          message: `Ids dupliqués : ${[...new Set(duplicateIds)].join(', ')}.`,
          cause: 'Un import a réutilisé un identifiant existant au lieu d’en générer un nouveau.',
          impact: 'Les liens vers ces documents deviennent ambigus ; l’inspecteur peut afficher la mauvaise fiche.',
          solution: 'Réattribuer un identifiant unique aux doublons.',
        }],
      });
    }

    // Real limitation, measured rather than assumed.
    if (dataUrlDocs.length > 0) {
      return mk('DOCUMENTS', documentsProbe.name, 'data', ['PERSISTENCE'], {
        status: 'PARTIAL',
        summary: `${docs.length} documents, dont ${dataUrlDocs.length} stockés en binaire jamais analysé.`,
        evidence,
        warnings: [{
          code: 'documents_binary_unparsed',
          message: `${dataUrlDocs.length} fichier(s) conservés en Data URL sans extraction.`,
          cause: 'Aucun parseur PDF/XLSX : les binaires sont encodés en base64 dans localStorage.',
          impact: 'Leurs montants et dates n’alimentent ni le budget ni la timeline, et ils consomment le quota.',
          solution: 'Stockage objet + parseurs PDF/XLSX avec extraction traçable (roadmap P3.4).',
        }],
      });
    }

    return mk('DOCUMENTS', documentsProbe.name, 'data', ['PERSISTENCE'], {
      status: 'VERIFIED',
      summary: `${docs.length} documents cohérents, ${withAmount.length} exploitables pour le budget.`,
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// DMC_ID — identity validity AND real persistence round trip
// ---------------------------------------------------------------------------
export const dmcProbe: HealthProbe = {
  id: 'DMC_ID',
  name: 'Identité textile & symboles DMC',
  category: 'core',
  dependencies: ['PERSISTENCE'],
  run: () => {
    const dmc = weddingStore.userDmcIdentity;
    const colorKnown = DMC_PALETTE.some((c) => c.code === dmc?.dmcCode);
    const symbolKnown = DMC_SYMBOLS.some((s) => s.id === dmc?.symbolId);

    // Does it actually survive persistence? Read the snapshot back from storage.
    const snapshot = loadPersistedState(weddingStore.currentProject.id);
    const persisted = snapshot ? (snapshot as unknown as Record<string, unknown>).userDmcIdentity : undefined;

    const evidence = [
      { label: 'Couleur DMC', value: `${dmc?.dmcCode ?? '—'} (${colorKnown ? 'connue' : 'hors palette'})` },
      { label: 'Symbole', value: `${dmc?.symbolGlyph ?? '—'} ${dmc?.symbolId ?? ''} (${symbolKnown ? 'connu' : 'inconnu'})` },
      { label: 'Palette disponible', value: `${DMC_PALETTE.length} couleurs · ${DMC_SYMBOLS.length} glyphes` },
      { label: 'Présent dans le snapshot', value: persisted ? 'oui' : (snapshot ? 'non' : 'aucun snapshot') },
    ];

    if (snapshot && !persisted) {
      return mk('DMC_ID', dmcProbe.name, 'core', ['PERSISTENCE'], {
        status: 'ERROR',
        summary: 'L’identité DMC n’est pas présente dans le snapshot enregistré.',
        evidence,
        errors: [{
          code: 'dmc_not_persisted',
          message: 'userDmcIdentity absent du snapshot.',
          cause: 'Le champ n’est pas couvert par PERSISTED_FIELDS.',
          impact: 'La couleur et le symbole choisis sont perdus au rechargement.',
          solution: 'Ajouter userDmcIdentity à PERSISTED_FIELDS (persistenceSchema.ts).',
        }],
        repairable: true,
        repairAction: { id: 'resave_dmc', label: 'Réenregistrer l’identité', description: 'Force une sauvegarde complète incluant l’identité DMC.' },
      });
    }

    if (!colorKnown || !symbolKnown) {
      return mk('DMC_ID', dmcProbe.name, 'core', ['PERSISTENCE'], {
        status: 'PARTIAL',
        summary: 'Identité DMC valide mais partiellement hors référentiel.',
        evidence,
        warnings: [{
          code: 'dmc_out_of_palette',
          message: `${!colorKnown ? 'Couleur' : 'Symbole'} hors du référentiel embarqué.`,
          cause: 'Valeur issue d’un ancien snapshot ou d’une palette modifiée.',
          impact: 'Le rendu de l’avatar peut ne pas correspondre au choix affiché.',
          solution: 'Resélectionner une couleur et un symbole dans le sélecteur DMC.',
        }],
      });
    }

    return mk('DMC_ID', dmcProbe.name, 'core', ['PERSISTENCE'], {
      status: 'VERIFIED',
      summary: 'Identité DMC valide et présente dans le snapshot.',
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId !== 'resave_dmc') return false;
    weddingStore.saveCurrentState();
    const snap = loadPersistedState(weddingStore.currentProject.id);
    return !!(snap && (snap as unknown as Record<string, unknown>).userDmcIdentity);
  },
};

// ---------------------------------------------------------------------------
// PLAYLIST — real data, plus the measured per-user voting flaw
// ---------------------------------------------------------------------------
export const playlistProbe: HealthProbe = {
  id: 'PLAYLIST',
  name: 'DJ Zone & playlist collaborative',
  category: 'audio',
  dependencies: ['PERSISTENCE'],
  run: () => {
    const tracks = weddingStore.tracks;
    const moments = new Set(tracks.map((t) => t.moment));
    const validated = tracks.filter((t) => t.status === 'verified').length;
    const voted = tracks.filter((t) => t.hasVoted).length;
    const badBpm = tracks.filter((t) => !t.bpm || t.bpm < 40 || t.bpm > 220);

    const evidence = [
      { label: 'Morceaux', value: String(tracks.length) },
      { label: 'Moments couverts', value: `${moments.size} (${[...moments].join(', ')})` },
      { label: 'Validés', value: String(validated) },
      { label: 'Marqués « déjà voté »', value: String(voted) },
      { label: 'BPM hors plage', value: String(badBpm.length) },
      { label: 'Modèle de vote', value: 'booléen global par morceau (pas par personne)' },
      { label: 'Lecture audio réelle', value: 'aucune (synthèse procédurale uniquement)' },
    ];

    if (tracks.length === 0) {
      return mk('PLAYLIST', playlistProbe.name, 'audio', ['PERSISTENCE'], {
        status: 'ERROR', summary: 'Aucun morceau chargé.', evidence,
        errors: [{
          code: 'playlist_empty', message: 'La playlist est vide.',
          cause: 'Restauration incomplète ou suppression totale.',
          impact: 'La DJ Zone et la phase d’ouverture de bal n’ont aucun contenu.',
          solution: 'Recharger le projet pour restaurer la playlist par défaut.',
        }],
      });
    }

    return mk('PLAYLIST', playlistProbe.name, 'audio', ['PERSISTENCE'], {
      status: 'PARTIAL',
      summary: `${tracks.length} morceaux persistés ; vote non nominatif et aucune lecture réelle.`,
      evidence,
      warnings: [{
        code: 'playlist_vote_not_per_user',
        message: '`hasVoted` est un booléen porté par le morceau, pas par le votant.',
        cause: 'Le modèle de données ne relie pas un vote à une identité.',
        impact: 'Dès qu’une personne vote, le morceau apparaît « déjà voté » pour tout le monde.',
        solution: 'Remplacer hasVoted par une liste de votes (voterId, date) — nécessite les identités (roadmap P2.2/P2.7).',
      }],
    });
  },
};

// ---------------------------------------------------------------------------
// ADVERTISING — slots, campaigns and their persistence
// ---------------------------------------------------------------------------
export const advertisingProbe: HealthProbe = {
  id: 'ADVERTISING',
  name: 'Advertising Grid 3D & enseignes',
  category: 'integration',
  dependencies: ['PERSISTENCE'],
  run: () => {
    const slots = weddingStore.adSlots;
    const claimed = slots.filter((s) => s.isClaimed);
    const withCampaign = slots.filter((s) => !!s.currentCampaign);
    const sponsored = withCampaign.filter((s) => s.currentCampaign?.isSponsored).length;
    const orphanTargets = slots.filter(
      (s) => s.currentCampaign?.targetPlaceId &&
        !weddingStore.places.some((p) => p.id === s.currentCampaign?.targetPlaceId),
    );

    const snapshot = loadPersistedState(weddingStore.currentProject.id);
    const persisted = snapshot ? Array.isArray((snapshot as unknown as Record<string, unknown>).adSlots) : false;

    const evidence = [
      { label: 'Emplacements 3D', value: String(slots.length) },
      { label: 'Revendiqués', value: `${claimed.length} / ${slots.length}` },
      { label: 'Avec campagne active', value: String(withCampaign.length) },
      { label: 'Sponsorisées', value: String(sponsored) },
      { label: 'Cibles de campagne introuvables', value: String(orphanTargets.length) },
      { label: 'Présent dans le snapshot', value: persisted ? 'oui' : (snapshot ? 'non' : 'aucun snapshot') },
      { label: 'Inventaire / paiement / mesure', value: 'aucun' },
    ];

    if (snapshot && !persisted) {
      return mk('ADVERTISING', advertisingProbe.name, 'integration', ['PERSISTENCE'], {
        status: 'ERROR',
        summary: 'Les emplacements publicitaires ne sont pas enregistrés.',
        evidence,
        errors: [{
          code: 'adslots_not_persisted', message: 'adSlots absent du snapshot.',
          cause: 'Champ non couvert par PERSISTED_FIELDS.',
          impact: 'Toute campagne revendiquée disparaît au rechargement.',
          solution: 'Ajouter adSlots à PERSISTED_FIELDS.',
        }],
        repairable: true,
        repairAction: { id: 'resave_ads', label: 'Réenregistrer les campagnes', description: 'Force une sauvegarde complète incluant les emplacements.' },
      });
    }

    if (orphanTargets.length > 0) {
      return mk('ADVERTISING', advertisingProbe.name, 'integration', ['PERSISTENCE'], {
        status: 'ERROR',
        summary: `${orphanTargets.length} campagne(s) pointent vers un lieu inexistant.`,
        evidence,
        errors: [{
          code: 'ad_target_missing',
          message: `Cibles introuvables : ${orphanTargets.map((s) => s.currentCampaign?.targetPlaceId).join(', ')}.`,
          cause: 'Le lieu ciblé a été supprimé ou renommé après la création de la campagne.',
          impact: 'Le CTA de l’enseigne ne mène nulle part.',
          solution: 'Recibler la campagne sur un lieu existant.',
        }],
      });
    }

    return mk('ADVERTISING', advertisingProbe.name, 'integration', ['PERSISTENCE'], {
      status: 'PARTIAL',
      summary: `${slots.length} emplacements rendus et persistés ; aucun inventaire ni mesure d’audience.`,
      evidence,
      warnings: [{
        code: 'advertising_no_marketplace',
        message: 'Les campagnes sont locales : ni annonceur, ni paiement, ni impression mesurée.',
        cause: 'Il n’existe pas de back-office publicitaire.',
        impact: 'La grille est une maquette fonctionnelle, pas une régie exploitable.',
        solution: 'Inventaire, facturation et analytics côté serveur (roadmap P4).',
      }],
    });
  },
  repair: (actionId) => {
    if (actionId !== 'resave_ads') return false;
    weddingStore.saveCurrentState();
    const snap = loadPersistedState(weddingStore.currentProject.id);
    return !!(snap && Array.isArray((snap as unknown as Record<string, unknown>).adSlots));
  },
};

// ---------------------------------------------------------------------------
// MISSIONS — tasks engine, measured against the clock
// ---------------------------------------------------------------------------
export const missionsProbe: HealthProbe = {
  id: 'MISSIONS',
  name: 'Gestion des tâches & checklists',
  category: 'core',
  dependencies: ['DATA_INTEGRITY', 'TIMELINE'],
  run: () => {
    const tasks = weddingStore.tasks;
    const done = tasks.filter((t) => t.isDone).length;
    const urgent = tasks.filter((t) => t.urgent && !t.isDone).length;
    const unassigned = tasks.filter((t) => !t.assignedAgentId);
    const overdue = tasks.filter((t) => !t.isDone && t.dueHour < weddingStore.time);

    const evidence = [
      { label: 'Tâches', value: String(tasks.length) },
      { label: 'Terminées', value: `${done} / ${tasks.length}` },
      { label: 'Urgentes ouvertes', value: String(urgent) },
      { label: 'Non assignées', value: String(unassigned.length) },
      { label: `En retard (heure simulée ${weddingStore.time.toFixed(1)}h)`, value: String(overdue.length) },
      { label: 'Dépendances entre tâches', value: 'non modélisées' },
    ];

    if (tasks.length === 0) {
      return mk('MISSIONS', missionsProbe.name, 'core', ['TIMELINE'], {
        status: 'ERROR', summary: 'Aucune tâche chargée.', evidence,
        errors: [{
          code: 'tasks_empty', message: 'La liste des tâches est vide.',
          cause: 'Restauration incomplète.',
          impact: 'Aucun suivi opérationnel possible.',
          solution: 'Recharger le projet.',
        }],
      });
    }

    return mk('MISSIONS', missionsProbe.name, 'core', ['TIMELINE'], {
      status: 'PARTIAL',
      summary: `${tasks.length} tâches suivies ; ni dépendances, ni notifications, ni journal d’audit.`,
      evidence,
      warnings: [{
        code: 'tasks_no_dependencies',
        message: 'Les tâches n’ont ni prérequis ni chaîne de dépendances.',
        cause: 'Le modèle TaskEntity ne porte pas de relation d’ordre.',
        impact: 'Un retard ne peut pas être propagé automatiquement aux tâches suivantes.',
        solution: 'Ajouter dependsOn[] puis un calcul de chemin critique (roadmap P4.3).',
      }],
    });
  },
};

// ---------------------------------------------------------------------------
// PEOPLE — agents and guests
// ---------------------------------------------------------------------------
export const peopleProbe: HealthProbe = {
  id: 'PEOPLE',
  name: 'Agents simulés & invités',
  category: 'core',
  dependencies: ['DATA_INTEGRITY'],
  run: () => {
    const agents = weddingStore.agents;
    const roles = new Set(agents.map((a) => a.role));
    const placed = agents.filter((a) => a.assignedPlaceId).length;
    const duplicates = agents.map((a) => a.id).filter((id, i, arr) => arr.indexOf(id) !== i);

    const evidence = [
      { label: 'Agents', value: String(agents.length) },
      { label: 'Rôles distincts', value: String(roles.size) },
      { label: 'Assignés à un lieu', value: `${placed} / ${agents.length}` },
      { label: 'Identifiants dupliqués', value: String(duplicates.length) },
      { label: 'Entité Guest dédiée', value: 'inexistante (les invités sont des agents)' },
      { label: 'Liaison identité utilisateur', value: 'par rôle, pas par identifiant' },
    ];

    if (duplicates.length > 0) {
      return mk('PEOPLE', peopleProbe.name, 'core', ['DATA_INTEGRITY'], {
        status: 'ERROR', summary: `${duplicates.length} agent(s) partagent un identifiant.`, evidence,
        errors: [{
          code: 'duplicate_agent_ids', message: `Ids dupliqués : ${[...new Set(duplicates)].join(', ')}.`,
          cause: 'Génération d’agents sans garantie d’unicité.',
          impact: 'Sélection et liens neuronaux ambigus.',
          solution: 'Réattribuer des identifiants uniques.',
        }],
      });
    }

    return mk('PEOPLE', peopleProbe.name, 'core', ['DATA_INTEGRITY'], {
      status: 'PARTIAL',
      summary: `${agents.length} agents cohérents ; pas de CRUD ni d’entité invité distincte.`,
      evidence,
      warnings: [{
        code: 'people_no_guest_entity',
        message: 'Les invités ne sont pas une entité de premier ordre.',
        cause: 'Aucun type Guest : RSVP, régimes et table sont portés par des agents de démonstration.',
        impact: 'Import de liste, RSVP et plan de table réel sont impossibles.',
        solution: 'Créer l’entité Guest avec identifiants stables (roadmap P2.2).',
      }],
    });
  },
};

// ---------------------------------------------------------------------------
// AVATAR — measured binding between the user identity and a rendered agent
// ---------------------------------------------------------------------------
export const avatarProbe: HealthProbe = {
  id: 'AVATAR',
  name: 'Avatar & personnalisation',
  category: 'world_3d',
  dependencies: ['PEOPLE', 'DMC_ID'],
  run: () => {
    const identity = weddingStore.userIdentity;
    const sameRole = weddingStore.agents.filter((a) => a.role === identity.role);
    const evidence = [
      { label: 'Rôle de l’identité', value: identity.role },
      { label: 'Agents partageant ce rôle', value: String(sameRole.length) },
      { label: 'Agent porteur de l’identité', value: sameRole[0]?.id ?? 'aucun' },
      { label: 'Liaison', value: 'par rôle (premier agent trouvé)' },
      { label: 'Position avatar intérieur', value: weddingStore.avatarPos.map((n) => n.toFixed(1)).join(', ') },
      { label: 'Contrôles clavier', value: 'WASD + flèches, montés' },
    ];

    if (sameRole.length === 0) {
      return mk('AVATAR', avatarProbe.name, 'world_3d', ['PEOPLE'], {
        status: 'ERROR',
        summary: `Aucun agent ne porte le rôle « ${identity.role} » : l’avatar n’est rattaché à rien.`,
        evidence,
        errors: [{
          code: 'avatar_unbound',
          message: 'Identité utilisateur sans agent correspondant.',
          cause: 'L’avatar est relié par rôle ; ce rôle n’existe pas dans la distribution actuelle.',
          impact: 'La personnalisation n’est visible sur aucun personnage du monde.',
          solution: 'Rattacher l’identité à un identifiant d’agent stable plutôt qu’à un rôle.',
        }],
      });
    }

    return mk('AVATAR', avatarProbe.name, 'world_3d', ['PEOPLE'], {
      status: 'PARTIAL',
      summary: sameRole.length > 1
        ? `Avatar rattaché par rôle ; ${sameRole.length} agents partagent ce rôle (ambigu).`
        : 'Avatar rattaché par rôle à un agent unique.',
      evidence,
      warnings: [{
        code: 'avatar_bound_by_role',
        message: 'L’identité est appliquée au premier agent du même rôle, pas à une personne précise.',
        cause: 'Aucun identifiant stable ne relie un compte à un agent.',
        impact: 'Deux personnes du même rôle sont confondues visuellement.',
        solution: 'Introduire un lien accountId → agentId (roadmap P2.2/P2.7).',
      }],
    });
  },
};

// ---------------------------------------------------------------------------
// WORLD ENGINE — actually generates the archetypes and validates them
// ---------------------------------------------------------------------------
export const worldEngineProbe: HealthProbe = {
  id: 'WORLD_ENGINE',
  name: 'World Engine & génération multi-projets',
  category: 'ai_engine',
  dependencies: ['DATA_INTEGRITY'],
  run: () => {
    // Probe every declared WorldType, so a new archetype cannot ship unvalidated.
    const archetypes = ALL_WORLD_TYPES;
    const results: { type: string; ok: boolean; refs: number; broken: string }[] = [];

    for (const type of archetypes) {
      try {
        const world = generateWorldFromDescription({
          prompt: `Sonde de santé — ${type}`,
          worldType: type,
          title: `Probe ${type}`,
          location: 'Paris',
          budget: 25000,
        });
        const rep = checkReferentialIntegrity(world);
        results.push({ type, ok: rep.ok, refs: rep.checkedReferences, broken: describeBrokenReferences(rep.broken) });
      } catch (err) {
        results.push({ type, ok: false, refs: 0, broken: err instanceof Error ? err.message : String(err) });
      }
    }

    const failed = results.filter((r) => !r.ok);
    const evidence = results.map((r) => ({
      label: `Archétype « ${r.type} »`,
      value: r.ok ? `${r.refs} références, toutes résolues` : `CASSÉ — ${r.broken}`,
    }));
    evidence.push({ label: 'Analyse du prompt', value: 'aucune (sélection par archétype)' });

    if (failed.length > 0) {
      return mk('WORLD_ENGINE', worldEngineProbe.name, 'ai_engine', ['DATA_INTEGRITY'], {
        status: 'ERROR',
        summary: `${failed.length} archétype(s) génèrent un graphe incohérent.`,
        evidence,
        errors: failed.map((f) => ({
          code: 'world_generation_broken',
          message: `Archétype « ${f.type} » : ${f.broken}`,
          cause: 'Le générateur référence des entités qu’il ne crée pas.',
          impact: 'Liens neuronaux orphelins et inspecteurs vides dans les mondes générés.',
          solution: 'Générer les entités manquantes dans worldEngine.ts.',
        })),
      });
    }

    return mk('WORLD_ENGINE', worldEngineProbe.name, 'ai_engine', ['DATA_INTEGRITY'], {
      status: 'PARTIAL',
      summary: `${archetypes.length} archétypes génèrent un graphe cohérent ; aucune IA n’interprète la description.`,
      evidence,
      warnings: [{
        code: 'world_engine_no_nlp',
        message: 'La description saisie n’est pas analysée : seul l’archétype choisi détermine le monde.',
        cause: 'Aucun modèle de langage ni extraction d’intention.',
        impact: 'Deux descriptions très différentes produisent le même monde.',
        solution: 'Brancher un LLM sur la génération (hors périmètre actuel).',
      }],
    });
  },
};

// ---------------------------------------------------------------------------
// AUDIO — Web Audio availability, actually attempted
// ---------------------------------------------------------------------------
export const audioProbe: HealthProbe = {
  id: 'AUDIO',
  name: 'Synthèse audio & carillons',
  category: 'audio',
  run: () => {
    const failures = getDiagnosticsBySource('audio');
    const Ctor = typeof window !== 'undefined'
      ? (window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown })
      : undefined;
    const available = !!(Ctor && (Ctor.AudioContext || Ctor.webkitAudioContext));

    if (!available) {
      return mk('AUDIO', audioProbe.name, 'audio', [], {
        status: 'UNKNOWN',
        summary: 'Web Audio non disponible dans ce contexte — état réel non mesurable.',
        evidence: [
          { label: 'AudioContext', value: 'indisponible' },
          { label: 'Échecs audio enregistrés', value: String(failures.length) },
        ],
      });
    }

    return mk('AUDIO', audioProbe.name, 'audio', [], {
      status: failures.length > 0 ? 'PARTIAL' : 'VERIFIED',
      summary: failures.length > 0
        ? `AudioContext disponible mais ${failures.length} échec(s) de lecture enregistré(s).`
        : 'AudioContext disponible, synthèse procédurale opérationnelle.',
      evidence: [
        { label: 'AudioContext', value: 'disponible' },
        { label: 'Échecs enregistrés', value: String(failures.length) },
        { label: 'Fichiers audio', value: 'aucun (synthèse uniquement)' },
      ],
      warnings: failures.length > 0 ? [{
        code: 'audio_playback_failures',
        message: `${failures.length} lecture(s) audio ont échoué.`,
        cause: 'Contexte audio suspendu tant que l’utilisateur n’a pas interagi avec la page.',
        impact: 'Retours sonores absents jusqu’au premier clic.',
        solution: 'Reprendre le contexte audio sur le premier geste utilisateur.',
      }] : [],
    });
  },
};

// ---------------------------------------------------------------------------
// GEOGRAPHY — GPS strings are parsed for real; no mapping service exists
// ---------------------------------------------------------------------------
export const geographyProbe: HealthProbe = {
  id: 'GEOGRAPHY',
  name: 'Cartographie & itinéraires GPS',
  category: 'integration',
  dependencies: ['DATA_INTEGRITY'],
  run: () => {
    const places = weddingStore.places;
    const withGps = places.filter((p) => !!p.gpsCoordinates);
    // Actually try to parse the stored coordinate strings.
    const parseable = withGps.filter((p) => /\d+(\.\d+)?\s*°?\s*[NS].*\d+(\.\d+)?\s*°?\s*[EW]/i.test(p.gpsCoordinates || ''));

    return mk('GEOGRAPHY', geographyProbe.name, 'integration', ['DATA_INTEGRITY'], {
      status: 'MOCK',
      summary: 'Coordonnées présentes et lisibles, mais aucun service cartographique n’est appelé.',
      evidence: [
        { label: 'Lieux', value: String(places.length) },
        { label: 'Avec coordonnées', value: `${withGps.length} / ${places.length}` },
        { label: 'Coordonnées analysables', value: `${parseable.length} / ${withGps.length}` },
        { label: 'Géocodage / itinéraires', value: 'aucun' },
        { label: 'navigator.geolocation', value: 'jamais utilisé' },
        { label: 'Positions 3D', value: 'coordonnées de jeu arbitraires, sans projection' },
      ],
      warnings: [{
        code: 'geography_no_mapping',
        message: 'L’interface évoque « Google Maps GPS » sans aucune API cartographique.',
        cause: 'Les coordonnées sont des chaînes décoratives ; aucune projection ne les relie aux positions 3D.',
        impact: 'Ni distance, ni itinéraire, ni temps de trajet réels ne peuvent être calculés.',
        solution: 'Intégrer un service de cartes et projeter les coordonnées (roadmap P3).',
      }],
    });
  },
};

// ---------------------------------------------------------------------------
// NARRATION — probed, and genuinely absent
// ---------------------------------------------------------------------------
export const narrationProbe: HealthProbe = {
  id: 'NARRATION',
  name: 'Narration vocale',
  category: 'audio',
  run: () => {
    const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
    return mk('NARRATION', narrationProbe.name, 'audio', [], {
      status: 'NOT_IMPLEMENTED',
      summary: 'Aucune narration : l’API de synthèse vocale n’est jamais utilisée.',
      evidence: [
        { label: 'API navigateur disponible', value: hasSpeech ? 'oui (speechSynthesis)' : 'non détectée' },
        { label: 'Appels dans le code', value: 'aucun' },
        { label: 'Scripts narratifs', value: 'aucun' },
      ],
      warnings: [{
        code: 'narration_absent',
        message: 'Le module « Narration » ne correspond à aucune implémentation.',
        cause: 'Seuls des bruitages synthétisés existent ; aucune voix.',
        impact: 'Toute mention de narration dans l’interface est trompeuse.',
        solution: hasSpeech
          ? 'Le navigateur supporte speechSynthesis : une narration réelle est possible.'
          : 'Nécessite un moteur TTS.',
      }],
    });
  },
};

export const extraProbes: HealthProbe[] = [
  documentsProbe,
  dmcProbe,
  playlistProbe,
  advertisingProbe,
  missionsProbe,
  peopleProbe,
  avatarProbe,
  worldEngineProbe,
  audioProbe,
  geographyProbe,
  narrationProbe,
];
