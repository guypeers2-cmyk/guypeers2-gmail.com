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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-huis-camera-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8096/',{waitUntil:'networkidle2'});
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.waitForFunction(()=>!!state.offerte);
await page.evaluate(()=>{
  const p=nieuwProject();p.huis={lengte:12,breedte:8,hoogte:2.5};
  p.ruimtes=[{id:'a',naam:'Woonkamer',lengte:4,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:0,y:0}},
    {id:'b',naam:'Keuken',lengte:8,breedte:8,hoogte:2.5,openingen:[],huis_positie:{x:4,y:0}}];
  p.regels=[{id:'gyproc',ruimte_id:'a',oppervlak:'noord',pakket_id:'gyproc_wand_profiel',opties:{},hoeveelheid:null}];
  laadProject(p);bewaarLokaal(false);
});
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
const box=()=>page.$eval('#huis-plan svg',e=>e.getAttribute('viewBox'));
const project=await page.evaluate(()=>JSON.stringify(state.project)),total=await page.evaluate(()=>state.offerte.totalen.totaal);
await click('[data-ontwerpniveau="huis"]');
assert((await page.$eval('#huis-selectie-info',e=>e.textContent)).includes('Woonkamer'));
assert((await page.$eval('#huis-selectie-info',e=>e.textContent)).includes('32,00 m²'));
const print=await page.evaluate(()=>BouwHuis.svg(state.project,'2d',null));
assert.equal(await page.$eval('#huis-draaien',e=>getComputedStyle(e).display),'none','rotation controls hidden in 2D');
const initial=await box();
await click('[data-huis-zoom="in"]');assert.notEqual(await box(),initial);
await click('[data-huis-view="3d"]');
assert.notEqual(await page.$eval('#huis-draaien',e=>getComputedStyle(e).display),'none');
const views=new Set();for(let i=0;i<4;i++){views.add(await page.$eval('#huis-plan svg',e=>e.innerHTML));await click('[data-huis-draai="1"]');}
assert.equal(views.size,4,'four genuinely different 3D orientations');
assert((await page.$eval('#huis-camera-status',e=>e.textContent)).includes('0°'));
await click('[data-huis-zoom="reset"]');await click('[data-huis-tool="hand"]');
async function pan(cancel=false){
  await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  const b=await (await page.$('#huis-plan')).boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+55,y+25,{steps:5});
  if(cancel)await page.keyboard.press('Escape');await page.mouse.up();
}
const before=await box();await pan();assert.notEqual(await box(),before,'hand pans 3D');
const saved=await box();await pan(true);assert.equal(await box(),saved,'Escape restores the camera');
await page.$eval('#huis-plan',e=>e.focus());await page.keyboard.press('ArrowRight');assert.notEqual(await box(),saved,'keyboard hand');
await click('[data-huis-view="2d"]');await pan();assert.notEqual(await box(),'0 0 800 500','hand pans 2D');
await click('[data-huis-zoom="reset"]');assert.equal(await box(),'0 0 800 500','fit resets zoom and pan');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),project,'camera never changes measurements, works or positions');
assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);
assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false,'no camera entries in project history');
assert.equal(await page.evaluate(()=>BouwHuis.svg(state.project,'2d',null)),print,'print is unaffected');
await click('[data-huis-tool="select"]');
await click('[data-huis-ruimte="b"] .huis-vloer');
assert((await page.$eval('#huis-selectie-info',e=>e.textContent)).includes('Keuken'));
await page.click('[data-huis-ruimte="b"] .huis-vloer',{count:2});
await page.waitForFunction(()=>BouwHuis.getLevel()==='ruimte');assert.equal(await page.evaluate(()=>actieveRuimte().id),'b','double-click opens chosen room');
await click('[data-ontwerpniveau="huis"]');await click('[data-huis-view="3d"]');
await page.screenshot({path:out+'/huis-camera-desktop.png',fullPage:true});
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
await page.reload({waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);
await click('[data-ontwerpniveau="huis"]');await click('[data-huis-tool="hand"]');
await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
const b=await (await page.$('#huis-plan')).boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
const client=await page.createCDPSession(),touchBefore=await box();
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+20}]});
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.notEqual(await box(),touchBefore,'real touch pans the plan');
const committed=await box();
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-20,y:y-15}]});
await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
assert.equal(await box(),committed,'touch cancellation restores the camera');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),project);
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile overflow');
await click('[data-huis-zoom="reset"]');await page.screenshot({path:out+'/huis-camera-mobiel.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS: four house angles, pan in 2D/3D, mouse/touch/keyboard, Escape, fit, selected-room metrics, double-click, unchanged quote/history/print and mobile layout');
}finally{await browser.close();}
