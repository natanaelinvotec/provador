#!/usr/bin/env python3
"""Gera as vitrines a partir do mockup da Ais (motor único, identidade por tema).

Saída: vitrines/<slug>/*.dc.html (+ img/ na vitrine com fotos) e vitrines/catalogo.json.
- 'ais': o mockup aprovado, idêntico, com as fotos da cliente (não aparece no catálogo público).
- 15 temas de tools/temas.py: mesmas telas, outra paleta, fontes, formas e ilustrações.
As marcas @@NOME@@, @@MARCA@@ etc. são trocadas pelos dados de cada loja na hora de abrir.
"""
import json, os, re, shutil, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from temas import TEMAS, FONTES, TEXTO, MOTIVOS  # noqa: E402

RAIZ = os.path.join(AQUI, '..')
SRC = '/tmp/claude-0/-home-claude/a08074e9-be6d-5e4d-b32d-2b502f3bf999/scratchpad/canvas/project/'
FOTOS = '/home/claude/pdfwork/img/'
ARQUIVOS = ['Main', 'Colecao', 'Produto', 'Sacola', 'Painel', 'AppCliente', 'AppVendas']
IMGMAP = {
    '2c20d596d227f9f33a3515659da1438b': 'flat-recorte-chocolate', '9ce7168632159be75c147d05af7f83a0': 'macacao-serenity-academia',
    'df653e3734bbe996eaf14fe2ee49d985': 'nadador-preto-modelo', '844159998d66baab5586be73553d4d5a': 'flat-recorte-marinho',
    '74c0446eeccdd08bd990ff45254cbe1e': 'macaquinho-preto-modelo', 'adabdc6ff895a9290148ee3b2806c607': 'flat-recorte-royal',
    '5f6087b58156b3fc260c5fc7fd1070e2': 'flat-recorte-nude', '6db483024b14f179d7b08d7af7bcecba': 'cruzado-vinho-modelo',
    'd6333b4c6986d2c8ab23f2d8c1d60182': 'flat-cruzado-vinho', '2d11c1534b9bd7b954ad41e238ae8f30': 'flat-cruzado-preto',
    '6cd895d1efaf26e69e590822d6021de1': 'macacao-serenity-rua', '9984855927b8e78fc928140afe23299b': 'macaquinho-marinho-modelo',
    '2fd33f5bf55c8c6c00883ea9a1d7e8f1': 'nadador-cafe-modelo', '8726dfe3b57ed27e73c3bebe8ca86dc7': 'macacao-costas-preto-modelo',
}
BASE_CLARO = dict(bg='#FBF7F5', sup='#F6F1EF', tinta='#1F1A1C', suave='#6F6468', linha='#E8DEDB', acento='#9A2C52', ouro='#8C6A35')
BASE_ESCURO = dict(bg='#141113', sup='#1D191B', tinta='#F4EEEC', suave='#ABA0A4', linha='#332C2F', acento='#E08AA6', ouro='#D2B57F')
SERIES_BASE = ('--s1:#9A2C52;--s2:#C08A2E;--s3:#2F78B5', '--s1:#C9537D;--s2:#B8862E;--s3:#3F86D0')
BORBOLETA_D = 'M20 15C15 4 4 3 6 11c1.5 6 9 7 14 4zM20 15c5-11 16-12 14-4-1.5 6-9 7-14 4zM20 15c-3 4-8 9-5 10 3 1 4-5 5-10zM20 15c3 4 8 9 5 10-3 1-4-5-5-10z'
BORBOLETA_P = ('<path d="M20 15C15 4 4 3 6 11c1.5 6 9 7 14 4z"></path><path d="M20 15c5-11 16-12 14-4-1.5 6-9 7-14 4z"></path>'
               '<path d="M20 15c-3 4-8 9-5 10 3 1 4-5 5-10z"></path><path d="M20 15c3 4 8 9 5 10-3 1-4-5-5-10z"></path>')


def rgba(h):
    h = h.lstrip('#')
    return ','.join(str(int(h[i:i + 2], 16)) for i in (0, 2, 4))


