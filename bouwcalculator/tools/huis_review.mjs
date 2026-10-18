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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-huis-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});




await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.waitForFunction(()=>!!state.offerte);
async function klaar(){await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');}
async function open(){await page.click('#ruimte-tekenen');await page.waitForSelector('#ruimte-vorm[open]');}
async function kies(id){await page.$eval(`#plan [data-plan-regel="${id}"]`,e=>e.focus());await page.keyboard.press('Enter');}
async function put(id,value){await page.$eval('#'+id,(e,v)=>{e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));},String(value));}
async function clickPoint(x,y,touch=false){await page.$eval('#vorm-canvas',e=>e.scrollIntoView({block:'center',behavior:'instant'}));const p=await page.evaluate(([x,y])=>{const c=document.querySelector('#vorm-canvas'),L=+document.querySelector('#vorm-bereik-x').value,B=+document.querySelector('#vorm-bereik-y').value,s=Math.min(680/L,380/B),p=c.createSVGPoint();p.x=(800-L*s)/2+x*s;p.y=(500-B*s)/2+y*s;const q=p.matrixTransform(c.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}

page.on('dialog',d=>d.accept());
await page.evaluate(()=>laadProject(nieuwProject()));await klaar();
await page.click('[data-ontwerpniveau="huis"]');await page.click('#huis-tekenen');
assert.equal(await page.$eval('#vorm-titel',e=>e.textContent),'Teken het hele huis');
await page.click('#vorm-toepassen');await klaar();
assert.deepEqual(await page.evaluate(()=>[state.project.huis.lengte,state.project.huis.breedte,state.project.ruimtes.length]),[10,8,1]);
assert.equal(await page.evaluate(()=>state.project.ruimtes[0].huis_positie.x),0);
await page.click('#huis-splits');await put('huis-split-waarde',4);await put('huis-naam-a','Woonkamer');await put('huis-naam-b','Keuken');await page.click('#huis-splits-form [type="submit"]');await klaar();
assert.equal(await page.evaluate(()=>state.project.ruimtes.length),2);
assert.equal(await page.evaluate(()=>state.project.ruimtes.reduce((s,r)=>s+Math.abs(BouwVorm.area(BouwVorm.points(r))),0)),80);
const two=await page.evaluate(()=>JSON.stringify(state.project));
await page.click('#huis-undo');await klaar();assert.equal(await page.evaluate(()=>state.project.ruimtes.length),1);
await page.click('#huis-redo');await klaar();assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),two);
await page.click('[data-huis-view="3d"]');assert.equal(await page.$$eval('#huis-plan .huis-wand',es=>es.length),8);
await page.screenshot({path:out+'/huis-3d.png',fullPage:true});
await page.click('[data-huis-view="2d"]');await page.click('#huis-open');await klaar();
assert.equal(await page.evaluate(()=>actieveRuimte().naam),'Woonkamer');
await open();await page.$eval('#vorm-wandhellingen',e=>e.open=true);
await page.$eval('[data-wand-insprong="noord"]',e=>{e.value=1;e.dispatchEvent(new Event('change',{bubbles:true}));});
assert.equal(await page.$eval('#vorm-toepassen',e=>e.disabled),false);
await page.click('#vorm-toepassen');await klaar();
assert.equal(await page.evaluate(()=>state.offerte.ruimtes[0].vlakken.find(v=>v.sleutel==='plafond').netto),28);
await page.evaluate(()=>wijzig(()=>{const r=actieveRuimte();state.project.regels.push({id:'hellend-punt',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},visualisatie:{x:2,y:0,z:1}});r.openingen.push({id:'raam',naam:'Raam',muur:'noord',breedte:1,hoogte:1,aantal:1,positie:1,borstwering:.5});}));await klaar();
await page.click('[data-plan="aanzicht"]');await page.click('[data-aanzicht-vlak="noord"]');
await page.$eval('#plan [data-plan-regel="hellend-punt"]',e=>e.focus());await page.keyboard.press('ArrowUp');await klaar();
let a=await page.evaluate(()=>BouwPlan.werkGeometrie(planRegels(actieveRuimte())[0],actieveRuimte()).a);
assert(Math.abs(a[1]-a[2]/2.5)<1e-8,'object remains on tilted plane');assert(Math.abs(a[2]-1-.05*2.5/Math.hypot(2.5,1))<.0011,'up arrow uses local slant distance');
await page.$eval('#plan [data-opening-index="0"]',e=>e.focus());await page.keyboard.press('ArrowUp');await klaar();
assert(Math.abs(await page.evaluate(()=>actieveRuimte().openingen[0].borstwering)-.55)<.001,'window slides along slope');
const g=await page.evaluate(()=>BouwPlan.openingGeometrie(actieveRuimte(),0));for(const p of [g.a,g.b,g.c,g.d])assert(Math.abs(p[1]-p[2]/2.5)<1e-8);
await page.click('[data-plan="isometrie"]');await page.screenshot({path:out+'/schuine-wand-3d.png',fullPage:true});
// Work cannot disappear when splitting an occupied room.
await page.$eval('[data-ontwerpniveau="huis"]',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
await page.click('[data-ontwerpniveau="huis"]');await page.click('#huis-splits');assert((await page.$eval('#huis-melding',e=>e.textContent)).includes('er wordt niets verwijderd'));
assert.equal(await page.evaluate(()=>state.project.regels.length),1);
// Split the other room with a freely angled chord, through the actual UI.
const other=await page.evaluate(()=>state.project.ruimtes[1].id);await page.$eval(`[data-huis-ruimte="${other}"]`,e=>e.focus());await page.keyboard.press('Enter');
await page.click('#huis-splits');await page.click('#huis-snede-start');
async function housePoint(x,y){const p=await page.evaluate(([x,y])=>{const svg=document.querySelector('#huis-plan svg'),p=svg.createSVGPoint();p.x=+svg.dataset.huisX+x*(+svg.dataset.huisSchaal);p.y=+svg.dataset.huisY+y*(+svg.dataset.huisSchaal);const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},[x,y]);await page.mouse.click(p.x,p.y);}
await page.$eval('#huis-plan',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await housePoint(4,2);await housePoint(10,6);await page.click('#huis-splits-form [type="submit"]');await klaar();
assert.equal(await page.evaluate(()=>state.project.ruimtes.length),3,'free angled chord creates two rooms');
assert.equal(await page.evaluate(()=>state.project.ruimtes.reduce((s,r)=>s+Math.abs(BouwVorm.area(BouwVorm.points(r))),0)),80);
const saved=await page.evaluate(()=>JSON.stringify(state.project));await page.reload({waitUntil:'networkidle2'});await klaar();assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),saved,'house positions and inclinations survive reload');
await page.click('[data-ontwerpniveau="huis"]');await page.screenshot({path:out+'/huis-2d.png',fullPage:true});
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});await page.reload({waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);await page.click('[data-ontwerpniveau="huis"]');
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile horizontal overflow');
await page.screenshot({path:out+'/huis-mobiel.png',fullPage:true});
await page.click('#huis-open');await page.click('#ruimte-tekenen');await page.$eval('#vorm-wandhellingen',e=>e.open=true);
assert.equal(await page.$eval('[data-wand-insprong="noord"]',e=>Number(e.value)),1);
await page.screenshot({path:out+'/wand-mobiel.png',fullPage:true});await page.click('#vorm-cancel');
assert.deepEqual(errors,[]);
console.log('PASS: house-first contour, numeric + free angled partition, room selection, 2D/3D, genuine tilted wall areas, on-plane object/window movement, protected works, undo/redo, reload and 390px mobile');
}finally{await browser.close();}
