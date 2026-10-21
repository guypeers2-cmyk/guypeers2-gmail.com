/* Optional selected-object actions regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/acties_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-acties-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});


await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{
 const r=actieveRuimte();r.openingen=[{naam:'Raam',muur:'noord',breedte:1,hoogte:1,aantal:1,positie:null,borstwering:1}];
 state.project.regels=[
 {id:'a',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:2,opties:{},notitie:'bron',visualisatie:{x:1,y:0,z:.3}},
 {id:'b',ruimte_id:r.id,pakket_id:'san_koudwater',oppervlak:'vloer',hoeveelheid:3,opties:{},notitie:'',visualisatie:{x:.5,y:.5,z:.2,x2:3,y2:1,z2:.4}},
 {id:'c',ruimte_id:r.id,pakket_id:'gyproc_wand_profiel',oppervlak:'noord',hoeveelheid:null,opties:{},notitie:''}];
 wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte.regels.length===3);
const bron=await page.evaluate(()=>JSON.stringify(state.project.regels[0]));
const total=await page.evaluate(()=>state.offerte.totalen.totaal);
async function kies(id){await page.$eval(`#plan [data-plan-regel="${id}"]`,e=>e.focus());await page.keyboard.press('Enter');}
async function actie(id,bevestig){
 await page.click('#plan-acties summary');
 if(bevestig!=null)page.once('dialog',d=>{assert(d.message().includes('offerte'));return bevestig?d.accept():d.dismiss();});
 await page.click('#'+id);
 await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
}
await kies('a');await actie('plan-dupliceer',false);
assert.equal(await page.evaluate(()=>state.project.regels.length),3,'cancel copy');
await actie('plan-dupliceer',true);
const copy=await page.evaluate(()=>state.project.regels.at(-1));
assert.notEqual(copy.id,'a');assert.equal(copy.hoeveelheid,2);assert.equal(copy.notitie,'bron');assert.equal(copy.visualisatie.x,1.25);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project.regels[0])),bron);
assert(await page.evaluate(()=>state.offerte.totalen.totaal)>total,'copy counts in quotation');
assert(await page.evaluate(()=>state.project.regels[0].opties!==state.project.regels.at(-1).opties),'deep copy');
const copiedTotal=await page.evaluate(()=>state.offerte.totalen.totaal);
await actie('plan-centreer');
assert.deepEqual(await page.evaluate(()=>state.project.regels.at(-1).visualisatie),{x:2,y:0,z:1.25});
assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),copiedTotal,'centering leaves price unchanged');
await page.click('#plan-undo');await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>state.project.regels.at(-1).visualisatie.x),1.25);
await page.click('#plan-undo');await page.waitForFunction(()=>state.offerte.regels.length===3);
await page.click('#plan-redo');await page.waitForFunction(()=>state.offerte.regels.length===4);
assert.equal(await page.evaluate(()=>state.project.regels.at(-1).id),copy.id,'redo preserves unique id');
await kies('b');await actie('plan-dupliceer',true);
const trace=await page.evaluate(()=>state.project.regels.at(-1));
assert.equal(trace.hoeveelheid,3);
await actie('plan-centreer');
const next=await page.evaluate(()=>state.project.regels.at(-1).visualisatie);
for(const [a,b] of [['x','x2'],['y','y2'],['z','z2']])assert(Math.abs((next[b]-next[a])-(trace.visualisatie[b]-trace.visualisatie[a]))<.001,'route vector retained');
const regels=await page.evaluate(()=>state.project.regels.length);
await page.$eval('#plan [data-opening-index="0"]',e=>e.focus());await page.keyboard.press('Enter');
const origin=await page.evaluate(()=>BouwPlan.openingGeometrie(actieveRuimte(),0).a[0]);
await actie('plan-dupliceer',true);
assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),2);
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[0].positie),origin,'auto opening stays visually fixed');
assert.equal(await page.evaluate(()=>state.project.regels.length),regels);
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[1].positie),origin+.25);
await actie('plan-centreer');
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[1].positie),1.5);
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.waitForSelector('#plan [data-plan-regel="a"]');await kies('a');
await page.click('#plan-acties summary');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await page.keyboard.press('Escape');assert.equal(await page.$eval('#plan-acties',e=>e.open),false);
assert.deepEqual(errors,[]);
console.log('PASS: copy confirmation/cancel, quantities and unique ids, independent options, point/wall centering, route vector, opening auto-position stability, undo/redo, quote changes, mobile menu');
}finally{await browser.close();}
