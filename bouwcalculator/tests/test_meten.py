"""Control measurements are metric Euclidean distances, not screen lengths."""
from pathlib import Path
import shutil
import subprocess
import unittest


@unittest.skipUnless(shutil.which("node"), "Node nodig voor meetmodule")
class AfstandTest(unittest.TestCase):
    def test_euclidische_afstanden(self):
        script = Path(__file__).resolve().parents[1] / "web" / "meten.js"
        code = r'''
const assert=require('node:assert/strict');
global.window={};global.document={querySelector:()=>null};require(process.argv[1]);
const d=window.BouwMeten.afstand;
assert.equal(d([0,0,0],[3,4,0]),5);
assert.equal(d([0,0,0],[1,2,2]),3);
assert.equal(d([2,3,4],[2,3,4]),0);
assert.equal(d([-1,-2,0],[2,2,0]),5);
assert.equal(d([3,4,2],[0,0,2]),5);
assert(Math.abs(d([.1,.2,.3],[.4,.6,.3])-.5)<1e-10);
console.log('OK');
'''
        result = subprocess.run(["node", "-e", code, str(script)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")
