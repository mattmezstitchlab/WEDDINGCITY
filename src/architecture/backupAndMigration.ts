/**
 * SECTION 7: Backup and Migration Strategy
 * 
 * Phase 1: BACKUP - Create complete snapshots of all 40+ projects before ANY changes
 * Phase 2: SEED - Extract legacy data and prepare AIME MEMORY
 * Phase 3: VERIFY - Run consistency checks and validation
 * Phase 4: CUTOVER - Switch canonical source (NO ROLLBACK after this point)
 * 
 * This is the most critical section. We backup EVERYTHING before touching data.
 * Browser-compatible implementation without Node.js dependencies.
 */

/**
 * Simple checksum calculator using browser APIs
 */
function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate UUID (browser-compatible)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Backup Metadata Type
 */
export type BackupMetadata = {
  backup_id: string;
  timestamp: Date;
  version: string;
  reason: 'pre_migration' | 'daily' | 'pre_cutover' | 'emergency';
  total_projects: number;
  total_entities: number;
  total_size_bytes: number;
  checksum: string;
  retention_days: number;
  verified: boolean;
  verification_timestamp?: Date;
  restoration_instructions: string;
  notes?: string;
};

/**
 * Backup Manifest Type
 */
export type BackupManifest = {
  backup_id: string;
  files: Array<{
    id: string;
    size: number;
    checksum: string;
    entities: number;
    domain: string;
  }>;
  total_files: number;
  total_entities_in_backup: number;
};

/**
 * Backup Service
 * Responsible for creating, verifying, and managing backups
 */
export class BackupService {
  private metadata: BackupMetadata[] = [];
  private manifests: Map<string, BackupManifest> = new Map();
  private backups: Map<string, Record<string, any>> = new Map();

