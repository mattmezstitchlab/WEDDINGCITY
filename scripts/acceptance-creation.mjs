#!/usr/bin/env node
/** ACCEPTANCE — editorial creation modal + editorial-asset isolation. */
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const OUT='/tmp/creation'; mkdirSync(OUT,{recursive:true});
const log=[]; const say=(...a)=>{const l=a.join(' ');console.log(l);log.push(l);};
const b = await puppeteer.launch({ executablePath:'/tmp/chromium', headless:true,
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars'],
  env:{...process.env, LD_LIBRARY_PATH:'/tmp/al2023/lib:/tmp/swiftshader:/tmp'}});
const width = Number(process.argv[2]||1440);
const p = await b.newPage(); await p.setViewport({width, height: width<500?844:900});
p.on('pageerror', e=>say('  [erreur page]', String(e).slice(0,120)));
const wait=(ms=800)=>new Promise(r=>setTimeout(r,ms));
const shot=async n=>{await p.screenshot({path:`${OUT}/${n}.png`});say('  📷',n);};
const click=t=>p.evaluate(x=>{const e=[...document.querySelectorAll('button')].find(b=>b.textContent.replace(/\s+/g,' ').includes(x));if(!e)return false;e.click();return true;},t);
const type=(ph,v)=>p.evaluate((ph,v)=>{const i=[...document.querySelectorAll('input')].find(i=>(i.placeholder||'').includes(ph)||i.type===ph);
  if(!i)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}));return true;},ph,v);
const state=()=>p.evaluate(()=>{
  const id=localStorage.getItem('wedding_city_active_project_id_v1');
  const projects=JSON.parse(localStorage.getItem('wedding_city_projects_v1')||'[]');
  const st=JSON.parse(localStorage.getItem('wedding_city_state_'+id)||'null');
  const L=k=>Array.isArray(st?.[k])?st[k]:[];
  const allStorage=Object.keys(localStorage).map(k=>localStorage.getItem(k)||'').join('|');
  return { id, couple: projects.find(x=>x.id===id)?.coupleNames??null,
    counts:{media:L('media').length, places:L('places').length, phases:L('phases').length, persons:L('persons').length, tracks:L('tracks').length},
    editorialInStorage: /\/editorial\//.test(allStorage),
    modalOpen: !!document.querySelector('[role="dialog"][aria-label="Créer mon mariage"]'),
    bodyOverflow: getComputedStyle(document.body).overflow,
    mirror: !!document.getElementById('wc-mirror') };
});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle0',timeout:60000});
await wait(3000);
say(`=== ${width}px — LANDING ===`);
say('  ' + JSON.stringify(await state()));

say('\n=== OUVRIR LA MODALE ===');
await click('Créer mon mariage'); await wait(1200);
let s = await state();
say('  modale ouverte :', s.modalOpen, '| scroll de fond bloqué :', s.bodyOverflow === 'hidden');
await shot(`modal-etape1-${width}`);

say('\n=== ESC FERME, PUIS RÉOUVERTURE ===');
await p.keyboard.press('Escape'); await wait(700);
s = await state(); say('  fermée par Escape :', !s.modalOpen, '| scroll rendu :', s.bodyOverflow !== 'hidden');
await click('Créer mon mariage'); await wait(1000);
say('  rouverte :', (await state()).modalOpen);

say('\n=== REMPLIR LES 3 ÉTAPES ===');
await type('Clara','ALPHA-UN'); await type('Alexandre','ALPHA-DEUX'); await wait(300);
await shot(`modal-rempli-${width}`);
await click('Continuer'); await wait(700);
await type('date','2027-03-05'); await wait(300);
await click('Continuer'); await wait(700);
await type('Domaine','DOMAINE ALPHA'); await wait(300);
await shot(`modal-etape3-${width}`);
const gen = await click('Générer notre monde'); await wait(3000);
say('  génération lancée :', gen);
const after = await state();
say('  ' + JSON.stringify(after));
say('  MÉDIAS DU PROJET :', after.counts.media, '| assets éditoriaux dans le stockage :', after.editorialInStorage);
await shot(`apres-creation-${width}`);
writeFileSync(`${OUT}/log-${width}.txt`, log.join('\n'));
await b.close();
