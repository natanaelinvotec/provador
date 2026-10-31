# Provador: plataforma de lojas virtuais para quem vende roupa

Três partes, um projeto só:

| Parte | Endereço | Para quem |
|---|---|---|
| Site de vendas | `/` (`index.html`) | Lojista que vai escolher a vitrine e pedir a loja |
| Painel master | `/painel/` | Só você (papel `plataforma`) |
| Vitrines e lojas | `/vitrine.html?v=<vitrine>` (demonstração) e `/vitrine.html?l=<loja>` ou o domínio da loja | Clientes finais das lojas |

## Rodar no computador

```bash
cd provador
python3 -m http.server 8790
# site:   http://localhost:8790/
# painel: http://localhost:8790/painel/   (modo demonstração: qualquer e-mail entra)
```

Sem o Firebase configurado, tudo roda em **modo demonstração**: os dados ficam no navegador (localStorage) e o painel começa com lojas de exemplo. Em Configurações você apaga os exemplos.

Testes da lógica de dinheiro: `node --test tests/calc.test.js`.

## Pastas

```
index.html, assets/css/site.css, assets/js/site.js   site de vendas
painel/                                             painel master (layout trilho)
vitrine.html, assets/js/dc-runtime.js, vitrine-loader.js   motor que abre as vitrines
vitrines/<slug>/*.dc.html                           as 16 vitrines (15 do catálogo + a exclusiva da Ais)
vitrines/catalogo.json                              lista que o site e o painel leem
shared/calc.js                                      regras de dinheiro (painel, site e servidor usam o mesmo arquivo)
shared/plataforma.js                                dados: modo demonstração ou Firebase, mesma interface
config/plataforma.config.js                         nome, Firebase, hosts da plataforma, WhatsApp comercial
functions/                                          resumo financeiro calculado no servidor
firestore.rules, storage.rules, firebase.json       segurança e hospedagem
tools/                                              geradores (fontes, ilustrações, vitrines, miniaturas)
```

## Colocar no ar (Firebase)

Precisa do plano Blaze (as funções agendadas exigem). O custo com poucas lojas fica perto de zero.

1. Crie o projeto no console do Firebase. Ative:
   - **Authentication**, com E-mail/senha;
   - **Firestore** (região `southamerica-east1`);
   - **Storage**.
2. Em Configurações do projeto › Seus apps › Web, copie o objeto de configuração e cole em `config/plataforma.config.js`, no campo `firebase`. Esse objeto não é segredo: quem protege os dados são as regras.
3. Ainda em `config/plataforma.config.js`, coloque em `hostsDaPlataforma` o domínio do seu site de vendas (ex.: `provador.com.br`) e o seu WhatsApp comercial em `whatsappComercial` (com 55 e DDD).
4. Crie o seu usuário em Authentication. No Firestore, crie o documento `usuarios/<seu uid>` com o campo `papeis` (array) = `["plataforma"]`. Só quem tem esse papel entra no painel.
5. Crie o segundo site de hospedagem, o das lojas, e ligue os alvos:
   ```bash
   npm i -g firebase-tools && firebase login
   cp .firebaserc.exemplo .firebaserc   # troque SEU-PROJETO-FIREBASE pelo id do projeto
   firebase hosting:sites:create SEU-PROJETO-FIREBASE-lojas
   firebase target:apply hosting plataforma SEU-PROJETO-FIREBASE
   firebase target:apply hosting lojas SEU-PROJETO-FIREBASE-lojas
   cd functions && npm install && cd ..
   firebase deploy
   ```
6. Abra o painel, vá em Mais › Planos & preços e clique em Salvar. Isso publica a tabela que o site de vendas mostra.

O site **plataforma** serve o site de vendas e o painel. O site **lojas** serve só a vitrine: qualquer endereço abre a loja do domínio que chegou. É nele que os domínios das clientes são ligados.

## Primeira cliente: Ais Moda Fitness

1. Painel › Lojas › **Nova loja**. Preencha:
   - Nome: Ais Moda Fitness;
   - Nome curto: Ais;
   - Linha do logo: MODA FITNESS;
   - Instagram: aismodafitness;
   - cidade, WhatsApp da loja, dados da dona e plano.

   A loja entra na fila.
