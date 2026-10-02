/**
 * Planos e regra de acesso. Módulo puro: usado no servidor (API, páginas) e no cliente (telas).
 */

export type Plan = "FREE" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELED";

export interface SubscriptionInfo {
  plan: Plan;
  status: SubscriptionStatus | null;
  /** ISO */
  startedAt: string | null;
  /** ISO */
  expiresAt: string | null;
  /** ISO — recorrência cancelada na Cakto (o acesso pago segue até expiresAt) */
  canceledAt: string | null;
}

/** Campos mínimos para decidir o acesso (aceita o registro do banco ou o DTO da API). */
export interface AccessFields {
  plan: Plan;
  subscriptionStatus?: SubscriptionStatus | null;
  status?: SubscriptionStatus | null;
  subscriptionExpiresAt?: Date | string | null;
  expiresAt?: Date | string | null;
}

/**
 * PRO só quando: plano PRO + assinatura ACTIVE + vencimento no futuro.
 * Qualquer outra combinação (inclusive dado incompleto) = sem acesso.
 */
export function hasProAccess(user: AccessFields | null | undefined, now: Date = new Date()): boolean {
  if (!user) return false;
  const status = user.subscriptionStatus ?? user.status ?? null;
  const rawExpires = user.subscriptionExpiresAt ?? user.expiresAt ?? null;
  if (user.plan !== "PRO" || status !== "ACTIVE" || !rawExpires) return false;
  const expires = rawExpires instanceof Date ? rawExpires : new Date(rawExpires);
  return Number.isFinite(expires.getTime()) && expires.getTime() > now.getTime();
}

/** Venceu e precisa ser rebaixado (expiração automática). */
export function isExpiredPro(user: AccessFields, now: Date = new Date()): boolean {
  return user.plan === "PRO" && !hasProAccess(user, now);
}

/** Disparado quando o servidor nega um recurso PRO: a tela abre a oferta e o plano é rechecado. */
export const PRO_REQUIRED_EVENT = "kmreal:pro-required";

/* ---------- Oferta ---------- */

export const PRO_PRICE_LABEL = "R$ 19,90/mês";
export const PRO_PERIOD_DAYS = 30;

const DEFAULT_CHECKOUT_URL = "https://pay.cakto.com.br/h2mn4pv_1166691";

/**
 * Link do checkout. O e-mail da conta vai como sugestão de preenchimento (se a página da
 * Cakto aceitar o parâmetro); a ativação depende do e-mail usado na compra.
 */
export function checkoutUrl(email?: string | null): string {
  const base = process.env.NEXT_PUBLIC_CAKTO_CHECKOUT_URL || DEFAULT_CHECKOUT_URL;
  if (!email) return base;
  const url = new URL(base);
  url.searchParams.set("email", email);
  return url.toString();
}

/** Benefícios exibidos no bloqueio "Recurso PRO". */
export const PRO_BENEFITS = [
  "Descubra quanto seu veículo realmente custa por KM",
  "Evite fretes que dão prejuízo",
  "Controle custos ocultos",
  "Saúde financeira completa",
  "Relatórios profissionais",
] as const;

/** Comparação da página /upgrade. `highlight` = destaque pedido para a venda. */
export const PLAN_COMPARISON: { feature: string; free: boolean | string; highlight?: boolean }[] = [
  { feature: "Cadastro de viagens e veículos", free: true },
  { feature: "Dashboard e histórico", free: "Básico" },
  { feature: "Simulador de frete", free: "Básico" },
  { feature: "Custo real por KM", free: false, highlight: true },
  { feature: "Lucro real por KM", free: false },
  { feature: "Custos fixos, desgaste e manutenção", free: false },
  { feature: "Saúde financeira", free: false, highlight: true },
  { feature: "Simulador avançado com lucro real", free: false, highlight: true },
  { feature: "Manutenções, vida útil e revisões", free: false, highlight: true },
  { feature: "Alertas inteligentes e insights", free: false },
  { feature: "Ranking e comparativos", free: false },
  { feature: "Relatórios em PDF", free: false, highlight: true },
];
