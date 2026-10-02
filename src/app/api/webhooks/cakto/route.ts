import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { applyCaktoPurchase, secretMatches } from "@/server/subscription";

/**
 * Webhook da Cakto — ativa o PRO quando a compra é aprovada.
 *
 * Esperado: { secret, event: "purchase_approved", data: { customer: { email }, status: "paid", id } }
 * Qualquer validação que falhe → 401 (segredo, evento, status ou dados obrigatórios).
 * Reenvios do mesmo pedido são idempotentes (200, sem estender o prazo de novo).
 */

const unauthorized = (reason: string) => {
  console.warn(`[webhook cakto] rejeitado: ${reason}`);
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
};

const payloadSchema = z.object({
  secret: z.string(),
  event: z.string(),
  data: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    status: z.string(),
    customer: z.object({ email: z.string().trim().toLowerCase().email() }),
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

  // 2. Formato, evento e status.
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return unauthorized("payload incompleto");
  const { event, data } = parsed.data;
  if (event !== "purchase_approved") return unauthorized(`evento ${event}`);
  if (data.status !== "paid") return unauthorized(`status ${data.status}`);

  // 3. Ativação (o payload é guardado sem o segredo, para auditoria).
  const { secret: _omit, ...auditPayload } = body as Record<string, unknown>;
  void _omit;
  try {
    const outcome = await applyCaktoPurchase({
      event,
      orderId: data.id,
      email: data.customer.email,
      status: data.status,
      payload: auditPayload as Prisma.InputJsonValue,
    });
    console.info(`[webhook cakto] pedido ${data.id} (${data.customer.email}): ${outcome.result}`);
    // "pending" = pagamento sem conta com esse e-mail ainda: aplicado no cadastro. 202 evita reenvios.
    return NextResponse.json(outcome, { status: outcome.result === "pending" ? 202 : 200 });
  } catch (error) {
    console.error("[webhook cakto] erro ao aplicar", error);
    // 500 faz a Cakto tentar de novo.
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
