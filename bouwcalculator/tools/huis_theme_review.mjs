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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-huis-theme-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
function contrast(a,b){const l=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];};const x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
try{
await page.goto(process.env.APP_URL||'http://localhost:8096/',{waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);
await page.evaluate(()=>{laadProject(nieuwProject());window.BouwHuis.setLevel('huis');});await page.waitForFunction(()=>document.querySelector('.huis-leeg'));
const original=await page.evaluate(()=>JSON.stringify(state.project));
assert.equal(await page.$eval('#huis-stappen [aria-current="step"]',e=>e.dataset.huisStap),'1');
assert(await page.$$eval('#huis-paneel [data-huis-ready]',es=>es.every(e=>e.hidden&&getComputedStyle(e).display==='none')),'unused camera controls hidden without a contour');
for(const s of ['.huis-acties','#huis-splits-invoer','#huis-kamers'])assert.equal(await page.$eval(s,e=>e.hidden),true,'only useful actions in empty state');
for(const scheme of ['light','dark'])for(const width of [320,390,1440]){
 await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme},{name:'prefers-reduced-motion',value:'reduce'}]);await page.setViewport({width,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const colors=await page.evaluate(()=>({bg:getComputedStyle(document.querySelector('#huis-plan')).backgroundColor,fg:[...document.querySelectorAll('.huis-leeg h4,.huis-leeg p,.huis-leeg small')].map(e=>getComputedStyle(e).color)}));
 for(const fg of colors.fg)assert(contrast(fg,colors.bg)>=4.5,`${scheme} text readable at ${width}`);
 if(scheme==='dark')assert.equal(colors.bg,'rgb(26, 35, 49)');
 const button=await page.$eval('[data-huis-start]',e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,h:e.getBoundingClientRect().height}));
 assert(button.h>=44);assert(contrast(button.fg,button.bg)>=4.5,'start button text contrast');
 if(width===390||width===1440)await page.screenshot({path:out+`/empty-${scheme}-${width}.png`,fullPage:true});
}
await page.click('[data-huis-start]');await page.waitForFunction(()=>document.querySelector('#ruimte-vorm').open);await page.click('#vorm-cancel');await page.waitForFunction(()=>!document.querySelector('#ruimte-vorm').open);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'opening/cancelling preserves existing project');
await page.evaluate(()=>{const p=nieuwProject();p.huis={lengte:10,breedte:8,hoogte:2.5};Object.assign(p.ruimtes[0],{lengte:10,breedte:8,hoogte:2.5,huis_positie:{x:0,y:0}});laadProject(p);window.BouwHuis.setLevel('huis');});
await page.waitForFunction(()=>document.querySelector('#huis-plan svg'));
assert.equal(await page.$eval('#huis-stappen [aria-current="step"]',e=>e.dataset.huisStap),'2');
assert(await page.$$eval('#huis-paneel [data-huis-ready]',es=>es.every(e=>!e.hidden)),'camera returns after creating a contour');
assert.equal(await page.$eval('.huis-acties',e=>e.hidden),false);
assert((await page.$eval('#huis-open',e=>e.textContent)).includes('Kamer openen'));
for(const view of ['2d','3d']){
 await page.click(`[data-huis-view="${view}"]`);
 const colors=await page.evaluate(()=>({fg:getComputedStyle(document.querySelector('#huis-plan .huis-label')).fill,bg:getComputedStyle(document.querySelector('#huis-plan .huis-vloer')).fill}));
 assert(contrast(colors.fg,colors.bg)>=4.5,`${view} room label contrast`);
}
await page.evaluate(()=>{const p=JSON.parse(JSON.stringify(state.project));p.regels=[{id:'onboarding-work',ruimte_id:p.ruimtes[0].id,pakket_id:'gyproc_wand_profiel',oppervlak:'noord',hoeveelheid:null,opties:{}}];laadProject(p);});
assert.equal(await page.$eval('#huis-stappen [aria-current="step"]',e=>e.dataset.huisStap),'3','protected work-bearing rooms lead to opening, not splitting');
await page.emulateMediaType('print');assert.equal(await page.$eval('#huis-plan .huis-label',e=>getComputedStyle(e).fill),'rgb(25, 63, 43)','screen palette does not leak into quotation print');
assert.deepEqual(errors,[]);console.log('PASS: house empty state light/dark 320–1440px, text contrast ≥4.5, accessible start/cancel without data changes, 2D/3D label contrast and print isolation');
}finally{await browser.close();}
