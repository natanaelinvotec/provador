# Pré-builds (modelos de site)

A vitrine é uma só. A lojista escolhe **o modelo do site** (pré-build) e **a cor** dos menus e botões.
A loja guarda as duas escolhas num campo só, `vitrine`: prefixo do modelo + cor.

| Nº | Modelo | Prefixo | Exemplo de `vitrine` | Onde estão as telas | Referência |
|----|--------|---------|----------------------|---------------------|------------|
| 1 | Clássico | (nenhum) | `pink-pulse` | `vitrines/<cor>/` (geradas por `tools/gerar_vitrines.py`) | Mockup aprovado da Ais Moda Fitness |
| 2 | Arena | `arena-` | `arena-pink-pulse` | `vitrines/_modelos/arena/` | Estrutura do tema Fitfinity (Shopify), sem fotos nem textos de lá |

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

## Passo a passo para clonar o próximo site

1. **Estudo.** Abrir o site de referência no navegador (se tiver senha, o dono destranca). Anotar de Início, Coleção e Produto: ordem das seções, componentes (slider, abas, filtros, galeria, sacola), tipografia, raios, formato dos botões, cores e o que o tema faz no celular. Guardar só as anotações.
2. **Identidade própria.** Escolher nome, 1 a 3 fontes OFL e uma forma marcante que não exista nos modelos anteriores. Montar as 15 cores do modelo (mesmos nomes e slugs do catálogo).
3. **Fotos.** Reaproveitar o catálogo de demonstração (`vitrines/_fotos/c*, m*, q*, l*, t*, a*`). Buscar fotos livres novas só para ambiente (destaque, banner, sobre, looks, Instagram). Subir para `vitrines/_fotos/` e anotar os créditos.
4. **Mockup** no canvas de design (Início, Coleção, Produto, celular e quadro das 15 cores) e aprovação do dono antes de programar.
5. **Programar** em `vitrines/_modelos/<modelo>/`: CSS comum, kit JS (catálogo, sacola, WhatsApp) e as 4 telas, seguindo o contrato acima. Registrar o modelo em `modelos.json` com `numero` seguinte e `prefixo` `<modelo>-`.
6. **Conferir** antes de publicar:
   ```
   python3 -m http.server 8800
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <modelo> --todas-as-cores --larguras 1440
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <modelo>-grafite-lima --larguras 1440,1100,390
   node tools/prebuild/conferir.js http://127.0.0.1:8800 grafite-lima --larguras 1440
   ```
   O último confere que o modelo 1 continua igual. Testar também o montador e o site de vendas com o modelo novo.
7. **Publicar** no GitHub e conferir no ar (`vitrine.html?v=<modelo>-grafite-lima`).
8. **Registrar** a linha do modelo na tabela do topo deste arquivo.

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