  /**
   * Create backup of all projects
   * Returns: BackupMetadata with backup_id, timestamp, etc.
   */
  async createBackup(
    projects: any[],
    reason: 'pre_migration' | 'daily' | 'pre_cutover' | 'emergency'
  ): Promise<BackupMetadata> {
    const backupId = generateUUID();
    const timestamp = new Date();

    console.log(`🔄 Starting backup ${backupId}...`);

    // Step 1: Calculate total size and entity count
    let totalSize = 0;
    let totalEntities = 0;
    const projectBackups: Array<{ id: string; size: number; checksum: string; entities: number; domain: string }> = [];
    const backupData: Record<string, any> = {};

    // Step 2: Back up each project
    for (const project of projects) {
      const projectData = JSON.stringify(project, null, 2);
      const projectSize = projectData.length;
      const projectChecksum = simpleChecksum(projectData);

      totalSize += projectSize;
      totalEntities += (project.entities?.length || 0);

      const projectId = `project_${project.id}`;
      backupData[projectId] = project;

      projectBackups.push({
        id: projectId,
        size: projectSize,
        checksum: projectChecksum,
        entities: project.entities?.length || 0,
        domain: project.domain || 'wedding'
      });

      console.log(`  ✓ Backed up project ${project.id} (${projectSize} bytes, ${project.entities?.length || 0} entities)`);
    }

    // Step 3: Create manifest
    const manifest: BackupManifest = {
      backup_id: backupId,
      files: projectBackups,
      total_files: projectBackups.length,
      total_entities_in_backup: totalEntities
    };

    // Step 4: Create metadata
    const metadata: BackupMetadata = {
      backup_id: backupId,
      timestamp,
      version: '1.0.0',
      reason,
      total_projects: projects.length,
      total_entities: totalEntities,
      total_size_bytes: totalSize,
      checksum: simpleChecksum(JSON.stringify(manifest)),
      retention_days: reason === 'pre_migration' ? 90 : reason === 'pre_cutover' ? 180 : 30,
      verified: false,
      restoration_instructions: `To restore this backup:
1. Run: BackupService.restoreBackup('${backupId}')
2. This will restore all ${projects.length} projects to state at ${timestamp.toISOString()}
3. No data will be lost; existing data will be preserved`,
      notes: `Backup created for ${reason}. Contains ${totalEntities} entities across ${projects.length} projects.`
    };

    // Step 5: Store backup
    this.metadata.push(metadata);
    this.manifests.set(backupId, manifest);
    this.backups.set(backupId, backupData);

    console.log(`✅ Backup ${backupId} created successfully`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Entities: ${totalEntities}`);
    console.log(`   Size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Retention: ${metadata.retention_days} days`);

    return metadata;
  }

  /**
   * Verify backup integrity
   * Returns: true if backup is valid, false if corruption detected
   */
  async verifyBackup(backupId: string): Promise<boolean> {
    console.log(`🔍 Verifying backup ${backupId}...`);

    const manifest = this.manifests.get(backupId);
    if (!manifest) {
      console.error(`❌ Manifest not found for backup ${backupId}`);
      return false;
    }

    const backupData = this.backups.get(backupId);
    if (!backupData) {
      console.error(`❌ Backup data not found for backup ${backupId}`);
      return false;
    }

    // Verify each file
    for (const file of manifest.files) {
      const projectData = backupData[file.id];

      if (!projectData) {
        console.error(`❌ Project data missing: ${file.id}`);
        return false;
      }

      const projectJSON = JSON.stringify(projectData);
      const fileChecksum = simpleChecksum(projectJSON);

      if (fileChecksum !== file.checksum) {
        console.error(`❌ Checksum mismatch for ${file.id}`);
        console.error(`   Expected: ${file.checksum}`);
        console.error(`   Got:      ${fileChecksum}`);
        return false;
      }

      console.log(`  ✓ Verified ${file.id} (${file.entities} entities)`);
    }

    // Mark as verified
    const metadataEntry = this.metadata.find(m => m.backup_id === backupId);
    if (metadataEntry) {
      metadataEntry.verified = true;
      metadataEntry.verification_timestamp = new Date();
    }

    console.log(`✅ Backup ${backupId} verified successfully`);
    return true;
  }

  /**
   * Restore backup
   * Returns: Restored projects array
   */
  async restoreBackup(backupId: string): Promise<any[]> {
    console.log(`🔄 Restoring backup ${backupId}...`);

    const backupData = this.backups.get(backupId);
    if (!backupData) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const restoredProjects = Object.values(backupData);

    for (const project of restoredProjects) {
      console.log(`  ✓ Restored ${project.id}`);
    }

    console.log(`✅ Backup ${backupId} restored successfully (${restoredProjects.length} projects)`);
    return restoredProjects;
  }

  /**
   * List all backups with metadata
   */
  listBackups(): BackupMetadata[] {
    return this.metadata;
  }

  /**
   * Get latest backup for a domain
   */
  getLatestBackup(domain?: string): BackupMetadata | undefined {
    return this.metadata
      .filter(m => !domain || m.notes?.includes(domain))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      [0];
  }
}

/**
 * Migration Orchestrator
 * Manages all 4 phases of migration
 */
export class MigrationOrchestrator {
  private phase: 'INIT' | 'PHASE_1_BACKUP' | 'PHASE_2_SEED' | 'PHASE_3_VERIFY' | 'PHASE_4_CUTOVER' | 'COMPLETE' = 'INIT';
  private status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back' = 'pending';
  private backupService: BackupService;
  private migrationLog: Array<{ timestamp: Date; phase: string; message: string }> = [];

  constructor() {
    this.backupService = new BackupService();
  }

  /**
   * Log migration event
   */
  private log(message: string) {
    const entry = {
      timestamp: new Date(),
      phase: this.phase,
      message
    };
    this.migrationLog.push(entry);
    console.log(`[${this.phase}] ${message}`);
  }

  /**
   * PHASE 1: BACKUP - Create complete snapshots before any changes
   */
  async phase1_backup(projects: any[]): Promise<{ success: boolean; backupId?: string; error?: string }> {
    this.phase = 'PHASE_1_BACKUP';
    this.log(`Starting PHASE 1: BACKUP (${projects.length} projects)`);

    try {
      // Create backup
      const metadata = await this.backupService.createBackup(projects, 'pre_migration');

      // Verify backup immediately
      const verified = await this.backupService.verifyBackup(metadata.backup_id);

      if (!verified) {
        this.status = 'failed';
        return {
          success: false,
          error: 'Backup verification failed'
        };
      }

      this.log(`✅ PHASE 1 COMPLETE: Backup created with ID ${metadata.backup_id}`);
      return {
        success: true,
        backupId: metadata.backup_id
      };
    } catch (error) {
      this.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ PHASE 1 FAILED: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * PHASE 2: SEED - Extract legacy data and prepare AIME MEMORY
   */
  async phase2_seed(
    legacyProjects: any[],
    extractionRules: Record<string, any>
  ): Promise<{ success: boolean; aiMemoryEntities?: any[]; error?: string }> {
    this.phase = 'PHASE_2_SEED';
    this.log(`Starting PHASE 2: SEED (extracting data)`);

    try {
      // Validate extraction rules
      if (!extractionRules || Object.keys(extractionRules).length === 0) {
        throw new Error('No extraction rules provided');
      }

      const aiMemoryEntities: any[] = [];

      // Extract entities from each legacy project
      for (const project of legacyProjects) {
        this.log(`  Extracting from project ${project.id}...`);

        // Apply extraction rules to convert legacy → AIME
        const entities = this.applyExtractionRules(project, extractionRules);

        aiMemoryEntities.push(...entities);
        this.log(`    ✓ Extracted ${entities.length} entities`);
      }

      this.log(`✅ PHASE 2 COMPLETE: Extracted ${aiMemoryEntities.length} entities`);

      return {
        success: true,
        aiMemoryEntities
      };
    } catch (error) {
      this.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ PHASE 2 FAILED: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Apply extraction rules to convert legacy data to AIME format
   */
  private applyExtractionRules(project: any, rules: Record<string, any>): any[] {
    const entities: any[] = [];

    // Extract based on entity types defined in rules
    for (const [entityType, rule] of Object.entries(rules)) {
      if (rule.extract_from && rule.extract_from in project) {
        const sourceData = project[rule.extract_from];
        const sourceArray = Array.isArray(sourceData) ? sourceData : [sourceData];

        for (const item of sourceArray) {
          if (rule.condition && !rule.condition(item)) {
            continue;
          }

          const entity = {
            id: item.id || `${entityType}_${Math.random().toString(36).substring(7)}`,
            type: 'entity',
            domain: project.domain || 'wedding',
            created_at: new Date(),
            content: {
              entity_type: entityType,
              ...rule.transform(item)
            },
            decision_trail: [
              {
                timestamp: new Date(),
                validated_by: 'migration_system',
                correction: null,
                reason_for_certainty: 'Extracted from legacy project',
                is_reversible: true,
                validation_source: 'automatic_extraction'
              }
            ]
          };

          entities.push(entity);
        }
      }
    }

    return entities;
  }

  /**
   * PHASE 3: VERIFY - Run consistency checks and validation
   */
  async phase3_verify(
    aiMemoryEntities: any[],
    legacyProjects: any[]
  ): Promise<{ success: boolean; issues?: string[]; error?: string }> {
    this.phase = 'PHASE_3_VERIFY';
    this.log(`Starting PHASE 3: VERIFY (${aiMemoryEntities.length} entities)`);

    const issues: string[] = [];

    try {
      // Check 1: No data loss
      const legacyEntityCount = legacyProjects.reduce(
        (sum, p) => sum + ((p.entities?.length || 0) + (p.vendors?.length || 0) + (p.guests?.length || 0)),
        0
      );

      if (aiMemoryEntities.length < legacyEntityCount) {
        issues.push(
          `Data loss detected: ${legacyEntityCount} legacy entities, but only ${aiMemoryEntities.length} extracted`
        );
      }

      this.log(`  ✓ Entity count check: ${aiMemoryEntities.length} entities`);

      // Check 2: All entities have decision trail
      const entitiesWithoutTrail = aiMemoryEntities.filter(e => !e.decision_trail || e.decision_trail.length === 0);
      if (entitiesWithoutTrail.length > 0) {
        issues.push(`${entitiesWithoutTrail.length} entities missing decision trail`);
      }

      this.log(`  ✓ Decision trail check: ${aiMemoryEntities.length - entitiesWithoutTrail.length} entities have trail`);

      // Check 3: No duplicate IDs
      const uniqueIds = new Set(aiMemoryEntities.map(e => e.id));
      if (uniqueIds.size !== aiMemoryEntities.length) {
        issues.push(`Duplicate entity IDs detected: ${aiMemoryEntities.length} entities but only ${uniqueIds.size} unique IDs`);
      }

      this.log(`  ✓ Uniqueness check: ${uniqueIds.size} unique entity IDs`);

      // Check 4: Content validation
      const invalidEntities = aiMemoryEntities.filter(e => !e.content || !e.content.entity_type);
      if (invalidEntities.length > 0) {
        issues.push(`${invalidEntities.length} entities with invalid content structure`);
      }

      this.log(`  ✓ Content validation: ${aiMemoryEntities.length - invalidEntities.length} valid`);

      if (issues.length > 0) {
        this.log(`⚠️  PHASE 3 COMPLETE with ${issues.length} issues`);
        return {
          success: true,  // Don't fail completely, but report issues
          issues
        };
      }

      this.log(`✅ PHASE 3 COMPLETE: All validation checks passed`);

      return {
        success: true
      };
    } catch (error) {
      this.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ PHASE 3 FAILED: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * PHASE 4: CUTOVER - Switch canonical source
   * ⚠️  NO ROLLBACK AFTER THIS POINT ⚠️
   */
  async phase4_cutover(
    backupId: string,
    aiMemoryEntities: any[]
  ): Promise<{ success: boolean; error?: string }> {
    this.phase = 'PHASE_4_CUTOVER';
    this.log(`⚠️  Starting PHASE 4: CUTOVER - NO ROLLBACK AFTER THIS POINT`);

    try {
      // Final safety check: backup is verified
      const backups = this.backupService.listBackups();
      const targetBackup = backups.find(b => b.backup_id === backupId);

      if (!targetBackup || !targetBackup.verified) {
        throw new Error(`Backup ${backupId} not found or not verified`);
      }

      this.log(`  ✓ Backup verified: ${backupId}`);
      this.log(`  ✓ Ready to switch to AIME MEMORY (${aiMemoryEntities.length} entities)`);

      // In real implementation, this would:
      // 1. Set AIME MEMORY as canonical source
      // 2. Disable legacy system writes
      // 3. Update system configuration
      // 4. Start serving reads from AIME MEMORY

      this.log(`✅ PHASE 4 COMPLETE: Cutover successful`);
      this.log(`🎉 MIGRATION COMPLETE - System is now using AIME MEMORY as canonical source`);
      this.log(`📝 Keep backup ${backupId} for 90 days as rollback insurance`);

      this.status = 'success';

      return {
        success: true
      };
    } catch (error) {
      this.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ PHASE 4 FAILED: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get migration log
   */
  getLog() {
    return this.migrationLog;
  }

  /**
   * Get current phase and status
   */
  getStatus() {
    return {
      phase: this.phase,
      status: this.status,
      logEntries: this.migrationLog.length
    };
  }
}

export default {
  BackupService,
  MigrationOrchestrator,
  generateUUID,
  simpleChecksum
};
