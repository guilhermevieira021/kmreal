import Link from "next/link";
import { Money } from "@/components/shared/money";
import { profitTone, valueToneClass } from "@/components/shared/value-tone";
import type { RealTripSummary } from "@/lib/calculations/real-cost";
import { dateParts, formatCurrency, formatCurrencyPerKm, formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types";

interface TripListItemProps {
  trip: Trip;
  summary: RealTripSummary;
  vehicleName?: string;
}

/** Viagem na lista: lucro real em destaque. */
export function TripListItem({ trip, summary, vehicleName }: TripListItemProps) {
  const tone = profitTone(summary.realProfit);
  const { day, weekday } = dateParts(trip.date);

  return (
    <li>
      <Link
        href={`/viagens/${trip.id}`}
        className="bg-card active:bg-accent flex items-center gap-3 rounded-2xl border p-3 shadow-xs transition-colors"
      >
        <div className="bg-muted flex size-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none">
          <span className="text-lg font-bold tabular-nums">{day}</span>
          <span className="text-muted-foreground text-[10px] font-semibold uppercase">{weekday}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{vehicleName ?? "Sem veículo"}</p>
          <p className="text-muted-foreground truncate text-xs tabular-nums">
            {formatKm(trip.km)} · {formatCurrency(summary.revenue)}
          </p>
        </div>

        <div className={cn("shrink-0 text-right", valueToneClass(tone))}>
          <Money value={summary.realProfit} size="md" />
          <p className="text-xs font-medium tabular-nums opacity-80">{formatCurrencyPerKm(summary.realProfitPerKm)}</p>
        </div>
      </Link>
    </li>
  );
}
