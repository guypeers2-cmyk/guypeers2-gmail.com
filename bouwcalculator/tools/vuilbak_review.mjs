/* Optional trash controls regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/vuilbak_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-vuilbak-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});


await page.evaluate(()=>{
 const room=actieveRuimte();
 room.openingen=[{naam:'Raam',muur:'noord',breedte:1,hoogte:1,aantal:1,positie:1,borstwering:1}];
 state.project.regels=[{id:'trash-test',ruimte_id:room.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},notitie:''}];
 wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte.regels.length===1);
const trash='[data-plan-verwijder="trash-test"]';
assert(await page.$(`${trash} svg`));
page.once('dialog',d=>d.dismiss());await page.click(trash);
assert.equal(await page.evaluate(()=>state.project.regels.length),1,'cancel retains object');
page.once('dialog',d=>d.accept());await page.click(trash);
await page.waitForFunction(()=>state.offerte.regels.length===0);
assert.equal(await page.$$eval('#plan [data-plan-regel="trash-test"]',es=>es.length),0);
const area=await page.evaluate(()=>vlakkenVoor(actieveRuimte()).find(v=>v.sleutel==='noord').netto);
page.once('dialog',d=>d.accept());await page.click('[data-plan-opening-verwijder="0"]');
assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0);
assert.equal(await page.evaluate(()=>vlakkenVoor(actieveRuimte()).find(v=>v.sleutel==='noord').netto),area+1);
await page.reload({waitUntil:'networkidle2'});
assert.equal(await page.evaluate(()=>state.project.regels.length),0);
assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),0);
assert.deepEqual(errors,[]);
console.log('PASS: trash icons, cancel/confirm, object and quote deletion, opening deletion recalculates area, reload persistence');
}finally{await browser.close();}
