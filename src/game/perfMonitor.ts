// ---------------------------------------------------------------------------
// Soft Spatial UI — runtime render performance sampler.
// ---------------------------------------------------------------------------
// Phase B asks for a MEASURED performance impact (IBL, DPR, shadows). There is
// no headless browser in the build environment, so instead of guessing, the
// app measures itself: the render loop feeds this sampler, and the System
// Nerve RENDER_3D probe reports the real numbers as evidence.
//
// Dependency-free leaf, like brand.ts and the tokens.
// ---------------------------------------------------------------------------

const WINDOW = 120;

let frames: number[] = [];
let lastSampleAt = 0;
let currentDpr = 0;
let sceneInfo = { triangles: 0, calls: 0, textures: 0, geometries: 0 };
let degradedReason: string | null = null;

/** Called once per frame from the render loop with the frame delta (seconds). */
export function sampleFrame(delta: number): void {
  if (delta <= 0 || delta > 1) return; // ignore tab-switch spikes
  frames.push(delta);
  if (frames.length > WINDOW) frames.shift();
  lastSampleAt = Date.now();
}

export function setRenderContext(info: {
  dpr?: number;
  triangles?: number;
  calls?: number;
  textures?: number;
  geometries?: number;
}): void {
  if (info.dpr !== undefined) currentDpr = info.dpr;
  sceneInfo = {
    triangles: info.triangles ?? sceneInfo.triangles,
    calls: info.calls ?? sceneInfo.calls,
    textures: info.textures ?? sceneInfo.textures,
    geometries: info.geometries ?? sceneInfo.geometries,
  };
}

export function markDegraded(reason: string | null): void {
  degradedReason = reason;
}

export interface PerfSnapshot {
  /** Null when nothing has been rendered yet — never a fabricated number. */
  fps: number | null;
  fps1PercentLow: number | null;
  frameMs: number | null;
  samples: number;
  dpr: number;
  triangles: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  lastSampleAt: number | null;
  degradedReason: string | null;
}

export function getPerfSnapshot(): PerfSnapshot {
  if (frames.length === 0) {
    return {
      fps: null, fps1PercentLow: null, frameMs: null, samples: 0,
      dpr: currentDpr, triangles: sceneInfo.triangles, drawCalls: sceneInfo.calls,
      geometries: sceneInfo.geometries, textures: sceneInfo.textures,
      lastSampleAt: null, degradedReason,
    };
  }
  const sorted = [...frames].sort((a, b) => a - b);
  const mean = frames.reduce((n, d) => n + d, 0) / frames.length;
  // 1 % low = the slowest frames, i.e. the stutter the user actually feels.
  const worst = sorted[Math.floor(sorted.length * 0.99)] ?? sorted[sorted.length - 1];
  return {
    fps: Math.round(1 / mean),
    fps1PercentLow: Math.round(1 / worst),
    frameMs: Math.round(mean * 10000) / 10,
    samples: frames.length,
    dpr: currentDpr,
    triangles: sceneInfo.triangles,
    drawCalls: sceneInfo.calls,
    geometries: sceneInfo.geometries,
    textures: sceneInfo.textures,
    lastSampleAt,
    degradedReason,
  };
}

export function resetPerfSamples(): void {
  frames = [];
}
