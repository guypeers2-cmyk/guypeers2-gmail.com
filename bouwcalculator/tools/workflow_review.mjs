/* Optional five workflow improvements regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/workflow_review.mjs
 * Creates its own temporary browser profile; uses only that profile's local project.
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-workflow-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.waitForFunction(()=>!!state.offerte);
await page.evaluate(()=>{
 const p=nieuwProject();p.korting_pct=10;
 p.ruimtes=[{id:'a',naam:'Zolder',lengte:4,breedte:8,hoogte:2.5,openingen:[]},
 {id:'b',naam:'Keuken',lengte:6,breedte:8,hoogte:2.5,openingen:[]},
 {id:'c',naam:'Atelier',lengte:4,breedte:3,hoogte:2.5,openingen:[]}];
 p.regels=[{id:'w',ruimte_id:'a',oppervlak:'noord',pakket_id:'gyproc_wand_profiel',hoeveelheid:null,opties:{}}];
 laadProject(p);bewaarLokaal(false);
});
await page.waitForFunction(()=>state.offerte?.regels.length===1&&document.querySelector('#status').textContent!=='Berekenen…');
const original=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
await page.waitForFunction(()=>document.querySelector('#studio-room-summary').textContent.includes('32 m² vloer'));
assert((await page.$eval('#studio-room-summary',e=>e.textContent)).includes('1 werkpost'));
await page.click('.studio-room-open');await page.waitForFunction(()=>document.querySelector('#studio-rooms').open);
assert.equal(await page.$eval('[data-room-id="a"] .studio-room-price',e=>e.textContent),await page.evaluate(()=>eur(state.offerte.regels[0].totaal)));
assert.equal(await page.$eval('[data-room-id="b"] .studio-room-price',e=>e.textContent),await page.evaluate(()=>eur(0)));
assert((await page.$eval('.studio-room-price-note',e=>e.textContent)).includes('vóór projectkorting'));
assert(await page.evaluate(()=>state.offerte.totalen.korting>0),'discount fixture tests subtotal semantics');
await page.select('#studio-room-filter','work');assert.deepEqual(await page.$$eval('[data-room-id]',es=>es.map(e=>e.dataset.roomId)),['a']);
await page.select('#studio-room-filter','empty');assert.deepEqual(await page.$$eval('[data-room-id]',es=>es.map(e=>e.dataset.roomId)),['b','c']);
await page.select('#studio-room-sort','name');assert.deepEqual(await page.$$eval('[data-room-id]',es=>es.map(e=>e.dataset.roomId)),['c','b']);
await page.type('#studio-room-query','zolder');assert.equal(await page.$$eval('[data-room-id]',es=>es.length),0);
await page.select('#studio-room-filter','all');assert.deepEqual(await page.$$eval('[data-room-id]',es=>es.map(e=>e.dataset.roomId)),['a']);
await page.$eval('#studio-room-query',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});
assert.deepEqual(await page.$$eval('[data-room-id]',es=>es.map(e=>e.dataset.roomId)),['c','b','a']);
await page.evaluate(()=>rekenStatus('pending'));await page.waitForFunction(()=>document.querySelector('.studio-room-price').textContent==='—');
await page.evaluate(()=>rekenStatus('ready'));await page.waitForFunction(()=>document.querySelector('.studio-room-price').textContent.includes('€'));
await page.click('#studio-rooms-close');await page.waitForFunction(()=>!document.querySelector('#studio-rooms').open);
await page.click('.studio-room-open');assert.equal(await page.$eval('#studio-room-filter',e=>e.value),'all','new opening resets filters');assert.equal(await page.$eval('#studio-room-sort',e=>e.value),'name','sort retained during session');
await page.click('[data-room-id="b"]');await page.waitForFunction(()=>state.actieveRuimteId==='b');
assert((await page.$eval('#studio-room-summary',e=>e.textContent)).includes('48 m² vloer · 0 werkposten'));
await click('.studio-nav [data-studio-doel="ruimte-invoer"]');
await page.$eval('[data-ruimte="naam"]',e=>e.value='Concept zonder invoerevent');
await click('#ruimte-invoer .studio-next .primair');assert.equal(await page.$eval('#werk-invoer',e=>e.open),true);assert.equal(await page.$eval('#ruimte-invoer',e=>e.open),false);
await click('#werk-invoer .studio-next .primair');assert.equal(await page.$eval('#offertepaneel',e=>e.open),true);
await click('.studio-nav [data-studio-doel="ruimte-invoer"]');assert.equal(await page.$eval('[data-ruimte="naam"]',e=>e.value),'Concept zonder invoerevent','folding preserves draft DOM');
await page.$eval('[data-ruimte="naam"]',e=>e.value='Keuken');
await click('#ruimte-invoer .studio-next button:not(.primair)');assert.equal(await page.$eval('#ruimte-invoer',e=>e.open),false);
// Fixed header controls are clicked directly: do not artificially scroll them into view.
await page.evaluate(()=>window.scrollTo({top:450,behavior:'instant'}));
const designY=await page.evaluate(()=>scrollY);assert(designY>100);
await page.click('[data-hoofdtab="tarieven"]');assert.equal(await page.evaluate(()=>scrollY),0,'first rate visit begins at top');
await page.evaluate(()=>window.scrollTo({top:320,behavior:'instant'}));const ratesY=await page.evaluate(()=>scrollY);
await page.click('[data-hoofdtab="calculator"]');assert(Math.abs((await page.evaluate(()=>scrollY))-designY)<3,'restore design position');
await page.click('[data-hoofdtab="tarieven"]');assert(Math.abs((await page.evaluate(()=>scrollY))-ratesY)<3,'restore rate position');
await page.click('[data-hoofdtab="calculator"]');
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:900});await page.click('.studio-room-open');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page width ${width}`);
 assert(await page.$eval('#studio-rooms',e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight),`dialog layout ${width}`);
 if(width===390)await page.screenshot({path:out+'/workflow-mobile.png'});
 await page.click('#studio-rooms-close');await page.waitForFunction(()=>!document.querySelector('#studio-rooms').open);
}
await page.emulateMediaType('print');assert.equal(await page.$eval('#studio-room-summary',e=>getComputedStyle(e).display),'none');assert(await page.$$eval('.studio-next',es=>es.every(e=>getComputedStyle(e).display==='none')));await page.emulateMediaType('screen');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);assert.deepEqual(errors,[]);
console.log('PASS: room filters/sort/search, before-discount room prices and loading states, measured floor/work summary, guided task steps with preserved drafts, per-tab scroll restoration, 320–1440px, print isolation and unchanged project/totals/history');
}finally{await browser.close();}
