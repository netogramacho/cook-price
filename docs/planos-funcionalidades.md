# Preciva — Funcionalidades por Plano

## Funcionalidades do Produto

| Funcionalidade | Descrição |
|---|---|
| **Ingredientes** | CRUD com preço por embalagem e unidade de medida |
| **Receitas** | CRUD com lista de ingredientes e embalagens por quantidade |
| **Custo básico** | Custo total dos ingredientes de uma receita |
| **Custo de embalagem** | Custo das embalagens somado ao custo da receita |
| **Custos invisíveis** | Percentual configurável sobre o custo base (gás, energia, etc.) |
| **Custo de produção** | Ingredientes + embalagem + custos invisíveis |
| **Preço sugerido** | Calculado via multiplicador de lucro, exibido por receita e por unidade de rendimento |
| **Margem de lucro** | Percentual derivado do multiplicador configurado |
| **Registrar produção** | Registrar um lote produzido de uma receita com snapshot imutável dos custos |
| **Histórico de produções** | Listagem paginada de todas as produções com data, receita, rendimento e custo |
| **Resumo de produções** | Custo, lotes e itens produzidos hoje e no mês atual |

---

## Divisão por Plano

| Funcionalidade | Gratuito | Basic | Plus |
|---|:---:|:---:|:---:|
| **Receitas** | até 3 | até 15 | Ilimitado |
| **Ingredientes** | até 15 | até 60 | Ilimitado |
| Custo básico (ingredientes) | Sim | Sim | Sim |
| Custo de embalagem | Não | Sim | Sim |
| Custos invisíveis | Não | Sim | Sim |
| Custo de produção | Não | Sim | Sim |
| Preço sugerido | Não | Sim | Sim |
| Margem de lucro | Não | Sim | Sim |
| Registrar produção | Não | Não | Sim |
| Histórico de produções | Não | Não | Sim |
| Resumo de produções | Não | Não | Sim |

---

## Preços

| Plano | Preço/mês |
|---|---|
| Gratuito | R$ 0 |
| Basic | R$ 19 |
| Plus | R$ 39 |

---

## Raciocínio da Divisão

**Gratuito → Basic**
O usuário gratuito consegue ver o custo dos ingredientes de qualquer receita — suficiente para entender o valor do produto e perceber o limite de 3 receitas rapidamente. O bloqueio do preço sugerido, custos invisíveis e custo de produção cria pressão de conversão para quem quer precificar corretamente e enxergar o custo real do que produz.

**Basic → Plus**
O Basic cobre o fluxo completo de custo e precificação: o confeiteiro sabe exatamente quanto custa produzir e qual preço cobrar. O Plus desbloqueia o fluxo operacional: registrar produções com snapshot imutável dos custos no momento do lote, consultar o histórico e acompanhar o custo produzido no dia e no mês — essencial para quem quer controlar volume, rastrear gastos reais e tomar decisões com base em dados históricos.
