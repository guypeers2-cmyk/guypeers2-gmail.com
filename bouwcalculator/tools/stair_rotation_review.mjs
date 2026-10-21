/* Stair rotation regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/stair_rotation_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-stair-rotation-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
let requests=0;page.on('request',r=>{if(r.url().includes('/api/offerte'))requests++;});
await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function fixture(narrow=false){await page.evaluate(narrow=>{const p=nieuwProject(),r=p.ruimtes[0];r.lengte=narrow?1.2:4;r.trappen=[{id:'rotation-trap',naam:'Trap',x:narrow?.15:1.55,y:.3,breedte:.9,lengte:2.4,hoogte:2.5,richting:0,treden:14}];laadProject(p);BouwHuis.setLevel('ruimte');},narrow);await page.waitForFunction(()=>state.rekenStatus==='ready');}
await fixture();const original=await page.evaluate(()=>JSON.stringify(state.project)),price=await page.evaluate(()=>JSON.stringify(state.offerte.totalen));
await page.evaluate(()=>document.querySelector('[data-trap-edit]').click());const count=requests;
for(let i=1;i<=4;i++){await click('[data-trap-draai="1"]');assert.equal(await page.$eval('#trap-richting',e=>Number(e.value)),i*90%360);const center=await page.evaluate(()=>{const t={x:+document.querySelector('#trap-x').value,y:+document.querySelector('#trap-y').value,breedte:.9,lengte:2.4,richting:+document.querySelector('#trap-richting').value};const ps=BouwPlan.trapGeometrie(t).voet;return [ps.reduce((s,a)=>s+a[0],0)/4,ps.reduce((s,a)=>s+a[1],0)/4];});assert(Math.abs(center[0]-2)<1e-6&&Math.abs(center[1]-1.5)<1e-6);assert.equal(await page.$eval('#trap-fout',e=>e.hidden),true);assert(await page.$('#trap-voorbeeld .trap-object'));}
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(requests,count);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
await click('[data-trap-draai="-1"]');assert.equal(await page.$eval('#trap-richting',e=>+e.value),270);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
await page.evaluate(()=>document.querySelector('[data-trap-edit]').click());await click('[data-trap-draai="1"]');await click('#trap-form [type=submit]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>actieveRuimte().trappen[0].richting),90);await click('#plan-undo');assert.equal(await page.evaluate(()=>actieveRuimte().trappen[0].richting),0);await click('#plan-redo');assert.equal(await page.evaluate(()=>actieveRuimte().trappen[0].richting),90);await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>JSON.stringify(state.offerte.totalen)),price);
for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});await page.evaluate(()=>document.querySelector('[data-trap-edit]').click());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.$eval('[data-trap-draai="1"]',e=>e.getBoundingClientRect().height>=44),true);await click('[data-trap-draai="1"]');await click('#trap-sluit');}
await fixture(true);const narrow=await page.evaluate(()=>JSON.stringify(state.project));await page.evaluate(()=>document.querySelector('[data-trap-edit]').click());await click('[data-trap-draai="1"]');assert.equal(await page.$eval('#trap-fout',e=>e.hidden),false);await click('#trap-form [type=submit]');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),narrow);await click('[data-trap-draai="-1"]');assert.equal(await page.$eval('#trap-fout',e=>e.hidden),true);await click('#trap-sluit');assert.deepEqual(errors,[]);
console.log('PASS stair rotation: left/right 90°, preserved center, preview-only draft, cancel/save/undo/redo, invalid fit, no price changes and 320–1440px');
}finally{await browser.close();}
