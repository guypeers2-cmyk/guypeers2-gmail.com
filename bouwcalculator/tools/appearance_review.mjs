/* Appearance regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/appearance_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-appearance-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
const url=process.env.APP_URL||'http://localhost:8096/';
await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]);
await page.goto(url,{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');
assert.equal(await page.$eval('html',e=>e.dataset.theme),'light','light is default even on a dark device');
await page.evaluate(()=>{const p=nieuwProject(),id=p.ruimtes[0].id;p.huis={lengte:8,breedte:6,hoogte:2.5};p.ruimtes[0].huis_positie={x:0,y:0};p.regels=[{id:'theme-socket',ruimte_id:id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},visualisatie:{x:2,y:.1,z:.3}}];laadProject(p);window.BouwHuis.setLevel('ruimte');bewaarLokaal(false);selecteerPlanRegel('theme-socket');});
await page.waitForFunction(()=>state.rekenStatus==='ready'&&state.offerte.regels.length===1);
await page.evaluate(()=>{window.themeSVG=document.querySelector('#plan svg');});
const original=await page.evaluate(()=>JSON.stringify(state.project)), total=await page.evaluate(()=>state.offerte.totalen.totaal);
const selection=await page.evaluate(()=>JSON.stringify(planSelectie)), camera=await page.evaluate(()=>JSON.stringify(planCamera));
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
function contrast(a,b){const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
await click('#bestand-menu summary');
for(const preference of ['light','dark','auto']){
 await page.select('#thema-keuze',preference);
 for(const system of ['light','dark']){
  await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:system},{name:'prefers-reduced-motion',value:'reduce'}]);
  const expected=preference==='auto'?system:preference;
  await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,{},expected);
  const colors=await page.evaluate(()=>{
   const probe=document.createElement('span');probe.style.cssText='color:var(--tekst-3);background:var(--oppervlak-3)';document.body.append(probe);const cs=getComputedStyle(probe);const faint={fg:cs.color,bg:cs.backgroundColor};probe.remove();const b=getComputedStyle(document.querySelector('#btn-print'));return {faint,primary:{fg:b.color,bg:b.backgroundColor},bg:getComputedStyle(document.body).backgroundColor,scheme:getComputedStyle(document.documentElement).colorScheme};
  });
  assert.equal(colors.bg,expected==='dark'?'rgb(12, 17, 26)':'rgb(244, 246, 248)');assert.equal(colors.scheme,expected);
  assert(contrast(colors.faint.fg,colors.faint.bg)>=4.5,'muted text contrast');assert(contrast(colors.primary.fg,colors.primary.bg)>=4.5,'primary action contrast '+JSON.stringify({preference,system,colors}));
 }
}
assert.equal(await page.evaluate(()=>window.themeSVG===document.querySelector('#plan svg')),true,'theme switching does not replace canvas');
assert.equal(await page.evaluate(()=>JSON.stringify(planSelectie)),selection);assert.equal(await page.evaluate(()=>JSON.stringify(planCamera)),camera);
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);assert.equal(await page.evaluate(()=>projectHistorie.kanUndo()),false);
for(const theme of ['light','dark']){
 await page.select('#thema-keuze',theme);await click('#bestand-menu summary');
 for(const width of [320,390,768,1440]){
  await page.setViewport({width,height:900});
  for(const view of ['plattegrond','isometrie','aanzicht']){await click(`[data-plan="${view}"]`);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await click('[data-plan="isometrie"]');
  if(width===390){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+`/appearance-${theme}-mobile.png`});}
 }
 await page.evaluate(()=>window.scrollTo(0,0));await click('#bestand-menu summary');
 assert((await page.$eval('#thema-keuze',e=>e.getBoundingClientRect().height))>=44);
}
await page.setViewport({width:640,height:320});assert(await page.$eval('.bestand-menu-inhoud',e=>e.getBoundingClientRect().bottom<=innerHeight));
await page.setViewport({width:390,height:900});await page.focus('#thema-keuze');await page.keyboard.press('Escape');assert.equal(await page.$eval('#bestand-menu',e=>e.open),false);assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#bestand-menu summary')),true);
await page.select('#thema-keuze','light');await page.reload({waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');
assert.equal(await page.$eval('html',e=>e.dataset.theme),'light');assert.equal(await page.$eval('#thema-keuze',e=>e.value),'light');
if(url.startsWith('http')){const other=await browser.newPage();await other.goto(url,{waitUntil:'networkidle2'});await other.evaluate(()=>localStorage.setItem('bouwcalculator.thema','dark'));await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');assert.equal(await page.$eval('#thema-keuze',e=>e.value),'dark');await other.close();}
await page.emulateMediaType('print');
assert.equal(await page.$eval('html',e=>getComputedStyle(e).colorScheme),'light');
assert.equal(await page.$eval('.offerte',e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');await page.emulateMediaType('screen');
await page.evaluate(()=>{window.originalThemeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,...rest){if(key==='bouwcalculator.thema')throw new DOMException('blocked','QuotaExceededError');return window.originalThemeSet.call(this,key,...rest);};});
await page.select('#thema-keuze','dark');assert.equal(await page.$eval('html',e=>e.dataset.theme),'dark');assert((await page.$eval('#thema-status',e=>e.textContent)).includes('bewaren lukt niet'));
await page.emulateMediaType('print');assert.equal(await page.$eval('html',e=>getComputedStyle(e).colorScheme),'light');assert.equal(await page.$eval('.offerte',e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');await page.emulateMediaType('screen');
await page.evaluate(()=>{Storage.prototype.setItem=window.originalThemeSet;localStorage.setItem('bouwcalculator.thema','invalid');});await page.reload({waitUntil:'networkidle2'});assert.equal(await page.$eval('html',e=>e.dataset.theme),'light','invalid preferences recover to light');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);assert.equal(await page.evaluate(()=>state.offerte.totalen.totaal),total);
await page.evaluate(()=>localStorage.setItem('bouwcalculator.thema','dark'));await page.evaluateOnNewDocument(()=>{const read=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='bouwcalculator.thema')throw new DOMException('blocked','SecurityError');return read.call(this,key);};});await page.reload({waitUntil:'networkidle2'});assert.equal(await page.$eval('html',e=>e.dataset.theme),'light','blocked preference reads recover without breaking the app');await page.waitForFunction(()=>state.rekenStatus==='ready');
assert.deepEqual(errors,[]);
console.log('PASS: light default, explicit light/dark/system precedence, live OS changes, persistence/recovery, blocked storage, 4.5 contrast, native controls, 320–1440px all room views, print isolation and unchanged data/prices/history/selection/canvas');
}finally{await browser.close();}
