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

## Eventos da Cakto (`POST /api/webhooks/cakto`)

Formato (documentação da Cakto): `{ secret, event, data: { id, status, customer: { email }, subscription? } }`.

| Evento | Efeito | Resposta |
|---|---|---|
| `purchase_approved` (status `paid`) | +30 dias de PRO. Primeira cobrança, inclusive de assinatura | 200 `activated` |
| `subscription_renewed` (status `paid`) | +30 dias somados ao vencimento atual | 200 `activated` |
| `subscription_canceled` | Marca o cancelamento; **o PRO continua até o fim do período pago**. No vencimento, vira FREE com status `CANCELED` | 200 `canceled` |
| `refund` / `chargeback` | Dinheiro devolvido: **PRO removido na hora** (FREE / `CANCELED`) | 200 `revoked` |
| `purchase_refused`, `pix_gerado`, `boleto_gerado`, `picpay_gerado`, `checkout_abandonment` e outros | Nenhum (apenas registro no log) | 200 `ignored` |

Validações — qualquer falha responde **401**: JSON válido, `secret` igual a `CAKTO_WEBHOOK_SECRET` (comparação em tempo constante), `event` presente, e-mail e id do pedido nos eventos tratados, status `paid` em compra/renovação.

- **Idempotência:** mesmo pedido + mesmo evento chegando de novo → 200 `duplicate`, nada muda.
- **E-mail sem conta:** compra/renovação fica **pendente** (202 `pending`) e é aplicada no cadastro (30 dias contados do pagamento). Se o pedido for reembolsado antes do cadastro, a pendência é anulada (200 `no_account`).
- **Voltou a assinar:** um pagamento novo limpa o cancelamento anterior.
- O usuário guarda `subscriptionCanceledAt` (cancelamento pedido) e `caktoSubscriptionId` (id da assinatura na Cakto).

## Expiração automática

Toda vez que o app abre (`GET /api/me`) e em toda checagem de PRO (`getSubscription`): PRO vencido vira `plan = FREE` com `status = EXPIRED` — ou `CANCELED`, se o cliente tinha cancelado a recorrência. Os recursos PRO bloqueiam na hora; **os dados continuam salvos** e voltam a aparecer ao assinar de novo.

Renovação **recusada** não tem evento próprio na Cakto: sem `subscription_renewed`, o PRO simplesmente vence na data e vira FREE / `EXPIRED`.

## Operação

- **Ativação manual** (ex.: pagou com outro e-mail): `npm run pro:grant -- cliente@email.com "motivo"` — mesma regra do webhook, registra auditoria em `PaymentEvent`.
- **Conferir configuração:** `GET /api/health` → `"payments": "configured"`.
- **Testar o webhook** (troque URL e segredo):

```bash
curl -X POST https://SEU-APP/api/webhooks/cakto -H "Content-Type: application/json" \
  -d '{"secret":"SEU_SECRET","event":"purchase_approved","data":{"customer":{"email":"cliente@email.com"},"status":"paid","id":"teste-1"}}'
```

