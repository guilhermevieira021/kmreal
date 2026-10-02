export type ValueTone = "default" | "positive" | "negative" | "muted";

export function valueToneClass(tone: ValueTone): string {
  switch (tone) {
    case "positive":
      return "text-positive";
    case "negative":
      return "text-destructive";
    case "muted":
      return "text-muted-foreground";
    default:
      return "";
  }
}

/** Tom de um valor de lucro: verde se positivo, vermelho se negativo. */
export function profitTone(value: number): ValueTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "default";
}
