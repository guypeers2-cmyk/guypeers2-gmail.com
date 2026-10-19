/* Free partition preview and boundary interaction regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/free_cut_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-free-cut-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
let requests=0;page.on('request',r=>{if(r.url().includes('/api/offerte'))requests++;});
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function fixture(concave=false){await page.evaluate(concave=>{const p=nieuwProject(),r=p.ruimtes[0];p.huis={lengte:10,breedte:8,hoogte:2.5};Object.assign(r,{lengte:10,breedte:8,hoogte:2.5,huis_positie:{x:0,y:0}});if(concave){const ps=[{x:0,y:0},{x:10,y:0},{x:10,y:3},{x:3,y:3},{x:3,y:8},{x:0,y:8}].map((p,i)=>({...p,id:'wand_'+i}));p.huis.contour=ps;r.contour=ps;}laadProject(p);window.BouwHuis.setLevel('huis');bewaarLokaal(false);},concave);await page.waitForFunction(()=>state.rekenStatus==='ready');}
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function start(){await click('#huis-splits');if(!await page.$eval('#huis-indeling-precies',e=>e.open))await click('#huis-indeling-precies summary');await click('#huis-snede-start');}
async function point(x,y,touch=false){await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));const p=await page.evaluate(([x,y])=>{const svg=document.querySelector('#huis-plan svg'),p=svg.createSVGPoint();p.x=+svg.dataset.huisX+x*(+svg.dataset.huisSchaal);p.y=+svg.dataset.huisY+y*(+svg.dataset.huisSchaal);const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
const count=()=>page.$$eval('#huis-plan .huis-snede-punt',es=>es.length),parts=()=>page.$$eval('#huis-plan .indeling-preview',es=>es.length);
await fixture();const original=await page.evaluate(()=>JSON.stringify(state.project)),beforeRequests=requests;
await start();assert.equal(await page.$eval('#huis-splits-form [type=submit]',e=>e.disabled),true);await point(5,4);assert.equal(await count(),0);assert((await page.$eval('#huis-melding',e=>e.textContent)).includes('dichter'));
await point(0,2);assert.equal(await count(),1);await point(0,2);assert.equal(await count(),1);await point(0,6);assert.equal(await parts(),0);assert.equal(await page.$eval('#huis-splits-form [type=submit]',e=>e.disabled),true);
await click('#huis-snede-terug');assert.equal(await count(),1);await point(10,5);assert.equal(await parts(),2);assert.equal(await page.$eval('#huis-splits-form [type=submit]',e=>e.disabled),false);assert((await page.$eval('#huis-split-preview',e=>e.textContent)).includes('Wand 10,44 m'));
const info=await page.$eval('#huis-split-preview',e=>e.textContent);await point(4,4);assert.equal(await count(),2);assert.equal(await page.$eval('#huis-split-preview',e=>e.textContent),info,'third tap preserves completed preview');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);assert.equal(requests,beforeRequests);
await page.focus('#huis-plan');await page.keyboard.press('Backspace');assert.equal(await count(),1);assert.equal(await parts(),0);await point(10,5);await page.focus('#huis-naam-a');await page.keyboard.type('Keuken');await page.keyboard.press('Backspace');assert.equal(await page.$eval('#huis-naam-a',e=>e.value),'Keuke');assert.equal(await count(),2,'text backspace never undoes a point');
await page.focus('#huis-plan');await page.keyboard.press('Escape');assert.equal(await parts(),0);assert.equal(await page.$eval('#huis-splits-invoer',e=>e.open),false);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await start();await point(0,2);await point(10,5);await click('#huis-splits-form [type=submit]');assert.equal(await page.evaluate(()=>state.project.ruimtes.length),2);assert.equal(await page.evaluate(()=>state.project.ruimtes.reduce((a,r)=>a+Math.abs(BouwVorm.area(BouwVorm.points(r))),0)),80);await click('#huis-undo');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await page.setViewport({width:390,height:900,isMobile:true,hasTouch:true});await page.waitForNetworkIdle({idleTime:200});await fixture();const mobileOriginal=await page.evaluate(()=>JSON.stringify(state.project));await start();await point(0,2,true);await point(10,5,true);assert.equal(await parts(),2);await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:out+'/free-cut-mobile.png'});await click('#huis-snede-terug');assert.equal(await count(),1);await point(10,6,true);assert.equal(await parts(),2);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),mobileOriginal);await click('#huis-snede-stop');assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
await fixture(true);await start();await point(10,1,true);await point(1,8,true);assert.equal(await parts(),0);assert.equal(await page.$eval('#huis-splits-form [type=submit]',e=>e.disabled),true);assert((await page.$eval('#huis-split-preview',e=>e.textContent)).includes('binnen'));await click('#huis-snede-terug');await point(0,1,true);assert.equal(await parts(),2);assert.equal(await page.$eval('#huis-splits-form [type=submit]',e=>e.disabled),false);
assert.deepEqual(errors,[]);console.log('PASS: free angled split area/length preview, same-wall/outside-concave rejection, far/duplicate tap guards, third tap preservation, point undo/button/Backspace, native text editing, Escape, real mobile touch, confirmed geometry/undo and no draft project/history/API mutation');
}finally{await browser.close();}
