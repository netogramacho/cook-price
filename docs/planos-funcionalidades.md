# CookPrice — Funcionalidades por Plano

## Funcionalidades Existentes

| Funcionalidade | Descrição |
|---|---|
| **Ingredientes** | CRUD com preço por embalagem, estoque atual e estoque mínimo |
| **Receitas** | CRUD com lista de ingredientes e quantidades |
| **Custo básico** | Custo total dos ingredientes de uma receita |
| **Custo completo** | Ingredientes + embalagem + custos invisíveis (% configurável) |
| **Preço sugerido** | Calculado via multiplicador de lucro; exibido por receita e por unidade de rendimento |
| **Margem de lucro** | Percentual calculado a partir do multiplicador configurado |
| **Estoque** | Visualização do estoque atual de todos os ingredientes |
| **Compras** | Registrar compra de ingredientes; atualiza preço e estoque automaticamente |
| **Ajuste manual de estoque** | Corrigir quantidade em estoque de um ingrediente específico |
| **Histórico de movimentações** | Por ingrediente, com referência à receita produzida ou compra associada |
| **Produção de receitas** | Registrar que produziu N vezes uma receita; desconta ingredientes do estoque automaticamente |

---

## Divisão por Tier

| Funcionalidade | Gratuito | Básico | Pro |
|---|:---:|:---:|:---:|
| **Receitas** | até 3 | até 15 | Ilimitado |
| **Ingredientes** | até 15 | até 60 | Ilimitado |
| Custo básico (ingredientes) | Sim | Sim | Sim |
| Custo de embalagem | Não | Sim | Sim |
| Custos invisíveis | Não | Sim | Sim |
| Preço sugerido | Não | Sim | Sim |
| Margem de lucro | Não | Sim | Sim |
| Estoque (visualização + ajuste) | Não | Sim | Sim |
| Compras | Não | Sim | Sim |
| Histórico de movimentações | Não | Não | Sim |
| Produção de receitas | Não | Não | Sim |

---

## Preços Sugeridos

| Plano | Preço/mês |
|---|---|
| Gratuito | R$ 0 |
| Básico | R$ 19 |
| Pro | R$ 39 |

---

## Raciocínio da Divisão

**Gratuito → Básico**
O usuário gratuito consegue ver o custo dos ingredientes de uma receita — suficiente para entender o valor do produto. O bloqueio do preço sugerido e dos custos invisíveis cria pressão de conversão para quem quer precificar corretamente. O limite de 3 receitas bate rápido para qualquer negócio real.

**Básico → Pro**
O Básico cobre o fluxo completo de custo e precificação, além de gestão de estoque e compras. O Pro desbloqueia o fluxo operacional do dia a dia: registrar produções (com desconto automático do estoque) e consultar o histórico de movimentações — essencial para quem compra em atacado e precisa de rastreabilidade.
