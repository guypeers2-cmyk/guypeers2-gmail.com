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
console.log('OK');
'''
        result = subprocess.run(["node", "-e", code, str(script)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")
