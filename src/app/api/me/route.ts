import { authed } from "@/server/api";
import { getDb } from "@/server/db";
import { getSubscription } from "@/server/subscription";

/**
 * Usuário logado + assinatura. O app chama ao abrir: é aqui que um PRO vencido
 * vira FREE/EXPIRED (expiração automática) antes de qualquer tela usar o plano.
 */
export const GET = authed(async ({ userId }) => {
  const [user, subscription] = await Promise.all([
    getDb().user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    getSubscription(userId),
  ]);
  return { user, subscription };
});
