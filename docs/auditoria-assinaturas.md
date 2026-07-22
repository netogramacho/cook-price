# Auditoria — Sistema de Assinaturas (CookPrice)

> Data: 2026-06-26 · Análise somente-leitura (nenhum arquivo foi alterado).
> Escopo: ciclo de vida de assinaturas, integração MercadoPago, gating por plano e integridade de dados.
> Achados consolidados e deduplicados a partir de 4 frentes de auditoria.

---

## 🔴 CRÍTICO

### 1. Webhook do MercadoPago é forjável quando o secret está vazio
**Arquivos:** `app/Services/MercadoPagoService.php:118-142` · `config/mercadopago.php:5`
`MP_WEBHOOK_SECRET` tem default `''`. `hash_hmac(..., '')` gera HMAC válido e determinístico, e todos os componentes da mensagem (`data.id`, `request-id`, `ts`) são controláveis pelo atacante. Não há guarda `if (empty($secret)) return false;`.
**Cenário:** deploy sobe sem `MP_WEBHOOK_SECRET` → atacante calcula o HMAC com chave vazia e dispara webhooks forjados.
**Impacto:** forja total de webhooks → ativar plano pago sem pagar ou rebaixar vítimas (`handleCancelled`). É o risco mais grave do conjunto.

### 2. Vazamento de `mp_preapproval_id` em `/subscriptions/current`
**Arquivos:** `app/Models/Subscription.php` (sem `$hidden`) · `app/Http/Controllers/SubscriptionController.php:21-33`
O endpoint serializa o model inteiro (`->with('plan')->first()`), expondo `mp_preapproval_id`, `user_id`, `plan_id`, timestamps — campos que a interface TS `SubscriptionData` nem declara.
**Impacto:** viola a diretriz do projeto (não vazar identificadores sensíveis). Corrigir com `$hidden` ou um API Resource.

### 3. Troca de plano abandonada → acesso pago vitalício sem cobrança
**Arquivo:** `app/Http/Controllers/SubscriptionController.php:55-77`
No `store()`, a assinatura antiga é cancelada no MP **e** marcada `mp_status='cancelled'` (mas `cancel_at_period_end` continua `false` → o cron nunca a processa) **antes** de criar a nova. `store()` não altera `user.plan_id` (só o webhook faz).
**Cenário:** se `createPreapproval` falhar (linha 63), ou o usuário abandonar o checkout, `user.plan_id` continua pago, mas não há mais cobrança recorrente e a assinatura órfã está fora do alcance do cron. Sem transação para reverter o cancelamento da antiga.
**Impacto:** plano pago mantido indefinidamente sem pagamento; estado permanentemente divergente. (Secundário: linha 59 descarta o período já pago, sem proração.)

---

## 🟠 ALTO

### 5. Pagamento atrasado/duplicado reverte `cancel_at_period_end` → acesso grátis perpétuo
**Arquivo:** `app/Http/Controllers/WebhookController.php:65-93` (e `:104`)
`processAuthorizedPayment` força `cancel_at_period_end=false` sem checar `mp_status`/estado atual. `ExpireSubscriptions` só rebaixa quem tem `cancel_at_period_end=true`.
**Cenário:** usuário cancela pelo app (`cancel_at_period_end=true`); um webhook `subscription_authorized_payment` em trânsito/reenviado chega depois e zera a flag → o cron nunca mais seleciona a assinatura.
**Impacto:** assinatura cancelada nunca é rebaixada. (Mesma raiz que destravamos no cron, mas vinda pelo webhook.)

### 6. Webhook `authorized` atrasado de assinatura antiga regrava o plano errado
**Arquivo:** `app/Http/Controllers/WebhookController.php:95-115`
`handleAuthorized` faz `user.plan_id = subscription.plan_id` sem verificar se é a assinatura vigente/mais recente. Webhooks do MP não têm garantia de ordem.
**Cenário:** upgrade A→B; webhook `authorized` atrasado de A chega após B → reescreve `plan_id=A`, e-mail de A, possivelmente duas `authorized` simultâneas.
**Impacto:** plano oscila/regride conforme a ordem de chegada dos webhooks.

