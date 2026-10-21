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
await page.setViewport({width:320,height:700,isMobile:true,hasTouch:true});await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);let accept=false;page.on('dialog',d=>accept?d.accept():d.dismiss());
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}async function visible(){for(const selector of ['#btn-nieuw','#btn-project-verwijderen']){assert.equal(await page.$eval(selector,e=>!!e.getClientRects().length),true);const b=await page.$(selector),r=await b.boundingBox();assert(r.height>=48&&r.width>=48);}assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
await visible();await click('#wizard-next');await visible();const ids=await page.evaluate(async()=>{state.opslag='lokaal';state.project.naam='Te verwijderen';await opslaan();const other=lokaalOpslaan({...JSON.parse(JSON.stringify(state.project)),naam:'Ander project'});return {current:state.projectId,other};});assert(ids.current&&ids.other);const before=await page.evaluate(()=>JSON.stringify(state.project));await click('#btn-project-verwijderen svg');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);accept=true;await click('#btn-project-verwijderen svg');await page.waitForFunction(()=>state.rekenStatus==='ready'&&!document.querySelector('#btn-project-verwijderen').disabled);assert.equal(await page.evaluate(()=>state.projectId),null);assert.equal(await page.evaluate(id=>lokaleProjecten(true).some(p=>p.id===id),ids.current),false);assert.equal(await page.evaluate(id=>lokaleProjecten(true).some(p=>p.id===id),ids.other),true);assert.equal(await page.evaluate(()=>state.project.naam),'Nieuwe offerte');await visible();
await page.evaluate(()=>wijzig(()=>state.project.naam='Onbewaard project'));await page.waitForFunction(()=>state.rekenStatus==='ready');accept=false;await click('#btn-nieuw span');assert.equal(await page.evaluate(()=>state.project.naam),'Onbewaard project');accept=true;await click('#btn-nieuw span');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.naam),'Nieuwe offerte');assert.equal(await page.evaluate(id=>lokaleProjecten(true).some(p=>p.id===id),ids.other),true);
await page.evaluate(()=>{state.project.naam='Serverfout behouden';state.projectId='test-owned-id';state.opslag='server';});await page.evaluate(()=>{window.originalFetch=window.fetch;window.fetch=(url,...args)=>String(url).includes('/api/projecten/verwijder')?Promise.resolve(new Response(JSON.stringify({fout:'Testfout'}),{status:200,headers:{'Content-Type':'application/json'}})):originalFetch(url,...args);});await click('#btn-project-verwijderen');await page.waitForFunction(()=>!document.querySelector('#btn-project-verwijderen').disabled);assert.equal(await page.evaluate(()=>state.project.naam),'Serverfout behouden');assert.equal(await page.evaluate(()=>state.projectId),'test-owned-id');await page.evaluate(()=>window.fetch=originalFetch);
for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});await visible();}assert.deepEqual(errors,[]);console.log('PASS permanent project header: 48px buttons at all widths, wizard visibility, nested-icon clicks, confirm/cancel, saved-current deletion only, unrelated archive preservation, new project reset and server failure retains current work');
}finally{await browser.close();}
