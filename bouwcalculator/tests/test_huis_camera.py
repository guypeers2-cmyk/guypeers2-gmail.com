"""The house camera must never need access to measured/project data."""
import shutil
import subprocess
import unittest
from pathlib import Path


class HuisCameraTest(unittest.TestCase):
    def check_js(self, code):
        if not shutil.which('node'):
            self.skipTest('Node nodig voor cameracontrole')
        script = Path(__file__).resolve().parents[1]/'web'/'huis-camera.js'
        result = subprocess.run(['node', '-e', "const assert=require('node:assert/strict');require(process.argv[1]);const C=globalThis.BouwHuisCamera;"+code, str(script)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_zoom_en_pan_zijn_begrensd(self):
        self.check_js("const c=C.maak();assert.equal(c.zoom(100).zoom,3);assert.equal(c.zoom(-4).zoom,1);assert.deepEqual(c.verschuif(1e9,-1e9),{zoom:1,hoek:0,x:800,y:-500});")

    def test_vier_rotaties_en_terug(self):
        self.check_js("const c=C.maak();for(let i=1;i<=4;i++)assert.equal(c.draai(1).hoek,i%4);assert.equal(c.draai(-1).hoek,3);assert.deepEqual(C.draai(2,3,10,8,1),[3,8]);assert.deepEqual(C.draai(2,3,10,8,-1),[5,2]);assert.deepEqual(C.draai(2,3,10,8,4),[2,3]);")

    def test_passend_behoudt_hoek_en_wist_pan(self):
        self.check_js("const c=C.maak();c.draai(1);c.zoom(2);c.verschuif(100,200);assert.deepEqual(c.passend(),{zoom:1,hoek:1,x:0,y:0});")

    def test_viewbox_en_afzonderlijke_cameras(self):
        self.check_js("assert.deepEqual(C.viewBox([0,0],1),[0,0,800,500]);assert.deepEqual(C.viewBox([400,250],2,10,20),[210,145,400,250]);const a=C.maak(),b=C.maak();a.zoom(3);assert.equal(b.lees().zoom,1);const v=a.lees();v.zoom=100;assert.equal(a.lees().zoom,3);")

    def test_ongeldige_invoer_is_atomair(self):
        self.check_js("const c=C.maak(),before=c.lees();assert.throws(()=>c.zoom(NaN));assert.throws(()=>c.draai(Infinity));assert.throws(()=>c.verschuif(50,NaN));assert.deepEqual(c.lees(),before);")
