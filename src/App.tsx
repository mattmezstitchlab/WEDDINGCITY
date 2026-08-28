import { useState, useEffect, useSyncExternalStore, lazy, Suspense } from 'react';
import React from 'react';
const IntentToolbar = lazy(() => import('./components/ui/IntentToolbar').then((m) => ({ default: m.IntentToolbar })));

import { weddingStore } from './game/weddingStore';
import { isTypingTarget } from './game/input';
// The projection capsule is retired from the product surface (Jour J pass);
// the component stays in the codebase for the World's own tooling.
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
const LaboratoirePage = lazy(() => import('./components/Laboratoire').then((m) => ({ default: m.Laboratoire })));
const GenealogiePage = lazy(() => import('./components/Genealogie').then((m) => ({ default: m.Genealogie })));
const PortfolioPage = lazy(() => import('./components/Portfolio').then((m) => ({ default: m.Portfolio })));



export default function App() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConflictsOpen, setIsConflictsOpen] = useState(false);
  const [surface, setSurface] = useState<'product' | 'laboratoire' | 'genealogie' | 'portfolio'>('product');

  // Subscribe to store updates for reactive UI state
  useSyncExternalStore(
    (onStoreChange) => weddingStore.subscribe(onStoreChange),
    () => weddingStore.version
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global single-letter shortcuts must not fire while the user is typing
      // a guest name, a budget amount or an invite code.
      if (isTypingTarget(e.target)) return;

      // ---------------------------------------------------------------------
      // CONVERGENCE — THE PRODUCT HAS ONE DOOR, AND THESE ARE NOT IT.
      //
      // Every shortcut below used to fire from anywhere, including from the
      // product itself: I opened the old chaos import (an engine that INVENTS a
      // date and a deposit), C the Google/Spotify connector hub, L the World
      // Lab, N the nerve centre, G a prototype, T a SECOND timeline. A user
      // brushing a key landed in a surface that is not the product.
      //
      // They now exist only where they belong: inside the 3D World, which is
      // itself no longer offered as a destination. Nothing was deleted — the
      // modules and their tests are untouched — they are simply unreachable
      // from the product.
      // ---------------------------------------------------------------------
      const inWorld = weddingStore.projection === 'world';

      if (weddingStore.showIdentityModal && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyW' || e.code === 'ArrowUp')) {
        weddingStore.showIdentityModal = false;
        weddingStore.isPlaying = true;
        weddingStore.notify();
        return;
      }
      if (e.code === 'Escape') {
        if (weddingStore.interiorMode) weddingStore.exitVenue();
        return;
      }
      if (!inWorld) {
        // The public product has no hidden editor shortcut. Every moment is
        // edited through its right panel; creation starts in the landing hero.
        return;
      }

      if (e.code === 'KeyE') {
        if (weddingStore.interiorMode) {
          weddingStore.exitVenue();
        } else {
          weddingStore.enterVenue('place_reception');
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
        // documented shortcut could never fire — M always opened the DJ booth
        // instead. Found by actually driving the app in a browser. It only
        // returns TO the product now; it never leads out of it.
        weddingStore.setProjection('mirror');
      } else if (e.code === 'KeyM' && !weddingStore.showIdentityModal) {
        weddingStore.setDjBoothOpen(!weddingStore.djBoothModalOpen);
      } else if (e.code === 'KeyK' && !weddingStore.showIdentityModal) {
        if (!weddingStore.projectChosen) weddingStore.startWeddingCreation();
        else if (weddingStore.canvasOpen) weddingStore.closeCanvas();
        else weddingStore.openCanvas();
      } else if (e.code === 'KeyG' && !weddingStore.showIdentityModal) {
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
      {/* The retired 3D World is mounted only when its own projection is
          explicitly active. Mounting it behind the lazy product surface caused
          its badges and black scene to flash during every cold start. */}
      {weddingStore.projection === 'world' && <WeddingWorld />}

      {/* PRODUCT DECISION (Jour J pass): there is no dimension selector any
          more. The product is the Mirror — the public site, then the timeline
          of the day. The 3D World stays mounted and functional (⇧M for the
          people who know it), but it is not offered as a destination, so no
          navigation leads a couple into it. */}

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

      {surface === 'laboratoire' && (
        <Suspense fallback={<ProductBoot />}>
          <LaboratoirePage />
        </Suspense>
      )}
      {surface === 'genealogie' && (
        <Suspense fallback={<ProductBoot />}>
          <GenealogiePage />
        </Suspense>
      )}
      {surface === 'portfolio' && (
        <Suspense fallback={<ProductBoot />}>
          <PortfolioPage />
        </Suspense>
      )}

      {/* The product owns the first paint. While its lazy chunk is loading we
          show a neutral brand surface, never the retired World underneath. */}
      {surface === 'product' && weddingStore.projection === 'mirror' && (
        <Suspense fallback={<ProductBoot />}>
          <MirrorSite />
        </Suspense>
      )}

      {/* 2. The 3D chrome. CONVERGENCE AUDIT: it used to be rendered under the
             product page — invisible, but its buttons (WORLDMAP 3D, WORLD LAB)
             still existed in the document. The World keeps its own tooling,
             and that tooling now exists only while the World is on screen. */}
      {weddingStore.projection === 'world' && !weddingStore.showIdentityModal && !weddingStore.interiorMode && (
        <TopNavigation
          onOpenImport={() => setIsImportOpen(true)}
          onOpenConflicts={() => setIsConflictsOpen(true)}
        />
      )}

      {/* 3. Interior HUD (When exploring inside a reconstructed venue) */}
      {weddingStore.projection === 'world' && !weddingStore.showIdentityModal && weddingStore.interiorMode && (
        <InteriorHUD />
      )}

      {/* 4. Bottom Orchestrator Spatial Dock (Worldmap mode) */}
      {weddingStore.projection === 'world' && !weddingStore.showIdentityModal && !weddingStore.interiorMode && <BottomOrchestrator />}

      {/* 5. Construction Toolbar (When in # CONSTRUIRE mode) */}
      {weddingStore.projection === 'world' && !weddingStore.showIdentityModal && weddingStore.constructionMode && <ConstructionToolbar />}

      {/* 6. Side Entity / Object Inspector Card — a World tool. In the
             product, a person or a moment is opened from the timeline itself. */}
      {weddingStore.projection === 'world' && !weddingStore.showIdentityModal && <EntityInspector />}

      {/* 7. Living Timeline Mode Projection — the World's own reading of the
             hours. CONVERGENCE: there is exactly ONE timeline in the product,
             and it is TimelineStudio. This one can no longer be reached from
             it. */}
      {weddingStore.projection === 'world' && !weddingStore.showIdentityModal && weddingStore.viewMode === 'timeline' && <LivingTimelineView />}

      {/* 8. Permanent Spatial AI Agent Copilot Drawer */}
      {weddingStore.projection === 'world' && weddingStore.spatialAgentDrawerOpen && (
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
      {weddingStore.projection === 'world' && weddingStore.constellationOpen && (
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

      {weddingStore.projection === 'world' && weddingStore.systemNerveModalOpen && (
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
      {weddingStore.projection === 'world' && weddingStore.connectorsModalOpen && (
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
      {weddingStore.projection === 'world' && weddingStore.adSlotModalOpen && (
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
      {weddingStore.projection === 'world' && weddingStore.worldLabModalOpen && (
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

      {weddingStore.projection === 'world' && weddingStore.worldResearchModalOpen && (
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

      {weddingStore.projection === 'world' && weddingStore.claimVendorModalOpen && (
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

      {weddingStore.projection === 'world' && isImportOpen && (
        <Suspense fallback={null}>
        <ImportChaosModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
        </Suspense>
      )}

      {weddingStore.projection === 'world' && isConflictsOpen && (
        <Suspense fallback={null}>
        <ConflictCenterModal
          isOpen={isConflictsOpen}
          onClose={() => setIsConflictsOpen(false)}
        />
        </Suspense>
      )}

      {weddingStore.projection === 'world' && weddingStore.djBoothModalOpen && (
        <Suspense fallback={null}>
        <DjZoneModal
          isOpen={weddingStore.djBoothModalOpen}
          onClose={() => weddingStore.setDjBoothOpen(false)}
        />
        </Suspense>
      )}

      {weddingStore.projection === 'world' && weddingStore.brandMenuOpen && (
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

      {weddingStore.projection === 'world' && weddingStore.createWeddingModalOpen && (
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

      {weddingStore.projection === 'world' && weddingStore.importLocationModalOpen && (
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

      {weddingStore.projection === 'world' && weddingStore.landingPageModalOpen && (
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

      {/* Intent toolbar — persistent, available across main surfaces */}
      {(weddingStore.projection === 'mirror' || weddingStore.projection === 'world') && <React.Suspense fallback={null}><IntentToolbar /></React.Suspense>}

      {surface === 'product' && (
        <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 800 }}>
          <button onClick={() => setSurface('laboratoire')}>LABORATOIRE</button>
          <button onClick={() => setSurface('genealogie')}>GÉNÉALOGIE</button>
          <button onClick={() => setSurface('portfolio')}>PORTFOLIO</button>
          <button onClick={() => setSurface('product')}>PRODUIT</button>
        </div>
      )}
    </div>
  );
}

function ProductBoot() {
  return (
    <div
      role="status"
      aria-label="Chargement du Grand Jour"
      style={{
        position: 'fixed', inset: 0, zIndex: 790, display: 'grid', placeItems: 'center',
        background: '#08090b', color: '#f6f5f3',
        fontFamily: 'ui-sans-serif, -apple-system, system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em' }}>
        LE GRAND JOUR<span style={{ fontSize: 8, verticalAlign: 'super', marginLeft: 2 }}>®</span>
      </span>
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
