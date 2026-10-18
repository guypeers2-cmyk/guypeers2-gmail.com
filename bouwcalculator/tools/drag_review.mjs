/* Optional drag interaction regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/drag_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-drag-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});
await page.evaluate(()=>{
 const id=state.project.ruimtes[0].id;
 state.project.ruimtes=[{id,naam:'Badkamer & technieken',lengte:6,breedte:4,hoogte:2.7,openingen:[{naam:'Deur',muur:'west',breedte:.9,hoogte:2.1,aantal:1,positie:.5},{naam:'Raam',muur:'noord',breedte:1.2,hoogte:1,aantal:1,positie:3.5,borstwering:1.2}]}];
 const regel=(id2,pakket_id,oppervlak,hoeveelheid,visualisatie={})=>({id:id2,ruimte_id:id,pakket_id,oppervlak,hoeveelheid,opties:{},notitie:'',visualisatie});
 state.project.regels=[
 regel('gyproc','gyproc_wand_profiel','noord',null),
 regel('plaf','schilderen_gyproc','plafond',null),
 regel('sock','elek_stopcontact','noord',4,{x:2.2,y:.15,z:.3}),
 regel('licht','elek_lichtpunt','plafond',1,{x:3,y:2,z:2.7}),
 regel('water','san_koudwater','noord',6,{x:.4,y:.1,z:.4,x2:5.3,y2:.1,z2:.4}),
 regel('warm','san_warmwater','noord',6,{x:.4,y:.3,z:.7,x2:5.3,y2:.3,z2:.7}),
 regel('afvoer','san_afvoer110','vloer',3,{x:4.8,y:.6,z:0,x2:4.8,y2:3.5,z2:0}),
 regel('wc','san_wc','vloer',1,{x:4.6,y:.6,z:0}),
 regel('lav','san_lavabo','west',1,{x:.2,y:2.6,z:.6}),
 regel('sleuf','elek_sleuf','noord',5,{x:1,y:.5,z:1,x2:5,y2:.5,z2:1}),
 regel('test','san_druktest','vloer',1,{x:2,y:2,z:0})];
 wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte?.regels.length===11);
assert.equal(await page.$$eval('#plan .werk-object',es=>es.length),9);
assert.equal(await page.$$eval('#plan .werk-vlak',es=>es.length),2);
assert.equal(await page.$$eval('#plan-legenda [data-plan-regel]',es=>es.length),11);
await page.addStyleTag({content:'.topbar{position:static!important}'});
await (await page.$('.plankaart')).screenshot({path:path.join(out,'alles-2d.png')});
await page.click('[data-plan="isometrie"]');
assert.equal(await page.$$eval('#plan .werk-object',es=>es.length),9);
assert(await page.$('#plan .werk-volume'));
await (await page.$('.plankaart')).screenshot({path:path.join(out,'alles-3d.png')});
const totaal=await page.evaluate(()=>state.offerte.totalen.totaal);
const count=await page.evaluate(()=>state.project.regels.length);
const rule=id=>page.evaluate(id=>state.project.regels.find(r=>r.id===id).visualisatie,id);
async function dragBy(selector,delta,{cancel=false}={}) {
 await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));
 const b=await (await page.$(selector)).boundingBox();
 const shift=await page.evaluate(delta=>{
  const room=actieveRuimte();
  const P=(planWeergave==='isometrie'?window.BouwPlan.projectie(room,planCamera.hoek):window.BouwPlan.planProjectie(room)).P;
  const a=P(0,0,0),b=P(...delta),m=document.querySelector('#plan svg').getScreenCTM();
  return [m.a*(b[0]-a[0])+m.c*(b[1]-a[1]),m.b*(b[0]-a[0])+m.d*(b[1]-a[1])];
 },delta);
 const x=b.x+b.width/2,y=b.y+b.height/2;
 await page.mouse.move(x,y);await page.mouse.down();
 await page.mouse.move(x+shift[0],y+shift[1],{steps:8});
 if(cancel) await page.keyboard.press('Escape');
 await page.mouse.up();
 await page.waitForFunction(()=>!document.querySelector('#plan.is-slepen'));
}
await page.click('[data-plan="plattegrond"]');
await dragBy('#plan [data-plan-regel="sock"] .werk-achtergrond',[.5,.5,0]);
let v=await rule('sock');
assert(Math.abs(v.x-2.7)<.02 && Math.abs(v.y-.65)<.02,`2D symbol move: ${JSON.stringify(v)}`);
let before=await rule('afvoer');
await dragBy('#plan [data-plan-regel="afvoer"] [data-plan-end="b"]',[-.5,0,0]);
v=await rule('afvoer');
assert.equal(v.x,before.x);assert(Math.abs(v.x2-(before.x2-.5))<.02,'route endpoint');
before=await rule('afvoer');
await dragBy('#plan [data-plan-regel="afvoer"] .werk-trace',[-.3,-.2,0]);
v=await rule('afvoer');
assert(Math.abs((v.x2-v.x)-(before.x2-before.x))<.005,'whole route retains vector');
assert(Math.abs((v.y2-v.y)-(before.y2-before.y))<.005,'whole route retains vector Y');
before=await rule('sock');
await dragBy('#plan [data-plan-regel="sock"] .werk-achtergrond',[.5,0,0],{cancel:true});
assert.deepEqual(await rule('sock'),before,'Escape restores');
await dragBy('#plan [data-plan-drag="opening"][data-opening-index="0"] .plan-deur',[0,.4,0]);
assert(Math.abs(await page.evaluate(()=>state.project.ruimtes[0].openingen[0].positie)-.9)<.03,'door position');
await dragBy('#plan [data-plan-regel="gyproc"] .werk-vlak-badge',[.4,.2,0]);
assert((await rule('gyproc')).x>0,'finish badge position');
await page.click('[data-plan="isometrie"]');
for(let hoek=0;hoek<4;hoek++){
 before=await rule('sock');
 await dragBy('#plan [data-plan-regel="sock"] .werk-achtergrond',[.2,0,.2]);
 v=await rule('sock');
 assert(Math.abs(v.x-before.x-.2)<.025,`3D X angle ${hoek}`);
 assert(Math.abs(v.z-before.z-.2)<.025,`3D Z angle ${hoek}`);
 await page.click('[data-camera="rechts"]');
}
// Windows can move along a wall and vertically; doors keep their floor level.
await dragBy('#plan [data-plan-drag="opening"][data-opening-index="1"] .iso-glas',[-.3,0,.2]);
assert(Math.abs(await page.evaluate(()=>state.project.ruimtes[0].openingen[1].positie)-3.2)<.03,'window along wall');
assert(Math.abs(await page.evaluate(()=>state.project.ruimtes[0].openingen[1].borstwering)-1.4)<.03,'window height');
await page.$eval('#plan [data-plan-regel="sock"]',e=>e.focus());
before=await rule('sock');await page.keyboard.press('ArrowRight');
assert(Math.abs((await rule('sock')).x-before.x-.05)<.005,'keyboard 5 cm');
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
assert.equal(await page.evaluate(()=>document.activeElement?.dataset.planRegel),'sock','keyboard focus survives calculation');
await page.keyboard.down('Shift');await page.keyboard.press('ArrowRight');await page.keyboard.up('Shift');
assert(Math.abs((await rule('sock')).x-before.x-.3)<.005,'keyboard repeated with Shift');
await page.click('[data-camera="in"]');
before=await rule('sock');
await dragBy('#plan [data-plan-regel="sock"] .werk-achtergrond',[-.2,0,0]);
assert(Math.abs((await rule('sock')).x-before.x+.2)<.025,'zoom mapping');
assert.equal(await page.evaluate(()=>state.project.regels.length),count,'no accidental work added');
await page.waitForFunction(expected=>state.offerte.totalen.totaal===expected,{},totaal);
const saved=await rule('sock');await page.reload({waitUntil:'networkidle2'});
assert.deepEqual(await rule('sock'),saved,'positions persist');
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.click('[data-plan="plattegrond"]');
// Real touch events via Chrome's input domain (Pointer Events pointerType=touch).
const sel='#plan [data-plan-regel="sock"] .werk-achtergrond';
await page.$eval(sel,e=>e.scrollIntoView({block:'center'}));
const box=await (await page.$(sel)).boundingBox();
const client=await page.createCDPSession();
const x=box.x+box.width/2,y=box.y+box.height/2;
before=await rule('sock');
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+20,y:y+15}]});
await page.waitForFunction(()=>document.querySelector('#plan.is-slepen'));
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForFunction(()=>!document.querySelector('#plan.is-slepen'));
await page.waitForFunction(()=>document.querySelector('#status').textContent!=='Berekenen…');
v=await rule('sock');assert(v.x!==before.x || v.y!==before.y,'touch drag');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
// Browser/system cancellation rolls back the live preview rather than saving it.
await page.$eval(sel,e=>e.scrollIntoView({block:'center'}));
const cancelBox=await (await page.$(sel)).boundingBox();
const cx=cancelBox.x+cancelBox.width/2,cy=cancelBox.y+cancelBox.height/2;
before=await rule('sock');
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy}]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+20,y:cy+15}]});
await page.waitForFunction(()=>document.querySelector('#plan.is-slepen'));
await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
await page.waitForFunction(()=>!document.querySelector('#plan.is-slepen'));
assert.deepEqual(await rule('sock'),before,'touch cancel restores position');
assert.equal(await page.evaluate(()=>state.project.regels.length),count);
await page.waitForFunction(expected=>state.offerte.totalen.totaal===expected,{},totaal);
assert.deepEqual(errors,[]);
console.log('PASS: 2D/3D dragging, endpoints, whole routes, openings, finish badges, cancel, all 4 angles, zoom, keyboard, touch, persistence, unchanged totals');
}finally{await browser.close();}
