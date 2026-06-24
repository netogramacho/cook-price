# Preciva — Funcionalidades por Plano

Modelo do produto em 3 camadas: **Ingredientes → Receita (preparo) → Produto (vendável)**, mais o registro de **Lotes** (produção).

## Funcionalidades do Produto

| Funcionalidade | Descrição |
|---|---|
| **Ingredientes** | CRUD de matéria-prima, com preço por embalagem e unidade de medida |
| **Insumos** | CRUD de embalagem/finalização (caixas, sacos, etiquetas) — cadastro próprio, separado dos ingredientes |
| **Receitas (preparos)** | CRUD com a lista de ingredientes; é o preparo (massa, recheio, base) |
| **Custo da receita** | Custo dos ingredientes de uma receita — sempre visível |
| **Custos invisíveis** | Percentual configurável sobre o custo base da receita (gás, energia, água, mão de obra) |
| **Custo de produção da receita** | Ingredientes + custos invisíveis, com custo por unidade de rendimento |
| **Produtos** | Item vendável: combina receitas + insumos + ingredientes avulsos de finalização |
| **Preço de venda** | Margem (multiplicador de lucro) e preço sugerido por unidade — definidos no produto |
| **Registrar produção (lote)** | Registra um lote produzido de um produto, com snapshot imutável dos custos do momento |
| **Histórico de lotes** | Listagem paginada das produções com data, produto, rendimento e custo |
| **Resumo de lotes** | Custo, lotes e itens produzidos hoje e no mês atual |

> A precificação migrou da receita para o **produto**: a receita mostra o custo de produzir o preparo; o preço de venda vive no produto, que combina receitas + insumos.

---

## Divisão por Plano

| Funcionalidade | Gratuito | Básico | Pro |
|---|:---:|:---:|:---:|
| **Receitas** | até 3 | até 15 | Ilimitado |
| **Ingredientes + insumos** (limite combinado) | até 15 | até 60 | Ilimitado |
| Cadastro de ingredientes e insumos | Sim | Sim | Sim |
| Custo da receita (ingredientes) | Sim | Sim | Sim |
| Custos invisíveis | Não | Sim | Sim |
| Custo de produção da receita | Não | Sim | Sim |
| **Produtos** (montar e precificar) | Não | até 15 | Ilimitado |
| Margem + preço sugerido de venda | Não | Sim | Sim |
| Registrar produção (lotes) | Não | Não | Sim |
| Histórico e resumo de lotes | Não | Não | Sim |

> O limite de **ingredientes** e **insumos** é compartilhado (mesmo cadastro de matéria-prima).

---

## Preços

| Plano | Preço/mês |
|---|---|
| Gratuito | R$ 0 |
| Básico | R$ 14,90 |
| Pro | R$ 29,90 |

> **Experimentação:** plano de cortesia com acesso **total** (precificação, produtos e lotes) e volume limitado (3 receitas / 15 cadastros / 3 produtos), para o usuário experimentar o fluxo completo antes de assinar.

---

## Raciocínio da Divisão

**Gratuito → Básico**
O plano gratuito é uma **calculadora de custo**: cadastra ingredientes, insumos e receitas e vê o custo dos ingredientes de cada preparo — suficiente para entender o valor e sentir o limite de 3 receitas. A conversão vem de dois ganhos: o **custo real** (custos invisíveis: gás, energia, mão de obra) e, principalmente, a camada de **Produtos** — montar o que de fato se vende (receitas + insumos) e descobrir o **preço sugerido**. Sem isso, o usuário sabe o custo do preparo, mas não quanto cobrar.

**Básico → Pro**
O Básico fecha o ciclo de **custo e precificação**: o confeiteiro sabe quanto custa produzir e por quanto vender. O Pro abre a **operação**: registrar cada **lote** produzido com snapshot imutável dos custos no momento, consultar o histórico e acompanhar o que foi produzido no dia e no mês — essencial para quem controla volume, rastreia gastos reais e decide com base em dados históricos.
