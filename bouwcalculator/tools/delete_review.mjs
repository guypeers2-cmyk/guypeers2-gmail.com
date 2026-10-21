/* Visible deletion controls regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/delete_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-delete-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function confirmDelete(s,accept=true){page.once('dialog',d=>accept?d.accept():d.dismiss());await click(s);if(accept)await page.waitForFunction(()=>state.rekenStatus==='ready');}
await page.evaluate(()=>{const p=nieuwProject(),r=p.ruimtes[0];p.huis={lengte:6,breedte:5,hoogte:2.5};r.huis_positie={x:0,y:0};r.openingen=[{naam:'Deur',muur:'noord',breedte:.9,hoogte:2.1,positie:.2},{naam:'Raam',muur:'noord',breedte:1,hoogte:1,positie:2.2,borstwering:1}];r.trappen=[{id:'trap',naam:'Trap',x:1,y:.2,breedte:.9,lengte:2.4,hoogte:2.5,richting:0,treden:14}];p.regels=[{id:'werk',ruimte_id:r.id,pakket_id:'gyproc_wand_profiel',oppervlak:'noord',opties:{}}];laadProject(p);BouwHuis.setLevel('ruimte');});await page.waitForFunction(()=>state.rekenStatus==='ready');
assert.equal(await page.$eval('#plan-object-verwijder',e=>e.hidden),true);
await page.$eval('#plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));const b=await(await page.$('#plan [data-opening-index="0"] .sleep-opening-hit')).boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);assert.equal(await page.$eval('#plan-object-verwijder',e=>e.hidden),false);assert((await page.$eval('#plan-selectie-verwijder',e=>e.textContent)).includes('Verwijderen'));
const before=await page.evaluate(()=>JSON.stringify(state.project)),price=await page.evaluate(()=>state.offerte.totalen.totaal);await confirmDelete('#plan-object-verwijder',false);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);await confirmDelete('#plan-object-verwijder');assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),1);assert(await page.evaluate(p=>state.offerte.totalen.totaal>p,price));assert.equal(await page.$eval('#plan-object-verwijder',e=>e.hidden),true);await click('#plan-undo');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),2);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),price);
await page.evaluate(()=>selecteerPlanRegel('werk'));await confirmDelete('#plan-object-verwijder');assert.equal(await page.evaluate(()=>state.project.regels.length),0);await click('#plan-undo');await page.waitForFunction(()=>state.rekenStatus==='ready');
await page.$eval('#plan-objecten',e=>e.open=true);await confirmDelete('[data-trap-verwijder="trap"]');assert.equal(await page.evaluate(()=>actieveRuimte().trappen.length),0);await click('#plan-undo');await page.waitForFunction(()=>state.rekenStatus==='ready');
await page.evaluate(()=>BouwHuis.setLevel('huis'));
for(const [selector,name] of [['[data-huis-opening="0"]','Deur'],['[data-huis-opening="1"]','Raam'],['[data-huis-trap="trap"]','Trap'],['[data-huis-object="werk"]','Gyproc']]){await page.$eval('#huis-plan '+selector,e=>e.focus());assert.equal(await page.$eval('#huis-object-acties',e=>e.hidden),false);assert((await page.$eval('#huis-object-naam',e=>e.textContent)).includes(name));await confirmDelete('#huis-object-verwijder');assert.equal(await page.$eval('#huis-object-acties',e=>e.hidden),true);await click('#huis-undo');await page.waitForFunction(()=>state.rekenStatus==='ready');}
for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});await page.$eval('#huis-plan [data-huis-opening="1"]',e=>e.focus());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.$eval('#huis-object-verwijder',e=>e.getBoundingClientRect().height>=44),true);}
await page.evaluate(()=>BouwHuis.setLevel('ruimte'));await page.evaluate(()=>selecteerPlanOpening(1));for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});assert.equal(await page.$eval('#plan-object-verwijder',e=>e.getBoundingClientRect().height>=44&&e.scrollWidth<=e.clientWidth),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}assert.deepEqual(errors,[]);console.log('PASS visible delete controls for doors/windows/work/stairs, house selection, cancel/confirm, correct recalculation, undo, stale selection clearing and 320–1440px');
}finally{await browser.close();}
