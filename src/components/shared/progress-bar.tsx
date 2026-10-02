import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /** Marca opcional (0–100), ex.: onde deveria estar hoje */
  marker?: number;
  label: string;
  className?: string;
  indicatorClassName?: string;
}

export function ProgressBar({ value, marker, label, className, indicatorClassName }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("bg-muted relative h-3 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cn("bg-primary h-full rounded-full transition-[width] duration-500", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
      {marker !== undefined && marker > 0 && marker < 100 && (
        <div aria-hidden className="bg-foreground/50 absolute inset-y-0 w-0.5" style={{ left: `${marker}%` }} />
      )}
    </div>
  );
}
