"""Trappen zijn bewaarbare tekenobjecten, geen openingen of prijsregels."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bouw import bereken_offerte
from bouw.model import Ruimte

TRAP = dict(id='trap-1', naam='Trap', x=.2, y=.3, breedte=.9,
            lengte=2.4, hoogte=2.5, richting=90, treden=14)


class TestTrappen(unittest.TestCase):
    def test_legacy_en_roundtrip(self):
        self.assertEqual(Ruimte.van_dict({}).trappen, [])
        r = Ruimte.van_dict({'trappen': [TRAP]})
        self.assertEqual(r.naar_dict()['trappen'], [TRAP])
        self.assertEqual(Ruimte.van_dict(r.naar_dict()).trappen, [TRAP])

    def test_geen_oppervlakte_of_prijswijziging(self):
        p = {'ruimtes': [dict(id='r', lengte=4, breedte=3, hoogte=2.5)],
             'regels': [dict(id='w', ruimte_id='r', oppervlak='noord', pakket_id='gyproc_wand_profiel'),
                        dict(id='v', ruimte_id='r', oppervlak='vloer', pakket_id='gyproc_voegafwerking')]}
        before = bereken_offerte(p)
        self.assertGreater(before["totalen"]["totaal"], 0)
        q = copy.deepcopy(p)
        q['ruimtes'][0]['trappen'] = [TRAP]
        after = bereken_offerte(q)
        for key in ['totalen', 'regels', 'waarschuwingen', 'per_ruimte']:
            self.assertEqual(before[key], after[key], key)
        self.assertEqual(before['ruimtes'][0]['vlakken'], after['ruimtes'][0]['vlakken'])
        self.assertEqual(after['project']['ruimtes'][0]['trappen'], [TRAP])
        self.assertEqual(after['ruimtes'][0]['trappen'], [TRAP])

    def test_ongeldige_data(self):
        for key, value in [('x', -1), ('y', float('inf')), ('breedte', 0),
                           ('hoogte', float('nan')), ('lengte', 101),
                           ('richting', 45), ('treden', 2.5), ('treden', 41)]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                Ruimte.van_dict({'trappen': [dict(TRAP, **{key: value})]})
        for raw in ['trap', [{}] * 101, [dict(TRAP), dict(TRAP)], ['trap']]:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                Ruimte.van_dict({'trappen': raw})
