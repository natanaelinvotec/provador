# Gestão da loja e extras da vitrine (sem Asaas)

O que **não** entra aqui (depende do Asaas ou de servidor): checkout com Pix e cartão no site, split, conciliação automática de pagamento online e textos de produto com IA (precisa de API com chave guardada em servidor). Todo o resto funciona no plano Spark, só com Firebase Auth + Firestore no navegador.

## Princípios
- Vanilla JS, sem build, mesmo estilo do resto do repositório (IIFE, `'use strict'`, funções em português, comentários curtos em português).
- Dois modos, mesma interface (como `shared/plataforma.js`): **demonstração** (sem apiKey: dados em `localStorage`) e **firebase**. Acesso ao Firebase: `Plataforma.fb()` devolve `{ app, A, F, auth, db }` (SDK modular v10; `F` = firestore, `A` = auth). Conta da lojista: `Plataforma.contaLojista()` → `{ uid, email }` ou `null`. Loja: `Plataforma.minhaLoja(conta)` → `{ loja, itens }`.
- Peças continuam em `catalogos/{lojaId}/itens/{id}` (leitura pública). Campos novos, sanitizados por `Plataforma.limparItem`:
  - `estoque`: `{ P: 3, M: 0, G: 1 }` — inteiros 0..9999, só tamanhos que a peça tem. Sem `estoque` = estoque não controlado (a peça vende normalmente).
  - `sku`: código da etiqueta, `^[A-Z0-9-]{1,24}$`. Se faltar, gerar a partir do id: `id.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(-6)`. O código impresso é `SKU-TAM` (ex.: `K7Q2ZA-M`).
  - `vipAte`: `'AAAA-MM-DDTHH:MM'` (hora local). Até esse momento a peça só aparece para quem abre a vitrine com o link VIP.
  - Gravar peça: `Plataforma.salvarItemLoja(conta, item)` (setDoc do item inteiro, já limpo).
- Nada de "teste" em nomes de arquivos, coleções ou textos.

## Coleções novas (Firestore)
| Caminho | Quem lê | Quem escreve | Campos |
|---|---|---|---|
| `gestao/{lojaId}/vendas/{id}` | dona | dona | `numero` (texto curto, ex. "1042"), `criadaEm` (ISO), `data` ('AAAA-MM-DD'), `canal` ('balcao','whatsapp','instagram','site','outro'), `forma` ('pix','cartao','dinheiro','outro'), `itens` (lista de `{ id, nome, tam, preco, qtd }`), `desconto`, `total`, `cliente` (`{ nome, whats }`), `status` ('pago','separado','enviado','entregue','cancelado'), `endereco` (texto), `acompanhar` (token), `obs` |
| `gestao/{lojaId}/caixa/{id}` | dona | dona | `data`, `tipo` ('entrada','saida'), `valor`, `forma`, `descricao`, `categoria`, `vendaId` (opcional), `criadoEm` |
| `gestao/{lojaId}/contas/{id}` | dona | dona | `descricao`, `valor`, `vence` ('AAAA-MM-DD'), `paga` (bool), `pagaEm`, `recorrente` ('nao','mensal') |
| `gestao/{lojaId}/movimentos/{id}` | dona | dona | `data`, `criadoEm`, `itemId`, `peca`, `tam`, `qtd` (+ entra, − sai), `motivo` ('entrada','venda','ajuste','troca'), `vendaId` |
| `vip/{lojaId}/contatos/{id}` | dona | **público cria** | `nome` (2..60), `whats` (10..13 dígitos), `criadoEm` (= hora do servidor) |
| `avisos/{lojaId}/pedidos/{id}` | dona | **público cria**; dona marca `avisado` | `nome`, `whats`, `itemId`, `peca`, `tam`, `criadoEm`, `avisado` (false ao criar) |
| `acompanhar/{token}` | **público, só por token** (get) | dona | `lojaId`, `slug`, `loja` (nome), `numero`, `status`, `itens` (lista `{ nome, tam, qtd }`), `atualizadoEm` (ISO) |

- `lojas/{id}.vipCodigo` (privado, texto até 40) e `lojasPublicas/{slug}.vipHash` (SHA-256 hex do código). Link VIP: `vitrine.html?l={slug}&vip={codigo}`.
- Token de acompanhamento: 24 caracteres `[A-Za-z0-9]` gerados com `crypto.getRandomValues`. Link: `vitrine.html?l={slug}&acompanhar={token}`.
- Venda nova (lote único `writeBatch`): doc em `vendas`, lançamento `entrada` em `caixa` (com `vendaId`), um `movimento` por item (qtd negativa) e a peça com `estoque[tam]` reduzido (`max(0, atual - qtd)`, lido na hora). Cancelar venda: devolve estoque (movimento `troca`/`ajuste` positivo) e lança `saida` de estorno.

