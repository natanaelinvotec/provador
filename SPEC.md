# SPEC: Provador (plataforma de revenda de vitrines)

## Objetivo
O dono da plataforma vende lojas virtuais de roupa. Cada vitrine nasce de um motor só (o mockup aprovado da Ais) com 15 identidades. O dono cadastra a loja, gera o site com a vitrine escolhida, ativa e aponta o domínio da cliente. Ele acompanha o dinheiro (mensalidade, split, domínio, implantação, contas, IA, inadimplência) num painel master no layout trilho.

## Usuários
- **Dono da plataforma:** papel `plataforma`, acesso total ao painel.
- **Lojista interessada:** usa o site de vendas e envia um pedido de loja.
- **Cliente final da loja:** navega na vitrine. O painel nunca lê os dados dela.

## Regras de dinheiro (shared/calc.js)
- **Receita da plataforma por loja e mês:**
  - mensalidade do plano, se ativa, não isenta, fora do teste e em dia ou em aberto;
  - split = `splitPct`% do valor pago + `splitFixo` × pedidos pagos;
  - domínio = `dominioAno / 12` se tiver domínio.
  - A implantação é cobrada uma vez e entra em "a receber" até ser marcada como paga.
- **Cobrança pré-paga, vencimento no `venceDia` (1 a 28):**
  - **Atrasada:** passou do vencimento.
  - **Crítica:** 30 dias ou mais de atraso.
  - Registrar pagamento avança `pagoAte` pelo número de meses informado (1 a 120).
- **Contas a pagar recorrentes:** "Paguei" mantém o dia combinado (`diaFixo`) e ajusta em meses curtos.
- **IA:** custo = tokens de entrada e saída × preço por milhão. Há teto mensal e aviso por porcentagem.

## Dados (Firestore)
`usuarios`, `lojas` (privado), `lojasPublicas/{slug}` e `dominios/{host}` (leitura pública, um por vez), `site/planos` (público), `leads` (criação pública validada), `contasPagar`, `financeiroPlataforma/{precos,resumo,historico}`, `vendasMes`, `usoIA`, `comandos`, `auditoria` (só acrescenta).

## Critérios de aceite (testados com Playwright)
- **Site de vendas:**
  - 15 cabides trocam a vitrine ao vivo; filtro por estilo; "Quero esta" e botões de plano preenchem o pedido.
  - O pedido grava e aparece no painel. O preço mudado no painel aparece no site.
- **Painel:**
  - Todas as 14 telas abrem sem erro.
  - **Loja:** cadastro com validação, Gerar site, Ativar, link `?l=` abrindo com a marca da loja, loja na fila não abre.
  - **Dinheiro:** pagamento de vários meses, conta "Paguei", CSV com BOM e `;`, preços fora da faixa recusados, simulador reagindo.
  - **Exclusão:** pede o nome exato.
  - **Celular:** sem rolagem lateral.
- **Segurança:**
  - HTML em nomes e pedidos não executa.
  - `?l=` e `?v=` com caminho são recusados; `?p=constructor` não quebra.
  - Loja real não abre as telas de gestão de demonstração.

## Fora do escopo desta etapa
Cadastro de produtos por loja, checkout com gateway e split automático, webhook que grava `vendasMes`, função de IA que grava `usoIA`, e-mail de aviso.
