---
name: clonar-prebuild
description: Use quando o dono do Provador mandar o link de um ou mais sites de referência para virar pré-build (modelo de site) da vitrine, pedir para refazer ou ajustar um modelo, ou pedir para seguir os mesmos passos da Arena e dos modelos 3 a 15.
---

# Clonar um site de referência como pré-build do Provador

O Provador (repositório `natanaelinvotec/provador`, GitHub Pages em https://natanaelinvotec.github.io/provador/) tem **uma vitrine só**. A lojista escolhe **o modelo do site** (pré-build) e **a cor** dos menus e botões. A loja guarda as duas escolhas no campo `vitrine`: prefixo do modelo + cor (ex.: `pulso-pink-pulse`; sem prefixo = modelo 1, Clássico).

Os 15 modelos existem: 1 Clássico, 2 Arena (telas próprias) e 3 a 15 no **motor comum** (Pulso, Aura, Impacto, Cetim, Trilha, Vibe, Leve, Nobre, Ritmo, Contraste, Studio, Bloco, Foco). Um link novo vira o modelo 16 em diante ou substitui um modelo que o dono indicar.

Responda sempre em português do Brasil. A fonte da verdade é `vitrines/_modelos/README.md` (seção "Motor comum"): leia antes de começar. Leia também o documento do projeto `claude/provador-plataforma.md` (Projects).

## Regras que não mudam

- Copiar só a **estrutura** e o **clima** do site de referência (ordem das seções, componentes, tipografia, raios, comportamento no celular). Nada de foto, texto, logo ou paleta de lá. Nome, fontes e forma marcante são próprios.
- Fotos de ambiente livres (Unsplash), olhadas uma a uma: sem logo de marca, sem marca d'água, sem homem como foco (o público é moda fitness feminina). Crédito em `vitrines/_fotos/CREDITOS-AMBIENTE.md`. Produtos sempre vêm de `itens`.
- Fontes do Google Fonts (SIL OFL) em `assets/fonts/<modelo>/`. Sem rede externa nas telas.
- Sem avaliação inventada, "mais vendidos", "vendidos agora" ou estoque falso. Checkout pelo WhatsApp da loja; 5% no Pix é o do kit.
- Funcionar em 1440 px e 390 px, sem rolagem para o lado, nas 15 cores (13 escuras, 2 claras: `areia-oliva`, `ceu-pastel`).
- Não usar a palavra "teste" em nomes de recursos. O valor interno `status: 'teste'` pode ficar.
- Nunca publicar `config/plataforma.config.js` e nunca digitar ou repetir a apiKey. Não mexer em configuração de segurança do Google Cloud/Firebase.
- Se o site de referência tiver senha, o dono destranca no navegador. Não passar por CAPTCHA.

## Aprovação do mockup

- **Um link por vez:** mockup (Início, Coleção, Produto, celular e quadro das 15 cores) e **esperar aprovação** antes de programar.
- **Vários links com "completo" / "igual ao último":** o dono já autorizou tudo. Pular a aprovação, programar, testar e publicar todos, e dizer isso na resposta final.

## Passo a passo (motor comum, o caminho curto)

1. **Preparar.** `git clone` ou `git pull` em `/tmp/provrepo`; `python3 -m http.server 8800` em segundo plano. Ler `tools/prebuild/modelos_motor.py` para o próximo `numero`.
2. **Estudar** cada site no navegador (Início, Coleção, Produto em 1440 e no celular). Guardar só anotações: ordem das seções, topo (transparente sobre a foto?), faixa de aviso, cartão de produto, títulos, rodapé, o que muda no celular.
3. **Traduzir para o motor.** Cada site vira uma entrada `modelo(...)` em `tools/prebuild/modelos_motor.py`:
   - `slug` (uma palavra, vira o prefixo `<slug>-`), `numero`, `nome`, `descricao`, `origem` ("Estrutura estudada na X; fotos, textos, fontes e cores próprios"), `fontes`;
   - cores: `esquema`, `fundo`, `tinge`, `deep`, `superficie`, `suave`, `accent2` (as 15 cores saem de `paleta.py` a partir das da Arena);
   - `layout`: `topo`, `sobreposto`, `aviso`, `cartao`, `rodape`, `titulos`, `faixa`, `filtros`, `galeria`, `colunas` e a lista `inicio` de seções (`hero`, `beneficios`, `categorias`, `vitrine`, `banner`, `duplo`, `usos`, `sobre`, `looks`, `tamanhos`, `passos`, `instagram`, `contato`, `faq`), cada uma com `variante`/`classe`/`fundo`/`nav` (tabela no README);
   - `textos` (avisos e `slides(...)` do destaque) e `fotos` (hero, banner, duplo, usos, sobre, looks, ig, contato...).
4. **Cara do modelo:** `vitrines/_modelos/<slug>/<slug>.css` com `@font-face` de `../../../assets/fonts/<slug>/`, tokens na raiz `.pb-<slug>` (`--f-display`, `--h-tam`, `--r-btn`...), os detalhes que lembram o site estudado e as regras de celular. Variante que outro modelo pode usar vai no `_base/base.css`; comportamento novo vai no `_base/kit.js` ou nas telas `tools/prebuild/fontes/_base/*.src.html`.
5. **Fotos e fontes:** novas linhas em `tools/prebuild/ativos.json` (o workflow baixa para `vitrines/_fotos/amb-*.jpg` e `assets/fonts/<slug>/`). Localmente: `python3 tools/prebuild/baixar_ativos.py` se houver rede; senão reaproveitar fotos `amb-*` que já estão no repositório.
6. **Gerar localmente:** `python3 tools/prebuild/fontes/_base/partes.py` e `python3 tools/prebuild/modelos_motor.py` (gera `vitrines/_modelos/_base/*.dc.html` e `modelos.json`; nunca editar à mão). Site de vendas, montador e painel leem o `modelos.json` e não precisam mudar.
7. **Conferir** (todos precisam passar):
   ```
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <slug> --todas-as-cores --larguras 1440 --saida shots/cores
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <slug>-pink-pulse --larguras 1440,390 --saida shots/r1
   node tools/prebuild/conferir.js http://127.0.0.1:8800 pink-pulse --larguras 1440
   node tools/prebuild/conferir.js http://127.0.0.1:8800 arena-pink-pulse --larguras 1440
   node tools/prebuild/integracao.js http://127.0.0.1:8800 <slug>
   ```
   Depois **olhar** os screenshots de Início, Coleção, Produto e Sacola em 1440 e 390: recorte da foto do destaque (rosto ou braço cortado, texto em cima do rosto), título que estoura, menu que quebra linha, rótulo sumindo em foto clara, grade quebrada com poucos itens.
8. **Publicar** (ver abaixo). Subir só as fontes: folhas `<slug>.css`, `base.css`, `kit.js`, `fontes/_base/*`, `modelos_motor.py`, `paleta.py`, `ativos.json`. O workflow "Pré-builds" (push em `tools/prebuild/**`) roda `baixar_ativos.py`, `partes.py` e `modelos_motor.py`, grava `vitrines` e `assets` e atualiza o Pages.
9. **Conferir no ar:** `git fetch`, comparar os arquivos gerados pelo workflow com os locais (md5) e `git reset origin/main`. Numa aba do site, rodar o JS de `publicar_pelo_navegador.py conferir /provador/ <arquivos>`: tudo `ok`. Abrir `vitrine.html?v=<slug>-pink-pulse` e conferir raiz `.pb-<slug>`, `--accent`, fotos sem quebra e fontes carregadas.
10. **Registrar:** linha do modelo na tabela do README, créditos das fotos, `claude/provador-plataforma.md` no projeto e o pacote .rar (ou .zip sem `rar`), sem `config/plataforma.config.js`.

## Armadilhas já vistas

- Atributo `data-*` com booleano sai vazio: converter para `'true'`/`'false'` no kit (o topo `sobreposto` não ficava transparente).
- A raiz do motor é `.pb-<slug>` (a Arena usa `.arena`). Seletores de teste precisam aceitar os dois.
- Em JavaScript, nada de acento combinante literal em regex: usar `/[\u0300-\u036f]/g`. Comentário `//` dentro de função de uma linha quebra o arquivo: usar `/* */`.
- Mosaico com 4 itens: colunas com `grid-auto-flow:column`; esconder os excedentes.
- Celular: cartões e destaques viram rolagem lateral dentro da seção (nunca da página); destaque dividido vira uma coluna.
- Logo com ponto ou subtítulo: pôr no `::after` do `span` para não sobrar espaço.

## Publicar pelo navegador (quando não há `git push`)

Ferramenta: `tools/prebuild/publicar_pelo_navegador.py` (o docstring tem os detalhes). Cada trecho confere o hash djb2 antes de salvar. Navegador embutido, aba do GitHub já logada.

- **Vários arquivos de várias pastas num commit só:** `novos --raiz . --saida /tmp/up --msg "..." a/x.css b/y.py ...` e abrir `https://github.com/natanaelinvotec/provador/upload/main`. O nome vai com o caminho e o GitHub cria as subpastas; arquivo que já existe é substituído. Rodar `up_0.js`, `up_1.js`... com a ferramenta de JavaScript (trocar o fim de cada um por `Object.keys(__F).map(k=>k.split('/').pop()+':'+__F[k].length+':'+dj(__F[k])).join(' ')`, com `dj` definido no primeiro, para conferir o hash de cada pedaço), depois `up_fim.js`, `find "Commit changes"` e **clique de verdade** no botão.
- **Arquivo que já existe, mudança pequena:** `patch caminho` em `/edit/main/<caminho>`; só seguir com `ok:true`. Salvar: clique de verdade em "Commit changes...", JS de `mensagem "..."`, clique de verdade no botão do diálogo.
- Trechos de até ~19 KB por chamada (acima de ~25 KB a saída corta). Ler o arquivo do trecho e colar o conteúdo exato.
- Script longo no navegador (aba escondida fica lenta): rodar sem `await` no fim, guardar o resultado em `window.__R` e ler depois.

## O que entregar ao dono

Uma resposta curta em português: os modelos novos no ar (links de Início e do montador), o que foi copiado de cada referência e o que é próprio, os testes que passaram, o que ficou pendente e onde está o pacote. Se pulou a aprovação do mockup por ser "completo", dizer. Nada de lista de commits.
