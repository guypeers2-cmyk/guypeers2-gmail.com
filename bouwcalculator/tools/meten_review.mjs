/* Optional metric control ruler regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/meten_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-meten-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});


await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{
 const r=actieveRuimte();Object.assign(r,{lengte:4,breedte:3,hoogte:2.5});
 state.project.regels=[{id:'meet',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},notitie:''}];wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte.regels.length===1);
const original=await page.evaluate(()=>JSON.stringify(state.project));
await page.click('[data-plan-gereedschap="meet"]');
async function screen(p){
 return page.evaluate(p=>{
  const r=actieveRuimte(),P=(planWeergave==='aanzicht'?BouwPlan.aanzichtProjectie(r,planVlak):planWeergave==='isometrie'?BouwPlan.projectie(r,planCamera.hoek):BouwPlan.planProjectie(r)).P;
  const s=document.querySelector('#plan svg'),q=s.createSVGPoint(),v=P(...p);q.x=v[0];q.y=v[1];const t=q.matrixTransform(s.getScreenCTM());return {x:t.x,y:t.y};
 },p);
}
async function measure(a,b,{drag=false}={}){
 await page.click('#meet-wis');
 await page.$eval('#plan',e=>e.scrollIntoView({block:'center'}));
 const p=await screen(a),q=await screen(b);
 await page.mouse.move(p.x,p.y);
 if(drag){await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:6});await page.mouse.up();}
 else {await page.mouse.click(p.x,p.y);await page.mouse.move(q.x,q.y,{steps:4});await page.mouse.click(q.x,q.y);}
 const m=await page.evaluate(()=>BouwMeten.status());
 assert(m.klaar,'measurement complete');
 assert(Math.abs(m.lengte-Math.hypot(...a.map((v,i)=>b[i]-v)))<.01,`metric distance ${JSON.stringify(m)}`);
 assert(await page.$('#plan .meet-overlay'));
}
await measure([.5,.5,0],[2,2.5,0]);
assert.equal(await page.$eval('#meet-afstand',e=>e.textContent),'2,50 m');
await page.click('[data-camera="in"]');
assert.equal(await page.$eval('#meet-afstand',e=>e.textContent),'2,50 m','zoom preserves real distance');
await page.click('[data-camera="reset"]');
await page.click('[data-plan="aanzicht"]');
for(const vlak of ['noord','oost','zuid','west','vloer','plafond']){
 await page.click(`[data-aanzicht-vlak="${vlak}"]`);
 const points={noord:[[.5,0,.5],[2,0,2]],zuid:[[.5,3,.5],[2,3,2]],oost:[[4,.5,.5],[4,2,2]],west:[[0,.5,.5],[0,2,2]],vloer:[[.5,.5,0],[2,2,0]],plafond:[[.5,.5,2.5],[2,2,2.5]]}[vlak];
 await measure(...points,{drag:true});
}
await page.click('[data-plan="isometrie"]');
for(const plane of ['xy','xz','yz']){
 await page.select('#meet-vlak',plane);
 const points={xy:[[.5,.5,0],[2,2,0]],xz:[[.5,0,.5],[2,0,2]],yz:[[0,.5,.5],[0,2,2]]}[plane];
 for(let i=0;i<4;i++){await measure(...points);await page.click('[data-camera="rechts"]');}
}
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'measurements never alter project');
await page.click('#plan-focus');
await page.click('#meet-wis');
await page.$eval('#plan',e=>e.scrollIntoView({block:'center'}));
const p=await screen([0,.5,.5]);await page.mouse.click(p.x,p.y);
await page.keyboard.press('Escape');
assert.equal(await page.evaluate(()=>BouwMeten.status()),null);
assert.equal(await page.$eval('#teken-focus',e=>e.open),true,'Escape clears pending measure before closing focus');
await page.click('#plan-focus');
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.waitForSelector('#plan svg');
await page.click('[data-plan-gereedschap="meet"]');
await page.$eval('#plan',e=>e.scrollIntoView({block:'center'}));
const a=await screen([.5,.5,0]),b=await screen([2,2.5,0]),client=await page.createCDPSession();
for(const p of [a,b]){
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
await page.waitForFunction(()=>BouwMeten.status()?.klaar);
assert(Math.abs(await page.evaluate(()=>BouwMeten.status().lengte)-2.5)<.01);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await (await page.$('.plankaart')).screenshot({path:path.join(out,'meten-mobiel.png')});
await page.$eval('#meet-paneel details',e=>e.open=true);
for(const [name,value] of [['0_0',0],['0_1',0],['1_0',3],['1_1',0]])await page.$eval(`#meet-form [name="${name}"]`,(e,v)=>e.value=v,value);
await page.click('#meet-form [type="submit"]');
assert.equal(await page.evaluate(()=>BouwMeten.status().lengte),3,'numeric accessible measurement');
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
assert.deepEqual(errors,[]);
console.log('PASS: metric ruler in 2D, six front views, three 3D planes at four angles, zoom, drag/tap, Escape, focus, real touch, numeric entry, unchanged project');
}finally{await browser.close();}
