"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PRO_REQUIRED_EVENT } from "@/lib/subscription";
import { ProOffer } from "./pro-offer";

interface UpgradeContextValue {
  /** Abre a oferta PRO. `feature` = nome do recurso tocado (ex.: "Custo real por KM"). */
  openUpgrade(feature?: string): void;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

/** Painel único da oferta PRO, aberto por qualquer cadeado do app ou por um 403 PRO_REQUIRED da API. */
export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ feature?: string } | null>(null);
  const openUpgrade = useCallback((feature?: string) => setState({ feature }), []);

  useEffect(() => {
    const onProRequired = () => setState({});
    window.addEventListener(PRO_REQUIRED_EVENT, onProRequired);
    return () => window.removeEventListener(PRO_REQUIRED_EVENT, onProRequired);
  }, []);

  return (
    <UpgradeContext.Provider value={{ openUpgrade }}>
      {children}
      <Sheet open={state !== null} onOpenChange={(open) => !open && setState(null)}>
        <SheetContent>
          <SheetTitle className="sr-only">KmReal PRO</SheetTitle>
          <ProOffer feature={state?.feature} />
          <Link
            href="/upgrade"
            onClick={() => setState(null)}
            className="text-muted-foreground -mt-1 py-2 text-center text-sm font-medium underline-offset-2 hover:underline"
          >
            Comparar planos FREE e PRO
          </Link>
        </SheetContent>
      </Sheet>
    </UpgradeContext.Provider>
  );
}

export function useUpgrade() {
  const ctx = useContext(UpgradeContext);
  if (!ctx) throw new Error("useUpgrade deve ser usado dentro de <UpgradeProvider>");
  return ctx;
}
