import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Money } from "@/components/shared/money";
import { percentChange } from "@/lib/calculations/metrics";
import type { RealPeriodSummary } from "@/lib/calculations/real-cost";
import { formatCurrency, formatKm, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProfitHeroCardProps {
  month: RealPeriodSummary;
  /** Mês anterior completo (null = sem viagens para comparar) */
  previous: RealPeriodSummary | null;
  /** Ex.: "setembro" */
  previousMonthName: string;
}

/** Diferença menor que isso (R$/km) é tratada como "igual". */
const SAME_THRESHOLD = 0.01;

/**
 * Primeira pergunta do motorista: "quanto estou ganhando?".
 * Lucro real por km do mês, com a comparação com o mês anterior logo abaixo.
 */
export function ProfitHeroCard({ month, previous, previousMonthName }: ProfitHeroCardProps) {
  const perKm = month.realProfitPerKm;
  const losing = perKm < 0;
  const delta = previous ? perKm - previous.realProfitPerKm : null;
  const pct = previous ? percentChange(perKm, previous.realProfitPerKm) : null;
  const same = delta !== null && Math.abs(delta) < SAME_THRESHOLD;
  const better = delta !== null && delta > 0;

  const TrendIcon = same ? Minus : better ? TrendingUp : TrendingDown;

  return (
    <section
      aria-label="Quanto você está ganhando por km"
      className="bg-hero text-hero-foreground relative overflow-hidden rounded-3xl p-5 shadow-lg"
    >
      <div className="bg-hero-foreground/5 pointer-events-none absolute -top-16 -right-16 size-48 rounded-full" />

      <p className="text-base font-medium opacity-85">{losing ? "Você está no prejuízo" : "Você está lucrando"}</p>
      <Money
        value={Math.abs(perKm)}
        size="xl"
        suffix="/km"
        className={cn("mt-2", losing && "text-hero-negative")}
      />

      <div className="border-hero-foreground/15 mt-4 border-t pt-3">
        {delta === null ? (
          <p className="text-sm opacity-75">A comparação com o mês anterior aparece quando houver viagens nele.</p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold tabular-nums">
            <span
              className={cn(
                "bg-hero-foreground/15 flex size-7 shrink-0 items-center justify-center rounded-full",
                !same && !better && "text-hero-negative",
              )}
            >
              <TrendIcon className="size-4" aria-hidden />
            </span>
            <span>
              {same ? (
                <>Igual a {previousMonthName}</>
              ) : (
                <>
                  {better ? "+" : "−"}
                  {formatCurrency(Math.abs(delta))}/km
                  {pct !== null && ` (${better ? "+" : "−"}${formatPercent(Math.abs(pct))})`}{" "}
                  <span className="font-normal opacity-80">em relação a {previousMonthName}</span>
                </>
              )}
            </span>
          </p>
        )}
        <p className="mt-1.5 text-xs tabular-nums opacity-70">
          {formatCurrency(month.realProfit)} de lucro real em {formatKm(month.km)} neste mês
        </p>
      </div>
    </section>
  );
}