def marcas(t):
    """Troca os dados da Ais por marcas que cada loja preenche."""
    t = t.replace('Ais Moda Fitness', '@@NOME@@').replace('aismodafitnesscg', '@@IG@@')
    t = t.replace('WhatsApp [número]', 'WhatsApp @@WHATS@@')
    t = t.replace('Campo Grande, MS', '@@CIDADE@@').replace('Campo Grande', '@@CIDADE_CURTA@@')
    t = re.sub(r'(<span class="logo-ais"[^>]*>)Ais(</span>)', r'\1@@MARCA@@\2', t)
    t = re.sub(r'(<span class="logo-sub"[^>]*>)MODA FITNESS(</span>)', r'\1@@MARCA_SUB@@\2', t)
    t = re.sub(r'\bAis\b', '@@MARCA@@', t)
    t = t.replace('>AI<', '>@@INICIAIS@@<')
    return t


def imagens(t, prefixo, ext):
    return re.sub(r'/_blob/([0-9a-f]{32})', lambda m: f'{prefixo}{IMGMAP[m.group(1)]}.{ext}', t)


def css_tema(tema):
    fam, peso, esp = FONTES[tema['titulo']]
    corpo, peso_corpo = TEXTO[tema['texto']]
    ital = 'font-style:italic;' if tema.get('italico') else ''
    pesado = peso >= 600
    regras = [
        f".ais,.app{{font-weight:{peso_corpo}}}",
        f".logo-ais{{font-family:{fam} !important;font-weight:{max(peso, 500)} !important;letter-spacing:{esp};{ital}}}",
        f".serif,.ais h1,.ais h2,.ais h3,.app h1,.app h2,.app h3{{font-weight:{peso} !important;letter-spacing:{esp} !important;{ital}}}",
        f".tier .d,.big,.kit-n,.tiers-inline .big,.promo .tiers b,.tot .t b,.b-row.tot .serif,.tg-row.tot .serif,.hello b,.k-value,.tag-name{{font-weight:{peso} !important}}",
        ".btn,.quick,.tab,.chip,.fbtn,.mini-btn{font-weight:500}",
        ".cat-label{flex-direction:column !important;align-items:flex-start !important;justify-content:flex-end !important;gap:10px !important}",
    ]
    if pesado:
        regras.append(".slide-txt h1{font-size:clamp(40px,5vw,70px) !important;line-height:1.04 !important}")
        regras.append(".cat-name{font-size:clamp(26px,2.5vw,38px) !important}")
        regras.append(".bigline .marquee > span{font-weight:800 !important;-webkit-text-stroke:1.2px var(--muted) !important}")
    if tema.get('faixa'):
        fundo, letra = tema['faixa']
        regras.append(f'.ais:not([data-theme="escuro"]) .topbar{{background:{fundo} !important;color:{letra} !important}}')
    if tema['forma'] == 'reta':
        regras.append('.btn,.chip,.tab,.quick,.fbtn,.mini-btn,.badge,.pill,.sw,.icon-btn,.opt,.b-opt,.b-acc,.tile,.kit,.card,.media{border-radius:2px !important}')
    elif tema['forma'] == 'suave':
        regras.append('.btn,.chip,.tab,.quick,.fbtn,.mini-btn,.badge,.pill{border-radius:12px !important}')
    return '<style>\n' + '\n'.join(regras) + '\n</style>'