2. No card da loja, clique em **Gerar site** e escolha **Ais (exclusiva)**. Essa é a vitrine aprovada do mockup, com as fotos dela.
3. Clique em **Ativar**. O link fica `https://SEU-PROJETO-FIREBASE.web.app/vitrine.html?l=aismodafitness`. Mande para ela conferir.
4. Domínio:
   1. No console do Firebase, abra Hosting › site **lojas** › Adicionar domínio personalizado.
   2. Adicione `aismodafitness.com.br`, e depois `www.aismodafitness.com.br` com redirecionamento para o primeiro.
   3. No Registro.br, em DNS da conta dela, apague registros A antigos do mesmo nome.
   4. Crie os registros que o Firebase mostrar: o TXT de verificação e os registros A.
   5. A propagação leva de minutos a algumas horas. O certificado (cadeado) sai sozinho em seguida.
5. No painel, em Editar dados da loja, preencha **Domínio próprio** com `aismodafitness.com.br`. É isso que liga o domínio à loja (`dominios/aismodafitness.com.br`).

O passo a passo também está no painel, em Mais › Domínios.

## O que é demonstração e o que é real hoje

| Real e funcionando | Ainda de demonstração (próximas etapas) |
|---|---|
| Site de vendas com as 15 vitrines ao vivo, preços vindos do painel e pedido de loja gravado no banco | Os produtos de cada vitrine são os do mockup. O cadastro de produtos por loja (categorias, cores, tamanhos, fotos) é a próxima etapa |
| Painel master: lojas, gerar site, ativar, pausar, cobrança, inadimplência, contas a pagar, planos, simulador, leads, auditoria, CSV | A sacola ainda não cobra de verdade. Falta ligar o gateway com split (InfinitePay, Asaas ou Pagar.me) |
| Lojas abrindo por link e por domínio, com o nome, Instagram e cidade de cada cliente | Os números de vendas e de IA chegam ao resumo quando o gateway e a função de IA gravarem `vendasMes` e `usoIA` (formato em `functions/index.js`) |

## Segurança (resumo)

- **Painel:** só quem tem o papel `plataforma` lê e escreve lojas, dinheiro, contas, pedidos e auditoria.
- **Público:** lê um documento por vez de `lojasPublicas`, `dominios` e `site/planos`. Nada financeiro e sem listar.
- **Telefone da dona:** não vai para a vitrine pública, só o "WhatsApp da loja".
- **Pedidos de loja:** campos e tamanhos conferidos nas regras, `status` sempre `novo` e data do servidor.
  - Antes de divulgar, ligue o **App Check** (reCAPTCHA Enterprise) no Firestore para segurar robôs.
  - O formulário já tem um campo-armadilha escondido.
- **Resumo financeiro:** calculado no servidor.
  - O botão "Atualizar números" só pede.
  - A função confere o papel e aceita no máximo um recálculo por minuto.
- **Exclusões:** apagar loja exige digitar o nome e remove também o link público e o domínio. A auditoria não pode ser editada nem apagada.
- **Escape e CSP:** tudo que vem do banco é escapado antes de virar HTML (testado com nomes contendo HTML). A CSP está em `firebase.json`.
  - O `unsafe-eval` é necessário porque o motor das vitrines monta os componentes em tempo de execução.
- **LGPD:** o painel não lê dados das compradoras finais. Pedidos de loja podem ser apagados no painel (Pedidos de loja › lixeira).
  - Combine um prazo (ex.: apagar pedidos descartados depois de 12 meses).

## Mudar textos, nome e preços

- **Preços e split:** Painel › Mais › Planos & preços (o site atualiza sozinho).
- **Textos do site:** `index.html`. Revise os itens de cada plano e as respostas das perguntas para bater com o que você vai entregar.
- **Nome da plataforma:** `config/plataforma.config.js` (`nome`), mais o logotipo em `index.html` e `painel/`.
- **Nova vitrine:** acrescente um tema em `tools/temas.py` e uma linha em `VARIACOES` (`tools/gerar_vitrines.py`). Depois rode `python3 tools/gerar_vitrines.py` e `node tools/miniaturas.js http://localhost:8790`.
