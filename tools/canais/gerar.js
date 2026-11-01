#!/usr/bin/env node
/*
 * Canais de venda: grava canais/{slug}/ para cada loja que ligou os canais no painel.
 *   meta.csv      catálogo da Meta (Instagram, WhatsApp, anúncios)
 *   google.tsv    Google Merchant Center
 *   bling.csv     planilha de importação do Bling (Shopee, Shein e outros pela integração do Bling)
 *   planilha.xlsx planilha para o UpSeller e outros hubs
 *   img/          as fotos das peças (no banco elas ficam dentro do documento; a Meta e o Google pedem um endereço)
 *   status.json   quando mudou pela última vez e quantas peças foram
 * Lê o Firestore pela API REST SEM chave: só o que as regras deixam qualquer pessoa ler
 * (canaisAtivos, lojasPublicas um a um e catalogos/{loja}/itens). Nada de vendas, caixa ou clientes.
 * Roda no workflow .github/workflows/canais.yml (a cada 3 horas) ou à mão: node tools/canais/gerar.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('../../shared/canais.js');

const RAIZ = path.resolve(__dirname, '../..');
const SAIDA = path.resolve(process.env.CANAIS_SAIDA || path.join(RAIZ, 'canais'));
const FUSO = process.env.FUSO || 'America/Campo_Grande';
const SITE = process.env.SITE || C.SITE;
const PROJETO = process.env.FIREBASE_PROJETO || lerProjeto();
const API = (process.env.FIRESTORE_API || 'https://firestore.googleapis.com/v1') + '/projects/' + PROJETO + '/databases/(default)/documents';
const SLUG = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;
const MAX_FOTO = 8 * 1024 * 1024;
const MAX_ITENS = 2000;
// campos da peça sem as fotos: a lista sai leve (as fotos vêm só das peças que mudaram desde a última publicação)
const CAMPOS_LEVES = ['nome', 'cat', 'cor', 'hex', 'preco', 'tamanhos', 'descricao', 'estoque', 'sku', 'vipAte', 'ordem'];

function lerProjeto() {
  try {
    const t = fs.readFileSync(path.join(RAIZ, 'config', 'plataforma.config.js'), 'utf8');
    const m = /projectId:\s*'([a-z0-9-]+)'/.exec(t);
    if (m) return m[1];
  } catch (e) { /* sem config: usa o projeto padrão */ }
  return 'provador-6416d';
}
const log = (...a) => console.log('[canais]', ...a);

/* ---------- Firestore REST -> objetos simples ---------- */
function valor(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return campos((v.mapValue && v.mapValue.fields) || {});
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(valor);
  return null;
}
function campos(f) { const o = {}; Object.keys(f).forEach((k) => { o[k] = valor(f[k]); }); return o; }
function documento(d) {
  const o = campos(d.fields || {});
  o.id = String(d.name || '').split('/').pop();
  Object.defineProperty(o, '_versao', { value: String(d.updateTime || ''), enumerable: false });
  return o;
}
const mascara = (lista) => lista.map((c) => 'mask.fieldPaths=' + encodeURIComponent(c)).join('&');

