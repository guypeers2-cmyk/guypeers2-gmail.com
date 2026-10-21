/* Contextual next-step regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/wall_shape_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-wall-shape-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
await click('#wizard-content [data-ruimte-tekenen]');await click('[data-vorm="l"]');await click('#vorm-toepassen');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>ruimteWanden().length),6);await click('#wizard-next');assert((await page.$eval('#wizard-content',e=>e.textContent)).includes('6 wanden'));await click('#wizard-next');for(let i=0;i<6;i++){assert((await page.$eval('#wizard-context',e=>e.textContent)).includes(`Wand ${i+1} van 6`));assert.equal(await page.evaluate(()=>planVlak),await page.evaluate(i=>ruimteWanden()[i].sleutel,i));await click('#wizard-next');await click('[data-point="skip"]');for(let j=0;j<3;j++)await click('[data-wizard-skip]');await click('#wizard-next');}assert((await page.$eval('#wizard-title',e=>e.textContent)).includes('plafond'));assert.equal(await page.evaluate(()=>state.project.regels.length),0);await page.evaluate(()=>{const p=nieuwProject();laadProject(p);});await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>ruimteWanden().length),4);assert.equal(await page.$eval('#wizard-title',e=>e.textContent),'Hoe groot is de ruimte?');assert.deepEqual(errors,[]);console.log('PASS six-wall custom shape, derived wall count, stable wall IDs, all walls visited without invoice additions, separate ceiling and project reset');
}finally{await browser.close();}
