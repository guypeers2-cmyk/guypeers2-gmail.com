/* Evidence-led mobile regression. Isolated profile and synthetic data only.
 * LD_LIBRARY_PATH=/tmp/al2023/lib BROWSER_MODULE_ROOT=/home/user/.cache/bouw-browser node bouwcalculator/tools/research_mobile_review.mjs
 */
import {createRequire} from 'node:module';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.env.BROWSER_MODULE_ROOT?path.join(process.env.BROWSER_MODULE_ROOT,'package.json'):import.meta.url);
const puppeteer=require('puppeteer-core'),cm=process.env.CHROME_PATH?null:require('@sparticuz/chromium'),chromium=cm?.default||cm;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||await chromium.executablePath(),args:chromium?.args||['--no-sandbox']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const out=process.env.REVIEW_OUTPUT||'/tmp/bouw-research-mobile';await mkdir(out,{recursive:true});
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
async function value(s,v){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.type(v);}
try{
for(const [width,height] of [[320,568],[390,844],[896,414]]){
await page.setViewport({width,height,isMobile:true,hasTouch:true});await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.$eval('#wizard-size input[name=naam]',e=>{e.value='';e.setAttribute('aria-describedby','test-help');const hint=document.createElement('span');hint.id='test-help';hint.textContent='Naam van de ruimte';e.after(hint);e.dispatchEvent(new Event('input',{bubbles:true}));});
await click('#wizard-next');assert.equal(await page.$eval('#wizard-size input[name=naam]',e=>e.getAttribute('aria-invalid')),'true');assert((await page.$eval('#wizard-size input[name=naam]',e=>e.getAttribute('aria-describedby'))).includes('test-help'));assert(await page.$('.ui-field-error'));assert.equal(await page.$eval('#wizard-size',e=>e.dataset.guidedPage),'0');
await value('#wizard-size input[name=naam]','Woonkamer');assert.equal(await page.$eval('#wizard-size input[name=naam]',e=>e.hasAttribute('aria-invalid')),false);assert.equal(await page.$eval('#wizard-size input[name=naam]',e=>e.getAttribute('aria-describedby')),'test-help');
for(let i=0;i<7;i++)await click('#wizard-next');
await value('#point-number','1.5');const before=await page.evaluate(()=>JSON.stringify(state.project));await click('#wizard-next');assert.equal(await page.$eval('#point-number',e=>e.getAttribute('aria-invalid')),'true');assert.equal(await page.$eval('#point-number',e=>e.value),'1.5');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);
await click('[data-point-count="1"]');assert.equal(await page.$eval('#point-number',e=>e.hasAttribute('aria-invalid')),false);await click('#wizard-next');await click('[data-point="socket"]');await click('[data-point="single"]');await click('[data-point="inbouw"]');
assert.equal(await page.$eval('#wizard-content',e=>e.firstElementChild.id),'point-drawing');const coords=await page.evaluate(()=>({drawing:document.querySelector('#point-drawing').getBoundingClientRect().top,form:document.querySelector('#point-form').getBoundingClientRect().top}));assert(coords.drawing<coords.form);assert((await page.$eval('.point-figure figcaption',e=>e.textContent)).includes('✓ Bevestigd · ◌ Voorstel'));assert.equal(await page.$eval('.point-dot',e=>getComputedStyle(e).strokeDasharray),'3px, 2px');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,`${width}-placement.png`)});
if(width<600){
// Simulates visual viewport shrink/pan. This is not a physical iOS/Android keyboard test.
await page.evaluate(()=>{window.originalVisualViewport=visualViewport;const mock=new EventTarget();Object.assign(mock,{height:innerHeight-260,offsetTop:0});Object.defineProperty(window,'visualViewport',{value:mock,configurable:true});document.querySelector('#point-x').focus();BouwUI.viewportLayout();BouwUI.keepVisible(document.querySelector('#point-x'));});
await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const keyboard=await page.evaluate(()=>{const input=document.querySelector('#point-x').getBoundingClientRect(),footer=document.querySelector('.wizard-bottom').getBoundingClientRect(),head=document.querySelector('.topbar').getBoundingClientRect();return {active:document.body.classList.contains('ui-keyboard-open'),bottom:footer.bottom,viewport:visualViewport.height,fieldTop:input.top,fieldBottom:input.bottom,footerTop:footer.top,headBottom:head.bottom};});
assert(keyboard.active);assert(Math.abs(keyboard.bottom-keyboard.viewport)<2,JSON.stringify(keyboard));assert(keyboard.fieldTop>=keyboard.headBottom-1&&keyboard.fieldBottom<=keyboard.footerTop,JSON.stringify(keyboard));
await page.evaluate(()=>{visualViewport.offsetTop=24;visualViewport.height=innerHeight-284;BouwUI.viewportLayout();});assert.equal(await page.$eval('.wizard-bottom',e=>getComputedStyle(e).bottom),'260px');
await page.evaluate(()=>{Object.defineProperty(window,'visualViewport',{value:originalVisualViewport,configurable:true});BouwUI.viewportLayout();});assert.equal(await page.$eval('.wizard-bottom',e=>getComputedStyle(e).bottom),'0px');
}
await value('#point-x','1,2');await value('#point-z','0,4');await click('#wizard-next');await click('[data-point="trench-yes"]');await value('#point-length','0');await click('#wizard-next');assert.equal(await page.$eval('#point-length',e=>e.getAttribute('aria-invalid')),'true');await value('#point-length','1,5');await click('#wizard-next');assert.equal(await page.$eval('#wizard-content',e=>e.firstElementChild.id),'point-drawing');assert.equal(await page.$eval('#point-start',e=>e.value),'1.2');
await page.evaluate(()=>document.documentElement.dataset.theme='dark');assert.equal(await page.$eval('.point-dot',e=>getComputedStyle(e).stroke),'rgb(107, 140, 255)');await page.evaluate(()=>document.documentElement.dataset.theme='light');
}
assert.deepEqual(errors,[]);console.log('PASS researched mobile UI: inline validation + ARIA recovery, retained input/hints, clickable correction, drawing before coordinates and trench, non-colour draft status, no overflow, light/dark, emulated keyboard shrink/pan/recovery with unobscured input/footer (320/390px), landscape 896px. Screenshots: '+out);
}finally{await browser.close();}