async function pedir(url, pode404) {
  for (let tentativa = 1; ; tentativa++) {
    let res;
    try { res = await fetch(url, { headers: { accept: 'application/json' } }); } catch (e) { res = null; if (tentativa >= 3) throw e; }
    if (res && res.status === 404 && pode404) return null;
    if (res && res.ok) return res.json();
    if (res && ![429, 500, 502, 503, 504].includes(res.status)) {
      const e = new Error(res.status + ' em ' + url.replace(API, '') + ': ' + (await res.text()).slice(0, 300));
      e.status = res.status;
      throw e;
    }
    if (tentativa >= 3) throw new Error('sem resposta de ' + url.replace(API, ''));
    await new Promise((ok) => setTimeout(ok, 1500 * tentativa));
  }
}
async function listar(caminho, porPagina, campos) {
  let token = '', out = [];
  do {
    const r = await pedir(API + '/' + caminho + '?pageSize=' + (porPagina || 100) + (campos ? '&' + mascara(campos) : '') + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    out = out.concat((r.documents || []).map(documento));
    token = r.nextPageToken || '';
  } while (token && out.length < MAX_ITENS);
  return out;
}
async function ler(caminho, campos) { const r = await pedir(API + '/' + caminho + (campos ? '?' + mascara(campos) : ''), true); return r ? documento(r) : null; }

/*
 * Peças com as fotos, gastando pouco do banco: a lista vem sem fotos; a peça que não mudou desde a última
 * publicação (mesma updateTime) reaproveita a foto já gravada em img/; só as que mudaram são lidas inteiras.
 */
function fotoGuardada(v) {
  v = String(v || '');
  if (/^data:image\//i.test(v)) return v.slice(0, v.indexOf(',') + 1); // só o tipo; o arquivo já está em img/
  return v.length <= 500 ? v : '';
}
// a foto guardada só vale se o arquivo ainda estiver em img/
function fotosNoDisco(dirImg, id, c) {
  return [['img', 1], ['img2', 2]].every((x) => !/^data:/i.test(c[x[0]] || '') || fs.existsSync(path.join(dirImg, C.arquivoFoto({ id: id }, x[1], c[x[0]]))));
}
async function pecasDaLoja(lojaId, cache, dirImg) {
  const leves = await listar('catalogos/' + encodeURIComponent(lojaId) + '/itens', 300, CAMPOS_LEVES);
  const novoCache = {};
  let lidas = 0;
  for (const i of leves) {
    const c = cache[i.id];
    if (c && c.t && c.t === i._versao && (!c.pub || fotosNoDisco(dirImg, i.id, c))) { if (c.img) i.img = c.img; if (c.img2) i.img2 = c.img2; }
    else {
      const f = await ler('catalogos/' + encodeURIComponent(lojaId) + '/itens/' + encodeURIComponent(i.id), ['img', 'img2']);
      lidas++;
      if (f && f.img) i.img = f.img;
      if (f && f.img2) i.img2 = f.img2;
    }
    novoCache[i.id] = { t: i._versao, img: fotoGuardada(i.img), img2: fotoGuardada(i.img2) };
  }
  return { itens: leves, cache: novoCache, lidas: lidas };
}

/* ---------- loja no ar? (mesma regra da vitrine) ---------- */
function lojaNoAr(l) {
  if (!l) return false;
  if (l.status === 'ativa') return true;
  if (l.status !== 'teste') return false;
  const ate = l.trialAteTs ? Date.parse(l.trialAteTs) : Date.parse(String(l.trialAte || '') + 'T23:59:59-04:00');
  return ate > Date.now();
}

/* ---------- gravação (só quando muda, para não gerar commit à toa) ---------- */
function gravarSeMudou(arq, conteudo) {
  const novo = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo);
  try { if (fs.readFileSync(arq).equals(novo)) return false; } catch (e) { /* arquivo novo */ }
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, novo);
  return true;
}
function fotoDe(dataUrl) {
  const i = dataUrl.indexOf(',');
  if (i < 0 || !/;base64$/i.test(dataUrl.slice(0, i)) || i === dataUrl.length - 1) return null;
  const b = Buffer.from(dataUrl.slice(i + 1), 'base64');
  const jpg = b[0] === 0xFF && b[1] === 0xD8, png = b[0] === 0x89 && b[1] === 0x50, webp = b.slice(8, 12).toString() === 'WEBP';
  return (jpg || png || webp) && b.length < MAX_FOTO ? b : null;
}
function apagarPasta(p) { fs.rmSync(p, { recursive: true, force: true }); }

function lerStatus(dir) { try { return JSON.parse(fs.readFileSync(path.join(dir, C.ARQUIVOS.status), 'utf8')); } catch (e) { return null; } }
function publicarLoja(slug, loja, itens, cfg, cache) {
  const dir = path.join(SAIDA, slug), dirImg = path.join(dir, 'img');
  const o = { cfg: cfg, fuso: FUSO, site: SITE };
  // 1) fotos das peças que podem entrar; 2) arquivos só com as peças cuja foto principal está publicada
  const candidatas = new Set(C.linhas(loja, itens, o).map((l) => l.itemId));
  const fotos = C.fotosParaPublicar(itens.filter((i) => candidatas.has(String(i.id))));
  const manter = new Set(), semFoto = new Set();
  let mudou = 0;
  fotos.forEach((f) => {
    const arq = path.join(dirImg, f.arquivo), principal = /-1\.[a-z]+$/.test(f.arquivo);
    // peça sem mudança: a foto já publicada continua
    if (/,$/.test(f.dataUrl)) {
      if (fs.existsSync(arq)) manter.add(f.arquivo);
      else {
        // ex.: lançamento VIP que abriu sem a peça mudar no banco; entra na próxima rodada, já com a foto
        log(slug, 'foto ainda não publicada, a peça entra na próxima rodada:', f.arquivo);
        if (cache && cache[f.itemId]) cache[f.itemId].t = '';
        if (principal) semFoto.add(f.itemId);
      }
      return;
    }
    const b = fotoDe(f.dataUrl);
    if (!b) { log(slug, 'foto ignorada (formato):', f.arquivo); if (principal) semFoto.add(f.itemId); return; }
    if (gravarSeMudou(arq, b)) mudou++;
    manter.add(f.arquivo);
  });
  const a = C.arquivos(loja, itens.filter((i) => !semFoto.has(String(i.id))), o);
  const entram = new Set(a.linhas.map((l) => l.itemId));
  // foto extra de peça que ficou de fora não precisa ficar no ar
  Array.from(manter).forEach((f) => { const id = fotos.filter((x) => x.arquivo === f)[0].itemId; if (!entram.has(id)) manter.delete(f); });
  if (fs.existsSync(dirImg)) fs.readdirSync(dirImg).forEach((f) => { if (!manter.has(f)) { fs.unlinkSync(path.join(dirImg, f)); mudou++; } });
  const arquivos = { meta: a.meta, google: a.google, bling: a.bling, planilha: Buffer.from(a.planilha) };
  Object.keys(arquivos).forEach((k) => { if (gravarSeMudou(path.join(dir, C.ARQUIVOS[k]), arquivos[k])) mudou++; });
  // a assinatura junta tudo o que foi publicado; a hora só muda quando o conteúdo muda
  const h = crypto.createHash('sha256');
  Object.keys(arquivos).forEach((k) => h.update(arquivos[k]));
  Array.from(manter).sort().forEach((f) => h.update(f));
  const assinatura = h.digest('hex').slice(0, 16);
  const antes = lerStatus(dir);
  // pub: a peça tem foto publicada em img/ (se o arquivo sumir, a peça é lida de novo)
  const comFoto = new Set(fotos.filter((f) => manter.has(f.arquivo)).map((f) => f.itemId));
  Object.keys(cache || {}).forEach((id) => { cache[id].pub = comFoto.has(id); });
  const status = {
    slug: slug,
    atualizadoEm: antes && antes.assinatura === assinatura ? antes.atualizadoEm : new Date().toISOString(),
    assinatura: assinatura,
    pecas: entram.size,
    variacoes: a.linhas.length,
    fotos: manter.size,
    arquivos: C.enderecos(slug, o),
    cache: cache || {}
  };
  if (gravarSeMudou(path.join(dir, C.ARQUIVOS.status), JSON.stringify(status, null, 2) + '\n')) mudou++;
  return { slug: slug, pecas: status.pecas, variacoes: status.variacoes, fotos: status.fotos, mudou: mudou };
}