def aplicar_tema(t, tema):
    s_claro, s_escuro = tema['series']
    t = t.replace(SERIES_BASE[0], '--s1:%s;--s2:%s;--s3:%s' % s_claro)
    t = t.replace(SERIES_BASE[1], '--s1:%s;--s2:%s;--s3:%s' % s_escuro)
    pares = []
    for chave in ('bg', 'sup', 'tinta', 'suave', 'linha', 'acento', 'ouro'):
        pares.append((BASE_CLARO[chave], tema['claro'][chave]))
        pares.append((BASE_ESCURO[chave], tema['escuro'][chave]))
    for a, b in pares:
        t = t.replace(a, b)
    t = t.replace('rgba(31,26,28,', 'rgba(%s,' % rgba(tema['claro']['tinta']))
    t = t.replace('rgba(154,44,82,.55)', 'rgba(%s,.55)' % rgba(tema['claro']['acento']))
    t = t.replace('rgba(20,17,19,', 'rgba(%s,' % rgba(tema['escuro']['bg']))
    fam, peso, _ = FONTES[tema['titulo']]
    corpo, _ = TEXTO[tema['texto']]
    primeira = fam.split(',')[0]
    t = re.sub(r"'Cormorant Garamond',\s*Georgia,\s*serif", fam, t)
    t = t.replace("'Cormorant Garamond'", primeira).replace("'Jost'", corpo.split(',')[0])
    t = re.sub(r"(" + re.escape(primeira) + r"[^;\"]*;\s*font-weight:\s*)(300|400)", r"\g<1>" + str(peso), t)
    # fontes próprias no lugar do Google Fonts
    t = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', t)
    t = re.sub(r'<link href="https://fonts\.googleapis\.com[^"]*" rel="stylesheet">', '<link rel="stylesheet" href="assets/css/fontes.css">', t)
    t = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*">', '<link rel="stylesheet" href="assets/css/fontes.css">', t)
    # motivo gráfico
    d = MOTIVOS[tema['motivo']]
    if d:
        t = t.replace(BORBOLETA_D, d).replace(BORBOLETA_P, f'<path d="{d}"></path>')
    t = t.replace('Delicadeza também é força', tema['frase'])
    return t.replace('</helmet>', css_tema(tema) + '\n</helmet>', 1)


# Variações de vitrine para cada tema não parecer a mesma página com outra cor:
# modo inicial, fundo da moldura do destaque, qual peça abre o carrossel e a manchete dela.
#   moldura: liso (superfície), tom (acento a 16%), cor (acento cheio), contraste (tinta)
VARIACOES = {
    'vinho-delicado':   dict(modo='claro',  moldura='tom',       destaque=0, manchete=None),
    'grafite-lima':     dict(modo='escuro', moldura='cor',       destaque=1, manchete='Treino pesado, peça leve'),
    'rubi-dourado':     dict(modo='escuro', moldura='tom',       destaque=2, manchete='Para quem treina querendo ser vista'),
    'areia-oliva':      dict(modo='claro',  moldura='tom',       destaque=1, manchete='Calma no movimento, firmeza na peça'),
    'azul-atleta':      dict(modo='claro',  moldura='cor',       destaque=1, manchete='Corre, salta, agacha. A peça acompanha.'),
    'pink-pulse':       dict(modo='claro',  moldura='cor',       destaque=1, manchete='Cor para treinar de bom humor'),
    'preto-puro':       dict(modo='claro',  moldura='contraste', destaque=1, manchete='Poucas peças. Todas certas.'),
    'lavanda-suave':    dict(modo='claro',  moldura='tom',       destaque=0, manchete='Leve do aquecimento ao alongamento'),
    'caramelo':         dict(modo='claro',  moldura='tom',       destaque=1, manchete='O básico que você usa a semana inteira'),
    'verde-mata':       dict(modo='escuro', moldura='tom',       destaque=2, manchete='Treino ao ar livre pede peça boa'),
    'ameixa-coral':     dict(modo='claro',  moldura='cor',       destaque=1, manchete='Todas as curvas cabem no treino'),
    'marinho-classico': dict(modo='claro',  moldura='contraste', destaque=0, manchete='Clássico por fora, técnico por dentro'),
    'editorial-bronze': dict(modo='claro',  moldura='liso',      destaque=2, manchete='Coleção cápsula, peça por peça'),
    'laranja-energia':  dict(modo='escuro', moldura='cor',       destaque=1, manchete='Treino forte pede peça forte'),
    'ceu-pastel':       dict(modo='claro',  moldura='tom',       destaque=0, manchete='Leveza para o dia inteiro'),
}
MOLDURA_CSS = {
    'liso': '',
    'tom': '.frame{background:color-mix(in srgb,var(--wine) 16%,var(--surface)) !important}',
    'cor': '.frame{background:var(--wine) !important}.frame-line{border-color:rgba(255,255,255,.55) !important}',
    'contraste': '.frame{background:var(--ink) !important}.frame-line{border-color:rgba(255,255,255,.35) !important}',
}


