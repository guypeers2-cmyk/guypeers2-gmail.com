/* Optional object catalog regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/object_menu_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-object-menu-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});

await page.click('[data-plan="aanzicht"]');
await page.click('[data-aanzicht-vlak="west"]');
await page.click('.object-menu-start');
assert.equal(await page.$eval('#object-menu',e=>e.open),true);
assert.equal(await page.$eval('#object-vlak',e=>e.value),'west');
assert.equal(await page.$$eval('[data-object-toevoegen]',es=>es.length),30);
assert.equal(await page.evaluate(()=>document.activeElement.id),'object-zoek');
await page.type('#object-zoek','stopcontact');
assert.equal(await page.$$eval('[data-object-toevoegen]',es=>es.length),2);
const count=await page.evaluate(()=>state.project.regels.length);
await page.$eval('#object-aantal',e=>e.value='3');
await page.click('[data-object-toevoegen="elek_stopcontact"]');
await page.waitForFunction(n=>state.offerte.regels.length===n+1,{},count);
assert.deepEqual(await page.evaluate(()=>{const r=state.project.regels.at(-1);return [r.oppervlak,r.hoeveelheid]}),['west',3]);
assert.equal(await page.$eval('#object-menu',e=>e.open),true);
await page.$eval('#object-zoek',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});
await page.click('[data-object-categorie="sanitair"]');
assert.equal(await page.$$eval('[data-object-toevoegen]',es=>es.length),15);
await page.click('[data-object-toevoegen="san_lavabo"]');
await page.click('[data-object-categorie="afwerking"]');
await page.click('[data-object-toevoegen="gyproc_wand_profiel"]');
assert.equal(await page.evaluate(()=>state.project.regels.at(-1).hoeveelheid),null);
await page.click('[data-object-categorie="openingen"]');
await page.select('#object-vlak','vloer');
const openings=await page.evaluate(()=>actieveRuimte().openingen.length);
await page.click('[data-object-toevoegen="opening-raam"]');
assert.equal(await page.evaluate(()=>actieveRuimte().openingen.length),openings);
await page.select('#object-vlak','zuid');
await page.click('[data-object-toevoegen="opening-raam"]');
assert.equal(await page.evaluate(()=>actieveRuimte().openingen.at(-1).muur),'zuid');
await page.keyboard.press('Escape');
assert.equal(await page.$eval('#object-menu',e=>e.open),false);
await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
await page.waitForFunction(()=>!document.querySelector('.object-snelknop').hidden);
await page.click('.object-snelknop');
await page.click('[data-object-categorie="alle"]');
await (await page.$('#object-menu')).screenshot({path:path.join(out,'menu-desktop.png')});
await page.keyboard.press('Escape');
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
// Switching mobile emulation reloads Chromium: await the server-backed render.
await page.waitForNetworkIdle({idleTime:300});
await page.waitForFunction(()=>state.offerte&&document.querySelector('#status').textContent!=='Berekenen…');
await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
await page.waitForFunction(()=>!document.querySelector('.object-snelknop').hidden);
await page.click('.object-snelknop');
assert.equal(await page.$eval('#object-menu',e=>e.open),true);
await (await page.$('#object-menu')).screenshot({path:path.join(out,'menu-mobiel.png')});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
assert(await page.$eval('#object-menu',e=>e.scrollWidth<=e.clientWidth));
await page.click('#object-menu-sluit');
await page.click('[data-hoofdtab="tarieven"]');
assert.equal(await page.$eval('.object-snelknop',e=>e.getClientRects().length),0);
assert.deepEqual(errors,[]);
console.log('PASS: searchable 30-item catalog, category filters, active surface, quantity, auto m², repeated add, openings/wall validation, Escape, fixed access, mobile, rates isolation');
}finally{await browser.close();}
