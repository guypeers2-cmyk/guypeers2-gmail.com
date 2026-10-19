/* Gyproc board visualization regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/panels_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-panels-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function fixture(shape='rectangle'){
await page.evaluate(shape=>{const p=nieuwProject(),r=p.ruimtes[0];p.huis={lengte:8,breedte:6,hoogte:3};r.huis_positie={x:0,y:0};if(shape==='concave')Object.assign(r,{lengte:5,breedte:4,hoogte:3,contour:[[0,0],[5,0],[5,2],[2,2],[2,4],[0,4]].map(([x,y],i)=>({id:'wand_'+i,x,y})),dak:{as:'x',start:2,eind:3}});if(shape==='lean')r.wand_helling={noord:.4};const walls=BouwVorm.edges(r);r.openingen=[{naam:'Deur',muur:walls[0].id,breedte:.9,hoogte:2.1,positie:.3,borstwering:0}];p.regels=[{id:'g1',ruimte_id:r.id,oppervlak:walls[0].id,pakket_id:'gyproc_wand_profiel',opties:{}},{id:'g2',ruimte_id:r.id,oppervlak:'plafond',pakket_id:'gyproc_plafond',opties:{}},{id:'g3',ruimte_id:r.id,oppervlak:walls[1].id,pakket_id:'gyproc_direct',opties:{}},{id:'g4',ruimte_id:r.id,oppervlak:walls.at(-1).id,pakket_id:'gyproc_voegafwerking',opties:{}}];laadProject(p);BouwHuis.setLevel('ruimte');},shape);await page.waitForFunction(()=>state.rekenStatus==='ready');}
await fixture();assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);const original=await page.evaluate(()=>JSON.stringify(state.project)),price=await page.evaluate(()=>JSON.stringify(state.offerte.totalen));assert(await page.$('#plan .gyproc-plan-naad'));
await click('[data-plan="isometrie"]');assert(await page.$('#plan pattern'));await page.$eval('#plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:out+'/panels-3d.png'});assert.equal(await page.$$('#plan .gyproc-platen[data-gyproc-vlak="west"]').then(x=>x.length),0);await page.evaluate(()=>{planVlak='noord';renderPlan();});await click('[data-plan="aanzicht"]');assert.equal(await page.$$('#plan .gyproc-platen').then(x=>x.length),1);assert.equal(await page.$eval('#plan .gyproc-platen',e=>e.dataset.plaatLengte),'2.6');assert.equal(await page.$$('#plan .gyproc-platen mask polygon[fill="black"]').then(x=>x.length),1);await page.$eval('#plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:out+'/panels-front.png'});
await page.evaluate(()=>{planVlak='oost';renderPlan();});assert.equal(await page.$eval('#plan .gyproc-platen',e=>e.dataset.plaatLengte),'2.4');await click('#tekenopties > summary');await click('[data-plan-laag="platen"]');assert.equal(await page.$$('#plan .gyproc-platen').then(x=>x.length),0);await click('[data-plan-laag="platen"]');assert.equal(await page.$$('#plan .gyproc-platen').then(x=>x.length),1);await click('[data-plan-laag="afwerking"]');assert.equal(await page.$$('#plan .gyproc-platen').then(x=>x.length),0);await click('[data-plan-laag="afwerking"]');
for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert(!(await page.$eval('#plan svg',e=>e.innerHTML)).includes('NaN'));}}
assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>JSON.stringify(state.offerte.totalen)),price);
await page.evaluate(()=>BouwHuis.setLevel('huis'));for(const view of ['2d','3d']){await click(`[data-huis-view="${view}"]`);assert.equal(await page.$$('#huis-plan .gyproc-platen').then(x=>x.length),3);}
for(const shape of ['concave','lean']){await fixture(shape);for(const view of ['plattegrond','isometrie','aanzicht']){await page.evaluate(()=>{planVlak=BouwVorm.edges(actieveRuimte())[0].id;renderPlan();});await click(`[data-plan="${view}"]`);assert(await page.$('#plan .gyproc-platen'));assert(!(await page.$eval('#plan svg',e=>e.innerHTML)).includes('NaN'));}if(shape==='concave'){await click('[data-aanzicht-vlak="plafond"]');assert(await page.$('#plan pattern'));}}
assert.deepEqual(errors,[]);console.log('PASS Gyproc panel-size seams in plan/3D/elevation/house, GGL dimensions, openings masked, concave/sloped/leaning geometry, layer toggles, 320–1440px and unchanged model/price');
}finally{await browser.close();}
