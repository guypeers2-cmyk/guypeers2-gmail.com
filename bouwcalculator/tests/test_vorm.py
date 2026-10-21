"""Exact room geometry and rejection rather than rectangle fallbacks."""
import unittest
from bouw.model import Ruimte
from bouw.bereken import ruimte_oppervlakken
from bouw.offerte import bereken_offerte

L = [{'x': x, 'y': y} for x, y in [(0,0),(4,0),(4,1.5),(2,1.5),(2,3),(0,3)]]

class VormTest(unittest.TestCase):
    def test_concave_vloer_en_plafond(self):
        r=Ruimte.van_dict({'contour':L})
        vs=ruimte_oppervlakken(r)
        self.assertEqual((r.lengte,r.breedte),(4,3))
        self.assertEqual(len(vs),8)
        self.assertEqual(vs[-1]['netto'],9)
        self.assertEqual(vs[-2]['netto'],9)
        self.assertEqual(Ruimte.van_dict(r.naar_dict()),r)

    def test_helling_trapezia_en_werkelijk_plafond(self):
        r=Ruimte.van_dict({'contour':L,'dak':{'as':'x','start':1,'eind':3}})
        vs=ruimte_oppervlakken(r)
        self.assertEqual(r.hoogte,3)
        self.assertEqual(vs[0]['bruto'],8)
        self.assertAlmostEqual(vs[-2]['netto'],9*(1.25**.5),places=8)
        self.assertEqual(sum(v['bruto'] for v in vs if v['soort']=='muur'),26.5)

    def test_extra_wand_opening_en_offerte(self):
        p={'ruimtes':[{'id':'r','contour':L,'openingen':[{'muur':'wand_5','breedte':1,'hoogte':1}]}],
           'regels':[{'id':'a','ruimte_id':'r','oppervlak':'wand_5','pakket_id':'gyproc_wand_profiel'}]}
        o=bereken_offerte(p)
        self.assertEqual(o['regels'][0]['aantal'],4)
        self.assertEqual(o['project']['ruimtes'][0]['openingen'][0]['muur'],'wand_5')

    def test_kruising_dubbele_hoeken_en_te_kleine_wanden(self):
        for coords in [((0,0),(4,3),(0,3),(4,0)),((0,0),(4,0),(4,0),(0,3)),
                       ((0,0),(.01,0),(1,1)),((0,0),(4,0),(2,0)),
                       ((0,0),(2,0),(1,0),(1,2),(0,2))]:
            with self.subTest(coords=coords),self.assertRaises(ValueError):
                Ruimte.van_dict({'contour':[{'x':x,'y':y} for x,y in coords]})
        for bad in ('bad', [{'x':'nan','y':0}]*3, [{'x':0,'y':0}]*65):
            with self.assertRaises(ValueError):Ruimte.van_dict({'contour':bad})

    def test_ongeldige_helling_en_bereik(self):
        for roof in ({'as':'z','start':1,'eind':2},{'as':'x','start':0,'eind':2},{'as':'y','start':1,'eind':'inf'}):
            with self.assertRaises(ValueError):Ruimte.van_dict({'dak':roof})
        with self.assertRaises(ValueError):Ruimte.van_dict({'lengte':0,'dak':{'as':'x','start':1,'eind':3}})

    def test_binnenmaten_normalisatie_en_stabiele_ids(self):
        p=[dict(a,x=a['x']+10,y=a['y']-3,id='wand_'+str(i)) for i,a in enumerate(L)]
        r=Ruimte.van_dict({'contour':p})
        self.assertEqual(r.contour[0],{'id':'wand_0','x':0,'y':0})
        self.assertEqual(ruimte_oppervlakken(r)[-1]['netto'],9)
        p[1]['id']=p[0]['id']
        with self.assertRaises(ValueError):Ruimte.van_dict({'contour':p})

class VormJavascriptTest(unittest.TestCase):
    def run_node(self, code):
        import shutil, subprocess
        from pathlib import Path
        if not shutil.which('node'):
            self.skipTest('Node nodig voor JS-geometrie')
        web=Path(__file__).resolve().parents[1]/'web'
        result=subprocess.run(['node','--input-type=module','-e',code,str(web)],capture_output=True,text=True,check=True)
        self.assertEqual(result.stdout.strip(),'OK')

    def test_afwijzen_ongeldige_vormen_in_js(self):
        self.run_node(r'''
import assert from 'node:assert/strict';
const {berekenOfferte}=await import('file://'+process.argv[1]+'/engine.js');
for(const room of [
 {contour:[{x:0,y:0},{x:4,y:3},{x:0,y:3},{x:4,y:0}]},
 {contour:'bad'}, {contour:Array(65).fill({x:0,y:0})},
 {dak:{as:'z',start:1,eind:3}}, {lengte:0,dak:{as:'x',start:1,eind:3}},
 {contour:[{x:'0x10',y:0},{x:4,y:3},{x:0,y:3}]}
])assert.throws(()=>berekenOfferte({ruimtes:[room]}));
console.log('OK');
''')

    def test_concave_traces_en_schuine_projecties(self):
        self.run_node(r'''
import assert from 'node:assert/strict';
const {Vorm}=await import('file://'+process.argv[1]+'/vorm.js');
globalThis.window=globalThis;globalThis.document={querySelector:()=>null};
await import('file://'+process.argv[1]+'/plattegrond.js');
await import('file://'+process.argv[1]+'/slepen.js');
const room={naam:'<script>',lengte:4,breedte:3,hoogte:3,contour:Vorm.contour([
{x:0,y:0},{x:4,y:0},{x:4,y:1.5},{x:2,y:1.5},{x:2,y:3},{x:0,y:3}]),dak:{as:'x',start:1,eind:3},openingen:[]};
assert(!Vorm.segmentInside(room,{x:3.5,y:1},{x:1,y:2.5}));
assert(Vorm.segmentInside(room,{x:.5,y:.5},{x:1,y:2.5}));
assert(Vorm.segmentInside(room,{x:2,y:1.5},{x:4,y:1.5}));
room.contour=Vorm.contour([{x:0,y:0},{x:4,y:0},{x:3,y:3},{x:1,y:3}]);
for(const edge of Vorm.edges(room)){
 const {P,plane}=BouwPlan.aanzichtProjectie(room,edge.id),delta=[edge.u[0]*.2,edge.u[1]*.2,.1];
 const a=P(0,0,0),b=P(...delta),back=BouwSleep.projectDelta(P,plane,b[0]-a[0],b[1]-a[1]);
 back.forEach((n,i)=>assert(Math.abs(n-delta[i])<1e-10));
 const svg=BouwPlan.aanzicht(room,Vorm.surfaces(room),{},{vlak:edge.id});
 assert(!svg.includes('NaN'));assert(!svg.includes('<script>'));
}
for(const draw of [BouwPlan.plattegrond,BouwPlan.isometrie]){
 const svg=draw(room,Vorm.surfaces(room),{},{});assert(!svg.includes('NaN'));assert(!svg.includes('<script>'));
}
console.log('OK');
''')
