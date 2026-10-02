import "server-only";
import { auth } from "@/auth";
import { getSubscription } from "./subscription";

/**
 * Guarda das páginas PRO (Server Components). Lê o plano no banco a cada acesso — não do
 * token de sessão — então ativação e expiração valem na hora, sem precisar sair e entrar.
 * Quem não está logado já foi barrado antes, pelo middleware de autenticação.
 */
export async function currentUserHasPro(): Promise<boolean> {
  const userId = (await auth())?.user?.id;
  if (!userId) return false;
  return (await getSubscription(userId)).isPro;
}
