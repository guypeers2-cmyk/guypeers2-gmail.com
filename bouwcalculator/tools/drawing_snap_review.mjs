/* Contextual next-step regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/drawing_snap_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-drawing-snap-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
await click('#wizard-content [data-ruimte-tekenen]');const original=await page.evaluate(()=>JSON.stringify(state.project));assert(await page.$eval('#vorm-haaks',e=>e.checked));
const values=await page.evaluate(()=>{const f=BouwRuimteVorm.snapPoint;return [f({x:4.04,y:2},[{x:0,y:0},{x:4,y:0}],null,.08,[8,8]),f({x:3.02,y:1.02},[{x:0,y:0},{x:2,y:2}],null,.08,[8,8]),f({x:4.03,y:3.02},[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],2,.08,[8,8],true),f({x:3.5,y:1.4},[{x:0,y:0},{x:4,y:0}],null,.08,[8,8])]});assert.equal(values[0].x,4);assert(Math.abs(values[1].x-3)<1e-10&&Math.abs(values[1].y-1)<1e-10);assert.equal(values[2].x,4);assert.equal(values[2].y,3);assert.equal(values[3].x,3.5);
await click('[data-vorm="vrij"]');await click('#vorm-snap');
async function point(x,y,alt=false){const p=await page.evaluate(({x,y})=>{const el=document.querySelector('#vorm-canvas'),L=Number(document.querySelector('#vorm-bereik-x').value),B=Number(document.querySelector('#vorm-bereik-y').value),s=Math.min(680/L,380/B),pt=el.createSVGPoint();pt.x=(800-L*s)/2+x*s;pt.y=(500-B*s)/2+y*s;const q=pt.matrixTransform(el.getScreenCTM());return {x:q.x,y:q.y};},{x,y});if(alt)await page.keyboard.down('Alt');await page.mouse.click(p.x,p.y);if(alt)await page.keyboard.up('Alt');}
await page.$eval('#vorm-canvas',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await point(.5,.5);await point(2.5,.53);let coords=await page.$$eval('#vorm-punten [data-vorm-coord="y"]',es=>es.map(e=>Number(e.value)));assert.equal(coords[0],coords[1]);await point(2.53,2);coords=await page.$$eval('#vorm-punten [data-vorm-coord="x"]',es=>es.map(e=>Number(e.value)));assert.equal(coords[1],coords[2]);assert((await page.$eval('#vorm-coord-status',e=>e.textContent)).includes('Hoek 3'));assert(await page.$('.vorm-snaplijn'));
await point(.5,2.03,true);coords=await page.$$eval('#vorm-punten [data-vorm-coord="y"]',es=>es.map(e=>Number(e.value)));assert(Math.abs(coords[3]-2.03)<.005);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
for(const width of [320,390,768]){await page.setViewport({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert(await page.$eval('#vorm-coord-status',e=>parseFloat(getComputedStyle(e).fontSize)>=16));}
await click('#vorm-annuleer');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.deepEqual(errors,[]);console.log('PASS drawing coordinates: readable HUD, axis/perpendicular/neighbor snapping, mouse drawing, Alt override, draft isolation, cancel and mobile widths');
}finally{await browser.close();}
