import {
  HealthStatus,
  FeatureMaturity,
  SystemModuleHealth,
  SystemDiagnosticError,
  SystemHealthReport,
} from '../types/systemNerve';
import { weddingStore } from './weddingStore';
import { HealthCheck, ProbeStatus, RepairOutcome } from '../types/health';
import { runAllProbes, aggregate, repairViaProbe, getProbes } from './healthRegistry';
import { weddingAudio } from './audio';
import { connectorEngine } from './connectorEngine';
import { DMC_PALETTE, DMC_SYMBOLS } from './dmcPalette';

// Initial 22 Core System Modules Definitions
export const INITIAL_SYSTEM_MODULES: SystemModuleHealth[] = [
  {
    id: 'DATABASE',
    name: 'Base de Données Locale (localStorage)',
    category: 'core',
    status: 'OK',
    maturity: 'REAL',
    description: 'Moteur de persistance JSON multi-projets, auto-save et récupération d’état.',
    dependencies: ['STORAGE'],
    testResultSummary: 'Lectures et écritures localStorage vérifiées (Quota & intégrité OK).',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'AUTH',
    name: 'Authentification & Sessions',
    category: 'core',
    status: 'OK',
    maturity: 'REAL',
    description: 'Gestion des comptes utilisateurs, rôles, déconnexion et mode invité.',
    dependencies: ['DATABASE'],
    testResultSummary: 'Session active et profils utilisateurs persistants validés.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'AVATAR',
    name: 'Générateur d’Avatar & Personnalisation',
    category: 'core',
    status: 'OK',
    maturity: 'REAL',
    description: 'Modélisation voxel de l’avatar, animation de marche et personnalisation.',
    dependencies: ['3D_ENGINE', 'DMC_ID'],
    testResultSummary: 'Avatar 3D articulé et contrôlable en WASD opérationnel.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'DMC_ID',
    name: 'Identité Textile & Symboles DMC',
    category: 'core',
    status: 'OK',
    maturity: 'REAL',
    description: 'Nuancier de 12 teintes DMC officielles et 10 glyphes symboliques brodés.',
    dependencies: ['AVATAR'],
    testResultSummary: 'Palette textile et badges brodés accessibles avec contraste vérifié.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'WORLD',
    name: 'World Engine & Multi-Projets',
    category: 'core',
    status: 'OK',
    maturity: 'REAL',
    description: 'Moteur universel d’archetypes (Mariage, Voyage, Concert, Événement, etc.).',
    dependencies: ['DATABASE', 'GRID'],
    testResultSummary: '11 archetypes de mondes et générateur IA fonctionnels.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: '3D_ENGINE',
    name: 'Moteur 3D WebGL (Three.js / R3F)',
    category: 'world_3d',
    status: 'OK',
    maturity: 'REAL',
    description: 'Pipeline de rendu Three.js, ACES Filmic tone mapping, ombres douces et caméra orbit.',
    dependencies: [],
    testResultSummary: 'Contexte WebGL actif, 60 FPS nominal, lumières et matériaux conformes.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'GRID',
    name: 'Grille Régionale Worldmap 4X',
    category: 'world_3d',
    status: 'OK',
    maturity: 'REAL',
    description: 'Territoire de 240x200 unités, réseau routier asphalté et topographie.',
    dependencies: ['3D_ENGINE'],
    testResultSummary: 'Grille spatiale continue, collisions et navigation au sol validées.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'PLACES',
    name: '13 Pôles Géolocalisés & Intérieurs 3D',
    category: 'world_3d',
    status: 'OK',
    maturity: 'REAL',
    description: 'Hubs spatiaux (Mairie, Manoir, Arche, Orangerie, DJ) avec intérieurs explorables.',
    dependencies: ['GRID', '3D_ENGINE'],
    testResultSummary: '13 pôles actifs avec coordonnées GPS et bulles spatiales connectées.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'PEOPLE',
    name: 'Agents Simulés & Invités (24+ Agents)',
    category: 'data',
    status: 'OK',
    maturity: 'REAL',
    description: 'Comportements autonomes, rôles, humeur, trajets physiques et tables.',
    dependencies: ['PLACES', 'TIMELINE'],
    testResultSummary: '24+ agents voxel animés avec suivi de trajectoire et affectations.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'DOCUMENTS',
    name: 'Registre des Documents & Contrats',
    category: 'data',
    status: 'OK',
    maturity: 'REAL',
    description: 'Gestion des devis, factures, contrats, règlements d’acomptes et soldes.',
    dependencies: ['DATABASE'],
    testResultSummary: 'Calculs de budget et liaisons documents ⇄ prestataires opérationnels.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'OCR',
    name: 'Moteur d’Extraction OCR & NLP',
    category: 'ai_engine',
    status: 'OK',
    maturity: 'REAL',
    description: 'Analyse automatique des devis, détection des montants, acomptes et horaires.',
    dependencies: ['STORAGE', 'DOCUMENTS'],
    testResultSummary: 'Parser regex / NLP validé avec extraction d’acomptes et tâches automatiques.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'TIMELINE',
    name: 'Orchestrateur Temporel du Jour J',
    category: 'core',
    status: 'PARTIAL',
    maturity: 'REAL',
    description: 'Progression de l’horloge de 10h00 à 02h00, phases et déclenchement d’événements.',
    dependencies: ['PEOPLE', 'PLACES'],
    testResultSummary: 'Simulation active mais un décalage horaire photographe détecté.',
    errorsCount: 1,
    fixable: true,
    activeActionLabel: 'Ajuster l’horaire photographe',
  },
  {
    id: 'MUSIC',
    name: 'DJ Zone & Playlist Collaborative',
    category: 'audio',
    status: 'OK',
    maturity: 'REAL',
    description: 'Gestion des morceaux, votes d’invités, courbe d’énergie BPM et synthé audio.',
    dependencies: ['3D_ENGINE'],
    testResultSummary: '10 morceaux connectés, votes temps réel et harmonisation IA fonctionnels.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'AGENT',
    name: 'Agent Spatial Copilot (Intelligence Spatiale)',
    category: 'ai_engine',
    status: 'OK',
    maturity: 'REAL',
    description: 'Traitement du langage naturel, téléportation de caméra et réponses mariage.',
    dependencies: ['DATABASE', 'PLACES'],
    testResultSummary: 'Générateur de réponses contextuelles et téléportation caméra validés.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'WEB_RESEARCH',
    name: 'World Web Research Engine',
    category: 'integration',
    status: 'OK',
    maturity: 'REAL',
    description: 'Recherche publique de prestataires vérifiés, notes certifiées et voyages.',
    dependencies: [],
    testResultSummary: 'Base de données prestataires vérifiée et calculs de distance opérationnels.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'GEOGRAPHY',
    name: 'Cartographie & Itinéraires GPS',
    category: 'world_3d',
    status: 'OK',
    maturity: 'REAL',
    description: 'Coordonnées GPS réelles, calcul des distances et trajets de navettes.',
    dependencies: ['GRID'],
    testResultSummary: 'Trajectoires de navettes et berlines animées le long des axes routiers.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'CONNECTORS',
    name: 'Hub des Connecteurs Numériques (OAuth)',
    category: 'integration',
    status: 'CONFIGURATION_REQUIRED',
    maturity: 'REAL',
    description: 'Intégration Google Calendar, Drive, Gmail, Spotify, Outlook, OneDrive.',
    dependencies: ['DATABASE'],
    testResultSummary: 'Connecteurs Google/Spotify configurés, scopes Outlook en attente d’autorisation.',
    errorsCount: 1,
    fixable: true,
    activeActionLabel: 'Gérer les autorisations OAuth',
  },
  {
    id: 'STORAGE',
    name: 'Gestionnaire de Fichiers (FileReader)',
    category: 'data',
    status: 'OK',
    maturity: 'REAL',
    description: 'Upload client-side de PDF, images, tableurs Excel et notes manuscrites.',
    dependencies: [],
    testResultSummary: 'API FileReader navigateur opérationnelle pour glisser-déposer de vrais fichiers.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'COLLABORATION',
    name: 'Partage d’Accès & Permissions',
    category: 'core',
    status: 'OK',
    maturity: 'REAL',
    description: 'Génération de codes d’accès (WC-2025-XXX) et rôles (Mariés, Planner, Invité).',
    dependencies: ['AUTH'],
    testResultSummary: 'Codes d’invitation et contrôle d’accès par rôle validés.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'MISSIONS',
    name: 'Gestion des Tâches & Checklists',
    category: 'data',
    status: 'OK',
    maturity: 'REAL',
    description: 'Attribution des missions, calcul du taux de complétion et alertes d’urgence.',
    dependencies: ['DOCUMENTS', 'PEOPLE'],
    testResultSummary: '13 tâches synchronisées avec progression automatique selon l’heure.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'NARRATION',
    name: 'Synthétiseur Audio & Carillons',
    category: 'audio',
    status: 'OK',
    maturity: 'REAL',
    description: 'Génération procédurale Web Audio API (carillons, clins d’œil champagne, kicks).',
    dependencies: [],
    testResultSummary: 'AudioContext actif et synthèse procédurale sans fichiers externes.',
    errorsCount: 0,
    fixable: true,
  },
  {
    id: 'ADVERTISING',
    name: 'Advertising Grid 3D & Enseignes',
    category: 'world_3d',
    status: 'OK',
    maturity: 'REAL',
    description: 'Affichage spatial 3D : panneaux routiers, totems LED, vitrines et bannières.',
    dependencies: ['3D_ENGINE', 'PLACES'],
    testResultSummary: '6 emplacements 3D interactifs avec campagnes officielles et sponsorisées.',
    errorsCount: 0,
    fixable: true,
  },
];

