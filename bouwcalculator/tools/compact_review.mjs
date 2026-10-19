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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-compact-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8096/',{waitUntil:'networkidle2'});
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.waitForFunction(()=>!!state.offerte);
await page.evaluate(()=>{const p=nieuwProject();p.huis={lengte:10,breedte:8,hoogte:2.5};p.ruimtes[0]={...p.ruimtes[0],lengte:10,breedte:8,huis_positie:{x:0,y:0}};laadProject(p);bewaarLokaal(false);});
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
const snapshot=await page.evaluate(()=>JSON.stringify(state.project));
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:900});
 await click('[data-ontwerpniveau="huis"]');
 const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,top:document.querySelector('.topbar').getBoundingClientRect().height,nav:document.querySelector('.studio-nav').getBoundingClientRect().height,tools:document.querySelector('#huis-plan').getBoundingClientRect().top-document.querySelector('#huis-paneel').getBoundingClientRect().top}));
 assert.equal(metrics.overflow,false,`house overflow at ${width}`);assert(metrics.top<=64,`single-row top bar at ${width}`);assert(metrics.nav<=54,`single-row navigation at ${width}`);assert(metrics.tools<230,`compact house controls at ${width}: ${metrics.tools}`);
 const invalid=await page.$$eval('.compact-icon',els=>els.filter(e=>!e.getAttribute('aria-label')||!e.title||!e.querySelector('svg')).map(e=>e.id||e.outerHTML.slice(0,80)));
 assert.deepEqual(invalid,[],'all icon commands have accessible names and tooltips');
 if(width===390){
   assert.equal(await page.$eval('#huis-hulp',e=>e.open),false);
   await click('#huis-hulp summary');assert.equal(await page.$eval('#huis-hulp',e=>e.open),true);
   await page.keyboard.press('Escape');assert.equal(await page.$eval('#huis-hulp',e=>e.open),false);
   assert.equal(await page.evaluate(()=>document.activeElement.parentElement.id),'huis-hulp');
   const targets=await page.$$eval('#huis-paneel button.compact-icon,.studio-nav button.compact-icon,.topbar .compact-icon',els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
   for(const t of targets){assert(t.w>=43.9&&t.h>=43.9,`touch target ${JSON.stringify(t)}`);}
   await page.screenshot({path:out+'/compact-huis-mobiel.png',fullPage:true});
 }
 await click('[data-ontwerpniveau="ruimte"]');await click('[data-plan="isometrie"]');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`room overflow at ${width}`);
 await click('#plan-focus');assert.equal(await page.$eval('#plan-focus',e=>e.getAttribute('aria-label')),'Vergrote tekening sluiten');assert(await page.$('#plan-focus svg'));
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#plan-focus').getAttribute('aria-label')==='Tekening vergroten');assert.equal(await page.$eval('#plan-focus',e=>e.getAttribute('aria-label')),'Tekening vergroten');assert(await page.$('#plan-focus svg'));
 if(width===390)await page.screenshot({path:out+'/compact-ruimte-mobiel.png',fullPage:true});
 await click('[data-hoofdtab="tarieven"]');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`rates overflow at ${width}`);await click('[data-hoofdtab="calculator"]');
}
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),snapshot,'visual compacting changes no project data');
assert.deepEqual(errors,[]);console.log('PASS: compact house/room/rates at 320/390/768/1440px, one-row navigation, named SVG controls, 44px mobile targets, help/keyboard/focus and unchanged project');
}finally{await browser.close();}