async function principal() {
  fs.mkdirSync(SAIDA, { recursive: true });
  // se nem a lista der para ler, não mexe em nada (melhor manter os links velhos do que apagar)
  let ligadas;
  try { ligadas = await listar('canaisAtivos', 300); } catch (e) {
    // regras novas ainda não publicadas no Firestore: não é erro do workflow, só não há o que publicar
    if (e.status === 403) { log('sem permissão para ler canaisAtivos: publique o firestore.rules novo no console do Firebase.'); return []; }
    throw e;
  }
  log(ligadas.length + ' loja(s) com canais configurados no projeto ' + PROJETO);
  const manter = new Set(), resumo = [];
  for (const cfg of ligadas) {
    const slug = cfg.id;
    if (!SLUG.test(slug) || cfg.slug !== slug) { log('ignorada (endereço inválido):', slug); continue; }
    if (cfg.ativo !== true) { log(slug, 'canais desligados'); continue; }
    try {
      const loja = await ler('lojasPublicas/' + slug);
      if (!loja || !loja.lojaId || loja.lojaId !== cfg.lojaId) { log(slug, 'a loja não confere com a configuração'); continue; }
      if (!lojaNoAr(loja)) { log(slug, 'loja fora do ar (teste vencido ou pausada)'); continue; }
      const antes = lerStatus(path.join(SAIDA, slug)) || {};
      const p = await pecasDaLoja(loja.lojaId, antes.cache || {}, path.join(SAIDA, slug, 'img'));
      const r = publicarLoja(slug, Object.assign({ slug: slug }, loja), p.itens, cfg, p.cache);
      manter.add(slug); resumo.push(r);
      log(slug + ':', r.pecas, 'peças,', r.variacoes, 'variações,', r.fotos, 'fotos,', p.lidas, 'peça(s) lida(s) com foto,', r.mudou ? r.mudou + ' arquivo(s) mudaram' : 'sem mudança');
    } catch (e) {
      // erro passageiro (rede, cota): mantém o que já estava publicado
      manter.add(slug);
      log(slug, 'ERRO, ficou como estava:', e.message);
    }
  }
  // lojas que desligaram os canais ou saíram do ar: os links deixam de existir
  fs.readdirSync(SAIDA, { withFileTypes: true }).forEach((d) => {
    if (d.isDirectory() && !manter.has(d.name)) { apagarPasta(path.join(SAIDA, d.name)); log(d.name, 'removida'); }
  });
  gravarSeMudou(path.join(SAIDA, 'LEIAME.md'), '# Canais de venda\n\nPasta gerada pelo workflow `.github/workflows/canais.yml` (tools/canais/gerar.js). Não edite à mão: é refeita a cada 3 horas a partir do painel de cada loja.\n');
  return resumo;
}

if (require.main === module) {
  principal().catch((e) => { console.error('[canais] falhou:', e.message); process.exit(1); });
}
module.exports = { principal, publicarLoja, lojaNoAr, documento, valor };
