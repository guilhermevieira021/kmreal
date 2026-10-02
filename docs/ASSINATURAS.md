# Assinaturas: FREE e PRO (Cakto)

## Planos

| | FREE (todo usuário novo) | PRO — R$ 19,90/mês |
|---|---|---|
| Viagens e veículos (cadastro, edição) | ✓ | ✓ |
| Dashboard | Básico (lucro e custos operacionais) | Completo (lucro real, custo real, comparativos) |
| Histórico | ✓ (sem exportação) | ✓ + PDF |
| Simulador | Básico (receita, custo e lucro operacional por km) | Avançado (lucro real projetado, comparação com a média) |
| Meta mensal, perfil, aparência | ✓ | ✓ |
| Custo/lucro real por km, custos fixos, desgaste, manutenção | — | ✓ |
| Saúde financeira, alertas, insights, ranking | — | ✓ |
| Saúde do veículo, manutenções, vida útil, revisões | — | ✓ |
| Relatórios PDF (viagens e lucratividade) | — | ✓ |

O FREE **vê** os recursos PRO (cards com 🔒, selo PRO, telas com a oferta) e, ao tocar, recebe o bloqueio "🔒 Recurso PRO" com o botão **ASSINAR PRO**.

## Estrutura

Colunas em `User` (Prisma):

| Campo | Valores |
|---|---|
| `plan` | `FREE` (padrão) · `PRO` |
| `subscriptionStatus` | `ACTIVE` · `EXPIRED` · `CANCELED` · `null` (nunca assinou) |
| `subscriptionStartedAt`, `subscriptionExpiresAt` | datas |
| `caktoCustomerEmail`, `caktoOrderId` | último pagamento aplicado |

Tabela `PaymentEvent`: todo webhook aceito (pedido, e-mail, status, payload sem o segredo, a quem foi aplicado). Garante **idempotência** (pedido + evento únicos) e permite **pagamento pendente** (e-mail ainda sem conta).

## Regra de acesso — `hasProAccess(user)` (`src/lib/subscription.ts`)

`true` somente se `plan = PRO` **e** `subscriptionStatus = ACTIVE` **e** `subscriptionExpiresAt > agora`. Qualquer outra combinação é `false`.

## Onde o PRO é exigido

| Camada | Arquivo | O que faz |
|---|---|---|
| Middleware de autenticação | `src/middleware.ts` + `src/auth.config.ts` | Exige login em toda a área do app, inclusive `/upgrade` |
| Páginas PRO | `src/server/page-guard.ts` (`currentUserHasPro`) | `/saude`, `/veiculos/ranking`, `/veiculos/[id]/saude` mostram a oferta para FREE — decidido no servidor |
| API | `src/server/subscription.ts` (`requirePro`) | 403 `PRO_REQUIRED` em manutenções (criar/editar/excluir) e em custos fixos/vida útil de veículos |
| Telas | `DataProvider.isPro` | FREE recebe taxas de custo real vazias → todos os números viram operacionais; recursos PRO aparecem bloqueados |

O plano é sempre lido **do banco**, não do token de sessão: ativação e expiração valem na hora, sem sair e entrar.

## Fluxo de compra

1. Motorista logado toca num recurso PRO (ou Perfil → Plano, ou `/upgrade`).
2. Vê o bloqueio/oferta com **"Você está assinando para: email@da.conta"** e o aviso para usar o mesmo e-mail na compra.
3. **ASSINAR PRO** abre o checkout da Cakto em nova aba (com o e-mail da conta sugerido no link).
4. Paga. Ao voltar ao app, o plano é rechecado automaticamente (também há o botão "Atualizar meu plano" em `/upgrade`).

## Fluxo de ativação (`POST /api/webhooks/cakto`)

1. Cakto envia `{ secret, event, data: { customer: { email }, status, id } }`.
2. Validação — qualquer falha responde **401**: segredo (comparação em tempo constante com `CAKTO_WEBHOOK_SECRET`), JSON válido, `event = purchase_approved`, `status = paid`, e-mail e id presentes.
3. Registra o evento em `PaymentEvent` (pedido repetido → **200 duplicate**, nada muda).
4. Localiza o usuário pelo e-mail (sem diferenciar maiúsculas) e atualiza: `plan = PRO`, `status = ACTIVE`, `started_at = agora`, `expires_at = agora + 30 dias`, `cakto_customer_email`, `cakto_order_id` → **200 activated**.
   - **Renovação antes de vencer:** os 30 dias somam ao vencimento atual (ninguém perde dias pagos) e `started_at` é mantido.
5. Sem conta com esse e-mail → **202 pending**. Quando alguém se cadastrar com o e-mail (até 30 dias depois), o PRO é ativado no cadastro, contando 30 dias da data do pagamento.

## Expiração automática

Toda vez que o app abre (`GET /api/me`) e em toda checagem de PRO (`getSubscription`): PRO vencido vira `plan = FREE`, `status = EXPIRED`. Os recursos PRO bloqueiam na hora; **os dados continuam salvos** e voltam a aparecer ao renovar.

## Operação

- **Ativação manual** (ex.: pagou com outro e-mail): `npm run pro:grant -- cliente@email.com "motivo"` — mesma regra do webhook, registra auditoria em `PaymentEvent`.
- **Conferir configuração:** `GET /api/health` → `"payments": "configured"`.
- **Testar o webhook** (troque URL e segredo):

```bash
curl -X POST https://SEU-APP/api/webhooks/cakto -H "Content-Type: application/json" \
  -d '{"secret":"SEU_SECRET","event":"purchase_approved","data":{"customer":{"email":"cliente@email.com"},"status":"paid","id":"teste-1"}}'
```

## Ainda não tratado (próximos passos)

- Eventos de **reembolso, chargeback e cancelamento** da Cakto (hoje recebem 401 e não alteram a assinatura). Quando definidos, mapear para `CANCELED`/`FREE` em `src/app/api/webhooks/cakto/route.ts` — o status `CANCELED` já existe no banco.
- Assinatura recorrente: cada cobrança aprovada da Cakto deve chegar como `purchase_approved` com novo `id`; confirme no painel da Cakto como a renovação é notificada.
