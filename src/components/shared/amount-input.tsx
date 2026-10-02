import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface AmountInputProps extends Omit<ComponentProps<"input">, "prefix"> {
  id: string;
  prefix?: string;
  suffix?: string;
  error?: string;
}

/** Campo numérico grande, pensado para digitar com o polegar. */
export function AmountInput({ id, prefix, suffix, error, className, ...props }: AmountInputProps) {
  return (
    <div className="grid gap-2">
      <div
        className={cn(
          "bg-card flex h-16 items-center gap-2 rounded-2xl border-2 px-4 transition-colors focus-within:border-primary-strong",
          error && "border-destructive focus-within:border-destructive",
        )}
      >
        {prefix && <span className="text-muted-foreground text-xl font-semibold">{prefix}</span>}
        <input
          id={id}
          name={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "placeholder:text-muted-foreground/50 h-full w-full min-w-0 bg-transparent text-3xl font-bold tabular-nums outline-none",
            className,
          )}
          {...props}
        />
        {suffix && <span className="text-muted-foreground text-xl font-semibold">{suffix}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
