import { splitCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { amount: "text-base", symbol: "text-xs" },
  md: { amount: "text-xl", symbol: "text-sm" },
  lg: { amount: "text-3xl", symbol: "text-base" },
  xl: { amount: "text-[2.75rem] leading-none", symbol: "text-lg" },
} as const;

interface MoneyProps {
  value: number;
  size?: keyof typeof SIZES;
  /** Sufixo após o valor, ex.: "/km" */
  suffix?: string;
  className?: string;
}

/** Valor em reais com o número em destaque e o "R$" discreto. */
export function Money({ value, size = "md", suffix, className }: MoneyProps) {
  const { symbol, amount } = splitCurrency(value);
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-bold tracking-tight tabular-nums", className)}>
      <span className={cn("font-semibold opacity-70", s.symbol)}>{symbol}</span>
      <span className={s.amount}>{amount}</span>
      {suffix && <span className={cn("font-semibold opacity-70", s.symbol)}>{suffix}</span>}
    </span>
  );
}
