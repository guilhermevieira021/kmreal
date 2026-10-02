"use client";

import { Check } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { THEMES, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

/**
 * Miniatura do app no tema: o `data-theme` no contêiner faz os tokens CSS valerem só
 * aqui dentro — o preview usa as mesmas classes das telas reais, sem cores duplicadas.
 */
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div data-theme={theme.id} aria-hidden className="bg-background text-foreground grid gap-1.5 rounded-xl p-2.5">
      <div className="bg-hero text-hero-foreground rounded-lg px-3 py-2">
        <p className="text-[9px] font-medium opacity-80">Você está lucrando</p>
        <p className="text-base leading-tight font-bold tabular-nums">
          R$ 0,82<span className="text-[10px] font-semibold opacity-70">/km</span>
        </p>
      </div>
      <div className="bg-card flex items-center justify-between rounded-lg border px-2.5 py-1.5">
        <span className="text-muted-foreground text-[9px]">Custo real</span>
        <span className="text-[10px] font-semibold tabular-nums">R$ 1,69/km</span>
      </div>
      <div className="flex gap-1.5">
        <span className="bg-primary text-primary-foreground flex-1 rounded-md py-1 text-center text-[9px] font-semibold">
          Nova viagem
        </span>
        <span className="bg-positive/12 text-positive rounded-md px-2 py-1 text-[9px] font-semibold">+12%</span>
      </div>
    </div>
  );
}

export function ThemeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { theme: current, setTheme } = useTheme();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Aparência</SheetTitle>
        <SheetDescription>Toque para trocar. A escolha fica salva neste aparelho.</SheetDescription>
        <div role="radiogroup" aria-label="Tema" className="grid gap-3">
          {THEMES.map((theme) => {
            const selected = theme.id === current;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(theme.id)}
                className={cn(
                  "bg-card grid grid-cols-[7.5rem_1fr] items-center gap-3 rounded-2xl border-2 p-2 text-left transition-colors active:scale-[0.99]",
                  selected ? "border-primary-strong" : "border-border",
                )}
              >
                <ThemePreview theme={theme} />
                <span className="min-w-0 pr-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{theme.name}</span>
                    {selected && (
                      <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
                        <Check className="size-4" />
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-sm">{theme.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
