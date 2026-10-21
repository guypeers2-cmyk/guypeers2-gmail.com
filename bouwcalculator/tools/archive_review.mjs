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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-archive-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{
 state.opslag='lokaal';const rows=[];
 for(let i=0;i<23;i++){const p=nieuwProject();p.naam=i===0?'Café <test>':`Verbouwing ${i}`;p.klant=i===0?'Janssens':'Peeters';rows.push({id:'saved'+i,naam:p.naam,klant:p.klant,ruimtes:1,gewijzigd:`2026-10-${String(i+1).padStart(2,'0')}T12:00`,project:p});}
 localStorage.setItem(OPSLAG_LIJST,JSON.stringify(rows));window.__fetch=fetch;
});
const original=await page.evaluate(()=>JSON.stringify(state.project));
async function open(){await page.click('#bestand-menu summary');await page.click('#btn-openen');await page.waitForFunction(()=>document.querySelector('#modal-achtergrond').open);}
async function query(text){await page.$eval('#archief-zoeken',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},text);}
await open();assert.equal(await page.evaluate(()=>document.activeElement.id),'archief-zoeken');assert.equal(await page.$$eval('.projectregel',es=>es.length),23);assert.equal(await page.$eval('[data-actie="project-laden"]',e=>e.dataset.id),'saved22');
await query('cafe');assert.equal(await page.$$eval('.projectregel',es=>es.length),1);assert.equal(await page.$('#modal-inhoud test'),null);assert((await page.$eval('.projectregel .naam',e=>e.textContent)).includes('Café <test>'));
await query('JANSSENS');assert.equal(await page.$$eval('.projectregel',es=>es.length),1);await query('not found');assert.equal(await page.$$eval('.projectregel',es=>es.length),0);assert((await page.$eval('#modal-inhoud',e=>e.textContent)).includes('Geen offertes gevonden'));
await query('Peeters');await page.select('#archief-sorteren','naam');assert.equal(await page.$eval('[data-actie="project-laden"]',e=>e.dataset.id),'saved1');
await page.focus('#archief-zoeken');await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.actie),'project-laden');
await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#modal-achtergrond').hidden);await page.waitForFunction(()=>document.activeElement.matches('#bestand-menu summary'));
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:900});await open();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert(await page.$eval('#modal-inhoud',e=>e.scrollHeight>e.clientHeight),'long results scroll independently');
 assert(await page.$eval('#archief-zoeken',e=>e.getBoundingClientRect().top>0));
 assert(await page.$eval('#modal-sluiten',e=>e.getBoundingClientRect().bottom<=innerHeight));
 if(width===390)await page.screenshot({path:out+'/archive-mobile.png'});
 await page.click('#modal-sluiten');await page.waitForFunction(()=>document.querySelector('#modal-achtergrond').hidden);
}
await open();await query('cafe');page.once('dialog',d=>d.dismiss());await page.click('[data-actie="project-verwijderen"]');assert.equal(await page.$$eval('.projectregel',es=>es.length),1);
page.once('dialog',d=>d.accept());await page.click('[data-actie="project-verwijderen"]');await page.waitForFunction(()=>document.querySelector('#archief-aantal').textContent==='0 van 22 offertes');assert.equal(await page.$eval('#archief-zoeken',e=>e.value),'cafe');await page.click('#modal-sluiten');
await open();await query('Verbouwing 2');
await page.evaluate(()=>{state.project.naam='Nog niet bewaard';});const draft=await page.evaluate(()=>JSON.stringify(state.project));
page.once('dialog',d=>d.dismiss());await page.click('[data-actie="project-laden"][data-id="saved2"]');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),draft);assert.equal(await page.$eval('#modal-achtergrond',e=>e.open),true);
page.once('dialog',d=>d.accept());await page.click('[data-actie="project-laden"][data-id="saved2"]');await page.waitForFunction(()=>state.projectId==='saved2'&&!document.querySelector('#modal-achtergrond').open);await page.waitForFunction(()=>document.activeElement.id==='tekening');
const loaded=await page.evaluate(()=>JSON.stringify(state.project));
// Failed server listing and a delayed file open must never destroy current work.
await page.evaluate(()=>{state.opslag='server';window.fetch=(url,opts)=>url==='/api/projecten'?Promise.resolve(new Response('{}',{status:500})):window.__fetch(url,opts);});
await open();await page.waitForFunction(()=>!document.querySelector('#archief-opnieuw').hidden);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),loaded);
await page.evaluate(()=>{window.fetch=(url,opts)=>url==='/api/projecten'?Promise.resolve(new Response(JSON.stringify({projecten:[{id:'slow',naam:'Langzame offerte',klant:'Test',ruimtes:1}]}),{status:200})):url==='/api/projecten/slow'?new Promise(resolve=>window.__finish=()=>resolve(new Response(JSON.stringify({project:nieuwProject()}),{status:200}))):window.__fetch(url,opts);});
await page.click('#archief-opnieuw');await page.waitForSelector('[data-id="slow"]');
await page.evaluate(()=>{const previous=window.fetch;window.fetch=(url,opts)=>url==='/api/projecten/verwijder'?Promise.resolve(new Response('{}',{status:500})):previous(url,opts);});
page.once('dialog',d=>d.accept());await page.click('[data-actie="project-verwijderen"]');await page.waitForFunction(()=>document.querySelector('#archief-feedback').textContent.includes('Verwijderen mislukt'));assert.equal(await page.$$eval('.projectregel',es=>es.length),1);
await page.click('[data-actie="project-laden"]');await page.click('#modal-sluiten');await page.evaluate(()=>window.__finish());
await page.waitForFunction(()=>document.querySelector('#modal-achtergrond').hidden);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),loaded,'closed archive ignores late file responses');
assert.deepEqual(errors,[]);console.log('PASS: saved quote search/name/client/accents, natural sorting, escaped metadata, native Escape/focus, independent scrolling, delete confirmation and retained filters, opening focus, listing failure/retry, late-response cancellation and 320–1440px');
}finally{await browser.close();}
