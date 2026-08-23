// ---------------------------------------------------------------------------
// Render harness — mount REAL components in a REAL DOM (jsdom) and hand the
// resulting document back for inspection.
// ---------------------------------------------------------------------------
// WHAT THIS IS: the components, the real store, the real projections, rendered
// by React into a real DOM tree. Every attribute, every inline style and every
// piece of text is the one a browser would receive.
//
// WHAT THIS IS NOT: a browser. jsdom has NO layout and NO rasterisation, so it
// cannot tell us how anything LOOKS — no geometry, no wrapping, no overflow,
// no colour on screen. Conclusions must stay at the level of "what the browser
// is told to draw", never "how it looks".
// ---------------------------------------------------------------------------

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { JSDOM } from 'jsdom';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const SRC = path.join(ROOT, 'src');

/**
 * Install a DOM. `width` only affects code that reads window.innerWidth —
 * it does NOT lay anything out.
 */
export function installDom({ width = 1440, height = 900, reducedMotion = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  window.innerWidth = width;
  window.innerHeight = height;

  window.matchMedia = (query) => ({
    matches: /prefers-reduced-motion/.test(query) ? reducedMotion
      : /max-width:\s*(\d+)/.test(query) ? width <= Number(/max-width:\s*(\d+)/.exec(query)[1])
        : false,
    media: query,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null,
    dispatchEvent() { return false; },
  });

  // Reveal-on-scroll: report everything as visible so the audit sees the page
  // in its settled state rather than mid-animation.
  class IO {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }], this); }
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver = IO;
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};

  const globals = [
    'window', 'document', 'navigator', 'location', 'history', 'HTMLElement', 'Element',
    'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'getComputedStyle',
    'requestAnimationFrame', 'cancelAnimationFrame', 'IntersectionObserver',
    'ResizeObserver', 'localStorage', 'sessionStorage', 'FileReader', 'Image',
    'DOMParser', 'SVGElement', 'CSSStyleDeclaration', 'matchMedia',
  ];
  for (const key of globals) {
    if (window[key] === undefined) continue;
    try {
      globalThis[key] = window[key];
    } catch {
      // Node 22 exposes a few read-only globals (navigator): define over them.
      Object.defineProperty(globalThis, key, {
        value: window[key], configurable: true, writable: true,
      });
    }
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;

  return dom;
}

/**
 * Bundle an entry that mounts a component, run it, and return the document.
 * `entrySource` is TSX and may import anything under src/.
 */
export async function renderComponent(entrySource, { width, reducedMotion } = {}) {
  const dom = installDom({ width, reducedMotion });

  const holder = path.join(ROOT, 'node_modules', '.wc-render-check');
  mkdirSync(holder, { recursive: true });
  const out = mkdtempSync(path.join(holder, 'run-'));
  const entry = path.join(out, 'entry.tsx');
  writeFileSync(entry, entrySource);

  const bundle = path.join(out, 'bundle.mjs');
  await esbuild.build({
    entryPoints: [entry],
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    // CSS is audited as text separately; it must not break the JS bundle.
    loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'error',
    absWorkingDir: ROOT,
  });

  const quiet = () => {
    const e = console.error, w = console.warn, l = console.log;
    console.error = () => {}; console.warn = () => {};
    return () => { console.error = e; console.warn = w; console.log = l; };
  };
  const restore = quiet();
  const mod = await import(pathToFileURL(bundle).href);
  await mod.mount();
  // Let effects and their state updates settle.
  await new Promise((r) => setTimeout(r, 80));
  restore();

  return { dom, document: dom.window.document, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

// --- helpers for reading what the browser was told -------------------------

/**
 * Resolve the value of a CSS length at a given viewport width.
 * Handles the exact clamp() shape produced by fluid() and plain px values.
 */
export function resolveLength(value, viewportWidth) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();

  const px = /^(-?[\d.]+)px$/.exec(text);
  if (px) return Number(px[1]);
  if (/^-?[\d.]+$/.test(text)) return Number(text);

  // clamp(MIN, EXPRESSION, MAX) — the browser (and jsdom) may reorder and
  // normalise the middle calc(), so the expression is evaluated rather than
  // pattern-matched: 100vw is substituted, px units dropped, arithmetic run.
  const clamp = /^clamp\((.*)\)$/s.exec(text.replace(/\s+/g, ' '));
  if (clamp) {
    const parts = splitTopLevel(clamp[1]);
    if (parts.length === 3) {
      const [min, mid, max] = parts.map((part) => evaluateLength(part, viewportWidth));
      if ([min, mid, max].every((n) => n !== null)) {
        return Math.min(Math.max(mid, Math.min(min, max)), Math.max(min, max));
      }
    }
  }

  return evaluateLength(text, viewportWidth);
}

/** Split "a, calc(b, c), d" on top-level commas only. */
function splitTopLevel(input) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(current); current = ''; continue; }
    current += ch;
  }
  out.push(current);
  return out.map((p) => p.trim());
}

/**
 * Evaluate a CSS length expression made of px, vw, numbers and + - * / ( ).
 * Anything else returns null — this must never become a general evaluator.
 */
export function evaluateLength(expression, viewportWidth) {
  let text = String(expression).trim().replace(/^calc\(/, '(');
  text = text
    .replace(/([\d.]+)vw/g, (_, n) => String((Number(n) / 100) * viewportWidth))
    .replace(/([\d.]+)px/g, '$1');
  if (!/^[-+*/(). \d]+$/.test(text)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${text});`)();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

// --- colour + contrast (WCAG 2.1) ------------------------------------------

export function parseColor(value) {
  if (!value) return null;
  const text = String(value).trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number(p.trim()));
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  return null;
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(rgb) {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** Flatten a translucent colour over an opaque background. */
export function composite(fg, bg) {
  const a = fg[3];
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
    1,
  ];
}

export function contrastRatio(fg, bg) {
  const f = luminance(composite(fg, bg));
  const b = luminance(bg);
  const [hi, lo] = f > b ? [f, b] : [b, f];
  return (hi + 0.05) / (lo + 0.05);
}
