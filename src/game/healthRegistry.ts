// ---------------------------------------------------------------------------
// Wedding City — Health probe registry.
// ---------------------------------------------------------------------------
// Each engine exposes a probe; the System Nerve only aggregates. Probes MUST
// measure something real, and may only return VERIFIED with evidence attached.
//
// This replaces the previous model where 22 module statuses were string
// literals in the source, unrelated to what the code actually did.
// ---------------------------------------------------------------------------

import {
  AggregateHealth,
  HealthCheck,
  HealthProbe,
  ProbeStatus,
  createUnverified,
} from '../types/health';
import { weddingStore } from './weddingStore';
import { PERSISTED_FIELDS, SCHEMA_VERSION } from './persistenceSchema';
import { loadPersistedState, getStorageFailures } from './persistence';
import { checkReferentialIntegrity, describeBrokenReferences } from './integrity';
import { getDiagnostics, getDiagnosticsBySource, clearDiagnostics } from './diagnostics';
import { getPerfSnapshot } from './perfMonitor';
import { CONNECTOR_CAPABILITIES } from './connectorEngine';
import { RESEARCH_CAPABILITIES } from './researchEngine';
import { extraProbes } from './probes';

const now = () => new Date().toISOString();

function base(
  probe: Pick<HealthProbe, 'id' | 'name' | 'category' | 'dependencies'>,
  patch: Partial<HealthCheck>,
): HealthCheck {
  return { ...createUnverified(probe), lastCheck: now(), ...patch };
}

