# Pré-builds (modelos de site)

A vitrine é uma só. A lojista escolhe **o modelo do site** (pré-build) e **a cor** dos menus e botões.
A loja guarda as duas escolhas num campo só, `vitrine`: prefixo do modelo + cor.

| Nº | Modelo | Prefixo | Exemplo de `vitrine` | Onde estão as telas | Referência |
|----|--------|---------|----------------------|---------------------|------------|
| 1 | Clássico | (nenhum) | `pink-pulse` | `vitrines/<cor>/` (geradas por `tools/gerar_vitrines.py`) | Mockup aprovado da Ais Moda Fitness |
| 2 | Arena | `arena-` | `arena-pink-pulse` | `vitrines/_modelos/arena/` | Estrutura do tema Fitfinity (Shopify), sem fotos nem textos de lá |
| 3 | Pulso | `pulso-` | `pulso-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `pulso/pulso.css` | Estrutura estudada na CajuBrasil, sem fotos nem textos de lá |
| 4 | Aura | `aura-` | `aura-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `aura/aura.css` | Estrutura estudada na Massam, sem fotos nem textos de lá |
| 5 | Impacto | `impacto-` | `impacto-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `impacto/impacto.css` | Estrutura estudada na DLK, sem fotos nem textos de lá |
| 6 | Cetim | `cetim-` | `cetim-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `cetim/cetim.css` | Estrutura estudada na Fitmoda, sem fotos nem textos de lá |
| 7 | Trilha | `trilha-` | `trilha-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `trilha/trilha.css` | Estrutura estudada na Bro Fitwear, sem fotos nem textos de lá |
| 8 | Vibe | `vibe-` | `vibe-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `vibe/vibe.css` | Estrutura estudada na Manalinda, sem fotos nem textos de lá |
| 9 | Leve | `leve-` | `leve-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `leve/leve.css` | Estrutura estudada na Arm Fitness, sem fotos nem textos de lá |
| 10 | Nobre | `nobre-` | `nobre-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `nobre/nobre.css` | Estrutura estudada na Be Rich Moda Fitness, sem fotos nem textos de lá |
| 11 | Ritmo | `ritmo-` | `ritmo-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `ritmo/ritmo.css` | Estrutura estudada na Track&Field, sem fotos nem textos de lá |
| 12 | Contraste | `contraste-` | `contraste-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `contraste/contraste.css` | Estrutura estudada na Divina Fitness (Atara), sem fotos nem textos de lá |
| 13 | Studio | `studio-` | `studio-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `studio/studio.css` | Estrutura estudada na LIVE!, sem fotos nem textos de lá |
| 14 | Bloco | `bloco-` | `bloco-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `bloco/bloco.css` | Estrutura estudada na Lupo, sem fotos nem textos de lá |
| 15 | Foco | `foco-` | `foco-pink-pulse` | motor comum `vitrines/_modelos/_base/` + `foco/foco.css` | Estrutura estudada na Body For Sure, sem fotos nem textos de lá |

As cores são as 15 do `vitrines/catalogo.json`, com os mesmos slugs. Cada modelo novo traz a sua versão das 15 cores em `modelos.json`.
Como o slug continua no formato antigo, nada muda no Firestore nem nas regras.

## Quem usa o quê

- `modelos.json`: lista dos modelos. O site de vendas, o montador e o painel leem daqui.
- `assets/js/vitrine-loader.js`: separa modelo e cor (`separar`), carrega o `script` do modelo e abre a tela da `pasta`. Tela que o modelo não tem (Painel, AppCliente, AppVendas) sai do modelo 1 na mesma cor.
- `shared/plataforma.js`: `modelos()`, `separarVitrine()` e `nomeVitrine()` ("Arena · Pink Pulse").
- `assets/js/site.js`, `montar/montar.js`, `painel/telas.js`: botões de modelo + cores.

## Contrato de um modelo novo (`"dados": "props"`)

Entrada em `modelos.json`:

```json
{ "slug": "arena", "numero": 2, "nome": "Arena", "prefixo": "arena-", "dados": "props",
  "pasta": "vitrines/_modelos/arena", "script": "vitrines/_modelos/arena/arena.js",
  "paginas": ["Main", "Colecao", "Produto", "Sacola"],
  "descricao": "...", "origem": "...", "foto": "vitrines/_fotos/arena-hero-1.jpg", "fontes": ["..."],
  "cores": { "grafite-lima": { "nome": "Grafite Lima", "modo": "escuro", "bg": "#..", "surface": "#..", "line": "#..", "accent": "#..", "onAccent": "#..", "accent2": "#.." }, "...": {} } }
```

