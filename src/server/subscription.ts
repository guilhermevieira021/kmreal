import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { hasProAccess, isExpiredPro, PRO_PERIOD_DAYS, type SubscriptionInfo } from "@/lib/subscription";
import { getDb } from "./db";
import { HttpError } from "./errors";
import { grantPro, subscriptionSelect, type SubscriptionRow } from "./grant-pro";

const DAY_MS = 86_400_000;

const toInfo = (row: SubscriptionRow): SubscriptionInfo => ({
  plan: row.plan,
  status: row.subscriptionStatus,
  startedAt: row.subscriptionStartedAt?.toISOString() ?? null,
  expiresAt: row.subscriptionExpiresAt?.toISOString() ?? null,
});

/**
 * Lê a assinatura e aplica a EXPIRAÇÃO AUTOMÁTICA: PRO vencido vira FREE/EXPIRED na hora.
 * Chamado sempre que o app abre (/api/me) e em toda checagem de acesso PRO.
 */
export async function getSubscription(userId: string): Promise<SubscriptionInfo & { isPro: boolean }> {
  const db = getDb();
  let row = await db.user.findUniqueOrThrow({ where: { id: userId }, select: subscriptionSelect });

  if (isExpiredPro(row)) {
    // updateMany condicional: se um pagamento acabou de renovar, não rebaixa por engano.
    await db.user.updateMany({
      where: { id: userId, plan: "PRO", OR: [{ subscriptionExpiresAt: null }, { subscriptionExpiresAt: { lte: new Date() } }] },
      data: { plan: "FREE", subscriptionStatus: "EXPIRED" },
    });
    row = await db.user.findUniqueOrThrow({ where: { id: userId }, select: subscriptionSelect });
  }

  return { ...toInfo(row), isPro: hasProAccess(row) };
}

/** Exige PRO numa rota da API: 403 com código próprio para a tela abrir a oferta. */
export async function requirePro(userId: string): Promise<void> {
  const { isPro } = await getSubscription(userId);
  if (!isPro) throw new HttpError(403, "Recurso PRO. Assine para desbloquear.", "PRO_REQUIRED");
}

/* ---------- Webhook Cakto ---------- */

export interface CaktoPurchase {
  event: string;
  orderId: string;
  email: string;
  status: string;
  payload: Prisma.InputJsonValue;
}

export type ActivationResult =
  | { result: "activated"; userId: string; expiresAt: string }
  | { result: "duplicate" }
  | { result: "pending" };

/** Comparação de segredo em tempo constante. */
export function secretMatches(received: unknown, expected: string | undefined): boolean {
  if (!expected || typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Aplica uma compra aprovada (já validada): registra o evento (idempotente pelo id do pedido)
 * e ativa o usuário com o mesmo e-mail. Sem conta com esse e-mail, fica pendente até o cadastro.
 */
export async function applyCaktoPurchase(purchase: CaktoPurchase): Promise<ActivationResult> {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const existing = await tx.paymentEvent.findUnique({
      where: { provider_orderId_event: { provider: "cakto", orderId: purchase.orderId, event: purchase.event } },
    });
    if (existing) return { result: "duplicate" } as const;

    const user = await tx.user.findUnique({ where: { email: purchase.email }, select: { id: true } });
    const now = new Date();
    await tx.paymentEvent.create({
      data: {
        provider: "cakto",
        event: purchase.event,
        orderId: purchase.orderId,
        email: purchase.email,
        status: purchase.status,
        payload: purchase.payload,
        userId: user?.id ?? null,
        appliedAt: user ? now : null,
      },
    });
    if (!user) return { result: "pending" } as const;

    const updated = await grantPro(tx, user.id, { orderId: purchase.orderId, email: purchase.email, paidAt: now });
    return { result: "activated", userId: user.id, expiresAt: updated.subscriptionExpiresAt!.toISOString() } as const;
  });
}

/**
 * Pagamento feito antes de criar a conta (ou com a conta criada depois): ao cadastrar,
 * aplica compras pendentes do mesmo e-mail feitas nos últimos 30 dias.
 */
export async function claimPendingPurchases(userId: string, email: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - PRO_PERIOD_DAYS * DAY_MS);
  return db.$transaction(async (tx) => {
    const pending = await tx.paymentEvent.findMany({
      where: { email, appliedAt: null, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });
    for (const event of pending) {
      // Os 30 dias contam da data do pagamento, não do cadastro.
      await grantPro(tx, userId, { orderId: event.orderId, email, paidAt: event.createdAt });
      await tx.paymentEvent.update({ where: { id: event.id }, data: { userId, appliedAt: new Date() } });
    }
    return pending.length > 0;
  });
}