// ---------------------------------------------------------------------------
// PERSISTENCE — round-trip canary + writer/reader parity
// ---------------------------------------------------------------------------
const persistenceProbe: HealthProbe = {
  id: 'PERSISTENCE',
  name: 'Persistance locale (localStorage)',
  category: 'data',
  dependencies: ['STORAGE_QUOTA'],
  run: () => {
    const meta = { id: 'PERSISTENCE', name: persistenceProbe.name, category: 'data' as const, dependencies: ['STORAGE_QUOTA'] };

    // 1. Real write/read/delete round trip.
    const key = '__wc_health_canary__';
    let roundTrip = false;
    let writeError: string | null = null;
    try {
      const payload = JSON.stringify({ ok: true, ts: Date.now() });
      localStorage.setItem(key, payload);
      roundTrip = localStorage.getItem(key) === payload;
      localStorage.removeItem(key);
    } catch (err) {
      writeError = err instanceof Error ? err.message : String(err);
    }

    if (writeError) {
      return base(meta, {
        status: 'ERROR',
        summary: 'Écriture localStorage impossible — les données ne sont pas sauvegardées.',
        evidence: [{ label: 'Erreur', value: writeError }],
        errors: [{
          code: 'storage_unavailable',
          message: 'localStorage inaccessible.',
          cause: 'Quota dépassé, navigation privée, ou stockage bloqué par le navigateur.',
          impact: 'Aucune modification (documents, budget, playlist) ne survivra au rechargement.',
          solution: 'Libérer de l’espace ou quitter la navigation privée. À terme : persistance serveur (roadmap P3).',
        }],
        repairable: true,
        repairAction: { id: 'clear_canary', label: 'Nettoyer le cache de diagnostic', description: 'Supprime les clés temporaires de diagnostic.' },
      });
    }

    // 2. Parity: is every declared field actually present in the snapshot?
    const snapshot = loadPersistedState(weddingStore.currentProject.id);
    const declared = PERSISTED_FIELDS.map((f) => f.key);
    const missing = snapshot ? declared.filter((k) => !(k in (snapshot as unknown as Record<string, unknown>))) : [];

    const failures = getStorageFailures();
    const evidence = [
      { label: 'Round-trip localStorage', value: roundTrip ? 'OK' : 'ÉCHEC' },
      { label: 'Champs persistés déclarés', value: String(declared.length) },
      { label: 'Champs absents du snapshot', value: String(missing.length) },
      { label: 'Version de schéma', value: `v${SCHEMA_VERSION}` },
      { label: 'Échecs de stockage enregistrés', value: String(failures.length) },
    ];

    if (missing.length > 0) {
      return base(meta, {
        status: 'ERROR',
        summary: `${missing.length} champ(s) déclarés mais absents du snapshot.`,
        evidence,
        errors: [{
          code: 'snapshot_field_missing',
          message: `Champs non écrits : ${missing.join(', ')}.`,
          cause: 'Le sérialiseur et le schéma ont divergé.',
          impact: 'Ces données seront perdues au prochain rechargement.',
          solution: 'Ajouter le champ à PERSISTED_FIELDS (persistenceSchema.ts) — writer et reader en dépendent tous les deux.',
        }],
        repairable: true,
        repairAction: { id: 'force_save', label: 'Forcer une sauvegarde complète', description: 'Réécrit le snapshot avec tous les champs déclarés.' },
      });
    }

    if (failures.length > 0) {
      return base(meta, {
        status: 'PARTIAL',
        summary: `Stockage fonctionnel mais ${failures.length} échec(s) enregistré(s).`,
        evidence,
        warnings: [{
          code: 'storage_failures_logged',
          message: `${failures.length} opération(s) de stockage ont échoué.`,
          cause: 'Quota proche de la limite, ou snapshot corrompu.',
          impact: 'Certaines modifications peuvent ne pas avoir été enregistrées.',
          solution: 'Consulter le journal, puis forcer une sauvegarde complète.',
        }],
        repairable: true,
        repairAction: { id: 'force_save', label: 'Forcer une sauvegarde complète', description: 'Réécrit le snapshot avec tous les champs déclarés.' },
      });
    }

    return base(meta, {
      status: snapshot ? 'VERIFIED' : 'PARTIAL',
      summary: snapshot
        ? 'Écriture, relecture et couverture du schéma vérifiées.'
        : 'Stockage fonctionnel, aucun snapshot encore enregistré pour ce projet.',
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId === 'force_save') {
      weddingStore.saveCurrentState();
      return true;
    }
    if (actionId === 'clear_canary') {
      try { localStorage.removeItem('__wc_health_canary__'); return true; } catch { return false; }
    }
    return false;
  },
};

// ---------------------------------------------------------------------------
// DATA INTEGRITY — every cross-entity id must resolve
// ---------------------------------------------------------------------------
const integrityProbe: HealthProbe = {
  id: 'DATA_INTEGRITY',
  name: 'Intégrité référentielle du graphe',
  category: 'data',
  dependencies: ['PERSISTENCE'],
  run: () => {
    const meta = { id: 'DATA_INTEGRITY', name: integrityProbe.name, category: 'data' as const, dependencies: ['PERSISTENCE'] };
    const report = checkReferentialIntegrity({
      persons: weddingStore.persons,
      accounts: weddingStore.accounts,
      guests: weddingStore.guests,
      vendors: weddingStore.vendors,
      dmcIdentities: weddingStore.dmcIdentities,
      seatingTables: weddingStore.seatingTables,
      memberships: weddingStore.memberships,
      invitations: weddingStore.invitations,
      trackVotes: weddingStore.trackVotes,
      tracks: weddingStore.tracks,
      currentPersonId: weddingStore.currentPersonId,
      places: weddingStore.places,
      agents: weddingStore.agents,
      docs: weddingStore.docs,
      tasks: weddingStore.tasks,
      conflicts: weddingStore.conflicts,
      phases: weddingStore.phases,
    });

    const evidence = [
      { label: 'Références vérifiées', value: String(report.checkedReferences) },
      { label: 'Références orphelines', value: String(report.broken.length) },
      { label: 'Entités', value: `${weddingStore.places.length} lieux · ${weddingStore.agents.length} agents · ${weddingStore.docs.length} docs · ${weddingStore.tasks.length} tâches` },
    ];

    if (!report.ok) {
      return base(meta, {
        status: 'ERROR',
        summary: `${report.broken.length} référence(s) pointent vers des entités inexistantes.`,
        evidence: [...evidence, { label: 'Détail', value: describeBrokenReferences(report.broken) }],
        errors: [{
          code: 'broken_references',
          message: describeBrokenReferences(report.broken),
          cause: 'Une entité a été générée ou supprimée sans mettre à jour les liens qui la référencent.',
          impact: 'Liens neuronaux manquants dans le monde 3D et inspecteurs incomplets.',
          solution: 'Générer les entités manquantes, ou retirer les références mortes.',
        }],
        repairable: true,
        repairAction: {
          id: 'prune_broken_refs',
          label: 'Retirer les références mortes',
          description: 'Supprime uniquement les ids qui ne résolvent pas. Aucune entité n’est supprimée.',
        },
      });
    }

    return base(meta, {
      status: 'VERIFIED',
      summary: `${report.checkedReferences} références croisées résolvent toutes.`,
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId !== 'prune_broken_refs') return false;
    const known = new Set<string>([
      ...weddingStore.places.map((p) => p.id),
      ...weddingStore.agents.map((a) => a.id),
      ...weddingStore.docs.map((d) => d.id),
      ...weddingStore.tasks.map((t) => t.id),
    ]);
    const keep = (ids?: string[]) => (ids ?? []).filter((id) => known.has(id));
    weddingStore.places.forEach((p) => {
      p.connectedAgentIds = keep(p.connectedAgentIds);
      p.connectedDocIds = keep(p.connectedDocIds);
      p.connectedTaskIds = keep(p.connectedTaskIds);
    });
    weddingStore.agents.forEach((a) => {
      a.connectedDocIds = keep(a.connectedDocIds);
      a.connectedTaskIds = keep(a.connectedTaskIds);
      a.connectedAgentIds = keep(a.connectedAgentIds);
      a.connectedPlaceIds = keep(a.connectedPlaceIds);
    });
    weddingStore.docs.forEach((d) => {
      d.connectedAgentIds = keep(d.connectedAgentIds);
      d.connectedPlaceIds = keep(d.connectedPlaceIds);
      d.connectedTaskIds = keep(d.connectedTaskIds);
    });
    weddingStore.tasks.forEach((t) => {
      t.connectedDocIds = keep(t.connectedDocIds);
      t.connectedAgentIds = keep(t.connectedAgentIds);
    });
    weddingStore.saveCurrentState();
    weddingStore.notify();
    return true;
  },
};

// ---------------------------------------------------------------------------
// STORAGE QUOTA — measured, not assumed
// ---------------------------------------------------------------------------
const storageQuotaProbe: HealthProbe = {
  id: 'STORAGE_QUOTA',
  name: 'Volume de stockage local',
  category: 'data',
  run: () => {
    const meta = { id: 'STORAGE_QUOTA', name: storageQuotaProbe.name, category: 'data' as const, dependencies: [] };
    let bytes = 0;
    let keys = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('wedding_city')) continue;
        keys++;
        bytes += k.length + (localStorage.getItem(k)?.length ?? 0);
      }
    } catch (err) {
      return base(meta, {
        status: 'UNKNOWN',
        summary: 'Volume de stockage non mesurable.',
        evidence: [{ label: 'Erreur', value: err instanceof Error ? err.message : String(err) }],
      });
    }

    const kb = Math.round(bytes / 1024);
    // Browsers typically allow ~5 MB for localStorage.
    const pct = Math.min(100, Math.round((bytes / (5 * 1024 * 1024)) * 100));
    const evidence = [
      { label: 'Clés Wedding City', value: String(keys) },
      { label: 'Volume utilisé', value: `${kb} Ko` },
      { label: 'Part du quota estimé (5 Mo)', value: `${pct} %` },
    ];

    if (pct >= 80) {
      return base(meta, {
        status: 'ERROR',
        summary: `Stockage local presque saturé (${pct} %).`,
        evidence,
        errors: [{
          code: 'storage_near_quota',
          message: `${kb} Ko utilisés, soit ~${pct} % du quota navigateur.`,
          cause: 'Les documents importés sont stockés en Data URL dans localStorage.',
          impact: 'Les prochaines sauvegardes échoueront et les modifications seront perdues.',
          solution: 'Déplacer les fichiers vers un vrai stockage objet (roadmap P3.4).',
        }],
      });
    }

    return base(meta, {
      status: 'VERIFIED',
      summary: `${kb} Ko utilisés sur ~5 Mo disponibles.`,
      evidence,
      warnings: pct >= 50 ? [{
        code: 'storage_growing',
        message: `Stockage à ${pct} % du quota.`,
        cause: 'Accumulation de documents encodés en base64.',
        impact: 'Risque de saturation à moyen terme.',
        solution: 'Prévoir le stockage objet serveur.',
      }] : [],
    });
  },
};

