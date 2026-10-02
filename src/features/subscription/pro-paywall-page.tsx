"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ProOffer } from "./pro-offer";

/** Tela PRO aberta por um usuário FREE (o servidor já decidiu que não há acesso). */
export function ProPaywallPage({ feature, backHref }: { feature: string; backHref: string }) {
  return (
    <>
      <PageHeader title={feature} backHref={backHref} />
      <div className="bg-card rounded-3xl border p-5 shadow-xs">
        <ProOffer feature={feature} />
      </div>
      <Link href="/upgrade" className="text-muted-foreground mt-4 block py-2 text-center text-sm font-medium">
        Comparar planos FREE e PRO
      </Link>
    </>
  );
}
