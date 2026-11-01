#!/usr/bin/env python3
"""
publicar_pelo_navegador.py — gera os trechos de JavaScript para publicar no GitHub pelo navegador
quando o `git push` não está disponível (por exemplo, numa sessão em nuvem sem acesso ao repositório).
Cada trecho confere o conteúdo pelo hash djb2 antes de salvar, então nada sobe pela metade.

Rodar na raiz do repositório (ou de qualquer lugar: o script acha a raiz sozinho).

  1) Arquivos NOVOS de uma mesma pasta (página de upload do GitHub). Fotos e fontes (.jpg, .png, .webp, .woff2)
     vão em base64 e viram bytes de novo no navegador:
       python3 tools/prebuild/publicar_pelo_navegador.py novos --saida /tmp/up --msg "Mensagem do commit" pasta/a.css pasta/b.js
     Abrir  https://github.com/<dono>/<repo>/upload/main/<pasta>
     Com --raiz <pasta> os arquivos podem estar em subpastas dela: o nome vai com o caminho (ex.: aura/aura.css)
     e o GitHub cria as subpastas no mesmo commit. Abrir então .../upload/main/<pasta da raiz>
     (--raiz . sobe a partir da raiz do repositório: .../upload/main). Arquivo que já existe é substituído.
     Rodar no console da página, em ordem: /tmp/up_0.js, /tmp/up_1.js, ... e por último /tmp/up_fim.js
     (os pedaços têm até 19 KB para caber numa chamada; o _fim confere os hashes, põe os arquivos e a mensagem).
     Depois clicar de verdade em "Commit changes" (clique de script não vale para o GitHub).

  2) Arquivo que JÁ EXISTE, mudança pequena (editor do GitHub, aplica só as diferenças):
       python3 tools/prebuild/publicar_pelo_navegador.py patch caminho/arquivo.js [--base HEAD]
     Abrir  https://github.com/<dono>/<repo>/edit/main/caminho/arquivo.js  e rodar o JS impresso.
     Ele devolve {len, h, esperado, ok}. Só seguir com ok:true.

  3) Arquivo novo em pasta nova, ou reescrito inteiro (editor do GitHub):
       python3 tools/prebuild/publicar_pelo_navegador.py inteiro caminho/arquivo.js
     Abrir  https://github.com/<dono>/<repo>/new/main?filename=caminho/arquivo.js  (ou /edit/main/...) e rodar o JS.

  Para salvar no editor (2 e 3): achar o botão "Commit changes..." e clicar de verdade; depois rodar
       python3 tools/prebuild/publicar_pelo_navegador.py mensagem "Mensagem do commit"
  que espera o diálogo abrir, preenche a mensagem e limpa a descrição sugerida. Clicar de verdade em "Commit changes".

  4) Conferir no ar (GitHub Pages) se o que está publicado é igual ao local:
       python3 tools/prebuild/publicar_pelo_navegador.py conferir /provador/ arquivo1 arquivo2 ...
     Rodar o JS impresso numa aba do site publicado. Devolve ok/DIFERENTE por arquivo.

Nunca publicar config/plataforma.config.js por aqui: a chave dele é colada pelo dono no próprio GitHub.
"""
import argparse
import base64
import json
import os
import pathlib
import subprocess
import sys
import difflib

RAIZ = pathlib.Path(__file__).resolve().parents[2]
PROIBIDOS = {'config/plataforma.config.js'}
BINARIOS = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2'}
DJB2_JS = "const dj=s=>{let h=5381;for(const ch of s){h=((h*33)^ch.codePointAt(0))>>>0;}return h};"


def djb2(s):
    h = 5381
    for ch in s:
        h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return h


def ler(rel):
    if rel in PROIBIDOS:
        sys.exit('Não publique ' + rel + ' por aqui.')
    if pathlib.PurePosixPath(rel).suffix.lower() in BINARIOS:
        return base64.b64encode((RAIZ / rel).read_bytes()).decode('ascii')
    return (RAIZ / rel).read_text(encoding='utf-8')


