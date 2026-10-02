import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Money } from "@/components/shared/money";
import type { RealPeriodSummary } from "@/lib/calculations/real-cost";
import { formatCurrencyPerKm, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RealCostCardProps {
  summary: RealPeriodSummary;
  /** Variação % do custo real/km sobre o período anterior (null = sem base) */
  change: number | null;
  /** Ex.: "vs mês passado" */
  changeLabel: string;
}

/**
 * "Seu veículo custa R$ X/km": o número que o motorista precisa saber de cor para
 * aceitar ou recusar um frete. Barra mostra quanto do custo é invisível na viagem.
 */
export function RealCostCard({ summary, change, changeLabel }: RealCostCardProps) {
  const overhead = summary.realCostPerKm - summary.operationalCostPerKm;
  const operationalShare = summary.realCostPerKm > 0 ? (summary.operationalCostPerKm / summary.realCostPerKm) * 100 : 0;
  // Para custo, subir é ruim.
  const worse = change !== null && change > 0;

  return (
    <Link
      href="/saude"
      aria-label="Quanto seu veículo custa por KM: ver detalhes"
      className="bg-card active:bg-accent block rounded-2xl border p-4 shadow-xs transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Seu veículo custa <span className="text-muted-foreground font-normal">(custo real)</span>
        </p>
        <ChevronRight className="text-muted-foreground size-4" />
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <Money value={summary.realCostPerKm} size="lg" suffix="/km" />
        {change !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
              worse ? "text-destructive" : "text-positive",
            )}
          >
            {worse ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {formatSignedPercent(change)} {changeLabel}
          </span>
        )}
      </div>

      <div className="mt-3 flex h-2 w-full gap-0.5" aria-hidden>
        <div className="bg-chart-1 h-full rounded-l-[4px]" style={{ width: `${operationalShare}%` }} />
        <div className="bg-chart-5 h-full flex-1 rounded-r-[4px]" />
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between gap-2 text-xs tabular-nums">
        <span className="flex items-center gap-1.5">
          <span className="bg-chart-1 size-2 rounded-[2px]" /> Operacional {formatCurrencyPerKm(summary.operationalCostPerKm)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-chart-5 size-2 rounded-[2px]" /> Fixos e manutenção {formatCurrencyPerKm(overhead)}
        </span>
      </div>
    </Link>
  );
}