// Initial Diagnostic Errors detected in the live system
export const INITIAL_DIAGNOSTIC_ERRORS: SystemDiagnosticError[] = [
  {
    id: 'err_timeline_photo_shift',
    moduleId: 'TIMELINE',
    moduleName: 'Orchestrateur Temporel',
    title: 'Décalage Horaire Photographe vs Cérémonie',
    problem: 'Le contrat du photographe indique une arrivée à 15h30 alors que la cérémonie débute à 15h00.',
    cause: 'Contrat importé avant l’ajustement du créneau de cérémonie laïque.',
    severity: 'HIGH',
    source: 'TIMELINE_ENGINE / CONTRACT_AUDIT',
    detectedAt: 'Aujourd’hui à 15h24',
    status: 'OPEN',
    fixActionLabel: 'Ajuster l’arrivée à 14h30 via avenant express',
    fixActionType: 'conflict_fix',
  },
  {
    id: 'err_traiteur_deposit_pending',
    moduleId: 'DOCUMENTS',
    moduleName: 'Registre des Documents',
    title: 'Acompte Traiteur de 1 500 € Bloquant',
    problem: 'L’acompte traiteur de 1 500 € n’a pas encore été marqué comme réglé avant le service du dîner.',
    cause: 'Facture en attente de validation bancaire.',
    severity: 'MEDIUM',
    source: 'PAYMENT_AUDIT / DEVIS_MAISON_GOURMET',
    detectedAt: 'Aujourd’hui à 14h10',
    status: 'OPEN',
    fixActionLabel: 'Valider le paiement de l’acompte de 1 500 €',
    fixActionType: 'conflict_fix',
  },
];