### 7. Falha de pagamento via `paused` não rebaixa ninguém
**Arquivo:** `app/Http/Controllers/WebhookController.php:49-53, 143-146`
O MercadoPago normalmente **pausa** (`paused`) a assinatura após falhas de cobrança antes de cancelar. `handlePaused` só grava `mp_status='paused'` — não altera `ends_at`, não rebaixa, não notifica.
**Cenário:** cartão expira; MP pausa após retentativas.
**Impacto:** usuário mantém plano pago indefinidamente sem cobrança. Furo de receita direto.

### 8. `handleAuthorized` não é idempotente
**Arquivo:** `app/Http/Controllers/WebhookController.php:95-115`
Sem guarda de estado (ao contrário de `handleCancelled`). Cada reentrega — o MP reenvia rotineiramente — reseta `starts_at=now()` (corrompe o cálculo de período em `cancel()`, linha 114) e enfileira novamente o e-mail "assinatura ativada".
**Impacto:** e-mails duplicados; janela de acesso deslocada.

### 9. Sem transação/lock em `store`/`cancel` → cobrança/assinatura duplicada
**Arquivo:** `app/Http/Controllers/SubscriptionController.php:36-86`
Nenhum `DB::transaction`, `lockForUpdate` nem idempotency key. Duplo clique em "Assinar" ou requests concorrentes leem o mesmo `activeSubscription` e criam duas preapprovals + duas assinaturas `pending`.
**Impacto:** cobrança dupla, múltiplas `authorized`, retrabalho de suporte/estorno.

### 10. Acesso revogado SÓ pelo cron; sem checagem de `ends_at` em tempo real
**Arquivos:** `app/Http/Middleware/RequiresPlanFeature.php:13` · `app/Console/Commands/ExpireSubscriptions.php` · `routes/console.php:11`
Toda autorização deriva de `user.plan_id`, que só muda quando o cron roda. Nenhum ponto do request-path consulta `subscription.ends_at` em tempo real.
**Cenário:** se o `schedule:run` do SO não estiver provisionado, parar, ou o deploy não o configurar, trials vencidos e cancelados mantêm acesso pago indefinidamente, sem defesa secundária.
**Nota factual:** o schedule é `everyMinute()`, não 24h — a janela normal é ~1 min; o risco real é a dependência total do agendador (ponto único de falha silencioso).
**Mitigação:** defense-in-depth derivando acesso efetivo também de `ends_at` (ex.: accessor `User::effectivePlan()`).

---

## 🟡 MÉDIO

### 11. Downgrade não rebalanceia Produtos (só Receitas e Ingredientes)
**Arquivos:** `app/Observers/UserObserver.php:19-30` · `app/Http/Controllers/ProductController.php:194-207`
O `UserObserver` chama `rebalanceActive` para `Recipe` e `Ingredient`, mas nunca para `Product`.
**Cenário:** usuário Pro (`max_products=null`) com 100 produtos é rebaixado para Basic (`max_products=15`). Os 100 seguem `active=true`, editáveis e usáveis em produções; só a criação do 16º é bloqueada.
**Impacto:** bypass do limite quantitativo de produtos em downgrade pago→pago.

### 12. `pending` órfãs acumulam + `SAME_PLAN` checa o plano errado
**Arquivo:** `app/Http/Controllers/SubscriptionController.php:40-77`
Checkouts abandonados deixam `pending` sem limpeza/expiração. O guard `SAME_PLAN` compara com `user.plan->name`, não com pendings existentes → várias `pending` para o mesmo plano. Uma `pending` antiga concluída dias depois dispara `handleAuthorized` e "ressuscita" um plano abandonado.
**Relacionado (race):** `store()` cria o preapproval no MP **antes** de gravar a `Subscription` local → o webhook do novo preapproval pode chegar antes da linha existir (404 → retries).

