/**
 * SECTION 7: Backup and Migration Tests
 * 
 * Tests for all 4 phases of migration:
 * Phase 1: BACKUP - Create and verify snapshots
 * Phase 2: SEED - Extract and transform legacy data
 * Phase 3: VERIFY - Consistency and validation checks
 * Phase 4: CUTOVER - Switch canonical source
 */

import { BackupService, MigrationOrchestrator } from '../src/architecture/backupAndMigration';

describe('SECTION 7: Backup and Migration Strategy', () => {
  let backupService: BackupService;

  beforeEach(() => {
    backupService = new BackupService();
  });

  afterEach(() => {
    // Cleanup happens automatically with new BackupService instances
  });

  describe('PHASE 1: BACKUP', () => {
    test('should create backup of single project', async () => {
      const testProject = {
        id: 'wedding_1',
        name: 'Test Wedding',
        domain: 'wedding',
        entities: [
          { id: 'vendor_1', name: 'DJ' },
          { id: 'vendor_2', name: 'Photographer' }
        ]
      };

      const metadata = await backupService.createBackup([testProject], 'pre_migration');

      expect(metadata).toBeDefined();
      expect(metadata.backup_id).toBeDefined();
      expect(metadata.timestamp).toBeInstanceOf(Date);
      expect(metadata.reason).toBe('pre_migration');
      expect(metadata.total_projects).toBe(1);
      expect(metadata.total_entities).toBe(2);
      expect(metadata.verified).toBe(false);
      expect(metadata.retention_days).toBe(90);
    });

    test('should create backup of multiple projects', async () => {
      const projects = [
        {
          id: 'wedding_1',
          name: 'Wedding 1',
          domain: 'wedding',
          entities: [
            { id: 'vendor_1', name: 'DJ' },
            { id: 'vendor_2', name: 'Photographer' }
          ]
        },
        {
          id: 'wedding_2',
          name: 'Wedding 2',
          domain: 'wedding',
          entities: [
            { id: 'vendor_3', name: 'Caterer' }
          ]
        }
      ];

      const metadata = await backupService.createBackup(projects, 'pre_migration');

      expect(metadata.total_projects).toBe(2);
      expect(metadata.total_entities).toBe(3);
    });

    test('should create backup with correct file structure', async () => {
      const testProject = {
        id: 'wedding_1',
        name: 'Test Wedding',
        domain: 'wedding',
        entities: []
      };

      const metadata = await backupService.createBackup([testProject], 'pre_migration');

      const backupPath = path.join(tempDir, metadata.backup_id);
      expect(fs.existsSync(backupPath)).toBe(true);

      const files = fs.readdirSync(backupPath);
      expect(files).toContain('METADATA.json');
      expect(files).toContain('MANIFEST.json');
      expect(files).toContain('project_wedding_1.json');
    });

    test('should create backup with different retention based on reason', async () => {
      const testProject = { id: 'test', name: 'Test', domain: 'wedding', entities: [] };

      const backups = await Promise.all([
        backupService.createBackup([testProject], 'pre_migration'),
        backupService.createBackup([testProject], 'daily'),
        backupService.createBackup([testProject], 'pre_cutover')
      ]);

      expect(backups[0].retention_days).toBe(90);  // pre_migration
      expect(backups[1].retention_days).toBe(30);  // daily
      expect(backups[2].retention_days).toBe(180); // pre_cutover
    });

    test('should calculate correct checksum', async () => {
      const testProject = {
        id: 'wedding_1',
        name: 'Test',
        domain: 'wedding',
        entities: []
      };

      const metadata = await backupService.createBackup([testProject], 'pre_migration');

      expect(metadata.checksum_sha256).toBeDefined();
      expect(metadata.checksum_sha256).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });
  });

  describe('PHASE 1: BACKUP - Verification', () => {
    test('should verify valid backup', async () => {
      const testProject = {
        id: 'wedding_1',
        name: 'Test Wedding',
        domain: 'wedding',
        entities: [{ id: 'vendor_1', name: 'DJ' }]
      };

      const metadata = await backupService.createBackup([testProject], 'pre_migration');

      const verified = await backupService.verifyBackup(metadata.backup_id);

      expect(verified).toBe(true);
    });

    test('should detect missing files in backup', async () => {
      const testProject = {
        id: 'wedding_1',
        name: 'Test Wedding',
        domain: 'wedding',
        entities: []
      };

      const metadata = await backupService.createBackup([testProject], 'pre_migration');

      // Simulate file corruption: delete a project file
      const backupPath = path.join(tempDir, metadata.backup_id);
      const projectFile = path.join(backupPath, 'project_wedding_1.json');
      fs.unlinkSync(projectFile);

      const verified = await backupService.verifyBackup(metadata.backup_id);

      expect(verified).toBe(false);
    });

    test('should detect corrupted files in backup', async () => {
      const testProject = {
        id: 'wedding_1',
        name: 'Test Wedding',
        domain: 'wedding',
        entities: []
      };

      const metadata = await backupService.createBackup([testProject], 'pre_migration');

      // Simulate corruption: modify file contents
      const backupPath = path.join(tempDir, metadata.backup_id);
      const projectFile = path.join(backupPath, 'project_wedding_1.json');
      fs.writeFileSync(projectFile, '{"corrupted": true}');

      const verified = await backupService.verifyBackup(metadata.backup_id);

      expect(verified).toBe(false);
    });

    test('should mark backup as verified after verification', async () => {
      const testProject = { id: 'wedding_1', name: 'Test', domain: 'wedding', entities: [] };
      const metadata = await backupService.createBackup([testProject], 'pre_migration');

      expect(metadata.verified).toBe(false);
      expect(metadata.verification_timestamp).toBeUndefined();

      await backupService.verifyBackup(metadata.backup_id);

      const backups = backupService.listBackups();
      const verifiedBackup = backups.find(b => b.backup_id === metadata.backup_id);

      expect(verifiedBackup?.verified).toBe(true);
      expect(verifiedBackup?.verification_timestamp).toBeDefined();
    });
  });

  describe('PHASE 1: BACKUP - Restoration', () => {
    test('should restore backup to original state', async () => {
      const originalProjects = [
        {
          id: 'wedding_1',
          name: 'Wedding 1',
          domain: 'wedding',
          entities: [
            { id: 'vendor_1', name: 'DJ' },
            { id: 'vendor_2', name: 'Photographer' }
          ]
        }
      ];

      const metadata = await backupService.createBackup(originalProjects, 'pre_migration');

      const restoredProjects = await backupService.restoreBackup(metadata.backup_id);

      expect(restoredProjects).toHaveLength(1);
      expect(restoredProjects[0].id).toBe('wedding_1');
      expect(restoredProjects[0].entities).toHaveLength(2);
    });

    test('should restore multiple projects', async () => {
      const originalProjects = [
        { id: 'wedding_1', name: 'Wedding 1', domain: 'wedding', entities: [] },
        { id: 'wedding_2', name: 'Wedding 2', domain: 'wedding', entities: [] },
        { id: 'wedding_3', name: 'Wedding 3', domain: 'wedding', entities: [] }
      ];

      const metadata = await backupService.createBackup(originalProjects, 'pre_migration');

      const restoredProjects = await backupService.restoreBackup(metadata.backup_id);

      expect(restoredProjects).toHaveLength(3);
      expect(restoredProjects.map(p => p.id)).toEqual(['wedding_1', 'wedding_2', 'wedding_3']);
    });
  });

  describe('PHASE 2: SEED - Data Extraction', () => {
    test('should extract vendors from legacy project', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProject = {
        id: 'wedding_1',
        name: 'Test Wedding',
        domain: 'wedding',
        vendors: [
          { id: 'vendor_1', name: 'DJ Martin', cost: 1000 },
          { id: 'vendor_2', name: 'Photographer', cost: 1500 }
        ]
      };

      const extractionRules = {
        vendor: {
          extract_from: 'vendors',
          transform: (item: any) => ({
            name: item.name,
            cost: item.cost,
            currency: 'EUR'
          })
        }
      };

      const result = await migrator.phase2_seed([legacyProject], extractionRules);

      expect(result.success).toBe(true);
      expect(result.aiMemoryEntities).toHaveLength(2);
      expect(result.aiMemoryEntities![0].content.entity_type).toBe('vendor');
      expect(result.aiMemoryEntities![0].content.name).toBe('DJ Martin');
    });

    test('should apply transformation rules correctly', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProject = {
        id: 'wedding_1',
        domain: 'wedding',
        guests: [
          { id: 'g1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
        ]
      };

      const extractionRules = {
        guest: {
          extract_from: 'guests',
          transform: (item: any) => ({
            full_name: `${item.firstName} ${item.lastName}`,
            email: item.email,
            status: 'pending'
          })
        }
      };

      const result = await migrator.phase2_seed([legacyProject], extractionRules);

      expect(result.success).toBe(true);
      expect(result.aiMemoryEntities![0].content.full_name).toBe('John Doe');
      expect(result.aiMemoryEntities![0].content.status).toBe('pending');
    });

    test('should add decision trail to extracted entities', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProject = {
        id: 'wedding_1',
        domain: 'wedding',
        vendors: [{ id: 'v1', name: 'DJ' }]
      };

      const extractionRules = {
        vendor: {
          extract_from: 'vendors',
          transform: (item: any) => ({ name: item.name })
        }
      };

      const result = await migrator.phase2_seed([legacyProject], extractionRules);

      const entity = result.aiMemoryEntities![0];

      expect(entity.decision_trail).toBeDefined();
      expect(entity.decision_trail.length).toBeGreaterThan(0);
      expect(entity.decision_trail[0].validated_by).toBe('migration_system');
      expect(entity.decision_trail[0].validation_source).toBe('automatic_extraction');
    });
  });

  describe('PHASE 3: VERIFY - Consistency Checks', () => {
    test('should detect no data loss', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProjects = [
        {
          id: 'wedding_1',
          domain: 'wedding',
          entities: [{ id: 'e1' }, { id: 'e2' }],
          vendors: [{ id: 'v1' }],
          guests: []
        }
      ];

      const aiMemoryEntities = [
        { id: 'e1', content: { entity_type: 'entity' }, decision_trail: [{}] },
        { id: 'e2', content: { entity_type: 'entity' }, decision_trail: [{}] },
        { id: 'v1', content: { entity_type: 'vendor' }, decision_trail: [{}] }
      ];

      const result = await migrator.phase3_verify(aiMemoryEntities, legacyProjects);

      expect(result.success).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test('should detect data loss', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProjects = [
        {
          id: 'wedding_1',
          domain: 'wedding',
          entities: [
            { id: 'e1' },
            { id: 'e2' },
            { id: 'e3' }  // This one is missing
          ],
          vendors: [],
          guests: []
        }
      ];

      const aiMemoryEntities = [
        { id: 'e1', content: { entity_type: 'entity' }, decision_trail: [{}] },
        { id: 'e2', content: { entity_type: 'entity' }, decision_trail: [{}] }
        // e3 is missing
      ];

      const result = await migrator.phase3_verify(aiMemoryEntities, legacyProjects);

      expect(result.success).toBe(true);
      expect(result.issues).toBeDefined();
      expect(result.issues!.some(i => i.includes('Data loss detected'))).toBe(true);
    });

    test('should verify all entities have decision trail', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProjects = [{ id: 'w1', domain: 'wedding', entities: [], vendors: [], guests: [] }];

      const aiMemoryEntities = [
        { id: 'e1', content: { entity_type: 'entity' }, decision_trail: [{}] },
        { id: 'e2', content: { entity_type: 'entity' }, decision_trail: [] },  // Missing trail
        { id: 'e3', content: { entity_type: 'entity' } }  // No trail at all
      ];

      const result = await migrator.phase3_verify(aiMemoryEntities, legacyProjects);

      expect(result.issues).toBeDefined();
      expect(result.issues!.some(i => i.includes('missing decision trail'))).toBe(true);
    });

    test('should detect duplicate entity IDs', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProjects = [{ id: 'w1', domain: 'wedding', entities: [], vendors: [], guests: [] }];

      const aiMemoryEntities = [
        { id: 'e1', content: { entity_type: 'entity' }, decision_trail: [{}] },
        { id: 'e1', content: { entity_type: 'entity' }, decision_trail: [{}] },  // Duplicate
        { id: 'e2', content: { entity_type: 'entity' }, decision_trail: [{}] }
      ];

      const result = await migrator.phase3_verify(aiMemoryEntities, legacyProjects);

      expect(result.issues).toBeDefined();
      expect(result.issues!.some(i => i.includes('Duplicate entity IDs'))).toBe(true);
    });

    test('should validate entity content structure', async () => {
      const migrator = new MigrationOrchestrator();

      const legacyProjects = [{ id: 'w1', domain: 'wedding', entities: [], vendors: [], guests: [] }];

      const aiMemoryEntities = [
        { id: 'e1', content: { entity_type: 'entity' }, decision_trail: [{}] },
        { id: 'e2', content: {}, decision_trail: [{}] },  // Missing entity_type
        { id: 'e3', decision_trail: [{}] }  // No content at all
      ];

      const result = await migrator.phase3_verify(aiMemoryEntities, legacyProjects);

      expect(result.issues).toBeDefined();
      expect(result.issues!.some(i => i.includes('invalid content structure'))).toBe(true);
    });
  });

  describe('PHASE 4: CUTOVER - Switch Canonical Source', () => {
    test('should require verified backup before cutover', async () => {
      const migrator = new MigrationOrchestrator();

      const result = await migrator.phase4_cutover(
        'invalid_backup_id',
        []
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or not verified');
    });

    test('should complete cutover with valid verified backup', async () => {
      const migrator = new MigrationOrchestrator();

      // Step 1: Create and verify backup
      const backupMetadata = await backupService.createBackup(
        [{ id: 'w1', name: 'Test', domain: 'wedding', entities: [] }],
        'pre_cutover'
      );

      await backupService.verifyBackup(backupMetadata.backup_id);

      // Step 2: Perform cutover
      const result = await migrator.phase4_cutover(
        backupMetadata.backup_id,
        []
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Complete Migration Flow', () => {
    test('should execute all 4 phases successfully', async () => {
      const migrator = new MigrationOrchestrator();

      // Prepare test data
      const projects = [
        {
          id: 'wedding_1',
          name: 'Test Wedding',
          domain: 'wedding',
          vendors: [
            { id: 'v1', name: 'DJ', cost: 1000 }
          ],
          entities: [],
          guests: []
        }
      ];

      const extractionRules = {
        vendor: {
          extract_from: 'vendors',
          transform: (item: any) => ({ name: item.name, cost: item.cost })
        }
      };

      // Phase 1: Backup
      const phase1 = await migrator.phase1_backup(projects);
      expect(phase1.success).toBe(true);
      expect(phase1.backupId).toBeDefined();

      // Phase 2: Seed
      const phase2 = await migrator.phase2_seed(projects, extractionRules);
      expect(phase2.success).toBe(true);
      expect(phase2.aiMemoryEntities).toBeDefined();
      expect(phase2.aiMemoryEntities!.length).toBeGreaterThan(0);

      // Phase 3: Verify
      const phase3 = await migrator.phase3_verify(
        phase2.aiMemoryEntities!,
        projects
      );
      expect(phase3.success).toBe(true);

      // Phase 4: Cutover (requires verified backup)
      const phase4 = await migrator.phase4_cutover(
        phase1.backupId!,
        phase2.aiMemoryEntities!
      );
      expect(phase4.success).toBe(true);

      // Verify migration log
      const log = migrator.getLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].phase).toBe('PHASE_1_BACKUP');

      const status = migrator.getStatus();
      expect(status.phase).toBe('PHASE_4_CUTOVER');
      expect(status.status).toBe('success');
    });
  });
});
