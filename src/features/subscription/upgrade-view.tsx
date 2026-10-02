"use client";

import { useState } from "react";
import { BadgeCheck, Check, Minus, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { PLAN_COMPARISON, PRO_BENEFITS, PRO_PRICE_LABEL } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { CheckoutEmailNotice, SubscribeButton } from "./pro-offer";

const isoDay = (iso: string | null) => (iso ? formatDate(iso.slice(0, 10)) : "");

function ComparisonTable() {
  return (
    <div className="bg-card overflow-hidden rounded-2xl border shadow-xs">
      <div className="text-muted-foreground grid grid-cols-[1fr_4rem_4rem] border-b px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
        <span>Recurso</span>
        <span className="text-center">Free</span>
        <span className="text-primary-strong text-center">Pro</span>
      </div>
      <ul className="divide-y">
        {PLAN_COMPARISON.map((row) => (
          <li
            key={row.feature}
            className={cn("grid min-h-12 grid-cols-[1fr_4rem_4rem] items-center px-4 py-2.5 text-sm", row.highlight && "bg-accent/60")}
          >
            <span className={cn(row.highlight && "font-semibold")}>
              {row.feature}
              {row.highlight && <Sparkles className="text-primary-strong ml-1 inline size-3.5" aria-label="destaque" />}
            </span>
            <span className="flex justify-center">
              {row.free === true ? (
                <Check className="text-positive size-5" aria-label="incluso" />
              ) : row.free === false ? (
                <Minus className="text-muted-foreground size-5" aria-label="não incluso" />
              ) : (
                <span className="text-muted-foreground text-xs">{row.free}</span>
              )}
            </span>
            <span className="flex justify-center">
              <Check className="text-positive size-5" strokeWidth={3} aria-label="incluso" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UpgradeView() {
  const { account, isPro, isLoading, refreshAccount } = useData();
  const [checking, setChecking] = useState(false);
  const subscription = account?.subscription;

  async function handleCheck() {
    setChecking(true);
    const me = await refreshAccount();
    setChecking(false);
    if (me?.subscription.isPro) toast.success("PRO ativado! Todos os recursos foram liberados.");
    else if (me) toast.info("Ainda não recebemos a confirmação. Pode levar alguns minutos — confira se usou o mesmo e-mail da sua conta.");
    else toast.error("Sem conexão. Tente de novo.");
  }

  if (isLoading || !subscription) {
    return (
      <>
        <PageHeader title="KmReal PRO" backHref="/perfil" />
        <Skeleton className="h-64 rounded-3xl" />
      </>
    );
  }

  if (isPro) {
    return (
      <>
        <PageHeader title="KmReal PRO" backHref="/perfil" />
        <section className="bg-hero text-hero-foreground rounded-3xl p-5 shadow-lg">
          <p className="flex items-center gap-2 text-lg font-bold">
            <BadgeCheck className="size-6" /> Você é PRO
          </p>
          <p className="mt-1 text-sm opacity-80">
            Ativo desde {isoDay(subscription.startedAt)} · renova até {isoDay(subscription.expiresAt)}
          </p>
        </section>
        <Section title="Incluso no seu plano" className="mt-6">
          <ul className="bg-card grid gap-2.5 rounded-2xl border p-4 shadow-xs">
            {PRO_BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <Check className="text-positive size-4 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Renovar antes do vencimento" className="mt-6">
          <p className="text-muted-foreground px-1 text-sm">
            Pagando antes de {isoDay(subscription.expiresAt)}, os 30 dias novos somam ao prazo atual.
          </p>
          <SubscribeButton className="mt-2" />
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="KmReal PRO" description="Descubra seu lucro de verdade" backHref="/perfil" />

      {subscription.status === "EXPIRED" && subscription.expiresAt && (
        <p role="status" className="bg-warning/12 text-warning mb-3 rounded-xl px-4 py-3 text-sm font-medium">
          Sua assinatura PRO venceu em {isoDay(subscription.expiresAt)}. Assine de novo para recuperar os recursos — seus
          dados continuam salvos.
        </p>
      )}

      <section className="bg-hero text-hero-foreground rounded-3xl p-5 shadow-lg">
        <p className="text-sm font-medium opacity-80">KmReal PRO</p>
        <p className="mt-1">
          <span className="text-4xl font-bold tabular-nums">{PRO_PRICE_LABEL.split("/")[0]}</span>
          <span className="font-semibold opacity-80">/{PRO_PRICE_LABEL.split("/")[1]}</span>
        </p>
        <p className="mt-2 text-sm opacity-80">
          Custo real por KM, saúde financeira, simulador avançado, manutenções e relatórios em PDF.
        </p>
      </section>

      <div className="mt-4 grid gap-3">
        <CheckoutEmailNotice />
        <SubscribeButton />
      </div>

      <Section title="Free vs Pro" className="mt-6">
        <ComparisonTable />
      </Section>

      <Section title="Já fez o pagamento?" className="mt-6">
        <Button variant="outline" size="lg" className="w-full" onClick={handleCheck} disabled={checking}>
          <RefreshCw className={cn(checking && "animate-spin")} /> {checking ? "Verificando..." : "Atualizar meu plano"}
        </Button>
        <p className="text-muted-foreground px-1 text-xs">
          A ativação é automática quando a Cakto confirma o pagamento. Pagou com outro e-mail? Fale com o suporte para
          liberarmos manualmente.
        </p>
      </Section>
    </>
  );
}