def novos(a):
    a.arquivos = [os.path.normpath(f).replace(os.sep, '/') for f in a.arquivos]
    raiz = '' if a.raiz in (None, '.', '/') else a.raiz.strip('/') + '/'  # --raiz . = raiz do repositório
    if a.raiz is not None:
        fora = [f for f in a.arquivos if not f.startswith(raiz)]
        if fora:
            sys.exit('Arquivos fora de --raiz: ' + ', '.join(fora))
    else:
        pastas = {str(pathlib.PurePosixPath(f).parent) for f in a.arquivos}
        if len(pastas) > 1:
            sys.exit('Os arquivos precisam estar na mesma pasta (ou use --raiz): ' + ', '.join(sorted(pastas)))
    nomear = (lambda f: f[len(raiz):]) if a.raiz is not None else os.path.basename
    partes, atual, tam = [], [], 0
    for f in a.arquivos:  # enche cada pedaço até o limite, emendando o fim de um arquivo no começo do outro
        t, nome, i = ler(f), nomear(f), 0
        while i < len(t):
            cabe = a.limite - tam
            if cabe < 500 and atual:
                partes.append(atual); atual, tam, cabe = [], 0, a.limite
            pedaco = t[i:i + cabe]
            atual.append((nome, pedaco)); tam += len(pedaco); i += len(pedaco)
    if atual:
        partes.append(atual)
    for k, p in enumerate(partes):
        js = ("window.__F={};" if k == 0 else "") + "".join(
            "__F[%s]=(__F[%s]||'')+%s;" % (json.dumps(n), json.dumps(n), json.dumps(c, ensure_ascii=False)) for n, c in p
        ) + "Object.keys(__F).map(k=>k+':'+__F[k].length).join(' ')"
        pathlib.Path('%s_%d.js' % (a.saida, k)).write_text(js, encoding='utf-8')
    esperado = {nomear(f): djb2(ler(f)) for f in a.arquivos}
    binarios = {nomear(f): BINARIOS[pathlib.PurePosixPath(f).suffix.lower()] for f in a.arquivos if pathlib.PurePosixPath(f).suffix.lower() in BINARIOS}
    tipos = "k.endsWith('.css')?'text/css':k.endsWith('.js')?'text/javascript':k.endsWith('.json')?'application/json':k.endsWith('.md')?'text/markdown':k.endsWith('.py')?'text/x-python':'text/html'"
    fim = (
        "const MSG=" + json.dumps(a.msg, ensure_ascii=False) + ";const E=" + json.dumps(esperado) + ";" + DJB2_JS +
        "const ruim=Object.keys(E).filter(k=>!__F[k]||dj(__F[k])!==E[k]);if(ruim.length)throw new Error('conteudo diferente: '+ruim.join(','));"
        "const B=" + json.dumps(binarios) + ";const dt=new DataTransfer();for(const k of Object.keys(E)){const tipo=B[k]||(" + tipos + ");"
        "const corpo=B[k]?Uint8Array.from(atob(__F[k]),c=>c.charCodeAt(0)):__F[k];dt.items.add(new File([corpo],k,{type:tipo}));}"
        "const inp=document.querySelector('input[type=file]');inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));"
        "await new Promise(r=>setTimeout(r,4000));"
        "const m=document.querySelector('input[name=\"message\"]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;"
        "set.call(m,MSG);m.dispatchEvent(new Event('input',{bubbles:true}));"
        "({arquivos:Object.keys(E).length,mensagem:m.value})"
    )
    pathlib.Path(a.saida + '_fim.js').write_text(fim, encoding='utf-8')
    print(len(partes), 'pedaços +', a.saida + '_fim.js')
    for k in range(len(partes)):
        print(' ', '%s_%d.js' % (a.saida, k), os.path.getsize('%s_%d.js' % (a.saida, k)), 'bytes')


def _editor(texto_js_final, esperado):
    return ("await new Promise(r=>setTimeout(r,1200));const v=document.querySelector('.cm-content').cmTile.view;" + texto_js_final +
            "let h=5381;const s=v.state.doc.toString();for(const ch of s){h=((h*33)^ch.codePointAt(0))>>>0;}"
            "({len:s.length,h,esperado:" + str(esperado) + ",ok:h===" + str(esperado) + "})")


