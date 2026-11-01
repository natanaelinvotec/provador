---
name: clonar-prebuild
description: Use quando o dono do Provador mandar o link de um site de referência para virar o próximo pré-build (modelo de site 3 a 15) da vitrine, ou pedir para seguir os mesmos passos da Arena.
---

# Clonar um site de referência como novo pré-build do Provador

O Provador (repositório `natanaelinvotec/provador`, GitHub Pages em https://natanaelinvotec.github.io/provador/) tem **uma vitrine só**. A lojista escolhe **o modelo do site** (pré-build) e **a cor** dos menus e botões. A loja guarda as duas escolhas no campo `vitrine`: prefixo do modelo + cor (ex.: `arena-pink-pulse`; sem prefixo = modelo 1, Clássico). Hoje existem o 1 (Clássico) e o 2 (Arena). Cada link novo que o dono mandar vira o próximo número, até 15.

Responda sempre em português do Brasil. A fonte da verdade é `vitrines/_modelos/README.md` no repositório: leia antes de começar e siga o contrato de lá. Leia também o documento do projeto `claude/provador-plataforma.md` (Projects).

## Regras que não mudam

- Copiar só a **estrutura** e o **clima** do site de referência (ordem das seções, componentes, comportamento no celular). Nada de foto, texto, logo ou paleta de lá. Nome, fontes e forma marcante são próprios.
- Fotos de ambiente livres (Unsplash/Pexels), conferidas no navegador: sem logo de marca visível. Anotar crédito no README do modelo. Produtos sempre vêm de `itens`.
- Fontes do Google Fonts (SIL OFL) em `assets/fonts/<modelo>/`, declaradas no CSS. Sem rede externa nas telas.
- Sem avaliação inventada, "vendidos agora" ou estoque falso. Checkout pelo WhatsApp da loja até o gateway chegar.
- Funcionar em 1440 px e 390 px, sem rolagem para o lado, nas 15 cores (13 escuras, 2 claras: `areia-oliva`, `ceu-pastel`).
- Não usar a palavra "teste" em nomes de recursos. O valor interno `status: 'teste'` pode ficar.
- Nunca publicar `config/plataforma.config.js` e nunca digitar ou repetir a apiKey. Não mexer em configuração de segurança do Google Cloud/Firebase: isso é do dono.
- Se o site de referência tiver senha, o dono destranca no navegador. Não passar por CAPTCHA.

## Passo a passo

1. **Preparar.** Clonar o repositório (ou `git pull`). Servir a raiz: `python3 -m http.server 8800` (em segundo plano). Ler `vitrines/_modelos/modelos.json` para saber o próximo `numero`.
2. **Estudar o site** no navegador: Início, Coleção e Produto em 1440 e no celular. Anotar ordem das seções, componentes (slider, abas, filtros, galeria, sacola), tipografia, raios, botões e o que muda no celular. Guardar só anotações.
3. **Identidade própria.** Nome do modelo (uma palavra, vira o `slug` e o prefixo `<slug>-`), 1 a 3 fontes OFL, uma forma marcante que os modelos anteriores não têm, e as 15 cores do modelo com os mesmos slugs do catálogo (`bg`, `surface`, `line`, `accent`, `onAccent`, `accent2`, `modo`).
4. **Fotos e fontes.** Reaproveitar o catálogo de demonstração (`vitrines/_fotos/c*, m*, q*, l*, t*, a*`). Baixar fotos novas só de ambiente para `vitrines/_fotos/<modelo>-*.jpg` (~1200 px, JPEG ~60–120 KB). Baixar os woff2.
5. **Mockup e aprovação.** Canvas de design com Início, Coleção, Produto, celular e o quadro das 15 cores. Mostrar ao dono e **esperar aprovação** antes de programar.
6. **Programar** copiando a Arena:
   - `tools/prebuild/fontes/arena/` → `tools/prebuild/fontes/<modelo>/` (telas `*.src.html` + `partes.py` com topo, rodapé e cartão comuns). Editar as fontes e rodar `python3 tools/prebuild/fontes/<modelo>/partes.py` para gerar `vitrines/_modelos/<modelo>/*.dc.html`. Nunca editar os `.dc.html` à mão.
   - `vitrines/_modelos/arena/arena.css|arena.js` → `<modelo>.css|<modelo>.js`. O kit vira `window.<Modelo>Kit` (catálogo agrupado por `cat|nome`, sacola e favoritos no navegador, texto do pedido para o WhatsApp, topo, cartão, Pix 5%).
   - A raiz de cada tela é `<div class="<modelo>" style="{{vars}}">`, com as cores em `--bg --surface --line --accent --on-accent --accent2`.
   - Registrar em `modelos.json`: `slug`, `numero`, `nome`, `prefixo: "<modelo>-"`, `dados: "props"`, `pasta`, `script`, `paginas`, `descricao`, `origem`, `foto`, `fontes`, `cores`. Site de vendas, montador e painel leem dali e não precisam mudar.
   - Em JavaScript, nada de acento combinante literal em regex: usar `[̀-ͯ]`.
7. **Conferir** (todos precisam passar):
   ```
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <modelo> --todas-as-cores --larguras 1440
   node tools/prebuild/conferir.js http://127.0.0.1:8800 <modelo>-grafite-lima --larguras 1440,1100,390
   node tools/prebuild/conferir.js http://127.0.0.1:8800 grafite-lima --larguras 1440
   node tools/prebuild/integracao.js http://127.0.0.1:8800 <modelo>
   ```
   Depois olhar screenshots (`--saida pasta`) de Início, Coleção, Produto e Sacola em 1440 e 390, numa cor escura e numa clara.
8. **Publicar.** Com `git push` funcionando, commit normal na `main` (mensagens em português, sem "teste"). Se o proxy recusar o push, publicar pelo navegador (abaixo).
9. **Conferir no ar** com o navegador: `vitrine.html?v=<modelo>-grafite-lima` (as 4 telas), o botão do modelo no site de vendas e as bolinhas de cor no montador. Rodar o JS de `publicar_pelo_navegador.py conferir /provador/ <arquivos>` numa aba do site publicado: tudo `ok`.
10. **Registrar.** Linha do modelo na tabela do README, créditos das fotos, atualizar `claude/provador-plataforma.md` no projeto e empacotar os arquivos novos/alterados em .rar (ou .zip se não houver `rar`), sem `config/plataforma.config.js`.

## Publicar pelo navegador (quando não há `git push`)

Ferramenta: `tools/prebuild/publicar_pelo_navegador.py` (o docstring tem os detalhes). Cada trecho confere o hash djb2 antes de salvar.

- **Arquivos novos de uma pasta** (texto, fotos e woff2): `novos --saida /tmp/up --msg "..." pasta/a pasta/b`. Abrir `https://github.com/natanaelinvotec/provador/upload/main/<pasta>`, rodar `up_0.js`, `up_1.js`... e `up_fim.js` com a ferramenta de JavaScript, depois `find "Commit changes"` e **clique de verdade** no botão.
- **Pasta que ainda não existe:** criar o primeiro arquivo pelo editor (`inteiro`, em `/new/main?filename=<caminho>`); depois subir o resto pela página de upload.
- **Arquivo que já existe:** `patch caminho` (diferença contra `HEAD`), em `/edit/main/<caminho>`. Só seguir se voltar `ok:true`.
- **Salvar no editor:** clique de verdade em "Commit changes...", rodar o JS de `mensagem "..."` (espera o diálogo, põe a mensagem e apaga a descrição em inglês que o Copilot sugere), `find "Commit changes"` e clique de verdade no botão do diálogo.
- Trechos de até ~19 KB por chamada (acima de ~25 KB a saída corta). Ler o arquivo do trecho e colar o conteúdo exato.
- Depois de cada commit: `git fetch` e comparar `git rev-parse origin/main:<f>` com `git hash-object <f>`. No fim, `git reset origin/main` deixa o clone limpo.

## O que entregar ao dono

Uma resposta curta em português: o modelo novo no ar (com os links de Início e do montador), as cores, o que foi copiado da referência e o que foi mudado, o que ficou pendente (créditos, fotos a trocar) e onde está o .rar. Nada de lista de commits.