Cada tela é um `.dc.html` no formato do canvas (`<x-dc>`, `<helmet>`, `{{caminho}}`, `<sc-for>`, `<sc-if>`, `class Component extends DCLogic`), rodado por `assets/js/dc-runtime.js`.

O carregador entrega em `this.props`:

| prop | o que é |
|------|---------|
| `cor` | `{ slug, nome, modo, bg, surface, line, accent, onAccent, accent2 }` |
| `itens` | peças da loja (ou de demonstração): `{ id, nome, cat, cor, hex, preco, tamanhos, img, img2?, novo?, descricao? }` |
| `demo` | `true` quando as peças são de demonstração (aí entram as fotos de ambiente e os links externos ficam desligados) |
| `item`, `cat`, `busca` | vindos do endereço: `?item=`, `?cat=`, `?q=` |
| `chave` | onde a sacola e os favoritos ficam no navegador |
| `links` | `{ inicio, colecao, produto, sacola }` já com a loja no endereço |

Marcas da loja no próprio arquivo, trocadas antes de abrir: `@@NOME@@`, `@@MARCA@@`, `@@WHATS@@`, `@@IG@@`, `@@CIDADE@@`, `@@CIDADE_CURTA@@`, `@@INICIAIS@@`.
Links entre telas: `href="Colecao.dc.html"`, `href="Produto.dc.html?item={{p.id}}"`, `href="Colecao.dc.html?cat=tops"`, `href="Main.dc.html#sobre"`.

Regras que valem para todo modelo:

1. Nada de foto, texto, logo ou cor copiados do site de referência. Copia-se a **estrutura** (ordem das seções, componentes, comportamento) e o **clima**; o desenho é próprio.
2. Fotos de ambiente em `vitrines/_fotos/<modelo>-*.jpg`, com licença livre (Unsplash/Pexels) e crédito anotado. Produtos vêm sempre de `itens`.
3. Fontes do Google Fonts (SIL OFL) baixadas em `assets/fonts/<modelo>/` e declaradas no CSS do modelo. Sem rede externa nas telas.
4. Sem avaliação inventada, contador de "vendidos agora" ou estoque falso. Só o que a loja tem de verdade.
5. Até o gateway de pagamento chegar, a sacola fecha o pedido pelo WhatsApp da loja.
6. Funciona em 1440 px e em 390 px, sem rolagem para o lado, nas 15 cores (2 delas claras).

## Motor comum (modelos 3 a 15)

Os modelos 3 em diante não têm telas próprias: usam as mesmas 4 telas e o mesmo kit, e cada um muda só **layout, textos, fotos, cores e uma folha de estilo**.

| Peça | Onde | O que faz |
|------|------|-----------|
| Telas | `tools/prebuild/fontes/_base/*.src.html` + `partes.py` → `vitrines/_modelos/_base/*.dc.html` | Início, Coleção, Produto e Sacola com topo, rodapé e cartão comuns. Gerados pelo `partes.py` (o workflow roda). |
| Kit | `vitrines/_modelos/_base/kit.js` (`window.PrebuildKit`) | Catálogo, sacola, favoritos, WhatsApp e a montagem das seções da página inicial a partir do `layout` do modelo. |
| Desenho comum | `vitrines/_modelos/_base/base.css` | Todas as variantes (`data-topo`, `data-cartao`, `v-banner`, `v-tela`...). Tokens (`--f-display`, `--h-tam`, `--r-btn`...) que a folha do modelo muda. |
| Cara do modelo | `vitrines/_modelos/<modelo>/<modelo>.css` | Fontes (`@font-face` em `assets/fonts/<modelo>/`), tokens e os detalhes que fazem o modelo parecer o site estudado. |
| Registro | `tools/prebuild/modelos_motor.py` → `modelos.json` | Nome, número, layout, textos, fotos e as 15 cores (geradas por `tools/prebuild/paleta.py`). O workflow roda. |
| Fotos e fontes | `tools/prebuild/ativos.json` + `baixar_ativos.py` | Lista de fotos livres (Unsplash) e fontes (Google Fonts, OFL). O workflow baixa para `vitrines/_fotos/amb-*.jpg` e `assets/fonts/<modelo>/`. Créditos em `vitrines/_fotos/CREDITOS-AMBIENTE.md`. |

