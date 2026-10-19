"""Bounded project history is pure, isolated and deterministic."""
from pathlib import Path
import shutil
import subprocess
import unittest


@unittest.skipUnless(shutil.which("node"), "Node nodig voor browserhistorie")
class GeschiedenisTest(unittest.TestCase):
    def test_undo_redo_typgroepen_grens_en_reset(self):
        script = Path(__file__).resolve().parents[1] / "web" / "geschiedenis.js"
        code = r'''
const assert=require('node:assert/strict');global.window={};require(process.argv[1]);
const h=window.BouwHistorie.maak(3);
h.reset({n:0});assert(!h.kanUndo());assert(!h.kanRedo());
h.record({n:1},'naam',100);h.record({n:2},'naam',200);
assert.deepEqual(h.undo(),{n:0});assert(!h.kanUndo());
assert.deepEqual(h.redo(),{n:2});assert(!h.kanRedo());
h.record({n:3},'naam',1000);assert.deepEqual(h.undo(),{n:2});
h.record({n:4},'',1100);assert(!h.kanRedo());assert.equal(h.redo(),null);
const snapshot=h.undo();snapshot.n=999;assert.deepEqual(h.redo(),{n:4});
for(let n=5;n<20;n++)h.record({n});
let count=0;while(h.kanUndo()){h.undo();count++;}assert.equal(count,3);
h.reset({n:88});assert(!h.kanUndo());assert(!h.kanRedo());
h.record({n:88});assert(!h.kanUndo());
console.log('OK');
'''
        result = subprocess.run(["node", "-e", code, str(script)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")
