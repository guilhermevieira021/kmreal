import type { jsPDF } from "jspdf";
import type { CostBreakdown } from "@/lib/calculations/cost-breakdown";
import type { RealPeriodSummary } from "@/lib/calculations/real-cost";
import {
  formatCurrency,
  formatCurrencyPerKm,
  formatDate,
  formatKm,
  formatPercent,
} from "@/lib/format";

export interface ReportTripRow {
  date: string;
  vehicle: string;
  km: number;
  revenue: number;
  realCosts: number;
  realProfit: number;
  realProfitPerKm: number;
}

interface ReportHeader {
  periodLabel: string;
  /** Ex.: "02/09/26 a 01/10/26" */
  rangeLabel: string;
  /** Filtros extras aplicados (ex.: busca) */
  filterLabel?: string;
}

export interface TripsReportInput extends ReportHeader {
  summary: RealPeriodSummary;
  rows: ReportTripRow[];
}

export interface ProfitabilityReportInput extends ReportHeader {
  summary: RealPeriodSummary;
  breakdown: CostBreakdown;
  best: ReportTripRow[];
  worst: ReportTripRow[];
}

/* ---------- Primitivas de layout ---------- */

/** As fontes padrão do PDF usam WinAnsi: troca caracteres fora dela. */
const clean = (text: string) =>
  text
    .replace(/[  ]/g, " ")
    .replace(/−/g, "-")
    .replace(/[…]/g, "...");