// ---------------------------------------------------------------------------
// 3D / WebGL — real context acquisition
// ---------------------------------------------------------------------------
const webglProbe: HealthProbe = {
  id: 'RENDER_3D',
  name: 'Moteur 3D (WebGL / Three.js)',
  category: 'world_3d',
  run: () => {
    const meta = { id: 'RENDER_3D', name: webglProbe.name, category: 'world_3d' as const, dependencies: [] };
    if (typeof document === 'undefined') {
      return base(meta, { status: 'UNKNOWN', summary: 'Pas de DOM disponible dans ce contexte.' });
    }
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
      if (!gl) {
        return base(meta, {
          status: 'ERROR',
          summary: 'Aucun contexte WebGL disponible.',
          errors: [{
            code: 'webgl_unavailable',
            message: 'Impossible d’obtenir un contexte WebGL.',
            cause: 'Accélération matérielle désactivée, pilote non supporté, ou contexte perdu.',
            impact: 'Le monde 3D ne peut pas s’afficher.',
            solution: 'Activer l’accélération matérielle. L’interface 2D reste utilisable grâce au périmètre d’erreur dédié.',
          }],
        });
      }
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'non exposé';
      const liveCanvas = document.getElementById('wedding-canvas');

      // Real frame measurements sampled by the render loop. Never estimated:
      // when nothing has rendered yet, these stay null and are reported as
      // "not measured" rather than as an invented number.
      const perf = getPerfSnapshot();

      const evidence = [
        { label: 'Version', value: String(gl.getParameter(gl.VERSION)) },
        { label: 'Renderer', value: renderer },
        { label: 'Taille max. de texture', value: String(gl.getParameter(gl.MAX_TEXTURE_SIZE)) },
        { label: 'Canvas monté dans le DOM', value: liveCanvas ? 'oui' : 'non' },
        { label: 'Images par seconde', value: perf.fps !== null ? `${perf.fps} i/s (${perf.samples} échantillons)` : 'non mesuré' },
        { label: '1 % les plus lentes', value: perf.fps1PercentLow !== null ? `${perf.fps1PercentLow} i/s` : 'non mesuré' },
        { label: 'Temps par image', value: perf.frameMs !== null ? `${perf.frameMs} ms` : 'non mesuré' },
        { label: 'Pixel ratio effectif', value: perf.dpr ? String(perf.dpr) : 'non mesuré' },
        { label: 'Triangles', value: perf.triangles ? perf.triangles.toLocaleString('fr-FR') : 'non mesuré' },
        { label: 'Appels de rendu', value: perf.drawCalls ? String(perf.drawCalls) : 'non mesuré' },
      ];

      if (perf.fps !== null && perf.fps < 30) {
        return base(meta, {
          status: 'PARTIAL',
          summary: `Scène rendue mais fluidité dégradée (${perf.fps} i/s).`,
          evidence,
          warnings: [{
            code: 'render_low_fps',
            message: `${perf.fps} images/s mesurées, ${perf.fps1PercentLow} i/s sur les images les plus lentes.`,
            cause: perf.degradedReason ?? 'Charge de rendu supérieure à ce que le GPU absorbe (IBL, ombres douces, pixel ratio).',
            impact: 'Navigation saccadée dans le monde.',
            solution: 'AdaptiveDpr réduit déjà le pixel ratio automatiquement ; réduire la résolution de l’environnement ou désactiver les ombres de contact si cela persiste.',
          }],
        });
      }

      return base(meta, {
        status: 'VERIFIED',
        summary: perf.fps !== null
          ? `Contexte WebGL actif, ${perf.fps} i/s à un pixel ratio de ${perf.dpr}.`
          : 'Contexte WebGL obtenu et scène montée (fluidité pas encore mesurée).',
        evidence,
      });
    } catch (err) {
      return base(meta, {
        status: 'ERROR',
        summary: 'Échec du test WebGL.',
        evidence: [{ label: 'Erreur', value: err instanceof Error ? err.message : String(err) }],
      });
    }
  },
};

