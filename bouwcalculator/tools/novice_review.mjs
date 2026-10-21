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
let requests=0;page.on('request',r=>{if(r.url().includes('/api/offerte'))requests++;});await page.setViewport({width:390,height:844});
await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
await page.$eval('#wizard-size [name=lengte]',e=>e.value='3,5');await page.$eval('#wizard-size [name=hoogte]',e=>e.value='2.6');await click('#wizard-next');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>actieveRuimte().lengte),3.5);assert.equal(await page.evaluate(()=>actieveRuimte().hoogte),2.6);await click('[data-wizard-skip]');await click('#wizard-yes');const before=await page.evaluate(()=>JSON.stringify(state.project)),calls=requests;
await click('[data-wizard-package="elek_sleuf"]');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);assert.equal(requests,calls);await page.$eval('#wizard-quantity',e=>{e.value='5,25';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);assert.equal(requests,calls);assert((await page.$eval('#wizard-item-price',e=>e.textContent)).includes('inclusief btw'));await click('[data-wizard-step="4"]');assert.equal(await page.$eval('#wizard-title',e=>e.textContent),'Elektriciteit toevoegen?');assert((await page.$eval('#wizard-error',e=>e.textContent)).includes('Bewaar'));await click('#wizard-item [type=submit]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.regels.at(-1).hoeveelheid),5.25);
await click('[data-wizard-package="elek_stopcontact"]');await page.$eval('#wizard-quantity',e=>{e.value='1,5';e.dispatchEvent(new Event('input',{bubbles:true}));});const count=await page.evaluate(()=>state.project.regels.length);await click('#wizard-item [type=submit]');assert.equal(await page.evaluate(()=>state.project.regels.length),count);assert((await page.$eval('#wizard-error',e=>e.textContent)).includes('hele stuks'));await click('#wizard-item-cancel');assert.equal(await page.evaluate(()=>state.project.regels.length),count);
for(const width of [320,390]){await page.setViewport({width,height:844});await click('[data-wizard-package="elek_sleuf"]');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await click('#wizard-item-cancel');}await page.emulateMediaType('print');assert.equal(await page.$eval('#wizard',e=>getComputedStyle(e).display),'none');await page.emulateMediaType('screen');assert.deepEqual(errors,[]);console.log('PASS novice mobile: decimal comma/dot, no quote/API mutation on choosing or preview, price before confirm, unsaved navigation guard, fractional piece rejection, cancellation, 320/390px and print');
}finally{await browser.close();}
