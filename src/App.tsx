import { useState, useEffect, useSyncExternalStore, lazy, Suspense } from 'react';
import { weddingStore } from './game/weddingStore';
import { isTypingTarget } from './game/input';
import { ProjectionSwitcher } from './components/ui/ProjectionSwitcher';
import { WeddingWorld } from './components/3d/WeddingWorld';
import { TopNavigation } from './components/ui/TopNavigation';
import { BottomOrchestrator } from './components/ui/BottomOrchestrator';
import { EntityInspector } from './components/ui/EntityInspector';
import { LivingTimelineView } from './components/ui/LivingTimelineView';
import { IdentityEntryFlow } from './components/entry/IdentityEntryFlow';
import { ConstructionToolbar } from './components/ui/ConstructionToolbar';
import { InteriorHUD } from './components/ui/InteriorHUD';

// Heavy, on-demand surfaces are code-split: they are only fetched when the
// user actually opens them. Each is rendered conditionally so the chunk is not
// requested at startup.
const WorldCanvasShell = lazy(() => import('./components/canvas/WorldCanvasShell').then((m) => ({ default: m.WorldCanvasShell })));
const MirrorCanvasShell = lazy(() => import('./components/canvas/MirrorCanvasShell').then((m) => ({ default: m.MirrorCanvasShell })));
import { ProjectionVeil } from './components/ui/ProjectionVeil';

