import { useState, useEffect, useSyncExternalStore } from 'react';
import { weddingStore } from './game/weddingStore';
import { isTypingTarget } from './game/input';
import { WeddingWorld } from './components/3d/WeddingWorld';
import { TopNavigation } from './components/ui/TopNavigation';
import { BottomOrchestrator } from './components/ui/BottomOrchestrator';
import { EntityInspector } from './components/ui/EntityInspector';
import { ImportChaosModal } from './components/ui/ImportChaosModal';
import { ConflictCenterModal } from './components/ui/ConflictCenterModal';
import { LivingTimelineView } from './components/ui/LivingTimelineView';
import { IdentityEntryFlow } from './components/entry/IdentityEntryFlow';
import { DjZoneModal } from './components/ui/DjZoneModal';
import { BrandMenuModal } from './components/ui/BrandMenuModal';
import { CreateWeddingModal } from './components/ui/CreateWeddingModal';
import { LandingPageModal } from './components/ui/LandingPageModal';
import { GuideDocModal } from './components/ui/GuideDocModal';
import { InviteShareModal } from './components/ui/InviteShareModal';
import { AuthModal } from './components/ui/AuthModal';
import { ProjectSettingsModal } from './components/ui/ProjectSettingsModal';
import { ImportLocationModal } from './components/ui/ImportLocationModal';
import { ConstructionToolbar } from './components/ui/ConstructionToolbar';
import { InteriorHUD } from './components/ui/InteriorHUD';
import { WorldResearchModal } from './components/ui/WorldResearchModal';
import { SpatialAiAgentDrawer } from './components/ui/SpatialAiAgentDrawer';
import { ClaimVendorModal } from './components/ui/ClaimVendorModal';
import { WorldLabModal } from './components/ui/WorldLabModal';
import { ConnectorsHubModal } from './components/ui/ConnectorsHubModal';
import { AdSlotModal } from './components/ui/AdSlotModal';
import { SystemNerveCenterModal } from './components/ui/SystemNerveCenterModal';

