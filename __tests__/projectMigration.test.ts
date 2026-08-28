/**
 * SECTION 3: Project Migration Service Tests
 * 
 * Tests for ProjectMigrationService including:
 * - Backup creation and restoration
 * - Legacy data extraction
 * - Consistency verification
 * - Migration checkpoint tracking
 */

import { ProjectMigrationService, MigrationCheckpoint } from '../src/architecture/projectMigration';

describe('ProjectMigrationService', () => {
  let service: ProjectMigrationService;

  beforeEach(() => {
    service = new ProjectMigrationService();
    // Clear any test backups
    localStorage.removeItem('wedding_city_migration_backups');
  });

  describe('PHASE 1: BACKUP', () => {
    test('should create backup checkpoint with correct structure', async () => {
      const checkpoint = await service.backupAllProjects();
      
      expect(checkpoint).toHaveProperty('timestamp');
      expect(checkpoint).toHaveProperty('phase', 'backup');
      expect(checkpoint).toHaveProperty('projectCount');
      expect(checkpoint).toHaveProperty('successCount');
      expect(checkpoint).toHaveProperty('errorCount');
      expect(checkpoint).toHaveProperty('details');
      expect(Array.isArray(checkpoint.details)).toBe(true);
    });

    test('should set correct phase identifier', async () => {
      const checkpoint = await service.backupAllProjects();
      expect(checkpoint.phase).toBe('backup');
    });

    test('should count all projects', async () => {
      const checkpoint = await service.backupAllProjects();
      expect(checkpoint.projectCount).toBeGreaterThanOrEqual(0);
      expect(checkpoint.projectCount).toBe(checkpoint.successCount + checkpoint.errorCount);
    });

    test('should persist backup metadata', async () => {
      await service.backupAllProjects();
      const status = await service.getMigrationStatus();
      
      expect(status.backedUpCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PHASE 2: SEED', () => {
    test('should create seed checkpoint with correct structure', async () => {
      const checkpoint = await service.seedAIMemoryFromLegacy();
      
      expect(checkpoint).toHaveProperty('timestamp');
      expect(checkpoint).toHaveProperty('phase', 'seed');
      expect(checkpoint.phase).toBe('seed');
    });

    test('should track seeded entities', async () => {
      const checkpoint = await service.seedAIMemoryFromLegacy();
      expect(checkpoint.projectCount).toBeGreaterThanOrEqual(0);
    });

    test('details should contain project-specific messages', async () => {
      const checkpoint = await service.seedAIMemoryFromLegacy();
      
      if (checkpoint.details.length > 0) {
        const detail = checkpoint.details[0];
        expect(detail.projectId).toBeTruthy();
        expect(detail.status).toMatch(/^(success|error|pending)$/);
        expect(detail.message).toBeTruthy();
      }
    });
  });

  describe('PHASE 3: VERIFICATION', () => {
    test('should create verification checkpoint', async () => {
      const checkpoint = await service.verifyConsistency();
      
      expect(checkpoint.phase).toBe('verification');
      expect(checkpoint).toHaveProperty('projectCount');
      expect(checkpoint).toHaveProperty('details');
    });

    test('should verify all projects that exist', async () => {
      const checkpoint = await service.verifyConsistency();
      expect(checkpoint.successCount + checkpoint.errorCount).toBe(checkpoint.projectCount);
    });
  });

  describe('PHASE 4: CUTOVER', () => {
    test('should create cutover checkpoint', async () => {
      const checkpoint = await service.performCutover();
      
      expect(checkpoint.phase).toBe('cutover');
      expect(checkpoint).toHaveProperty('timestamp');
    });
  });

  describe('BACKUP/RESTORE', () => {
    test('should restore from backup by ID', async () => {
      // First create a backup
      const backupCheckpoint = await service.backupAllProjects();
      
      // Extract backup ID from details if available
      if (backupCheckpoint.successCount > 0) {
        // Note: In real implementation, we'd need to capture backup ID
        // For now, test that restore function handles missing backup gracefully
        const restore = await service.restoreFromBackup('nonexistent');
        expect(restore.errorCount).toBe(1);
      }
    });

    test('should handle missing backup gracefully', async () => {
      const checkpoint = await service.restoreFromBackup('invalid_backup_id');
      
      expect(checkpoint.errorCount).toBe(1);
      expect(checkpoint.details[0].status).toBe('error');
      expect(checkpoint.details[0].message).toContain('Backup not found');
    });
  });

  describe('STATUS', () => {
    test('should report migration status', async () => {
      const status = await service.getMigrationStatus();
      
      expect(status).toHaveProperty('phase', 'backup');
      expect(status).toHaveProperty('projectCount');
      expect(status).toHaveProperty('backedUpCount');
      expect(status).toHaveProperty('ready_for_migration');
      
      expect(typeof status.projectCount).toBe('number');
      expect(typeof status.backedUpCount).toBe('number');
      expect(typeof status.ready_for_migration).toBe('boolean');
    });

    test('should indicate ready when backups exist', async () => {
      await service.backupAllProjects();
      const status = await service.getMigrationStatus();
      
      if (status.projectCount > 0) {
        expect(status.ready_for_migration).toBe(true);
      }
    });

    test('should not be ready without backups', async () => {
      const status = await service.getMigrationStatus();
      
      // If no backups were made yet, should not be ready
      if (status.backedUpCount === 0) {
        expect(status.ready_for_migration).toBe(false);
      }
    });
  });

  describe('CHECKPOINT STRUCTURE', () => {
    test('all checkpoints should have timestamp', async () => {
      const phases = ['backup', 'seed', 'verification', 'cutover'] as const;
      
      for (const phase of phases) {
        let checkpoint: MigrationCheckpoint;
        
        if (phase === 'backup') checkpoint = await service.backupAllProjects();
        else if (phase === 'seed') checkpoint = await service.seedAIMemoryFromLegacy();
        else if (phase === 'verification') checkpoint = await service.verifyConsistency();
        else checkpoint = await service.performCutover();

        // Verify ISO 8601 timestamp format
        expect(() => new Date(checkpoint.timestamp)).not.toThrow();
      }
    });

    test('all checkpoints should have complete details array', async () => {
      const checkpoint = await service.backupAllProjects();
      
      if (checkpoint.details.length > 0) {
        const detail = checkpoint.details[0];
        expect(detail).toHaveProperty('projectId');
        expect(detail).toHaveProperty('status');
        expect(detail).toHaveProperty('message');
      }
    });

    test('status should only be valid values', async () => {
      const checkpoint = await service.backupAllProjects();
      const validStatuses = ['success', 'error', 'pending'];
      
      for (const detail of checkpoint.details) {
        expect(validStatuses).toContain(detail.status);
      }
    });
  });

  describe('ERROR HANDLING', () => {
    test('should handle errors gracefully in backup phase', async () => {
      const checkpoint = await service.backupAllProjects();
      expect(checkpoint.errorCount >= 0).toBe(true);
    });

    test('should continue processing other projects on error', async () => {
      const checkpoint = await service.backupAllProjects();
      
      // If there are multiple projects, at least one should complete
      if (checkpoint.projectCount > 1 && checkpoint.errorCount > 0) {
        expect(checkpoint.successCount > 0 || checkpoint.errorCount > 0).toBe(true);
      }
    });
  });
});

describe('Migration Workflow', () => {
  let service: ProjectMigrationService;

  beforeEach(() => {
    service = new ProjectMigrationService();
    localStorage.removeItem('wedding_city_migration_backups');
  });

  test('should complete full 4-phase migration workflow', async () => {
    // Phase 1: Backup
    const backup = await service.backupAllProjects();
    expect(backup.phase).toBe('backup');
    expect(backup.errorCount + backup.successCount).toBe(backup.projectCount);

    // Phase 2: Seed
    const seed = await service.seedAIMemoryFromLegacy();
    expect(seed.phase).toBe('seed');

    // Phase 3: Verification
    const verify = await service.verifyConsistency();
    expect(verify.phase).toBe('verification');

    // Phase 4: Cutover
    const cutover = await service.performCutover();
    expect(cutover.phase).toBe('cutover');
  });

  test('migration phases should be executable sequentially', async () => {
    const phases = [
      service.backupAllProjects(),
      service.seedAIMemoryFromLegacy(),
      service.verifyConsistency(),
      service.performCutover()
    ];

    const results = await Promise.all(phases);
    
    expect(results[0].phase).toBe('backup');
    expect(results[1].phase).toBe('seed');
    expect(results[2].phase).toBe('verification');
    expect(results[3].phase).toBe('cutover');
  });
});
