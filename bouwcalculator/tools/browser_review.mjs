/* Optional development check; no browser packages are needed by the app itself.
 * npm install --prefix /tmp/bouw-browser puppeteer-core @sparticuz/chromium
 * BROWSER_MODULE_ROOT=/tmp/bouw-browser node bouwcalculator/tools/browser_review.mjs
 * APP_URL=http://localhost:8093/ CHROME_PATH=/path/to/chrome ...
 * APP_URL may also be a file:/// URL to the standalone HTML.
 * Writes reports/screenshots outside Git (default /tmp/bouw-browser-review).
 */
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(process.env.BROWSER_MODULE_ROOT
  ? path.join(path.resolve(process.env.BROWSER_MODULE_ROOT), 'package.json') : import.meta.url);
const puppeteer = require('puppeteer-core');
const chromiumModule = process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
const chromium = chromiumModule?.default || chromiumModule;
const output = process.env.REVIEW_OUTPUT || '/tmp/bouw-browser-review';
await mkdir(output, {recursive:true});
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),
  args:chromium?.args || ['--no-sandbox']});
const page = await browser.newPage();
const errors = [], results = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {if(m.type() === 'error') errors.push(m.text());});
try {
  await page.goto(process.env.APP_URL || 'http://localhost:8093/', {waitUntil:'networkidle2'});
  // Independent repeatable run: clear the browser's previous local project.
  await page.evaluate(() => localStorage.clear());
  await page.reload({waitUntil:'networkidle2'});
  await page.click('[data-actie="opening-toevoegen"][data-soort="Deur"]');
  await page.click('[data-actie="regel-toevoegen"]');
  await page.click('[data-installatie="sanitair"]');
  assert.equal(await page.$$eval('[data-installatie-pakket]', es => es.length), 15);
  await page.select('#san-vlak', 'vloer');
  await page.click('[data-installatie-pakket="san_lavabo"]');
  await page.click('[data-installatie-pakket="san_koudwater"]');
  await page.waitForFunction(() => state.offerte?.regels.length === 3);
  assert.equal(await page.evaluate(() => state.project.regels[2].oppervlak), 'vloer');
  await page.$eval('.regelkaart:last-child [data-hoeveelheid]', el => {
    el.value = '10';
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  });
  await page.waitForFunction(() => state.offerte.regels[2].aantal === 10);
  await page.select('.regelkaart:last-child [data-regel-vlak]', 'west');
  await page.waitForFunction(() => state.offerte.regels[2].oppervlak === 'west');
  await page.click('[data-tab="instellingen"]');
  await page.click('input[name="prijsmodus"][value="m2"]');
  await page.waitForFunction(() => state.project.prijsmodus === 'm2');
  assert.equal(await page.evaluate(() => state.offerte.regels[2].eenheid), 'm');
  await page.click('[data-hoofdtab="tarieven"]');
  await page.select('#tarief-categorie', 'sanitair');
  assert.equal(await page.$$eval('.tarief:not([hidden])', es => es.length), 29);
  await page.reload({waitUntil:'networkidle2'});
  assert.equal(await page.evaluate(() => state.project.regels.length), 3);
  assert.equal(await page.evaluate(() => state.project.regels[2].hoeveelheid), 10);
  // A small viewport alone is not enough: assert layout width does not silently inflate.
  for (const width of [320,360,390,768,1024,1280,1440,1920]) {
    await page.setViewport({width,height:900,isMobile:width<768,hasTouch:width<1024});
    for (const panel of ['calculator','tarieven']) {
      await page.click(`[data-hoofdtab="${panel}"]`);
      if (panel === 'calculator') {
        await page.click('[data-installatie="sanitair"]');
        await page.click('[data-plan="isometrie"]');
        await page.click('[data-camera="rechts"]');
      }
      const size = await page.evaluate(() => ({viewport:innerWidth, scroll:document.documentElement.scrollWidth}));
      assert.equal(size.viewport, width, `Inflated mobile viewport: ${width} ${panel}`);
      assert(size.scroll <= width, `Page overflow: ${width} ${panel}`);
      results.push({width,panel,...size});
      if ([390,1024,1440].includes(width)) {
        await page.screenshot({path:path.join(output, `${panel}-${width}.png`),fullPage:true});
      }
    }
  }
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await page.click('[data-hoofdtab="calculator"]');
  await page.click('[data-installatie="sanitair"]');
  const touch = await page.$$eval('button.knop, button.hoofdtab, button.tab, button.planknop, button.ruimtechip', es =>
    es.filter(e => e.getClientRects().length).map(e => ({text:e.textContent.trim(),height:e.getBoundingClientRect().height})));
  assert(touch.every(e => e.height >= 44), 'Some mobile controls have a target shorter than 44px');
  assert(await page.$eval('[data-hoeveelheid]', e => parseFloat(getComputedStyle(e).fontSize) >= 16));
  await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}, {name:'prefers-reduced-motion',value:'reduce'}]);
  await page.screenshot({path:path.join(output,'calculator-dark-mobile.png'),fullPage:true});
  // Print while the price book is active must still print the quotation, not the editor.
  await page.click('[data-hoofdtab="tarieven"]');
  await page.emulateMediaType('print');
  assert(await page.$eval('#calculator-paneel', e => getComputedStyle(e).display !== 'none'));
  assert(await page.$eval('#paneel-tarieven', e => getComputedStyle(e).display === 'none'));
  assert(await page.$eval('.werkvlak', e => getComputedStyle(e).display === 'none'));
  await page.pdf({path:path.join(output,'offerte.pdf'),format:'A4',printBackground:true});
  assert.deepEqual(errors, []);
  await writeFile(path.join(output,'results.json'), JSON.stringify({browser:await browser.version(), generatedAt:new Date().toISOString(), results,touch,errors},null,2));
  console.log(`PASS: sanitair, quantities, location, mixed m² pricing, rates, reload; ${results.length} viewport/panel checks, touch, dark, reduced motion and print. ${output}`);
} finally {
  await browser.close();
}
