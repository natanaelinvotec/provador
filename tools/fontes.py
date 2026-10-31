#!/usr/bin/env python3
"""Gera as fontes próprias da plataforma (woff, só caracteres latinos) e o fontes.css.

Fontes livres (OFL / GUST): Poppins, Inter, Inter Display, Lora, Noto Serif e TeX Gyre.
Ficam hospedadas junto com o site, então as vitrines abrem iguais em qualquer navegador,
sem depender do Google Fonts.
"""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts')
CSS = os.path.join(os.path.dirname(__file__), '..', 'assets', 'css', 'fontes.css')
G = '/usr/share/fonts/truetype/google-fonts/'
I = '/usr/share/fonts/opentype/inter/'
T = '/usr/share/texmf/fonts/opentype/public/tex-gyre/'
N = '/home/claude/pdfwork/fonts/'

# (família no CSS, peso, estilo, arquivo de origem, nome de saída)
FONTES = [
    ('Poppins', 300, 'normal', G + 'Poppins-Light.ttf', 'poppins-300'),
    ('Poppins', 400, 'normal', G + 'Poppins-Regular.ttf', 'poppins-400'),
    ('Poppins', 500, 'normal', G + 'Poppins-Medium.ttf', 'poppins-500'),
    ('Poppins', 700, 'normal', G + 'Poppins-Bold.ttf', 'poppins-700'),
    ('Inter', 300, 'normal', I + 'Inter-Light.otf', 'inter-300'),
    ('Inter', 400, 'normal', I + 'Inter-Regular.otf', 'inter-400'),
    ('Inter', 500, 'normal', I + 'Inter-Medium.otf', 'inter-500'),
    ('Inter', 600, 'normal', I + 'Inter-SemiBold.otf', 'inter-600'),
    ('Inter', 700, 'normal', I + 'Inter-Bold.otf', 'inter-700'),
    ('Inter Display', 600, 'normal', I + 'InterDisplay-SemiBold.otf', 'interdisplay-600'),
    ('Inter Display', 700, 'normal', I + 'InterDisplay-Bold.otf', 'interdisplay-700'),
    ('Inter Display', 800, 'normal', I + 'InterDisplay-ExtraBold.otf', 'interdisplay-800'),
    ('Lora', '400 700', 'normal', G + 'Lora-Variable.ttf', 'lora'),
    ('Lora', '400 700', 'italic', G + 'Lora-Italic-Variable.ttf', 'lora-italic'),
    ('Noto Serif Display', 200, 'normal', N + 'serif-ExtraLight.otf', 'notoserif-200'),
    ('Noto Serif Display', 300, 'normal', N + 'serif-Light.otf', 'notoserif-300'),
    ('Noto Serif Display', 400, 'normal', N + 'serif-Regular.otf', 'notoserif-400'),
    ('Pagella', 400, 'normal', T + 'texgyrepagella-regular.otf', 'pagella-400'),
    ('Pagella', 400, 'italic', T + 'texgyrepagella-italic.otf', 'pagella-400i'),
    ('Pagella', 700, 'normal', T + 'texgyrepagella-bold.otf', 'pagella-700'),
    ('Adventor', 400, 'normal', T + 'texgyreadventor-regular.otf', 'adventor-400'),
    ('Adventor', 700, 'normal', T + 'texgyreadventor-bold.otf', 'adventor-700'),
    ('Heros', 400, 'normal', T + 'texgyreheros-regular.otf', 'heros-400'),
    ('Heros', 700, 'normal', T + 'texgyreheros-bold.otf', 'heros-700'),
    ('Heros Cn', 400, 'normal', T + 'texgyreheroscn-regular.otf', 'heroscn-400'),
    ('Heros Cn', 700, 'normal', T + 'texgyreheroscn-bold.otf', 'heroscn-700'),
    ('Bonum', 400, 'normal', T + 'texgyrebonum-regular.otf', 'bonum-400'),
    ('Bonum', 700, 'normal', T + 'texgyrebonum-bold.otf', 'bonum-700'),
    ('Schola', 400, 'normal', T + 'texgyreschola-regular.otf', 'schola-400'),
    ('Schola', 700, 'normal', T + 'texgyreschola-bold.otf', 'schola-700'),
    ('Chorus', 500, 'italic', T + 'texgyrechorus-mediumitalic.otf', 'chorus-500i'),
]

UNICODES = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,'
            'U+2074,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+2713,U+FEFF,U+FFFD')


def main():
    os.makedirs(OUT, exist_ok=True)
    css = ['/* Fontes livres hospedadas na plataforma (geradas por tools/fontes.py). */']
    total = 0
    for fam, peso, estilo, src, nome in FONTES:
        dst = os.path.join(OUT, nome + '.woff')
        opts = subset.Options()
        opts.flavor = 'woff'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        f = TTFont(src)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(UNICODES))
        sub.subset(f)
        subset.save_font(f, dst, opts)
        total += os.path.getsize(dst)
        css.append(f"@font-face{{font-family:'{fam}';font-style:{estilo};font-weight:{peso};font-display:swap;"
                   f"src:url('../fonts/{nome}.woff') format('woff')}}")
    open(CSS, 'w', encoding='utf-8').write('\n'.join(css) + '\n')
    print(len(FONTES), 'fontes,', round(total / 1024), 'KB')


if __name__ == '__main__':
    main()
