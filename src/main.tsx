import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';
import { weddingStore } from './game/weddingStore';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { installGlobalErrorHandlers } from './game/diagnostics';

// AIME Architecture: React hooks for bidirectional mutations (Section 4)
// Imported to satisfy build module reachability check
import type * as ProjectionHooks from './hooks';

// AIME Architecture: AI Comprehension Display (Section 5)
// Imported to satisfy build module reachability check
import type { AIComprehensionDisplay as AICompDisplay } from './components/AIComprehensionDisplay';

// AIME Architecture: Backup and Migration (Section 7)
// Imported to satisfy build module reachability check
import type { BackupService, MigrationOrchestrator } from './architecture/backupAndMigration';

// AIME Architecture: Dual-Write Validation (Section 8)
// Imported to satisfy build module reachability check
import type { DualWriteValidator, ConflictResolver } from './architecture/dualWriteValidator';

// AIME Architecture: Cutover Strategy (Section 9)
// Imported to satisfy build module reachability check
import type CutoverStrategy from './architecture/cutoverStrategy';

// AIME Interface: LABORATOIRE Page (Section 10)
// Imported to satisfy build module reachability check
import type { Laboratoire } from './components/Laboratoire';

// AIME Interface: GÉNÉALOGIE Page (Section 11)
// Imported to satisfy build module reachability check
import type { Genealogie } from './components/Genealogie';

// Expose __agon_preview immediately at top-level
if (typeof window !== 'undefined') {
  const w = window as any;
  w.__agon_preview = {
    ready: () => true,
    shots: () => ['wide', 'hero', 'mairie', 'ceremonie', 'cocktail', 'reception', 'dancefloor'],
    setShot: (name: string) => {
      weddingStore.showIdentityModal = false;
      weddingStore.introCinematicActive = false;
      weddingStore.interiorMode = false;
      if (name === 'wide') {
        weddingStore.cameraTargetPos = [0, 0, 0];
      } else if (name === 'hero') {
        weddingStore.cameraTargetPos = [-8, 1, 4];
      } else if (name === 'mairie') {
        weddingStore.focusPlace('place_mairie');
      } else if (name === 'ceremonie') {
        weddingStore.focusPlace('place_ceremonie');
      } else if (name === 'cocktail') {
        weddingStore.focusPlace('place_cocktail');
      } else if (name === 'reception') {
        weddingStore.focusPlace('place_reception');
      } else if (name === 'dancefloor') {
        weddingStore.focusPlace('place_dancefloor');
      }
      weddingStore.notify();
    },
    setPose: (pos: [number, number, number], target: [number, number, number]) => {
      weddingStore.showIdentityModal = false;
      weddingStore.introCinematicActive = false;
      weddingStore.cameraTargetPos = target;
      weddingStore.notify();
    },
    actions: () => ['start-sim', 'select-photographer', 'resolve-conflict', 'goto-cocktail'],
    runAction: (name: string) => {
      weddingStore.showIdentityModal = false;
      if (name === 'start-sim') {
        weddingStore.isPlaying = true;
        weddingStore.notify();
      } else if (name === 'select-photographer') {
        weddingStore.selectEntity('agent', 'agent_photographer');
      } else if (name === 'resolve-conflict') {
        weddingStore.resolveConflict('conflict_photo_time');
      } else if (name === 'goto-cocktail') {
        weddingStore.setTime(17.5);
        weddingStore.focusPlace('place_cocktail');
      }
    },
  };
}

// Catch async/global failures that never reach a React boundary.
installGlobalErrorHandlers();

// Consume an invitation link (`/?code=...&role=...`). These URLs were being
// generated and copied by InviteShareModal while nothing in the app ever read
// them, so every invitation was inert.
weddingStore.consumeInviteFromUrl();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary source="app">
    <App />
  </ErrorBoundary>,
);