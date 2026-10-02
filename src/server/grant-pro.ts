/**
 * Regra única de concessão do PRO. Sem "server-only" de propósito: também é usada
 * pelo script de ativação manual (scripts/grant-pro.ts), que roda fora do Next.js.
 */
import { hasProAccess, PRO_PERIOD_DAYS } from "../lib/subscription";
import type { Prisma } from "../generated/prisma/client";

const DAY_MS = 86_400_000;

export const subscriptionSelect = {
  id: true,
  plan: true,
  subscriptionStatus: true,
  subscriptionStartedAt: true,
  subscriptionExpiresAt: true,
} satisfies Prisma.UserSelect;

export type SubscriptionRow = Prisma.UserGetPayload<{ select: typeof subscriptionSelect }>;

/**
 * Libera/renova 30 dias de PRO. Renovação antes do vencimento soma a partir do vencimento
 * atual (o motorista não perde dias pagos); senão, conta a partir do pagamento.
 */
export async function grantPro(
  tx: Prisma.TransactionClient,
  userId: string,
  { orderId, email, paidAt }: { orderId: string | null; email: string; paidAt: Date },
): Promise<SubscriptionRow> {
  const current = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: subscriptionSelect });
  const active = hasProAccess(current, paidAt);
  const base = active && current.subscriptionExpiresAt ? current.subscriptionExpiresAt : paidAt;

  return tx.user.update({
    where: { id: userId },
    data: {
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      subscriptionStartedAt: active ? current.subscriptionStartedAt : paidAt,
      subscriptionExpiresAt: new Date(base.getTime() + PRO_PERIOD_DAYS * DAY_MS),
      caktoCustomerEmail: email,
      ...(orderId ? { caktoOrderId: orderId } : {}),
    },
    select: subscriptionSelect,
  });
}
