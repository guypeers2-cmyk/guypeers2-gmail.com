"""Drag geometry stays metric and preserves route lengths at room boundaries."""
from pathlib import Path
import shutil
import subprocess
import unittest


@unittest.skipUnless(shutil.which("node"), "Node nodig voor JS-geometrie")
class SleepGeometrieTest(unittest.TestCase):
    def test_projecties_snap_en_grenzen(self):
        web = Path(__file__).resolve().parents[1] / "web"
        code = r'''
const assert = require('node:assert/strict');
global.window = {}; global.document = {querySelector:()=>null};
require(process.argv[1]+'/plattegrond.js');
require(process.argv[1]+'/slepen.js');
const {projectDelta,boundedDelta} = window.BouwSleep;
const room = {lengte:6,breedte:4,hoogte:2.7};
const close = (a,b) => a.forEach((n,i)=>assert(Math.abs(n-b[i])<1e-9));
for(let hoek=0;hoek<4;hoek++) {
 const {P} = window.BouwPlan.projectie(room,hoek);
 for (const [plane,delta] of [['xy',[.3,-.2,0]],['xz',[.3,0,.2]],['yz',[0,-.2,.3]]]) {
  const p=P(0,0,0),q=P(...delta);
  close(projectDelta(P,plane,q[0]-p[0],q[1]-p[1]),delta);
 }
}
const {P} = window.BouwPlan.planProjectie(room);
const p=P(0,0,0),q=P(.3,-.2,0);
close(projectDelta(P,'xy',q[0]-p[0],q[1]-p[1]),[.3,-.2,0]);
close(projectDelta(()=>[0,0],'xy',20,20),[0,0,0]);
const a=[1,.2,.3],b=[5,3,2],limits=[6,4,2.7];
const d=boundedDelta(a,b,[4,-9,7],limits);
close(d,[1,-.2,.7]);
for(let i=0;i<3;i++) {
 assert(a[i]+d[i]>=0 && b[i]+d[i]<=limits[i]);
 assert(Math.abs((b[i]+d[i])-(a[i]+d[i])-(b[i]-a[i]))<1e-9);
}
close(boundedDelta([.12,.2,.3],[.12,.2,.3],[.11,0,0],limits,.05),[.13,0,0]);
close(boundedDelta([.12,.2,.3],[.12,.2,.3],[.11,0,0],limits),[.11,0,0]);
console.log('OK');
'''
        result = subprocess.run(["node", "-e", code, str(web)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")