export default function App() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConflictsOpen, setIsConflictsOpen] = useState(false);

  // Subscribe to store updates for reactive UI state
  useSyncExternalStore(
    (onStoreChange) => weddingStore.subscribe(onStoreChange),
    () => weddingStore.version
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global single-letter shortcuts (E/I/N/C/L/M/T) must not fire while the
      // user is typing a guest name, a budget amount or an invite code.
      if (isTypingTarget(e.target)) return;
      if (weddingStore.showIdentityModal && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyW' || e.code === 'ArrowUp')) {
        weddingStore.showIdentityModal = false;
        weddingStore.isPlaying = true;
        weddingStore.notify();
        return;
      }
      if (e.code === 'KeyE') {
        if (weddingStore.interiorMode) {
          weddingStore.exitVenue();
        } else {
          weddingStore.enterVenue('place_reception');
        }
      } else if (e.code === 'Escape') {
        if (weddingStore.interiorMode) {
          weddingStore.exitVenue();
        }
      } else if (e.code === 'Space' && !weddingStore.showIdentityModal) {
        weddingStore.toggleOrchestration();
      } else if (e.code === 'KeyI' && !weddingStore.showIdentityModal) {
        setIsImportOpen((prev) => !prev);
      } else if (e.code === 'KeyN' && !weddingStore.showIdentityModal) {
        weddingStore.systemNerveModalOpen = !weddingStore.systemNerveModalOpen;
        weddingStore.notify();
      } else if (e.code === 'KeyC' && !weddingStore.showIdentityModal) {
        weddingStore.connectorsModalOpen = !weddingStore.connectorsModalOpen;
        weddingStore.notify();
      } else if (e.code === 'KeyL' && !weddingStore.showIdentityModal) {
        weddingStore.worldLabModalOpen = !weddingStore.worldLabModalOpen;
        weddingStore.notify();
      } else if (e.code === 'KeyM' && !weddingStore.showIdentityModal) {
        weddingStore.setDjBoothOpen(!weddingStore.djBoothModalOpen);
      } else if (e.code === 'KeyT' && !weddingStore.showIdentityModal) {
        weddingStore.setViewMode(weddingStore.viewMode === 'world' ? 'timeline' : 'world');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#08090d' }}>
      {/* 1. 3D Architectural Worldmap & Interior Engine */}
      <WeddingWorld />

      {/* 2. Top Navigation Spatial Island (Worldmap mode) */}
      {!weddingStore.showIdentityModal && !weddingStore.interiorMode && (
        <TopNavigation
          onOpenImport={() => setIsImportOpen(true)}
          onOpenConflicts={() => setIsConflictsOpen(true)}
        />
      )}

      {/* 3. Interior HUD (When exploring inside a reconstructed venue) */}
      {!weddingStore.showIdentityModal && weddingStore.interiorMode && (
        <InteriorHUD />
      )}

      {/* 4. Bottom Orchestrator Spatial Dock (Worldmap mode) */}
      {!weddingStore.showIdentityModal && !weddingStore.interiorMode && <BottomOrchestrator />}

      {/* 5. Construction Toolbar (When in # CONSTRUIRE mode) */}
      {!weddingStore.showIdentityModal && weddingStore.constructionMode && <ConstructionToolbar />}

      {/* 6. Side Entity / Object Inspector Card */}
      {!weddingStore.showIdentityModal && <EntityInspector />}

      {/* 7. Living Timeline Mode Projection */}
      {!weddingStore.showIdentityModal && weddingStore.viewMode === 'timeline' && <LivingTimelineView />}

      {/* 8. Permanent Spatial AI Agent Copilot Drawer */}
      <SpatialAiAgentDrawer
        isOpen={weddingStore.spatialAgentDrawerOpen}
        onClose={() => {
          weddingStore.spatialAgentDrawerOpen = false;
          weddingStore.notify();
        }}
        onOpenResearch={(category) => {
          weddingStore.worldResearchModalOpen = true;
          weddingStore.notify();
        }}
      />

      {/* 9. System Nerve Center (Autodiagnostic & Santé Technique) */}
      <SystemNerveCenterModal
        isOpen={weddingStore.systemNerveModalOpen}
        onClose={() => {
          weddingStore.systemNerveModalOpen = false;
          weddingStore.notify();
        }}
      />

      {/* 10. Connectors Hub Modal */}
      <ConnectorsHubModal
        isOpen={weddingStore.connectorsModalOpen}
        onClose={() => {
          weddingStore.connectorsModalOpen = false;
          weddingStore.notify();
        }}
      />

      {/* 11. Advertising Grid 3D Slot Modal */}
      <AdSlotModal
        isOpen={weddingStore.adSlotModalOpen}
        onClose={() => {
          weddingStore.adSlotModalOpen = false;
          weddingStore.notify();
        }}
        slotId={weddingStore.selectedAdSlotId}
      />

      {/* 12. Modals Ecosystem */}
      <WorldLabModal
        isOpen={weddingStore.worldLabModalOpen}
        onClose={() => {
          weddingStore.worldLabModalOpen = false;
          weddingStore.notify();
        }}
      />

      <WorldResearchModal
        isOpen={weddingStore.worldResearchModalOpen}
        onClose={() => {
          weddingStore.worldResearchModalOpen = false;
          weddingStore.notify();
        }}
        onClaimVendor={(vendor) => {
          weddingStore.claimedVendorTarget = vendor;
          weddingStore.claimVendorModalOpen = true;
          weddingStore.notify();
        }}
      />

      <ClaimVendorModal
        isOpen={weddingStore.claimVendorModalOpen}
        onClose={() => {
          weddingStore.claimVendorModalOpen = false;
          weddingStore.claimedVendorTarget = null;
          weddingStore.notify();
        }}
        vendor={weddingStore.claimedVendorTarget}
      />

      <ImportChaosModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <ConflictCenterModal
        isOpen={isConflictsOpen}
        onClose={() => setIsConflictsOpen(false)}
      />

      <DjZoneModal
        isOpen={weddingStore.djBoothModalOpen}
        onClose={() => weddingStore.setDjBoothOpen(false)}
      />

      <BrandMenuModal
        isOpen={weddingStore.brandMenuOpen}
        onClose={() => {
          weddingStore.brandMenuOpen = false;
          weddingStore.notify();
        }}
      />

      <CreateWeddingModal
        isOpen={weddingStore.createWeddingModalOpen}
        onClose={() => {
          weddingStore.createWeddingModalOpen = false;
          weddingStore.notify();
        }}
      />

      <ImportLocationModal
        isOpen={weddingStore.importLocationModalOpen}
        onClose={() => {
          weddingStore.importLocationModalOpen = false;
          weddingStore.notify();
        }}
      />

      <LandingPageModal
        isOpen={weddingStore.landingPageModalOpen}
        onClose={() => {
          weddingStore.landingPageModalOpen = false;
          weddingStore.notify();
        }}
      />

      <GuideDocModal
        isOpen={weddingStore.guideDocModalOpen}
        onClose={() => {
          weddingStore.guideDocModalOpen = false;
          weddingStore.notify();
        }}
      />

      <InviteShareModal
        isOpen={weddingStore.inviteModalOpen}
        onClose={() => {
          weddingStore.inviteModalOpen = false;
          weddingStore.notify();
        }}
      />

      <AuthModal
        isOpen={weddingStore.authModalOpen}
        onClose={() => {
          weddingStore.authModalOpen = false;
          weddingStore.notify();
        }}
      />

      <ProjectSettingsModal
        isOpen={weddingStore.projectSettingsModalOpen}
        onClose={() => {
          weddingStore.projectSettingsModalOpen = false;
          weddingStore.notify();
        }}
      />

      {/* 13. Profile & Identity Editor (DMC ID & Symbol) */}
      {weddingStore.showIdentityModal && (
        <IdentityEntryFlow onComplete={() => {
          weddingStore.showIdentityModal = false;
          weddingStore.notify();
        }} />
      )}
    </div>
  );
}
