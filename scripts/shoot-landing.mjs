import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
mkdirSync('/tmp/landing', { recursive: true });
const b = await puppeteer.launch({ executablePath:'/tmp/chromium', headless:true,
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars'],
  env:{...process.env, LD_LIBRARY_PATH:'/tmp/al2023/lib:/tmp/swiftshader:/tmp'}});
const width = Number(process.argv[2] || 1440);
const p = await b.newPage(); await p.setViewport({width, height: width<500?844:900});
p.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,120)));
await p.goto('http://localhost:5173/',{waitUntil:'networkidle0',timeout:60000});
await new Promise(r=>setTimeout(r,3000));
const info = await p.evaluate((vw)=>{
  const root = document.getElementById('wc-mirror');
  const off = root ? [...root.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0 && (r.right>vw+1||r.left<-1);}).length : -1;
  return { landing:/Le mariage devient un monde/.test(document.body.innerText),
    demoLeak:/Clara|Gare TGV|Manoir/.test(document.body.innerText),
    capsule: !!document.body.innerText.match(/WORLD\s+MIRROR\s+CANVAS/),
    scrollWidth: document.documentElement.scrollWidth, vw,
    offscreen: off, h1: document.querySelector('h1')?.innerText.replace(/\n/g,' '),
    nav: [...document.querySelectorAll('nav button')].map(x=>x.textContent.trim()).slice(0,8) };
}, width);
console.log(`[${width}px]`, JSON.stringify(info));
await p.screenshot({path:`/tmp/landing/landing-${width}.png`, fullPage:false});
await b.close();