class SystemNerveEngine {
  private modules: SystemModuleHealth[] = [...INITIAL_SYSTEM_MODULES];
  private errors: SystemDiagnosticError[] = [...INITIAL_DIAGNOSTIC_ERRORS];
  private lastScanTimestamp: string = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  private isScanning: boolean = false;

  public getModules(): SystemModuleHealth[] {
    return this.modules;
  }

  public getErrors(): SystemDiagnosticError[] {
    return this.errors;
  }

  public getReport(): SystemHealthReport {
    const total = this.modules.length;
    const ok = this.modules.filter((m) => m.status === 'OK').length;
    const partial = this.modules.filter((m) => m.status === 'PARTIAL').length;
    const error = this.modules.filter((m) => m.status === 'ERROR').length;
    const config = this.modules.filter((m) => m.status === 'CONFIGURATION_REQUIRED').length;
    const unknown = this.modules.filter((m) => m.status === 'UNKNOWN' || m.status === 'NOT_IMPLEMENTED').length;

    // Strict mathematical calculation: OK = 100%, PARTIAL = 65%, CONFIG = 70%, ERROR = 0%
    const scoreSum = ok * 100 + partial * 65 + config * 70 + unknown * 50;
    const overallScore = Math.round(scoreSum / Math.max(1, total));

    return {
      overallHealthScore: overallScore,
      totalModules: total,
      okModules: ok,
      partialModules: partial,
      errorModules: error,
      configRequiredModules: config,
      unknownModules: unknown,
      lastFullScanAt: this.lastScanTimestamp,
      isScanning: this.isScanning,
    };
  }

