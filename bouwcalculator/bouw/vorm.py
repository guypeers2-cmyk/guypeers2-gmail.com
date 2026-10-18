"""Pure geometry, mirrored by web/vorm.js. Inside dimensions, one planar ceiling."""
import math
import re

EPS = 1e-8
DEFAULTS = ('noord', 'oost', 'zuid', 'west')
NAMES = {'noord': 'Wand noord', 'oost': 'Wand oost', 'zuid': 'Wand zuid', 'west': 'Wand west'}


def number(v):
    try:
        text = str(v).strip().replace(',', '.')
        if not re.fullmatch(r'[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?', text):
            raise ValueError('Ongeldig getal')
        n = float(text)
        if math.isfinite(n):
            return n
    except (ValueError, TypeError):
        pass
    raise ValueError('Gebruik eindige getallen voor de ruimtevorm.')


def id_ok(v):
    return bool(re.fullmatch(r'(noord|oost|zuid|west|wand_[a-z0-9_-]{1,40})', v))


def cross(a, b, c):
    return (b['x']-a['x'])*(c['y']-a['y'])-(b['y']-a['y'])*(c['x']-a['x'])


def on(a, b, p):
    return (abs(cross(a, b, p)) < EPS and min(a['x'], b['x'])-EPS <= p['x'] <= max(a['x'], b['x'])+EPS
            and min(a['y'], b['y'])-EPS <= p['y'] <= max(a['y'], b['y'])+EPS)


def intersects(a, b, c, d):
    return (cross(a, b, c)*cross(a, b, d) < 0 and cross(c, d, a)*cross(c, d, b) < 0) or any((on(a, b, c), on(a, b, d), on(c, d, a), on(c, d, b)))


def area(p):
    return sum(a['x']*p[(i+1) % len(p)]['y']-p[(i+1) % len(p)]['x']*a['y'] for i, a in enumerate(p))/2


def contour(raw):
    if raw is None or raw == []:
        return []
    if not isinstance(raw, list) or not 3 <= len(raw) <= 64:
        raise ValueError('Een contour heeft 3 tot 64 hoeken nodig.')
    p = []
    for i, a in enumerate(raw):
        if not isinstance(a, dict):
            raise ValueError('Ongeldig hoekpunt.')
        key = str(a['id'] if a.get('id') is not None else DEFAULTS[i] if i < 4 else 'wand_'+str(i+1))
        if not id_ok(key):
            raise ValueError('Ongeldig wandnummer.')
        p.append({'id': key, 'x': number(a.get('x')), 'y': number(a.get('y'))})
    if len({a['id'] for a in p}) != len(p):
        raise ValueError('Elke wand moet een eigen nummer hebben.')
    if any(abs(a['x']) > 1000 or abs(a['y']) > 1000 for a in p):
        raise ValueError('Het tekenbereik is maximaal 1000 meter.')
    mx, my = min(a['x'] for a in p), min(a['y'] for a in p)
    for a in p:
        a['x'], a['y'] = math.floor((a['x']-mx)*1e6+.5)/1e6, math.floor((a['y']-my)*1e6+.5)/1e6
    if any(a['x'] > 1000 or a['y'] > 1000 for a in p):
        raise ValueError('Het tekenbereik is maximaal 1000 meter.')
    for i, a in enumerate(p):
        b, c = p[(i+1) % len(p)], p[(i+2) % len(p)]
        if math.hypot(b['x']-a['x'], b['y']-a['y']) < .05-EPS:
            raise ValueError('Elke wand moet minstens 5 cm lang zijn.')
        if abs(cross(a, b, c)) < EPS and (b['x']-a['x'])*(c['x']-b['x'])+(b['y']-a['y'])*(c['y']-b['y']) < 0:
            raise ValueError('Wanden mogen niet terug over zichzelf lopen.')
        for j in range(i+1, len(p)):
            if j == i+1 or (i == 0 and j == len(p)-1):
                continue
            if intersects(a, b, p[j], p[(j+1) % len(p)]):
                raise ValueError('De contour kruist of raakt zichzelf.')
    if abs(area(p)) < .01-EPS:
        raise ValueError('De ruimte moet minstens 0,01 m² groot zijn.')
    return p


def roof(raw):
    if raw is None:
        return None
    if not isinstance(raw, dict) or raw.get('as') not in ('x', 'y'):
        raise ValueError('Kies X of Y voor de plafondhelling.')
    start, eind = number(raw.get('start')), number(raw.get('eind'))
    if min(start, eind) < .1 or max(start, eind) > 100:
        raise ValueError('Plafondhoogten moeten tussen 0,10 en 100 meter liggen.')
    return {'as': raw['as'], 'start': start, 'eind': eind}


def points(r):
    return r.contour or [dict(id='noord', x=0, y=0), dict(id='oost', x=r.lengte, y=0),
                         dict(id='zuid', x=r.lengte, y=r.breedte), dict(id='west', x=0, y=r.breedte)]


def height(r, x, y):
    if not r.dak:
        return r.hoogte
    d = r.dak
    return d['start']+(d['eind']-d['start'])*(x/r.lengte if d['as'] == 'x' else y/r.breedte)


def surfaces(r):
    p = points(r)
    vloer = abs(area(p))
    gradient = (r.dak['eind']-r.dak['start'])/(r.lengte if r.dak['as'] == 'x' else r.breedte) if r.dak else 0
    factor = math.hypot(1, gradient)
    result = []
    for i, a in enumerate(p):
        b = p[(i+1) % len(p)]
        if not r.contour and a['id'] in ('zuid', 'west'):
            a, b = b, a
        key = p[i]['id']
        lengte = math.hypot(b['x']-a['x'], b['y']-a['y'])
        h0, h1 = height(r, a['x'], a['y']), height(r, b['x'], b['y'])
        os = [o for o in r.openingen if o.muur == key]
        opening = sum(o.oppervlakte() for o in os)
        bruto = lengte*(h0+h1)/2
        result.append(dict(sleutel=key, naam='Wand '+str(i+1) if r.contour else NAMES[key], soort='muur',
                           bruto=bruto, opening=opening, netto=max(0, bruto-opening), lengte=lengte,
                           hoogte=max(h0, h1), openingen=sum(max(1, o.aantal) for o in os), hoogte_begin=h0, hoogte_eind=h1))
    for s in ('plafond', 'vloer'):
        opp = vloer*(factor if s == 'plafond' else 1)
        result.append(dict(sleutel=s, naam='Vloer' if s == 'vloer' else 'Plafond', soort=s,
                           bruto=opp, opening=0, netto=opp, lengte=r.lengte*(factor if s == 'plafond' and r.dak and r.dak['as'] == 'x' else 1),
                           breedte=r.breedte*(factor if s == 'plafond' and r.dak and r.dak['as'] == 'y' else 1), hoogte=r.hoogte, openingen=0))
    return [{k: math.copysign(math.floor(abs(v)*1e9+.5)/1e9, v) if isinstance(v, (int, float)) else v for k, v in row.items()} for row in result]
