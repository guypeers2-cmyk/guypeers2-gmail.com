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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-drawing-ui-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{const p=nieuwProject(),id=p.ruimtes[0].id;p.ruimtes[0].openingen=[{naam:'Raam',muur:'noord',positie:1,breedte:.8,hoogte:.8,borstwering:1,aantal:1}];p.regels=[{id:'sock',ruimte_id:id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},visualisatie:{x:2.7,y:.1,z:.3}}];laadProject(p);});
await page.waitForFunction(()=>state.rekenStatus==='ready'&&state.offerte.regels.length===1);
const original=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function double(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));const b=await(await page.$(s)).boundingBox();assert(b);await page.mouse.click(b.x+b.width/2,b.y+b.height/2,{count:2});}
await page.focus('#plan');await page.keyboard.press('h');assert.equal(await page.evaluate(()=>planGereedschap),'hand');await page.keyboard.press('m');assert.equal(await page.evaluate(()=>planGereedschap),'meet');await page.keyboard.press('v');assert.equal(await page.evaluate(()=>planGereedschap),'select');
await click('[data-camera="in"]');assert((await page.evaluate(()=>planCamera.zoom))>1);await page.focus('#plan');await page.keyboard.press('f');assert.equal(await page.evaluate(()=>planCamera.zoom),1);
for(const view of ['plattegrond','isometrie','aanzicht']){
 await click(`[data-plan="${view}"]`);if(view==='aanzicht')await click('[data-aanzicht-vlak="noord"]');
 await double('#plan [data-plan-regel="sock"] .werk-achtergrond');
 assert.equal(await page.$eval('#plan-inspector',e=>e.hidden),false,`double-click properties ${view}`);assert.equal(await page.$eval('#plan-eigenschappen',e=>e.getAttribute('aria-expanded')),'true');
 assert((await page.$eval('#plan-selectie-positie',e=>e.textContent)).includes('X 2,70'));
 assert(await page.evaluate(()=>document.activeElement.closest('#plan-inspector')!==null));
 await click('#plan-eigenschappen');assert.equal(await page.$eval('#plan-inspector',e=>e.hidden),true);
 const surface={plattegrond:'.plan-raam',isometrie:'.iso-glas',aanzicht:'.aanzicht-opening'}[view];
 await double('#plan [data-opening-index="0"] '+surface);
 assert.equal(await page.evaluate(()=>planSelectie.type),'opening');assert.equal(await page.$eval('#plan-inspector',e=>e.hidden),false,`double-click opening ${view}`);
 await click('#plan-eigenschappen');
}

await click('[data-plan="plattegrond"]');
await page.$eval('#plan-objecten',e=>e.open=true);await click('[data-plan-opening-select="0"]');
assert.equal(await page.evaluate(()=>planSelectie.type),'opening');assert.equal(await page.$eval('[data-plan-opening-select="0"]',e=>e.getAttribute('aria-pressed')),'true');assert((await page.$eval('#plan-selectie-naam',e=>e.textContent)).includes('Raam'));assert.equal(await page.$$eval('#plan .plan-geselecteerd',es=>es.length),1);
await click('#plan-legenda [data-plan-regel="sock"]');assert.equal(await page.$eval('[data-plan-opening-select="0"]',e=>e.getAttribute('aria-pressed')),'false');assert.equal(await page.$eval('#plan-legenda [data-plan-regel="sock"]',e=>e.getAttribute('aria-pressed')),'true');
await page.focus('#plan');await page.keyboard.press('h');await page.keyboard.press('v');assert.equal(await page.evaluate(()=>document.activeElement.dataset.planRegel),'sock','select shortcut restores focused object for precise arrow nudging');
await click('#plan-eigenschappen');const field='#plan-inspector input[name="x"]';await page.focus(field);const tool=await page.evaluate(()=>planGereedschap);await page.keyboard.press('h');assert.equal(await page.evaluate(()=>planGereedschap),tool,'typing cannot change tools');
await click('#plan-eigenschappen');await click('[data-plan="aanzicht"]');await click('[data-aanzicht-vlak="noord"]');await double('#plan [data-opening-index="0"] .aanzicht-opening');assert.equal(await page.evaluate(()=>planSelectie.type),'opening');assert.equal(await page.$eval('#plan-inspector',e=>e.hidden),false);
await page.$eval('#plan-inspector input[name="positie"]',e=>e.value='1');
await click('#plan-eigenschappen');
await page.evaluate(()=>{const e=document.createElement('div');e.id='drawing-review-editable';e.setAttribute('contenteditable','');document.querySelector('#tekening').append(e);e.focus();});
const beforeTyping=await page.evaluate(()=>[planGereedschap,planCamera.zoom]);await page.keyboard.type('hvmf');assert.deepEqual(await page.evaluate(()=>[planGereedschap,planCamera.zoom]),beforeTyping);assert.equal(await page.$eval('#drawing-review-editable',e=>e.textContent),'hvmf');await page.$eval('#drawing-review-editable',e=>e.remove());
for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390){await page.$eval('#plan-selectie',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:out+'/drawing-selection-mobile.png'});}}
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);await page.evaluate(()=>bewaarLokaal(false));
await page.setViewport({width:390,height:900,isMobile:true,hasTouch:true});await page.waitForNetworkIdle({idleTime:200});await page.waitForFunction(()=>state.rekenStatus==='ready'&&state.project.regels.some(r=>r.id==='sock'));
await page.$eval('#plan [data-plan-regel="sock"] .werk-achtergrond',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
const b=await (await page.$('#plan [data-plan-regel="sock"] .werk-achtergrond')).boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.waitForFunction(()=>!document.querySelector('#plan-inspector').hidden);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
assert.deepEqual(errors,[]);
console.log('PASS: V/H/M/F canvas-only shortcuts, preserved object keyboard focus, double-click work/opening properties in 2D/3D/elevation and mobile double-tap, selectable openings/list states, XYZ feedback, editable-field safety, 320–1440px and unchanged project/prices/history');
}finally{await browser.close();}
