#!/usr/bin/env python3
"""
modelos_motor.py — registro dos modelos que usam o motor comum (vitrines/_modelos/_base).

Cada entrada abaixo vira um modelo em vitrines/_modelos/modelos.json: número, nome, prefixo, layout (seções da
página inicial e variantes), textos, fotos de ambiente e as 15 cores geradas por paleta.py. A cara de cada modelo
fica na folha vitrines/_modelos/<slug>/<slug>.css.

Chaves de cada modelo:
  esquema/fundo/tinge/deep/superficie  -> paleta.py (claro ou escuro, cor de fundo, quanto a cor tinge o fundo...)
  suave        cor base do fundo "suave" (--soft): bege, rosado... misturada com um pouco da cor de cada paleta
  accent2      segunda cor fixa em todas as paletas (ex.: o dourado do Nobre)
  layout       variantes da raiz (topo, aviso, cartão, rodapé, títulos...) e a lista de seções da página inicial
  textos       avisos do topo, slides do destaque, "sobre" etc. (sem promessa que a loja não cumpre)
  fotos        fotos de ambiente (vitrines/_fotos/<nome>.jpg) por lugar: hero, banner, sobre, looks, ig...

Rodar na raiz do repositório depois de mudar algo aqui (o workflow "Pré-builds" também roda):
    python3 tools/prebuild/modelos_motor.py
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from paleta import paleta_modelo, misturar

RAIZ = pathlib.Path(__file__).resolve().parents[2]
ARQ = RAIZ / 'vitrines/_modelos/modelos.json'

MODELOS = []


def modelo(**m):
    MODELOS.append(m)


def slides(*itens):
    """(kicker, título, texto, botão, link) -> lista de slides do destaque."""
    return [{'kicker': k, 'titulo': t, 'texto': x, 'botao': b, 'link': l} for k, t, x, b, l in itens]


# ---------------------------------------------------------------- 3 · Pulso
modelo(
    slug='pulso', numero=3, nome='Pulso',
    descricao='Clara e direta: banner largo, vantagens em faixa e cartões com botão de comprar.',
    origem='Estrutura estudada na CajuBrasil (loja de moda fitness de alta performance); fotos, textos, fontes e cores próprios',
    fontes=['Outfit'], esquema='claro', fundo='#FFFFFF', tinge=0.015, deep='accent',
    layout={
        'topo': 'classico', 'aviso': 'setas', 'cartao': 'botao', 'rodape': 'claro', 'titulos': 'centro',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'lado', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'banner', 'nav': 'barras'},
            {'tipo': 'beneficios', 'variante': 'faixa', 'classe': 'tom'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Novidades', 'filtro': 'novos', 'n': 8},
            {'tipo': 'categorias', 'variante': 'blocos', 'titulo': 'Escolha por categoria', 'n': 3},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Macacões e macaquinhos', 'filtro': 'cats:macacoes,macaquinhos', 'n': 8},
            {'tipo': 'looks', 'titulo': 'Monte seu look', 'subtitulo': 'Combinações prontas com as peças da loja.'},
            {'tipo': 'instagram', 'titulo': 'Quem treina com a gente'},
        ],
    },
    textos={
        'avisos': ['Entrega para todo o Brasil, frete combinado no WhatsApp', '5% de desconto no Pix', 'Troca fácil em até 7 dias'],
        'hero': slides(
            ('Linha compressão', 'Segura no treino.\nLeve no corpo.', 'Leggings e tops que firmam sem apertar, do aquecimento ao último set.', 'Conhecer a linha', 'cat:leggings'),
            ('Novidades da semana', 'Cores novas\npara treinar', 'Conjuntos em tons que aparecem no espelho da academia.', 'Ver novidades', 'cat:conjuntos'),
            ('Do treino para a rua', 'Conforto que\nvai junto', 'Macacões e tops para treinar e seguir o dia sem trocar de roupa.', 'Ver macacões', 'cat:macacoes'),
        ),
    },
    fotos={
        'hero': ['amb-academia-06', 'amb-academia-01', 'amb-academia-07'],
        'looks': ['amb-estilo-01', 'amb-corrida-14', 'amb-academia-09'],
        'ig': ['amb-corrida-01', 'amb-corrida-06', 'amb-estudio-01', 'amb-pilates-10', 'amb-estilo-03', 'amb-yoga-06'],
        'colecao': 'amb-academia-04', 'sobre': 'amb-academia-07', 'banner': 'amb-corrida-12',
    },
)

# ---------------------------------------------------------------- 4 · Aura
modelo(
    slug='aura', numero=4, nome='Aura',
    descricao='Leve e arredondada: logo no centro, menu em pílulas, categorias em cartões bege e cartões com borda.',
    origem='Estrutura estudada na Massam (moda fitness feminina); fotos, textos, fontes e cores próprios',
    fontes=['Italiana', 'Nunito'], esquema='claro', fundo='#FFFFFF', tinge=0.01, deep='preto', suave='#F1EBE2',
    layout={
        'topo': 'central', 'aviso': 'faixa', 'cartao': 'pilula', 'rodape': 'claro', 'titulos': 'esquerda',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'grade', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'lista'},
            {'tipo': 'beneficios', 'variante': 'cartao'},
            {'tipo': 'categorias', 'variante': 'cartoes', 'titulo': 'Escolha a sua', 'subtitulo': 'As peças da loja separadas por tipo.', 'n': 3},
            {'tipo': 'vitrine', 'variante': 'grade', 'titulo': 'Lançamentos', 'subtitulo': 'Movimento, conforto e cor para o seu treino.', 'filtro': 'novos', 'n': 8, 'verTodos': 'Ver todos os lançamentos'},
            {'tipo': 'banner', 'variante': 'centro', 'titulo': 'Treino com calma', 'kicker': 'Pilates e yoga', 'texto': 'Peças macias para alongar, respirar e seguir o dia.', 'botao': 'Ver conjuntos', 'link': 'cat:conjuntos'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Conjuntos', 'subtitulo': 'Top e legging que já combinam.', 'filtro': 'cat:conjuntos', 'n': 8},
            {'tipo': 'instagram', 'titulo': 'No nosso Instagram'},
        ],
    },
    textos={
        'avisos': ['Entrega para todo o Brasil · 5% de desconto no Pix · Troca em até 7 dias'],
        'hero': slides(
            ('Novo drop', 'Novo\nmovimento', 'Conjuntos e leggings em tons suaves para treinar com leveza.', 'Ver a coleção', 'cat:conjuntos'),
            ('Pilates e yoga', 'Respira\ne alonga', 'Peças que acompanham o corpo em cada postura.', 'Ver leggings', 'cat:leggings'),
            ('Do estúdio para a rua', 'Leve o dia\ninteiro', 'Tops e macacões confortáveis do primeiro ao último compromisso.', 'Ver macacões', 'cat:macacoes'),
        ),
    },
    fotos={
        'hero': ['amb-yoga-02', 'amb-pilates-06', 'amb-estilo-06'],
        'banner': 'amb-yoga-09', 'colecao': 'amb-pilates-05', 'sobre': 'amb-yoga-07',
        'looks': ['amb-pilates-04', 'amb-yoga-12', 'amb-yoga-09'],
        'ig': ['amb-yoga-05', 'amb-pilates-01', 'amb-yoga-10', 'amb-pilates-03', 'amb-yoga-12', 'amb-pilates-04'],
    },
)

# ---------------------------------------------------------------- 5 · Impacto
modelo(
    slug='impacto', numero=5, nome='Impacto',
    descricao='Preto e branco de campanha: foto P&B em tela cheia, letras enormes, atalho por tamanho e cartões com tamanhos.',
    origem='Estrutura estudada na DLK (moda fitness e praia); fotos, textos, fontes e cores próprios',
    fontes=['Archivo'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='preto', superficie='#F3F3F3', suave='#F2F2F2',
    layout={
        'topo': 'classico', 'aviso': 'faixa', 'cartao': 'tamanhos', 'rodape': 'escuro', 'titulos': 'esquerda',
        'faixa': 'cor', 'filtros': 'gaveta', 'galeria': 'baixo', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'tela'},
            {'tipo': 'beneficios', 'variante': 'escura'},
            {'tipo': 'tamanhos', 'titulo': 'Encontre seu tamanho', 'subtitulo': 'Toque no tamanho e veja só as peças que servem em você.'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Novidades', 'filtro': 'novos', 'n': 8, 'fundo': 'soft'},
            {'tipo': 'categorias', 'variante': 'retratos', 'titulo': 'Compre por categoria', 'n': 6},
            {'tipo': 'looks', 'titulo': 'Vista o treino', 'subtitulo': 'A peça que aparece na foto, pronta para a sacola.'},
            {'tipo': 'duplo', 'variante': 'padrao', 'titulo': 'Coleções', 'itens': [
                {'kicker': 'Para treinar pesado', 'titulo': 'Leggings', 'botao': 'Ver mais', 'link': 'cat:leggings'},
                {'kicker': 'Pronto para combinar', 'titulo': 'Conjuntos', 'botao': 'Ver mais', 'link': 'cat:conjuntos'},
            ]},
        ],
    },
    textos={
        'avisos': ['Frete para todo o Brasil', '5% off no Pix', 'Troca em até 7 dias'],
        'hero': slides(
            ('Coleção nova', 'TREINO\nSEM PAUSA', 'Peças firmes para quem não para no meio da série.', 'Ver a coleção', 'cat:conjuntos'),
            ('Leggings', 'FORÇA\nNO DETALHE', 'Leggings que acompanham o agachamento do começo ao fim.', 'Ver leggings', 'cat:leggings'),
            ('Tops', 'SEGURA\nO RITMO', 'Tops para treino de impacto, do pulo à corrida.', 'Ver tops', 'cat:tops'),
        ),
    },
    fotos={
        'hero': ['amb-pb-04', 'amb-academia-08', 'amb-academia-10'],
        'duplo': ['amb-academia-07', 'amb-academia-06'],
        'looks': ['amb-academia-04', 'amb-academia-09', 'amb-corrida-14'],
        'colecao': 'amb-pb-02', 'banner': 'amb-pb-03', 'sobre': 'amb-pb-06',
        'ig': ['amb-academia-03', 'amb-pb-06', 'amb-pb-08', 'amb-academia-13', 'amb-pb-07', 'amb-corrida-05'],
    },
)

# ---------------------------------------------------------------- 6 · Cetim
modelo(
    slug='cetim', numero=6, nome='Cetim',
    descricao='Delicada e editorial: cantos arredondados, categorias com seta, abas na vitrine e bloco com título serifado.',
    origem='Estrutura estudada na Fitmoda (moda fitness e lingerie); fotos, textos, fontes e cores próprios',
    fontes=['Urbanist', 'Fraunces'], esquema='claro', fundo='#FFFFFF', tinge=0.012, deep='tinta', suave='#F7EFEB',
    layout={
        'topo': 'classico', 'aviso': 'setas', 'cartao': 'simples', 'rodape': 'claro', 'titulos': 'esquerda',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'lado', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'banner'},
            {'tipo': 'categorias', 'variante': 'sobre', 'titulo': 'Compre por categoria', 'n': 8},
            {'tipo': 'vitrine', 'variante': 'grade', 'titulo': 'Confira os lançamentos', 'filtro': 'todos', 'abas': True, 'abaTodos': 'Tudo', 'n': 8, 'verTodos': 'Ver todos'},
            {'tipo': 'sobre', 'variante': 'editorial', 'fundo': 'soft', 'textos': {
                'kicker': 'Coleção', 'titulo': 'Toque macio,\ntreino firme',
                'texto': 'A @@NOME@@ escolheu peças de toque suave que acompanham o corpo no treino e ficam bonitas no resto do dia.',
                'itens': []}, 'botao': 'Ver a coleção'},
            {'tipo': 'banner', 'variante': 'centro', 'kicker': 'Pensadas além do óbvio', 'titulo': 'Detalhes que fazem diferença', 'texto': 'Recortes, alças e cores escolhidas para você treinar se sentindo bem.', 'botao': 'Ver novidades', 'link': 'cat:conjuntos'},
            {'tipo': 'instagram', 'titulo': 'Quem veste'},
        ],
    },
    textos={
        'avisos': ['Compra segura', 'Troca fácil em até 7 dias', '5% de desconto no Pix'],
        'hero': slides(
            ('Novidades', 'Leve como\num abraço', 'Conjuntos de toque macio em cores delicadas.', 'Ver conjuntos', 'cat:conjuntos'),
            ('Para o estúdio', 'Cor que\nacompanha', 'Leggings e tops para pilates, yoga e academia.', 'Ver leggings', 'cat:leggings'),
            ('Macacões', 'Uma peça,\nlook pronto', 'Vista, treine e siga o dia.', 'Ver macacões', 'cat:macacoes'),
        ),
    },
    fotos={
        'hero': ['amb-estudio-04', 'amb-estilo-07', 'amb-estudio-06'],
        'sobre': 'amb-estilo-01', 'banner': 'amb-yoga-08', 'colecao': 'amb-yoga-11',
        'looks': ['amb-pilates-09', 'amb-estilo-01', 'amb-yoga-12'],
        'ig': ['amb-pilates-09', 'amb-yoga-05', 'amb-estilo-07', 'amb-pilates-03', 'amb-yoga-09', 'amb-estudio-08'],
    },
)

# ---------------------------------------------------------------- 7 · Trilha
modelo(
    slug='trilha', numero=7, nome='Trilha',
    descricao='Editorial ao ar livre: cabeçalho sobre a foto, título vazado gigante, vitrine ao lado de uma foto e duas metades coladas.',
    origem='Estrutura estudada na Bro Fitwear (moda fitness com clima de viagem); fotos, textos, fontes e cores próprios',
    fontes=['Syne', 'Prompt'], esquema='claro', fundo='#FFFFFF', tinge=0.01, deep='tinta',
    layout={
        'topo': 'classico', 'sobreposto': True, 'aviso': 'setas', 'cartao': 'centro', 'rodape': 'claro', 'titulos': 'centro',
        'faixa': 'cor', 'filtros': 'lateral', 'galeria': 'lado', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'tela', 'nav': 'miniaturas'},
            {'tipo': 'vitrine', 'variante': 'dividida', 'titulo': 'Peças da estação', 'filtro': 'novos', 'n': 8, 'foto': 'vit',
             'fotoTitulo': 'Leve na mala', 'fotoTexto': 'Conjuntos que vão da trilha ao café da cidade.', 'verTodos': 'Ver todas'},
            {'tipo': 'categorias', 'variante': 'faixa', 'titulo': 'Categorias', 'n': 8, 'botao': 'Ver'},
            {'tipo': 'sobre', 'variante': 'invertido', 'textos': {
                'kicker': 'A coleção', 'titulo': 'Feita para ir longe',
                'texto': 'Cores tiradas da terra, do mar e do fim de tarde. A @@NOME@@ escolheu peças para quem treina onde der: na praia, no parque ou na estrada.',
                'itens': []}, 'botao': 'Conhecer as peças'},
            {'tipo': 'duplo', 'variante': 'colado', 'classe': 'v-centro', 'itens': [
                {'titulo': 'Macacões', 'botao': 'Conheça', 'link': 'cat:macacoes'},
                {'titulo': 'Conjuntos', 'botao': 'Conheça', 'link': 'cat:conjuntos'},
            ]},
            {'tipo': 'instagram', 'titulo': 'Pelo caminho'},
        ],
    },
    textos={
        'avisos': ['Frete para todo o Brasil', 'Troca fácil em até 7 dias', '5% de desconto no Pix'],
        'hero': slides(
            ('Coleção ao ar livre', 'Horizonte', 'Peças para correr, caminhar e chegar mais longe.', 'Conheça', 'cat:conjuntos'),
            ('Para a trilha', 'Caminho', 'Leggings e tops para subida, poeira e vento.', 'Conheça', 'cat:leggings'),
            ('Fim de tarde', 'Estrada', 'Macacões para seguir o dia sem trocar de roupa.', 'Conheça', 'cat:macacoes'),
        ),
    },
    fotos={
        'hero': ['amb-corrida-12', 'amb-corrida-07', 'amb-yoga-01'],
        'vit': 'amb-natureza-03', 'sobre': 'amb-corrida-15', 'duplo': ['amb-natureza-01', 'amb-corrida-11'],
        'colecao': 'amb-corrida-04', 'banner': 'amb-corrida-02',
        'looks': ['amb-corrida-04', 'amb-natureza-03', 'amb-corrida-14'],
        'ig': ['amb-corrida-09', 'amb-corrida-10', 'amb-natureza-02', 'amb-estilo-06', 'amb-yoga-01', 'amb-corrida-02'],
    },
)

# ---------------------------------------------------------------- 8 · Vibe
modelo(
    slug='vibe', numero=8, nome='Vibe',
    descricao='Promocional e jovem: busca grande no topo, letras condensadas, categorias com nome enorme e preço do Pix em destaque.',
    origem='Estrutura estudada na Manalinda (moda fitness feminina); fotos, textos, fontes e cores próprios',
    fontes=['Sofia Sans Condensed', 'Sofia Sans'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='preto',
    layout={
        'topo': 'busca', 'aviso': 'faixa', 'cartao': 'centro', 'rodape': 'escuro', 'titulos': 'centro',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'lado', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'tela', 'nav': 'setas'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Lançamentos', 'filtro': 'novos', 'n': 8},
            {'tipo': 'categorias', 'variante': 'faixa', 'titulo': 'Categorias', 'n': 8, 'botao': 'Ver tudo'},
            {'tipo': 'beneficios', 'variante': 'centro', 'fundo': 'soft'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Conjuntos', 'filtro': 'cat:conjuntos', 'n': 8},
            {'tipo': 'instagram', 'titulo': 'Quem usa'},
        ],
    },
    textos={
        'avisos': ['5% de desconto no Pix em todo o site'],
        'hero': slides(
            ('Chegou', 'VIBE DE\nTREINO NOVO', 'Conjuntos em cores que chamam atenção na academia.', 'Ver lançamentos', 'cat:conjuntos'),
            ('Leggings', 'FIRME DO\nCOMEÇO AO FIM', 'Do aquecimento ao último set.', 'Ver leggings', 'cat:leggings'),
            ('Tops', 'COR PARA\nTODO DIA', 'Tops para combinar com tudo o que você já tem.', 'Ver tops', 'cat:tops'),
        ),
    },
    fotos={
        'hero': ['amb-academia-10', 'amb-corrida-05', 'amb-academia-13'],
        'colecao': 'amb-estudio-03', 'banner': 'amb-estudio-07', 'sobre': 'amb-estudio-01',
        'looks': ['amb-estudio-01', 'amb-estudio-08', 'amb-estudio-05'],
        'ig': ['amb-estudio-01', 'amb-estudio-03', 'amb-estudio-07', 'amb-estudio-08', 'amb-estilo-05', 'amb-corrida-13'],
    },
)

# ---------------------------------------------------------------- 9 · Leve
modelo(
    slug='leve', numero=9, nome='Leve',
    descricao='Minimalista e solar: cabeçalho transparente, título em minúsculas, muito branco e a foto mandando.',
    origem='Estrutura estudada na Arm Fitness (moda fitness lifestyle); fotos, textos, fontes e cores próprios',
    fontes=['Plus Jakarta Sans'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='tinta', superficie='#F4F3F1',
    layout={
        'topo': 'minimo', 'sobreposto': True, 'aviso': 'faixa', 'cartao': 'contorno', 'rodape': 'claro', 'titulos': 'centro',
        'faixa': 'simples', 'filtros': 'gaveta', 'galeria': 'grade', 'colunas': 3,
        'inicio': [
            {'tipo': 'hero', 'variante': 'tela'},
            {'tipo': 'categorias', 'variante': 'retratos', 'titulo': 'categorias', 'n': 4},
            {'tipo': 'banner', 'variante': 'padrao', 'cores': True, 'kicker': 'acabou de chegar', 'titulo': 'cores novas', 'texto': 'As cores da estação nos conjuntos e leggings da loja.', 'botao': 'Ver cores', 'link': 'cat:conjuntos'},
            {'tipo': 'vitrine', 'variante': 'grade', 'titulo': 'novidades', 'filtro': 'novos', 'n': 8, 'etiqueta': 'novo', 'verTodos': 'Ver tudo'},
            {'tipo': 'banner', 'variante': 'centro', 'foto': 'banner2', 'titulo': 'leve para onde for', 'texto': 'Do parque à praia, peças que acompanham o seu dia.', 'botao': 'Ver a coleção', 'link': 'todos'},
        ],
    },
    textos={
        'avisos': ['frete para todo o Brasil · 5% off no pix'],
        'hero': slides(
            ('coleção nova', 'sol, corpo\ne movimento.', 'peças leves para treinar ao ar livre.', 'Ver mais', 'cat:conjuntos'),
            ('para a praia', 'mar à vista.', 'tops e leggings que vão da corrida ao mergulho de fim de tarde.', 'Ver mais', 'cat:tops'),
            ('fim de tarde', 'devagar\ntambém conta.', 'macacões para alongar sem pressa.', 'Ver mais', 'cat:macacoes'),
        ),
    },
    fotos={
        'hero': ['amb-natureza-02', 'amb-corrida-10', 'amb-corrida-15'],
        'banner': 'amb-pilates-06', 'banner2': 'amb-natureza-04', 'colecao': 'amb-natureza-03', 'sobre': 'amb-yoga-11',
        'looks': ['amb-estilo-03', 'amb-estilo-04', 'amb-corrida-08'],
        'ig': ['amb-yoga-11', 'amb-corrida-09', 'amb-natureza-01', 'amb-estilo-04', 'amb-corrida-10', 'amb-yoga-10'],
    },
)

# ---------------------------------------------------------------- 10 · Nobre
modelo(
    slug='nobre', numero=10, nome='Nobre',
    descricao='Premium com dourado: logo serifado, busca grande, destaque com texto à direita, categorias em círculos.',
    origem='Estrutura estudada na Be Rich Moda Fitness; fotos, textos, fontes e cores próprios',
    fontes=['Cinzel', 'Mulish'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='preto', accent2='#A57D2C', suave='#F6F1E7',
    layout={
        'topo': 'busca', 'aviso': 'faixa', 'cartao': 'centro', 'rodape': 'escuro', 'titulos': 'centro',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'lado', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'banner', 'classe': 'direita', 'nav': 'setas'},
            {'tipo': 'beneficios', 'variante': 'centro'},
            {'tipo': 'categorias', 'variante': 'circulos', 'titulo': 'Compre por categoria', 'n': 6},
            {'tipo': 'vitrine', 'variante': 'grade', 'titulo': 'Força e presença', 'subtitulo': 'Escolha a categoria e veja as peças.', 'filtro': 'todos', 'abas': True, 'abaTodos': 'Lançamentos', 'n': 8, 'etiqueta': 'Lançamento'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Leggings', 'filtro': 'cat:leggings', 'n': 8},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Conjuntos', 'filtro': 'cat:conjuntos', 'n': 8},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Macacões', 'filtro': 'cats:macacoes,macaquinhos', 'n': 8},
        ],
    },
    textos={
        'avisos': ['Atendimento pelo WhatsApp · 5% de desconto no Pix · Troca em até 7 dias'],
        'hero': slides(
            ('Lançamentos', 'Coleção\nnobre', 'Peças de acabamento cuidadoso para treinar com presença.', 'Conheça', 'cat:conjuntos'),
            ('Leggings', 'Elegância\nem movimento', 'Caimento bonito do treino ao café.', 'Ver leggings', 'cat:leggings'),
            ('Macacões', 'Peça única,\nolhar atento', 'Uma peça só, look pronto para o dia.', 'Ver macacões', 'cat:macacoes'),
        ),
    },
    fotos={
        'hero': ['amb-natureza-04', 'amb-yoga-06', 'amb-yoga-03'],
        'colecao': 'amb-pilates-07', 'banner': 'amb-pilates-04', 'sobre': 'amb-pilates-05',
        'looks': ['amb-pilates-05', 'amb-pilates-10', 'amb-estudio-02'],
        'ig': ['amb-pilates-07', 'amb-pilates-05', 'amb-pilates-10', 'amb-estudio-02', 'amb-pilates-01', 'amb-yoga-06'],
    },
)

# ---------------------------------------------------------------- 11 · Ritmo
modelo(
    slug='ritmo', numero=11, nome='Ritmo',
    descricao='Esportiva e limpa: destaque com itálico grande, destaques da estação com botão preto, blocos de categoria e banner de cor.',
    origem='Estrutura estudada na Track&Field (moda esportiva); fotos, textos, fontes e cores próprios',
    fontes=['Exo 2'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='tinta',
    layout={
        'topo': 'classico', 'aviso': 'faixa', 'cartao': 'simples', 'rodape': 'claro', 'titulos': 'esquerda',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'baixo', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'tela'},
            {'tipo': 'categorias', 'variante': 'destaques', 'titulo': 'Destaques da estação', 'n': 3, 'botao': 'Ver mais', 'fotos': 'ambiente'},
            {'tipo': 'beneficios', 'variante': 'faixa'},
            {'tipo': 'duplo', 'variante': 'padrao', 'titulo': 'Tudo para o seu movimento', 'itens': [
                {'titulo': 'Tops e leggings', 'botao': 'Ver mais', 'link': 'cat:leggings'},
                {'titulo': 'Para treinar', 'botao': 'Ver mais', 'link': 'cat:conjuntos'},
            ]},
            {'tipo': 'banner', 'variante': 'cor', 'kicker': 'Verão', 'titulo': 'Cores para o calor', 'texto': 'Tons claros e peças leves para treinar nos dias quentes.', 'botao': 'Ver mais', 'link': 'cat:tops'},
            {'tipo': 'looks', 'titulo': 'Vista o look', 'subtitulo': 'A peça da foto, direto na sacola.'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Novidades', 'filtro': 'novos', 'n': 8},
        ],
    },
    textos={
        'avisos': ['Entrega para todo o Brasil | 5% de desconto no Pix'],
        'hero': slides(
            ('Verão', 'Novo ritmo', 'A coleção da estação para correr, pular e treinar ao ar livre.', 'Ver mais', 'cat:conjuntos'),
            ('Corrida', 'Mais leve', 'Tops e leggings para os seus quilômetros.', 'Ver mais', 'cat:leggings'),
            ('Ar livre', 'Sem limite', 'Macacões e conjuntos para o treino do dia.', 'Ver mais', 'cat:macacoes'),
        ),
    },
    fotos={
        'hero': ['amb-corrida-02', 'amb-corrida-13', 'amb-natureza-01'],
        'duplo': ['amb-corrida-06', 'amb-academia-04'], 'banner': 'amb-corrida-01',
        'usos': ['amb-corrida-03', 'amb-estilo-06', 'amb-corrida-11'],
        'colecao': 'amb-corrida-11', 'sobre': 'amb-corrida-04',
        'looks': ['amb-corrida-04', 'amb-corrida-09', 'amb-corrida-14'],
        'ig': ['amb-corrida-01', 'amb-corrida-06', 'amb-corrida-08', 'amb-estilo-05', 'amb-corrida-13', 'amb-natureza-03'],
    },
)

# ---------------------------------------------------------------- 12 · Contraste
modelo(
    slug='contraste', numero=12, nome='Contraste',
    descricao='Preto e branco com atitude: destaque dividido, itálico serifado com letra pesada e cartões em fundo cinza.',
    origem='Estrutura estudada na Divina Fitness / Atara (moda fitness feminina); fotos, textos, fontes e cores próprios',
    fontes=['Anton', 'DM Serif Display', 'Poppins'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='preto', superficie='#F1F1F1', suave='#F1F1F1',
    layout={
        'topo': 'classico', 'aviso': 'setas', 'cartao': 'simples', 'rodape': 'escuro', 'titulos': 'centro',
        'faixa': 'cor', 'filtros': 'lateral', 'galeria': 'grade', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'dividido'},
            {'tipo': 'beneficios', 'variante': 'faixa'},
            {'tipo': 'categorias', 'variante': 'procura', 'titulo': 'O que você está procurando?', 'n': 4, 'botao': 'Comprar'},
            {'tipo': 'duplo', 'variante': 'centro', 'itens': [
                {'kicker': 'Para se destacar', 'titulo': 'Conjuntos', 'botao': 'Ver peças', 'link': 'cat:conjuntos'},
                {'kicker': 'Para o dia a dia', 'titulo': 'Leggings', 'botao': 'Ver peças', 'link': 'cat:leggings'},
            ]},
            {'tipo': 'vitrine', 'variante': 'grade', 'titulo': 'Seleção da loja', 'filtro': 'todos', 'abas': True, 'abaTodos': 'Todas', 'n': 8, 'verTodos': 'Ver mais'},
            {'tipo': 'instagram', 'titulo': 'Siga a loja no Instagram'},
        ],
    },
    textos={
        'avisos': ['Troca fácil em até 7 dias', '5% de desconto no Pix', 'Entrega para todo o Brasil'],
        'hero': slides(
            ('a trilha do seu treino é', 'TODO PRETO', 'Peças básicas que combinam com tudo e com qualquer treino.', 'Conferir agora', 'cat:conjuntos'),
            ('do agachamento à corrida', 'SEM\nMEDO', 'Leggings que acompanham cada movimento.', 'Conferir agora', 'cat:leggings'),
            ('para quem gosta de detalhe', 'NOVO\nTOP', 'Tops para treinar e para usar por baixo da jaqueta.', 'Conferir agora', 'cat:tops'),
        ),
    },
    fotos={
        'hero': ['amb-estudio-03', 'amb-pb-06', 'amb-pb-08'],
        'duplo': ['amb-academia-13', 'amb-academia-03'],
        'colecao': 'amb-pb-03', 'banner': 'amb-pb-02', 'sobre': 'amb-pb-06',
        'looks': ['amb-pb-08', 'amb-academia-03', 'amb-estudio-03'],
        'ig': ['amb-pb-06', 'amb-academia-03', 'amb-pb-08', 'amb-academia-13', 'amb-estudio-03', 'amb-pb-07'],
    },
)

# ---------------------------------------------------------------- 13 · Studio
modelo(
    slug='studio', numero=13, nome='Studio',
    descricao='Marca de estúdio: vantagens no topo, destaque com setas em pílula, fotos em fundo bege e vitrines com título à esquerda.',
    origem='Estrutura estudada na LIVE! (moda esportiva); fotos, textos, fontes e cores próprios',
    fontes=['Schibsted Grotesk'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='tinta', suave='#EEE8DF',
    layout={
        'topo': 'classico', 'aviso': 'lista', 'cartao': 'simples', 'rodape': 'claro', 'titulos': 'esquerda',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'grade', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'tela', 'nav': 'setas'},
            {'tipo': 'categorias', 'variante': 'sobre', 'titulo': 'Categorias', 'n': 8},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Novidades', 'filtro': 'novos', 'n': 8},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Leggings', 'filtro': 'cat:leggings', 'n': 8},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Tops e conjuntos', 'filtro': 'cats:tops,conjuntos', 'n': 8},
            {'tipo': 'contato', 'titulo': 'Fale com a loja', 'foto': 'contato'},
        ],
    },
    textos={
        'avisos': ['Entrega para todo o Brasil', '5% de desconto no Pix', 'Troca em até 7 dias', 'Atendimento no WhatsApp'],
        'hero': slides(
            ('Estúdio', 'Feita para o seu treino', 'Peças confortáveis para academia, pilates e corrida.', 'Ver a coleção', 'cat:conjuntos'),
            ('Leggings', 'Cada movimento conta', 'Leggings para treinar do jeito que você gosta.', 'Ver leggings', 'cat:leggings'),
            ('Tops', 'Firmeza na medida', 'Tops para treino leve e de impacto.', 'Ver tops', 'cat:tops'),
        ),
    },
    fotos={
        'hero': ['amb-pilates-11', 'amb-academia-04', 'amb-academia-08'],
        'contato': 'amb-estudio-05', 'colecao': 'amb-pilates-05', 'banner': 'amb-estudio-02', 'sobre': 'amb-estudio-02',
        'looks': ['amb-estudio-02', 'amb-pilates-05', 'amb-estudio-05'],
        'ig': ['amb-estudio-02', 'amb-pilates-05', 'amb-estudio-05', 'amb-yoga-07', 'amb-pilates-04', 'amb-yoga-02'],
    },
)

# ---------------------------------------------------------------- 14 · Bloco
modelo(
    slug='bloco', numero=14, nome='Bloco',
    descricao='Campanha forte: cabeçalho preto, título condensado na cor da loja, faixa de vantagens colorida, fotos coladas e perguntas.',
    origem='Estrutura estudada na Lupo (moda esportiva e íntima); fotos, textos, fontes e cores próprios',
    fontes=['Bebas Neue', 'Figtree'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='preto', superficie='#F2F2F2', accent2='#F5C518',
    layout={
        'topo': 'minimo', 'aviso': 'faixa', 'cartao': 'simples', 'rodape': 'escuro', 'titulos': 'esquerda',
        'faixa': 'cor', 'filtros': 'lateral', 'galeria': 'lado', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'recorte'},
            {'tipo': 'beneficios', 'variante': 'destaque'},
            {'tipo': 'categorias', 'variante': 'blocos', 'classe': 'colado', 'titulo': 'Escolhas da loja', 'n': 3, 'botao': 'Comprar'},
            {'tipo': 'banner', 'variante': 'centro', 'classe': 'cinza', 'kicker': 'Treino sem pausa', 'titulo': 'Tudo para o seu treino', 'texto': 'Leggings, tops e conjuntos para todos os dias da semana.', 'botao': 'Ver a coleção', 'link': 'todos'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Novidades', 'filtro': 'novos', 'n': 8, 'verTodos': 'Ver tudo'},
            {'tipo': 'categorias', 'variante': 'mosaico', 'titulo': 'Compre por categoria', 'n': 4},
            {'tipo': 'faq', 'titulo': 'Dúvidas frequentes'},
        ],
    },
    textos={
        'avisos': ['Frete para todo o Brasil · 5% de desconto no Pix'],
        'hero': slides(
            ('Coleção nova', 'TREINO\nTODO DIA', 'Peças firmes e confortáveis para a semana inteira.', 'Comprar agora', 'cat:conjuntos'),
            ('Leggings', 'FIRME\nE LEVE', 'Leggings que seguram sem apertar.', 'Ver leggings', 'cat:leggings'),
            ('Tops', 'PRONTA\nPARA IR', 'Tops para treinar e para o dia.', 'Ver tops', 'cat:tops'),
        ),
    },
    fotos={
        'hero': ['amb-pilates-09', 'amb-corrida-14', 'amb-corrida-08'],
        'banner': 'amb-pb-05', 'colecao': 'amb-pb-02', 'sobre': 'amb-academia-09',
        'looks': ['amb-academia-09', 'amb-corrida-08', 'amb-pilates-09'],
        'ig': ['amb-academia-09', 'amb-corrida-08', 'amb-academia-07', 'amb-corrida-14', 'amb-pb-08', 'amb-academia-04'],
    },
)

# ---------------------------------------------------------------- 15 · Foco
modelo(
    slug='foco', numero=15, nome='Foco',
    descricao='Logo em bloco de cor, título com letras espaçadas sobre foto de estúdio, linha de usos e vitrine ao lado de foto.',
    origem='Estrutura estudada na Body For Sure (moda fitness); fotos, textos, fontes e cores próprios',
    fontes=['Lexend'], esquema='claro', fundo='#FFFFFF', tinge=0.0, deep='preto', suave='#EEF0F2',
    layout={
        'topo': 'classico', 'aviso': 'faixa', 'cartao': 'simples', 'rodape': 'claro', 'titulos': 'esquerda',
        'faixa': 'simples', 'filtros': 'lateral', 'galeria': 'lado', 'colunas': 4,
        'inicio': [
            {'tipo': 'hero', 'variante': 'dividido', 'classe': 'estudio'},
            {'tipo': 'beneficios', 'variante': 'faixa'},
            {'tipo': 'vitrine', 'variante': 'carrossel', 'titulo': 'Novidades', 'filtro': 'novos', 'n': 8},
            {'tipo': 'usos', 'titulo': 'Para cada momento', 'itens': [
                {'nome': 'Dia a dia', 'link': 'cat:conjuntos'}, {'nome': 'Pilates', 'link': 'cat:macaquinhos'},
                {'nome': 'Corrida', 'link': 'cat:tops'}, {'nome': 'Treino', 'link': 'cat:leggings'},
            ]},
            {'tipo': 'vitrine', 'variante': 'dividida', 'titulo': 'Para treinar já', 'filtro': 'roupas', 'n': 8, 'foto': 'vit',
             'fotoTitulo': 'LEGGINGS', 'fotoTexto': 'Para treino, corrida e dia a dia.'},
            {'tipo': 'contato', 'titulo': 'Fale com a gente', 'foto': 'contato', 'texto': 'Tire dúvidas de tamanho, peça fotos e combine a entrega pelo WhatsApp.'},
        ],
    },
    textos={
        'avisos': ['ENTREGA PARA TODO O BRASIL · 5% OFF NO PIX'],
        'hero': slides(
            ('Coleção nova', 'NOVO', 'Cores de estúdio para treinar com foco.', 'Confira', 'cat:conjuntos'),
            ('Leggings', 'FOCO', 'Leggings para todos os treinos da semana.', 'Confira', 'cat:leggings'),
            ('Tops', 'COR', 'Tops em tons que combinam entre si.', 'Confira', 'cat:tops'),
        ),
    },
    fotos={
        'hero': ['amb-estudio-01', 'amb-estudio-08', 'amb-estudio-07'],
        'usos': ['amb-estilo-05', 'amb-pilates-10', 'amb-corrida-06', 'amb-academia-09'],
        'vit': 'amb-estilo-04', 'contato': 'amb-pb-07', 'colecao': 'amb-estudio-03', 'banner': 'amb-estudio-01', 'sobre': 'amb-estudio-01',
        'looks': ['amb-estudio-01', 'amb-estudio-08', 'amb-estilo-04'],
        'ig': ['amb-estudio-01', 'amb-estudio-08', 'amb-estudio-07', 'amb-estilo-04', 'amb-pilates-10', 'amb-estilo-05'],
    },
)


def gerar():
    m = json.loads(ARQ.read_text(encoding='utf-8'))
    arena = [x for x in m['modelos'] if x['slug'] == 'arena'][0]['cores']
    antigos = [x for x in m['modelos'] if x.get('pasta') != 'vitrines/_modelos/_base']
    novos = []
    for d in MODELOS:
        cores = paleta_modelo(arena, esquema=d.get('esquema', 'claro'), fundo=d.get('fundo', '#FFFFFF'), tinge=d.get('tinge', 0.02), deep=d.get('deep', 'tinta'), superficie=d.get('superficie'))
        for slug, c in cores.items():
            if d.get('suave'):
                c['soft'] = misturar(d['suave'], c['accent'], 0.035)
            if d.get('accent2'):
                c['accent2'] = d['accent2']
        for slug, extra in (d.get('ajustes') or {}).items():
            cores[slug].update(extra)
        fotos = d.get('fotos') or {}
        for lugar, nomes in fotos.items():
            for nome in (nomes if isinstance(nomes, list) else [nomes]):
                if not (RAIZ / 'vitrines/_fotos' / (nome + '.jpg')).exists():
                    print('aviso: foto que ainda não está no repositório:', d['slug'], lugar, nome)
        capa = (fotos.get('hero') or ['arena-hero-1'])[0]
        novos.append({
            'slug': d['slug'], 'numero': d['numero'], 'nome': d['nome'], 'prefixo': d['slug'] + '-', 'dados': 'props',
            'pasta': 'vitrines/_modelos/_base', 'script': 'vitrines/_modelos/_base/kit.js',
            'estilos': ['vitrines/_modelos/_base/base.css', 'vitrines/_modelos/%s/%s.css' % (d['slug'], d['slug'])],
            'paginas': ['Main', 'Colecao', 'Produto', 'Sacola'],
            'descricao': d['descricao'], 'origem': d['origem'], 'foto': 'vitrines/_fotos/%s.jpg' % capa, 'fontes': d['fontes'],
            'layout': d['layout'], 'textos': d.get('textos') or {}, 'fotos': fotos, 'cores': cores,
        })
    m['modelos'] = antigos + sorted(novos, key=lambda x: x['numero'])
    ARQ.write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('modelos.json:', ', '.join('%d %s' % (x.get('numero', 0), x['nome']) for x in m['modelos']))


if __name__ == '__main__':
    gerar()