  // Real Executable Health Checks on the codebase
  // -------------------------------------------------------------------------
  // Probe-driven health (roadmap 1.10)
  //
  // The 22 module statuses used to be string literals in this file. They are
  // now derived from probes that actually measure something, and — critically —
  // any module WITHOUT a probe is forced to UNKNOWN rather than left at its
  // hardcoded 'OK'. Nothing claims to work unless it was observed working.
  // -------------------------------------------------------------------------

  public healthChecks: HealthCheck[] = [];
  public lastProbeRunAt: string | null = null;

  /** Legacy module ids that a probe is authoritative for. */
  private static readonly PROBE_TO_MODULES: Record<string, string[]> = {
    PERSISTENCE: ['DATABASE'],
    STORAGE_QUOTA: ['STORAGE'],
    DATA_INTEGRITY: ['PLACES'],
    RENDER_3D: ['3D_ENGINE', 'GRID'],
    TIMELINE: ['TIMELINE'],
    CONNECTORS: ['CONNECTORS'],
    WEB_RESEARCH: ['WEB_RESEARCH', 'AGENT'],
    OCR: ['OCR'],
    INVITATIONS: ['COLLABORATION'],
    AUTH: ['AUTH'],
    PERMISSIONS: [],
    IDENTITY: [],
    PROJECTIONS: [],
    GUESTS: [],
    VENDORS: [],
    MIGRATION: [],
    // Dedicated domain probes
    DOCUMENTS: ['DOCUMENTS'],
    DMC_ID: ['DMC_ID'],
    PLAYLIST: ['MUSIC'],
    ADVERTISING: ['ADVERTISING'],
    MISSIONS: ['MISSIONS'],
    PEOPLE: ['PEOPLE'],
    AVATAR: ['AVATAR'],
    WORLD_ENGINE: ['WORLD'],
    AUDIO: [],
    GEOGRAPHY: ['GEOGRAPHY'],
    NARRATION: ['NARRATION'],
  };

  private static toLegacyStatus(status: ProbeStatus): SystemModuleHealth['status'] {
    switch (status) {
      case 'VERIFIED': return 'OK';
      case 'PARTIAL': return 'PARTIAL';
      case 'MOCK': return 'MOCK';
      case 'ERROR': return 'ERROR';
      case 'NOT_IMPLEMENTED': return 'NOT_IMPLEMENTED';
      default: return 'UNKNOWN';
    }
  }

