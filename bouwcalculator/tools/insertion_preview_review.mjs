/* Opening preview, presets and inline room name regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/insertion_preview_review.mjs
 */
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(process.env.BROWSER_MODULE_ROOT
  ? path.join(path.resolve(process.env.BROWSER_MODULE_ROOT),'package.json') : import.meta.url);
const puppeteer = require('puppeteer-core');
const cm = process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
const chromium = cm?.default || cm;
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-insertion-preview-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
let calculations=0;page.on('request',r=>{if(r.url().includes('/api/offerte'))calculations++;});
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{const p=nieuwProject(),r=p.ruimtes[0];p.huis={lengte:10,breedte:8,hoogte:2.5};r.huis_positie={x:0,y:0};p.regels=[{id:'preview-socket',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},visualisatie:{x:2,y:.1,z:.3}}];laadProject(p);window.BouwHuis.setLevel('huis');});await page.waitForFunction(()=>state.rekenStatus==='ready');
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function fill(s,v){await page.$eval(s,(e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},v);}
const original=await page.evaluate(()=>JSON.stringify(state.project)),name=await page.evaluate(()=>actieveRuimte().naam),total=await page.evaluate(()=>state.offerte.totalen.totaal);
await fill('#huis-kamer-naam','Voorstel');await page.evaluate(()=>window.BouwHuis.render());assert.equal(await page.$eval('#huis-kamer-naam',e=>e.value),'Voorstel','background rendering preserves draft');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await page.focus('#huis-kamer-naam');await page.keyboard.press('Escape');assert.equal(await page.$eval('#huis-kamer-naam',e=>e.value),name);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
await fill('#huis-kamer-naam','   ');await click('#huis-naam-form button[type="submit"]');assert.equal(await page.$eval('#huis-kamer-naam',e=>e.validity.customError),true);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await fill('#huis-kamer-naam','Keuken & eetruimte');await click('#huis-naam-form button[type="submit"]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>actieveRuimte().naam),'Keuken & eetruimte');assert((await page.$eval('#huis-plan .huis-label',e=>e.textContent)).includes('Keuken & eetruimte'));assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);
await click('#huis-naam-form button[type="submit"]');await click('#huis-undo');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'no-op save adds no undo step');await click('#huis-redo');assert.equal(await page.$eval('#huis-kamer-naam',e=>e.value),'Keuken & eetruimte');
await fill('#huis-kamer-naam','Niet bewaren');await click('#huis-naam-annuleer');assert.equal(await page.$eval('#huis-kamer-naam',e=>e.value),'Keuken & eetruimte');
await page.evaluate(()=>window.BouwHuis.setLevel('ruimte'));
const before=await page.evaluate(()=>JSON.stringify(state.project)),canUndo=await page.evaluate(()=>projectHistorie.kanUndo()),beforeRequests=calculations;
await click('[data-opening-snel="Raam"]');assert.equal(await page.$$eval('#opening-presets button',es=>es.length),3);assert.equal(await page.$eval('#opening-preview-status',e=>e.dataset.valid),'true');assert.equal(await page.$eval('[data-opening-preset="1"]',e=>e.getAttribute('aria-pressed')),'true');
await click('[data-opening-preset="0"]');assert.deepEqual(await page.evaluate(()=>['#opening-breedte','#opening-hoogte','#opening-onderkant'].map(s=>Number(document.querySelector(s).value))),[.6,.6,.9]);assert((await page.$eval('#opening-preview-status',e=>e.textContent)).includes('1,70'));
await fill('#opening-positie',.4);assert((await page.$eval('#opening-preview-status',e=>e.textContent)).includes('0,40'));assert.equal(await page.$$('#opening-voorbeeld .opening-preview-gat').then(es=>es.length),1);
await fill('#opening-breedte',20);assert.equal(await page.$eval('#opening-preview-status',e=>e.dataset.valid),'false');assert.equal(await page.$$('#opening-voorbeeld .opening-preview-gat').then(es=>es.length),0);await fill('#opening-breedte','');assert(!(await page.$eval('#opening-voorbeeld',e=>e.innerHTML)).includes('NaN'));
await click('[data-opening-preset="1"]');assert.equal(await page.$eval('#opening-positie',e=>e.value),'0.4','preset keeps exact position');assert.equal(await page.$eval('#opening-preview-status',e=>e.dataset.valid),'true');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),canUndo);assert.equal(calculations,beforeRequests,'preview/presets never request calculation');
for(const theme of ['light','dark']){await page.select('#thema-keuze',theme);for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});assert(await page.$eval('#opening-menu',e=>e.scrollWidth<=e.clientWidth));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const b of await page.$$eval('#opening-presets button',es=>es.map(e=>e.getBoundingClientRect().height)))assert(b>=44);if(width===390)await page.screenshot({path:out+`/preview-${theme}-mobile.png`});}}
await click('#opening-sluit');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);
await click('[data-opening-snel="Deur"]');await click('[data-opening-preset="1"]');await click('#opening-form button[type="submit"]');await page.waitForFunction(()=>!document.querySelector('#opening-menu').open);assert.equal(await page.evaluate(()=>actieveRuimte().openingen.at(-1).breedte),.9);await click('#plan-undo');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);
await page.evaluate(()=>{const p=JSON.parse(JSON.stringify(state.project));p.ruimtes.push({...p.ruimtes[0],id:'preview-second',naam:'Badkamer',huis_positie:null,openingen:[]});laadProject(p);window.BouwHuis.setLevel('huis');});await fill('#huis-kamer-naam','Draft eerste kamer');await page.$eval('#huis-kamers',e=>e.open=true);await click('[data-huis-kies="preview-second"]');assert.equal(await page.$eval('#huis-kamer-naam',e=>e.value),'Badkamer');assert.equal(await page.evaluate(()=>state.project.ruimtes[0].naam),'Keuken & eetruimte');
await page.evaluate(()=>window.BouwHuis.setLevel('ruimte'));await click('[data-opening-snel="Raam"]');await page.evaluate(()=>laadProject(nieuwProject()));await fill('#opening-breedte',.8);assert.equal(await page.$eval('#opening-preview-status',e=>e.dataset.valid),'false');await click('#opening-form button[type="submit"]');assert((await page.$eval('#opening-fout',e=>e.textContent)).includes('kamer is veranderd'));assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0);await click('#opening-sluit');
assert.deepEqual(errors,[]);console.log('PASS: live valid/invalid preview, accessible dimension presets, preserved placement, no data/price/history/API mutation until save, light/dark 320–1440px, inline room rename draft/cancel/validation/undo/redo/selection binding and stale dialog protection');
}finally{await browser.close();}
