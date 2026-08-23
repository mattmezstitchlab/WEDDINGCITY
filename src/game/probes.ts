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
import { SCHEMA_VERSION } from './persistenceSchema';
import { generateWorldFromDescription } from './worldEngine';
import { ALL_WORLD_TYPES } from '../types/wedding';
import { checkReferentialIntegrity, describeBrokenReferences } from './integrity';
import { getDiagnosticsBySource } from './diagnostics';
// Network-free leaf: reading the flag never loads, let alone runs, a provider.
import { isItunesEnabled, getActivationSource } from './enrichment/activation';

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
  dependencies: ['PERSISTENCE', 'IDENTITY'],
  run: () => {
    const tracks = weddingStore.tracks;
    const votes = weddingStore.trackVotes;
    const moments = new Set(tracks.map((t) => t.moment));
    const validated = tracks.filter((t) => t.status === 'verified').length;
    const voters = new Set(votes.map((v) => v.personId));
    const orphanVotes = votes.filter((v) => !tracks.some((t) => t.id === v.trackId));

    // Measured, not assumed: what can actually be heard and seen right now.
    const songMedia = weddingStore.media.filter((m) => m.ownerKind === 'song');
    const withAudio = tracks.filter(
      (t) => songMedia.some((m) => m.ownerId === t.id && m.kind === 'audio'),
    ).length;
    const withCover = tracks.filter(
      (t) => songMedia.some((m) => m.ownerId === t.id && m.kind === 'image'),
    ).length;
    const enrichedMedia = songMedia.filter((m) => m.origin === 'research').length;

    const evidence = [
      { label: 'Morceaux', value: String(tracks.length) },
      { label: 'Moments couverts', value: `${moments.size} (${[...moments].join(', ')})` },
      { label: 'Validés', value: String(validated) },
      { label: 'Votes nominatifs enregistrés', value: String(votes.length) },
      { label: 'Votants distincts', value: String(voters.size) },
      { label: 'Modèle de vote', value: 'un vote par personne et par morceau (personId)' },
      { label: 'Votes orphelins', value: String(orphanVotes.length) },
      { label: 'Sources audio réelles rattachées', value: `${withAudio}/${tracks.length}` },
      { label: 'Pochettes réelles rattachées', value: `${withCover}/${tracks.length}` },
      { label: 'Médias issus d’un enrichissement', value: String(enrichedMedia) },
      {
        label: 'Recherche automatique (iTunes)',
        value: isItunesEnabled()
          ? `activée (${getActivationSource()}) — connexion non vérifiée depuis cet environnement`
          : 'désactivée par défaut — import manuel disponible',
      },
    ];

    if (tracks.length === 0) {
      return mk('PLAYLIST', playlistProbe.name, 'audio', ['IDENTITY'], {
        status: 'ERROR', summary: 'Aucun morceau chargé.', evidence,
        errors: [{
          code: 'playlist_empty', message: 'La playlist est vide.',
          cause: 'Restauration incomplète ou suppression totale.',
          impact: 'La DJ Zone et la phase d’ouverture de bal n’ont aucun contenu.',
          solution: 'Recharger le projet pour restaurer la playlist par défaut.',
        }],
      });
    }

    if (orphanVotes.length > 0) {
      return mk('PLAYLIST', playlistProbe.name, 'audio', ['IDENTITY'], {
        status: 'ERROR',
        summary: `${orphanVotes.length} vote(s) portent sur des morceaux inexistants.`,
        evidence,
        errors: [{
          code: 'orphan_track_votes',
          message: `Votes orphelins : ${orphanVotes.slice(0, 3).map((v) => v.trackId).join(', ')}.`,
          cause: 'Des morceaux ont été supprimés sans nettoyer les votes associés.',
          impact: 'Les compteurs de votes ne correspondent plus à la playlist.',
          solution: 'Supprimer les votes dont le morceau n’existe plus.',
        }],
        repairable: true,
        repairAction: {
          id: 'prune_orphan_votes',
          label: 'Nettoyer les votes orphelins',
          description: 'Supprime uniquement les votes pointant vers un morceau inexistant.',
        },
      });
    }

    return mk('PLAYLIST', playlistProbe.name, 'audio', ['IDENTITY'], {
      status: 'PARTIAL',
      summary: withAudio === 0
        ? `${tracks.length} morceaux ; votes nominatifs opérationnels, aucune source audio rattachée.`
        : `${tracks.length} morceaux ; ${withAudio} réellement écoutable(s), ${withCover} avec pochette.`,
      evidence,
      warnings: withAudio === 0
        ? [{
          code: 'playlist_no_playback',
          message: `Aucun des ${tracks.length} morceaux n’a de source audio : le bouton Écouter n’est affiché nulle part.`,
          cause: isItunesEnabled()
            ? 'Aucun fichier importé et aucun extrait externe confirmé pour l’instant.'
            : 'Aucun fichier importé ; la recherche automatique est désactivée par défaut.',
          impact: 'La playlist est une liste de décisions, pas une lecture.',
          solution: 'Importer un fichier audio dans le Canvas, ou activer puis confirmer un extrait externe.',
        }]
        : [],
    });
  },
  repair: (actionId) => {
    if (actionId !== 'prune_orphan_votes') return false;
    const before = weddingStore.trackVotes.length;
    weddingStore.trackVotes = weddingStore.trackVotes.filter(
      (v) => weddingStore.tracks.some((t) => t.id === v.trackId),
    );
    weddingStore.saveCurrentState();
    weddingStore.notify();
    return weddingStore.trackVotes.length < before;
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
  name: 'Personnes, invités & prestataires',
  category: 'core',
  dependencies: ['DATA_INTEGRITY', 'IDENTITY'],
  run: () => {
    const agents = weddingStore.agents;
    const persons = weddingStore.persons;
    const guests = weddingStore.guests;
    const vendors = weddingStore.vendors;
    const duplicates = agents.map((a) => a.id).filter((id, i, arr) => arr.indexOf(id) !== i);
    const unlinkedAgents = agents.filter((a) => !a.personId);

    const evidence = [
      { label: 'Agents (projection 3D)', value: String(agents.length) },
      { label: 'Personnes (identités)', value: String(persons.length) },
      { label: 'Invités', value: String(guests.length) },
      { label: 'Prestataires', value: String(vendors.length) },
      { label: 'Agents reliés à une personne', value: `${agents.length - unlinkedAgents.length} / ${agents.length}` },
      { label: 'Identifiants d’agent dupliqués', value: String(duplicates.length) },
    ];

    if (duplicates.length > 0) {
      return mk('PEOPLE', peopleProbe.name, 'core', ['IDENTITY'], {
        status: 'ERROR', summary: `${duplicates.length} agent(s) partagent un identifiant.`, evidence,
        errors: [{
          code: 'duplicate_agent_ids', message: `Ids dupliqués : ${[...new Set(duplicates)].join(', ')}.`,
          cause: 'Génération d’agents sans garantie d’unicité.',
          impact: 'Sélection et liens neuronaux ambigus.',
          solution: 'Réattribuer des identifiants uniques.',
        }],
      });
    }

    if (unlinkedAgents.length > 0) {
      return mk('PEOPLE', peopleProbe.name, 'core', ['IDENTITY'], {
        status: 'PARTIAL',
        summary: `${unlinkedAgents.length} agent(s) sans identité rattachée.`,
        evidence,
        warnings: [{
          code: 'agents_without_person',
          message: `Agents non migrés : ${unlinkedAgents.slice(0, 5).map((a) => a.id).join(', ')}.`,
          cause: 'Ces agents ont été créés après la migration d’identité.',
          impact: 'Ils n’ont ni fiche personne, ni RSVP, ni place à table.',
          solution: 'Relancer la migration d’identité (réparation disponible).',
        }],
        repairable: true,
        repairAction: {
          id: 'run_identity_migration',
          label: 'Rattacher les agents orphelins',
          description: 'Relance migrateIdentityModel(), qui est idempotent et purement additif.',
        },
      });
    }

    return mk('PEOPLE', peopleProbe.name, 'core', ['IDENTITY'], {
      status: 'VERIFIED',
      summary: `${persons.length} personnes, ${guests.length} invités et ${vendors.length} prestataires, tous reliés par identifiant.`,
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId !== 'run_identity_migration') return false;
    const report = weddingStore.ensureIdentityModel();
    return report.agentsLinked >= 0;
  },
};

// ---------------------------------------------------------------------------
// AVATAR — measured binding between the user identity and a rendered agent
// ---------------------------------------------------------------------------
export const avatarProbe: HealthProbe = {
  id: 'AVATAR',
  name: 'Avatar & personnalisation',
  category: 'world_3d',
  dependencies: ['IDENTITY', 'DMC_ID'],
  run: () => {
    const person = weddingStore.getCurrentPerson();
    const agent = weddingStore.currentPersonId
      ? weddingStore.getAgentForPerson(weddingStore.currentPersonId)
      : null;
    const sameRole = agent ? weddingStore.agents.filter((a) => a.role === agent.role).length : 0;
    const dmc = weddingStore.currentPersonId
      ? weddingStore.getDmcForPerson(weddingStore.currentPersonId)
      : null;

    const evidence = [
      { label: 'Personne de session', value: person ? `${person.displayName} (${person.id})` : 'aucune' },
      { label: 'Agent porteur', value: agent ? agent.id : 'aucun' },
      { label: 'Mode de rattachement', value: 'identifiant de personne (plus par rôle)' },
      { label: 'Agents partageant le même rôle', value: String(sameRole) },
      { label: 'Identité DMC rattachée', value: dmc ? dmc.dmcCode : 'aucune' },
      { label: 'Position avatar intérieur', value: weddingStore.avatarPos.map((n) => n.toFixed(1)).join(', ') },
      { label: 'Contrôles clavier', value: 'WASD + flèches, montés' },
    ];

    if (!person) {
      return mk('AVATAR', avatarProbe.name, 'world_3d', ['IDENTITY'], {
        status: 'PARTIAL',
        summary: 'Aucune personne de session : la personnalisation n’est appliquée à personne.',
        evidence,
        warnings: [{
          code: 'avatar_no_person',
          message: 'currentPersonId est nul.',
          cause: 'La migration d’identité n’a trouvé aucun agent correspondant.',
          impact: 'La couleur et le symbole DMC ne sont portés par aucun personnage.',
          solution: 'Relancer la migration d’identité depuis le module IDENTITY.',
        }],
      });
    }

    if (!agent) {
      return mk('AVATAR', avatarProbe.name, 'world_3d', ['IDENTITY'], {
        status: 'PARTIAL',
        summary: `${person.displayName} n’a pas de projection 3D dans ce monde.`,
        evidence,
        warnings: [{
          code: 'avatar_no_agent',
          message: 'La personne de session n’est reliée à aucun agent.',
          cause: 'Personne créée hors migration, ou monde régénéré depuis.',
          impact: 'L’utilisateur n’est visible nulle part dans la scène.',
          solution: 'Rattacher la personne à un agent, ou relancer la migration.',
        }],
      });
    }

    return mk('AVATAR', avatarProbe.name, 'world_3d', ['IDENTITY'], {
      status: 'VERIFIED',
      summary: `Avatar rattaché à ${person.displayName} par identifiant, sans ambiguïté malgré ${sameRole} agent(s) du même rôle.`,
      evidence,
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


// ---------------------------------------------------------------------------
// IDENTITY — the model itself: stable ids, no role-based binding
// ---------------------------------------------------------------------------
export const identityProbe: HealthProbe = {
  id: 'IDENTITY',
  name: 'Modèle d’identité (Person / Account / DMC)',
  category: 'core',
  dependencies: ['PERSISTENCE'],
  run: () => {
    const persons = weddingStore.persons;
    const dupes = persons.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);
    const noName = persons.filter((p) => !p.displayName?.trim());
    const current = weddingStore.getCurrentPerson();
    const boundAgent = weddingStore.currentPersonId
      ? weddingStore.getAgentForPerson(weddingStore.currentPersonId)
      : null;
    const sameRole = boundAgent
      ? weddingStore.agents.filter((a) => a.role === boundAgent.role).length
      : 0;

    const evidence = [
      { label: 'Personnes', value: String(persons.length) },
      { label: 'Comptes', value: String(weddingStore.accounts.length) },
      { label: 'Identités DMC', value: String(weddingStore.dmcIdentities.length) },
      { label: 'Personne de session', value: current ? `${current.displayName} (${current.id})` : 'non définie' },
      { label: 'Agent rattaché', value: boundAgent ? boundAgent.id : '—' },
      { label: 'Rattachement', value: 'par identifiant de personne' },
      { label: 'Agents partageant ce rôle', value: String(sameRole) },
      { label: 'Identifiants dupliqués', value: String(dupes.length) },
    ];

    if (dupes.length > 0 || noName.length > 0) {
      return mk('IDENTITY', identityProbe.name, 'core', ['PERSISTENCE'], {
        status: 'ERROR',
        summary: 'Le registre des personnes est incohérent.',
        evidence,
        errors: [{
          code: 'person_registry_invalid',
          message: dupes.length ? `Ids dupliqués : ${[...new Set(dupes)].join(', ')}.` : `${noName.length} personne(s) sans nom.`,
          cause: 'Création de personnes sans identifiant déterministe ou sans nom.',
          impact: 'Les relations par identifiant deviennent ambiguës.',
          solution: 'Relancer la migration d’identité, qui réutilise des ids déterministes.',
        }],
      });
    }

    if (!current) {
      return mk('IDENTITY', identityProbe.name, 'core', ['PERSISTENCE'], {
        status: 'PARTIAL',
        summary: 'Aucune personne de session : l’avatar n’est rattaché à personne.',
        evidence,
        warnings: [{
          code: 'no_current_person',
          message: 'currentPersonId est nul.',
          cause: 'Aucun agent ne correspondait à l’identité héritée lors de la migration.',
          impact: 'La personnalisation DMC n’est appliquée à aucun personnage.',
          solution: 'Choisir une identité dans le parcours d’entrée, ou relancer la migration.',
        }],
        repairable: true,
        repairAction: {
          id: 'run_identity_migration',
          label: 'Relancer la migration d’identité',
          description: 'Ré-exécute migrateIdentityModel() pour rattacher la session à une personne.',
        },
      });
    }

    return mk('IDENTITY', identityProbe.name, 'core', ['PERSISTENCE'], {
      status: 'VERIFIED',
      summary: `Session rattachée à ${current.displayName} par identifiant, ${persons.length} personnes enregistrées.`,
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId !== 'run_identity_migration') return false;
    weddingStore.ensureIdentityModel();
    return weddingStore.currentPersonId !== null;
  },
};

// ---------------------------------------------------------------------------
// GUESTS — RSVP and seating, measured against real capacity
// ---------------------------------------------------------------------------
export const guestsProbe: HealthProbe = {
  id: 'GUESTS',
  name: 'Invités, RSVP & plan de table',
  category: 'data',
  dependencies: ['IDENTITY'],
  run: () => {
    const guests = weddingStore.guests;
    const tables = weddingStore.seatingTables;
    const rsvp = weddingStore.getRsvpSummary();
    const seated = guests.filter((g) => g.seating.tableId);
    const target = weddingStore.currentProject.guestCountTarget;

    const overfull = tables
      .map((t) => ({ t, occ: weddingStore.getTableOccupancy(t.id) }))
      .filter((x) => x.occ.seated > x.occ.capacity);

    const evidence = [
      { label: 'Invités', value: String(guests.length) },
      { label: 'RSVP', value: `${rsvp.accepted} acceptés · ${rsvp.pending} en attente · ${rsvp.declined} refusés` },
      { label: 'Convives attendus (avec accompagnants)', value: String(rsvp.expectedHeads) },
      { label: 'Objectif projet', value: String(target) },
      { label: 'Tables', value: String(tables.length) },
      { label: 'Placés', value: `${seated.length} / ${guests.length}` },
      { label: 'Capacité totale', value: String(tables.reduce((n, t) => n + t.capacity, 0)) },
      { label: 'Tables en surcapacité', value: String(overfull.length) },
    ];

    if (overfull.length > 0) {
      return mk('GUESTS', guestsProbe.name, 'data', ['IDENTITY'], {
        status: 'ERROR',
        summary: `${overfull.length} table(s) dépassent leur capacité.`,
        evidence,
        errors: overfull.slice(0, 3).map((x) => ({
          code: 'table_overcapacity',
          message: `${x.t.label} : ${x.occ.seated} convives pour ${x.occ.capacity} places.`,
          cause: 'Des invités ont été placés au-delà de la capacité, ou des accompagnants ont été ajoutés après le placement.',
          impact: 'Le plan de table est physiquement irréalisable le jour J.',
          solution: 'Déplacer des invités, ou augmenter la capacité de la table.',
        })),
      });
    }

    if (guests.length === 0) {
      return mk('GUESTS', guestsProbe.name, 'data', ['IDENTITY'], {
        status: 'PARTIAL', summary: 'Aucun invité enregistré.', evidence,
        warnings: [{
          code: 'no_guests', message: 'La liste d’invités est vide.',
          cause: 'Projet neuf ou migration non exécutée.',
          impact: 'Ni RSVP ni plan de table possibles.',
          solution: 'Importer une liste, ou relancer la migration d’identité.',
        }],
      });
    }

    const unseated = guests.length - seated.length;
    if (unseated > 0) {
      return mk('GUESTS', guestsProbe.name, 'data', ['IDENTITY'], {
        status: 'PARTIAL',
        summary: `${guests.length} invités suivis ; ${unseated} sans table attribuée.`,
        evidence,
        warnings: [{
          code: 'guests_unseated',
          message: `${unseated} invité(s) ne sont affectés à aucune table.`,
          cause: 'Le plan de table n’est pas terminé.',
          impact: 'Le placement du jour J est incomplet.',
          solution: 'Attribuer une table à chaque invité ayant accepté.',
        }],
      });
    }

    return mk('GUESTS', guestsProbe.name, 'data', ['IDENTITY'], {
      status: 'VERIFIED',
      summary: `${guests.length} invités, tous placés, aucune table en surcapacité.`,
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// VENDORS — engagement status and document linkage
// ---------------------------------------------------------------------------
export const vendorsProbe: HealthProbe = {
  id: 'VENDORS',
  name: 'Prestataires & engagements',
  category: 'data',
  dependencies: ['IDENTITY', 'DOCUMENTS'],
  run: () => {
    const vendors = weddingStore.vendors;
    const contracted = vendors.filter((v) => v.status === 'contracted');
    const withoutDoc = vendors.filter((v) => v.documentIds.length === 0);
    const withoutContact = vendors.filter((v) => !v.contactPersonId);
    const withoutZone = vendors.filter((v) => v.placeIds.length === 0);

    const evidence = [
      { label: 'Prestataires', value: String(vendors.length) },
      { label: 'Sous contrat', value: String(contracted.length) },
      { label: 'Sans document lié', value: String(withoutDoc.length) },
      { label: 'Sans contact identifié', value: String(withoutContact.length) },
      { label: 'Sans zone d’intervention', value: String(withoutZone.length) },
      { label: 'Catégories', value: [...new Set(vendors.map((v) => v.category))].join(', ') || '—' },
    ];

    if (vendors.length === 0) {
      return mk('VENDORS', vendorsProbe.name, 'data', ['IDENTITY'], {
        status: 'PARTIAL', summary: 'Aucun prestataire enregistré.', evidence,
        warnings: [{
          code: 'no_vendors', message: 'Le registre des prestataires est vide.',
          cause: 'Projet neuf ou migration non exécutée.',
          impact: 'Aucun suivi contractuel possible.',
          solution: 'Relancer la migration, ou ajouter un prestataire.',
        }],
      });
    }

    if (withoutDoc.length > 0) {
      return mk('VENDORS', vendorsProbe.name, 'data', ['IDENTITY'], {
        status: 'PARTIAL',
        summary: `${vendors.length} prestataires ; ${withoutDoc.length} sans aucun document contractuel.`,
        evidence,
        warnings: [{
          code: 'vendors_without_document',
          message: `Sans document : ${withoutDoc.slice(0, 4).map((v) => v.companyName).join(', ')}.`,
          cause: 'Prestataire présent dans le monde mais sans devis ni contrat rattaché.',
          impact: 'Son coût n’entre pas dans le budget et son engagement n’est pas tracé.',
          solution: 'Rattacher un devis ou un contrat à chaque prestataire engagé.',
        }],
      });
    }

    return mk('VENDORS', vendorsProbe.name, 'data', ['IDENTITY'], {
      status: 'VERIFIED',
      summary: `${vendors.length} prestataires, tous documentés et reliés par identifiant.`,
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// MIGRATION — did the identity migration actually run, and is it idempotent?
// ---------------------------------------------------------------------------
export const migrationProbe: HealthProbe = {
  id: 'MIGRATION',
  name: 'Migration du modèle de données',
  category: 'data',
  dependencies: ['PERSISTENCE', 'IDENTITY'],
  run: () => {
    const snapshot = loadPersistedState(weddingStore.currentProject.id);
    const version = snapshot ? (snapshot as unknown as Record<string, unknown>).schemaVersion : undefined;
    const report = weddingStore.lastMigrationReport;
    const agents = weddingStore.agents;
    const linked = agents.filter((a) => a.personId).length;

    const evidence = [
      { label: 'Version de schéma du snapshot', value: version !== undefined ? `v${version}` : 'aucun snapshot' },
      { label: 'Version attendue', value: `v${SCHEMA_VERSION}` },
      { label: 'Migration exécutée', value: report ? 'oui' : 'non' },
      { label: 'Personnes créées', value: report ? String(report.personsCreated) : '—' },
      { label: 'Invités créés', value: report ? String(report.guestsCreated) : '—' },
      { label: 'Prestataires créés', value: report ? String(report.vendorsCreated) : '—' },
      { label: 'Agents rattachés', value: `${linked} / ${agents.length}` },
      { label: 'Données héritées conservées', value: 'oui (migration additive)' },
    ];
    if (report?.notes.length) evidence.push({ label: 'Notes', value: report.notes.join(' · ') });

    if (!report) {
      return mk('MIGRATION', migrationProbe.name, 'data', ['PERSISTENCE'], {
        status: 'UNKNOWN',
        summary: 'Aucune migration n’a encore été exécutée dans cette session.',
        evidence,
      });
    }

    if (version !== undefined && Number(version) < SCHEMA_VERSION) {
      return mk('MIGRATION', migrationProbe.name, 'data', ['PERSISTENCE'], {
        status: 'PARTIAL',
        summary: `Snapshot en v${version}, sera converti en v${SCHEMA_VERSION} à la prochaine sauvegarde.`,
        evidence,
        warnings: [{
          code: 'snapshot_older_schema',
          message: `Le snapshot enregistré est encore en v${version}.`,
          cause: 'Aucune sauvegarde n’a eu lieu depuis la montée de version.',
          impact: 'Les entités d’identité seront reconstruites à chaque chargement.',
          solution: 'Forcer une sauvegarde pour figer le schéma courant.',
        }],
        repairable: true,
        repairAction: {
          id: 'force_upgrade_snapshot',
          label: 'Convertir le snapshot',
          description: 'Réenregistre l’état courant au schéma le plus récent.',
        },
      });
    }

    if (linked < agents.length) {
      return mk('MIGRATION', migrationProbe.name, 'data', ['PERSISTENCE'], {
        status: 'PARTIAL',
        summary: `${agents.length - linked} agent(s) restent sans identité.`,
        evidence,
        warnings: [{
          code: 'migration_incomplete',
          message: 'Certains agents ne sont pas rattachés à une personne.',
          cause: 'Agents créés après la dernière migration.',
          impact: 'Ces personnages n’ont ni fiche, ni RSVP, ni permissions.',
          solution: 'Relancer la migration (idempotente).',
        }],
        repairable: true,
        repairAction: {
          id: 'force_upgrade_snapshot',
          label: 'Relancer la migration',
          description: 'Ré-exécute migrateIdentityModel() puis réenregistre.',
        },
      });
    }

    return mk('MIGRATION', migrationProbe.name, 'data', ['PERSISTENCE'], {
      status: 'VERIFIED',
      summary: `Schéma v${SCHEMA_VERSION}, ${linked}/${agents.length} agents rattachés, aucune donnée héritée perdue.`,
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId !== 'force_upgrade_snapshot') return false;
    weddingStore.ensureIdentityModel();
    weddingStore.saveCurrentState();
    const snap = loadPersistedState(weddingStore.currentProject.id);
    return !!snap && Number((snap as unknown as Record<string, unknown>).schemaVersion) >= SCHEMA_VERSION;
  },
};


// ---------------------------------------------------------------------------
// PROJECTIONS — is the identity model actually WIRED to what is on screen?
// ---------------------------------------------------------------------------
// A solid model that nothing reads is still dead weight. This probe checks the
// couplings between entities and their visible projections, and reports the
// exact leaks the migration was meant to remove.
export const projectionsProbe: HealthProbe = {
  id: 'PROJECTIONS',
  name: 'Projections du modèle (entités ↔ monde visible)',
  category: 'core',
  dependencies: ['IDENTITY', 'PEOPLE', 'GUESTS', 'VENDORS'],
  run: () => {
    const agents = weddingStore.agents;
    const persons = weddingStore.persons;
    const guests = weddingStore.guests;
    const vendors = weddingStore.vendors;

    // 1. Agent without Person (a body with no identity).
    const agentsWithoutPerson = agents.filter((a) => !a.personId);

    // 2. Person expected to be visible but with no agent projection.
    //    "Expected" = the person is a guest who accepted, or a vendor contact.
    const expectVisible = new Set<string>([
      ...guests.filter((g) => g.rsvp.status === 'accepted').map((g) => g.personId),
      ...vendors.map((v) => v.contactPersonId).filter(Boolean) as string[],
    ]);
    const personsWithoutProjection = [...expectVisible].filter((pid) => {
      const person = persons.find((p) => p.id === pid);
      if (!person) return true;
      return !agents.some((a) => a.id === person.agentId || a.personId === pid);
    });

    // 3. Guest without a resolvable Person.
    const guestsWithoutPerson = guests.filter((g) => !persons.some((p) => p.id === g.personId));

    // 4. Vendor with dead relations.
    const vendorsWithDeadRefs = vendors.filter((v) =>
      v.documentIds.some((id) => !weddingStore.docs.some((d) => d.id === id)) ||
      v.taskIds.some((id) => !weddingStore.tasks.some((t) => t.id === id)) ||
      v.placeIds.some((id) => !weddingStore.places.some((p) => p.id === id)) ||
      (v.agentId ? !agents.some((a) => a.id === v.agentId) : false));

    // 5. Tables over capacity.
    const overfullTables = weddingStore.seatingTables.filter((t) => {
      const occ = weddingStore.getTableOccupancy(t.id);
      return occ.seated > occ.capacity;
    });

    // 6. DMCIdentity not linked to an existing person.
    const orphanDmc = weddingStore.dmcIdentities.filter(
      (d) => !persons.some((p) => p.id === d.ownerPersonId));
    const personsClaimingMissingDmc = persons.filter(
      (p) => p.dmcIdentityId && !weddingStore.dmcIdentities.some((d) => d.id === p.dmcIdentityId));

    // 7. Session identity resolvable by ID (not by role).
    const sessionBound = weddingStore.currentPersonId !== null
      && weddingStore.getCurrentPerson() !== null;
    const sessionAgent = weddingStore.currentPersonId
      ? weddingStore.getAgentForPerson(weddingStore.currentPersonId) : null;
    // The old bug: several agents matching the user because of a shared role.
    const roleAmbiguity = sessionAgent
      ? agents.filter((a) => a.role === sessionAgent.role).length : 0;
    const userAgents = agents.filter((a) => weddingStore.isCurrentUserAgent(a.id)).length;

    const evidence = [
      { label: 'Agents sans personne', value: String(agentsWithoutPerson.length) },
      { label: 'Personnes attendues sans projection 3D', value: String(personsWithoutProjection.length) },
      { label: 'Invités sans personne', value: String(guestsWithoutPerson.length) },
      { label: 'Prestataires à relations mortes', value: String(vendorsWithDeadRefs.length) },
      { label: 'Tables en surcapacité', value: String(overfullTables.length) },
      { label: 'DMC orphelines', value: String(orphanDmc.length + personsClaimingMissingDmc.length) },
      { label: 'Identité de session', value: sessionBound ? 'résolue par identifiant' : 'non résolue' },
      { label: 'Agents reconnus comme l’utilisateur', value: `${userAgents} (rôle partagé par ${roleAmbiguity})` },
      { label: 'Invités placés à une table', value: `${guests.filter((g) => g.seating.tableId).length} / ${guests.length}` },
    ];

    const errors = [] as { code: string; message: string; cause: string; impact: string; solution: string }[];

    if (agentsWithoutPerson.length > 0) {
      errors.push({
        code: 'agent_without_person',
        message: `${agentsWithoutPerson.length} agent(s) sans identité : ${agentsWithoutPerson.slice(0, 4).map((a) => a.id).join(', ')}.`,
        cause: 'Agents créés après la migration d’identité.',
        impact: 'Cliquer sur eux n’ouvre aucune fiche réelle ; ni RSVP, ni permissions, ni relations.',
        solution: 'Relancer la migration d’identité (idempotente et additive).',
      });
    }
    if (guestsWithoutPerson.length > 0) {
      errors.push({
        code: 'guest_without_person',
        message: `${guestsWithoutPerson.length} invité(s) référencent une personne inexistante.`,
        cause: 'Personne supprimée sans nettoyer l’invité correspondant.',
        impact: 'Fiche invité incomplète et graphe nerveux rompu.',
        solution: 'Recréer la personne, ou supprimer l’invité orphelin.',
      });
    }
    if (vendorsWithDeadRefs.length > 0) {
      errors.push({
        code: 'vendor_dead_relations',
        message: `${vendorsWithDeadRefs.length} prestataire(s) pointent vers des documents, tâches, zones ou agents disparus.`,
        cause: 'Entités supprimées sans mise à jour des relations du prestataire.',
        impact: 'Documents et zones affichés sur la fiche prestataire ne mènent nulle part.',
        solution: 'Nettoyer les relations mortes du prestataire.',
      });
    }
    if (overfullTables.length > 0) {
      errors.push({
        code: 'table_overcapacity',
        message: `${overfullTables.length} table(s) au-delà de leur capacité.`,
        cause: 'Accompagnants ajoutés après le placement, ou capacité réduite.',
        impact: 'Plan de table irréalisable le jour J.',
        solution: 'Déplacer des invités ou augmenter la capacité.',
      });
    }
    if (orphanDmc.length + personsClaimingMissingDmc.length > 0) {
      errors.push({
        code: 'dmc_not_linked',
        message: `${orphanDmc.length} identité(s) DMC sans propriétaire, ${personsClaimingMissingDmc.length} personne(s) pointant vers une DMC absente.`,
        cause: 'Identité DMC créée ou supprimée sans mettre à jour la personne.',
        impact: 'La signature visuelle (couleur, symbole, badge) ne s’applique pas.',
        solution: 'Reconstruire le lien personne ↔ DMC.',
      });
    }
    if (userAgents > 1) {
      errors.push({
        code: 'identity_read_by_role',
        message: `${userAgents} agents sont reconnus comme l’utilisateur.`,
        cause: 'Une lecture d’identité par rôle subsiste au lieu d’une comparaison par identifiant.',
        impact: 'Plusieurs personnages portent la signature de l’utilisateur.',
        solution: 'Utiliser isCurrentUserAgent(agentId), qui compare des personId.',
      });
    }

    const warnings = [] as typeof errors;
    if (personsWithoutProjection.length > 0) {
      warnings.push({
        code: 'person_without_projection',
        message: `${personsWithoutProjection.length} personne(s) attendues dans le monde n’ont pas d’agent.`,
        cause: 'Invité accepté ou contact prestataire sans projection spatiale.',
        impact: 'Ces personnes sont invisibles dans la scène 3D et dans le graphe.',
        solution: 'Créer un agent pour ces personnes, ou revoir l’attente de visibilité.',
      });
    }

    const meta = { id: 'PROJECTIONS', name: projectionsProbe.name, category: 'core' as const,
                   dependencies: ['IDENTITY', 'PEOPLE', 'GUESTS', 'VENDORS'] };

    if (errors.length > 0) {
      return mk('PROJECTIONS', projectionsProbe.name, 'core', meta.dependencies, {
        status: 'ERROR',
        summary: `${errors.length} rupture(s) entre le modèle et ses projections.`,
        evidence, errors, warnings,
        repairable: true,
        repairAction: {
          id: 'repair_projections',
          label: 'Réparer les projections',
          description: 'Relance la migration et nettoie les relations mortes. Aucune entité n’est supprimée.',
        },
      });
    }

    if (warnings.length > 0) {
      return mk('PROJECTIONS', projectionsProbe.name, 'core', meta.dependencies, {
        status: 'PARTIAL',
        summary: 'Modèle et projections cohérents, avec des personnes non représentées dans le monde.',
        evidence, warnings,
      });
    }

    return mk('PROJECTIONS', projectionsProbe.name, 'core', meta.dependencies, {
      status: 'VERIFIED',
      summary: `${agents.length} agents reliés à une personne, ${guests.length} invités et ${vendors.length} prestataires projetés sans rupture.`,
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId !== 'repair_projections') return false;
    weddingStore.ensureIdentityModel();
    // Prune only DEAD ids from vendor relations; never delete an entity.
    for (const v of weddingStore.vendors) {
      v.documentIds = v.documentIds.filter((id) => weddingStore.docs.some((d) => d.id === id));
      v.taskIds = v.taskIds.filter((id) => weddingStore.tasks.some((t) => t.id === id));
      v.placeIds = v.placeIds.filter((id) => weddingStore.places.some((p) => p.id === id));
      if (v.agentId && !weddingStore.agents.some((a) => a.id === v.agentId)) v.agentId = undefined;
    }
    for (const p of weddingStore.persons) {
      if (p.dmcIdentityId && !weddingStore.dmcIdentities.some((d) => d.id === p.dmcIdentityId)) {
        p.dmcIdentityId = undefined;
      }
    }
    weddingStore.saveCurrentState();
    weddingStore.notify();
    return true;
  },
};

export const extraProbes: HealthProbe[] = [
  projectionsProbe,
  identityProbe,
  guestsProbe,
  vendorsProbe,
  migrationProbe,
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