O carregador (`vitrine-loader.js`) põe `estilos` na página em ordem (`base.css` e depois a folha do modelo) e entrega `props.modelo = { slug, nome, numero, layout, textos, fotos }`.

### Layout de um modelo (`modelos_motor.py`)

Raiz: `topo` (`classico`, `central`, `busca`, `minimo`), `sobreposto` (cabeçalho por cima da foto), `aviso` (`faixa`, `setas`, `lista`, `corrida`), `cartao` (`simples`, `botao`, `contorno`, `pilula`, `centro`, `tamanhos`), `rodape` (`claro`, `escuro`, `cor`), `titulos` (`esquerda`, `centro`), `faixa`, `filtros`, `galeria`, `colunas`.

Seções de `inicio` (cada uma com `variante`, `titulo`, `subtitulo`, `classe`, `fundo`):

| tipo | variantes |
|------|-----------|
| `hero` | `banner`, `tela`, `dividido`, `recorte`, `lista`; `nav`: `barras`, `miniaturas`, `setas`; classe `direita` |
| `beneficios` | `faixa`, `cartao`, `escura`, `destaque`, `centro` |
| `categorias` | `retratos`, `blocos`, `cartoes`, `sobre`, `faixa`, `circulos`, `mosaico`, `destaques`, `procura`; classe `colado`; `fotos: 'ambiente'` usa `fotos.usos` na demonstração |
| `vitrine` | `grade`, `carrossel`, `dividida`; `filtro` (`novos`, `todos`, `roupas`, `cat:x`, `cats:a,b`), `abas`, `etiqueta`, `n` |
| `banner` | `padrao`, `centro`, `cor`, `faixa`; `cores: True` mostra as amostras; classe `cinza` deixa a foto P&B |
| `duplo`, `usos`, `sobre` (`editorial`, `invertido`), `looks`, `tamanhos`, `passos`, `instagram`, `contato`, `faq` | |

Textos: sem promessa que a loja não cumpre (nada de "mais vendidos", avaliação ou desconto inventado). O Pix com 5% é o do kit.

### Modelo novo pelo motor (o caminho curto)

1. Estudar o site de referência (estrutura, tipografia, raios, botões, celular).
2. Escolher fontes OFL e fotos livres; pôr em `tools/prebuild/ativos.json` (o workflow baixa). Evitar foto com logo de marca ou marca d'água.
3. Escrever a entrada em `tools/prebuild/modelos_motor.py` (layout, textos, fotos, `fundo`/`suave`/`accent2`) e a folha `vitrines/_modelos/<modelo>/<modelo>.css`.
4. Rodar `python3 tools/prebuild/modelos_motor.py` e conferir (passo 6 abaixo). Variante nova que outros modelos podem usar vai no `base.css`, não na folha do modelo.
5. Publicar as folhas primeiro e o `modelos_motor.py` por último (ou tudo no mesmo commit): o workflow gera `modelos.json` e as telas.

## Passo a passo para clonar o próximo site

1. **Estudo.** Abrir o site de referência no navegador (se tiver senha, o dono destranca). Anotar de Início, Coleção e Produto: ordem das seções, componentes (slider, abas, filtros, galeria, sacola), tipografia, raios, formato dos botões, cores e o que o tema faz no celular. Guardar só as anotações.
2. **Identidade própria.** Escolher nome, 1 a 3 fontes OFL e uma forma marcante que não exista nos modelos anteriores. Montar as 15 cores do modelo (mesmos nomes e slugs do catálogo).
3. **Fotos.** Reaproveitar o catálogo de demonstração (`vitrines/_fotos/c*, m*, q*, l*, t*, a*`). Buscar fotos livres novas só para ambiente (destaque, banner, sobre, looks, Instagram). Subir para `vitrines/_fotos/` e anotar os créditos.
4. **Mockup** no canvas de design (Início, Coleção, Produto, celular e quadro das 15 cores) e aprovação do dono antes de programar.
5. **Programar** em `vitrines/_modelos/<modelo>/`: CSS comum, kit JS (catálogo, sacola, WhatsApp) e as 4 telas, seguindo o contrato acima. O jeito mais curto é copiar a Arena:
   - `tools/prebuild/fontes/arena/` → `tools/prebuild/fontes/<modelo>/` (telas `*.src.html` + `partes.py` com topo, rodapé e cartão comuns). Editar as fontes e rodar `python3 tools/prebuild/fontes/<modelo>/partes.py`, que gera os `.dc.html` em `vitrines/_modelos/<modelo>/`.
   - `arena.css` e `arena.js` → `<modelo>.css` e `<modelo>.js` (o kit fica em `window.<Modelo>Kit`). A raiz de cada tela leva a classe `<modelo>` e as cores em variáveis CSS (`--bg`, `--surface`, `--line`, `--accent`, `--on-accent`, `--accent2`).
   - Registrar o modelo em `modelos.json` com `numero` seguinte e `prefixo` `<modelo>-`. O site de vendas, o montador e o painel leem dali; não precisam mudar.
