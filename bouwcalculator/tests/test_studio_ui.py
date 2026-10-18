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

    def test_opslagwaarschuwing_heeft_backup_en_herstelactie(self):
        nodes = {d['id']: (tag, d) for tag, d, _ in self.page().nodes if d.get('id')}
        self.assertIn('hidden', nodes['opslag-waarschuwing'][1])
        self.assertEqual(nodes['opslag-waarschuwing-tekst'][1]['role'], 'alert')
        for key in ['opslag-backup', 'opslag-opnieuw']:
            self.assertEqual(nodes[key][0], 'button')
            self.assertEqual(nodes[key][1]['type'], 'button')

    def test_rekenfeedback_heeft_expliciete_herstelactie(self):
        nodes = {d['id']: (tag, d) for tag, d, _ in self.page().nodes if d.get('id')}
        self.assertIn('hidden', nodes['bereken-melding'][1])
        self.assertEqual(nodes['bereken-melding'][1]['role'], 'status')
        self.assertEqual(nodes['bereken-opnieuw'][0], 'button')
        self.assertEqual(nodes['bereken-opnieuw'][1]['type'], 'button')

    def test_archief_heeft_native_dialoog_en_benoemde_zoekvelden(self):
        page = self.page()
        nodes = {d['id']: (tag, d) for tag, d, _ in page.nodes if d.get('id')}
        tag, dialog = nodes['modal-achtergrond']
        self.assertEqual(tag, 'dialog')
        self.assertEqual(dialog['aria-labelledby'], 'modal-titel')
        self.assertIn('hidden', dialog)
        self.assertEqual(nodes['archief-zoeken'][1]['type'], 'search')
        self.assertEqual(nodes['archief-zoeken'][1]['aria-controls'], 'modal-inhoud')
        self.assertTrue(any(t == 'label' and d.get('for') == 'archief-zoeken' for t, d, _ in page.nodes))
        self.assertEqual(nodes['archief-opnieuw'][1]['type'], 'button')

    def test_tekenbediening_heeft_sneltoetsen_en_inspectorrelatie(self):
        nodes = self.page().nodes
        tools = {d['data-plan-gereedschap']: d for _, d, _ in nodes if d.get('data-plan-gereedschap')}
        for tool, key in [('select', 'V'), ('hand', 'H'), ('meet', 'M')]:
            self.assertEqual(tools[tool]['aria-keyshortcuts'], key)
        fit = next(d for _, d, _ in nodes if d.get('data-camera') == 'reset')
        self.assertEqual(fit['aria-keyshortcuts'], 'F')
        properties = next(d for _, d, _ in nodes if d.get('id') == 'plan-eigenschappen')
        self.assertEqual(properties['aria-controls'], 'plan-inspector')
        self.assertEqual(properties['aria-expanded'], 'false')

    def test_thema_is_een_benoemde_browserinstelling(self):
        page = self.page()
        html = next(d for t, d, _ in page.nodes if t == 'html')
        self.assertEqual(html['data-theme'], 'light')
        select = next(d for t, d, _ in page.nodes if d.get('id') == 'thema-keuze')
        self.assertEqual(select['aria-describedby'], 'thema-status')
        self.assertTrue(any(t == 'label' and d.get('for') == 'thema-keuze' for t, d, _ in page.nodes))
        start = next(i for i, (_, d, _) in enumerate(page.nodes) if d.get('id') == 'thema-keuze')
        options = [d['value'] for t, d, _ in page.nodes[start+1:start+4] if t == 'option']
        self.assertEqual(options, ['light', 'dark', 'auto'])
        source = (WEB/'index.html').read_text()
        self.assertLess(source.index('src="thema.js"'), source.index('href="styles.css"'))
        standalone = (WEB/'bouwcalculator-standalone.html').read_text()
        self.assertNotIn('src="thema.js"', standalone)
        self.assertIn("const key='bouwcalculator.thema'", standalone)

    def test_direct_openingen_invoegen_heeft_modal_en_benoemde_velden(self):
        page = self.page()
        nodes = {d['id']: (t, d) for t, d, _ in page.nodes if d.get('id')}
        self.assertEqual(nodes['opening-menu'][0], 'dialog')
        self.assertEqual(nodes['opening-menu'][1]['aria-labelledby'], 'opening-titel')
        triggers = [d for _, d, _ in page.nodes if 'data-opening-snel' in d]
        self.assertEqual([d['data-opening-snel'] for d in triggers], ['Deur', 'Raam'])
        for trigger in triggers:
            self.assertEqual(trigger['aria-controls'], 'opening-menu')
            self.assertEqual(trigger['aria-haspopup'], 'dialog')
        self.assertEqual(nodes['opening-wand'][0], 'select')
        self.assertEqual(nodes['opening-fout'][1]['role'], 'alert')
        for key in ['opening-breedte', 'opening-hoogte', 'opening-positie', 'opening-onderkant']:
            self.assertEqual(nodes[key][1]['type'], 'number')
        standalone = (WEB/'bouwcalculator-standalone.html').read_text()
        self.assertNotIn('src="openingen.js"', standalone)
        self.assertIn('window.BouwOpeningen={open}', standalone)

    def test_huis_indelen_heeft_schuifregelaar_en_voorbeeld(self):
        nodes = self.page().nodes
        slider = next(d for _, d, _ in nodes if d.get('id') == 'huis-split-schuif')
        self.assertEqual(slider['type'], 'range')
        self.assertEqual(slider['aria-describedby'], 'huis-split-preview')
        axes = [d['data-indeling-as'] for _, d, _ in nodes if 'data-indeling-as' in d]
        self.assertEqual(axes, ['x', 'y'])
        self.assertTrue(any(t == 'details' and d.get('id') == 'huis-indeling-precies' for t, d, _ in nodes))

    def test_opening_voorbeeld_heeft_benoemde_presets_en_live_feedback(self):
        nodes = {d['id']: (t, d) for t, d, _ in self.page().nodes if d.get('id')}
        self.assertEqual(nodes['opening-presets'][1]['role'], 'group')
        self.assertTrue(nodes['opening-presets'][1]['aria-label'])
        self.assertEqual(nodes['opening-voorbeeld'][1]['aria-hidden'], 'true')
        self.assertEqual(nodes['opening-preview-status'][1]['role'], 'status')
        self.assertEqual(nodes['opening-preview-status'][1]['aria-live'], 'polite')

    def test_kamernaam_kan_vanuit_huisplan_bewaard_of_geannuleerd(self):
        page = self.page()
        nodes = {d['id']: (t, d) for t, d, _ in page.nodes if d.get('id')}
        self.assertEqual(nodes['huis-naam-form'][0], 'form')
        self.assertIn('hidden', nodes['huis-naam-form'][1])
        self.assertEqual(nodes['huis-kamer-naam'][1]['maxlength'], '100')
        self.assertIn('required', nodes['huis-kamer-naam'][1])
        self.assertTrue(any(t == 'label' and d.get('for') == 'huis-kamer-naam' for t, d, _ in page.nodes))
        self.assertEqual(nodes['huis-naam-annuleer'][1]['type'], 'button')
        self.assertIn('disabled', nodes['huis-naam-annuleer'][1])
        self.assertEqual(nodes['huis-naam-status'][1]['role'], 'status')

    def test_vrije_snede_heeft_een_punt_terug_actie(self):
        nodes = {d['id']: (t, d) for t, d, _ in self.page().nodes if d.get('id')}
        button = nodes['huis-snede-terug'][1]
        self.assertEqual(nodes['huis-snede-terug'][0], 'button')
        self.assertEqual(button['type'], 'button')
        self.assertEqual(button['aria-controls'], 'huis-plan')
        self.assertIn('hidden', button)
        self.assertEqual(nodes['huis-split-preview'][1]['role'], 'status')

    def test_online_en_offline_module_ingesloten(self):
        source = (WEB/'index.html').read_text()
        standalone = (WEB/'bouwcalculator-standalone.html').read_text()
        self.assertIn('<script src="studio.js"></script>', source)
        self.assertNotIn('src="studio.js"', standalone)
        self.assertIn('window.BouwStudio={open,sync}', standalone)
        self.assertEqual((WEB/'bouwcalculator-standalone.html').read_bytes(), (WEB.parent/'bouwcalculator.html').read_bytes())
