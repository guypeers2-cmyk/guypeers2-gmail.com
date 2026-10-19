/* Optional inline editing and project history regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/edit_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-edit-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});


await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{
 const room=actieveRuimte();
 state.project.regels=[{id:'edit',ruimte_id:room.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:2,opties:{},notitie:'',visualisatie:{x:1,y:.1,z:.3}}];
 room.openingen=[{naam:'Raam',muur:'noord',breedte:1,hoogte:1,aantal:1,positie:2,borstwering:1}];
 projectHistorie.reset(state.project);render();bereken();
});
await page.waitForFunction(()=>state.offerte.regels.length===1);
const total=await page.evaluate(()=>state.offerte.totalen.totaal);
await page.$eval('#plan [data-plan-regel="edit"]',e=>e.focus());await page.keyboard.press('Enter');
await page.click('#plan-eigenschappen');
assert.equal(await page.$eval('#plan-inspector',e=>e.hidden),false);
assert.equal(await page.$eval('#werk-invoer',e=>e.open),false);
await page.$eval('#plan-inspector [name="x"]',e=>e.value='1.75');
await page.$eval('#plan-inspector [name="z"]',e=>e.value='.8');
await page.click('#plan-inspector [type="submit"]');
await page.waitForFunction(()=>state.project.regels[0].visualisatie.x===1.75);
assert.equal(await page.evaluate(()=>state.project.regels[0].visualisatie.z),.8);
await page.waitForFunction(t=>state.offerte.totalen.totaal===t,{},total);
await page.click('#plan-undo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>state.project.regels[0].visualisatie.x),1);
await page.click('#plan-redo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>state.project.regels[0].visualisatie.x),1.75);
await page.$eval('#plan [data-plan-regel="edit"]',e=>e.focus());
await page.keyboard.press('ArrowRight');
assert(Math.abs(await page.evaluate(()=>state.project.regels[0].visualisatie.x)-1.8)<.001);
await page.click('#plan-undo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>state.project.regels[0].visualisatie.x),1.75,'canvas movement can be undone');
await page.$eval('#plan-inspector [name="aantal"]',e=>e.value='3');
await page.click('#plan-inspector [type="submit"]');
await page.waitForFunction(()=>state.offerte.regels[0].aantal===3);
assert(await page.evaluate(()=>state.offerte.totalen.totaal)>total,'quantity changes the quote');
await page.click('#plan-undo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
await page.waitForFunction(t=>state.offerte.totalen.totaal===t,{},total);
assert.equal(await page.evaluate(()=>state.project.regels[0].hoeveelheid),2);
// Native input editing is not intercepted by project shortcuts.
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
await page.$eval('#plan-inspector [name="x"]',e=>e.focus());
await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
assert.equal(await page.evaluate(()=>state.project.regels[0].visualisatie.x),1.75);
await page.$eval('#plan svg',e=>{e.setAttribute('tabindex','0');e.focus();});
await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
assert.equal(await page.evaluate(()=>state.project.regels[0].visualisatie.x),1);
await page.click('#plan-redo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
// Deletion and restoration include the quotation, not only the SVG.
page.once('dialog',d=>d.accept());await page.click('#plan-selectie-verwijder');
await page.waitForFunction(()=>state.offerte.regels.length===0);
await page.click('#plan-undo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
await page.waitForFunction(()=>state.offerte.regels.length===1);
assert.equal(await page.evaluate(()=>state.project.regels[0].visualisatie.x),1.75);
await page.click('[data-plan="aanzicht"]');
await page.$eval('#plan [data-opening-index="0"]',e=>e.focus());await page.keyboard.press('Enter');
await page.click('#plan-eigenschappen');
await page.$eval('#plan-inspector [name="positie"]',e=>e.value='3.5');
await page.click('#plan-inspector [type="submit"]');
assert(await page.$eval('#plan-inspector-fout',e=>e.textContent.length>0));
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[0].positie),2,'invalid opening not committed');
await page.$eval('#plan-inspector [name="positie"]',e=>e.value='2.5');
await page.$eval('#plan-inspector [name="borstwering"]',e=>e.value='.8');
await page.click('#plan-inspector [type="submit"]');
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[0].positie),2.5);
assert.equal(await page.$eval('#plan-inspector-fout',e=>e.textContent),'');
await page.click('#plan-undo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[0].positie),2);
await page.click('#plan-redo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[0].borstwering),.8);
await page.waitForFunction(t=>state.offerte.totalen.totaal===t,{},total);
await (await page.$('#tekening')).screenshot({path:path.join(out,'inline-eigenschappen.png')});
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.waitForSelector('#plan [data-opening-index="0"]');
await page.$eval('#plan [data-opening-index="0"]',e=>e.focus());await page.keyboard.press('Enter');
await page.click('#plan-eigenschappen');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390,'mobile inspector has no overflow');
assert(await page.$eval('#plan-inspector input',e=>parseFloat(getComputedStyle(e).fontSize)>=16));
await (await page.$('#plan-inspector')).screenshot({path:path.join(out,'inline-eigenschappen-mobiel.png')});
await page.reload({waitUntil:'networkidle2'});
assert.equal(await page.evaluate(()=>actieveRuimte().openingen[0].positie),2.5,'restored project persists');
assert.equal(await page.$eval('#plan-undo',e=>e.disabled),true,'history resets on reload');
// Removing the final room leaves a usable empty canvas and is reversible.
await page.$eval('#ruimte-invoer',e=>e.open=true);
page.once('dialog',d=>d.accept());
await page.$eval('[data-actie="ruimte-verwijderen"]',e=>e.click());
assert.equal(await page.evaluate(()=>state.project.ruimtes.length),0);
assert(await page.$('#plan .plan-leeg'));
await page.click('#plan-undo');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>state.project.ruimtes.length),1);
assert(await page.$('#plan svg'));
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.deepEqual(errors,[]);
console.log('PASS: inline coordinates and window properties, validation, stable totals, undo/redo, keyboard vs native input undo, deletion restoration, persistence and fresh-session history');
}finally{await browser.close();}
