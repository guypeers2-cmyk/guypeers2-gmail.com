/* Optional explicit route length regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/trace_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-trace-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});



await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{
 const r=actieveRuimte();
 state.project.regels=[{id:'leiding',ruimte_id:r.id,pakket_id:'san_koudwater',oppervlak:'vloer',hoeveelheid:8,opties:{},notitie:'bron',visualisatie:{x:0,y:0,z:0,x2:3,y2:0,z2:2}},
 {id:'punt',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},visualisatie:{x:1,y:0,z:.3}}];wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte.regels.length===2);
async function klaar(){await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');}
async function kies(id){await page.$eval(`#plan [data-plan-regel="${id}"]`,e=>e.focus());await page.keyboard.press('Enter');}
async function overnemen(ok){
 await page.click('#plan-acties summary');
 page.once('dialog',async d=>{assert(d.message().includes('bochten'));assert(d.message().includes('offerteprijs'));await (ok?d.accept():d.dismiss());});
 await page.click('#plan-tracelengte');await klaar();
}
await kies('leiding');
assert((await page.$eval('#plan-trace-info',e=>e.textContent)).includes('3,61 m'));
const voor=await page.evaluate(()=>({project:JSON.stringify(state.project),total:state.offerte.totalen.totaal}));
await overnemen(false);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),voor.project,'cancel leaves all data unchanged');
await overnemen(true);
assert.equal(await page.evaluate(()=>state.project.regels[0].hoeveelheid),3.61);
assert.equal(await page.evaluate(()=>state.offerte.regels[0].aantal),3.61);
assert(await page.evaluate(()=>state.offerte.totalen.totaal)<voor.total,'quotation recalculates');
await page.click('#plan-undo');await klaar();assert.equal(await page.evaluate(()=>state.project.regels[0].hoeveelheid),8);
await page.click('#plan-redo');await klaar();assert.equal(await page.evaluate(()=>state.project.regels[0].hoeveelheid),3.61);
await kies('leiding');await page.keyboard.press('ArrowRight');await klaar();
assert.equal(await page.evaluate(()=>state.project.regels[0].hoeveelheid),3.61,'moving never changes quotation quantity');
await kies('punt');assert.equal(await page.$eval('#plan-tracelengte',e=>e.hidden),true);
assert.equal(await page.$eval('#plan-trace-info',e=>e.hidden),true);
await page.evaluate(()=>wijzig(()=>Object.assign(state.project.regels[0].visualisatie,{x:1,y:1,z:1,x2:1,y2:1,z2:1})));await klaar();
await kies('leiding');assert.equal(await page.$eval('#plan-tracelengte',e=>e.disabled),true,'zero length cannot replace quantity');
await page.evaluate(()=>wijzig(()=>state.project.regels[0].visualisatie={}));await klaar();
const g=await page.evaluate(()=>BouwPlan.werkGeometrie(planRegels(actieveRuimte())[0],actieveRuimte()));
await overnemen(true);
assert.deepEqual(await page.evaluate(()=>state.project.regels[0].visualisatie),{x:g.a[0],y:g.a[1],z:g.a[2],x2:g.b[0],y2:g.b[1],z2:g.b[2]},'example geometry frozen');
const opgeslagen=await page.evaluate(()=>JSON.stringify(state.project));
await page.reload({waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),opgeslagen,'quantity and geometry persisted');
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.waitForSelector('#plan [data-plan-regel="leiding"]');await kies('leiding');
await page.click('#plan-acties summary');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
const rect=await page.$eval('#plan-acties > div',e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right};});
assert(rect.left>=0 && rect.right<=390,'menu fits mobile');
const children=await page.$$eval('#plan-acties button:not([hidden])',els=>els.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right};}));
for(const r of children)assert(r.left>=rect.left && r.right<=rect.right,'menu labels stay inside popup');
await page.screenshot({path:path.join(out,'trace-mobiel.png'),fullPage:false});
assert.deepEqual(errors,[]);
console.log('PASS: 3D length, confirmation/cancel, explicit quantity and quote update, undo/redo, move invariance, zero protection, non-route exclusion, default geometry freeze, persistence, mobile menu');
}finally{await browser.close();}
