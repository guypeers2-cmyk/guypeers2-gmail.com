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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-routing-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8096/',{waitUntil:'networkidle2'});
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.waitForFunction(()=>!!state.offerte);
await page.evaluate(()=>{
 const p=nieuwProject();p.huis={lengte:10,breedte:8,hoogte:2.5};
 p.ruimtes=[{id:'a',naam:'Woonkamer',lengte:4,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:0,y:0}},
 {id:'b',naam:'Keuken',lengte:6,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:4,y:0}}];
 p.regels=[{id:'w',ruimte_id:'a',oppervlak:'noord',pakket_id:'gyproc_wand_profiel',hoeveelheid:null,opties:{}}];
 laadProject(p);bewaarLokaal(false);
});
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
const original=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
const nav=id=>`.studio-nav [data-studio-doel="${id}"]`;
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function current(id){await page.waitForFunction(id=>{const b=document.querySelector('.studio-nav [aria-current="location"]');return b?.dataset.studioDoel===id;},{},id);assert.equal(await page.$$eval('.studio-nav [aria-current="location"]',es=>es.length),1);}
assert(await page.$('.topbar .hoofdnavigatie'),'primary tabs integrated in app header');
await current('tekening');
await page.$eval('#tekenopties',e=>e.open=true);
await click(nav('ruimte-invoer'));await current('ruimte-invoer');
assert.equal(await page.$eval('#ruimte-invoer',e=>e.open),true);
assert.equal(await page.evaluate(()=>document.activeElement.parentElement.id),'ruimte-invoer');
assert(await page.evaluate(()=>document.querySelector('#ruimte-invoer summary').getBoundingClientRect().top>=document.querySelector('.studio-nav').getBoundingClientRect().bottom-2),'destination clears persistent navigation');
await page.$eval('#installatie-invoer',e=>e.open=true);
await page.evaluate(()=>window.BouwStudio.open('werk-invoer'));
assert.equal(await page.$eval('#installatie-invoer',e=>e.open),true,'inline edit retains the source catalog');
await click(nav('werk-invoer'));await current('werk-invoer');assert.equal(await page.$eval('#installatie-invoer',e=>e.open),false);assert.equal(await page.$eval('#ruimte-invoer',e=>e.open),false);
await click(nav('offertepaneel'));await current('offertepaneel');assert.equal(await page.$eval('#werk-invoer',e=>e.open),false);
await click(nav('tekening'));await current('tekening');
assert.equal(await page.$eval('#offertepaneel',e=>e.open),false);
assert.equal(await page.$eval('#tekenopties',e=>e.open),true,'camera/layer disclosure is preserved');
await page.$eval('#tekenopties',e=>e.open=false);
await click(nav('zijde'));await current('zijde');
await click('[data-hoofdtab="tarieven"]');await click('[data-hoofdtab="calculator"]');await current('zijde');
// Normal scrolling, not just clicks, updates the location highlight.
await page.evaluate(()=>{const el=document.querySelector('#tekening'),top=document.querySelector('.topbar').offsetHeight+document.querySelector('.studio-nav').offsetHeight+12;window.scrollTo({top:scrollY+el.getBoundingClientRect().top-top,behavior:'instant'});});
await page.mouse.wheel({deltaY:-1});await current('tekening');
await page.waitForFunction(()=>document.querySelector('.object-snelknop').hidden);
assert.equal(await page.$eval('.tekening-snelknop',e=>e.hidden),true,'no duplicate shortcut on the canvas');
await click(nav('werk-invoer'));await current('werk-invoer');
await page.waitForFunction(()=>!document.querySelector('.object-snelknop').hidden);
await click('.tekening-snelknop');await current('tekening');
await click('[data-ontwerpniveau="huis"]');await current('tekening');
assert.equal(await page.$eval('#studio-plaats',e=>e.textContent),'Huisplan');
assert.equal(await page.$eval(nav('tekening'),e=>e.getAttribute('aria-controls')),'huis-paneel');
await page.$eval('[data-huis-ruimte="b"]',e=>e.focus());await page.keyboard.press('Enter');await click('#huis-open');
await page.waitForFunction(()=>document.querySelector('#studio-plaats').textContent==='Keuken');
await click(nav('ruimte-invoer'));await current('ruimte-invoer');assert.equal(await page.$eval('#studio-stap',e=>e.textContent),'Maten');
await click('#bestand-menu summary');assert.equal(await page.$eval('#bestand-menu',e=>e.open),true);await page.keyboard.press('Escape');assert.equal(await page.$eval('#bestand-menu',e=>e.open),false);
assert.equal(await page.evaluate(()=>document.activeElement.parentElement.id),'bestand-menu');
await click('#bestand-menu summary');await click(nav('tekening'));assert.equal(await page.$eval('#bestand-menu',e=>e.open),false);
await page.evaluate(()=>status('Berekening mislukt — controleer de verbinding.'));
await page.waitForFunction(()=>!document.querySelector('#studio-feedback').hidden);
assert((await page.$eval('#studio-feedback',e=>e.textContent)).includes('mislukt'));
await page.evaluate(()=>status('Offerte bijgewerkt'));await page.waitForFunction(()=>document.querySelector('#studio-feedback').hidden);
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:900});await click(nav('tekening'));await current('tekening');
 await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
 await page.waitForFunction(()=>Math.abs(document.querySelector('.studio-nav').getBoundingClientRect().top-document.querySelector('.topbar').getBoundingClientRect().bottom)<3);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow at ${width}`);
 assert.equal(await page.$$eval('.studio-nav [aria-current="location"]',es=>es.length),1);
 if(width===390||width===1440){await click(nav('tekening'));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:out+`/navigation-${width}.png`,fullPage:true});}
}
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
await click(nav('werk-invoer'));await current('werk-invoer');await page.waitForFunction(()=>document.querySelector('#werk-invoer').getBoundingClientRect().top>=0);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'navigation changes no project data');
assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);
assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false,'no navigation in quote history');
assert.deepEqual(errors,[]);console.log('PASS: coherent routing and breadcrumb, native panel focus, scroll highlight, sticky rail, contextual house/room, preserved tabs/layers, menus, failure feedback, shortcut deduplication, smooth/reduced motion and 320–1440px layout; project and total unchanged');
}finally{await browser.close();}