def patch(a):
    antes = subprocess.run(['git', '-C', str(RAIZ), 'show', a.base + ':' + a.arquivo], capture_output=True, text=True, check=True).stdout
    depois = ler(a.arquivo)
    al, bl = antes.splitlines(keepends=True), depois.splitlines(keepends=True)
    sm = difflib.SequenceMatcher(None, al, bl, autojunk=False)
    pares = []
    for g in sm.get_grouped_opcodes(0):
        i1, i2, j1, j2 = g[0][1], g[-1][2], g[0][3], g[-1][4]
        n = 0
        while True:  # cresce o contexto até o trecho antigo ser único no arquivo
            velho = ''.join(al[max(0, i1 - n):min(len(al), i2 + n)])
            if velho and antes.count(velho) == 1:
                break
            n += 1
        novo = ''.join(al[max(0, i1 - n):i1]) + ''.join(bl[j1:j2]) + ''.join(al[i2:min(len(al), i2 + n)])
        pares.append([velho, novo])
    t = antes
    for o, n in pares:
        i = t.find(o); assert i >= 0 and t.find(o, i + 1) < 0
        t = t[:i] + n + t[i + len(o):]
    assert t == depois, 'o patch não reproduz o arquivo'
    corpo = ("let t=v.state.doc.toString();const P=" + json.dumps(pares, ensure_ascii=False) +
             ";for(const [a,b] of P){const i=t.indexOf(a);if(i<0||t.indexOf(a,i+1)>=0)throw new Error('patch falhou: '+a.slice(0,80));t=t.slice(0,i)+b+t.slice(i+a.length);}"
             "v.dispatch({changes:{from:0,to:v.state.doc.length,insert:t}});")
    print(_editor(corpo, djb2(depois)))


def inteiro(a):
    t = ler(a.arquivo)
    corpo = "const T=" + json.dumps(t, ensure_ascii=False) + ";v.dispatch({changes:{from:0,to:v.state.doc.length,insert:T}});"
    print(_editor(corpo, djb2(t)))


def mensagem(a):
    print("(async()=>{let inp=null;for(let i=0;i<20;i++){inp=document.querySelector('input[placeholder^=\"Create \"],input[placeholder^=\"Update \"]');if(inp)break;await new Promise(r=>setTimeout(r,300));}"
          "if(!inp)return {erro:'o diálogo de commit não abriu'};"
          "const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(inp," + json.dumps(a.texto, ensure_ascii=False) + ");inp.dispatchEvent(new Event('input',{bubbles:true}));"
          "const ta=[...document.querySelectorAll('textarea')].find(t=>t.offsetParent&&t.closest('[role=dialog]'));"
          "if(ta){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta,'');ta.dispatchEvent(new Event('input',{bubbles:true}));}"
          "return {mensagem:inp.value};})()")


def conferir(a):
    esperado = {f: djb2(ler(f)) for f in a.arquivos}
    base = a.base if a.base.endswith('/') else a.base + '/'
    print("(async()=>{" + DJB2_JS + "const E=" + json.dumps(esperado) + ";const o={};for(const f of Object.keys(E)){const r=await fetch(" +
          json.dumps(base) + "+f+'?nc='+Date.now(),{cache:'no-store'});const t=await r.text();o[f]=r.status!==200?'HTTP '+r.status:(dj(t)===E[f]?'ok':'DIFERENTE');}return o;})()")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest='cmd', required=True)
    n = s.add_parser('novos'); n.add_argument('--saida', required=True); n.add_argument('--msg', required=True); n.add_argument('--raiz')
    n.add_argument('--limite', type=int, default=19000); n.add_argument('arquivos', nargs='+'); n.set_defaults(f=novos)
    pt = s.add_parser('patch'); pt.add_argument('arquivo'); pt.add_argument('--base', default='HEAD'); pt.set_defaults(f=patch)
    i = s.add_parser('inteiro'); i.add_argument('arquivo'); i.set_defaults(f=inteiro)
    m = s.add_parser('mensagem'); m.add_argument('texto'); m.set_defaults(f=mensagem)
    c = s.add_parser('conferir'); c.add_argument('base'); c.add_argument('arquivos', nargs='+'); c.set_defaults(f=conferir)
    a = p.parse_args()
    a.f(a)


if __name__ == '__main__':
    main()
