# Fontes das telas do motor comum (_base), usadas pelos modelos 3 em diante.
# Cada <Tela>.src.html tem marcas que este script troca pelas partes comuns:
#   <!--TOPO-->   faixa de avisos, cabeçalho (as variantes mudam só no CSS), busca e menu do celular
#   <!--RODAPE--> rodapé, aviso da sacola (toast) e botão flutuante do WhatsApp
#   <!--CARD-->   cartão de produto usado nas grades e carrosséis
# Editar sempre aqui (não nos .dc.html gerados) e rodar, na raiz do repositório:
#   python3 tools/prebuild/fontes/_base/partes.py
# Gera vitrines/_modelos/_base/<Tela>.dc.html.
import sys, pathlib, re

def ic(d, cls='ic'):
    return '<svg class="%s" viewBox="0 0 24 24" aria-hidden="true"><path d="%s"></path></svg>' % (cls, d)

LUPA = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M20 20l-4.2-4.2"></path></svg>'
SACOLA = ic('M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2')
CORACAO = ic('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z')
MENU = ic('M4 7h16M4 12h16M4 17h10')
ESQ = ic('M15 6l-6 6 6 6')
DIR = ic('M9 6l6 6-6 6')
SETA = ic('M5 12h14M13 6l6 6-6 6')
WHATS = ic('M4.5 19.5l1.2-3.9A8 8 0 1 1 8.6 18.4zM9.2 9.3c.3 2.3 2.2 4.3 4.6 4.8l1.2-1.1 1.8.9-.4 1.6c-3.6.2-7-3.1-7-6.8l1.6-.4.8 1.8z')

BUSCA = lambda i: f'''<form class="busca" role="search" onSubmit="{{{{buscar}}}}"><label class="sr" for="busca-{i}">Buscar na loja</label><input id="busca-{i}" type="search" placeholder="Buscar peças" value="{{{{termo}}}}" onChange="{{{{digitar}}}}"><button type="submit" aria-label="Buscar">{LUPA}</button></form>'''

TOPO = f'''<sc-if value="{{{{temAvisos}}}}" hint-placeholder-val="{{{{true}}}}">
<div class="avisos" aria-label="Avisos da loja">
<div class="wrap avisos-in">
<sc-if value="{{{{variosAvisos}}}}" hint-placeholder-val="{{{{true}}}}"><button class="aviso-seta" type="button" aria-label="Aviso anterior" onClick="{{{{avisoAntes}}}}">{ESQ}</button></sc-if>
<p class="aviso-um">{{{{aviso1}}}}</p>
<div class="aviso-todos"><sc-for list="{{{{avisos}}}}" as="a" hint-placeholder-count="4"><span>{{{{a}}}}</span></sc-for></div>
<div class="aviso-corre" aria-hidden="true"><div><sc-for list="{{{{avisos}}}}" as="a" hint-placeholder-count="4"><span>{{{{a}}}}</span></sc-for><sc-for list="{{{{avisos}}}}" as="a" hint-placeholder-count="4"><span>{{{{a}}}}</span></sc-for></div></div>
<sc-if value="{{{{variosAvisos}}}}" hint-placeholder-val="{{{{true}}}}"><button class="aviso-seta" type="button" aria-label="Próximo aviso" onClick="{{{{avisoDepois}}}}">{DIR}</button></sc-if>
</div>
</div>
</sc-if>

<header class="top">
<div class="wrap top-in">
<button class="ibtn hamb" type="button" aria-label="Abrir menu" aria-expanded="{{{{menuAberto}}}}" onClick="{{{{abrirMenu}}}}">{MENU}</button>
<a class="logo" href="Main.dc.html" aria-label="@@MARCA@@, página inicial"><i aria-hidden="true">@@INICIAIS@@</i><span>@@MARCA@@</span></a>
<nav class="nav" aria-label="Principal">
<a class="{{{{on.colecao}}}}" href="Colecao.dc.html">Coleção</a>
<sc-for list="{{{{nav}}}}" as="n" hint-placeholder-count="5"><a class="{{{{n.cls}}}}" href="Colecao.dc.html?cat={{{{n.id}}}}">{{{{n.nome}}}}</a></sc-for>
</nav>
<div class="busca-d">{BUSCA('d')}</div>
<div class="acoes">
<button class="ibtn busca-ico" type="button" aria-label="Buscar" aria-expanded="{{{{buscaAberta}}}}" onClick="{{{{abrirBusca}}}}">{LUPA}</button>
<a class="ibtn sacola-ico" href="Sacola.dc.html" aria-label="{{{{sacolaRotulo}}}}">{SACOLA}<sc-if value="{{{{temSacola}}}}" hint-placeholder-val="{{{{false}}}}"><span class="count">{{{{sacolaN}}}}</span></sc-if></a>
</div>
</div>
<nav class="nav2" aria-label="Categorias"><div class="wrap nav2-in">
<a href="Colecao.dc.html">Todas as peças</a>
<sc-for list="{{{{nav}}}}" as="n" hint-placeholder-count="5"><a class="{{{{n.cls}}}}" href="Colecao.dc.html?cat={{{{n.id}}}}">{{{{n.nome}}}}</a></sc-for>
</div></nav>
<div class="{{{{buscaCls}}}}"><div class="wrap">{BUSCA('c')}</div></div>
<nav class="{{{{menuCls}}}}" aria-label="Menu da loja"><div class="wrap"><ul>
<li><a class="{{{{on.inicio}}}}" href="Main.dc.html">Início</a></li>
<li><a class="{{{{on.colecao}}}}" href="Colecao.dc.html">Todas as peças</a></li>
<sc-for list="{{{{nav}}}}" as="n" hint-placeholder-count="5"><li><a href="Colecao.dc.html?cat={{{{n.id}}}}">{{{{n.nome}}}}</a></li></sc-for>
<li><a href="Sacola.dc.html">Sacola</a></li>
</ul></div></nav>
</header>'''