const PAGE = { width: 210, height: 297, margin: 16 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const ROW_HEIGHT = 7;
const INK: [number, number, number] = [23, 23, 23];
const MUTED: [number, number, number] = [115, 115, 115];
const NEGATIVE: [number, number, number] = [200, 40, 40];

interface Column<T> {
  title: string;
  width: number;
  align?: "left" | "right";
  value: (row: T) => string;
  /** Pinta de vermelho quando negativo */
  signed?: (row: T) => number;
}

class ReportWriter {
  y = PAGE.margin;
  constructor(readonly doc: jsPDF) {}

  text(value: string, x: number, y: number, options?: { align?: "left" | "right" }) {
    this.doc.text(clean(value), x, y, options);
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE.height - PAGE.margin - 6) {
      this.doc.addPage();
      this.y = PAGE.margin;
    }
  }

  header(title: string, h: ReportHeader) {
    const { doc } = this;
    doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...INK);
    this.text("KmReal", PAGE.margin, this.y + 6);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
    this.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, PAGE.width - PAGE.margin, this.y + 6, { align: "right" });
    this.y += 16;
    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(...INK);
    this.text(title, PAGE.margin, this.y);
    this.y += 6;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(82, 82, 82);
    this.text(`${h.periodLabel} · ${h.rangeLabel}${h.filterLabel ? ` · ${h.filterLabel}` : ""}`, PAGE.margin, this.y);
    this.y += 8;
  }

  sectionTitle(title: string) {
    this.ensureSpace(14);
    this.y += 2;
    this.doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
    this.text(title, PAGE.margin, this.y);
    this.y += 4;
  }

  boxes(items: { label: string; value: string; negative?: boolean }[]) {
    const { doc } = this;
    const gap = 3;
    const width = (CONTENT_WIDTH - gap * (items.length - 1)) / items.length;
    this.ensureSpace(20);
    items.forEach((box, i) => {
      const x = PAGE.margin + i * (width + gap);
      doc.setFillColor(245, 245, 245).roundedRect(x, this.y, width, 18, 2, 2, "F");
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
      this.text(box.label.toUpperCase(), x + 3, this.y + 6);
      doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...(box.negative ? NEGATIVE : INK));
      this.text(box.value, x + 3, this.y + 13.5);
    });
    this.y += 21;
  }

  paragraph(value: string) {
    const lines = this.doc.splitTextToSize(clean(value), CONTENT_WIDTH) as string[];
    this.ensureSpace(lines.length * 4.5 + 2);
    this.doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(82, 82, 82);
    this.doc.text(lines, PAGE.margin, this.y + 3);
    this.y += lines.length * 4.5 + 3;
  }

  table<T>(columns: Column<T>[], rows: T[], emptyText = "Nenhuma viagem no período.") {
    const { doc } = this;
    const drawHead = () => {
      doc.setFillColor(...INK).rect(PAGE.margin, this.y, CONTENT_WIDTH, ROW_HEIGHT, "F");
      doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(255, 255, 255);
      let x = PAGE.margin;
      for (const col of columns) {
        const right = col.align === "right";
        this.text(col.title, right ? x + col.width - 2 : x + 2, this.y + 4.8, { align: right ? "right" : "left" });
        x += col.width;
      }
      this.y += ROW_HEIGHT;
    };

    this.ensureSpace(ROW_HEIGHT * 2);
    drawHead();
    rows.forEach((row, index) => {
      if (this.y + ROW_HEIGHT > PAGE.height - PAGE.margin - 6) {
        doc.addPage();
        this.y = PAGE.margin;
        drawHead();
      }
      if (index % 2 === 1) doc.setFillColor(248, 248, 248).rect(PAGE.margin, this.y, CONTENT_WIDTH, ROW_HEIGHT, "F");
      doc.setFont("helvetica", "normal").setFontSize(8.5);
      let x = PAGE.margin;
      for (const col of columns) {
        doc.setTextColor(...(col.signed && col.signed(row) < 0 ? NEGATIVE : INK));
        const value = doc.splitTextToSize(clean(col.value(row)), col.width - 3)[0] as string;
        const right = col.align === "right";
        this.text(value, right ? x + col.width - 2 : x + 2, this.y + 4.8, { align: right ? "right" : "left" });
        x += col.width;
      }
      this.y += ROW_HEIGHT;
    });
    if (!rows.length) {
      doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(...MUTED);
      this.text(emptyText, PAGE.margin + 2, this.y + 5);
      this.y += ROW_HEIGHT;
    }
    this.y += 4;
  }

  footer() {
    const { doc } = this;
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150, 150, 150);
      this.text(`Página ${p} de ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 8, { align: "right" });
      this.text("KmReal · lucro real das suas viagens", PAGE.margin, PAGE.height - 8);
    }
  }
}

async function createWriter() {
  const { jsPDF } = await import("jspdf");
  return new ReportWriter(new jsPDF({ unit: "mm", format: "a4" }));
}

const TRIP_COLUMNS: Column<ReportTripRow>[] = [
  { title: "Data", width: 20, value: (r) => formatDate(r.date) },
  { title: "Veículo", width: 40, value: (r) => r.vehicle },
  { title: "KM", width: 20, align: "right", value: (r) => formatKm(r.km) },
  { title: "Receita", width: 27, align: "right", value: (r) => formatCurrency(r.revenue) },
  { title: "Custo real", width: 27, align: "right", value: (r) => formatCurrency(r.realCosts) },
  { title: "Lucro real", width: 27, align: "right", value: (r) => formatCurrency(r.realProfit), signed: (r) => r.realProfit },
  { title: "Lucro/km", width: 17, align: "right", value: (r) => formatCurrency(r.realProfitPerKm), signed: (r) => r.realProfit },
];

const perKmLine = (s: RealPeriodSummary) =>
  `${s.tripCount} viagens · Receita/km ${formatCurrencyPerKm(s.revenuePerKm)} · ` +
  `Custo operacional/km ${formatCurrencyPerKm(s.operationalCostPerKm)} · Custo real/km ${formatCurrencyPerKm(s.realCostPerKm)} · ` +
  `Lucro real/km ${formatCurrencyPerKm(s.realProfitPerKm)} · Margem real ${formatPercent(s.realMargin)}`;

/* ---------- Relatórios ---------- */

/** Relatório de viagens (histórico filtrado). */
export async function buildTripsReportPdf(input: TripsReportInput): Promise<Blob> {
  const w = await createWriter();
  const s = input.summary;
  w.header("Relatório de viagens", input);
  w.boxes([
    { label: "Receita", value: formatCurrency(s.revenue) },
    { label: "Custo real", value: formatCurrency(s.realCosts) },
    { label: "Lucro real", value: formatCurrency(s.realProfit), negative: s.realProfit < 0 },
    { label: "KM rodados", value: formatKm(s.km) },
  ]);
  w.paragraph(perKmLine(s));
  w.table(TRIP_COLUMNS, input.rows);
  w.footer();
  return w.doc.output("blob");
}

/** Relatório de lucratividade: de onde vem e para onde vai o dinheiro. */
export async function buildProfitabilityPdf(input: ProfitabilityReportInput): Promise<Blob> {
  const w = await createWriter();
  const s = input.summary;
  w.header("Relatório de lucratividade", input);
  w.boxes([
    { label: "Receita total", value: formatCurrency(s.revenue) },
    { label: "Custos operacionais", value: formatCurrency(s.operationalCosts) },
    { label: "Lucro real", value: formatCurrency(s.realProfit), negative: s.realProfit < 0 },
  ]);
  w.boxes([
    { label: "Custos fixos", value: formatCurrency(s.fixedCosts) },
    { label: "Manutenções e desgaste", value: formatCurrency(s.maintenanceCosts + s.wearCosts) },
    { label: "KM rodados", value: formatKm(s.km) },
  ]);
  w.paragraph(perKmLine(s));

  w.sectionTitle("Composição do custo real");
  w.table(
    [
      { title: "Categoria", width: 70, value: (r) => r.label },
      { title: "Valor", width: 40, align: "right", value: (r) => formatCurrency(r.value) },
      { title: "% do custo", width: 34, align: "right", value: (r) => formatPercent(r.share) },
      { title: "R$/km", width: 34, align: "right", value: (r) => formatCurrency(r.perKm) },
    ],
    input.breakdown.items,
  );

  w.sectionTitle("Top 5 viagens mais lucrativas");
  w.table(TRIP_COLUMNS, input.best);
  w.sectionTitle("Top 5 viagens menos lucrativas");
  w.table(TRIP_COLUMNS, input.worst);

  w.paragraph(
    "Lucro real = receita - custos operacionais (combustível, pedágio, ajudante, outros) - custos fixos, " +
      "manutenções e desgaste rateados pelo KM rodado de cada veículo.",
  );
  w.footer();
  return w.doc.output("blob");
}

/**
 * No celular abre o compartilhamento nativo (WhatsApp, e-mail, Drive...).
 * No computador, baixa o arquivo.
 */
export async function shareOrDownload(blob: Blob, filename: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Relatório KmReal" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Outros erros: cai para o download.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
