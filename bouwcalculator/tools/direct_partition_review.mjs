/* Direct draggable partition regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/direct_partition_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-direct-partition-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function fixture(){await page.evaluate(()=>{const p=nieuwProject();p.huis={lengte:10,breedte:8,hoogte:2.5};Object.assign(p.ruimtes[0],{lengte:10,breedte:8,hoogte:2.5,huis_positie:{x:0,y:0}});laadProject(p);BouwHuis.setLevel('huis');bewaarLokaal(false);});await page.waitForFunction(()=>state.rekenStatus==='ready');}
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function drag(axis,target,cancel=false,touch=false){await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));const b=await(await page.$('.huis-cut-greep')).boundingBox();const to=await page.evaluate(([axis,target])=>{const svg=document.querySelector('#huis-plan svg'),p=svg.createSVGPoint();p.x=+svg.dataset.huisX+(axis==='x'?target:5)*+svg.dataset.huisSchaal;p.y=+svg.dataset.huisY+(axis==='y'?target:4)*+svg.dataset.huisSchaal;const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[axis,target]);if(touch){await page.touchscreen.touchStart(b.x+b.width/2,b.y+b.height/2);await page.touchscreen.touchMove(to.x,to.y);await page.touchscreen.touchEnd();}else{await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:5});if(cancel)await page.keyboard.press('Escape');await page.mouse.up();}}
await fixture();const original=await page.evaluate(()=>JSON.stringify(state.project));await click('#huis-indelen-direct [data-indeling-as="x"]');assert(await page.$('[data-huis-cut]'));await drag('x',3);assert.equal(await page.$eval('#huis-split-waarde',e=>Number(e.value)),3);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
await drag('x',7,true);assert.equal(await page.$eval('#huis-split-waarde',e=>Number(e.value)),3,'Escape restores draft');
await page.$eval('[data-huis-cut]',e=>e.focus());await page.keyboard.press('ArrowRight');assert.equal(await page.$eval('#huis-split-waarde',e=>Number(e.value)),3.05);
await click('#huis-indelen-direct [data-indeling-as="y"]');await drag('y',2);assert.equal(await page.$eval('#huis-split-waarde',e=>Number(e.value)),2);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await click('#huis-splits-form [type=submit]');assert.equal(await page.evaluate(()=>state.project.ruimtes.length),2);assert.deepEqual(await page.evaluate(()=>state.project.ruimtes.map(r=>r.breedte).sort()),[2,6]);await click('#huis-undo');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await page.setViewport({width:390,height:900,isMobile:true,hasTouch:true});await page.waitForNetworkIdle({idleTime:200});await fixture();const mobileOriginal=await page.evaluate(()=>JSON.stringify(state.project));await click('#huis-indelen-direct [data-indeling-as="x"]');await drag('x',4,false,true);assert.equal(await page.$eval('#huis-split-waarde',e=>Number(e.value)),4);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),mobileOriginal);await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:out+'/direct-partition-mobile.png'});
assert.deepEqual(errors,[]);console.log('PASS: direct partition entry, mouse/touch drag in both axes, draft-only updates, Escape rollback, keyboard precision, confirmation and project undo');
}finally{await browser.close();}
