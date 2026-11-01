# Fontes das telas da Arena. Cada <Tela>.src.html tem marcas que este script troca pelas partes comuns:
#   <!--TOPO-->  faixa de avisos, cabeçalho, busca e menu do celular
#   <!--RODAPE--> rodapé com contatos da loja e o aviso (toast) da sacola; <!--EXTRA-->...<!--/EXTRA--> entra no topo do rodapé
#   <!--CARD-->  cartão de produto usado nas grades
# Editar sempre aqui (não nos .dc.html gerados) e rodar, na raiz do repositório:
#   python3 tools/prebuild/fontes/arena/partes.py
# Gera vitrines/_modelos/arena/<Tela>.dc.html. Para um modelo novo, copiar esta pasta e trocar as partes.
import sys, pathlib, re

LUPA = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M20 20l-4.2-4.2"></path></svg>'
SACOLA = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>'
AVISOS = '<span>Entrega para todo o Brasil</span><span>Troca fácil em até 7 dias</span><span>Pix com desconto</span><span>Compre também pelo WhatsApp</span>'

TOPO = f'''<div class="tick" aria-label="Avisos da loja">
<div class="tick-in">
{AVISOS}
{AVISOS}
</div>
</div>

<header class="top">
<div class="wrap top-in">
<button class="ibtn so-cel" type="button" aria-label="Abrir menu" aria-expanded="{{{{menuAberto}}}}" onClick="{{{{abrirMenu}}}}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"></path></svg></button>
<a class="logo" href="Main.dc.html" aria-label="@@MARCA@@, página inicial"><i aria-hidden="true"></i>@@MARCA@@</a>
<nav class="nav" aria-label="Principal">
<a class="{{{{on.inicio}}}}" href="Main.dc.html">Início</a>
<a class="{{{{on.colecao}}}}" href="Colecao.dc.html">Coleção</a>
<a href="Colecao.dc.html?cat=conjuntos">Conjuntos</a>
<a href="Colecao.dc.html?cat=acessorios">Acessórios</a>
<a href="Main.dc.html#sobre">Sobre</a>
</nav>
<form class="busca" role="search" onSubmit="{{{{buscar}}}}"><label class="sr" for="busca-d">Buscar na loja</label><input id="busca-d" type="search" placeholder="Buscar peças" value="{{{{termo}}}}" onChange="{{{{digitar}}}}"><button type="submit" aria-label="Buscar">{LUPA}</button></form>
<div class="acoes">
<button class="ibtn so-cel" type="button" aria-label="Buscar" aria-expanded="{{{{buscaAberta}}}}" onClick="{{{{abrirBusca}}}}">{LUPA}</button>
<a class="ibtn" href="Sacola.dc.html" aria-label="{{{{sacolaRotulo}}}}">{SACOLA}<sc-if value="{{{{temSacola}}}}" hint-placeholder-val="{{{{false}}}}"><span class="count">{{{{sacolaN}}}}</span></sc-if></a>
</div>
</div>
<div class="{{{{buscaCls}}}}"><div class="wrap"><form class="busca" role="search" onSubmit="{{{{buscar}}}}"><label class="sr" for="busca-c">Buscar na loja</label><input id="busca-c" type="search" placeholder="Buscar peças" value="{{{{termo}}}}" onChange="{{{{digitar}}}}"><button type="submit" aria-label="Buscar">{LUPA}</button></form></div></div>
<nav class="{{{{menuCls}}}}" aria-label="Menu da loja"><div class="wrap"><ul>
<li><a class="{{{{on.inicio}}}}" href="Main.dc.html">Início</a></li>
<li><a class="{{{{on.colecao}}}}" href="Colecao.dc.html">Coleção</a></li>
<li><a href="Colecao.dc.html?cat=conjuntos">Conjuntos</a></li>
<li><a href="Colecao.dc.html?cat=leggings">Leggings</a></li>
<li><a href="Colecao.dc.html?cat=tops">Tops</a></li>
<li><a href="Colecao.dc.html?cat=acessorios">Acessórios</a></li>
<li><a href="Sacola.dc.html">Sacola</a></li>
</ul></div></nav>
</header>'''

