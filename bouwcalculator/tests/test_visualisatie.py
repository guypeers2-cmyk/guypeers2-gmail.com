"""Posities blijven behouden zonder invloed op prijzen; SVG-geometrie is begrensd."""
import json
from pathlib import Path
import shutil
import subprocess
import unittest

from bouw.model import Opening


class OpeningPositieTest(unittest.TestCase):
    def test_roundtrip(self):
        data = {"naam": "Raam", "positie": "1,25", "borstwering": "0,9"}
        opening = Opening.van_dict(data)
        self.assertEqual(opening.positie, 1.25)
        self.assertEqual(opening.borstwering, 0.9)
        self.assertEqual(Opening.van_dict(opening.naar_dict()), opening)

    def test_oude_projecten_en_lege_positie(self):
        for data in ({}, {"positie": ""}, {"positie": None}):
            self.assertIsNone(Opening.van_dict(data).positie)
        opening = Opening.van_dict({"positie": -2, "borstwering": -1})
        self.assertEqual((opening.positie, opening.borstwering), (0, 0))

    @unittest.skipUnless(shutil.which("node"), "Node nodig voor SVG-test")
    def test_svg(self):
        script = Path(__file__).resolve().parents[1] / "web" / "plattegrond.js"
        code = r'''
const assert = require('node:assert/strict');
global.window = {};
require(process.argv[1]);
const r = {naam: '<script>', lengte: 4, breedte: 3, hoogte: 2.5,
  openingen: [{naam: 'Raam', muur: 'noord', breedte: 1, hoogte: 1,
    positie: 1, borstwering: 0.9}]};
const plan = window.BouwPlan.plattegrond(r, [], {});
assert(!plan.includes('<script>'));
assert(plan.includes('plan-raam'));
const iso = window.BouwPlan.isometrie(r, [], {});
assert(iso.includes('iso-opening'));
assert(!iso.includes('NaN'));
r.openingen[0].positie = 99;
r.openingen[0].borstwering = 99;
assert(!window.BouwPlan.isometrie(r, [], {}).includes('NaN'));
assert(!window.BouwPlan.plattegrond(r, [], {}).includes('NaN'));
// Elke kijkrichting toont exact twee bijbehorende wanden.
for (const [hoek, zijden] of [['noord','west'], ['noord','oost'], ['zuid','oost'], ['zuid','west']].entries()) {
  const beeld = window.BouwPlan.isometrie(r, [], {}, {hoek});
  const zichtbaar = [...beeld.matchAll(/data-vlak="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(zichtbaar, zijden);
  assert.equal((beeld.match(/class="iso-wand plan-wand/g) || []).length, 2);
  assert(beeld.includes('maskUnits="userSpaceOnUse"'));
  assert(!beeld.includes('NaN'));
}
assert(window.BouwPlan.isometrie(r, [], {}, {zoom: 1.6}).includes('viewBox="146.25 105 487.5 350"'));
assert(!window.BouwPlan.isometrie(r, [], {}, {maten: false}).includes('iso-samenvatting'));
const werk = window.BouwPlan.isometrie(r, [], {noord: '<img src=x>'});
assert(werk.includes('heeft-werk'));
assert(!werk.includes('<img src=x>'));
console.log('OK');
'''
        result = subprocess.run(["node", "-e", code, str(script)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")


class WerkPlaatsingTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node nodig voor tracélengte")
    def test_rechte_trace_lengte(self):
        script = Path(__file__).resolve().parents[1] / "web" / "plattegrond.js"
        code = r"""
const assert=require('node:assert/strict');global.window={};require(process.argv[1]);
const room={lengte:4,breedte:3,hoogte:2.5};
const regel={pakket:{eenheid:'m'},oppervlak:'vloer',visualisatie:{x:0,y:0,z:0,x2:3,y2:0,z2:2}};
assert(Math.abs(window.BouwPlan.traceLengte(regel,room)-Math.sqrt(13))<1e-12);
assert.equal(window.BouwPlan.traceLengte({...regel,pakket:{eenheid:'st'}},room),null);
assert.equal(window.BouwPlan.traceLengte({...regel,visualisatie:{x:1,y:1,z:1,x2:1,y2:1,z2:1}},room),0);
assert.equal(window.BouwPlan.traceLengte({...regel,visualisatie:{x:0,y:0,z:0,x2:99,y2:0,z2:0}},room),4);
console.log('OK');
"""
        result = subprocess.run(["node", "-e", code, str(script)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")

    def test_roundtrip_en_berekening_ongewijzigd(self):
        from bouw.model import Werkregel
        from bouw.offerte import bereken_offerte
        regel = Werkregel.van_dict({"id": "e", "ruimte_id": "r", "pakket_id": "elek_stopcontact",
                                   "hoeveelheid": 2, "visualisatie": {"x": "1,25", "y": 0, "z": .3}})
        self.assertEqual(regel.visualisatie, {"x": 1.25, "y": 0, "z": .3})
        self.assertEqual(Werkregel.van_dict(regel.naar_dict()), regel)
        project = {"ruimtes": [{"id": "r"}], "regels": [regel.naar_dict()]}
        voor = bereken_offerte(project)
        project["regels"][0]["visualisatie"] = {"x": 99, "y": 99, "z": 99}
        na = bereken_offerte(project)
        self.assertEqual(voor["totalen"], na["totalen"])
        self.assertEqual(na["project"]["regels"][0]["visualisatie"], {"x": 99, "y": 99, "z": 99})

    def test_oude_en_ongeldige_plaatsingen(self):
        from bouw.model import Werkregel
        for v in (None, [], "bad", 42):
            self.assertEqual(Werkregel.van_dict({"visualisatie": v}).visualisatie, {})
        self.assertEqual(Werkregel.van_dict({"visualisatie": {"x": -1, "y": "bad", "z": float("inf"), "onbekend": 2}}).visualisatie, {"x": 0})

    @unittest.skipUnless(shutil.which("node"), "Node nodig voor SVG-test")
    def test_alle_pakketten_in_beide_aanzichten(self):
        from bouw.tarieven import PAKKETTEN
        script = Path(__file__).resolve().parents[1] / "web" / "plattegrond.js"
        code = r'''
const assert = require('node:assert/strict');
global.window = {}; require(process.argv[1]);
const pakketten = JSON.parse(process.argv[2]);
const room = {naam:'<img>', lengte:6,breedte:4,hoogte:2.7,openingen:[]};
const regels = pakketten.map((p,i)=>({id:'r'+i,pakket_id:p.id,pakket:p,nummer:i+1,
  oppervlak:'noord', aantal:2,visualisatie:{x:1,y:.1,z:.3}}));
for (const draw of [window.BouwPlan.plattegrond,window.BouwPlan.isometrie]) {
  const svg = draw(room,[],{},{regels});
  for (const r of regels) assert(svg.includes('data-plan-regel="'+r.id+'"'));
  assert(!svg.includes('NaN'));
  assert(!svg.includes('<img>'));
  const verborgen = draw(room,[],{},{regels,lagen:{afwerking:false,elektriciteit:false,sanitair:false}});
  assert(!verborgen.includes('data-plan-regel='));
  const nul = draw(room,[],{},{regels:regels.map(r=>({...r,aantal:0}))});
  assert(!nul.includes('data-plan-regel='));
}
const g = window.BouwPlan.werkGeometrie({...regels[0],visualisatie:{x:999,y:-4,z:999}},room);
assert.deepEqual(g.a,[6,0,2.7]);
console.log('OK');
'''
        result = subprocess.run(["node", "-e", code, str(script), json.dumps(PAKKETTEN)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")