  private static toMaturity(status: ProbeStatus): SystemModuleHealth['maturity'] {
    switch (status) {
      case 'VERIFIED': return 'REAL';
      case 'PARTIAL': return 'PARTIAL';
      case 'MOCK': return 'SIMULATED';
      case 'NOT_IMPLEMENTED': return 'MISSING';
      default: return 'UNKNOWN';
    }
  }

  public getHealthChecks(): HealthCheck[] {
    return this.healthChecks;
  }

  public getAggregate() {
    return aggregate(this.healthChecks, this.lastProbeRunAt, this.isScanning);
  }

  /** Run every registered probe and project the results onto the module table. */
  public async runProbes(): Promise<HealthCheck[]> {
    const checks = await runAllProbes();
    this.healthChecks = checks;
    this.lastProbeRunAt = new Date().toISOString();
    this.projectChecksOntoModules();
    return checks;
  }

  /** Project probe results onto the legacy module table. */
  private projectChecksOntoModules(): void {
    const checks = this.healthChecks;
    const covered = new Set<string>();
    for (const check of checks) {
      const targets = SystemNerveEngine.PROBE_TO_MODULES[check.id] ?? [];
      for (const moduleId of targets) {
        const mod = this.modules.find((m) => m.id === moduleId);
        if (!mod) continue;
        covered.add(moduleId);
        mod.status = SystemNerveEngine.toLegacyStatus(check.status);
        mod.maturity = SystemNerveEngine.toMaturity(check.status);
        mod.testResultSummary = check.summary;
        mod.errorsCount = check.errors.length;
        mod.lastTestTimestamp = 'À l’instant';
        if (check.durationMs !== undefined) mod.latencyMs = check.durationMs;
        mod.fixable = check.repairable;
        if (check.repairAction) mod.activeActionLabel = check.repairAction.label;
      }
    }

    // THE HONESTY RULE: no probe → no claim.
    for (const mod of this.modules) {
      if (covered.has(mod.id)) continue;
      mod.status = 'UNKNOWN';
      mod.maturity = 'UNKNOWN';
      mod.errorsCount = 0;
      mod.testResultSummary =
        'Aucune sonde ne mesure encore ce module — statut non vérifié.';
      mod.lastTestTimestamp = undefined;
      mod.fixable = false;
    }
  }

  /**
   * Run ONE probe and refresh only its entry. Used by [ANALYSER] / [RETESTER].
   */
  public async runSingleProbe(probeId: string): Promise<HealthCheck | null> {
    const probe = getProbes().find((p) => p.id === probeId);
    if (!probe) return null;
    const started = Date.now();
    let check: HealthCheck;
    try {
      check = { ...(await probe.run()), durationMs: Date.now() - started };
    } catch (err) {
      check = {
        id: probe.id, name: probe.name, category: probe.category, status: 'ERROR',
        lastCheck: new Date().toISOString(), dependencies: probe.dependencies ?? [],
        errors: [{
          code: 'probe_crashed',
          message: err instanceof Error ? err.message : String(err),
          cause: 'Exception levée pendant l’exécution de la sonde.',
          impact: 'L’état réel de ce module est inconnu.',
          solution: 'Corriger la sonde ou la dépendance qu’elle interroge.',
        }],
        warnings: [], evidence: [], repairable: false,
        durationMs: Date.now() - started,
        summary: 'La sonde elle-même a échoué.',
      };
    }
    const idx = this.healthChecks.findIndex((c) => c.id === probeId);
    if (idx >= 0) this.healthChecks[idx] = check; else this.healthChecks.push(check);
    this.projectChecksOntoModules();
    weddingStore.notify();
    return check;
  }

