/* Contextual next-step regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/full_wizard_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-connection-wizard-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function next(){await page.click('#wizard-next');}async function type(selector,value){await page.$eval(selector,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(selector);await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.type(value);assert.equal(await page.$eval(selector,e=>e.value),value);}
await page.evaluate(()=>{const p=nieuwProject(),r=p.ruimtes[0];p.regels=[{id:'existing',ruimte_id:r.id,pakket_id:'gyproc_wand_profiel',oppervlak:'noord',opties:{}}];laadProject(p);});await page.waitForFunction(()=>state.rekenStatus==='ready');const before=await page.evaluate(()=>JSON.stringify(state.project));await next();assert.equal(await page.$eval('[name=lengte]',e=>e.readOnly),false);await type('[name=lengte]','5,2');await next();await type('[name=breedte]','4,1');await next();await type('[name=hoogte]','2,8');await next();assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);let accepts=false;page.on('dialog',async d=>{if(accepts)await d.accept();else await d.dismiss();});await next();assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);accepts=true;await next();await page.waitForFunction(()=>state.rekenStatus==='ready');assert.deepEqual(await page.evaluate(()=>{const r=actieveRuimte();return [r.lengte,r.breedte,r.hoogte,state.project.regels.length];}),[5.2,4.1,2.8,1]);await page.evaluate(()=>historieStap('undo'));await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);
await page.evaluate(()=>{const p=nieuwProject(),r=p.ruimtes[0];r.contour=[{id:'wand_a',x:0,y:0},{id:'wand_b',x:4,y:0},{id:'wand_c',x:4,y:3},{id:'wand_d',x:0,y:3}];laadProject(p);});await page.waitForFunction(()=>state.rekenStatus==='ready');await next();assert.equal(await page.$eval('[name=lengte]',e=>e.readOnly),true);assert((await page.$eval('#wizard-size .guided-page:not([hidden])',e=>e.textContent)).includes('Deze maat volgt'));const button=await page.$('#wizard-size .guided-page:not([hidden]) [data-ruimte-tekenen]');assert(button);await button.click();assert.equal(await page.$eval('#ruimte-vorm',e=>e.open),true);await page.$eval('#vorm-cancel',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click('#vorm-cancel');assert.deepEqual(errors,[]);console.log('PASS existing-room dimensions: real typing in all dimensions despite existing works, draft-only changes, explicit resize confirmation/cancel, preservation and undo, and an actionable explanation/editor for geometry-controlled dimensions');
}finally{await browser.close();}
