"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Buscar", className }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2" />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="bg-card placeholder:text-muted-foreground focus-visible:ring-ring/50 h-12 w-full rounded-xl border pr-11 pl-11 outline-none focus-visible:ring-[3px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
          className="text-muted-foreground absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  );
}