def jsstr(x):
    return "'" + x.replace('\\', '\\\\').replace("'", "\\'") + "'"


def aplicar_variacao(t, slug):
    v = VARIACOES.get(slug)
    if not v:
        return t
    if v['modo'] == 'escuro':
        t = t.replace('"options":["claro","escuro"],"default":"claro"', '"options":["claro","escuro"],"default":"escuro"')
    css = MOLDURA_CSS[v['moldura']]
    if css:
        t = t.replace('</helmet>', '<style>\n' + css + '\n</style>\n</helmet>', 1)
    if 'const SLIDES = [' in t:
        extra = ''
        if v['destaque']:
            extra += 'SLIDES.push.apply(SLIDES, SLIDES.splice(0, %d));\n    ' % v['destaque']
        if v['manchete']:
            extra += 'SLIDES[0] = Object.assign({}, SLIDES[0], { title: %s });\n    ' % jsstr(v['manchete'])
        if extra:
            t = t.replace('\n    const PRODUCTS = [', '\n    ' + extra + 'const PRODUCTS = [', 1)
    return t


def gerar():
    destino = os.path.join(RAIZ, 'vitrines')
    catalogo = []
    # 1) a vitrine da Ais, idêntica ao mockup aprovado, com as fotos dela
    pasta = os.path.join(destino, 'ais')
    os.makedirs(os.path.join(pasta, 'img'), exist_ok=True)
    for nome in IMGMAP.values():
        shutil.copy(FOTOS + nome + '.jpg', os.path.join(pasta, 'img', nome + '.jpg'))
    for arq in ARQUIVOS:
        t = open(SRC + arq + '.dc.html', encoding='utf-8').read()
        t = imagens(marcas(t), 'vitrines/ais/img/', 'jpg')
        open(os.path.join(pasta, arq + '.dc.html'), 'w', encoding='utf-8').write(t)
    catalogo.append(dict(slug='ais', nome='Ais (exclusiva)', estilo='Delicado', publica=False,
                         descricao='Vitrine aprovada da Ais Moda Fitness, com as fotos da loja.',
                         cores=[BASE_CLARO['bg'], BASE_CLARO['acento'], BASE_CLARO['ouro'], BASE_ESCURO['bg']]))
    # 2) as 15 vitrines do catálogo
    for tema in TEMAS:
        pasta = os.path.join(destino, tema['slug'])
        os.makedirs(pasta, exist_ok=True)
        for arq in ARQUIVOS:
            t = open(SRC + arq + '.dc.html', encoding='utf-8').read()
            t = aplicar_variacao(aplicar_tema(imagens(marcas(t), 'vitrines/_ilustracoes/', 'png'), tema), tema['slug'])
            open(os.path.join(pasta, arq + '.dc.html'), 'w', encoding='utf-8').write(t)
        catalogo.append(dict(slug=tema['slug'], nome=tema['nome'], estilo=tema['estilo'], publica=True,
                             descricao=tema['descricao'],
                             cores=[tema['claro']['bg'], tema['claro']['acento'], tema['claro']['ouro'], tema['escuro']['bg']],
                             fontes=[FONTES[tema['titulo']][0].split(',')[0].strip("'"), TEXTO[tema['texto']][0].split(',')[0].strip("'")],
                             modo=VARIACOES[tema['slug']]['modo'], frase=tema['frase']))
    json.dump(catalogo, open(os.path.join(destino, 'catalogo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('vitrines:', len(catalogo))


if __name__ == '__main__':
    gerar()
