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
    return isinstance(v, str) and bool(re.fullmatch(r'(noord|oost|zuid|west|wand_[a-z0-9_-]{1,40})', v))


def cross(a, b, c):
    return (b['x']-a['x'])*(c['y']-a['y'])-(b['y']-a['y'])*(c['x']-a['x'])


def on(a, b, p):
    return (abs(cross(a, b, p)) < EPS and min(a['x'], b['x'])-EPS <= p['x'] <= max(a['x'], b['x'])+EPS
            and min(a['y'], b['y'])-EPS <= p['y'] <= max(a['y'], b['y'])+EPS)


def intersects(a, b, c, d):
    return (cross(a, b, c)*cross(a, b, d) < 0 and cross(c, d, a)*cross(c, d, b) < 0) or any((on(a, b, c), on(a, b, d), on(c, d, a), on(c, d, b)))


def area(p):
    return sum(a['x']*p[(i+1) % len(p)]['y']-p[(i+1) % len(p)]['x']*a['y'] for i, a in enumerate(p))/2


def contour(raw, normaliseer=True):
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
    mx, my = (min(a['x'] for a in p), min(a['y'] for a in p)) if normaliseer else (0, 0)
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
    ts = top(r)
    plafond = abs(area(ts))
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
        t0, t1 = ts[i], ts[(i+1) % len(p)]
        bovenlengte = math.hypot(t1['x']-t0['x'], t1['y']-t0['y'])
        insprong = r.wand_helling.get(key, 0)
        schuin = math.hypot(r.hoogte, insprong)
        bruto = (lengte+bovenlengte)/2*(schuin if insprong else (h0+h1)/2)
        result.append(dict(sleutel=key, naam='Wand '+str(i+1) if r.contour else NAMES[key], soort='muur',
                           bruto=bruto, opening=opening, netto=max(0, bruto-opening), lengte=lengte,
                           hoogte=schuin if insprong else max(h0, h1), openingen=sum(max(1, o.aantal) for o in os), hoogte_begin=h0, hoogte_eind=h1))
    for s in ('plafond', 'vloer'):
        opp = plafond*factor if s == 'plafond' else vloer
        result.append(dict(sleutel=s, naam='Vloer' if s == 'vloer' else 'Plafond', soort=s,
                           bruto=opp, opening=0, netto=opp, lengte=r.lengte*(factor if s == 'plafond' and r.dak and r.dak['as'] == 'x' else 1),
                           breedte=r.breedte*(factor if s == 'plafond' and r.dak and r.dak['as'] == 'y' else 1), hoogte=r.hoogte, openingen=0))
    return [{k: math.copysign(math.floor(abs(v)*1e9+.5)/1e9, v) if isinstance(v, (int, float)) else v for k, v in row.items()} for row in result]


def leaning(raw):
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise ValueError('Ongeldige wandhellingen.')
    result = {}
    for key, v in raw.items():
        if not id_ok(key):
            raise ValueError('Ongeldig wandnummer.')
        n = number(v)
        if not 0 <= n <= 100:
            raise ValueError('Wandinsprong moet tussen 0 en 100 meter liggen.')
        if n:
            result[key] = n
    return result


def position(raw):
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ValueError('Ongeldige huispositie.')
    x, y = number(raw.get('x')), number(raw.get('y'))
    if not 0 <= x <= 1000 or not 0 <= y <= 1000:
        raise ValueError('Huispositie moet binnen 0 tot 1000 meter liggen.')
    return dict(x=x, y=y)


def top(r):
    p, hs = points(r), r.wand_helling
    if not hs:
        return [dict(a, z=height(r, a['x'], a['y'])) for a in p]
    contour(p, False)
    if r.dak:
        raise ValueError('Combineer een schuine wand nog niet met een hellend plafond.')
    sign = 1 if area(p) > 0 else -1
    if any(cross(a, p[(i+1) % len(p)], p[(i+2) % len(p)])*sign < -EPS for i, a in enumerate(p)):
        raise ValueError('Schuine wanden vereisen een convexe contour; splits een L/U-vorm eerst in kamers.')
    if any(key not in {a['id'] for a in p} for key in hs):
        raise ValueError('Een schuine wand verwijst naar een ontbrekende wand.')
    lines = []
    for i, a in enumerate(p):
        b = p[(i+1) % len(p)]
        length = math.hypot(b['x']-a['x'], b['y']-a['y'])
        n = [-(b['y']-a['y'])/length*sign, (b['x']-a['x'])/length*sign]
        lines.append((n, n[0]*a['x']+n[1]*a['y']+hs.get(a['id'], 0)))
    result = []
    for i, a in enumerate(p):
        (u, uc), (v, vc) = lines[(i+len(p)-1) % len(p)], lines[i]
        det = u[0]*v[1]-u[1]*v[0]
        if abs(det) < EPS:
            if abs(uc-vc) > EPS:
                raise ValueError('Rechte aansluitende wanden moeten dezelfde insprong hebben.')
            x, y = a['x']+v[0]*hs.get(a['id'], 0), a['y']+v[1]*hs.get(a['id'], 0)
        else:
            x, y = (uc*v[1]-u[1]*vc)/det, (u[0]*vc-uc*v[0])/det
        result.append(dict(id=a['id'], x=x, y=y, z=r.hoogte))
    contour(result, False)
    for i, a in enumerate(result):
        b, f, g = result[(i+1) % len(p)], p[i], p[(i+1) % len(p)]
        if (area(result)*sign <= 0 or not inside(p, a)
                or (b['x']-a['x'])*(g['x']-f['x'])+(b['y']-a['y'])*(g['y']-f['y']) <= EPS):
            raise ValueError('De wandinsprong maakt het plafond ongeldig of te klein.')
    return result


