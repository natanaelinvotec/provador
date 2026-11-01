#!/usr/bin/env python3
"""
paleta.py — gera as 15 cores de um modelo do motor comum a partir das 15 cores do catálogo.

Cada cor do catálogo (vitrines/_modelos/modelos.json, modelo "arena") tem um destaque (accent) e um segundo
destaque (accent2) pensados para fundo escuro. Para um modelo claro, o destaque é escurecido até o texto
branco ter contraste de leitura (4,5:1) e o fundo recebe um toque bem leve da cor.

Uso no código:  from paleta import paleta_modelo
  paleta_modelo(arena_cores, esquema='claro', fundo='#FFFFFF', tinge=0.03, deep='tinta')
"""
import math


def _hex(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def _to_hex(rgb):
    return '#' + ''.join('%02X' % max(0, min(255, round(c * 255))) for c in rgb)


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gam(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def oklch(h):
    r, g, b = (_lin(c) for c in _hex(h))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (x ** (1 / 3) if x > 0 else 0 for x in (l, m, s))
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def from_oklch(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return _to_hex([_gam(max(0, min(1, x))) for x in (r, g, bl)])


def lum(h):
    r, g, b = (_lin(c) for c in _hex(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def escurecer_ate(h, contra='#FFFFFF', alvo=4.6, croma_max=None):
    L, C, H = oklch(h)
    if croma_max:
        C = min(C, croma_max)
    while L > 0.05:
        x = from_oklch(L, C, H)
        if contraste(x, contra) >= alvo:
            return x
        L -= 0.01
        C *= 0.995
    return from_oklch(L, C, H)


def misturar(a, b, t):
    A, B = _hex(a), _hex(b)
    return _to_hex([A[i] + (B[i] - A[i]) * t for i in range(3)])


# ajustes à mão para cores que não funcionam só escurecendo
ESPECIAL_CLARO = {
    'grafite-lima': {'accent': '#23282F', 'onAccent': '#D4FF2A', 'accent2': '#5C7A00'},
    'preto-puro': {'accent': '#111111', 'onAccent': '#FFFFFF', 'accent2': '#6B6B6B'},
    'editorial-bronze': {'accent2': '#2B2620'},
    'caramelo': {'accent2': '#3F7A33'},
    'marinho-classico': {'accent': '#1E3A6E'},
    'vinho-delicado': {'accent': '#8E2A4E'},
}


def paleta_modelo(base, esquema='claro', fundo='#FFFFFF', tinge=0.03, deep='tinta', superficie=None, ink='#17181A'):
    """base: dict slug -> cor do catálogo (bg, surface, line, accent, onAccent, accent2, modo, nome)."""
    out = {}
    for slug, c in base.items():
        if c.get('modo') == 'claro' and esquema != 'escuro':
            # as duas cores claras do catálogo já são claras: mantém o fundo delas
            fx = dict(c)
            fx.update({'deep': escurecer_ate(c['accent'], alvo=12, croma_max=0.06), 'onDeep': '#FFFFFF', 'soft': misturar(c['bg'], c['accent'], 0.06), 'ink': '#15171A', 'muted': '#5A5F66'})
            out[slug] = {k: fx[k] for k in ('nome', 'modo', 'bg', 'surface', 'line', 'accent', 'onAccent', 'accent2', 'deep', 'onDeep', 'soft', 'ink', 'muted')}
            continue
        if esquema == 'escuro':
            fx = dict(c)
            fx.update({'modo': 'escuro', 'deep': '#000000', 'onDeep': '#FFFFFF', 'soft': c['surface']})
            if c.get('modo') == 'claro':
                fx.update({'deep': escurecer_ate(c['accent'], alvo=12, croma_max=0.06), 'soft': misturar(c['bg'], c['accent'], 0.06), 'ink': '#15171A', 'muted': '#5A5F66'})
            else:
                fx.update({'ink': '#F3F4F1', 'muted': '#A9ADB3'})
            out[slug] = {k: fx[k] for k in ('nome', 'modo', 'bg', 'surface', 'line', 'accent', 'onAccent', 'accent2', 'deep', 'onDeep', 'soft', 'ink', 'muted')}
            continue
        esp = ESPECIAL_CLARO.get(slug, {})
        acc = esp.get('accent') or escurecer_ate(c['accent'])
        acc2 = esp.get('accent2') or escurecer_ate(c['accent2'], alvo=3.4)
        bg = misturar(fundo, c['accent'], tinge)
        sup = superficie and misturar(superficie, c['accent'], tinge * 1.2) or misturar(misturar(fundo, '#000000', 0.035), c['accent'], tinge * 1.6)
        line = misturar(misturar(fundo, '#000000', 0.11), c['accent'], tinge * 1.6)
        soft = misturar(fundo, c['accent'], max(0.06, tinge * 2.4))
        if deep == 'accent':
            dp = acc
        elif deep == 'preto':
            dp = '#0E0E0F'
        else:
            dp = escurecer_ate(c['accent'], alvo=15, croma_max=0.05)
        out[slug] = {
            'nome': c['nome'], 'modo': 'claro', 'bg': bg, 'surface': sup, 'line': line,
            'accent': acc, 'onAccent': esp.get('onAccent', '#FFFFFF'), 'accent2': acc2,
            'deep': dp, 'onDeep': esp.get('onAccent', '#FFFFFF') if deep == 'accent' else '#FFFFFF', 'soft': soft,
            'ink': misturar(ink, c['accent'], 0.04), 'muted': misturar('#5E6269', c['accent'], 0.05)
        }
    return out


if __name__ == '__main__':
    import json, pathlib
    m = json.loads((pathlib.Path(__file__).resolve().parents[2] / 'vitrines/_modelos/modelos.json').read_text())
    arena = [x for x in m['modelos'] if x['slug'] == 'arena'][0]['cores']
    for k, v in paleta_modelo(arena).items():
        print(k, v['accent'], round(contraste(v['accent'], v['onAccent']), 2), v['accent2'], round(contraste(v['accent2'], v['bg']), 2), v['bg'], v['deep'])
