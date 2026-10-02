"use client";

import Link from "next/link";
import { ChevronRight, Clock, Trophy } from "lucide-react";
import { Money } from "@/components/shared/money";
import { profitTone, valueToneClass } from "@/components/shared/value-tone";
import { calculateRealTrip } from "@/lib/calculations/real-cost";
import { formatCurrency, formatCurrencyPerKm, formatDate, formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import type { Trip } from "@/types";

interface HighlightProps {
  trip: Trip;
  vehicleName?: string;
}

function HighlightShell({
  href,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  href: string;
  icon: typeof Clock;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-card active:bg-accent flex min-w-0 flex-col gap-2 rounded-2xl border p-4 shadow-xs transition-colors"
    >
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <Icon className="size-3.5" /> {title}
        <ChevronRight className="ml-auto size-4" />
      </span>
      <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
      {children}
    </Link>
  );
}

/** Última viagem: data, lucro real e lucro real por km. */
export function LastTripCard({ trip, vehicleName }: HighlightProps) {
  const s = calculateRealTrip(trip, useData().costRates);
  const tone = valueToneClass(profitTone(s.realProfit));
  return (
    <HighlightShell
      href={`/viagens/${trip.id}`}
      icon={Clock}
      title="Última viagem"
      subtitle={`${formatDate(trip.date)}${vehicleName ? ` · ${vehicleName}` : ""}`}
    >
      <Money value={s.realProfit} size="md" className={tone} />
      <span className={cn("text-sm font-semibold tabular-nums", tone)}>{formatCurrencyPerKm(s.realProfitPerKm)}</span>
    </HighlightShell>
  );
}

/** Melhor viagem do mês: lucro real, receita e km. */
export function BestTripCard({ trip, vehicleName }: HighlightProps) {
  const s = calculateRealTrip(trip, useData().costRates);
  return (
    <HighlightShell
      href={`/viagens/${trip.id}`}
      icon={Trophy}
      title="Melhor do mês"
      subtitle={`${formatDate(trip.date)}${vehicleName ? ` · ${vehicleName}` : ""}`}
    >
      <Money value={s.realProfit} size="md" className={valueToneClass(profitTone(s.realProfit))} />
      <span className="text-muted-foreground text-xs tabular-nums">
        {formatCurrency(s.revenue)} · {formatKm(trip.km)}
      </span>
    </HighlightShell>
  );
}
