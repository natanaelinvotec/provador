#!/usr/bin/env python3
"""Ilustrações de produto (fundo transparente) usadas nas vitrines de demonstração.

Fundo transparente: a peça aparece sobre a cor de superfície de cada vitrine, então o mesmo
conjunto de 14 imagens serve para as 15 vitrines (claro e escuro). Cada loja troca pelas fotos dela.
Gera tools/ilustracoes.json; o render_ilustracoes.js transforma em PNG.
"""
import json, os

TOP = 'M58 52 C58 34 64 22 70 16 L79 16 C81 29 89 38 100 38 C111 38 119 29 121 16 L130 16 C136 22 142 34 142 52 L142 76 L58 76 Z'
BAND = 'M58 76 H142 V90 H58 Z'
LEG_WB = 'M66 100 H134 V114 H66 Z'
LEG = 'M66 114 H134 L128 238 H106 L100 142 L94 238 H72 Z'
JUMP = 'M82 14 L90 14 C91 26 95 32 100 32 C105 32 109 26 110 14 L118 14 C120 30 124 40 126 52 C128 64 128 80 126 96 L130 238 H108 L100 130 L92 238 H70 L74 96 C72 80 72 64 74 52 C76 40 80 30 82 14 Z'
ROMP = 'M82 40 L90 40 C91 52 95 58 100 58 C105 58 109 52 110 40 L118 40 C120 56 124 66 126 78 C128 90 128 106 126 122 L130 182 H106 L100 156 L94 182 H70 L74 122 C72 106 72 90 74 78 C76 66 80 56 82 40 Z'


def garment(kind, color, piping=False):
    sh = 'rgba(255,255,255,.14)'
    if kind == 'conjunto':
        return f'''<g transform="translate(0 -4)"><path d="{TOP}" fill="{color}"/><path d="{BAND}" fill="{color}"/><path d="{BAND}" fill="rgba(0,0,0,.12)"/>
        <path d="M70 22 C76 40 90 50 100 50 C110 50 124 40 130 22" fill="none" stroke="{sh}" stroke-width="1.5"/></g>
        <path d="{LEG_WB}" fill="{color}"/><path d="{LEG_WB}" fill="rgba(0,0,0,.12)"/><path d="{LEG}" fill="{color}"/>
        <path d="M70 182 L96 164 M130 182 L104 164" stroke="{sh}" stroke-width="1.6" fill="none"/>
        <path d="M86 118 C84 150 82 190 80 232" stroke="rgba(255,255,255,.07)" stroke-width="8" fill="none"/>'''
    if kind == 'macacao':
        return f'''<path d="{JUMP}" fill="{color}"/><path d="M75 96 H125" stroke="{sh}" stroke-width="1.5"/>
        <path d="M88 40 C86 90 82 160 80 230" stroke="rgba(255,255,255,.07)" stroke-width="9" fill="none"/>'''
    if kind == 'costas':
        return f'''<path d="{JUMP}" fill="{color}"/><path d="M86 16 C86 50 92 70 100 70 C108 70 114 50 114 16 Z" fill="rgba(255,255,255,.22)"/>
        <path d="M86 16 C86 50 92 70 100 70 C108 70 114 50 114 16" fill="none" stroke="#E9E4DA" stroke-width="2"/>'''
    if kind == 'macaquinho':
        pip = ('<path d="M82 40 C84 56 92 64 100 64 C108 64 116 56 118 40" fill="none" stroke="#F4F2EE" stroke-width="2.2"/>'
               '<path d="M76 84 C86 76 94 82 100 88 C106 82 114 76 124 84" fill="none" stroke="#F4F2EE" stroke-width="2.2"/>') if piping else ''
        return f'''<g transform="translate(0 22)"><path d="{ROMP}" fill="{color}"/>{pip}</g>'''
    raise ValueError(kind)


def svg(kind, color, piping=False):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="720" height="900">
<circle cx="100" cy="122" r="86" fill="none" stroke="rgba(128,128,128,.28)" stroke-width=".8"/>
<ellipse cx="100" cy="242" rx="54" ry="5" fill="rgba(0,0,0,.16)"/>
<g transform="translate(100 128) scale(.86) translate(-100 -128)" style="filter:drop-shadow(0 6px 6px rgba(0,0,0,.22))">{garment(kind, color, piping)}</g>
<text x="10" y="243" font-family="Inter, sans-serif" font-size="6.5" fill="rgba(128,128,128,.9)" letter-spacing=".3">imagem ilustrativa</text>
</svg>'''


# mesmos nomes das fotos do mockup original (o gerador troca foto por ilustração pelo nome)
ITENS = {
    'flat-recorte-chocolate': ('conjunto', '#7A4634'),
    'macacao-serenity-academia': ('macacao', '#86A9DD'),
    'nadador-preto-modelo': ('conjunto', '#1F1F24'),
    'flat-recorte-marinho': ('conjunto', '#2C3A6E'),
    'macaquinho-preto-modelo': ('macaquinho', '#18181A', True),
    'flat-recorte-royal': ('conjunto', '#2448C4'),
    'flat-recorte-nude': ('conjunto', '#CDB79F'),
    'cruzado-vinho-modelo': ('conjunto', '#6A2238'),
    'flat-cruzado-vinho': ('conjunto', '#5C1F31'),
    'flat-cruzado-preto': ('conjunto', '#1B1A20'),
    'macacao-serenity-rua': ('macacao', '#93B3E2'),
    'macaquinho-marinho-modelo': ('macaquinho', '#22315F', True),
    'nadador-cafe-modelo': ('conjunto', '#4B3226'),
    'macacao-costas-preto-modelo': ('costas', '#141414'),
}

if __name__ == '__main__':
    pages = {n: svg(*spec) for n, spec in ITENS.items()}
    out = os.path.join(os.path.dirname(__file__), 'ilustracoes.json')
    json.dump(pages, open(out, 'w'))
    print(len(pages))
