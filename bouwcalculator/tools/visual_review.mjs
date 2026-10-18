/* Optional full-scene UI regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/visual_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-visual-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});
await page.evaluate(()=>{
 const id=state.project.ruimtes[0].id;
 state.project.ruimtes=[{id,naam:'Badkamer & technieken',lengte:6,breedte:4,hoogte:2.7,openingen:[{naam:'Deur',muur:'west',breedte:.9,hoogte:2.1,aantal:1,positie:.5},{naam:'Raam',muur:'noord',breedte:1.2,hoogte:1,aantal:1,positie:3.5,borstwering:1.2}]}];
 const regel=(id2,pakket_id,oppervlak,hoeveelheid,visualisatie={})=>({id:id2,ruimte_id:id,pakket_id,oppervlak,hoeveelheid,opties:{},notitie:'',visualisatie});
 state.project.regels=[
 regel('gyproc','gyproc_wand_profiel','noord',null),
 regel('plaf','schilderen_gyproc','plafond',null),
 regel('sock','elek_stopcontact','noord',4,{x:2.2,y:.15,z:.3}),
 regel('licht','elek_lichtpunt','plafond',1,{x:3,y:2,z:2.7}),
 regel('water','san_koudwater','noord',6,{x:.4,y:.1,z:.4,x2:5.3,y2:.1,z2:.4}),
 regel('warm','san_warmwater','noord',6,{x:.4,y:.3,z:.7,x2:5.3,y2:.3,z2:.7}),
 regel('afvoer','san_afvoer110','vloer',3,{x:4.8,y:.6,z:0,x2:4.8,y2:3.5,z2:0}),
 regel('wc','san_wc','vloer',1,{x:4.6,y:.6,z:0}),
 regel('lav','san_lavabo','west',1,{x:.2,y:2.6,z:.6}),
 regel('sleuf','elek_sleuf','noord',5,{x:1,y:.5,z:1,x2:5,y2:.5,z2:1}),
 regel('test','san_druktest','vloer',1,{x:2,y:2,z:0})];
 wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte?.regels.length===11);
assert.equal(await page.$$eval('#plan .werk-object',es=>es.length),9);
assert.equal(await page.$$eval('#plan .werk-vlak',es=>es.length),2);
assert.equal(await page.$$eval('#plan-legenda [data-plan-regel]',es=>es.length),11);
await page.addStyleTag({content:'.topbar{position:static!important}'});
await (await page.$('.plankaart')).screenshot({path:path.join(out,'alles-2d.png')});
await page.click('[data-plan="isometrie"]');
assert.equal(await page.$$eval('#plan .werk-object',es=>es.length),9);
assert(await page.$('#plan .werk-volume'));
await (await page.$('.plankaart')).screenshot({path:path.join(out,'alles-3d.png')});
const totaal=await page.evaluate(()=>state.offerte.totalen.totaal);
await page.$eval('#tekenopties',e=>e.open=true);
await page.click('[data-plan-laag="sanitair"]');
assert.equal(await page.$$eval('#plan .werk-object',es=>es.length),3);
assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),totaal);
await page.click('[data-plan-laag="sanitair"]');
await page.$eval('#plan [data-plan-regel="sock"]',e=>e.focus());
await page.keyboard.press('Enter');
assert.equal(await page.$eval('#plan-selectie',e=>e.hidden),false);
assert.equal(await page.$eval('#werk-invoer',e=>e.open),false);
await page.click('#plan-eigenschappen');
assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-regel]')?.dataset.regel),'sock');
await page.$eval('[data-regel="sock"] .plaatsing',e=>e.open=true);
await page.$eval('[data-fokus="r_sock_plaats_x"]',e=>{e.value='3.1';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
assert.equal(await page.evaluate(()=>state.project.regels.find(r=>r.id==='sock').visualisatie.x),3.1);
assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),totaal);
await page.reload({waitUntil:'networkidle2'});
assert.equal(await page.evaluate(()=>state.project.regels.find(r=>r.id==='sock').visualisatie.x),3.1);
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await page.click('[data-plan="isometrie"]');
await page.click('[data-camera="rechts"]');
assert.equal(await page.$$eval('#plan .werk-object',es=>es.length),9);
await page.emulateMediaType('print');
assert.equal(await page.$$eval('.offerte-plan .werk-object',es=>es.length),9);
await page.pdf({path:path.join(out,'alles-offerte.pdf'),format:'A4',printBackground:true});
assert.deepEqual(errors,[]);
console.log('PASS: 11 works in 2D/3D, filters, volumes, keyboard selection, placement/reload, unchanged totals, mobile, print');
}finally{await browser.close();}