## Páginas
### `loja/` — Painel da loja (dona e equipe; instala como app)
- `loja/index.html`, `loja/loja.css`, `loja/loja.js`, `loja/manifest.webmanifest` (nome "Provador Loja", ícones de `assets/img/icone-*.png`, `start_url: ./`, `scope: ./`). `shared/gestao.js` é a camada de dados (modo demo + firebase). `shared/code128.js` desenha o código de barras (padrão do `assets/js/provador-pagina.js`).
- Entrada: se não houver conta, mostra "Entrar na minha loja" com link para `../montar/?entrar=1&volta=loja` (o login acontece no montador; mesma sessão do Firebase). Se a conta não tem loja: link para montar a loja.
- Abas (navegação inferior no celular, lateral no computador): **Hoje**, **Vender**, **Pedidos**, **Estoque**, **Caixa**, **Relatórios**, **Clientes**. Link "Editar vitrine e fotos" → `../montar/`.
  - **Hoje (fluxos):** lista do que fazer agora, cada item com o botão que resolve: pedidos pagos para separar; separados para enviar; avisos de reposição cujo tamanho voltou ao estoque (botão abre `wa.me` com a mensagem pronta e marca `avisado`); contas que vencem em até 3 dias ou vencidas; clientes sem comprar há 60 dias (botão `wa.me` com cupom em texto livre); peças VIP com `vipAte` no futuro (botão copia a mensagem com o link VIP e a lista de números). Mensagens prontas sempre em `https://wa.me/55NUMERO?text=...`.
  - **Vender (app de balcão):** campo "Código da etiqueta" sempre focado (leitor USB/Bluetooth digita e dá Enter) + botão "Ler com a câmera" (BarcodeDetector com `code_128`; se não existir, o botão explica que no iPhone a leitura é pelo campo). Busca também por nome. Carrinho com tamanho, quantidade, desconto, forma de pagamento (Pix, cartão na maquininha, dinheiro, outro), canal, cliente opcional (nome + WhatsApp). "Registrar venda" grava o lote e mostra o recibo com botão para mandar no WhatsApp da cliente.
  - **Pedidos:** lista por status com troca de status (pago → separado → enviado → entregue; cancelar). Ao trocar, atualiza `acompanhar/{token}` (cria se não houver) e oferece "Avisar a cliente" (wa.me com o link de acompanhamento). "Etiqueta de envio" imprime nome, endereço e itens (A4 ou 10×15 cm). Também dá para lançar um pedido que chegou pelo WhatsApp.
  - **Estoque:** grade de tamanhos por peça (editar números), alerta de baixo (≤ 1) e zerado, "Entrada de mercadoria" (soma ao estoque e grava movimento), histórico de movimentos, marcar peça como lançamento VIP (data/hora `vipAte`). **Etiquetas:** escolher peças e quantidades por tamanho (padrão = estoque) e imprimir em A4 (3 × 8, 70 × 37 mm) ou térmica 50 × 30 mm; cada etiqueta: marca da loja, peça, cor, tamanho, preço, código de barras Code 128 e o código em texto. Impressão por `window.print()` com CSS `@media print`.
  - **Caixa:** mês atual com entradas, saídas e saldo; por forma de pagamento; lançar entrada/saída manual; **Contas a pagar** (criar, marcar paga → vira saída; recorrente mensal cria a do mês seguinte).
  - **Relatórios:** últimos 30/90 dias: faturamento, pedidos, ticket médio, mais vendidas (barras), peças paradas há 60+ dias com estoque, vendas por canal e por forma (barras empilhadas), faturamento por mês (6 meses). Gráficos em SVG à mão, paleta `#2563C9, #0E9A82, #B7791F` (entradas `#0E9A82`, saídas `#C2410C`), com legenda e dica ao passar o mouse.
  - **Clientes:** compradoras (de `vendas`), lista VIP (com link VIP para copiar e botão "Gerar novo link VIP" que troca `vipCodigo`/`vipHash`), avisos de reposição.
