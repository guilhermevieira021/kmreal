import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { applyCaktoEvent, classifyCaktoEvent, secretMatches } from "@/server/subscription";

/**
 * Webhook da Cakto. Formato: { secret, event, data: { id, status, customer: { email }, subscription? } }
 *
 *   purchase_approved / subscription_renewed  → +30 dias de PRO (exige status "paid")
 *   subscription_canceled                      → cancelada; PRO segue até o fim do período pago
 *   refund / chargeback                        → PRO removido na hora
 *   demais (pix_gerado, boleto_gerado, purchase_refused, checkout_abandonment...) → 200 "ignored"
 *
 * 401 quando: JSON inválido, secret errado, evento ausente, e-mail/id ausentes num evento tratado,
 * ou compra/renovação com status diferente de "paid". Reenvio do mesmo pedido+evento → 200 "duplicate".
 */

const unauthorized = (reason: string) => {
  console.warn(`[webhook cakto] rejeitado: ${reason}`);
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
};

const handledSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    status: z.string().optional().default(""),
    customer: z.object({ email: z.string().trim().toLowerCase().email() }),
    subscription: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String).optional(),
        canceledAt: z.string().nullish(),
      })
      .nullish(),
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unauthorized("JSON inválido");
  }

  // 1. Segredo (comparação em tempo constante) — antes de olhar qualquer outro campo.
  const secret = (body as { secret?: unknown } | null)?.secret;
  if (!secretMatches(secret, process.env.CAKTO_WEBHOOK_SECRET)) {
    return unauthorized(process.env.CAKTO_WEBHOOK_SECRET ? "secret incorreto" : "CAKTO_WEBHOOK_SECRET não configurado");
  }

  // 2. Tipo de evento.
  const eventName = (body as { event?: unknown }).event;
  if (typeof eventName !== "string" || !eventName) return unauthorized("evento ausente");
  const kind = classifyCaktoEvent(eventName);
  if (kind === "ignore") {
    // Avisos sem efeito no acesso: 200 para a Cakto não marcar o webhook como falho.
    console.info(`[webhook cakto] evento ${eventName} ignorado`);
    return NextResponse.json({ result: "ignored", event: eventName });
  }

  // 3. Dados obrigatórios para eventos que mudam a assinatura.
  const parsed = handledSchema.safeParse(body);
  if (!parsed.success) return unauthorized(`payload incompleto (${eventName})`);
  const { data } = parsed.data;
  if (kind === "grant" && data.status !== "paid") return unauthorized(`${eventName} com status ${data.status || "vazio"}`);

  const canceledAt = data.subscription?.canceledAt ? new Date(data.subscription.canceledAt) : null;

  // 4. Aplica (o payload é guardado sem o segredo, para auditoria).
  const { secret: _omit, ...auditPayload } = body as Record<string, unknown>;
  void _omit;
  try {
    const outcome = await applyCaktoEvent(
      {
        event: eventName,
        orderId: data.id,
        email: data.customer.email,
        status: data.status,
        subscriptionId: data.subscription?.id ?? null,
        canceledAt: canceledAt && Number.isFinite(canceledAt.getTime()) ? canceledAt : null,
        payload: auditPayload as Prisma.InputJsonValue,
      },
      kind,
    );
    console.info(`[webhook cakto] ${eventName} pedido ${data.id} (${data.customer.email}): ${outcome.result}`);
    // "pending" = pagamento sem conta com esse e-mail ainda: aplicado no cadastro. 202 evita reenvios.
    return NextResponse.json(outcome, { status: outcome.result === "pending" ? 202 : 200 });
  } catch (error) {
    console.error("[webhook cakto] erro ao aplicar", error);
    // 500 faz a Cakto tentar de novo.
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
