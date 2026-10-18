/* Optional room contour and sloped ceiling regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/vorm_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-huis-placement-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{
 const p=nieuwProject();p.huis={lengte:10,breedte:8,hoogte:2.5};
 p.ruimtes=[{id:'a',naam:'Woonkamer',lengte:4,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:0,y:0}},
 {id:'b',naam:'Keuken',lengte:4,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:6,y:0}},
 {id:'c',naam:'Bureau buiten plan',lengte:1,breedte:2,hoogte:2.5,openingen:[],huis_positie:null}];
 p.regels=[{id:'w',ruimte_id:'c',oppervlak:'noord',pakket_id:'elek_stopcontact',hoeveelheid:1,opties:{}}];
 laadProject(p);window.BouwHuis.setLevel('huis');
});
await page.waitForFunction(()=>state.offerte?.regels.length===1&&document.querySelector('#status').textContent!=='Berekenen…');
const original=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function selectRoom(id){await page.$eval(`[data-huis-ruimte="${id}"]`,e=>e.focus());await page.keyboard.press('Enter');}
async function input(s,value){await page.$eval(s,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);}
await selectRoom('b');assert.equal(await page.$eval('#huis-plaats-ruimte',e=>e.value),'b');assert.equal(await page.$eval('#huis-plaats-x',e=>e.value),'6','canvas selection synchronizes placement coordinates');
await click('#huis-kamers summary');await input('#huis-plaats-x','9');assert((await page.$eval('#huis-plaats-status',e=>e.textContent)).includes('Nog niet toegepast'));
await click('[data-huis-zoom="in"]');assert.equal(await page.$eval('#huis-plaats-x',e=>e.value),'9','camera updates preserve unapplied placement drafts');
await page.$eval('#huis-plaats-form',e=>e.requestSubmit());assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'invalid placement does not mutate project');assert((await page.$eval('#huis-melding',e=>e.textContent)).length>0);
await click('[data-huis-kies="c"]');assert.equal(await page.$eval('#huis-selectie-info strong',e=>e.textContent),'Bureau buiten plan');
assert.equal(await page.$$eval('#huis-plan .geselecteerd',es=>es.length),0,'old canvas room is not left selected');
assert.equal(await page.$eval('[data-huis-kies="c"]',e=>e.getAttribute('aria-pressed')),'true');
assert.equal(await page.$eval('#huis-splits',e=>e.disabled),true);assert.equal(await page.$eval('#huis-splits-invoer',e=>e.hidden),true);assert.equal(await page.$eval('#huis-losmaken',e=>e.disabled),true);
await click('#huis-open');assert.equal(await page.evaluate(()=>state.actieveRuimteId),'c');assert.equal(await page.evaluate(()=>window.BouwHuis.getLevel()),'ruimte');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
await click('[data-ontwerpniveau="huis"]');await click('[data-huis-buiten]');assert.equal(await page.$eval('#huis-kamers',e=>e.open),true);assert.equal(await page.$eval('#huis-plaats-ruimte',e=>e.value),'c');
await input('#huis-plaats-x','4');await input('#huis-plaats-y','1');await page.$eval('#huis-plaats-form',e=>e.requestSubmit());
await page.waitForFunction(()=>state.project.ruimtes.find(r=>r.id==='c').huis_positie?.x===4&&document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.$eval('#huis-losmaken',e=>e.disabled),false);assert.equal(await page.$eval('#huis-plaats-x',e=>e.value),'4');assert.equal(await page.$eval('#huis-plaats-y',e=>e.value),'1');
assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total,'placement preserves quotation');
await click('#huis-undo');await page.waitForFunction(()=>!state.project.ruimtes.find(r=>r.id==='c').huis_positie);assert.equal(await page.$eval('#huis-plaats-x',e=>e.value),'0');assert.equal(await page.$eval('#huis-losmaken',e=>e.disabled),true);
await click('#huis-redo');await page.waitForFunction(()=>state.project.ruimtes.find(r=>r.id==='c').huis_positie?.x===4);assert.equal(await page.$eval('#huis-plaats-x',e=>e.value),'4');
const placed=await page.evaluate(()=>JSON.stringify(state.project));page.once('dialog',d=>d.dismiss());await click('#huis-losmaken');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),placed);
page.once('dialog',d=>d.accept());await click('#huis-losmaken');await page.waitForFunction(()=>!state.project.ruimtes.find(r=>r.id==='c').huis_positie&&document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'detach preserves room and work');assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(width===390)await page.screenshot({path:out+'/placement-mobile.png',fullPage:true});
}
// Undo a placement while a free cut is active: no stale geometry may survive.
await page.evaluate(()=>{const p=JSON.parse(JSON.stringify(state.project));p.regels=[];laadProject(p);});
await click('[data-huis-buiten]');await input('#huis-plaats-x','4');await input('#huis-plaats-y','1');await page.$eval('#huis-plaats-form',e=>e.requestSubmit());
await page.waitForFunction(()=>state.project.ruimtes.find(r=>r.id==='c').huis_positie?.x===4);
await click('#huis-splits');await click('#huis-snede-start');await click('#huis-undo');
await page.waitForFunction(()=>!state.project.ruimtes.find(r=>r.id==='c').huis_positie);
assert.equal(await page.$eval('#huis-splits-invoer',e=>e.hidden),true);assert.equal(await page.$$eval('#huis-plan .huis-snede-punt',es=>es.length),0);
assert.deepEqual(errors,[]);console.log('PASS: placed/unplaced selection, matching form and highlight, focused list states, draft preservation, invalid placement safety, direct room opening, actionable warning, placement undo/redo, detach confirmation, preserved work/prices and 320–1440px');
}finally{await browser.close();}