- Visual: mesma família do painel master (`painel/painel.css` como referência: fundo `#EAF2F1`, trilho escuro `#0A1630`, Sora/Manrope) mas sem depender dele; celular primeiro (a vendedora usa no balcão), alvos ≥ 44 px, foco visível, sem rolagem lateral em 390 px.

### Vitrine (todas as lojas e os 15 modelos) — `assets/js/vitrine-extras.js` + `shared/publico.js`
- Carregado pelo `vitrine.html` depois do `vitrine-loader.js`; o loader chama `window.VitrineExtras.filtrarItens(itens, loja, params)` antes de entregar as peças ao modelo (só para loja de verdade, `?l=` ou domínio):
  - tira tamanhos com `estoque[tam] === 0` de `tamanhos`; se a peça ficou sem tamanho nenhum, marca `esgotado: true` e mantém só para a página do produto (some das listas);
  - esconde peças com `vipAte` no futuro, a não ser que `sha256(params.vip) === loja.vipHash` (aí mostra e marca `novo: true`).
- Elementos injetados por cima do modelo (não mexer nos `.dc.html` nem nos kits), usando as cores da loja (`--accent`, `--bg`, `--ink` lidas da raiz do modelo; padrão escuro/rosa se não achar):
  - **Avise-me:** na página do produto, "Não achou o seu tamanho? Avise-me quando chegar" → formulário (nome, WhatsApp, tamanho entre os esgotados) → `avisos/{lojaId}/pedidos`.
  - **Lista VIP:** botão discreto fixo "Lista VIP" (canto inferior esquerdo) → formulário (nome, WhatsApp) → `vip/{lojaId}/contatos`. Texto: "Receba as novidades antes de abrir para todo mundo."
  - **Instalar a loja:** manifest gerado por loja (Blob, `name` = nome da loja, `start_url` com `?l=`), ícone feito em canvas (iniciais na cor da loja) e `apple-touch-icon`; botão "Instalar a loja" usa `beforeinstallprompt` e, sem ele (iPhone), mostra o passo "Compartilhar → Adicionar à Tela de Início".
  - **Acompanhar pedido:** `?acompanhar={token}` mostra uma página própria (por cima do modelo) com a loja, o número, os itens e a linha do tempo pago → separado → enviado → entregue, lendo `acompanhar/{token}`.
- Em demonstração/rascunho/prévia (`?v=`), nada é gravado: os formulários mostram "Na sua loja de verdade isso chega no seu painel" e não chamam o Firestore.

## Regras
As regras novas estão em `firestore.rules` (gestão privada da dona; VIP e avisos: público só cria com campos conferidos; acompanhamento: leitura por token). Qualquer campo novo precisa entrar lá.

## Canais de venda (Meta, Google, Shopee e Shein)
- `shared/canais.js` (navegador e Node): uma linha por peça × tamanho; `id` = código da etiqueta (`SKU-TAM`), `item_group_id` = grupo da vitrine (`cat-nome`), link `vitrine.html?l={slug}&p=produto&item={grupo}` (ou `https://{dominio}/?p=produto&item={grupo}`). Peça sem foto, sem preço, sem categoria, com código repetido ou em lançamento VIP fica de fora. Arquivos: `meta.csv` (Meta), `google.tsv` (Merchant Center), `bling.csv` (colunas da planilha do Bling: B Código, AJ Código Pai, AR URL Imagens Externas; variação com descrição `Cor:X;Tamanho:Y`) e `planilha.xlsx` (UpSeller e outros hubs).
- `canaisAtivos/{slug}` (leitura pública, só a dona grava): `ativo`, `marca`, `genero`, `idade`, `catRoupas`, `catAcess`, `pesoG`, `comprimentoCm`, `larguraCm`, `alturaCm`, `ncm`, `lojaId`, `slug`, `atualizadoEm`.
- Painel `loja/#canais`: liga/desliga, dados dos canais, conferência das peças, baixar os arquivos, copiar os links e passo a passo de cada canal. Vendas que chegam pela Shopee/Shein entram em Vender com o canal `shopee`/`shein`.
- Workflow `.github/workflows/canais.yml` (a cada 3 horas) roda `tools/canais/gerar.js`: lê o Firestore pela API REST sem chave (só o que é público), grava `canais/{slug}/` com os arquivos, as fotos (`img/{itemId}-{n}.jpg`) e `status.json` (a hora só muda quando o conteúdo muda). Loja que desligou ou saiu do ar tem a pasta removida; erro de rede mantém o que estava.
