// deck.js — monta o portfólio do Provador (PDF 16:9) com as telas de assets/img/painel e os preços do site.
// Saída: assets/portfolio/Provador-Portfolio.pdf e assets/portfolio/capa.jpg (capa para o site).
// Uso: servir a raiz do repositório (python3 -m http.server 8813) e rodar  node tools/portfolio/deck.js
// Os preços vêm do Firestore (site/planos, leitura pública); sem acesso, usa os de shared/calc.js.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const Calc = require('../../shared/calc.js');
const QR = require('../../shared/qr.js');

const RAIZ = path.resolve(__dirname, '..', '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8813';
const PROJETO = process.env.FIREBASE_PROJETO || 'provador-6416d';
const WHATS = '5567992122801', WHATS_TXT = '(67) 99212-2801';
const SITE = 'natanaelinvotec.github.io/provador';
const OUT = path.join(RAIZ, 'assets/portfolio');
fs.mkdirSync(OUT, { recursive: true });

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const hoje = new Date();
const ROTULO = 'Portfólio de ' + MESES[hoje.getMonth()] + ' de ' + hoje.getFullYear();
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brl = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/,00$/, '');

// ---------- preços: Firestore REST (documento público) → formato do Calc ----------
function valorRest(v) {
  if (!v) return undefined;
  if ('mapValue' in v) { const o = {}; Object.entries((v.mapValue && v.mapValue.fields) || {}).forEach(([k, x]) => { o[k] = valorRest(x); }); return o; }
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('stringValue' in v) return v.stringValue;
  return undefined;
}
function lerPrecosNoAr() {
  return new Promise((ok) => {
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJETO + '/databases/(default)/documents/site/planos';
    const req = https.get(url, { timeout: 10000 }, (r) => {
      let txt = ''; r.on('data', (c) => { txt += c; });
      r.on('end', () => { try { const d = JSON.parse(txt); ok(d.fields ? valorRest({ mapValue: { fields: d.fields } }) : null); } catch (e) { ok(null); } });
    });
    req.on('error', () => ok(null)); req.on('timeout', () => { req.destroy(); ok(null); });
  });
}

// ---------- pedaços ----------
const IMG = (n) => '../../assets/img/painel/' + n;
const ETQ = '<svg class="etq" viewBox="-4 -2 48 60" aria-hidden="true"><path fill-rule="evenodd" d="M0 56V12L12 0h16l12 12v17L29 40H14v16zM30.5 17a6 6 0 1 1-12 0 6 6 0 0 1 12 0z"/></svg>';
const tela = (n, leg, extra) => '<figure class="tela' + (extra ? ' ' + extra : '') + '"><img src="' + IMG(n + '.jpg') + '" alt=""></figure>' + (leg ? '<figcaption>' + leg + '</figcaption>' : '');
const cel = (n, leg) => '<figure class="cel"><div class="cel-moldura"><img src="' + IMG(n + '.jpg') + '" alt=""></div>' + (leg ? '<figcaption>' + leg + '</figcaption>' : '') + '</figure>';
const lista = (itens) => '<ul class="lista">' + itens.map((t) => '<li>' + t + '</li>').join('') + '</ul>';