6. **Conferir** antes de publicar:
   ```
   python3 -m http.server 8800
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <modelo> --todas-as-cores --larguras 1440
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <modelo>-grafite-lima --larguras 1440,1100,390
   node tools/prebuild/conferir.js http://127.0.0.1:8800 grafite-lima --larguras 1440
   node tools/prebuild/integracao.js http://127.0.0.1:8800 <modelo>
   ```
   O terceiro confere que o modelo 1 continua igual. O `integracao.js` confere o modelo no site de vendas, no montador (bolinhas de cor da prévia), numa loja de verdade até o pedido no WhatsApp e no painel.
7. **Publicar** no GitHub. Com `git push` disponível, é o normal. Sem ele (sessão em nuvem), `tools/prebuild/publicar_pelo_navegador.py` gera os trechos para a página de upload e para o editor do GitHub, com conferência de hash. Nunca publicar `config/plataforma.config.js` (a chave é colada pelo dono). Conferir no ar (`vitrine.html?v=<modelo>-grafite-lima`) com o subcomando `conferir`.
8. **Registrar** a linha do modelo na tabela do topo deste arquivo e no documento do projeto.

## Ferramentas (`tools/prebuild/`)

| Arquivo | Para quê |
|---------|----------|
| `conferir.js` | Telas da vitrine em várias larguras e cores: erro de JS, arquivo que não carregou, foto quebrada, rolagem para o lado e compra até a sacola. |
| `integracao.js` | O modelo no site de vendas, no montador, numa loja de verdade (pedido no WhatsApp) e no painel, em modo demonstração. |
| `fontes/<modelo>/` | Fontes das telas (`*.src.html`) e `partes.py`, que monta os `.dc.html` com as partes comuns. |
| `publicar_pelo_navegador.py` | Publicar pelo navegador quando não há `git push`: `novos` (com `--raiz` sobe subpastas no mesmo commit), `patch`, `inteiro`, `mensagem` e `conferir`. |
| `modelos_motor.py`, `paleta.py` | Registro dos modelos do motor comum e as 15 cores de cada um. |
| `ativos.json`, `baixar_ativos.py` | Fotos e fontes livres que o workflow baixa. |

## Créditos das fotos de ambiente da Arena

Unsplash License. Arquivos em `vitrines/_fotos/` (endereço de origem no CDN do Unsplash):

| Arquivo | Origem |
|---------|--------|
| arena-hero-1 | images.unsplash.com/photo-1548690312-e3b507d8c110 |
| arena-hero-2 | images.unsplash.com/photo-1683587023194-a24e5b6549b0 |
| arena-hero-3 | images.unsplash.com/photo-1708011108850-49646bd34503 |
| arena-sobre | images.unsplash.com/photo-1539794830467-1f1755804d13 |
| arena-banner | images.unsplash.com/photo-1434682772747-f16d3ea162c3 |
| arena-colecao | images.unsplash.com/photo-1770513649465-2c60c8039806 |
| arena-look-1 | images.unsplash.com/photo-1788463127375-423984537d89 |
| arena-look-2 | images.unsplash.com/photo-1768853990312-0e20e64cf87f |
| arena-look-3 | images.unsplash.com/photo-1787089574329-3b6749ced7d6 |
| arena-ig-1 | images.unsplash.com/photo-1595078475328-1ab05d0a6a0e |
| arena-ig-2 | images.unsplash.com/photo-1722925541142-5db2668ca492 |
| arena-ig-3 | images.unsplash.com/photo-1567013275689-c179a874478f |
| arena-ig-4 | images.unsplash.com/photo-1772450014685-369473acebc2 |
| arena-ig-5 | images.unsplash.com/photo-1728485302581-6d37f2273027 |
| arena-ig-6 | images.unsplash.com/photo-1708011108776-45ad9e625269 |

Falta anotar o nome de cada autor (a licença não exige, mas é boa prática).
