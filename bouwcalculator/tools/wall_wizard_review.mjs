/* Contextual next-step regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/wall_wizard_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-wall-wizard-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.setViewport({width:390,height:844});await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function next(){if(await page.$('#wizard-size')){while(await page.$eval('#wizard-size',f=>Number(f.dataset.guidedPage)<Number(f.dataset.guidedLast)))await click('#wizard-next');}await click('#wizard-next');}
await next();assert((await page.$eval('#wizard-content',e=>e.textContent)).includes('4 wanden'));await next();assert((await page.$eval('#wizard-context',e=>e.textContent)).includes('Wand 1 van 4'));assert.equal(await page.evaluate(()=>planVlak),'noord');await click('[data-wall-opening="Raam"]');assert.equal(await page.$eval('#opening-wand',e=>e.value),'noord');assert.equal(await page.$eval('#opening-wand',e=>e.disabled),true);await click('#opening-sluit');await next();await page.$eval('#point-number',e=>e.value='2');await next();const before=await page.evaluate(()=>JSON.stringify(state.project));
for(const x of ['1,25','2,25']){await click('[data-point="socket"]');await click('[data-point="single"]');await click('[data-point="inbouw"]');await page.$eval('#point-x',e=>e.value='99');await page.$eval('#point-z',e=>e.value='0,3');await next();assert((await page.$eval('#point-error',e=>e.textContent)).includes('wand'));await page.$eval('#point-x',(e,x)=>e.value=x,x);await next();await click('[data-point="trench-no"]');await click('[data-point="cable-none"]');await next();await page.waitForFunction(()=>state.rekenStatus==='ready');await next();}
assert.deepEqual(await page.evaluate(()=>{const w=state.project.regels[0];return [w.oppervlak,w.hoeveelheid,w.visualisatie.x,w.visualisatie.y,w.visualisatie.z];}),['noord',1,1.25,0,.3]);assert.equal(await page.evaluate(()=>state.project.regels[1].visualisatie.x),2.25);await click('[data-wizard-skip]');await click('#wizard-yes');await click('[data-wizard-package="gyproc_wand_profiel"]');assert.equal(await page.$$('#wizard-surface option').then(es=>es.length),1);while(await page.$eval('#wizard-item',f=>Number(f.dataset.guidedPage)<Number(f.dataset.guidedLast)))await click('#wizard-item [data-guided-next]');await click('#wizard-item [type=submit]');await page.waitForFunction(()=>state.rekenStatus==='ready');await next();await click('[data-wizard-skip]');assert((await page.$eval('#wizard-content',e=>e.textContent)).includes('Wand 1 controleren'));await next();assert((await page.$eval('#wizard-context',e=>e.textContent)).includes('Wand 2 van 4'));assert.equal(await page.evaluate(()=>planVlak),'oost');
for(let i=1;i<4;i++){await next();await click('[data-point="skip"]');await click('[data-wizard-skip]');await click('[data-wizard-skip]');await click('[data-wizard-skip]');await next();}
assert((await page.$eval('#wizard-title',e=>e.textContent)).includes('plafond'));await click('#wizard-yes');await click('[data-wizard-package="elek_lichtpunt"]');await page.$eval('#wizard-ceil-x',e=>e.value='2');await page.$eval('#wizard-ceil-y',e=>e.value='1');while(await page.$eval('#wizard-item',f=>Number(f.dataset.guidedPage)<Number(f.dataset.guidedLast)))await click('#wizard-item [data-guided-next]');await click('#wizard-item [type=submit]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.regels.at(-1).oppervlak),'plafond');await next();await click('[data-wizard-skip]');assert.equal(await page.$eval('#wizard-title',e=>e.textContent),'Controleer je offerte');assert.equal(await page.evaluate(()=>state.project.regels.length),4);
for(const width of [320,390,768]){await page.setViewport({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}assert.deepEqual(errors,[]);console.log('PASS wall wizard: plan confirmation and wall count, locked openings/current wall, explicit valid placement, quantities, Gyproc, all four walls, ceiling points, quote and mobile widths');
}finally{await browser.close();}