RODAPE = '''<footer class="rod">
<div class="wrap">
<!--RODAPE_EXTRA-->
<div class="cols">
<div><a class="logo" href="Main.dc.html"><i aria-hidden="true"></i>@@MARCA@@</a><p>Moda fitness para treinar pesado e viver leve. @@CIDADE@@</p></div>
<div><h3>Loja</h3><ul><li><a href="Colecao.dc.html">Coleção</a></li><li><a href="Colecao.dc.html?cat=conjuntos">Conjuntos</a></li><li><a href="Colecao.dc.html?cat=leggings">Leggings</a></li><li><a href="Colecao.dc.html?cat=acessorios">Acessórios</a></li></ul></div>
<div><h3>Ajuda</h3><ul><li><a href="Sacola.dc.html">Sua sacola</a></li><li>Troca em até 7 dias</li><li>Entrega para todo o Brasil</li><li>Pix, cartão ou boleto</li></ul></div>
<div><h3>Contato</h3><ul>
<sc-if value="{{temZap}}" hint-placeholder-val="{{false}}"><li><a href="{{zap}}" target="_blank" rel="noopener">WhatsApp {{whatsTxt}}</a></li></sc-if>
<sc-if value="{{temIg}}" hint-placeholder-val="{{false}}"><li><a href="{{igLink}}" target="_blank" rel="noopener">Instagram {{igTxt}}</a></li></sc-if>
<li>@@CIDADE@@</li></ul></div>
</div>
<div class="base"><span>© {{ano}} @@NOME@@</span><span>Pix · Cartão · Boleto</span></div>
</div>
</footer>

<sc-if value="{{temAviso}}" hint-placeholder-val="{{false}}">
<div class="toast" role="status"><span>{{aviso}}</span><a href="Sacola.dc.html">Ver sacola</a><button type="button" aria-label="Fechar aviso" onClick="{{fecharAviso}}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></div>
</sc-if>'''

AQUI = pathlib.Path(__file__).resolve().parent
SAIDA_PADRAO = AQUI.parents[3] / 'vitrines' / '_modelos' / AQUI.name


def montar(pasta=AQUI, saida=SAIDA_PADRAO):
    saida = pathlib.Path(saida)
    for f in sorted(pathlib.Path(pasta).glob('*.src.html')):
        s = f.read_text(encoding='utf-8')
        extra = ''
        m = re.search(r'<!--EXTRA-->([\s\S]*?)<!--/EXTRA-->', s)
        if m:
            extra = m.group(1).strip('\n'); s = s.replace(m.group(0), '')
        s = s.replace('<!--CARD-->', CARD).replace('<!--TOPO-->', TOPO).replace('<!--RODAPE-->', RODAPE.replace('<!--RODAPE_EXTRA-->', extra))
        s = s.replace('\n\n\n', '\n\n')
        out = saida / f.name.replace('.src.html', '.dc.html')
        out.write_text(s, encoding='utf-8')
        print(out, len(s))

CORACAO = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"></path></svg>'
CARD = f'''<article class="card">
<div class="card-media">
<a class="card-img" href="Produto.dc.html?item={{{{p.id}}}}" aria-label="Ver {{{{p.nome}}}}"><img src="{{{{p.img}}}}" alt="{{{{p.alt}}}}" loading="lazy"></a>
<sc-if value="{{{{p.novo}}}}" hint-placeholder-val="{{{{false}}}}"><span class="selo">Novo</span></sc-if>
<button class="{{{{p.favCls}}}}" type="button" aria-label="{{{{p.favRotulo}}}}" aria-pressed="{{{{p.fav}}}}" onClick="{{{{p.favoritar}}}}">{CORACAO}</button>
<sc-if value="{{{{p.rapido}}}}" hint-placeholder-val="{{{{false}}}}"><button class="add" type="button" onClick="{{{{p.adicionar}}}}">{SACOLA}Adicionar à sacola</button></sc-if>
<sc-if value="{{{{p.escolher}}}}" hint-placeholder-val="{{{{true}}}}"><a class="add" href="Produto.dc.html?item={{{{p.id}}}}">Escolher tamanho</a></sc-if>
</div>
<span class="card-cat">{{{{p.cat}}}}</span>
<h3><a href="Produto.dc.html?item={{{{p.id}}}}">{{{{p.nome}}}}</a></h3>
<div class="preco"><b>{{{{p.preco}}}}</b><span>{{{{p.pix}}}} no Pix</span></div>
<div class="cores" aria-label="{{{{p.coresTxt}}}}"><sc-for list="{{{{p.cores}}}}" as="k" hint-placeholder-count="1"><span class="cor" style="background: {{{{k}}}}"></span></sc-for></div>
</article>'''

if __name__ == '__main__':
    montar(*(sys.argv[1:3]))
