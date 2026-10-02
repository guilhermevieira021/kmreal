import { cn } from "@/lib/utils";
import type { ValueTone } from "./value-tone";

const TONES: Record<ValueTone | "inverse", string> = {
  default: "bg-muted text-foreground",
  positive: "bg-positive/12 text-positive",
  negative: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
  inverse: "bg-white/15 text-white",
};

export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: ValueTone | "inverse";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