def inside(p, q, boundary=True, tolerance=EPS):
    yes = False
    for i, b in enumerate(p):
        a = p[(i-1) % len(p)]
        if (abs(cross(a,b,q)) < tolerance*max(1,math.hypot(b['x']-a['x'],b['y']-a['y']))
                and min(a['x'],b['x'])-tolerance <= q['x'] <= max(a['x'],b['x'])+tolerance
                and min(a['y'],b['y'])-tolerance <= q['y'] <= max(a['y'],b['y'])+tolerance):
            return boundary
        if ((a['y'] > q['y']) != (b['y'] > q['y']) and
                q['x'] < (b['x']-a['x'])*(q['y']-a['y'])/(b['y']-a['y'])+a['x']):
            yes = not yes
    return yes


def segment_inside(p, a, b, tolerance=EPS):
    if not inside(p, a, True, tolerance) or not inside(p, b, True, tolerance):
        return False
    dx, dy, ts = b['x']-a['x'], b['y']-a['y'], [0, 1]
    for i, e in enumerate(p):
        f = p[(i+1) % len(p)]
        ex, ey = f['x']-e['x'], f['y']-e['y']
        det = dx*ey-dy*ex
        if abs(det) < EPS:
            continue
        ax, ay = e['x']-a['x'], e['y']-a['y']
        t, u = (ax*ey-ay*ex)/det, (ax*dy-ay*dx)/det
        if 0 < t < 1 and -EPS <= u <= 1+EPS:
            ts.append(t)
    ts.sort()
    return all(inside(p, dict(x=a['x']+(lo+hi)/2*dx, y=a['y']+(lo+hi)/2*dy), True, tolerance) for lo, hi in zip(ts, ts[1:]))


def proper_cross(a, b, c, d):
    def side(p, q, r):
        v = cross(p, q, r)
        tol = 1e-6*max(1, math.hypot(q['x']-p['x'], q['y']-p['y']))
        return 0 if abs(v) <= tol else math.copysign(1, v)
    return side(a, b, c)*side(a, b, d) < 0 and side(c, d, a)*side(c, d, b) < 0


def overlaps(p, q):
    for a in p:
        if inside(q, a, False, 1e-6):
            return True
    for a in q:
        if inside(p, a, False, 1e-6):
            return True
    for poly, other in ((p, q), (q, p)):
        for i, a in enumerate(poly):
            b = poly[(i+1) % len(poly)]
            if inside(other, dict(x=(a['x']+b['x'])/2, y=(a['y']+b['y'])/2), False, 1e-6):
                return True
            for j, c in enumerate(other):
                d = other[(j+1) % len(other)]
                if proper_cross(a, b, c, d):
                    return True
    # Identical boundaries: use triangle centroids, which include an interior ear.
    for poly, other in ((p, q), (q, p)):
        for i, a in enumerate(poly):
            b, c = poly[(i+1) % len(poly)], poly[(i+2) % len(poly)]
            pt = dict(x=(a['x']+b['x']+c['x'])/3, y=(a['y']+b['y']+c['y'])/3)
            if inside(poly, pt, False, 1e-6) and inside(other, pt, False, 1e-6):
                return True
    return False


def layout(project):
    rooms = [r for r in project.ruimtes if r.huis_positie is not None]
    if rooms and project.huis is None:
        raise ValueError('Een geplaatste ruimte heeft geen huiscontour.')
    placed = []
    for r in rooms:
        o = r.huis_positie
        p = [dict(a, x=a['x']+o['x'], y=a['y']+o['y']) for a in points(r)]
        if any(not segment_inside(project.huis['contour'], a, p[(i+1) % len(p)], 1e-6) for i, a in enumerate(p)):
            raise ValueError(f'Ruimte “{r.naam}” valt buiten de huiscontour.')
        for old, other in placed:
            if overlaps(p, other):
                raise ValueError(f'Ruimtes “{r.naam}” en “{old.naam}” overlappen op het huisplan.')
        placed.append((r, p))
