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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-vorm-review';
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
const initial=await page.evaluate(()=>JSON.stringify(state.project));
await open();
for(const name of ['l','t','u','trapezium','afgeschuind','achthoek','driehoek','rechthoek']){
 await page.click(`[data-vorm="${name}"]`);assert.equal(await page.$eval('#vorm-toepassen',e=>e.disabled),false,name);
}

await page.$eval('.vorm-coordinaten',e=>e.open=true);
await page.click('[data-hoek-split="0"]');
assert.equal(await page.$$eval('.vorm-punt-rij',es=>es.length),5,'numeric split rows refreshed');
await page.click('[data-hoek-weg="1"]');
assert.equal(await page.$$eval('.vorm-punt-rij',es=>es.length),4,'numeric delete rows refreshed');
await page.$eval('[data-vorm-coord="x"][data-index="2"]',e=>{e.value=3.5;e.dispatchEvent(new Event('change',{bubbles:true}));});
assert((await page.$eval('#vorm-samenvatting',e=>e.textContent)).includes('11,25'),'precise coordinate area');
await page.$eval('#vorm-canvas',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
const handle=await page.$eval('#vorm-canvas [data-hoek="2"] circle',e=>{const svg=e.ownerSVGElement,p=svg.createSVGPoint();p.x=+e.getAttribute('cx');p.y=+e.getAttribute('cy');const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};});
await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(handle.x-20,handle.y-20,{steps:4});
await page.keyboard.press('Escape');await page.mouse.up();
assert.equal(await page.$eval('#ruimte-vorm',e=>e.open),true,'Escape cancels an active corner drag before closing');
assert((await page.$eval('#vorm-samenvatting',e=>e.textContent)).includes('11,25'),'corner drag cancellation restores geometry');
await page.click('#vorm-cancel');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),initial,'cancel drafts');
await open();await page.click('[data-vorm="vrij"]');
await page.$eval('.vorm-wand-invoer',e=>e.open=true);
for(const [len,angle] of [[4,0],[3,90],[4,180],[3,270]]){await put('vorm-wand-lengte',len);await put('vorm-wand-richting',angle);await page.click('#vorm-wand-add');}
assert((await page.$eval('#vorm-samenvatting',e=>e.textContent)).includes('12,00'),'numeric length and bearing draw closed rectangle');
await page.click('[data-vorm="vrij"]');
for(const [x,y] of [[0,0],[4,3],[0,3],[4,0]])await clickPoint(x,y);
await page.click('#vorm-sluit');assert.equal(await page.$eval('#vorm-toepassen',e=>e.disabled),true,'self intersection blocked');
assert((await page.$eval('#vorm-fout',e=>e.textContent)).includes('zichzelf'));
await page.click('[data-vorm="vrij"]');
for(const [x,y] of [[0,0],[4,0],[3,3],[0,3]])await clickPoint(x,y);
await page.click('#vorm-sluit');assert.equal(await page.$eval('#vorm-toepassen',e=>e.disabled),false);
await page.click('#vorm-toepassen');await klaar();
assert.equal(await page.evaluate(()=>actieveRuimte().contour.length),4);
assert.equal(await page.evaluate(()=>state.offerte.ruimtes[0].vlakken.find(v=>v.sleutel==='vloer').netto),10.5,'free angled polygon area');
const edge=await page.evaluate(()=>BouwVorm.edges(actieveRuimte())[1]);
await page.evaluate(e=>wijzig(()=>{const r=actieveRuimte();state.project.regels=[{id:'punt',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:e.id,hoeveelheid:1,opties:{},visualisatie:{x:3.75,y:.75,z:.3}}];r.openingen=[{naam:'Raam',muur:e.id,breedte:.5,hoogte:.5,aantal:1,positie:.3,borstwering:1}];}),edge);await klaar();
await page.click('[data-plan="aanzicht"]');await page.click(`[data-aanzicht-vlak="${edge.id}"]`);
await kies('punt');const old=await page.evaluate(()=>({...state.project.regels[0].visualisatie}));
await page.keyboard.press('ArrowRight');await klaar();
const moved=await page.evaluate(()=>state.project.regels[0].visualisatie);
assert(Math.abs(moved.x-old.x-edge.u[0]*.05)<.0011);assert(Math.abs(moved.y-old.y-edge.u[1]*.05)<.0011,'diagonal tangent keyboard');
await page.$eval('#plan [data-opening-index="0"]',e=>e.focus());await page.keyboard.press('ArrowRight');await klaar();
assert(Math.abs(await page.evaluate(()=>actieveRuimte().openingen[0].positie)-.35)<.001,'opening slides along diagonal');
await page.click('[data-plan-gereedschap="meet"]');
await page.$eval('#meet-paneel details',e=>e.open=true);
await page.$eval('#meet-form',e=>{for(const [name,value] of Object.entries({'0_0':0,'0_2':.2,'1_0':1,'1_2':.2}))e.elements.namedItem(name).value=value;});
await page.click('#meet-form button');assert.equal(await page.$eval('#meet-afstand',e=>e.textContent),'1,00 m');
await page.click('[data-plan-gereedschap="select"]');
await page.click('[data-plan="isometrie"]');
for(let i=0;i<4;i++){await page.click('[data-camera="rechts"]');assert(!(await page.$eval('#plan',e=>e.innerHTML)).includes('NaN'));}
await page.evaluate(()=>wijzig(()=>{state.project.regels=[];actieveRuimte().openingen=[];}));await klaar();
await open();await page.click('[data-vorm="l"]');await put('vorm-dak','x');await put('vorm-start',1);await put('vorm-eind',3);
await page.screenshot({path:path.join(out,'vorm-editor-desktop.png'),fullPage:false});
await page.click('#vorm-toepassen');await klaar();
await (await page.$('#tekening')).screenshot({path:path.join(out,'vorm-3d.png')});
assert.equal(await page.evaluate(()=>actieveRuimte().contour.length),6);
assert.equal(await page.evaluate(()=>state.offerte.ruimtes[0].vlakken.find(v=>v.sleutel==='vloer').netto),9);
assert(Math.abs(await page.evaluate(()=>state.offerte.ruimtes[0].vlakken.find(v=>v.sleutel==='plafond').netto)-9*Math.sqrt(1.25))<1e-8,'true sloped area');
await page.click('#plan-undo');await klaar();assert.equal(await page.evaluate(()=>actieveRuimte().dak),null);
await page.click('#plan-redo');await klaar();assert.equal(await page.evaluate(()=>actieveRuimte().dak.as),'x');
await page.evaluate(()=>wijzig(()=>{const r=actieveRuimte();state.project.regels=[{id:'g',ruimte_id:r.id,pakket_id:'gyproc_wand_profiel',oppervlak:'wand_5',hoeveelheid:null,opties:{}}];}));await klaar();
await page.click('[data-plan="aanzicht"]');await page.click('[data-aanzicht-vlak="wand_5"]');
assert.equal(await page.evaluate(()=>state.offerte.regels[0].aantal),3,'extra wall area under slope');
await open();await page.click('[data-vorm="driehoek"]');await page.click('#vorm-toepassen');
assert((await page.$eval('#vorm-fout',e=>e.textContent)).includes('nog gebruikt'),'orphan protection');
assert.equal(await page.evaluate(()=>actieveRuimte().contour.length),6);
await page.select('[data-wand-oud="wand_5"]','noord');
page.once('dialog',d=>d.accept());await page.click('#vorm-toepassen');await klaar();
assert.equal(await page.evaluate(()=>actieveRuimte().contour.length),3,'explicit wall remapping enables new shape');
assert.equal(await page.evaluate(()=>state.project.regels[0].oppervlak),'noord');
await page.click('#plan-undo');await klaar();
assert.equal(await page.evaluate(()=>actieveRuimte().contour.length),6,'remap and geometry undo atomically');
assert.equal(await page.evaluate(()=>state.project.regels[0].oppervlak),'wand_5');
await page.click('#plan-focus');await open();await page.click('#vorm-cancel');assert.equal(await page.$eval('#teken-focus',e=>e.open),true,'nested focus dialog');await page.keyboard.press('Escape');
const saved=await page.evaluate(()=>state.project);await page.reload({waitUntil:'networkidle2'});await page.waitForFunction(()=>!!state.offerte);
assert.deepEqual(await page.evaluate(()=>state.project),saved,'geometry persisted');
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('#plan svg.vorm-plan');await open();await page.click('[data-vorm="vrij"]');
for(const [x,y] of [[0,0],[4,0],[2,3]])await clickPoint(x,y,true);
await page.click('#vorm-sluit');assert.equal(await page.$eval('#vorm-toepassen',e=>e.disabled),false,'real touch drawing');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await page.screenshot({path:path.join(out,'vorm-editor-mobiel.png'),fullPage:false});
await page.click('#vorm-cancel');
assert.deepEqual(errors,[]);
console.log('PASS: eight presets, free corner drawing, cancel, polygon area, diagonal wall/object/window movement, local metric ruler, 4 isometric angles, true sloped ceiling/wall areas, orphan protection, geometry undo/redo, focus, persistence, mobile and real touch');
}finally{await browser.close();}