### 13. `current()` usa `latest()` — pode não refletir a assinatura vigente
**Arquivo:** `app/Http/Controllers/SubscriptionController.php:21-24`
Retorna a assinatura mais recente por `created_at`, não a `authorized`. Uma `pending` recém-criada mascara a `authorized` real. Além disso, o trial é gravado com `mp_status='cancelled'` (`AuthController.php:34`), então durante o trial `current()` retorna uma assinatura "cancelled".

### 14. Sem deduplicação por `x-request-id` nem janela de frescor no `ts` → replay
**Arquivo:** `app/Services/MercadoPagoService.php:137-141`
O `ts` faz parte da mensagem assinada, mas não é validado contra o relógio. `x-request-id` é gravado em `IntegrationLog` mas nunca consultado para descartar reentregas. Amplifica todos os problemas de idempotência (#5, #6, #8).

### 15. Faltam índices nas queries quentes de assinatura
**Arquivo:** `database/migrations/2026_06_08_100000_create_subscriptions_table.php`
- `ExpireSubscriptions.php:19-22` filtra `cancel_at_period_end=true AND ends_at<=now()` — nenhuma das colunas é indexada (full table scan no cron).
- `SubscriptionController.php:48-50, 91-93` filtram `user_id + mp_status='authorized'` — só há índice simples em `user_id`.
**Sugestão:** índices `(cancel_at_period_end, ends_at)` e `(user_id, mp_status)`.

### 16. Chamadas HTTP ao MP sem timeout; webhook processado síncrono
**Arquivo:** `app/Services/MercadoPagoService.php:144-151`
`Http::withToken(...)` sem `->timeout()`/`->connectTimeout()`. O webhook é processado na própria request; uma chamada lenta ao MP segura o worker.
**Impacto:** risco de saturar workers e disparar cascata de reenvios do MP. Ideal: processar em fila após ACK.

### 17. Retorno `: array` quebra com resposta não-JSON do MP
**Arquivo:** `app/Services/MercadoPagoService.php:54, 68, 82`
`return $response->json();` com tipo `: array`. Resposta 2xx vazia/não-JSON → `null` → `TypeError` (não é `\RuntimeException`, logo não é capturado pelo `catch` em `handleMercadoPago:55`) → 500.

### 18. Vazamento de credencial parcial e PII em `IntegrationLog`
**Arquivo:** `app/Services/MercadoPagoService.php:153-173, 97-116`
`tokenHint()` grava os primeiros 16 chars do access token; `logOutgoing` grava `$response->json()` completo (metadados de pagamento, dados do pagador) e o `payload` inclui `payer_email` (PII).
**Sugestão:** reduzir o hint para 6-8 chars e redigir PII/respostas sensíveis.

### 19. `RequiresPlanFeature` dá 500 (não 403) se o usuário não tiver plano
**Arquivo:** `app/Http/Middleware/RequiresPlanFeature.php:13`
`$request->user()->load('plan')->plan->$feature` → se `plan` for `null`, `null->$feature` lança erro (HTTP 500). Falha fechada (não é bypass), mas tratamento inadequado.

### 20. `current()` pode retornar `plan: null` vs contrato TS não-nulo
**Arquivos:** `database/migrations/*add_plan_id_to_users_table*:13-17` (coluna nullable, sem default) · `SubscriptionController.php:29` · `frontend/src/lib/auth.ts:4-15` (`plan: UserPlan`)
Se um usuário ficar com `plan_id=null` (ex.: factory/seed/admin), o backend retorna `plan: null` e `PlanModal.buildFeatures(plan)` acessa `plan.max_recipes` direto → quebra.
**Sugestão:** NOT NULL + default no schema, ou fallback para `free` no controller.

---

## 🔵 BAIXO

- **Data exibida em UTC** para usuário BRT — `SubscriptionController.php:127` (`$endsAt->format('d/m/Y')`). Comparações internas são UTC e consistentes; problema só de apresentação.
- **Enum `mp_status` sem estado de trial/free** — trial é gravado como `cancelled` (gambiarra). `create_subscriptions_table.php:16`. Enviesa relatórios de churn.
- **Tipo TS `'basic' | 'pro'` hardcoded** vs backend dinâmico (`Rule::in(Plan::paidNames())`). Novo plano pago quebra o contrato TS silenciosamente. `SubscriptionService.ts:27` · `StoreSubscriptionRequest.php:19`.
- **`ends_at = null` em assinatura ativa nunca expira** — `where('ends_at','<=',now())` não casa com null. `WebhookController.php:83-88`.
- **Parsing de `x-signature` sem tolerância a malformação** — `explode('=', $part, 2)` gera warning se faltar `=`. `MercadoPagoService.php:128-131`.
- **`mp_preapproval_id UNIQUE NULLABLE`** — múltiplos NULLs OK em MySQL; frágil se migrar de SGBD. `create_subscriptions_table.php:15`.
- **Nomenclatura de migration enganosa** — `add_billing_cycle_to_subscriptions` adiciona `current_period_end`/`cancel_at_period_end`, não um ciclo. (Coluna `current_period_end` já removida.)
- **Schedule `everyMinute()` vs descrição "diária"** — funcional e idempotente, só divergência de expectativa. `routes/console.php:11`.

---

## ✅ Verificado e SEM problema

- Enforcement de limites/flags **no backend** (não só frontend): `RecipeController`, `IngredientController`, `InsumoController`, `ProductController` + middleware `plan.feature`.
- Escopo por `user_id` (sem IDOR nos fluxos lidos): Form Requests validam `Rule::exists(...)->where('user_id', ...)`.
- `handleCancelled` distingue corretamente cancelamento do usuário vs falha de pagamento e é idempotente quanto a `mp_status==='cancelled'`.
- Remoção de `current_period_end` limpa (nenhuma referência residual em código; só nas migrations).
- Consistência model↔migration de `Subscription`/`Plan`; casts adequados.
- `StoreSubscriptionRequest` valida `plan` contra `Plan::paidNames()`, mensagens em PT.
- Padrão de resposta (`success`/`data`/`message`/`error_code`) conforme CLAUDE.md.
- Nomes de plano (`free`/`trial`/`basic`/`pro`) batem entre migrations, controllers e requests.
- Cron `app:expire-subscriptions` agora idempotente (marca `cancel_at_period_end=false` ao processar).
- Decimais de preço (`decimal:2`) exibidos com 2 casas.

---

## Leitura geral — eixos prioritários

1. **Segurança do webhook** (#1 — secret vazio): corrigir primeiro, é praticamente uma linha.
2. **Idempotência/ordenação de webhooks** (#5, #6, #8, #14): reenvios e eventos fora de ordem concedem plano errado ou acesso grátis. Pede um padrão de dedupe (`x-request-id`) + guardas de estado.
3. **Estado órfão fora do alcance do cron** (#3, #5, #12): assinaturas que ninguém mais processa.

### Ordem de remediação sugerida
1. #1 (guarda de secret vazio) + #2 (`$hidden`) — rápidos, fecham segurança.
2. Pacote de idempotência de webhooks (#5, #6, #8, #14) — planejar com cuidado.
3. #7 (`paused` não rebaixa) e #3/#12 (estado órfão no `store`).
4. #10 (defense-in-depth com `ends_at`), #11 (rebalancear produtos), #15 (índices).
5. Demais médios/baixos conforme capacidade.

---

## ☑️ Checklist de remediação

> Marque conforme for concluindo. Numeração mantém a dos achados acima (o antigo #4 "trial reutilizável" foi removido — decidido que não é bug: não há exclusão de conta self-service e o telefone único já limita o abuso).

### 🔴 Crítico
- [x] #1 — Guarda de secret vazio no webhook (`validateWebhookSignature` + exceção no boot em produção)
- [x] #2 — `$hidden` no model `Subscription` (não vaza `mp_preapproval_id`/`user_id`/`plan_id`)
- [x] #3 — `store()` cria preapproval antes, usa `DB::transaction` e devolve a antiga ao cron

### 🟠 Alto
- [x] #5 — `processAuthorizedPayment` só reativa se a preapproval estiver `authorized` no MP (fonte da verdade); reativação completa (`mp_status`, `ends_at`, restaura `plan_id`)
- [x] #6 — `handleAuthorized` ignora webhook de assinatura superada (existe outra mais recente por `created_at`) → "a mais recente vence"
- [x] #7 — `handlePaused` põe a assinatura no radar do cron (`cancel_at_period_end=true` + `ends_at`); reativação vem pelo `authorized_payment`. Idempotente.
- [x] #8 — `handleAuthorized` idempotente: `starts_at` e e-mail só na primeira ativação (transição não-authorized → authorized); reentregas não duplicam
- [x] #9 — Lock atômico por usuário (`Cache::lock("subscription:{id}")`) em `store`/`cancel` via try/finally; duplo clique/concorrência retorna `SUBSCRIPTION_IN_PROGRESS` (409)
- [ ] #10 — Defense-in-depth: acesso efetivo derivado também de `ends_at` (`User::effectivePlan()`)

### 🟡 Médio
- [x] #11 — `UserObserver` rebalanceia também `Product` no downgrade (`max_products`); `Ingredient` já cobre insumos (mesma tabela)
- [x] #12 — `store()` retoma checkout de pending do mesmo plano (<24h, coluna `checkout_url`); as demais pendings são sempre canceladas (MP best-effort + local). Race webhook-antes-da-linha mantida (auto-resolve no retry do MP)
- [x] #13 — `current()` retorna a assinatura **vigente** (exclui `pending`, prioriza authorized>paused>cancelled); checkout em andamento vai para `currentPending` (rota nova). Front separa `subscription` (vigente) de `pending` (polling) — sem masking/deadlock
- [ ] #14 — Dedup por `x-request-id` + janela de frescor no `ts`
- [x] #15 — Índices `(cancel_at_period_end, ends_at)` e `(user_id, mp_status)`
- [x] #16 — Timeout nas chamadas HTTP ao MP (`connect_timeout=5s`, `timeout=15s`, configuráveis via `config/mercadopago.php`). Processar webhook em fila deixado fora de escopo (timeout já quebra a cascata de saturação)
- [ ] #17 — Retorno não-JSON do MP (`logOutgoing` já endurecido; falta `createPreapproval`/`getPreapproval`/`getAuthorizedPayment`)
- [ ] #18 — Reduzir `tokenHint` e redigir PII/respostas sensíveis em `IntegrationLog`
- [ ] #19 — `RequiresPlanFeature` retornar 403 (não 500) quando `plan` for null
- [ ] #20 — `plan_id` NOT NULL + default, ou fallback `free` no `current()`

### 🔵 Baixo
- [ ] Data exibida em BRT (não UTC) — `SubscriptionController.php:127`
- [ ] Enum `mp_status` com estado próprio de trial/free
- [ ] Tipo TS `'basic' | 'pro'` derivado do backend (`Plan::paidNames()`)
- [ ] `ends_at = null` em assinatura ativa nunca expira
- [ ] Parsing de `x-signature` tolerante a malformação
- [ ] Revisar `mp_preapproval_id UNIQUE NULLABLE` (portabilidade de SGBD)
- [ ] Renomear migration `add_billing_cycle_to_subscriptions`
- [ ] Alinhar expectativa do schedule (`everyMinute()` vs "diária")

### ✅ Extra já concluído
- [x] Cron `app:expire-subscriptions` idempotente (marca `cancel_at_period_end=false` ao processar)
- [x] Remoção de `current_period_end` sem referências residuais
- [x] Downgrade bloqueado no backend (`SubscriptionController::store`, `DOWNGRADE_NOT_ALLOWED`) e escondido no front (`PlanModal` só habilita planos de preço maior)