// ---------------------------------------------------------------------------
// RUNTIME ERRORS — reads the diagnostics bus
// ---------------------------------------------------------------------------
const runtimeProbe: HealthProbe = {
  id: 'RUNTIME_ERRORS',
  name: 'Erreurs d’exécution',
  category: 'core',
  run: () => {
    const meta = { id: 'RUNTIME_ERRORS', name: runtimeProbe.name, category: 'core' as const, dependencies: [] };
    const all = getDiagnostics();
    const errors = all.filter((e) => e.severity === 'error');
    const warnings = all.filter((e) => e.severity === 'warning');

    const evidence = [
      { label: 'Événements enregistrés', value: String(all.length) },
      { label: 'Erreurs', value: String(errors.length) },
      { label: 'Avertissements', value: String(warnings.length) },
    ];

    if (errors.length > 0) {
      return base(meta, {
        status: 'ERROR',
        summary: `${errors.length} erreur(s) d’exécution enregistrée(s).`,
        evidence,
        errors: errors.slice(0, 5).map((e) => ({
          code: e.code,
          message: `${e.message} (×${e.count})`,
          cause: `Source : ${e.source}`,
          impact: 'Comportement dégradé ou données non enregistrées.',
          solution: 'Consulter le détail puis corriger la cause, ou vider le journal après traitement.',
        })),
        repairable: true,
        repairAction: { id: 'clear_diagnostics', label: 'Vider le journal d’erreurs', description: 'Efface les événements enregistrés. Ne corrige pas la cause.' },
      });
    }

    return base(meta, {
      status: 'VERIFIED',
      summary: warnings.length > 0 ? `Aucune erreur, ${warnings.length} avertissement(s).` : 'Aucune erreur enregistrée.',
      evidence,
    });
  },
  repair: (actionId) => {
    if (actionId !== 'clear_diagnostics') return false;
    clearDiagnostics();
    return true;
  },
};