RODAPE = f'''<footer class="rod">
<div class="wrap">
<!--RODAPE_EXTRA-->
<div class="cols">
<div class="rod-marca"><a class="logo" href="Main.dc.html"><i aria-hidden="true">@@INICIAIS@@</i><span>@@MARCA@@</span></a><p>Moda fitness para treinar e para o dia a dia. @@CIDADE@@</p></div>
<div><h3>Loja</h3><ul><li><a href="Colecao.dc.html">Todas as peças</a></li><sc-for list="{{{{nav}}}}" as="n" hint-placeholder-count="4"><li><a href="Colecao.dc.html?cat={{{{n.id}}}}">{{{{n.nome}}}}</a></li></sc-for></ul></div>
<div><h3>Ajuda</h3><ul><li><a href="Sacola.dc.html">Sua sacola</a></li><li>Troca em até 7 dias</li><li>Entrega para todo o Brasil</li><li>Pix, cartão ou boleto</li></ul></div>
<div><h3>Contato</h3><ul>
<sc-if value="{{{{temZap}}}}" hint-placeholder-val="{{{{false}}}}"><li><a href="{{{{zap}}}}" target="_blank" rel="noopener">WhatsApp {{{{whatsTxt}}}}</a></li></sc-if>
<sc-if value="{{{{temIg}}}}" hint-placeholder-val="{{{{false}}}}"><li><a href="{{{{igLink}}}}" target="_blank" rel="noopener">Instagram {{{{igTxt}}}}</a></li></sc-if>
<li>@@CIDADE@@</li></ul></div>
</div>
<div class="base"><span>© {{{{ano}}}} @@NOME@@</span><span>Pix · Cartão · Boleto</span></div>
</div>
</footer>

<sc-if value="{{{{temZap}}}}" hint-placeholder-val="{{{{false}}}}"><a class="zap-flut" href="{{{{zap}}}}" target="_blank" rel="noopener" aria-label="Falar com a loja no WhatsApp">{WHATS}</a></sc-if>

<sc-if value="{{{{temAviso}}}}" hint-placeholder-val="{{{{false}}}}">
<div class="toast" role="status"><span>{{{{aviso}}}}</span><a href="Sacola.dc.html">Ver sacola</a><button type="button" aria-label="Fechar aviso" onClick="{{{{fecharAviso}}}}">{ic('M6 6l12 12M18 6L6 18')}</button></div>
</sc-if>'''

