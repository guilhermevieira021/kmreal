"use client";

import { cn } from "@/lib/utils";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/**
 * Seleção única em "chips" roláveis na horizontal (períodos, veículos, métricas).
 * Alvos de toque de 40px e rolagem lateral sem barra visível.
 */
export function ChipGroup<T extends string>({ options, value, onChange, label, className }: ChipGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors active:scale-[0.97]",
              selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