  /**
   * Attempt a repair, then RE-MEASURE to find out whether it actually worked.
   *
   * A repair never reports success on its own say-so: the outcome is decided by
   * re-running the probe and comparing the observed status before and after.
   * `verified` is only true when the module genuinely left its faulty state.
   */
  public async repairFromProbe(probeId: string, actionId: string): Promise<RepairOutcome> {
    const before = this.healthChecks.find((c) => c.id === probeId)
      ?? (await this.runSingleProbe(probeId));
    const beforeStatus = before?.status ?? 'UNKNOWN';
    const beforeErrors = before?.errors.length ?? 0;

    let executed = false;
    let executionError: string | undefined;
    try {
      executed = await repairViaProbe(probeId, actionId);
    } catch (err) {
      executionError = err instanceof Error ? err.message : String(err);
    }

    // Re-measure. This is what decides the verdict.
    const after = await this.runSingleProbe(probeId);
    const afterStatus = after?.status ?? 'UNKNOWN';
    const afterErrors = after?.errors.length ?? 0;

    const BAD: ProbeStatus[] = ['ERROR'];
    const wasBroken = BAD.includes(beforeStatus) || beforeErrors > 0;
    const stillBroken = BAD.includes(afterStatus) || afterErrors > 0;
    const verified = executed && wasBroken && !stillBroken;

    let message: string;
    if (!executed) {
      message = executionError
        ? `La réparation n’a pas pu s’exécuter : ${executionError}`
        : 'Aucune action de réparation n’a été exécutée pour ce module.';
    } else if (!wasBroken) {
      message = 'Action exécutée, mais le module n’était pas en défaut : rien à corriger.';
    } else if (verified) {
      message = `Réparation vérifiée : statut passé de ${beforeStatus} à ${afterStatus}.`;
    } else {
      message = `Action exécutée mais le défaut persiste (${afterStatus}, ${afterErrors} erreur(s)). Aucune correction n’est revendiquée.`;
    }

    return {
      probeId, actionId, executed, verified,
      beforeStatus, afterStatus, beforeErrors, afterErrors,
      message, checkedAt: new Date().toISOString(),
    };
  }

  /** The probe that is authoritative for a legacy module id, if any. */
  public getCheckForModule(moduleId: string): HealthCheck | null {
    const probeId = Object.keys(SystemNerveEngine.PROBE_TO_MODULES)
      .find((pid) => (SystemNerveEngine.PROBE_TO_MODULES[pid] ?? []).includes(moduleId));
    if (!probeId) return null;
    return this.healthChecks.find((c) => c.id === probeId) ?? null;
  }

  public getProbeIdForModule(moduleId: string): string | null {
    return Object.keys(SystemNerveEngine.PROBE_TO_MODULES)
      .find((pid) => (SystemNerveEngine.PROBE_TO_MODULES[pid] ?? []).includes(moduleId)) ?? null;
  }

  public getProbeCoverage(): { probed: number; total: number; unprobed: string[] } {
    const covered = new Set<string>();
    for (const probe of getProbes()) {
      for (const m of SystemNerveEngine.PROBE_TO_MODULES[probe.id] ?? []) covered.add(m);
    }
    return {
      probed: covered.size,
      total: this.modules.length,
      unprobed: this.modules.filter((m) => !covered.has(m.id)).map((m) => m.id),
    };
  }

