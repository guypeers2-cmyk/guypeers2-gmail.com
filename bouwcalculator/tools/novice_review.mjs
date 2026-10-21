/* Contextual next-step regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/novice_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-novice-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.setViewport({width:390,height:844});await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}async function next(){if(await page.$('#wizard-size')){while(await page.$eval('#wizard-size',f=>Number(f.dataset.guidedPage)<Number(f.dataset.guidedLast)))await click('#wizard-next');}await click('#wizard-next');}async function value(s,v){await page.$eval(s,(e,v)=>e.value=v,v);}
await value('#wizard-size [name=lengte]','3,5');await value('#wizard-size [name=hoogte]','2.6');await next();await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>actieveRuimte().lengte),3.5);await next();await next();const before=await page.evaluate(()=>JSON.stringify(state.project));await value('#point-number','1,5');await next();assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);assert((await page.$eval('#wizard-title',e=>e.textContent)).includes('aansluitpunten'));await value('#point-number','1');await next();await click('[data-point="switch"]');await click('[data-point="inbouw"]');await value('#point-x','99');await value('#point-z','0,3');await next();assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);await value('#point-x','0,25');await next();await click('[data-point="trench-unknown"]');await click('[data-point="cable-unknown"]');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);await next();await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.regels.length),1);assert((await page.evaluate(()=>state.project.regels[0].notitie)).includes('Sleuf'));await page.evaluate(()=>historieStap('undo'));await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.regels.length),0);await click('#point-save [type=submit]');assert((await page.$eval('#point-error',e=>e.textContent)).includes('verwijderd'));for(const width of [320,390]){await page.setViewport({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}await page.emulateMediaType('print');assert.equal(await page.$eval('#wizard',e=>getComputedStyle(e).display),'none');assert.deepEqual(errors,[]);console.log('PASS novice connection flow: comma/dot, whole point count, bounds, no mutation before confirmation, atomic undo and removed-source save guard');
}finally{await browser.close();}
