/*
 * canais.js — o catálogo da loja nos canais de venda.
 *  - Meta (Instagram, catálogo do WhatsApp Business e anúncios de catálogo): planilha CSV;
 *  - Google Shopping (Merchant Center): arquivo TSV;
 *  - Shopee, Shein, TikTok Shop e outros pelos hubs: planilha do Bling (CSV com ;) e planilha .xlsx para o UpSeller e outros.
 * Roda no painel da loja (navegador) e no workflow que publica os arquivos (Node), com o mesmo código.
 * Uma linha por peça × tamanho. O código de cada linha é o mesmo da etiqueta (SKU-TAM), então
 * o leitor do balcão, o Bling, a Shopee e a Meta falam do mesmo produto.
 */
(function (root, fabrica) {
  'use strict';
  var C = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = C;
  else root.Canais = C;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SITE = 'https://natanaelinvotec.github.io/provador/';
  var NOME_CAT = { conjuntos: 'Conjuntos', leggings: 'Leggings', tops: 'Tops', macacoes: 'Macacões', macaquinhos: 'Macaquinhos', acessorios: 'Acessórios' };
  var ORDEM_TAM = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'U'];
  // categorias do Google (a Meta aceita as mesmas): o número é o que vai no arquivo
  var CATEGORIAS = [
    ['5322', 'Roupas esportivas'],
    ['1604', 'Roupas'],
    ['167', 'Acessórios de roupa'],
    ['166', 'Vestuário e acessórios']
  ];
  var GENEROS = [['female', 'Feminino'], ['male', 'Masculino'], ['unisex', 'Unissex']];
  var IDADES = [['adult', 'Adulto'], ['teen', 'Adolescente'], ['kids', 'Infantil']];
  var PADRAO = { ativo: false, marca: '', genero: 'female', idade: 'adult', catRoupas: '5322', catAcess: '167', pesoG: 300, comprimentoCm: 28, larguraCm: 20, alturaCm: 4, ncm: '' };
  var ARQUIVOS = { meta: 'meta.csv', google: 'google.tsv', bling: 'bling.csv', planilha: 'planilha.xlsx', status: 'status.json' };

  /* ---------- utilidades ---------- */
  function texto(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200); }
  function inteiro(v, min, max, padrao) { var n = Math.round(Number(v)); return isFinite(n) && n >= min && n <= max ? n : padrao; }
  function slug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function minus(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }
  // mesmo critério da etiqueta e do leitor do balcão (shared/gestao.js)
  function sku(item) { return item.sku || String(item.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6) || 'PECA'; }
  function codigo(item, tam) { return sku(item) + '-' + tam; }
  // mesmo agrupamento da vitrine (shared/catalogo.js e assets/js/vitrine-extras.js): cada cor é uma variação da peça
  function grupoId(i) { return slug(i.cat + '-' + i.nome) || String(i.id || ''); }
  function codigoGrupo(g) { return g.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40) || 'PECA'; }
  function nomeTam(t) { return t === 'U' ? 'Único' : t; }
  function preco2(v) { return (Math.round(Number(v) * 100) / 100).toFixed(2); }
  function precoBR(v) { return preco2(v).replace('.', ','); }
  function ncmBonito(d) { d = String(d || '').replace(/\D/g, ''); return d.length === 8 ? d.slice(0, 4) + '.' + d.slice(4, 6) + '.' + d.slice(6) : ''; }

  /** Hora local 'AAAA-MM-DDTHH:MM' (no fuso da loja quando o fuso vem; senão o do aparelho). */
  function agoraLocal(fuso, d) {
    d = d || new Date();
    if (fuso) {
      try {
        var s = new Intl.DateTimeFormat('sv-SE', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return s.replace(' ', 'T');
      } catch (e) { /* fuso desconhecido: usa o do aparelho */ }
    }
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /** Configuração dos canais, conferida (a mesma conferência das regras do Firestore). */
  function limparCfg(c) {
    c = c || {};
    var cat = function (v, p) { v = String(v || ''); return CATEGORIAS.some(function (x) { return x[0] === v; }) ? v : p; };
    var lista = function (v, l, p) { return l.some(function (x) { return x[0] === v; }) ? v : p; };
    var ncm = String(c.ncm || '').replace(/\D/g, '');
    return {
      ativo: c.ativo === true,
      marca: texto(c.marca, 80),
      genero: lista(c.genero, GENEROS, PADRAO.genero),
      idade: lista(c.idade, IDADES, PADRAO.idade),
      catRoupas: cat(c.catRoupas, PADRAO.catRoupas),
      catAcess: cat(c.catAcess, PADRAO.catAcess),
      pesoG: inteiro(c.pesoG, 10, 30000, PADRAO.pesoG),
      comprimentoCm: inteiro(c.comprimentoCm, 1, 200, PADRAO.comprimentoCm),
      larguraCm: inteiro(c.larguraCm, 1, 200, PADRAO.larguraCm),
      alturaCm: inteiro(c.alturaCm, 1, 200, PADRAO.alturaCm),
      ncm: ncm.length === 8 ? ncm : ''
    };
  }
  function marcaDaLoja(loja) { return texto((loja.marca && (loja.marca.NOME || loja.marca.MARCA)) || loja.nome || loja.slug || 'Minha loja', 80); }

  /* ---------- endereços ---------- */
  function siteBase(o) { return String((o && o.site) || SITE).replace(/\/?$/, '/'); }
  function pastaCanais(o) { return String((o && o.canaisBase) || siteBase(o) + 'canais/').replace(/\/?$/, '/'); }
  function pastaDaLoja(slugLoja, o) { return pastaCanais(o) + encodeURIComponent(slugLoja || '') + '/'; }
  function enderecos(slugLoja, o) {
    var b = pastaDaLoja(slugLoja, o), r = {};
    Object.keys(ARQUIVOS).forEach(function (k) { r[k] = b + ARQUIVOS[k]; });
    return r;
  }
  function dominioValido(d) { d = String(d || '').trim().toLowerCase(); return /^(?=.{4,120}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d) ? d : ''; }
  function linkProduto(loja, grupo, o) {
    var d = dominioValido(loja.dominio);
    if (d) return 'https://' + d + '/?p=produto&item=' + encodeURIComponent(grupo);
    return siteBase(o) + 'vitrine.html?l=' + encodeURIComponent(loja.slug || '') + '&p=produto&item=' + encodeURIComponent(grupo);
  }
  function extensao(dataUrl) {
    var m = /^data:image\/(jpeg|jpg|png|webp)[;,]/i.exec(String(dataUrl || ''));
    return m ? ({ jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp' })[m[1].toLowerCase()] : '';
  }
  function arquivoFoto(item, n, dataUrl) { return String(item.id || 'peca').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60) + '-' + n + '.' + (extensao(dataUrl) || 'jpg'); }
  /** Endereço público da foto: as fotos guardadas no banco (data:) são publicadas pelo workflow em canais/{slug}/img/. */
  function urlFoto(loja, item, campo, n, o) {
    var v = String(item[campo] || '');
    if (!v) return '';
    if (/^https:\/\//i.test(v)) return v;
    if (/^data:image\//i.test(v)) return extensao(v) ? pastaDaLoja(loja.slug, o) + 'img/' + arquivoFoto(item, n, v) : '';
    if (/^(blob:|http:|data:)/i.test(v)) return '';
    return siteBase(o) + v.replace(/^\.?\//, '');
  }
  /** Lista das fotos que o workflow precisa gravar: [{ arquivo, dataUrl }]. */
  function fotosParaPublicar(itens) {
    var out = [];
    (itens || []).forEach(function (i) {
      [['img', 1], ['img2', 2]].forEach(function (c) {
        var v = String(i[c[0]] || '');
        if (/^data:image\//i.test(v) && extensao(v)) out.push({ arquivo: arquivoFoto(i, c[1], v), dataUrl: v, itemId: String(i.id || '') });
      });
    });
    return out;
  }

  /* ---------- linhas do catálogo ---------- */
  function ordenarTams(l) { return l.slice().sort(function (a, b) { return ORDEM_TAM.indexOf(a) - ORDEM_TAM.indexOf(b); }); }
  function tamanhosDe(i) {
    var t = Array.isArray(i.tamanhos) ? i.tamanhos.filter(function (x) { return /^[A-Z]{1,3}$/.test(String(x)); }) : [];
    return t.length ? ordenarTams(t) : ['U'];
  }
  function descricaoDe(i, marca) {
    var d = texto(i.descricao, 5000);
    if (d.length >= 20) return d;
    var tams = tamanhosDe(i).map(nomeTam), cor = i.cor ? ' na cor ' + minus(i.cor) : '';
    var base = texto(i.nome, 80) + cor + ', da loja ' + marca + '.';
    if (i.cat !== 'acessorios') base += ' Tamanhos: ' + tams.join(', ') + '.';
    return d ? d + ' ' + base : base + ' Moda fitness com envio para todo o Brasil.';
  }
  /** Peças que entram nos canais agora (com foto, preço, categoria e fora do lançamento VIP). */
  function entra(i, agora) {
    return !!(i && i.img && NOME_CAT[i.cat] && Number(i.preco) > 0 && !(i.vipAte && String(i.vipAte) > agora));
  }
  /**
   * Linhas do catálogo: uma por peça × tamanho.
   * @param loja   { slug, dominio, nome | marca } (a loja do painel ou o documento público da loja)
   * @param itens  peças de catalogos/{lojaId}/itens
   * @param o      { cfg, agora, fuso, site, canaisBase }
   */
  function porOrdem(itens) { return (itens || []).filter(Boolean).slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); }); }
  function linhas(loja, itens, o) {
    o = o || {};
    var cfg = limparCfg(o.cfg), agora = o.agora || agoraLocal(o.fuso), marca = cfg.marca || marcaDaLoja(loja), out = [], usados = {};
    porOrdem(itens).filter(function (i) { return entra(i, agora) && urlFoto(loja, i, 'img', 1, o); })
      .forEach(function (i) {
        // código repetido: só a primeira peça entra (a Meta ignora todas as linhas com o mesmo id)
        if (usados[sku(i)]) return;
        usados[sku(i)] = true;
        var grupo = grupoId(i), fotos = [urlFoto(loja, i, 'img', 1, o), urlFoto(loja, i, 'img2', 2, o)].filter(Boolean);
        var nome = texto(i.nome, 80), cor = texto(i.cor, 30), titulo = texto(nome + (cor && nome.toLowerCase().indexOf(cor.toLowerCase()) < 0 ? ' ' + cor : ''), 150);
        var descricao = descricaoDe(i, marca), acessorio = i.cat === 'acessorios';
        tamanhosDe(i).forEach(function (t) {
          var e = i.estoque && typeof i.estoque === 'object' && Object.prototype.hasOwnProperty.call(i.estoque, t) ? inteiro(i.estoque[t], 0, 9999, 0) : null;
          out.push({
            id: codigo(i, t), sku: sku(i), itemId: String(i.id || ''), grupo: grupo, codigoGrupo: codigoGrupo(grupo),
            nome: nome, cor: cor, tam: t, tamNome: nomeTam(t), titulo: titulo,
            descricao: descricao, preco: Number(preco2(i.preco)), qtd: e, disponivel: e === null || e > 0,
            link: linkProduto(loja, grupo, o), imagem: fotos[0] || '', extras: fotos.slice(1),
            marca: marca, cat: i.cat, catNome: NOME_CAT[i.cat], catGoogle: acessorio ? cfg.catAcess : cfg.catRoupas,
            genero: cfg.genero, idade: cfg.idade, pesoG: cfg.pesoG, comprimentoCm: cfg.comprimentoCm, larguraCm: cfg.larguraCm, alturaCm: cfg.alturaCm, ncm: cfg.ncm
          });
        });
      });
    return out;
  }

  /**
   * Conferência antes de mandar: o que impede a peça de entrar (bloqueio) e o que só melhora (dica).
   * Devolve { pecas, variacoes, prontas, bloqueadas: [{ id, nome, motivos }], dicas: [{ id, nome, motivos }], vip, esgotadas }.
   */
  function conferir(loja, itens, o) {
    o = o || {};
    var agora = o.agora || agoraLocal(o.fuso), bloq = [], dicas = [], vip = 0, esg = 0, prontas = 0, usados = {};
    porOrdem(itens).forEach(function (i) {
      var nome = texto(i.nome, 80) + (i.cor ? ' ' + minus(texto(i.cor, 30)) : ''), m = [], d = [], c = sku(i);
      if (i.vipAte && String(i.vipAte) > agora) { vip++; return; }
      if (!i.img) m.push('sem foto');
      else if (!urlFoto(loja, i, 'img', 1, o)) m.push('foto num formato que os canais não aceitam (use JPG ou PNG)');
      if (!(Number(i.preco) > 0)) m.push('sem preço');
      if (!NOME_CAT[i.cat]) m.push('sem categoria');
      if (usados[c]) m.push('código ' + c + ' já usado na peça ' + usados[c]);
      if (texto(i.descricao, 5000).length < 20) d.push('sem descrição (vai uma básica, escrita pelo painel)');
      if (!i.img2) d.push('só uma foto (uma segunda, de costas ou no corpo, ajuda a vender)');
      if (texto(i.nome, 80).length < 4) d.push('nome muito curto');
      if (m.length) { bloq.push({ id: i.id, nome: nome, motivos: m }); return; }
      usados[c] = nome; prontas++;
      if (i.estoque && tamanhosDe(i).every(function (t) { return Number(i.estoque[t]) === 0; })) esg++;
      if (d.length) dicas.push({ id: i.id, nome: nome, motivos: d });
    });
    return { pecas: (itens || []).length, variacoes: linhas(loja, itens, o).length, prontas: prontas, bloqueadas: bloq, dicas: dicas, vip: vip, esgotadas: esg };
  }

  /* ---------- arquivos ---------- */
  function celulaCsv(v, sep) {
    var s = v == null ? '' : String(v);
    return /["\r\n]/.test(s) || s.indexOf(sep) >= 0 || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csv(cab, rows, sep) {
    sep = sep || ',';
    return [cab].concat(rows).map(function (r) { return r.map(function (v) { return celulaCsv(v, sep); }).join(sep); }).join('\r\n') + '\r\n';
  }
  function semTab(s) { return String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' '); }

  /** Meta (Commerce Manager > Catálogo > Fontes de dados): CSV com os nomes de campo da Meta. */
  var CAB_META = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'additional_image_link', 'brand',
    'google_product_category', 'product_type', 'item_group_id', 'color', 'size', 'gender', 'age_group', 'quantity_to_sell_on_facebook', 'status'];
  function meta(ls) {
    return csv(CAB_META, ls.map(function (l) {
      return [l.id, l.titulo, l.descricao, l.disponivel ? 'in stock' : 'out of stock', 'new', preco2(l.preco) + ' BRL', l.link, l.imagem, l.extras.join(','), l.marca,
        l.catGoogle, 'Moda fitness > ' + l.catNome, l.grupo, l.cor, l.tamNome, l.genero, l.idade, l.qtd === null ? '' : l.qtd, 'active'];
    }), ',');
  }

  /** Google Merchant Center (Produtos > Fontes de dados > arquivo ou busca programada): TSV. */
  var CAB_GOOGLE = ['id', 'title', 'description', 'link', 'image_link', 'additional_image_link', 'availability', 'price', 'brand', 'condition',
    'google_product_category', 'product_type', 'item_group_id', 'color', 'size', 'size_system', 'gender', 'age_group', 'identifier_exists'];
  function google(ls) {
    var linhasTsv = ls.map(function (l) {
      return [l.id, l.titulo + (l.tam !== 'U' ? ' - Tamanho ' + l.tamNome : ''), l.descricao, l.link, l.imagem, l.extras.join(','), l.disponivel ? 'in_stock' : 'out_of_stock',
        preco2(l.preco) + ' BRL', l.marca, 'new', l.catGoogle, 'Moda fitness > ' + l.catNome, l.grupo, l.cor, l.tamNome, 'BR', l.genero, l.idade, 'no'].map(semTab).join('\t');
    });
    return [CAB_GOOGLE.join('\t')].concat(linhasTsv).join('\n') + '\n';
  }

  /**
   * Bling (Configurações > Importação de dados > Importar e atualizar produtos): CSV com ; e as colunas da planilha do Bling.
   * Produto pai = a peça (todas as cores); variações = cor × tamanho, com "Código Pai" (coluna AJ) e descrição só com os atributos.
   */
  var CAB_BLING = ['ID', 'Código', 'Descrição', 'Unidade', 'NCM', 'Origem', 'Preço', 'Valor IPI fixo', 'Observações', 'Situação', 'Estoque', 'Preço de custo',
    'Cód no fornecedor', 'Fornecedor', 'Localização', 'Estoque maximo', 'Estoque minimo', 'Peso líquido (Kg)', 'Peso bruto (Kg)', 'GTIN/EAN', 'GTIN/EAN da embalagem',
    'Largura do Produto', 'Altura do Produto', 'Profundidade do produto', 'Data Validade', 'Descrição do Produto no Fornecedor', 'Descrição Complementar', 'Itens p/ caixa',
    'Produto Variação', 'Tipo Produção', 'Classe de enquadramento do IPI', 'Código da lista de serviços', 'Tipo do item', 'Grupo de Tags/Tags', 'Tributos', 'Código Pai',
    'Código Integração', 'Grupo de produtos', 'Marca', 'CEST', 'Volumes', 'Descrição Curta', 'Cross-Docking', 'URL Imagens Externas', 'Link Externo',
    'Meses Garantia no Fornecedor', 'Clonar dados do pai', 'Condição do produto', 'Frete Grátis', 'Número FCI', 'Vídeo', 'Departamento', 'Unidade de medida',
    'Preço de compra', 'Valor base ICMS ST para retenção', 'Valor ICMS ST para retenção', 'Valor ICMS próprio do substituto', 'Categoria do produto', 'Informações Adicionais'];
  var COL = {}; CAB_BLING.forEach(function (c, k) { COL[c] = k; });
  function linhaBling(campos) { var r = CAB_BLING.map(function () { return ''; }); Object.keys(campos).forEach(function (k) { if (k in COL) r[COL[k]] = campos[k]; }); return r; }
  function bling(ls) {
    var grupos = [], porGrupo = {};
    ls.forEach(function (l) { var g = porGrupo[l.codigoGrupo]; if (!g) { g = porGrupo[l.codigoGrupo] = []; grupos.push(l.codigoGrupo); } g.push(l); });
    var rows = [];
    grupos.forEach(function (cg) {
      var g = porGrupo[cg], p = g[0], cores = {};
      g.forEach(function (l) { if (l.imagem) cores[l.itemId] = [l.imagem].concat(l.extras); });
      var imgsPai = Object.keys(cores).map(function (k) { return cores[k][0]; }).slice(0, 6);
      var kg = (p.pesoG / 1000).toFixed(3).replace('.', ',');
      var comum = { 'Unidade': 'UN', 'NCM': ncmBonito(p.ncm), 'Origem': '0', 'Situação': 'Ativo', 'Peso líquido (Kg)': kg, 'Peso bruto (Kg)': kg,
        'Largura do Produto': p.larguraCm, 'Altura do Produto': p.alturaCm, 'Profundidade do produto': p.comprimentoCm, 'Marca': p.marca, 'Volumes': '1', 'Condição do produto': 'Novo' };
      rows.push(linhaBling(Object.assign({}, comum, {
        'Código': cg, 'Descrição': p.nome, 'Preço': precoBR(p.preco), 'Descrição Curta': p.descricao, 'Descrição Complementar': p.descricao,
        'URL Imagens Externas': imgsPai.join('|'), 'Link Externo': p.link, 'Categoria do produto': 'Moda fitness >> ' + p.catNome
      })));
      g.forEach(function (l) {
        rows.push(linhaBling(Object.assign({}, comum, {
          'Código': l.id, 'Descrição': (l.cor ? 'Cor:' + l.cor + ';' : '') + 'Tamanho:' + l.tamNome, 'Preço': precoBR(l.preco),
          'Estoque': l.qtd === null ? '' : String(l.qtd), 'Código Pai': cg, 'URL Imagens Externas': (cores[l.itemId] || []).join('|'), 'Clonar dados do pai': 'Sim'
        })));
      });
    });
    return csv(CAB_BLING, rows, ';');
  }

  /** Planilha simples (UpSeller e outros hubs: mapeie as colunas na importação). Uma linha por variação. */
  var CAB_PLANILHA = ['SKU pai', 'SKU (código da etiqueta)', 'Nome do produto', 'Descrição', 'Categoria', 'Cor', 'Tamanho', 'Preço (R$)', 'Estoque',
    'Peso (g)', 'Comprimento (cm)', 'Largura (cm)', 'Altura (cm)', 'Marca', 'NCM', 'Imagem 1', 'Imagem 2', 'Link do produto'];
  function tabela(ls) {
    return [CAB_PLANILHA].concat(ls.map(function (l) {
      return [l.codigoGrupo, l.id, l.nome, l.descricao, l.catNome, l.cor, l.tamNome, l.preco, l.qtd === null ? '' : l.qtd,
        l.pesoG, l.comprimentoCm, l.larguraCm, l.alturaCm, l.marca, ncmBonito(l.ncm), l.imagem, l.extras[0] || '', l.link];
    }));
  }

  /* ---------- .xlsx mínimo (zip sem compressão + uma aba), sem biblioteca ---------- */
  var TAB_CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = TAB_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    return Uint8Array.from(Buffer.from(s, 'utf8'));
  }
  function zip(arquivos) {
    var partes = [], central = [], pos = 0;
    var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    arquivos.forEach(function (a) {
      var nome = utf8(a.nome), dados = utf8(a.texto), crc = crc32(dados);
      // versão 20, sem flags, sem compressão, data fixa (1/1/2026) para o arquivo sair igual com o mesmo conteúdo
      var cab = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x5C21), u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0));
      partes.push(Uint8Array.from(cab), nome, dados);
      central.push(Uint8Array.from([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x5C21), u32(crc), u32(dados.length), u32(dados.length),
        u16(nome.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(pos))), nome);
      pos += cab.length + nome.length + dados.length;
    });
    var tamCentral = central.reduce(function (s, x) { return s + x.length; }, 0);
    var fim = Uint8Array.from([].concat(u32(0x06054b50), u16(0), u16(0), u16(arquivos.length), u16(arquivos.length), u32(tamCentral), u32(pos), u16(0)));
    var todas = partes.concat(central, [fim]), total = todas.reduce(function (s, x) { return s + x.length; }, 0), out = new Uint8Array(total), k = 0;
    todas.forEach(function (x) { out.set(x, k); k += x.length; });
    return out;
  }
  function xmlEsc(s) { return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function colNome(n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  /** Linhas (a primeira é o cabeçalho) -> bytes de um .xlsx com uma aba. */
  function xlsx(rows, aba) {
    var folha = rows.map(function (r, i) {
      return '<row r="' + (i + 1) + '">' + r.map(function (v, j) {
        var ref = colNome(j) + (i + 1);
        if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"><v>' + v + '</v></c>';
        if (v == null || v === '') return '';
        return '<c r="' + ref + '" t="inlineStr"' + (i === 0 ? ' s="1"' : '') + '><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
      }).join('') + '</row>';
    }).join('');
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    return zip([
      { nome: '[Content_Types].xml', texto: X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { nome: '_rels/.rels', texto: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { nome: 'xl/workbook.xml', texto: X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xmlEsc(String(aba || 'Produtos').slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { nome: 'xl/_rels/workbook.xml.rels', texto: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { nome: 'xl/styles.xml', texto: X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
      { nome: 'xl/worksheets/sheet1.xml', texto: X + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>' + folha + '</sheetData></worksheet>' }
    ]);
  }
  function planilha(ls) { return xlsx(tabela(ls), 'Produtos'); }

  /** Tudo de uma vez (o workflow grava; o painel baixa). */
  function arquivos(loja, itens, o) {
    var ls = linhas(loja, itens, o);
    return { linhas: ls, meta: meta(ls), google: google(ls), bling: bling(ls), planilha: planilha(ls) };
  }

  return {
    SITE: SITE, ARQUIVOS: ARQUIVOS, CATEGORIAS: CATEGORIAS, GENEROS: GENEROS, IDADES: IDADES, PADRAO: PADRAO, NOME_CAT: NOME_CAT,
    limparCfg: limparCfg, agoraLocal: agoraLocal, sku: sku, codigo: codigo, grupoId: grupoId, enderecos: enderecos, pastaDaLoja: pastaDaLoja,
    linkProduto: linkProduto, urlFoto: urlFoto, arquivoFoto: arquivoFoto, fotosParaPublicar: fotosParaPublicar, dominioValido: dominioValido,
    linhas: linhas, conferir: conferir, meta: meta, google: google, bling: bling, tabela: tabela, xlsx: xlsx, planilha: planilha, arquivos: arquivos,
    _crc32: crc32, _csv: csv
  };
});