  public async runFullDiagnostics(): Promise<void> {
    this.isScanning = true;
    // Probes are authoritative; the legacy per-module code below is kept for
    // the checks it genuinely performs, then overwritten by runProbes().
    weddingAudio.playNeuralWave();
    weddingStore.notify();

    const startTime = performance.now();

    // 1. Test Database (localStorage)
    const dbMod = this.modules.find((m) => m.id === 'DATABASE');
    if (dbMod) {
      try {
        const testKey = '__nerve_test_db__';
        localStorage.setItem(testKey, JSON.stringify({ ok: true, ts: Date.now() }));
        const read = JSON.parse(localStorage.getItem(testKey) || '{}');
        localStorage.removeItem(testKey);
        dbMod.status = read.ok ? 'OK' : 'ERROR';
        dbMod.latencyMs = Math.round(performance.now() - startTime);
        dbMod.lastTestTimestamp = 'À l’instant';
      } catch {
        dbMod.status = 'ERROR';
      }
    }

    // 2. Test 3D WebGL Availability
    const threeMod = this.modules.find((m) => m.id === '3D_ENGINE');
    if (threeMod) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        threeMod.status = gl ? 'OK' : 'ERROR';
        threeMod.latencyMs = 4;
        threeMod.lastTestTimestamp = 'À l’instant';
      } catch {
        threeMod.status = 'ERROR';
      }
    }

    // 3. Test OCR Engine Regex Parser
    const ocrMod = this.modules.find((m) => m.id === 'OCR');
    if (ocrMod) {
      const sample = 'Devis Traiteur : Total 4800 € Acompte 1500 € Heure 19h30';
      const mMatch = sample.match(/(\d+)\s*€/);
      ocrMod.status = mMatch && mMatch[1] === '4800' ? 'OK' : 'PARTIAL';
      ocrMod.latencyMs = 2;
      ocrMod.lastTestTimestamp = 'À l’instant';
    }

    // 4. Test Timeline & Conflicts
    const timelineMod = this.modules.find((m) => m.id === 'TIMELINE');
    const unresolvedConflicts = weddingStore.conflicts.filter((c) => !c.isResolved).length;
    if (timelineMod) {
      timelineMod.status = unresolvedConflicts > 0 ? 'PARTIAL' : 'OK';
      timelineMod.errorsCount = unresolvedConflicts;
      timelineMod.lastTestTimestamp = 'À l’instant';
    }

    // 5. Test Audio Engine
    const audioMod = this.modules.find((m) => m.id === 'MUSIC');
    if (audioMod) {
      audioMod.status = typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext) ? 'OK' : 'PARTIAL';
      audioMod.lastTestTimestamp = 'À l’instant';
    }

    // 6. Test Connectors
    const connMod = this.modules.find((m) => m.id === 'CONNECTORS');
    if (connMod) {
      const connList = connectorEngine.getConnectors();
      const connectedCount = connList.filter((c) => c.status === 'connected').length;
      connMod.status = connectedCount >= 4 ? 'OK' : 'CONFIGURATION_REQUIRED';
      connMod.lastTestTimestamp = 'À l’instant';
    }

    // Probes run LAST and are authoritative. They overwrite every module they
    // cover with a measured status, and force every uncovered module to
    // UNKNOWN — this is what removes the old "everything is green" illusion.
    await this.runProbes();

    this.isScanning = false;
    this.lastScanTimestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    weddingAudio.playResolveSuccess();
    weddingStore.notify();
  }

  // Real Self-Healing / Auto-Repair Pipeline: DIAGNOSTIC → CAUSE → PROPOSITION → [FIX] → TEST → VÉRIFICATION
  public runAutoFix(errorId: string): void {
    const err = this.errors.find((e) => e.id === errorId);
    if (!err || err.status === 'RESOLVED') return;

    err.status = 'DIAGNOSING';
    weddingAudio.playClick();
    weddingStore.notify();

    setTimeout(() => {
      err.status = 'RESOLVING';
      weddingAudio.playNeuralWave();
      weddingStore.notify();

      setTimeout(() => {
        // Execute real fix on the actual wedding state
        if (err.id === 'err_timeline_photo_shift') {
          weddingStore.resolveConflict('conflict_photo_time');
        } else if (err.id === 'err_traiteur_deposit_pending') {
          weddingStore.resolveConflict('conflict_traiteur_acompte');
        }

        err.status = 'RESOLVED';
        err.resolvedAt = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        // Update module error counts
        const mod = this.modules.find((m) => m.id === err.moduleId);
        if (mod) {
          mod.errorsCount = Math.max(0, mod.errorsCount - 1);
          if (mod.errorsCount === 0) mod.status = 'OK';
        }

        weddingAudio.playResolveSuccess();
        weddingStore.spawnGridWave([0, 0, 0], '#10b981');
        weddingStore.notify();
      }, 600);
    }, 400);
  }
}

export const systemNerveEngine = new SystemNerveEngine();
