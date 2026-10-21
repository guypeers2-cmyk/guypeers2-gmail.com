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
const {projectDelta,boundedDelta,positieActie} = window.BouwSleep;
const room = {lengte:6,breedte:4,hoogte:2.7};
const close = (a,b) => a.forEach((n,i)=>assert(Math.abs(n-b[i])<1e-9));
for(const hoek of [0,1,2,3,.13,.77,1.31,2.17,3.62]) {
 const {P} = window.BouwPlan.projectie(room,hoek);
 for (const [plane,delta] of [['xy',[.3,-.2,0]],['xz',[.3,0,.2]],['yz',[0,-.2,.3]]]) {
  const p=P(0,0,0),q=P(...delta);
  close(projectDelta(P,plane,q[0]-p[0],q[1]-p[1]),delta);
 }
}
for(const vlak of ['noord','oost','zuid','west','vloer','plafond']) {
 const {P,plane,teken} = window.BouwPlan.aanzichtProjectie(room,vlak);
 const delta=plane==='xy' ? [.2,.3,0] : plane==='xz' ? [.2,0,.3] : [0,.2,.3];
 const a=P(0,0,0),b=P(...delta);
 close(projectDelta(P,plane,b[0]-a[0],b[1]-a[1]),delta);
 assert.equal(teken,['zuid','west'].includes(vlak)?-1:1);
 const regels=['noord','oost','zuid','west','vloer','plafond'].map((v,i)=>({
   id:'v'+i,pakket_id:'elek_stopcontact',pakket:{naam:'Test',eenheid:'st'},
   oppervlak:v,nummer:i+1,aantal:1}));
 const svg=window.BouwPlan.aanzicht({...room,naam:'<script>',openingen:[]},[],{},{vlak,regels});
 assert(!svg.includes('NaN') && !svg.includes('<script>'));
 assert.equal((svg.match(/data-plan-regel=/g)||[]).length,1);
 assert(svg.includes('data-plan-regel="v'+regels.findIndex(r=>r.oppervlak===vlak)+'"'));
 const hidden=window.BouwPlan.aanzicht(room,[],{},{vlak,regels,lagen:{elektriciteit:false}});
 assert(!hidden.includes('data-plan-regel='));
}
for(const draw of [window.BouwPlan.plattegrond,window.BouwPlan.aanzicht]) {
 const normal=draw(room,[],{},{}),zoomed=draw(room,[],{},{zoom:1.3});
 assert.notEqual(normal.match(/viewBox="[^"]+"/)[0],zoomed.match(/viewBox="[^"]+"/)[0]);
 assert(!zoomed.includes('NaN'));
}
for(const draw of [window.BouwPlan.plattegrond,window.BouwPlan.aanzicht,window.BouwPlan.isometrie]) {
 const svg=draw(room,[],{},{zoom:3,panX:23,panY:-17});
 const box=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
 assert.equal(box[2],260);assert.equal(box[0],283);
 assert(box.every(Number.isFinite));
}
const huge=window.BouwPlan.aanzicht({lengte:1e6,breedte:1e6,hoogte:1e6},[],{},{vlak:'noord'});
assert((huge.match(/aanzicht-raster/g)||[]).length<45);
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
close(positieActie([1,0,.3],[1,0,.3],[4,3,2.5],[0,2],'centreer'),[1,0,.95]);
close(positieActie([4,0,.3],[4,0,.3],[4,3,2.5],[0,2],'kopie'),[-.25,0,0]);
close(positieActie([0,.5,0],[4,.5,0],[4,3,2.5],[0,1],'kopie'),[0,.25,0]);
close(positieActie([0,0,0],[4,3,2.5],[4,3,2.5],[0,1],'kopie'),[0,0,0]);
close(positieActie([.5,.5,.2],[3,1,.4],[4,3,2.5],[0,1],'centreer'),[.25,.75,0]);
console.log('OK');
'''
        result = subprocess.run(["node", "-e", code, str(web)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "OK")
