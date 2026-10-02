"use client";

import { useState } from "react";
import { FileDown, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { calculateCostBreakdown } from "@/lib/calculations/cost-breakdown";
import { calculateRealTrip, summarizeReal } from "@/lib/calculations/real-cost";
import type { DateRange } from "@/lib/dates";
import { formatDate, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useData, useVehicleNames } from "@/providers/data-provider";
import type { Trip } from "@/types";

const TOP_N = 5;

interface ExportReportButtonProps {
  /** Viagens já filtradas pelo período selecionado */
  trips: Trip[];
  periodLabel: string;
  range: DateRange;
  filterLabel?: string;
  /** "trips": lista de viagens · "profitability": composição do custo real + top/bottom 5 */
  kind?: "trips" | "profitability";
  variant?: "default" | "outline";
  /** Versão pequena para cabeçalhos */
  compact?: boolean;
  className?: string;
}

export function ExportReportButton({
  trips,
  periodLabel,
  range,
  filterLabel,
  kind = "trips",
  variant = "outline",
  compact = false,
  className,
}: ExportReportButtonProps) {
  const { costRates } = useData();
  const vehicleNames = useVehicleNames();
  const [pending, setPending] = useState(false);

  async function handleExport() {
    setPending(true);
    try {
      // Carregado sob demanda: o gerador de PDF só é baixado quando usado.
      const pdf = await import("@/lib/export/pdf-report");
      const summary = summarizeReal(trips, costRates);
      const firstDate = trips.reduce<string | null>((min, t) => (!min || t.date < min ? t.date : min), null);
      const start = range.start ?? firstDate;
      const header = {
        periodLabel,
        rangeLabel: start ? `${formatDate(start)} a ${formatDate(range.end)}` : `até ${formatDate(range.end)}`,
        filterLabel,
      };
      const rows = trips.map((t) => {
        const s = calculateRealTrip(t, costRates);
        return {
          date: t.date,
          vehicle: (t.vehicleId && vehicleNames.get(t.vehicleId)) || "Sem veículo",
          km: t.km,
          revenue: s.revenue,
          realCosts: s.realCosts,
          realProfit: s.realProfit,
          realProfitPerKm: s.realProfitPerKm,
        };
      });

      let blob: Blob;
      if (kind === "profitability") {
        const ranked = [...rows].sort((a, b) => b.realProfit - a.realProfit);
        blob = await pdf.buildProfitabilityPdf({
          ...header,
          summary,
          breakdown: calculateCostBreakdown(summary),
          best: ranked.slice(0, TOP_N),
          worst: ranked.slice(-TOP_N).reverse(),
        });
      } else {
        blob = await pdf.buildTripsReportPdf({ ...header, summary, rows });
      }

      const name = kind === "profitability" ? "lucratividade" : "viagens";
      const result = await pdf.shareOrDownload(blob, `kmreal-${name}-${todayISO()}.pdf`);
      if (result === "downloaded") toast.success("Relatório baixado");
    } catch {
      toast.error("Não foi possível gerar o relatório");
    } finally {
      setPending(false);
    }
  }

  const label = kind === "profitability" ? "Relatório de lucratividade" : "Exportar relatório";

  return (
    <Button
      variant={variant}
      size={compact ? "sm" : "lg"}
      className={cn(compact ? "h-10 rounded-full" : "w-full", className)}
      onClick={handleExport}
      disabled={pending}
      aria-label={`${label} em PDF`}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <FileDown />}
      {compact ? "Exportar" : pending ? "Gerando PDF..." : label}
    </Button>
  );
}