CARD = f'''<article class="card">
<div class="card-media">
<a class="card-img" href="Produto.dc.html?item={{{{p.id}}}}" aria-label="Ver {{{{p.nome}}}}"><img src="{{{{p.img}}}}" alt="{{{{p.alt}}}}" loading="lazy"><sc-if value="{{{{p.temImg2}}}}" hint-placeholder-val="{{{{false}}}}"><img class="img2" src="{{{{p.img2}}}}" alt="" loading="lazy"></sc-if></a>
<sc-if value="{{{{p.temEtiqueta}}}}" hint-placeholder-val="{{{{false}}}}"><span class="selo">{{{{p.etiqueta}}}}</span></sc-if>
<button class="{{{{p.favCls}}}}" type="button" aria-label="{{{{p.favRotulo}}}}" aria-pressed="{{{{p.fav}}}}" onClick="{{{{p.favoritar}}}}">{CORACAO}</button>
<sc-if value="{{{{p.rapido}}}}" hint-placeholder-val="{{{{false}}}}"><button class="add" type="button" onClick="{{{{p.adicionar}}}}">{SACOLA}<span>Adicionar à sacola</span></button></sc-if>
<sc-if value="{{{{p.escolher}}}}" hint-placeholder-val="{{{{true}}}}"><a class="add" href="Produto.dc.html?item={{{{p.id}}}}">{SACOLA}<span>Escolher tamanho</span></a></sc-if>
</div>
<div class="card-info">
<span class="card-cat">{{{{p.cat}}}}</span>
<h3><a href="Produto.dc.html?item={{{{p.id}}}}">{{{{p.nome}}}}</a></h3>
<div class="preco"><b>{{{{p.preco}}}}</b><span class="pix">{{{{p.pix}}}} no Pix</span></div>
<div class="cores" aria-label="{{{{p.coresTxt}}}}"><sc-for list="{{{{p.cores}}}}" as="k" hint-placeholder-count="1"><span class="cor" style="background: {{{{k}}}}"></span></sc-for><span class="mais-cores">{{{{p.maisCores}}}}</span></div>
<div class="card-tams" aria-label="Tamanhos"><sc-for list="{{{{p.tams}}}}" as="t" hint-placeholder-count="4"><span>{{{{t}}}}</span></sc-for></div>
<a class="card-btn" href="Produto.dc.html?item={{{{p.id}}}}">Comprar</a>
</div>
</article>'''

AQUI = pathlib.Path(__file__).resolve().parent
SAIDA_PADRAO = AQUI.parents[3] / 'vitrines' / '_modelos' / AQUI.name


def montar(pasta=AQUI, saida=SAIDA_PADRAO):
    saida = pathlib.Path(saida)
    saida.mkdir(parents=True, exist_ok=True)
    for f in sorted(pathlib.Path(pasta).glob('*.src.html')):
        s = f.read_text(encoding='utf-8')
        extra = ''
        m = re.search(r'<!--EXTRA-->([\s\S]*?)<!--/EXTRA-->', s)
        if m:
            extra = m.group(1).strip('\n'); s = s.replace(m.group(0), '')
        s = s.replace('<!--CARD-->', CARD).replace('<!--TOPO-->', TOPO).replace('<!--RODAPE-->', RODAPE.replace('<!--RODAPE_EXTRA-->', extra))
        for nome, val in (('ESQ', ESQ), ('DIR', DIR), ('SETA', SETA), ('SACOLA', SACOLA), ('CORACAO', CORACAO), ('WHATS', WHATS)):
            s = s.replace('<!--IC_' + nome + '-->', val)
        s = s.replace('\n\n\n', '\n\n')
        out = saida / f.name.replace('.src.html', '.dc.html')
        out.write_text(s, encoding='utf-8')
        print(out, len(s))


if __name__ == '__main__':
    montar(*(sys.argv[1:3]))
