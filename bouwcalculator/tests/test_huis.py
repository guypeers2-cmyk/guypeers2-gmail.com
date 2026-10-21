"""Inclined walls, house layout, data preservation and Python/JS parity."""
import json
import math
from pathlib import Path
import shutil
import subprocess
import unittest

from bouw.model import Project, Ruimte
from bouw.bereken import ruimte_oppervlakken
from bouw.offerte import bereken_offerte
from bouw import vorm


def polygon(coords):
    return [dict(x=x, y=y) for x, y in coords]


class HuisTest(unittest.TestCase):
    def test_echte_insprong_verkleint_plafond_en_zijwanden(self):
        r = Ruimte.van_dict(dict(id='r', lengte=4, breedte=3, hoogte=2.5,
                                wand_helling={'noord': 1}))
        v = {v['sleutel']: v for v in ruimte_oppervlakken(r)}
        self.assertEqual(v['vloer']['netto'], 12)
        self.assertEqual(v['plafond']['netto'], 8)
        self.assertAlmostEqual(v['noord']['netto'], 4*math.hypot(2.5, 1), places=8)
        self.assertEqual(v['oost']['netto'], 6.25)
        self.assertEqual(v['west']['netto'], 6.25)
        self.assertEqual(v['zuid']['netto'], 10)
        self.assertEqual(vorm.top(r)[0]['y'], 1, 'top contour must not be renormalised')

    def test_twee_hellende_wanden_en_opening(self):
        r = Ruimte.van_dict(dict(lengte=4, breedte=3, hoogte=2.5,
            wand_helling={'noord': 1, 'oost': 1},
            openingen=[dict(muur='noord', breedte=.5, hoogte=1, aantal=2)]))
        v = {v['sleutel']: v for v in ruimte_oppervlakken(r)}
        self.assertEqual(v['plafond']['netto'], 6)
        self.assertAlmostEqual(v['noord']['bruto'], 3.5*math.hypot(2.5, 1), places=8)
        self.assertEqual(v['noord']['opening'], 1)
        self.assertEqual(Ruimte.van_dict(r.naar_dict()), r)

    def test_omgekeerde_omloop_en_collineaire_wanden(self):
        coords = [(0, 0), (0, 3), (4, 3), (4, 0)]
        r = Ruimte.van_dict(dict(contour=polygon(coords), hoogte=2.5, wand_helling={'west': 1}))
        self.assertEqual(ruimte_oppervlakken(r)[-2]['netto'], 8)
        col = polygon([(0, 0), (2, 0), (4, 0), (4, 3), (0, 3)])
        r = Ruimte.van_dict(dict(contour=col, wand_helling={'noord': 1, 'oost': 1}))
        self.assertEqual(ruimte_oppervlakken(r)[-2]['netto'], 8)
        with self.assertRaises(ValueError):
            Ruimte.van_dict(dict(contour=col, wand_helling={'noord': 1}))

    def test_ongeldige_hellingen_zonder_stille_fallback(self):
        for change in [dict(wand_helling={'noord': 3}), dict(wand_helling={'wand_missing': 1}),
                       dict(wand_helling={'noord': -1}), dict(wand_helling={'noord': 'nan'}),
                       dict(wand_helling=[1]), dict(wand_helling={'noord': 1}, dak={'as': 'x', 'start': 2, 'eind': 3}),
                       dict(wand_helling={'noord': 1}, contour=polygon([(0,0),(4,0),(4,1),(2,1),(2,3),(0,3)]))]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                Ruimte.van_dict(dict(lengte=4, breedte=3, hoogte=2.5, **change))

    def test_gedeelde_wand_en_project_roundtrip(self):
        p = dict(huis=dict(lengte=8, breedte=6, hoogte=2.5), ruimtes=[
            dict(id='a', naam='Keuken', lengte=4, breedte=6, huis_positie=dict(x=0,y=0)),
            dict(id='b', naam='Woonkamer', lengte=4, breedte=6, huis_positie=dict(x=4,y=0)),
            dict(id='oud', naam='Bestaande offerte', lengte=4, breedte=3)],
            regels=[dict(id='werk', ruimte_id='a', oppervlak='noord', pakket_id='gyproc_wand_profiel')])
        project = Project.van_dict(p)
        self.assertEqual(Project.van_dict(project.naar_dict()), project)
        o = bereken_offerte(p)
        self.assertEqual(o['regels'][0]['aantal'], 10)
        self.assertEqual(o['project']['ruimtes'][1]['huis_positie'], dict(x=4,y=0))
        self.assertEqual(o['project']['regels'][0]['id'], 'werk')

    def test_overlap_buiten_contour_en_ontbrekend_huis(self):
        for p in [dict(ruimtes=[dict(huis_positie=dict(x=0,y=0))]),
                  dict(huis=dict(lengte=4,breedte=3),ruimtes=[dict(huis_positie=dict(x=1,y=0))]),
                  dict(huis=dict(lengte=10,breedte=10),ruimtes=[dict(huis_positie=dict(x=0,y=0)),dict(huis_positie=dict(x=0,y=0))]),
                  dict(huis=dict(lengte=10,breedte=10),ruimtes=[dict(huis_positie=dict(x=-1,y=0))]),
                  dict(huis=dict(lengte=0,breedte=10),ruimtes=[])]:
            with self.subTest(p=p), self.assertRaises(ValueError):
                Project.van_dict(p)

    def test_concave_huis_controleert_ook_segmenten(self):
        # All three corners are inside, but one edge cuts across the courtyard.
        house = polygon([(0,0),(6,0),(6,6),(4,6),(4,2),(2,2),(2,6),(0,6)])
        room = polygon([(0,0),(6,0),(6,6),(0,6)])
        with self.assertRaises(ValueError):
            Project.van_dict(dict(huis=dict(contour=house), ruimtes=[dict(contour=room,huis_positie=dict(x=0,y=0))]))

    def test_js_python_pariteit_en_splitsen(self):
        if not shutil.which('node'):
            self.skipTest('Node nodig voor JS-pariteit')
        web = Path(__file__).resolve().parents[1]/'web'
        fixtures = [dict(ruimtes=[dict(id='r',lengte=4,breedte=3,hoogte=2.5,wand_helling={'noord':1,'oost':.5})]),
                    dict(huis=dict(lengte=8,breedte=6),ruimtes=[dict(id='r',lengte=4,breedte=6,huis_positie=dict(x=4,y=0))])]
        code = r'''
import assert from 'node:assert/strict';
const {berekenOfferte}=await import('file://'+process.argv[1]+'/engine.js');
const {Vorm:V}=await import('file://'+process.argv[1]+'/vorm.js');
const fixtures=JSON.parse(process.argv[2]);
const r={lengte:8,breedte:6,hoogte:2.5,contour:[],dak:null,openingen:[]};
for(const halves of [V.cutAt(r,'x',4),V.split(r,{x:2,y:0},{x:6,y:6}),V.split(r,{x:0,y:0},{x:8,y:6})]){
 assert.equal(halves.length,2);assert.equal(halves.reduce((s,p)=>s+Math.abs(V.area(p)),0),48);
 halves.forEach(p=>V.contour(p));
}
assert.throws(()=>V.cutAt(r,'x',0));
assert.throws(()=>V.split(r,{x:2,y:2},{x:4,y:6}));
const lean={...r,wand_helling:{noord:1}};
const f=V.wallFrame(lean,'noord');assert(Math.abs(Math.hypot(...f.v)-1)<1e-10);
const point=V.wallPoint(lean,'noord',2,f.height);assert.deepEqual(point,[2,1,2.5]);
const u={contour:V.contour([{x:0,y:0},{x:6,y:0},{x:6,y:6},{x:4,y:6},{x:4,y:2},{x:2,y:2},{x:2,y:6},{x:0,y:6}])};
assert.throws(()=>V.cutAt(u,'y',4));
const parts=V.split(u,{x:0,y:1},{x:6,y:1});assert.equal(parts.reduce((s,p)=>s+Math.abs(V.area(p)),0),28);
console.log(JSON.stringify(fixtures.map(berekenOfferte)));
'''
        result = subprocess.run(['node','--input-type=module','-e',code,str(web),json.dumps(fixtures)],capture_output=True,text=True,check=True)
        actual = json.loads(result.stdout)
        for p, js in zip(fixtures, actual):
            py = bereken_offerte(p)
            self.assertEqual(js['project'], py['project'])
            self.assertEqual(js['ruimtes'], py['ruimtes'])
            self.assertEqual(js['totalen'], py['totalen'])
            self.assertEqual(js['waarschuwingen'], py['waarschuwingen'])


if __name__ == '__main__':
    unittest.main()