function slides(precos, modelos) {
  const S = [];
  // 1. capa
  S.push(['capa', `
    <div class="capa-nome">PROVADOR</div>
    <div class="capa-grade">
      <div class="capa-texto">
        <h1>A loja virtual pronta para quem vende roupa</h1>
        <p>Escolha um dos 15 modelos, suba as fotos pelo celular e venda com painel, estoque com etiqueta, caixa e o catálogo no Instagram e no Google.</p>
        <div class="capa-selo"><b>15 dias grátis</b><span>sem cartão, sem fidelidade</span></div>
        <p class="capa-contato">WhatsApp <b>${WHATS_TXT}</b></p>
      </div>
      <div class="capa-arte">
        <figure class="tela capa-pc"><img src="${IMG('vitrine.jpg')}" alt=""></figure>
        <figure class="cel capa-cel"><div class="cel-moldura"><img src="${IMG('cel-inicio.jpg')}" alt=""></div></figure>
      </div>
    </div>`]);
  // 2. três partes
  S.push(['', `
    <div class="cab"><h2>Três peças que trabalham juntas</h2><p>A loja, o painel e o app usam o mesmo cadastro de peças e o mesmo estoque. Vendeu no balcão, no site ou no WhatsApp, o estoque baixa e o caixa registra.</p></div>
    <div class="tres">
      <div>${tela('vitrine-p')}<h3>Loja virtual própria</h3><p>Com a sua marca, catálogo por categoria, cor e tamanho, e o pedido chegando pronto no seu WhatsApp.</p></div>
      <div>${tela('hoje-p')}<h3>Painel da loja</h3><p>Pedidos, estoque por tamanho, etiquetas, caixa, relatórios e clientes, no computador ou no celular.</p></div>
      <div>${tela('vender-p')}<h3>Venda no balcão</h3><p>Leitor de código de barras ou a câmera do celular. A venda entra no caixa e sai do estoque na hora.</p></div>
    </div>`]);
  // 3. modelos
  S.push(['', `
    <div class="cab curta"><h2>15 modelos, 15 cores cada</h2><p>O mesmo catálogo em qualquer modelo. Dá para trocar o desenho ou a cor quando quiser, sem perder peça, foto nem pedido.</p></div>
    <div class="modelos">${modelos.map((m) => `<figure><img src="${IMG('modelos/m-' + m.slug + '.jpg')}" alt=""><figcaption><b>${m.numero}</b> ${esc(m.nome)}</figcaption></figure>`).join('')}</div>`]);
  // 4. montagem
  S.push(['', `
    <div class="dupla">
      <div class="lado">
        <h2>A loja montada pelo celular</h2>
        <p class="lead">A dona da loja fotografa as peças e confere nome e preço. O resto o sistema faz.</p>
        ${lista(['O provador de fotos endireita, recorta em 4:5, acerta a luz e descobre a cor da peça.', 'Avisa quando a foto está escura, pequena, tremida ou com fundo carregado.', 'A prévia ao lado mostra a loja pronta enquanto ela digita.', 'Publicou, a loja vai ao ar na hora, com 15 dias grátis.'])}
      </div>
      <div class="pilha">${tela('montar-modelo-p', '', 'atras')}${tela('montar-pecas-p', '', 'frente')}</div>
    </div>`]);
  // 5 a 8: pares de telas
  const par = (titulo, sub, a, la, b, lb) => S.push(['', `
    <div class="cab"><h2>${titulo}</h2><p>${sub}</p></div>
    <div class="par"><div>${tela(a)}<p class="leg">${la}</p></div><div>${tela(b)}<p class="leg">${lb}</p></div></div>`]);
  par('O painel de todo dia', 'Abre no que precisa de atenção e vende no balcão em segundos.',
    'hoje-p', '<b>Hoje.</b> Pedidos para separar e enviar, reposição que chegou, contas a vencer e quem pediu aviso, cada um com o botão que resolve.',
    'vender-p', '<b>Vender.</b> Leitor USB, Bluetooth ou a câmera lê a etiqueta. Pix, cartão ou dinheiro, e o recibo vai no WhatsApp da cliente.');
  par('Estoque com etiqueta', 'Cada peça e tamanho tem um código. A etiqueta sai com o código de barras e a venda baixa o estoque sozinha.',
    'estoque-p', '<b>Estoque.</b> Grade por tamanho com alerta de zerado e de última peça. Tamanho zerado some da vitrine e dos canais.',
    'etiquetas-p', '<b>Etiquetas.</b> Folha A4 com 24 etiquetas ou impressora térmica de 50 × 30 mm, com marca, peça, tamanho e preço.');
  par('Pedidos e caixa', 'Do pedido pago até a entrega, e quanto entrou e saiu no mês.',
    'pedidos-p', '<b>Pedidos.</b> Por situação, com etiqueta de envio. A cada troca, a cliente recebe o link para acompanhar.',
    'caixa-p', '<b>Caixa.</b> Entradas por forma de pagamento, lançamentos e contas a pagar. A conta mensal se cria sozinha.');
  par('Relatórios e clientes', 'O que vende, por onde vende e quem compra.',
    'relatorios-p', '<b>Relatórios.</b> Faturamento por mês, mais vendidas, peças paradas e vendas por canal e forma de pagamento.',
    'clientes-p', '<b>Clientes.</b> Compradoras com total e última compra, a lista VIP com link próprio e os pedidos de aviso de reposição.');
  // 9. cliente
  S.push(['', `
    <div class="dupla cli">
      <div class="lado">
        <h2>O que a sua cliente ganha</h2>
        <p class="lead">Funciona nos 15 modelos, com a cor e o nome da sua loja.</p>
        ${lista(['Esgotou o tamanho, ele some da vitrine sozinho.', 'O pedido chega pronto no WhatsApp da loja.', 'O telefone da cliente só entra com o consentimento dela, e só a loja vê.'])}
      </div>
      <div class="celulares">
        ${cel('cel-vip', 'Lista VIP: vê os lançamentos antes de todo mundo.')}
        ${cel('cel-avise', 'Avise-me: deixa o WhatsApp e é avisada quando o tamanho voltar.')}
        ${cel('cel-acompanhar', 'Pedido acompanhado, do pagamento à entrega.')}
        ${cel('cel-instalar', 'A loja instalada no celular, com o ícone dela.')}
      </div>
    </div>`]);
  // 10. canais
  S.push(['', `
    <div class="dupla">
      <div class="lado">
        <h2>Canais de venda</h2>
        <p class="lead">A loja liga uma vez no painel. A cada 3 horas o catálogo e as fotos vão para onde a cliente procura.</p>
        <div class="canais">
          <div><h3>Instagram, WhatsApp e anúncios</h3><p>Catálogo da Meta para marcar peças nos posts, no WhatsApp Business e nos anúncios de catálogo.</p></div>
          <div><h3>Google Shopping</h3><p>As peças aparecem na aba Shopping do Google, nas listagens gratuitas.</p></div>
          <div><h3>Shopee e Shein</h3><p>Planilha pronta para o Bling ou o UpSeller publicarem. O pedido chega com o código da etiqueta.</p></div>
        </div>
      </div>
      <div class="so-tela">${tela('canais-p')}</div>
    </div>`]);
  // 11. planos
  const P = precos.planos, parc = Math.max(1, precos.implantacaoParcelas || 1), impl = P.loja.implantacao;
  const plano = (k, txt, destaque) => `<div class="plano${destaque ? ' destaque' : ''}"><div class="plano-topo"><h3>${esc(P[k].nome)}</h3>${destaque ? '<span class="tag">Tudo deste portfólio</span>' : ''}</div>
    ${P[k].mensalDe > P[k].mensal ? `<s>de ${brl(P[k].mensalDe)}</s>` : '<s>&nbsp;</s>'}<p class="preco">${brl(P[k].mensal)}<small> por mês</small></p><p>${txt}</p>
    <p class="mont">Montagem: ${P[k].implantacaoDe ? `<s>${brl(P[k].implantacaoDe)}</s> ` : ''}grátis, montando sozinha</p></div>`;
  S.push(['', `
    <div class="cab"><h2>Planos</h2><p>15 dias grátis, sem cartão. Sem fidelidade: dá para trocar de plano ou cancelar quando quiser.</p></div>
    <div class="planos">
      ${plano('vitrine', 'Para vender pelo site com o pedido chegando no WhatsApp: vitrine com a sua marca, catálogo por categoria, cor e tamanho, e o painel para trocar peças e preços.')}
      ${plano('loja', 'Tudo do Vitrine, mais o painel da loja com pedidos, estoque com etiquetas, caixa, relatórios e o domínio próprio configurado.')}
      ${plano('completo', 'Tudo do Loja, mais a loja instalada no celular da cliente com lista VIP, aviso de reposição e pedido acompanhado, o app de vendas e os canais de venda.', true)}
    </div>
    <div class="planos-pe"><p>Com a nossa equipe de marketing montando a loja: <b>${brl(impl)}</b>${parc > 1 ? `, em até ${parc}x de ${brl(Math.round(impl / parc * 100) / 100)}` : ''}. Domínio .com.br, se a loja ainda não tiver: ${brl(precos.dominioAno)} por ano, registrado no nome dela.</p></div>`]);
  // 12. como funciona
  S.push(['', `
    <div class="cab"><h2>Como funciona</h2><p>Do primeiro clique à primeira venda, sem instalar nada.</p></div>
    <ol class="passos">
      <li><b>Escolha o modelo</b><span>No site do Provador, toque em "Montar minha loja" e escolha um dos 15 modelos e a cor.</span></li>
      <li><b>Suba as fotos</b><span>Pelo celular, por categoria. O provador acerta cada foto e descobre a cor.</span></li>
      <li><b>Publique</b><span>Crie o acesso com Google ou e-mail. A loja vai ao ar na hora, com 15 dias grátis.</span></li>
      <li><b>Venda e acompanhe</b><span>O painel já abre com pedidos, estoque, caixa e clientes. No fim dos 15 dias, escolha o plano.</span></li>
    </ol>`]);
  // 13. contato
  S.push(['escuro', `
    <div class="contato">
      <div>
        <h2>Monte a sua loja hoje</h2>
        <p class="lead">Fale com a gente no WhatsApp ou comece sozinha pelo site. São 15 dias grátis, sem cartão.</p>
        <p class="ct"><span>WhatsApp</span><b>${WHATS_TXT}</b></p>
        <p class="ct"><span>Site</span><b>${SITE}</b></p>
      </div>
      <div class="qr-etq">${QR.svg('https://wa.me/' + WHATS, { cor: '#0A1630', borda: 2 })}<p><b>Aponte a câmera do celular</b>e fale com a gente no WhatsApp.</p></div>
    </div>`]);
  return S;
}

