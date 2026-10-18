"""Static UI integration contracts, independent of browser packages."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

WEB = Path(__file__).resolve().parents[1]/'web'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.ids, self.nodes = [], [], []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        self.nodes.append((tag, d, tuple(self.stack)))
        if d.get('id'):
            self.ids.append(d['id'])
        if tag not in {'meta','link','input','br','hr','img','source','wbr','area','base','embed','param','track','col'}:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.stack:
            i = len(self.stack)-1-self.stack[::-1].index(tag)
            self.stack = self.stack[:i]


class StudioUITest(unittest.TestCase):
    def page(self):
        p = Page()
        p.feed((WEB/'index.html').read_text())
        return p

    def test_unieke_ids_en_heldere_navigatiegebieden(self):
        p = self.page()
        self.assertEqual(len(p.ids), len(set(p.ids)))
        for key in ['studio-plaats','studio-stap','studio-feedback','studio-room-summary','studio-room-filter','studio-room-sort']:
            self.assertIn(key, p.ids)
        primary = next(n for n in p.nodes if n[1].get('class') == 'hoofdnavigatie')
        self.assertIn('header', primary[2])

    def test_pictogrammen_hebben_namen_en_tooltips(self):
        p = self.page()
        buttons = [d for t,d,_ in p.nodes if t in ('button','summary') and 'compact-icon' in d.get('class','').split()]
        self.assertGreater(len(buttons), 30)
        for b in buttons:
            with self.subTest(id=b.get('id'), label=b.get('aria-label')):
                self.assertTrue(b.get('aria-label'))
                self.assertTrue(b.get('title'))

    def test_kamerkiezer_heeft_native_dialoog_en_benoemde_triggers(self):
        nodes = self.page().nodes
        by_id = {d['id']: (t, d) for t, d, _ in nodes if d.get('id')}
        tag, dialog = by_id['studio-rooms']
        self.assertEqual(tag, 'dialog')
        self.assertIn(dialog['aria-labelledby'], by_id)
        self.assertIn(dialog['aria-describedby'], by_id)
        triggers = [d for _, d, _ in nodes if 'data-room-picker' in d]
        self.assertEqual(len(triggers), 2)
        for trigger in triggers:
            self.assertEqual(trigger['type'], 'button')
            self.assertEqual(trigger['aria-controls'], 'studio-rooms')
            self.assertEqual(trigger['aria-haspopup'], 'dialog')
            self.assertEqual(trigger['aria-expanded'], 'false')
        self.assertEqual(by_id['studio-room-query'][1]['type'], 'search')

    def test_online_en_offline_module_ingesloten(self):
        source = (WEB/'index.html').read_text()
        standalone = (WEB/'bouwcalculator-standalone.html').read_text()
        self.assertIn('<script src="studio.js"></script>', source)
        self.assertNotIn('src="studio.js"', standalone)
        self.assertIn('window.BouwStudio={open,sync}', standalone)
        self.assertEqual((WEB/'bouwcalculator-standalone.html').read_bytes(), (WEB.parent/'bouwcalculator.html').read_bytes())