// ---------------------------------------------------------------------------
// TIMELINE — verify phases actually cover the simulated day
// ---------------------------------------------------------------------------
const timelineProbe: HealthProbe = {
  id: 'TIMELINE',
  name: 'Timeline vivante',
  category: 'core',
  dependencies: ['PERSISTENCE'],
  run: () => {
    const meta = { id: 'TIMELINE', name: timelineProbe.name, category: 'core' as const, dependencies: ['PERSISTENCE'] };
    const phases = weddingStore.phases;
    if (!phases || phases.length === 0) {
      return base(meta, {
        status: 'ERROR',
        summary: 'Aucune phase de timeline chargée.',
        errors: [{
          code: 'timeline_empty',
          message: 'La liste des phases est vide.',
          cause: 'Snapshot corrompu ou restauration incomplète.',
          impact: 'La timeline et le suivi de phase active ne fonctionnent pas.',
          solution: 'Recharger le projet pour restaurer les phases par défaut.',
        }],
      });
    }

    const sorted = [...phases].sort((a, b) => a.startHour - b.startHour);
    const gaps: string[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startHour > sorted[i - 1].endHour) {
        gaps.push(`${sorted[i - 1].endHour}h→${sorted[i].startHour}h`);
      }
    }
    const covered = weddingStore.getActivePhase() != null;
    const evidence = [
      { label: 'Phases chargées', value: String(phases.length) },
      { label: 'Amplitude', value: `${sorted[0].startHour}h → ${sorted[sorted.length - 1].endHour}h` },
      { label: 'Phase active résolue', value: covered ? 'oui' : 'non' },
      { label: 'Trous de couverture', value: gaps.length ? gaps.join(', ') : 'aucun' },
    ];

    if (gaps.length > 0) {
      return base(meta, {
        status: 'PARTIAL',
        summary: `${phases.length} phases, mais ${gaps.length} trou(s) de couverture horaire.`,
        evidence,
        warnings: [{
          code: 'timeline_gaps',
          message: `Heures non couvertes : ${gaps.join(', ')}.`,
          cause: 'Phases éditées ou générées sans continuité.',
          impact: 'Aucune phase active pendant ces créneaux.',
          solution: 'Ajuster les bornes des phases concernées.',
        }],
      });
    }

    return base(meta, {
      status: 'VERIFIED',
      summary: `${phases.length} phases continues, phase active résolue.`,
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// SELF-DECLARED SIMULATED MODULES
// The engines themselves admit they are simulated; the Nerve just reports it.
// ---------------------------------------------------------------------------
const connectorsProbe: HealthProbe = {
  id: 'CONNECTORS',
  name: 'Connecteurs externes (Google, Microsoft, Dropbox, Spotify)',
  category: 'integration',
  run: () => {
    const meta = { id: 'CONNECTORS', name: connectorsProbe.name, category: 'integration' as const, dependencies: [] };
    const c = CONNECTOR_CAPABILITIES;
    if (c.simulated) {
      return base(meta, {
        status: 'MOCK',
        summary: 'Parcours simulé localement — aucun service externe n’est contacté.',
        evidence: [
          { label: 'Appels réseau', value: c.network ? 'oui' : 'non' },
          { label: 'OAuth / PKCE', value: c.oauth ? 'oui' : 'non' },
          { label: 'Origine des données', value: 'états locaux (localStorage + setTimeout)' },
        ],
        warnings: [{
          code: 'connectors_simulated',
          message: 'L’interface affiche « connecté » sans connexion réelle.',
          cause: 'Aucune couche HTTP ni échange de jetons n’existe dans le moteur.',
          impact: 'Aucune donnée réelle n’est importée depuis Google, Dropbox ou Spotify.',
          solution: 'Implémenter OAuth PKCE côté serveur puis un flux réel (roadmap P3.3).',
        }],
      });
    }
    return base(meta, { status: 'UNKNOWN', summary: 'Capacités déclarées réelles mais non vérifiées ici.' });
  },
};

const researchProbe: HealthProbe = {
  id: 'WEB_RESEARCH',
  name: 'Recherche Web & prestataires',
  category: 'ai_engine',
  run: () => {
    const meta = { id: 'WEB_RESEARCH', name: researchProbe.name, category: 'ai_engine' as const, dependencies: [] };
    const c = RESEARCH_CAPABILITIES;
    if (c.simulated) {
      return base(meta, {
        status: 'MOCK',
        summary: 'Résultats issus de tableaux statiques — aucune recherche en ligne.',
        evidence: [
          { label: 'Appels réseau', value: c.network ? 'oui' : 'non' },
          { label: 'Sources live', value: c.liveSources ? 'oui' : 'non' },
          { label: 'Origine des fiches', value: 'constantes TypeScript embarquées' },
        ],
        warnings: [{
          code: 'research_simulated',
          message: 'Avis, notes et prix sont figés dans le code.',
          cause: 'Aucun connecteur d’annuaire ou de moteur de recherche.',
          impact: 'Les informations affichées peuvent être obsolètes ou invérifiables.',
          solution: 'Brancher une vraie API avec sources, fraîcheur et attribution (roadmap P3.6).',
        }],
      });
    }
    return base(meta, { status: 'UNKNOWN', summary: 'Capacités déclarées réelles mais non vérifiées ici.' });
  },
};

// ---------------------------------------------------------------------------
// HONEST ABSENCES — declared, never dressed up as working
// ---------------------------------------------------------------------------
function absent(
  id: string,
  name: string,
  category: HealthCheck['category'],
  detail: { cause: string; impact: string; solution: string; evidence: { label: string; value: string }[] },
): HealthProbe {
  return {
    id,
    name,
    category,
    run: () =>
      base({ id, name, category, dependencies: [] }, {
        status: 'NOT_IMPLEMENTED',
        summary: 'Aucun mécanisme correspondant dans le code.',
        evidence: detail.evidence,
        warnings: [{
          code: `${id.toLowerCase()}_absent`,
          message: `${name} n’est pas implémenté.`,
          cause: detail.cause,
          impact: detail.impact,
          solution: detail.solution,
        }],
      }),
  };
}

const authProbe = absent('AUTH', 'Authentification', 'core', {
  cause: 'Le formulaire ne demande qu’un e-mail ; aucun mot de passe, jeton ni session n’existe.',
  impact: 'N’importe qui peut ouvrir n’importe quel compte local. Aucune séparation des utilisateurs.',
  solution: 'Authentification serveur avec session (roadmap P2.7).',
  evidence: [
    { label: 'Champ mot de passe', value: 'absent' },
    { label: 'Session / jeton', value: 'absent' },
    { label: 'Stockage des comptes', value: 'localStorage en clair' },
  ],
});

/**
 * PERMISSIONS is deliberately PARTIAL, not VERIFIED.
 *
 * The model now exists (ProjectMembership + capabilities, resolved by role and
 * attached to real account/person ids) and `weddingStore.can()` is the single
 * place the UI can ask the question. But NOTHING is enforced: with no server,
 * refusing an action in the browser would be security theatre. Reporting this
 * as working would be exactly the kind of claim this architecture forbids.
 */
const permissionsProbe: HealthProbe = {
  id: 'PERMISSIONS',
  name: 'Permissions & rôles projet',
  category: 'core',
  dependencies: ['IDENTITY'],
  run: () => {
    const memberships = weddingStore.memberships;
    const caps = weddingStore.getCurrentCapabilities();
    const membership = weddingStore.getCurrentMembership();
    return base({ id: 'PERMISSIONS', name: 'Permissions & rôles projet', category: 'core', dependencies: ['IDENTITY'] }, {
      status: 'PARTIAL',
      summary: 'Modèle de capacités en place et rattaché aux identités ; aucune règle n’est encore appliquée.',
      evidence: [
        { label: 'Adhésions projet', value: String(memberships.length) },
        { label: 'Rôle de session', value: membership?.role ?? 'aucun (mode local mono-utilisateur)' },
        { label: 'Capacités résolues', value: String(caps.length) },
        { label: 'Point de contrôle unique', value: 'weddingStore.can(capability)' },
        { label: 'Application côté client', value: 'non (aucune mutation bloquée)' },
        { label: 'Application côté serveur', value: 'non (aucun serveur)' },
      ],
      warnings: [{
        code: 'permissions_not_enforced',
        message: 'Les capacités sont calculées mais aucune action n’est refusée.',
        cause: 'Sans backend, un refus côté navigateur serait contournable et donnerait une fausse impression de sécurité.',
        impact: 'Tout utilisateur peut encore appeler toutes les méthodes du store.',
        solution: 'Activer l’application des règles en même temps que l’autorisation serveur (roadmap P2.7/P3.1).',
      }],
    });
  },
};

const ocrProbe: HealthProbe = {
  id: 'OCR',
  name: 'Extraction documentaire (OCR)',
  category: 'ai_engine',
  run: () =>
    base({ id: 'OCR', name: 'Extraction documentaire (OCR)', category: 'ai_engine', dependencies: [] }, {
      status: 'PARTIAL',
      summary: 'Extraction réelle sur texte brut uniquement ; PDF et images ne sont pas analysés.',
      evidence: [
        { label: 'Formats réellement lus', value: '.txt, .csv, .json' },
        { label: 'PDF / images', value: 'stockés en Data URL, jamais analysés' },
        { label: 'Méthode d’extraction', value: 'expression régulière sur le montant en €' },
        { label: 'Moteur OCR', value: 'aucun' },
      ],
      warnings: [{
        code: 'ocr_regex_only',
        message: 'L’interface annonce un « Scan IA » alors qu’il s’agit d’une regex sur du texte.',
        cause: 'Aucune bibliothèque OCR ni parseur PDF/XLSX n’est présent.',
        impact: 'Les montants des PDF ne sont pas extraits ; faux positifs possibles sur le texte.',
        solution: 'Intégrer un OCR réel et des parseurs PDF/XLSX avec extraction traçable (roadmap P3.4/P3.5).',
      }],
    }),
};

const invitationsProbe: HealthProbe = {
  id: 'INVITATIONS',
  name: 'Invitations & partage',
  category: 'integration',
  dependencies: ['PERSISTENCE'],
  run: () => {
    const meta = { id: 'INVITATIONS', name: invitationsProbe.name, category: 'integration' as const, dependencies: ['PERSISTENCE'] };
    // Really try to resolve the current project's own invite code.
    const code = weddingStore.currentProject.inviteCode;
    const resolved = code ? weddingStore.resolveInviteCode(code) : null;
    return base(meta, {
      status: 'PARTIAL',
      summary: 'Résolution locale opérationnelle ; le partage entre appareils nécessite un serveur.',
      evidence: [
        { label: 'Code du projet courant', value: code || '—' },
        { label: 'Résolution locale', value: resolved ? 'OK' : 'échec' },
        { label: 'Lecture de ?code= dans l’URL', value: 'active' },
        { label: 'Partage inter-appareils', value: 'indisponible (aucun serveur)' },
      ],
      warnings: [{
        code: 'invitations_local_only',
        message: 'Un code créé sur un autre appareil ne peut pas être résolu ici.',
        cause: 'Les projets vivent dans le localStorage du navigateur ; il n’y a pas de backend.',
        impact: 'La collaboration réelle entre plusieurs personnes n’est pas possible.',
        solution: 'Service d’invitations côté serveur (roadmap P2.6 / P3.1).',
      }],
    });
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const probes: HealthProbe[] = [
  persistenceProbe,
  integrityProbe,
  storageQuotaProbe,
  webglProbe,
  runtimeProbe,
  timelineProbe,
  connectorsProbe,
  researchProbe,
  ocrProbe,
  invitationsProbe,
  authProbe,
  permissionsProbe,
  ...extraProbes,
];

export function getProbes(): readonly HealthProbe[] {
  return probes;
}

export function registerProbe(probe: HealthProbe): void {
  const idx = probes.findIndex((p) => p.id === probe.id);
  if (idx >= 0) probes[idx] = probe;
  else probes.push(probe);
}

/** Run every probe. A throwing probe becomes ERROR — never a silent OK. */
export async function runAllProbes(): Promise<HealthCheck[]> {
  const results: HealthCheck[] = [];
  for (const probe of probes) {
    const started = Date.now();
    try {
      const check = await probe.run();
      results.push({ ...check, durationMs: Date.now() - started });
    } catch (err) {
      results.push({
        ...createUnverified(probe),
        status: 'ERROR',
        lastCheck: now(),
        durationMs: Date.now() - started,
        summary: 'La sonde elle-même a échoué.',
        errors: [{
          code: 'probe_crashed',
          message: err instanceof Error ? err.message : String(err),
          cause: 'Exception levée pendant l’exécution de la sonde.',
          impact: 'L’état réel de ce module est inconnu.',
          solution: 'Corriger la sonde ou la dépendance qu’elle interroge.',
        }],
      });
    }
  }
  return results;
}

export async function repairViaProbe(probeId: string, actionId: string): Promise<boolean> {
  const probe = probes.find((p) => p.id === probeId);
  if (!probe?.repair) return false;
  try {
    return await probe.repair(actionId);
  } catch {
    return false;
  }
}

export function aggregate(checks: HealthCheck[], lastFullScanAt: string | null, isScanning = false): AggregateHealth {
  const byStatus: Record<ProbeStatus, number> = {
    VERIFIED: 0, PARTIAL: 0, MOCK: 0, ERROR: 0, NOT_IMPLEMENTED: 0, UNKNOWN: 0,
  };
  for (const c of checks) byStatus[c.status]++;
  return {
    total: checks.length,
    byStatus,
    // MOCK deliberately does NOT count as healthy — that illusion is the whole
    // problem this architecture exists to remove.
    verifiedRatio: checks.length ? byStatus.VERIFIED / checks.length : 0,
    lastFullScanAt,
    isScanning,
    totalErrors: checks.reduce((n, c) => n + c.errors.length, 0),
    totalWarnings: checks.reduce((n, c) => n + c.warnings.length, 0),
  };
}

/** Diagnostics for a given source, exposed for the incident panel. */
export function probeRelatedDiagnostics(source: Parameters<typeof getDiagnosticsBySource>[0]) {
  return getDiagnosticsBySource(source);
}