const CSS = `
@font-face{font-family:'DM Serif Display';src:url('../../assets/fonts/contraste/DMSerifDisplay-400.woff2') format('woff2')}
@font-face{font-family:'Inter';font-weight:400;src:url('../../assets/fonts/inter-400.woff') format('woff')}
@font-face{font-family:'Inter';font-weight:500;src:url('../../assets/fonts/inter-500.woff') format('woff')}
@font-face{font-family:'Inter';font-weight:600;src:url('../../assets/fonts/inter-600.woff') format('woff')}
@font-face{font-family:'Inter';font-weight:700;src:url('../../assets/fonts/inter-700.woff') format('woff')}
@page{size:1280px 720px;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#C9D0DA}
body{font-family:'Inter',system-ui,sans-serif;color:#0A1630;-webkit-font-smoothing:antialiased}
.slide{position:relative;width:1280px;height:720px;overflow:hidden;background:#F3F5F8;padding:52px 64px 0;page-break-after:always;break-after:page}
.slide:last-child{page-break-after:auto;break-after:auto}
.slide.capa{background:#FFF3F9}
.slide.escuro{background:#0A1630;color:#fff}
h1,h2,h3{margin:0;font-weight:400}
h2{font-family:'DM Serif Display',Georgia,serif;font-size:54px;line-height:1;letter-spacing:-.01em;text-wrap:balance}
h3{font-family:'DM Serif Display',Georgia,serif;font-size:24px;line-height:1.1}
p{margin:0}
.cab{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:48px;align-items:end;margin-bottom:28px}
.cab p{font-size:16px;line-height:1.5;color:#46506A;text-align:right}
.cab.curta{grid-template-columns:minmax(0,7fr) minmax(0,5fr);margin-bottom:20px}
.lead{font-size:17px;line-height:1.5;color:#46506A;margin-top:16px;max-width:40ch}
.escuro .lead{color:#AEB9CD}
.lista{margin:22px 0 0;padding:0;list-style:none;display:grid;gap:12px;font-size:15px;line-height:1.45;color:#1C2A4A}
.lista li{display:grid;grid-template-columns:12px minmax(0,1fr);gap:12px}
.lista li::before{content:"";width:9px;height:9px;margin-top:6px;background:#D81B60}
.tela{margin:0;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px #D7DFE8,0 30px 50px -36px rgba(10,22,48,.6)}
.tela img{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;object-position:top left}
.pe{position:absolute;left:64px;right:64px;bottom:24px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#46506A}
.escuro .pe{color:#AEB9CD}
.pe .marca{display:flex;align-items:center;gap:8px;font:400 15px/1 'DM Serif Display',serif;letter-spacing:.04em;color:#0A1630}
.escuro .pe .marca{color:#fff}
.etq{width:auto;height:15px;fill:currentColor}
/* capa */
.capa-nome{font:400 210px/.8 'DM Serif Display',serif;letter-spacing:-.015em;text-align:center;margin:-6px -20px 0;color:#0A1630}
.capa-grade{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:40px;margin-top:34px}
.capa-texto h1{font:400 40px/1.04 'DM Serif Display',serif;text-wrap:balance}
.capa-texto p{font-size:16px;line-height:1.5;color:#46506A;margin-top:16px;max-width:40ch}
.capa-selo{display:inline-grid;gap:2px;margin-top:22px;padding:12px 18px;background:#D81B60;color:#fff}
.capa-selo b{font-size:18px}.capa-selo span{font-size:13px;opacity:.9}
.capa-texto .capa-contato{margin-top:18px;color:#0A1630;font-size:15px}
.capa-arte{position:relative;height:360px}
.capa-pc{position:absolute;left:0;top:0;width:560px}
.capa-cel{position:absolute;right:0;top:40px;width:150px}
/* celulares */
.cel{margin:0;display:grid;gap:10px;justify-items:center;text-align:center}
.cel-moldura{width:100%;aspect-ratio:9/19;padding:6px;border-radius:26px;background:#0A1630;box-shadow:0 30px 40px -30px rgba(10,22,48,.6)}
.cel-moldura img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;border-radius:20px}
.cel figcaption{font-size:12.5px;line-height:1.4;color:#46506A;max-width:24ch}
/* blocos */
.tres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}
.tres h3{margin:20px 0 8px}.tres p{font-size:14px;line-height:1.5;color:#46506A}
.modelos{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px 16px}
.modelos figure{margin:0}
.modelos img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;object-position:top;border-radius:6px;box-shadow:0 0 0 1px #D7DFE8}
.modelos figcaption{margin-top:6px;font-size:12.5px;color:#1C2A4A}.modelos figcaption b{color:#D81B60;margin-right:4px}
.dupla{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:48px;align-items:center;height:590px}
.dupla.cli{grid-template-columns:minmax(0,3fr) minmax(0,8fr)}
.pilha{position:relative;height:440px}
.pilha .atras{position:absolute;left:0;top:0;width:78%;opacity:.95}
.pilha .frente{position:absolute;right:0;bottom:0;width:78%}
.so-tela .tela{width:100%}
.par{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}
.par .leg{margin-top:16px;font-size:14px;line-height:1.5;color:#46506A}.par .leg b{color:#0A1630}
.celulares{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;align-items:start}
.celulares .cel:nth-child(even){margin-top:34px}
.canais{display:grid;gap:0;margin-top:22px}
.canais div{padding:14px 0;border-top:1px solid #D7DFE8}.canais h3{font-size:21px}.canais p{font-size:13.5px;line-height:1.45;color:#46506A;margin-top:4px}
.planos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.plano{display:flex;flex-direction:column;gap:8px;padding:26px 24px 22px;background:#fff;box-shadow:0 0 0 1px #D7DFE8;min-height:380px}
.plano.destaque{background:#0A1630;color:#fff;box-shadow:none}
.plano-topo{display:flex;justify-content:space-between;align-items:center;gap:10px}
.plano h3{font-size:30px}
.tag{padding:5px 10px;background:#D81B60;color:#fff;font-size:11.5px;font-weight:700}
.plano s{font-size:13px;color:#7A8499}
.plano .preco{font:400 50px/1 'DM Serif Display',serif;color:#D81B60}
.plano.destaque .preco{color:#FF7FAE}
.plano .preco small{font:500 13px/1 'Inter',sans-serif;color:#46506A}
.plano.destaque .preco small,.plano.destaque s{color:#AEB9CD}
.plano p{font-size:14px;line-height:1.5;color:#46506A}
.plano.destaque p{color:#D5DCE8}
.plano .mont{margin-top:auto;padding-top:12px;border-top:1px solid #E6EBF1;font-size:13px}
.plano.destaque .mont{border-color:#26324F}
.planos-pe{margin-top:20px;font-size:13.5px;line-height:1.5;color:#46506A;max-width:110ch}
.passos{margin:30px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:26px;counter-reset:p}
.passos li{counter-increment:p;display:grid;gap:10px;padding-top:22px;border-top:2px solid #0A1630}
.passos li::before{content:counter(p);font:400 64px/1 'DM Serif Display',serif;color:#D81B60}
.passos b{font:400 26px/1.1 'DM Serif Display',serif}
.passos span{font-size:15px;line-height:1.5;color:#46506A}
.contato{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,4fr);gap:60px;align-items:center;height:600px}
.contato h2{font-size:74px;color:#fff}
.ct{display:grid;gap:2px;margin-top:26px}.ct span{font-size:13px;color:#AEB9CD}.ct b{font-size:26px;font-weight:600}
.qr-etq{position:relative;display:grid;gap:16px;justify-items:center;text-align:center;padding:52px 30px 30px;background:#fff;color:#0A1630;clip-path:polygon(0 32px,32px 0,calc(100% - 32px) 0,100% 32px,100% 100%,0 100%)}
.qr-etq::before{content:"";position:absolute;top:16px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#0A1630}
.qr-etq svg{width:250px;height:250px}
.qr-etq p{font-size:15px;line-height:1.45;color:#46506A;max-width:24ch}.qr-etq b{display:block;color:#0A1630;font-size:18px}
`;

