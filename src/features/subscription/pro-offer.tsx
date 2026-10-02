"use client";

import { Check, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkoutUrl, PRO_BENEFITS, PRO_PRICE_LABEL } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";

/** E-mail da conta que será ativada — a compra precisa usar o mesmo. */
export function CheckoutEmailNotice({ className }: { className?: string }) {
  const email = useData().account?.user.email;
  if (!email) return null;
  return (
    <div className={cn("bg-muted rounded-xl px-4 py-3 text-sm", className)}>
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Mail className="size-3.5" /> Você está assinando para:
      </p>
      <p className="mt-0.5 font-semibold break-all">{email}</p>
      <p className="text-muted-foreground mt-1 text-xs">Utilize este mesmo e-mail na compra para ativação automática.</p>
    </div>
  );
}

/** Botão que leva ao checkout da Cakto (nova aba: o app continua aberto para confirmar a ativação). */
export function SubscribeButton({ className }: { className?: string }) {
  const email = useData().account?.user.email;
  return (
    <Button asChild size="lg" className={cn("w-full text-base font-bold tracking-wide", className)}>
      <a href={checkoutUrl(email)} target="_blank" rel="noopener noreferrer">
        ASSINAR PRO
      </a>
    </Button>
  );
}

/**
 * Bloqueio "Recurso PRO": mostrado ao tocar numa funcionalidade PRO (painel)
 * ou ao abrir uma tela PRO (página inteira).
 */
export function ProOffer({ feature }: { feature?: string }) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="bg-warning/12 text-warning inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold">
          <Lock className="size-3.5" aria-hidden /> 🔒 Recurso PRO
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Desbloqueie o KmReal PRO</h2>
        {feature && <p className="text-muted-foreground mt-1 text-sm">{feature} faz parte do plano PRO.</p>}
      </div>

      <ul className="grid gap-2.5">
        {PRO_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-[15px]">
            <span className="bg-primary text-primary-foreground mt-px flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
            <span>
              <span className="sr-only">✓ </span>
              {benefit}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-center">
        <span className="text-3xl font-bold tabular-nums">{PRO_PRICE_LABEL.split("/")[0]}</span>
        <span className="text-muted-foreground font-semibold">/{PRO_PRICE_LABEL.split("/")[1]}</span>
      </p>

      <CheckoutEmailNotice />
      <SubscribeButton />
    </div>
  );
}
