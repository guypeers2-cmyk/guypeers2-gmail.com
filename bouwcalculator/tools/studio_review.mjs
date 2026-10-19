/* Optional drawing-first studio regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/studio_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-studio-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});


await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.click('#bestand-menu summary');assert.equal(await page.$eval('#bestand-menu',e=>e.open),true);
assert(await page.$eval('#btn-print',e=>e.getClientRects().length>0));
await page.keyboard.press('Escape');assert.equal(await page.$eval('#bestand-menu',e=>e.open),false);
assert.equal(await page.$$eval('#calculator-paneel details[open]',es=>es.length),0,'supporting panels folded by default');
const layout=await page.evaluate(()=>({draw:document.querySelector('#tekening').getBoundingClientRect().width,width:innerWidth,y:document.querySelector('#tekening').getBoundingClientRect().top}));
assert(layout.draw>1000 && layout.y<400,'drawing has primary space and position');
await page.evaluate(()=>{
 const r=actieveRuimte();r.openingen=[{naam:'Raam',muur:'noord',breedte:1,hoogte:1,aantal:1,positie:2,borstwering:1}];
 state.project.regels=[{id:'studio-sock',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:2,opties:{},notitie:'',visualisatie:{x:1,y:.1,z:.3}}];wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte.regels.length===1);
const total=await page.evaluate(()=>state.offerte.totalen.totaal);
// Wall activation opens the catalog rather than inserting an unwanted default post.
await page.$eval('#plan .plan-wand',e=>e.focus());await page.keyboard.press('Enter');
assert.equal(await page.$eval('#object-menu',e=>e.open),true);
assert.equal(await page.evaluate(()=>state.project.regels.length),1);
await page.keyboard.press('Escape');
const normal=await page.$eval('#plan svg',e=>e.getAttribute('viewBox'));
await page.click('[data-camera="in"]');
assert.notEqual(await page.$eval('#plan svg',e=>e.getAttribute('viewBox')),normal,'2D zoom works');
await page.click('[data-camera="reset"]');
await page.click('[data-plan="isometrie"]');
await page.$eval('#plan [data-plan-drag="opening"]',e=>e.focus());await page.keyboard.press('Enter');
assert.equal(await page.$eval('#plan-selectie-naam',e=>e.textContent),'Raam · wand noord');
assert.equal(await page.evaluate(()=>state.project.regels.length),1,'opening selection never adds work');
await page.click('[data-plan="plattegrond"]');
assert.notEqual(await page.$eval('#studio-totaal',e=>e.textContent),'€ 0,00');
// Selection stays in the drawing instead of jumping to a distant form.
await page.click('#plan [data-plan-regel="studio-sock"] .werk-achtergrond');
assert.equal(await page.$eval('#plan-selectie',e=>e.hidden),false);
assert.equal(await page.$eval('#werk-invoer',e=>e.open),false);
assert(await page.$('#plan .plan-geselecteerd'));
await page.click('#plan-eigenschappen');
assert.equal(await page.$eval('#plan-inspector',e=>e.hidden),false);
await page.click('#plan-volledige-regel');
assert.equal(await page.$eval('#werk-invoer',e=>e.open),true);
assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-regel]')?.dataset.regel),'studio-sock');
for(const id of ['ruimte-invoer','werk-invoer','zijde','offertepaneel']){
 await page.click(`.studio-nav [data-studio-doel="${id}"]`);
 assert.equal(await page.$eval('#'+id,e=>e.open),true,`navigation reveals ${id}`);
}
await page.click('.studio-nav [data-studio-doel="tekening"]');
assert.equal(await page.$$eval('#calculator-paneel details[open]',es=>es.length),0,'return to drawing refolds supporting panels');
await page.click('[data-plan="aanzicht"]');
await page.click('[data-aanzicht-vlak="noord"]');
await page.$eval('#plan [data-plan-regel="studio-sock"]',e=>e.focus());await page.keyboard.press('Enter');
assert.equal(await page.$eval('#plan-selectie',e=>e.hidden),false);
await page.$eval('#plan',e=>e.scrollIntoView({block:'center'}));
await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
await page.screenshot({path:path.join(out,'studio-desktop.png'),fullPage:true});
// Print must reveal the collapsed quote, then restore the editing layout.
assert.equal(await page.$eval('#offertepaneel',e=>e.open),false);
await page.pdf({path:path.join(out,'studio-offerte.pdf'),format:'A4',printBackground:true});
assert.equal(await page.$eval('#offertepaneel',e=>e.open),false);
await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
assert.equal(await page.$eval('#offertepaneel',e=>e.open),true);
assert(await page.$eval('#offerte',e=>e.textContent.includes('Stopcontact')));
await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
assert.equal(await page.$eval('#offertepaneel',e=>e.open),false);
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:900,isMobile:width<768,hasTouch:width<768});
 await page.click('.studio-nav [data-studio-doel="tekening"]');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`no horizontal overflow ${width}`);
 assert.equal(await page.$$eval('#calculator-paneel details[open]',es=>es.length),0);
 await page.click('#tekening .object-menu-start');assert.equal(await page.$eval('#object-menu',e=>e.open),true);await page.keyboard.press('Escape');
 if(width===390)await page.screenshot({path:path.join(out,'studio-mobiel.png'),fullPage:true});
}
await page.waitForFunction(t=>state.offerte.totalen.totaal===t,{},total);
assert.deepEqual(errors,[]);
console.log('PASS: drawing-first layout, default folds, intuitive navigation, local selection + explicit properties, live total, return-to-drawing, print disclosure/restore, mobile/desktop, object menu, unchanged totals');
}finally{await browser.close();}
