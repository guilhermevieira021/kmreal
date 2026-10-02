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
  canceledAt: row.subscriptionCanceledAt?.toISOString() ?? null,
});

/**
 * Lê a assinatura e aplica a EXPIRAÇÃO AUTOMÁTICA: PRO vencido vira FREE na hora —
 * status EXPIRED, ou CANCELED se o cliente tinha cancelado a recorrência.
 * Chamado sempre que o app abre (/api/me) e em toda checagem de acesso PRO.
 */
export async function getSubscription(userId: string): Promise<SubscriptionInfo & { isPro: boolean }> {
  const db = getDb();
  let row = await db.user.findUniqueOrThrow({ where: { id: userId }, select: subscriptionSelect });

  if (isExpiredPro(row)) {
    // updateMany condicional: se um pagamento acabou de renovar, não rebaixa por engano.
    await db.user.updateMany({
      where: { id: userId, plan: "PRO", OR: [{ subscriptionExpiresAt: null }, { subscriptionExpiresAt: { lte: new Date() } }] },
      data: { plan: "FREE", subscriptionStatus: row.subscriptionCanceledAt ? "CANCELED" : "EXPIRED" },
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

/** Eventos que liberam/renovam 30 dias de PRO. */
export const GRANT_EVENTS = ["purchase_approved", "subscription_renewed"] as const;
/** Dinheiro devolvido: acesso cai na hora. */
export const REVOKE_EVENTS = ["refund", "chargeback"] as const;
/** Recorrência cancelada: acesso vai até o fim do período pago. */
export const CANCEL_EVENTS = ["subscription_canceled"] as const;

export type CaktoEventKind = "grant" | "revoke" | "cancel" | "ignore";

export function classifyCaktoEvent(event: string): CaktoEventKind {
  if ((GRANT_EVENTS as readonly string[]).includes(event)) return "grant";
  if ((REVOKE_EVENTS as readonly string[]).includes(event)) return "revoke";
  if ((CANCEL_EVENTS as readonly string[]).includes(event)) return "cancel";
  return "ignore";
}

export interface CaktoEvent {
  event: string;
  orderId: string;
  email: string;
  status: string;
  subscriptionId: string | null;
  /** Data do cancelamento informada pela Cakto (subscription.canceledAt) */
  canceledAt: Date | null;
  payload: Prisma.InputJsonValue;
}

export type WebhookResult =
  | { result: "activated"; userId: string; expiresAt: string }
  | { result: "canceled"; userId: string; accessUntil: string | null }
  | { result: "revoked"; userId: string }
  | { result: "duplicate" }
  | { result: "pending" }
  | { result: "no_account" };

/** Comparação de segredo em tempo constante. */
export function secretMatches(received: unknown, expected: string | undefined): boolean {
  if (!expected || typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Aplica um evento da Cakto já validado. Todo evento tratado é registrado em PaymentEvent
 * (idempotente: mesmo pedido + mesmo evento = "duplicate", nada muda).
 *
 * - grant  (purchase_approved, subscription_renewed): +30 dias de PRO; sem conta → pendente
 * - cancel (subscription_canceled): marca o cancelamento; o PRO segue até o vencimento pago
 * - revoke (refund, chargeback): PRO removido na hora (status CANCELED)
 */
export async function applyCaktoEvent(event: CaktoEvent, kind: Exclude<CaktoEventKind, "ignore">): Promise<WebhookResult> {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const existing = await tx.paymentEvent.findUnique({
      where: { provider_orderId_event: { provider: "cakto", orderId: event.orderId, event: event.event } },
    });
    if (existing) return { result: "duplicate" } as const;

    const user = await tx.user.findUnique({ where: { email: event.email }, select: { id: true } });
    const now = new Date();
    await tx.paymentEvent.create({
      data: {
        provider: "cakto",
        event: event.event,
        orderId: event.orderId,
        email: event.email,
        status: event.status,
        payload: event.payload,
        userId: user?.id ?? null,
        // Só compras sem conta ficam "pendentes" (appliedAt null) para o cadastro aplicar.
        appliedAt: user || kind !== "grant" ? now : null,
      },
    });

    if (!user) {
      if (kind === "revoke") {
        // Reembolso antes de criar a conta: anula a compra pendente desse pedido.
        await tx.paymentEvent.updateMany({
          where: { orderId: event.orderId, appliedAt: null },
          data: { appliedAt: now },
        });
      }
      return { result: kind === "grant" ? "pending" : "no_account" } as const;
    }

    if (kind === "grant") {
      const updated = await grantPro(tx, user.id, {
        orderId: event.orderId,
        email: event.email,
        paidAt: now,
        subscriptionId: event.subscriptionId,
      });
      return { result: "activated", userId: user.id, expiresAt: updated.subscriptionExpiresAt!.toISOString() } as const;
    }

    if (kind === "cancel") {
      // Mantém plan/status/vencimento: o acesso pago continua até subscriptionExpiresAt.
      // No vencimento, a expiração automática grava CANCELED em vez de EXPIRED.
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          subscriptionCanceledAt: event.canceledAt ?? now,
          ...(event.subscriptionId ? { caktoSubscriptionId: event.subscriptionId } : {}),
        },
        select: subscriptionSelect,
      });
      if (!hasProAccess(updated, now)) {
        await tx.user.update({ where: { id: user.id }, data: { plan: "FREE", subscriptionStatus: "CANCELED" } });
      }
      return {
        result: "canceled",
        userId: user.id,
        accessUntil: hasProAccess(updated, now) ? updated.subscriptionExpiresAt!.toISOString() : null,
      } as const;
    }

    // revoke
    await tx.user.update({
      where: { id: user.id },
      data: {
        plan: "FREE",
        subscriptionStatus: "CANCELED",
        subscriptionExpiresAt: now,
        subscriptionCanceledAt: now,
      },
    });
    return { result: "revoked", userId: user.id } as const;
  });
}

/**
 * Pagamento feito antes de criar a conta: ao cadastrar, aplica compras/renovações pendentes
 * do mesmo e-mail feitas nos últimos 30 dias (reembolsadas já foram anuladas).
 */
export async function claimPendingPurchases(userId: string, email: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - PRO_PERIOD_DAYS * DAY_MS);
  return db.$transaction(async (tx) => {
    const pending = await tx.paymentEvent.findMany({
      where: { email, appliedAt: null, createdAt: { gte: since }, event: { in: [...GRANT_EVENTS] } },
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
