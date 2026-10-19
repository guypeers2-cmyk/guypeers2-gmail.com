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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-storage-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{state.opslag='lokaal';window.__setItem=Storage.prototype.setItem;window.__fetch=fetch;});
const original=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
await page.evaluate(()=>{Storage.prototype.setItem=function(key,value){if(key===OPSLAG_SLEUTEL)throw new DOMException('Full','QuotaExceededError');return window.__setItem.call(this,key,value);};bewaarLokaal(false);});
assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),false,'silent autosave errors must be visible');
await page.evaluate(()=>bereken());assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),false,'calculation cannot clear storage warnings');
await page.evaluate(()=>status('Offerte bijgewerkt'));assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),false);
// Inspect the real exported Blob, without replacing the export implementation.
await page.evaluate(()=>{window.__create=URL.createObjectURL;URL.createObjectURL=blob=>{window.__backupBlob=blob;return window.__create(blob);};});
await page.click('#opslag-backup');assert.equal(await page.evaluate(async()=>JSON.stringify(JSON.parse(await window.__backupBlob.text()))),original);
assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),false,'a download request is not proof of successful storage');
for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await page.screenshot({path:out+'/storage-mobile.png'});}
await page.evaluate(()=>{Storage.prototype.setItem=window.__setItem;});await page.click('#opslag-opnieuw');assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),true);
// Archive failure remains visible even when the draft key can be written.
await page.evaluate(()=>{Storage.prototype.setItem=function(k,v){if(k===OPSLAG_LIJST)throw Error('blocked');return window.__setItem.call(this,k,v);};});
await page.click('#btn-opslaan');assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),false);await page.evaluate(()=>bewaarLokaal(false));assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),false);
await page.evaluate(()=>{Storage.prototype.setItem=window.__setItem;});await page.click('#opslag-opnieuw');assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),true);
await page.evaluate(()=>openenDialog());
await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});
page.once('dialog',d=>d.accept());await page.click('[data-actie="project-verwijderen"]');
assert.equal(await page.$eval('#toast',e=>e.textContent),'Verwijderen mislukt — de offerte is behouden');
await page.click('#modal-sluiten');
assert.equal(await page.evaluate(()=>lokaalVerwijderen(state.projectId)),false);
await page.evaluate(()=>{Storage.prototype.setItem=window.__setItem;});
// Invalid archive content is never overwritten by a supposedly fresh archive.
await page.evaluate(()=>{window.__archive=localStorage.getItem(OPSLAG_LIJST);localStorage.setItem(OPSLAG_LIJST,'{"broken":true}');});
assert.equal(await page.evaluate(()=>lokaalOpslaan(state.project,state.projectId)),null);
assert.equal(await page.evaluate(()=>localStorage.getItem(OPSLAG_LIJST)),'{"broken":true}');
await page.evaluate(()=>localStorage.setItem(OPSLAG_LIJST,window.__archive));await page.click('#opslag-opnieuw');
assert.equal(await page.$eval('#opslag-waarschuwing',e=>e.hidden),true);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
// Hold server responses to exercise double-save and project-switch races.
await page.evaluate(()=>{state.opslag='server';window.__requests=0;window.fetch=(url,options)=>{if(url==='/api/projecten/opslaan'){window.__requests++;window.__sent=JSON.parse(options.body);return new Promise(resolve=>window.__finish=()=>resolve(new Response(JSON.stringify({id:'saved-old'}),{status:200})));}return window.__fetch(url,options);};window.__save=opslaan();});
assert.equal(await page.$eval('#btn-opslaan',e=>e.disabled),true);await page.evaluate(()=>opslaan());assert.equal(await page.evaluate(()=>window.__requests),1);
await page.evaluate(()=>{laadProject(nieuwProject(),null);window.__finish();});await page.evaluate(()=>window.__save);
assert.equal(await page.evaluate(()=>state.projectId),null,'old response cannot attach its ID to the new project');assert.equal(await page.$eval('#btn-opslaan',e=>e.disabled),false);
await page.evaluate(()=>{window.__save=opslaan();state.project.naam='Nieuwere wijziging';window.__finish();});await page.evaluate(()=>window.__save);
assert.equal(await page.evaluate(()=>state.projectId),'saved-old');assert.equal(await page.evaluate(()=>state.project.naam),'Nieuwere wijziging');assert.notEqual(await page.evaluate(()=>window.__sent.project.naam),'Nieuwere wijziging','snapshot retains the originally sent document');assert((await page.$eval('#status',e=>e.textContent)).includes('nieuwere wijzigingen'));
await page.evaluate(()=>{window.__save=opslaan();state.project=JSON.parse(JSON.stringify(state.project));state.project.naam='Geometriekloon';window.__finish();});await page.evaluate(()=>window.__save);assert((await page.$eval('#status',e=>e.textContent)).includes('nieuwere wijzigingen'),'cloning/undo keeps document identity');
await page.evaluate(()=>{window.fetch=(url,options)=>url==='/api/projecten/opslaan'?Promise.resolve(new Response('{}',{status:500})):window.__fetch(url,options);});await page.evaluate(()=>opslaan());assert.equal(await page.$eval('#btn-opslaan',e=>e.disabled),false);assert.equal(await page.$eval('#status',e=>e.textContent),'Opslaan mislukt');
await page.emulateMediaType('print');assert.equal(await page.$eval('#opslag-waarschuwing',e=>getComputedStyle(e).display),'none');
assert.deepEqual(errors,[]);console.log('PASS: persistent autosave/archive failures, real JSON backup contents, recovery, deletion failure result, duplicate-save protection, immutable save snapshot, cross-project race safety, newer-change feedback, failed HTTP save recovery, 320–1440px and print isolation');
}finally{await browser.close();}
