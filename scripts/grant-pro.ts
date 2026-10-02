/**
 * Ativação manual do PRO (suporte) — ex.: cliente pagou com outro e-mail na Cakto.
 * Usa a mesma regra do webhook (30 dias; renovação soma ao prazo atual) e registra auditoria.
 *
 *   npm run pro:grant -- cliente@email.com "pagou com outro e-mail, pedido 123"
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveDirectUrl } from "../src/lib/database-url";
import { grantPro } from "../src/server/grant-pro";

async function main() {
  const [rawEmail, ...noteParts] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  if (!email) {
    console.error('Uso: npm run pro:grant -- email@cliente.com "motivo"');
    process.exit(1);
  }
  const url = resolveDirectUrl()?.value;
  if (!url) throw new Error("Defina DATABASE_URL (veja .env.example)");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (!user) throw new Error(`Nenhuma conta com o e-mail ${email}`);
      const orderId = `manual-${Date.now()}`;
      await tx.paymentEvent.create({
        data: {
          provider: "manual",
          event: "manual_grant",
          orderId,
          email,
          status: "paid",
          userId: user.id,
          appliedAt: new Date(),
          payload: { note: noteParts.join(" ") || "ativação manual" },
        },
      });
      return grantPro(tx, user.id, { orderId, email, paidAt: new Date() });
    });
    console.log(`PRO ativo para ${email} até ${result.subscriptionExpiresAt?.toLocaleString("pt-BR")}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