const WeddingCreationModal = lazy(() => import('./components/mirror/WeddingCreationModal').then((m) => ({ default: m.WeddingCreationModal })));
const MirrorSite = lazy(() => import('./components/mirror/MirrorSite').then((m) => ({ default: m.MirrorSite })));
const GuestConstellation = lazy(() => import('./components/ui/GuestConstellation').then((m) => ({ default: m.GuestConstellation })));
const SystemNerveCenterModal = lazy(() => import('./components/ui/SystemNerveCenterModal').then((m) => ({ default: m.SystemNerveCenterModal })));
const WorldResearchModal = lazy(() => import('./components/ui/WorldResearchModal').then((m) => ({ default: m.WorldResearchModal })));
const ConnectorsHubModal = lazy(() => import('./components/ui/ConnectorsHubModal').then((m) => ({ default: m.ConnectorsHubModal })));
const WorldLabModal = lazy(() => import('./components/ui/WorldLabModal').then((m) => ({ default: m.WorldLabModal })));
const DjZoneModal = lazy(() => import('./components/ui/DjZoneModal').then((m) => ({ default: m.DjZoneModal })));
const GuideDocModal = lazy(() => import('./components/ui/GuideDocModal').then((m) => ({ default: m.GuideDocModal })));
const LandingPageModal = lazy(() => import('./components/ui/LandingPageModal').then((m) => ({ default: m.LandingPageModal })));
const AdSlotModal = lazy(() => import('./components/ui/AdSlotModal').then((m) => ({ default: m.AdSlotModal })));
const ClaimVendorModal = lazy(() => import('./components/ui/ClaimVendorModal').then((m) => ({ default: m.ClaimVendorModal })));
const ImportChaosModal = lazy(() => import('./components/ui/ImportChaosModal').then((m) => ({ default: m.ImportChaosModal })));
const ImportLocationModal = lazy(() => import('./components/ui/ImportLocationModal').then((m) => ({ default: m.ImportLocationModal })));
const ProjectSettingsModal = lazy(() => import('./components/ui/ProjectSettingsModal').then((m) => ({ default: m.ProjectSettingsModal })));
const InviteShareModal = lazy(() => import('./components/ui/InviteShareModal').then((m) => ({ default: m.InviteShareModal })));
const AuthModal = lazy(() => import('./components/ui/AuthModal').then((m) => ({ default: m.AuthModal })));
const CreateWeddingModal = lazy(() => import('./components/ui/CreateWeddingModal').then((m) => ({ default: m.CreateWeddingModal })));
const ConflictCenterModal = lazy(() => import('./components/ui/ConflictCenterModal').then((m) => ({ default: m.ConflictCenterModal })));
const BrandMenuModal = lazy(() => import('./components/ui/BrandMenuModal').then((m) => ({ default: m.BrandMenuModal })));
const SpatialAiAgentDrawer = lazy(() => import('./components/ui/SpatialAiAgentDrawer').then((m) => ({ default: m.SpatialAiAgentDrawer })));



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
      } else if (e.code === 'KeyM' && e.shiftKey) {
        // MEASURED: this branch used to sit AFTER the bare KeyM one, so the
        // documented ⇧M shortcut could never fire — M always opened the DJ
        // booth instead. Found by actually driving the app in a browser.
        weddingStore.setProjection(weddingStore.projection === 'mirror' ? 'world' : 'mirror');
      } else if (e.code === 'KeyM' && !weddingStore.showIdentityModal) {
        weddingStore.setDjBoothOpen(!weddingStore.djBoothModalOpen);
      } else if (e.code === 'KeyK' && !weddingStore.showIdentityModal) {
        // Nothing to compose before a wedding is open: the landing asks for
        // one instead of quietly opening the demo.
        if (!weddingStore.projectChosen) weddingStore.startWeddingCreation();
        else if (weddingStore.canvasOpen) weddingStore.closeCanvas();
        else weddingStore.openCanvas();
      } else if (e.code === 'KeyG' && !weddingStore.showIdentityModal) {
        // Phase B prototype surface. Deliberately a shortcut rather than a new
        // navigation entry: the permanent chrome is out of scope for now.
        weddingStore.constellationOpen = !weddingStore.constellationOpen;
        weddingStore.notify();
      } else if (e.code === 'KeyT' && !weddingStore.showIdentityModal) {
        weddingStore.setViewMode(weddingStore.viewMode === 'world' ? 'timeline' : 'world');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#08090d' }}>
      {/* 1. 3D Architectural Worldmap & Interior Engine.
             The WORLD projection. It stays mounted when Mirror is on screen so
             switching back is instant, but its render loop is paused (see
             WeddingWorld) rather than drawing behind an opaque page. */}
      <WeddingWorld />

      {/* Dimension selector: one World Model, several projections.
          Hidden until a wedding is open — with none chosen there is nothing to
          switch between, and offering WORLD would show the demo. */}
      {weddingStore.projectChosen && <ProjectionSwitcher />}

      {/* The crossing itself: a short fade in the colour of the destination.
          The 3D scene is never remounted, so nothing is rebuilt or lost. */}
      <ProjectionVeil projection={weddingStore.projection} />

      {/* A brand-new wedding has no spaces yet, and none are invented for it.
          The World says what is missing and where to add it, instead of
          showing an empty grid with no explanation. */}
      {weddingStore.projectChosen
        && weddingStore.projection === 'world'
        && weddingStore.places.length === 0
        && !weddingStore.canvasOpen
        && !weddingStore.showIdentityModal && (
        <div style={emptyWorldStyle}>
          <div style={{ fontSize: 15, color: '#f5f5f7', fontWeight: 600, letterSpacing: '-0.01em' }}>
            Ce monde n’a pas encore d’espaces
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.65, color: '#9ba1b0' }}>
            {weddingStore.currentProject.coupleNames
              ? `Le mariage de ${weddingStore.currentProject.coupleNames} vient d’être créé : rien n’a été inventé pour le remplir.`
              : 'Rien n’a été inventé pour remplir ce monde.'}
            {' '}Ajoutez un lieu, un moment ou une personne depuis le Canvas — chaque
            élément apparaîtra ici et dans le site.
          </p>
          <button
            onClick={() => weddingStore.openCanvas(undefined, 'places')}
            style={emptyWorldBtnStyle}
          >
            Ouvrir le Canvas
          </button>
        </div>
      )}

      {/* CANVAS — the composition projection. A contextual side surface, not a
          page: the World stays visible behind it so context is never lost. */}
      {weddingStore.canvasOpen && weddingStore.projectChosen && (
        <Suspense fallback={null}>
          {/* Same CanvasCore, two shells: a side panel over the 3D world, an
              editorial surface inside the Mirror. The projection decides. */}
          {weddingStore.getCanvasShell() === 'mirror' ? <MirrorCanvasShell /> : <WorldCanvasShell />}
        </Suspense>
      )}

      {/* Creating a wedding from the public site happens on the site, in its
          own language — not by dropping the visitor into the 3D panel. */}
      {weddingStore.weddingCreationOpen && (
        <Suspense fallback={null}>
          <WeddingCreationModal />
        </Suspense>
      )}

      {/* MIRROR — the editorial projection. Covers the world surface while
          active; the underlying world state is untouched. */}
      {weddingStore.projection === 'mirror' && (
        <Suspense fallback={null}>
          <MirrorSite />
        </Suspense>
      )}

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
      {weddingStore.spatialAgentDrawerOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 9. System Nerve Center (Autodiagnostic & Santé Technique) */}
      {weddingStore.constellationOpen && (
        <Suspense fallback={null}>
          <GuestConstellation
            isOpen={weddingStore.constellationOpen}
            onClose={() => {
              weddingStore.constellationOpen = false;
              weddingStore.notify();
            }}
          />
        </Suspense>
      )}

      {weddingStore.systemNerveModalOpen && (
        <Suspense fallback={null}>
        <SystemNerveCenterModal
          isOpen={weddingStore.systemNerveModalOpen}
          onClose={() => {
            weddingStore.systemNerveModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {/* 10. Connectors Hub Modal */}
      {weddingStore.connectorsModalOpen && (
        <Suspense fallback={null}>
        <ConnectorsHubModal
          isOpen={weddingStore.connectorsModalOpen}
          onClose={() => {
            weddingStore.connectorsModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {/* 11. Advertising Grid 3D Slot Modal */}
      {weddingStore.adSlotModalOpen && (
        <Suspense fallback={null}>
        <AdSlotModal
          isOpen={weddingStore.adSlotModalOpen}
          onClose={() => {
            weddingStore.adSlotModalOpen = false;
            weddingStore.notify();
          }}
          slotId={weddingStore.selectedAdSlotId}
        />
        </Suspense>
      )}

      {/* 12. Modals Ecosystem */}
      {weddingStore.worldLabModalOpen && (
        <Suspense fallback={null}>
        <WorldLabModal
          isOpen={weddingStore.worldLabModalOpen}
          onClose={() => {
            weddingStore.worldLabModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.worldResearchModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {weddingStore.claimVendorModalOpen && (
        <Suspense fallback={null}>
        <ClaimVendorModal
          isOpen={weddingStore.claimVendorModalOpen}
          onClose={() => {
            weddingStore.claimVendorModalOpen = false;
            weddingStore.claimedVendorTarget = null;
            weddingStore.notify();
          }}
          vendor={weddingStore.claimedVendorTarget}
        />
        </Suspense>
      )}

      {isImportOpen && (
        <Suspense fallback={null}>
        <ImportChaosModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
        </Suspense>
      )}

      {isConflictsOpen && (
        <Suspense fallback={null}>
        <ConflictCenterModal
          isOpen={isConflictsOpen}
          onClose={() => setIsConflictsOpen(false)}
        />
        </Suspense>
      )}

      {weddingStore.djBoothModalOpen && (
        <Suspense fallback={null}>
        <DjZoneModal
          isOpen={weddingStore.djBoothModalOpen}
          onClose={() => weddingStore.setDjBoothOpen(false)}
        />
        </Suspense>
      )}

      {weddingStore.brandMenuOpen && (
        <Suspense fallback={null}>
        <BrandMenuModal
          isOpen={weddingStore.brandMenuOpen}
          onClose={() => {
            weddingStore.brandMenuOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.createWeddingModalOpen && (
        <Suspense fallback={null}>
        <CreateWeddingModal
          isOpen={weddingStore.createWeddingModalOpen}
          onClose={() => {
            weddingStore.createWeddingModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.importLocationModalOpen && (
        <Suspense fallback={null}>
        <ImportLocationModal
          isOpen={weddingStore.importLocationModalOpen}
          onClose={() => {
            weddingStore.importLocationModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.landingPageModalOpen && (
        <Suspense fallback={null}>
        <LandingPageModal
          isOpen={weddingStore.landingPageModalOpen}
          onClose={() => {
            weddingStore.landingPageModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.guideDocModalOpen && (
        <Suspense fallback={null}>
        <GuideDocModal
          isOpen={weddingStore.guideDocModalOpen}
          onClose={() => {
            weddingStore.guideDocModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.inviteModalOpen && (
        <Suspense fallback={null}>
        <InviteShareModal
          isOpen={weddingStore.inviteModalOpen}
          onClose={() => {
            weddingStore.inviteModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.authModalOpen && (
        <Suspense fallback={null}>
        <AuthModal
          isOpen={weddingStore.authModalOpen}
          onClose={() => {
            weddingStore.authModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

      {weddingStore.projectSettingsModalOpen && (
        <Suspense fallback={null}>
        <ProjectSettingsModal
          isOpen={weddingStore.projectSettingsModalOpen}
          onClose={() => {
            weddingStore.projectSettingsModalOpen = false;
            weddingStore.notify();
          }}
        />
        </Suspense>
      )}

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

const emptyWorldStyle: React.CSSProperties = {
  position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
  zIndex: 60, width: 'min(420px, calc(100vw - 48px))',
  background: 'rgba(18, 21, 30, 0.92)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 18, padding: '22px 24px',
  fontFamily: 'ui-sans-serif, -apple-system, system-ui, sans-serif',
  textAlign: 'center',
};

const emptyWorldBtnStyle: React.CSSProperties = {
  marginTop: 16, appearance: 'none', cursor: 'pointer',
  background: '#f5f5f7', color: '#12151e', border: 'none',
  borderRadius: 999, padding: '9px 18px',
  fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
};
