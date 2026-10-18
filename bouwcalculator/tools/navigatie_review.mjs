/* Optional camera and focus-mode regression test. Same tooling as browser_review.mjs.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8094/ node bouwcalculator/tools/navigatie_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-navigatie-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL || 'http://localhost:8094/',{waitUntil:'networkidle2'});


await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.evaluate(()=>{
 const r=actieveRuimte();state.project.regels=[{id:'pan',ruimte_id:r.id,pakket_id:'elek_stopcontact',oppervlak:'noord',hoeveelheid:1,opties:{},notitie:'',visualisatie:{x:1,y:.1,z:.3}}];wijzig(()=>{});
});
await page.waitForFunction(()=>state.offerte.regels.length===1);
const original=await page.evaluate(()=>JSON.stringify(state.project));
for(const view of ['plattegrond','aanzicht','isometrie']){
 await page.click(`[data-plan="${view}"]`);
 await page.click('[data-camera="reset"]');
 await page.click('[data-camera="in"]');await page.click('[data-camera="in"]');
 const before=await page.$eval('#plan svg',e=>e.getAttribute('viewBox'));
 await page.click('[data-plan-gereedschap="hand"]');
 const b=await (await page.$('#plan svg')).boundingBox();
 const x=b.x+b.width/2,y=b.y+b.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y+40,{steps:6});await page.mouse.up();
 assert.notEqual(await page.$eval('#plan svg',e=>e.getAttribute('viewBox')),before,`${view} pan`);
 assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'camera is not an object move');
 assert.equal(await page.$eval('#object-menu',e=>e.open),false,'panning never opens catalog');
 const camera=await page.evaluate(()=>({...planCamera}));
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-20,y-20,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>({...planCamera})),camera,'Escape rolls back pan');
 await page.$eval('#plan [data-plan-regel="pan"]',e=>e.focus());await page.keyboard.press('ArrowRight');
 assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original,'hand keyboard does not move objects');
 await page.click('[data-camera="reset"]');
 assert.equal(await page.evaluate(()=>planCamera.panX),0);assert.equal(await page.evaluate(()=>planCamera.panY),0);
}
await page.click('[data-plan-gereedschap="select"]');
await page.click('#plan-focus');
assert.equal(await page.$eval('#teken-focus',e=>e.open),true);
assert(await page.$('#teken-focus #tekening #plan svg'));
await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
assert(await page.evaluate(()=>!!document.activeElement.closest('#teken-focus')),'native focus remains inside enlarged drawing');
assert.equal(await page.$$eval('#tekening',es=>es.length),1,'same scene, not a cloned canvas');
await page.click('[data-plan-gereedschap="hand"]');
const focusBox=await (await page.$('#plan svg')).boundingBox();
const fx=focusBox.x+focusBox.width/2,fy=focusBox.y+focusBox.height/2;
const cameraBefore=await page.evaluate(()=>({...planCamera}));
await page.mouse.move(fx,fy);await page.mouse.down();await page.mouse.move(fx+25,fy+25,{steps:4});
await page.keyboard.press('Escape');await page.mouse.up();
assert.equal(await page.$eval('#teken-focus',e=>e.open),true,'Escape cancels gesture before closing focus mode');
assert.deepEqual(await page.evaluate(()=>({...planCamera})),cameraBefore);
await page.click('[data-plan-gereedschap="select"]');
await page.click('.object-menu-start');assert.equal(await page.$eval('#object-menu',e=>e.open),true);
await page.keyboard.press('Escape');assert.equal(await page.$eval('#teken-focus',e=>e.open),true,'nested modal closes first');
await (await page.$('#teken-focus')).screenshot({path:path.join(out,'focus-desktop.png')});
await page.keyboard.press('Escape');
await page.waitForFunction(()=>!!document.querySelector('#werkvlak > #tekening'));
assert.equal(await page.$eval('#teken-focus',e=>e.open),false);
assert.equal(await page.evaluate(()=>document.activeElement.id),'plan-focus');
await page.click('#plan-focus');
await page.pdf({path:path.join(out,'offerte-vanuit-focus.pdf'),format:'A4',printBackground:true});
assert.equal(await page.$eval('#teken-focus',e=>e.open),true,'focus restored after print');
await page.click('#plan-focus');
// Full settings live outside the dialog: reaching them must leave focus mode.
await page.click('#plan-focus');
await page.$eval('#plan [data-plan-regel="pan"]',e=>e.focus());await page.keyboard.press('Enter');
await page.click('#plan-eigenschappen');await page.click('#plan-volledige-regel');
assert.equal(await page.$eval('#teken-focus',e=>e.open),false);
assert.equal(await page.$eval('#werk-invoer',e=>e.open),true);
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.click('#plan-focus');await page.click('[data-plan-gereedschap="hand"]');
const b=await (await page.$('#plan svg')).boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;
const client=await page.createCDPSession();
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+30,y:y+20}]});
await page.waitForFunction(()=>planCamera.panX!==0);
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForFunction(()=>!document.querySelector('#plan.is-pannen'));
assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),original);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await (await page.$('#teken-focus')).screenshot({path:path.join(out,'focus-mobiel.png')});
await page.click('#plan-focus');
assert.deepEqual(errors,[]);
console.log('PASS: pan all 3 views, keyboard hand, Escape rollback, unchanged project, native focus dialog/restore, nested catalog, print restore, real touch panning, mobile layout');
}finally{await browser.close();}
