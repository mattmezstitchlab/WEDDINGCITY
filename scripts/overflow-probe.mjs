#!/usr/bin/env node
/**
 * Horizontal-overflow probe — REAL browser, real layout.
 *
 * jsdom cannot lay anything out, so nothing but an actual engine can answer
 * "does something stick out of a 390px screen?". This drives Chromium against
 * the dev server and lists every element whose box leaves the viewport.
 *
 * It found the real defect of the final pass: at 390px the music section
 * measured 383px inside a 350px column, so titles and durations were clipped.
 *
 * NOT part of `pnpm test`: it needs a browser binary that most environments
 * will not have. Run it when you have one.
 *
 *   pnpm run visual:overflow 390
 *
 * In this sandbox the binary comes from @sparticuz/chromium and needs its
 * bundled libraries:
 *   LD_LIBRARY_PATH=/tmp/al2023/lib:/tmp/swiftshader:/tmp
 *
 * Expected remaining offenders: the skip link (parked off-screen by design)
 * and the nav rail items (deliberately scrollable sideways).
 */
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/tmp/chromium', headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars'],
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp/swiftshader:/tmp' },
});
const width = Number(process.argv[2] || 390);
const page = await browser.newPage();
await page.setViewport({ width, height: 844 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r=>setTimeout(r,2500));
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b=>b.textContent.trim().toUpperCase()==='MIRROR'), { timeout: 30000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b=>b.textContent.trim().toUpperCase()==='MIRROR').click());
await page.waitForFunction(() => Boolean(document.getElementById('wc-mirror')), { timeout: 30000 });
await new Promise(r=>setTimeout(r,1500));
const report = await page.evaluate((vw) => {
  const out = [];
  const root = document.getElementById('wc-mirror');
  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      out.push({
        tag: el.tagName, cls: el.className?.toString().slice(0,24) || '',
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        text: (el.textContent||'').replace(/\s+/g,' ').trim().slice(0, 44),
      });
    }
  }
  // keep the outermost offenders only
  return { count: out.length, sample: out.slice(0, 14), docScroll: document.documentElement.scrollWidth, rootScroll: root.scrollWidth };
}, width);
console.log(`viewport ${width} · éléments hors cadre: ${report.count} · scrollWidth doc=${report.docScroll} mirror=${report.rootScroll}`);
for (const o of report.sample) console.log(`  ${o.tag.padEnd(7)} l=${String(o.left).padStart(5)} r=${String(o.right).padStart(5)} w=${String(o.w).padStart(4)} ${o.cls.padEnd(20)} ${o.text}`);
await browser.close();
