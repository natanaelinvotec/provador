#!/usr/bin/env python3
"""
baixar_ativos.py — baixa as fotos de ambiente e as fontes listadas em tools/prebuild/ativos.json.

Roda no workflow "Pré-builds" (.github/workflows/prebuilds.yml), que tem internet, e também no computador.
Só aceita endereços https de images.unsplash.com, fonts.googleapis.com e fonts.gstatic.com.
O que já existe no repositório não é baixado de novo. Também escreve vitrines/_fotos/CREDITOS-AMBIENTE.md.
"""
import json, pathlib, re, sys, time, urllib.request, urllib.parse

RAIZ = pathlib.Path(__file__).resolve().parents[2]
HOSTS = {'images.unsplash.com', 'fonts.googleapis.com', 'fonts.gstatic.com'}
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
LIMITE = 4 * 1024 * 1024


def baixar(url):
    u = urllib.parse.urlparse(url)
    if u.scheme != 'https' or u.hostname not in HOSTS:
        raise ValueError('endereço fora da lista: ' + url)
    for tentativa in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                dados = r.read(LIMITE + 1)
            if len(dados) > LIMITE:
                raise ValueError('arquivo grande demais: ' + url)
            return dados
        except Exception as e:  # rede instável: tenta de novo
            erro = e
            time.sleep(2 + tentativa * 3)
    raise erro


def fotos(m):
    pasta = RAIZ / 'vitrines/_fotos'
    pasta.mkdir(parents=True, exist_ok=True)
    novas = 0
    for f in m.get('fotos', []):
        if not re.fullmatch(r'[a-z0-9-]+', f['nome']) or not re.fullmatch(r'photo-[0-9a-z-]+', f['foto']):
            raise ValueError('nome de foto inválido: %r' % f)
        destino = pasta / (f['nome'] + '.jpg')
        if destino.exists():
            continue
        dados = baixar('https://images.unsplash.com/%s?w=1400&q=70&fm=jpg&fit=max' % f['foto'])
        if dados[:3] != b'\xff\xd8\xff':
            raise ValueError('não é JPEG: ' + f['nome'])
        destino.write_bytes(dados)
        novas += 1
        print('foto', f['nome'], len(dados) // 1024, 'KB')
    linhas = ['# Créditos das fotos de ambiente', '', 'Licença Unsplash (uso livre, sem obrigação de crédito; o crédito fica aqui por boa prática).', '',
              '| Arquivo | Autor | Página |', '|---|---|---|']
    for f in m.get('fotos', []):
        linhas.append('| %s.jpg | %s | %s |' % (f['nome'], f.get('autor', ''), f.get('pagina', '')))
    (pasta / 'CREDITOS-AMBIENTE.md').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    return novas


def fontes(m):
    novas = 0
    for g in m.get('fontes', []):
        if not re.fullmatch(r'[a-z0-9-]+', g['modelo']) or not re.fullmatch(r'[A-Za-z0-9]+', g['nome']):
            raise ValueError('fonte inválida: %r' % g)
        pasta = RAIZ / 'assets/fonts' / g['modelo']
        css = baixar('https://fonts.googleapis.com/css2?family=%s&display=swap' % g['q']).decode('utf-8')
        for bloco in re.findall(r'/\*\s*latin\s*\*/\s*@font-face\s*\{([^}]*)\}', css):
            estilo = (re.search(r'font-style:\s*(\w+)', bloco) or [None, 'normal'])[1]
            peso = (re.search(r'font-weight:\s*([\d ]+)', bloco) or [None, '400'])[1].strip()
            url = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', bloco)
            if not url:
                continue
            nome = g['nome'] + ('-Italic' if estilo == 'italic' else '') + ('' if ' ' in peso else '-' + peso) + '.woff2'
            destino = pasta / nome
            if destino.exists():
                continue
            dados = baixar(url.group(1))
            if dados[:4] != b'wOF2':
                raise ValueError('não é woff2: ' + nome)
            pasta.mkdir(parents=True, exist_ok=True)
            destino.write_bytes(dados)
            novas += 1
            print('fonte', g['modelo'], nome, len(dados) // 1024, 'KB')
    return novas


if __name__ == '__main__':
    m = json.loads((RAIZ / 'tools/prebuild/ativos.json').read_text(encoding='utf-8'))
    print('fotos novas:', fotos(m), '| fontes novas:', fontes(m))
