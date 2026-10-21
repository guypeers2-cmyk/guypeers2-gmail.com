/* Contextual next-step regression. Uses an isolated browser profile, never real quotes.
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser APP_URL=http://localhost:8096/
 * node bouwcalculator/tools/next_steps_review.mjs
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
const out = process.env.REVIEW_OUTPUT || '/tmp/bouw-next-steps-review';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),args:chromium?.args || ["--no-sandbox"],defaultViewport:{width:1680,height:1100}});
const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto(process.env.APP_URL||'file:///home/user/guypeers2-gmail.com/bouwcalculator/bouwcalculator.html',{waitUntil:'networkidle2'});await page.waitForFunction(()=>state.rekenStatus==='ready');await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
async function click(s){await page.$eval(s,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(s);}
await page.evaluate(()=>{const p=nieuwProject();p.regels=[];laadProject(p);BouwHuis.setLevel('ruimte');});await page.waitForFunction(()=>state.rekenStatus==='ready');
assert(await page.evaluate(()=>state.prijsboek.pakketten.every(p=>BouwVervolg.suggesties(p.id,state.prijsboek.pakketten).every(q=>q.id!==p.id&&state.prijsboek.pakketten.some(k=>k.id===q.id)))));
await click('#tekening [data-object-menu]');await page.type('#object-zoek','sleuf');await page.$eval('#object-aantal',e=>e.value='5');await click('[data-object-toevoegen="elek_sleuf"]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.$eval('#object-vervolg',e=>e.hidden),false);assert(await page.$('[data-object-vervolg="elek_kabel_3g25"]'));assert(await page.$('[data-object-vervolg="san_koudwater"]'));assert(await page.$('[data-object-vervolg="elek_sleuf_dichten"]'));assert.equal(await page.evaluate(()=>state.project.regels.length),1);
await click('[data-object-vervolg="elek_kabel_3g25"]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert(await page.evaluate(()=>state.project.regels[1].hoeveelheid===5&&state.project.regels[1].oppervlak===state.project.regels[0].oppervlak));assert(await page.$('[data-object-vervolg="elek_stopcontact"]'));await click('[data-object-vervolg="elek_stopcontact"]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.regels[2].hoeveelheid),1);assert.equal(await page.evaluate(()=>state.project.regels.length),3);await click('[data-object-vervolg="elek_sleuf_dichten"]');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.regels.length),4);assert.equal(await page.evaluate(()=>state.project.regels[3].hoeveelheid),5);assert.equal(await page.$$('#object-vervolg-keuzes button').then(es=>es.length),0);assert((await page.$eval('#object-vervolg-bron',e=>e.textContent)).includes('Geen specifieke'));
await click('#object-menu-sluit');await click('#plan-undo');await page.waitForFunction(()=>state.rekenStatus==='ready');assert.equal(await page.evaluate(()=>state.project.regels.length),3);await click('#tekening [data-object-menu]');assert(await page.$('[data-object-vervolg="elek_sleuf_dichten"]'));await page.select('#object-vlak','oost');assert.equal(await page.$eval('#object-vervolg',e=>e.hidden),true);await page.select('#object-vlak','noord');assert.equal(await page.$eval('#object-vervolg',e=>e.hidden),false);
await page.evaluate(()=>wijzig(()=>state.project.regels.at(-1).hoeveelheid=2));await page.waitForFunction(()=>state.rekenStatus==='ready');const before=await page.evaluate(()=>JSON.stringify(state.project));await click('[data-object-vervolg="elek_sleuf_dichten"]');assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);assert.equal(await page.$eval('#object-vervolg',e=>e.hidden),true);
await click('#object-menu-sluit');await click('#tekening [data-object-menu]');for(const width of [320,390,768,1440]){await page.setViewport({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.$eval('#object-menu',e=>e.scrollWidth>e.clientWidth),false);}
await click('#object-vervolg-stop');assert.equal(await page.$eval('#object-vervolg',e=>e.hidden),true);assert.equal(await page.evaluate(()=>JSON.stringify(state.project)),before);assert.deepEqual(errors,[]);console.log('PASS next steps: trench → cable → socket → fill, filtered search bypass, optional only, metres retained, pieces reset, same surface, undo/resume, surface isolation, stale guard, skip and 320–1440px');
}finally{await browser.close();}
