/* Direct opening insertion and house partition regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/easy_layout_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-easy-layout-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{const p=nieuwProject();p.huis={lengte:10,breedte:8,hoogte:2.5};Object.assign(p.ruimtes[0],{lengte:10,breedte:8,hoogte:2.5,huis_positie:{x:0,y:0}});laadProject(p);window.BouwHuis.setLevel('huis');});await page.waitForFunction(()=>state.rekenStatus==='ready');
const original=await page.evaluate(()=>JSON.stringify(state.project));
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function fill(s,v){await page.$eval(s,(e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},v);}
await click('#huis-splits');assert.equal(await page.$$('#huis-plan .indeling-preview').then(es=>es.length),2);
await fill('#huis-split-schuif',30);assert.equal(await page.$eval('#huis-split-waarde',e=>Number(e.value)),3);assert((await page.$eval('#huis-split-preview',e=>e.textContent)).includes('24'));
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
await page.setViewport({width:390,height:900});await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:out+'/house-partition-mobile.png'});await page.setViewport({width:1680,height:1100});
await click('[data-indeling-as="y"]');await fill('#huis-split-schuif',25);assert.equal(await page.$eval('#huis-split-waarde',e=>Number(e.value)),2);assert((await page.$eval('#huis-split-preview',e=>e.textContent)).includes('20'));
await click('#huis-snede-stop');assert.equal(await page.$$('#huis-plan .indeling-preview').then(es=>es.length),0);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await click('#huis-splits');await fill('#huis-split-schuif',30);await click('#huis-splits-form button[type="submit"]');assert.equal(await page.evaluate(()=>state.project.ruimtes.length),2);assert.deepEqual(await page.evaluate(()=>state.project.ruimtes.map(r=>r.lengte).sort()),[3,7]);
await click('#huis-splits');await click('[data-indeling-as="y"]');await click('#huis-splits-form button[type="submit"]');assert.equal(await page.evaluate(()=>state.project.ruimtes.length),3);
await click('#huis-undo');await click('#huis-undo');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await page.evaluate(()=>window.BouwHuis.setLevel('ruimte'));
await click('[data-opening-snel="Deur"]');assert.equal(await page.$eval('#opening-menu',e=>e.open),true);await page.select('#opening-wand','oost');await fill('#opening-breedte',1);
await click('#opening-form button[type="submit"]');await page.waitForFunction(()=>!document.querySelector('#opening-menu').open&&document.activeElement.closest('#plan-inspector'));
assert.deepEqual(await page.evaluate(()=>{const o=actieveRuimte().openingen[0];return [o.naam,o.muur,o.breedte,o.positie];}),['Deur','oost',1,3.5]);assert.equal(await page.evaluate(()=>planSelectie.type),'opening');
assert(await page.evaluate(()=>['noord','oost','zuid','west'].every(muur=>{const r={...actieveRuimte(),openingen:[{...actieveRuimte().openingen[0],muur}]},g=BouwPlan.openingGeometrie(r,0);return [g.a,g.b,g.c,g.d].flat().every(Number.isFinite);})));
await click('#plan-undo');assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0);
await click('[data-opening-snel="Raam"]');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#opening-menu').open);assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0);
await click('[data-opening-snel="Raam"]');await fill('#opening-breedte',20);await click('#opening-form button[type="submit"]');assert.equal(await page.$eval('#opening-fout',e=>e.hidden),false);assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0);
await fill('#opening-breedte',1.4);await fill('#opening-hoogte',1.1);await fill('#opening-onderkant',2);await click('#opening-form button[type="submit"]');assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0);
await fill('#opening-onderkant',1);await fill('#opening-positie',2.2);await click('#opening-form button[type="submit"]');assert.equal(await page.evaluate(()=>actieveRuimte().openingen[0].positie),2.2);
await click('[data-plan="aanzicht"]');await click('[data-aanzicht-vlak="west"]');await click('[data-opening-snel="Deur"]');await page.select('#opening-wand','oost');await click('#opening-form button[type="submit"]');assert.equal(await page.evaluate(()=>planVlak),'oost');assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),2);
await page.evaluate(()=>window.BouwHuis.setLevel('huis'));for(const view of ['2d','3d']){await click(`[data-huis-view="${view}"]`);assert.equal(await page.$$('#huis-plan .huis-opening').then(es=>es.length),2);assert(!(await page.$eval('#huis-plan',e=>e.innerHTML)).includes('NaN'));}const protectedState=await page.evaluate(()=>JSON.stringify(state.project));await click('#huis-splits');assert((await page.$eval('#huis-melding',e=>e.textContent)).includes('niets verwijderd'));assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),protectedState);
await page.evaluate(()=>window.BouwHuis.setLevel('ruimte'));
for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});await click('[data-opening-snel="Raam"]');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.$eval('#opening-menu',e=>e.scrollWidth<=e.clientWidth));if(width===390)await page.screenshot({path:out+'/opening-mobile.png'});await click('#opening-sluit');}
await page.evaluate(()=>{const p=nieuwProject();p.ruimtes[0].dak={as:'x',start:2,eind:3};p.ruimtes[0].hoogte=3;laadProject(p);});await click('[data-opening-snel="Raam"]');await page.select('#opening-wand','noord');await fill('#opening-onderkant',1.5);await fill('#opening-positie',0);await click('#opening-form button[type="submit"]');assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0,'rejects a window above the local sloped ceiling');await click('#opening-sluit');
assert.deepEqual(errors,[]);console.log('PASS: direct door/window form, centered placement, size/height validation, cancellation, selected inspector focus, undo, split slider/axis preview without mutation, repeated splits, protected rooms and 320–1440px dialogs');
}finally{await browser.close();}
