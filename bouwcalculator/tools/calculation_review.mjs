/* Optional room contour and sloped ceiling regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/vorm_review.mjs
 * Creates its own temporary browser profile; uses only that profile's local project.
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-calculation-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
const unhandled=[];page.on('pageerror',e=>unhandled.push(e.message));
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{const p=nieuwProject();p.regels=[{id:'w',ruimte_id:p.ruimtes[0].id,oppervlak:'noord',pakket_id:'gyproc_wand_profiel',hoeveelheid:null,opties:{}}];laadProject(p);});
await page.waitForFunction(()=>state.rekenStatus==='ready'&&state.offerte.regels.length===1);
const original=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
await page.evaluate(()=>{window.__engine=state.engine||window.BouwEngine;window.__fetch=fetch;state.engine=null;window.fetch=(url,opts)=>url==='/api/offerte'?Promise.resolve(new Response('{}',{status:500})):window.__fetch(url,opts);});
await page.evaluate(()=>bereken());assert.equal(await page.evaluate(()=>state.rekenStatus),'error');assert.equal(await page.$eval('#studio-totaal',e=>e.textContent),'—');assert.equal(await page.$eval('#bereken-melding',e=>e.hidden),false);
assert(errors.length>0,'expected simulated server error logged');errors.length=0;
await page.evaluate(()=>status('Opgeslagen in deze browser'));await page.waitForFunction(()=>!document.querySelector('#studio-feedback').hidden);assert.equal(await page.evaluate(()=>state.rekenStatus),'error','save success cannot clear calculation failure');
await page.click('.studio-room-open');assert.equal(await page.$eval('.studio-room-price',e=>e.textContent),'—');await page.click('#studio-rooms-close');
await page.evaluate(()=>{window.__prints=0;window.print=()=>window.__prints++;});
await page.click('#bestand-menu summary');await page.click('#btn-print');assert.equal(await page.evaluate(()=>window.__prints),0,'app print rejects stale quote');
for(const width of [320,390,1440]){await page.setViewport({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('details[open]')].map(e=>['open',e.id]).concat([...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.id||e.className,e.getBoundingClientRect().width]).slice(0,14)))));if(width===390){await page.$eval('#bereken-melding',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:out+'/calculation-error-mobile.png'});}}
await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await page.emulateMediaType('print');assert.equal(await page.$eval('#bereken-melding',e=>getComputedStyle(e).display),'block','native print gets explicit stale-data warning');await page.emulateMediaType('screen');await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
await page.evaluate(()=>{window.fetch=(url,opts)=>url==='/api/offerte'?Promise.resolve(new Response(JSON.stringify(window.__engine.berekenOfferte(JSON.parse(opts.body).project)),{status:200})):window.__fetch(url,opts);});
await page.$eval('#bereken-opnieuw',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click('#bereken-opnieuw');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.$eval('#bereken-melding',e=>e.hidden),true);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);
await page.evaluate(()=>status('Opslaan mislukt'));await page.click('.studio-room-open');assert((await page.$eval('.studio-room-price',e=>e.textContent)).includes('€'),'save error does not invalidate calculated prices');await page.click('#studio-rooms-close');
// A response already in flight must not publish after a new input was debounced.
await page.evaluate(()=>{window.fetch=(url,opts)=>url==='/api/offerte'?new Promise(resolve=>window.__resolve=payload=>resolve(new Response(JSON.stringify(payload),{status:200}))):window.__fetch(url,opts);window.__old=bereken();});
await page.evaluate(()=>{planBerekening();clearTimeout(state.berekenTimer);const stale=window.__engine.berekenOfferte(state.project);stale.totalen.totaal=999999;window.__resolve(stale);});await page.evaluate(()=>window.__old);
assert.equal(await page.evaluate(()=>state.rekenStatus),'pending');assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total,'stale response discarded before next request starts');assert.equal(await page.$eval('#studio-totaal',e=>e.textContent),'…');
await page.evaluate(()=>{window.__next=bereken();window.__resolve(window.__engine.berekenOfferte(state.project));});await page.evaluate(()=>window.__next);assert.equal(await page.evaluate(()=>state.rekenStatus),'ready');
await page.click('#bestand-menu summary');await page.click('#btn-print');assert.equal(await page.evaluate(()=>window.__prints),1,'current quote can print');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);assert.deepEqual(unhandled,[]);assert.deepEqual(errors,[]);
console.log('PASS: independent calculation/save state, stale-price masking, retry recovery, app/native print protection, immediate debounce invalidation of old responses and unchanged project/pricing/history');
}finally{await browser.close();}