(async () => {
  const noAr = await lerPrecosNoAr();
  const precos = Calc.lerPrecos(noAr || {});
  console.log('preços:', noAr ? 'do site (Firestore)' : 'padrão de shared/calc.js', JSON.stringify(Object.keys(precos.planos).map((k) => [k, precos.planos[k].mensal])));
  const modelos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'assets/img/painel/modelos/modelos.json'), 'utf8'));
  const S = slides(precos, modelos), total = S.length;
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Provador: portfólio</title><style>' + CSS + '</style></head><body>' +
    S.map((s, i) => '<section class="slide ' + s[0] + '">' + s[1] + (i === 0 ? '' : '<footer class="pe"><span class="marca">' + ETQ + 'PROVADOR</span><span>' + ROTULO + '</span><span>' + (i + 1) + ' / ' + total + '</span></footer>') + '</section>').join('') + '</body></html>';
  const arq = path.join(__dirname, '_deck.html');
  fs.writeFileSync(arq, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(BASE + '/tools/portfolio/_deck.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const faltando = await p.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src')));
  if (faltando.length) { console.error('imagens que não carregaram:', faltando); process.exitCode = 1; }
  // sobra de texto: nenhum bloco pode passar da página
  const vaza = await p.evaluate(() => [...document.querySelectorAll('.slide')].map((s, i) => [i + 1, s.scrollHeight > 721]).filter((x) => x[1]).map((x) => x[0]));
  if (vaza.length) console.warn('páginas com conteúdo passando da altura:', vaza);
  await p.screenshot({ path: path.join(OUT, 'capa.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await p.pdf({ path: path.join(OUT, 'Provador-Portfolio.pdf'), width: '1280px', height: '720px', printBackground: true, preferCSSPageSize: true });
  await b.close();
  const kb = Math.round(fs.statSync(path.join(OUT, 'Provador-Portfolio.pdf')).size / 1024);
  console.log('PDF com ' + total + ' páginas, ' + kb + ' KB');
})();
