/* Optional orthographic surface interaction regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/aanzicht_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-aanzicht-review';
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
await page.click('[data-plan="aanzicht"]');
const total=await page.evaluate(()=>state.offerte.totalen.totaal);
for(const vlak of ['noord','oost','zuid','west','vloer','plafond']) {
 await page.click(`[data-aanzicht-vlak="${vlak}"]`);
 assert.equal(await page.$eval('#vlak-bediening',e=>e.hidden),false);
 assert.equal(await page.$eval(`[data-aanzicht-vlak="${vlak}"]`,e=>e.getAttribute('aria-pressed')),'true');
 assert(await page.$('#plan svg.aanzicht'));
 assert(!await page.$eval('#plan',e=>e.innerHTML.includes('NaN')));
 const rendered=await page.$$eval('#plan [data-plan-regel]',es=>es.map(e=>e.dataset.planRegel));
 const expected=await page.evaluate(vlak=>planRegels(actieveRuimte()).filter(r=>r.oppervlak===vlak && r.aantal>0).map(r=>r.id),vlak);
 assert.deepEqual([...new Set(rendered)].sort(),expected.sort(),`only ${vlak} works`);
 assert.equal(await page.$$eval('#plan [data-plan-drag="opening"]',es=>es.length),['noord','west'].includes(vlak)?1:0);
}
async function move(vlak,id,delta,child='.werk-achtergrond') {
 await page.click(`[data-aanzicht-vlak="${vlak}"]`);
 const sel=`#plan [data-plan-regel="${id}"] ${child}`;
 await page.$eval(sel,e=>e.scrollIntoView({block:'center'}));
 const b=await (await page.$(sel)).boundingBox();
 const shift=await page.evaluate(({vlak,delta})=>{
  const {P}=BouwPlan.aanzichtProjectie(actieveRuimte(),vlak),a=P(0,0,0),b=P(...delta),m=document.querySelector('#plan svg').getScreenCTM();
  return [m.a*(b[0]-a[0])+m.c*(b[1]-a[1]),m.b*(b[0]-a[0])+m.d*(b[1]-a[1])];
 },{vlak,delta});
 const before=await page.evaluate(id=>({...state.project.regels.find(r=>r.id===id).visualisatie}),id);
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
 await page.mouse.move(b.x+b.width/2+shift[0],b.y+b.height/2+shift[1],{steps:8});await page.mouse.up();
 const after=await page.evaluate(id=>state.project.regels.find(r=>r.id===id).visualisatie,id);
 for(const [i,k] of (child.includes('data-plan-end') ? ['x2','y2','z2'] : ['x','y','z']).entries()) if(before[k]!=null) assert(Math.abs(after[k]-before[k]-delta[i])<.025,`${vlak} ${k} dragging`);
}
await move('noord','sock',[.3,0,.2]);
await move('west','lav',[0,.3,.2]);
await move('vloer','wc',[.2,.3,0]);
await move('noord','water',[.2,0,.2],'[data-plan-end="b"]');
// Mirrored south/west projection still makes ArrowRight move right on screen.
await page.$eval('#plan [data-plan-regel="sock"]',e=>e.focus());
await page.keyboard.press('ArrowUp');
await page.waitForNetworkIdle({idleTime:300});
await page.click('[data-aanzicht-vlak="west"]');
await page.$eval('#plan [data-plan-regel="lav"]',e=>e.focus());
const old=await page.evaluate(()=>state.project.regels.find(r=>r.id==='lav').visualisatie.y);
await page.keyboard.press('ArrowRight');
assert(Math.abs(await page.evaluate(()=>state.project.regels.find(r=>r.id==='lav').visualisatie.y)-old+.05)<.005);
// Window dragging changes position and sill height, not its dimensions.
await page.click('[data-aanzicht-vlak="noord"]');
const open='#plan [data-opening-index="1"] polygon';
await page.$eval(open,e=>e.scrollIntoView({block:'center'}));
const b=await (await page.$(open)).boundingBox();
await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+15,b.y+b.height/2-20,{steps:6});await page.mouse.up();
assert(await page.evaluate(()=>state.project.ruimtes[0].openingen[1].borstwering>1.2));
assert.equal(await page.evaluate(()=>state.project.ruimtes[0].openingen[1].breedte),1.2);
await page.waitForFunction(t=>state.offerte.totalen.totaal===t,{},total);
await (await page.$('.plankaart')).screenshot({path:path.join(out,'vooraanzicht-desktop.png')});
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.click('[data-plan="aanzicht"]');
await page.click('[data-aanzicht-vlak="noord"]');
await (await page.$('.plankaart')).screenshot({path:path.join(out,'vooraanzicht-mobiel.png')});
const touchSel='#plan [data-plan-regel="sock"] .werk-achtergrond';
await page.$eval(touchSel,e=>e.scrollIntoView({block:'center'}));
const tb=await (await page.$(touchSel)).boundingBox(),tx=tb.x+tb.width/2,ty=tb.y+tb.height/2;
const oldZ=await page.evaluate(()=>state.project.regels.find(r=>r.id==='sock').visualisatie.z);
const client=await page.createCDPSession();
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+12,y:ty-15}]});
await page.waitForFunction(()=>document.querySelector('#plan.is-slepen'));
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForFunction(()=>!document.querySelector('#plan.is-slepen'));
assert(await page.evaluate(()=>state.project.regels.find(r=>r.id==='sock').visualisatie.z)>oldZ,'touch raises symbol');
await page.waitForNetworkIdle({idleTime:300});
await page.waitForFunction(t=>state.offerte.totalen.totaal===t,{},total);
for(const width of [320,390,768,1440]){
 await page.setViewport({width,height:900,isMobile:width<768,hasTouch:width<768});
 await page.click('[data-plan="aanzicht"]');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`layout ${width}`);
}
assert.deepEqual(errors,[]);
console.log('PASS: six orthographic surfaces, matching works/openings, wall/floor/endpoint dragging, mirrored keyboard, window elevation, unchanged totals, responsive layouts, touch');
}finally{await browser.close();}
