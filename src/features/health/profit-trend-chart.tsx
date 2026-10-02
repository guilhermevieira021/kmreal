"use client";

import { useState } from "react";
import type { TrendBucket } from "@/lib/calculations/trend";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHART_HEIGHT = 140;

/**
 * Barras de lucro no tempo (uma série, sem legenda: o título a nomeia).
 * Positivo/negativo usam o par divergente; o valor exato aparece ao tocar/passar o dedo.
 */
export function ProfitTrendChart({ buckets }: { buckets: TrendBucket[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  const maxPositive = Math.max(0, ...buckets.map((b) => b.profit));
  const maxNegative = Math.max(0, ...buckets.map((b) => -b.profit));
  const span = maxPositive + maxNegative || 1;
  const baseline = (maxPositive / span) * CHART_HEIGHT; // distância do topo até o zero

  const total = buckets.reduce((sum, b) => sum + b.profit, 0);
  const current = selected !== null ? buckets[selected] : null;
  const axisLabels = [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1];

  return (
    <div className="bg-card rounded-2xl border p-4 shadow-xs">
      {/* Leitura do valor (substitui o tooltip flutuante no celular) */}
      <div className="mb-3 flex min-h-11 items-end justify-between gap-2" aria-live="polite">
        <div>
          <p className="text-muted-foreground text-xs font-medium">{current ? current.fullLabel : "Total no período"}</p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(current ? current.profit : total)}</p>
        </div>
        {current && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {current.tripCount} {current.tripCount === 1 ? "viagem" : "viagens"}
          </p>
        )}
      </div>

      <div
        className="relative flex gap-0.5"
        style={{ height: CHART_HEIGHT }}
        onPointerLeave={() => setSelected(null)}
        role="img"
        aria-label={`Lucro por período: total ${formatCurrency(total)}`}
      >
        <div aria-hidden className="bg-border absolute inset-x-0 h-px" style={{ top: baseline }} />
        {buckets.map((bucket, index) => {
          const height = (Math.abs(bucket.profit) / span) * CHART_HEIGHT;
          const negative = bucket.profit < 0;
          return (
            <button
              key={bucket.key}
              type="button"
              aria-label={`${bucket.fullLabel}: ${formatCurrency(bucket.profit)}`}
              onPointerEnter={() => setSelected(index)}
              onClick={() => setSelected(index)}
              className="relative h-full min-w-0 flex-1"
            >
              {bucket.profit !== 0 && (
                <span
                  className={cn(
                    "absolute inset-x-0 mx-auto max-w-6 transition-opacity",
                    negative ? "bg-chart-negative rounded-b-[4px]" : "bg-chart-1 rounded-t-[4px]",
                    selected !== null && selected !== index && "opacity-40",
                  )}
                  style={{
                    height: Math.max(2, height),
                    ...(negative ? { top: baseline } : { top: baseline - Math.max(2, height) }),
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="text-muted-foreground mt-2 flex justify-between text-[11px] tabular-nums">
        {[...new Set(axisLabels)].map((i) => (
          <span key={i}>{buckets[i]?.label}</span>
        ))}
      </div>
    </div>
  );
}
