/* Optional quick room picker regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/kamerkeuze_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-kamerkeuze-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.waitForFunction(()=>!!state.offerte);
await page.evaluate(()=>{
 const p=nieuwProject();p.huis={lengte:10,breedte:8,hoogte:2.5};
 p.ruimtes=[{id:'a',naam:'Woonkamer',lengte:4,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:0,y:0}},
 {id:'b',naam:'Keuken',lengte:6,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:4,y:0}},
 {id:'c',naam:'Café & bureau <test>',lengte:4,breedte:3,hoogte:2.5,openingen:[]}];
 for(let i=0;i<20;i++)p.ruimtes.push({id:'extra'+i,naam:'Logeerkamer '+i+' met een bijzonder lange naam voor een compact scherm',lengte:3,breedte:2,hoogte:2.5,openingen:[]});
 p.regels=[{id:'w',ruimte_id:'a',oppervlak:'noord',pakket_id:'gyproc_wand_profiel',hoeveelheid:null,opties:{}}];
 laadProject(p);bewaarLokaal(false);
});
await page.waitForFunction(()=>state.offerte?.ruimtes.length===23&&document.querySelector('#status').textContent!=='Berekenen…');
const original=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
async function open(){await page.click('.studio-room-open');await page.waitForFunction(()=>document.querySelector('#studio-rooms').open);}
async function query(text){await page.$eval('#studio-room-query',(e,text)=>{e.value=text;e.dispatchEvent(new Event('input',{bubbles:true}));},text);}
await page.click('.studio-nav [data-studio-doel="werk-invoer"]');await open();
assert.equal(await page.evaluate(()=>document.activeElement.id),'studio-room-query');
assert.equal(await page.$$eval('[data-room-id]',es=>es.length),23);
assert.equal(await page.$eval('[data-room-id="a"]',e=>e.getAttribute('aria-current')),'location');
assert.equal(await page.$eval('[data-room-id="a"] .studio-room-work',e=>e.textContent),'1 werkpost');
assert.equal(await page.$eval('.studio-room-open',e=>e.getAttribute('aria-expanded')),'true');
await query('nietbestaand');assert.equal(await page.$$eval('[data-room-id]',es=>es.length),0);assert((await page.$eval('#studio-room-results',e=>e.textContent)).includes('Geen kamers gevonden'));
await query('cafe');assert.equal(await page.$$eval('[data-room-id]',es=>es.length),1);
assert.equal(await page.$eval('[data-room-id="c"] strong',e=>e.textContent),'Café & bureau <test>');assert.equal(await page.$('#studio-room-results test'),null);
await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('#studio-rooms').open&&state.actieveRuimteId==='c');
assert.equal(await page.$eval('#werk-invoer',e=>e.open),true,'work context retained');
assert.equal(await page.evaluate(()=>document.activeElement.parentElement.id),'werk-invoer');
assert.equal(await page.$eval('#studio-plaats',e=>e.textContent),'Café & bureau <test>');
await open();await query('keuken');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#studio-rooms').open);
assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('studio-room-open')),true);
assert.equal(await page.$eval('.studio-room-open',e=>e.getAttribute('aria-expanded')),'false');
await open();assert.equal(await page.$eval('#studio-room-query',e=>e.value),'');
await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.roomId),'a');
await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.roomId),'b');
await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.dataset.roomId),'extra19');
await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.dataset.roomId),'a');
await page.click('#studio-room-house');await page.waitForFunction(()=>window.BouwHuis.getLevel()==='huis');
await open();await query('keuken');await page.keyboard.press('Enter');await page.waitForFunction(()=>state.actieveRuimteId==='b'&&window.BouwHuis.getLevel()==='ruimte');
assert.equal(await page.$eval('#studio-plaats',e=>e.textContent),'Keuken','house selection cannot override chosen room');
await page.click('[data-hoofdtab="tarieven"]');await open();await query('cafe');await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('#calculator-paneel').hidden);
await page.$eval('#studio-plaats',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click('#studio-plaats');await page.waitForFunction(()=>document.querySelector('#studio-rooms').open);await page.click('#studio-rooms-close');await page.waitForFunction(()=>document.activeElement.id==='studio-plaats');
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:844});await open();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no page overflow ${width}`);
 assert(await page.$eval('#studio-rooms',e=>e.scrollWidth<=e.clientWidth),`no dialog overflow ${width}`);
 assert(await page.$eval('#studio-rooms',e=>{const r=e.getBoundingClientRect();return Math.abs((innerWidth-r.width)/2-r.left)<2&&Math.abs((innerHeight-r.height)/2-r.top)<2;}),'dialog centered');
 assert(await page.$eval('#studio-rooms',e=>e.scrollHeight<=e.clientHeight),'only the list scrolls, footer stays reachable');
 assert(await page.$eval('#studio-room-results',e=>e.scrollHeight>e.clientHeight),'long lists scroll inside dialog');
 assert(await page.$eval('#studio-room-query',e=>e.getBoundingClientRect().top>=0),'search stays reachable');
 if(width<=600)assert(await page.$eval('.studio-room-open',e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44));
 if(width===390||width===1440)await page.screenshot({path:out+`/kamerkeuze-${width}.png`});
 await page.click('#studio-rooms-close');await page.waitForFunction(()=>!document.querySelector('#studio-rooms').open);
}
await page.click('.studio-nav [data-studio-doel="zijde"]');
await page.focus('#tab-project');await page.keyboard.press('ArrowRight');
assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-instellingen');
assert.equal(await page.$eval('#tab-project',e=>e.tabIndex),-1);
assert.equal(await page.$eval('#paneel-instellingen',e=>e.hidden),false);
await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-project');
assert.equal(await page.$eval('#tab-instellingen',e=>e.tabIndex),-1);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
assert.deepEqual(errors,[]);console.log('PASS: persistent room access, search/accents/escaped names, empty results, keyboard/focus restoration, retained work context, house and rates transitions, 23-room scrolling, 320–1440px and unchanged project/totals/history');
}finally{await browser.close();}
