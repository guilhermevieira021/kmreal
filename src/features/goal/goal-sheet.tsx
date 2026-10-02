"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/amount-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { parseDecimal } from "@/lib/format";
import { useData } from "@/providers/data-provider";

const SUGGESTIONS = [5000, 8000, 10000, 15000];

interface GoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalSheet({ open, onOpenChange }: GoalSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Meta de lucro mensal</SheetTitle>
        <SheetDescription>Quanto você quer lucrar por mês, já descontados os custos?</SheetDescription>
        {/* Montado só quando aberto: o formulário sempre começa com o valor atual. */}
        {open && <GoalForm onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function GoalForm({ onDone }: { onDone: () => void }) {
  const { settings, updateSettings } = useData();
  const current = settings?.monthlyProfitGoal ?? null;
  const [value, setValue] = useState(current ? String(current) : "");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function save(goal: number | null) {
    setPending(true);
    try {
      await updateSettings({ monthlyProfitGoal: goal });
      toast.success(goal ? "Meta atualizada" : "Meta removida");
      onDone();
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const goal = parseDecimal(value);
    if (!(goal > 0)) {
      setError("Informe um valor maior que zero");
      return;
    }
    save(goal);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <AmountInput
        id="monthly-goal"
        prefix="R$"
        aria-label="Meta de lucro mensal"
        value={value}
        error={error}
        enterKeyHint="done"
        onChange={(e) => {
          setValue(e.target.value);
          setError(undefined);
        }}
      />
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setValue(String(s))}
            className="bg-muted h-10 rounded-full px-4 text-sm font-medium active:scale-[0.97]"
          >
            R$ {s.toLocaleString("pt-BR")}
          </button>
        ))}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar meta"}
      </Button>
      {current && (
        <Button type="button" variant="ghost" className="text-muted-foreground" disabled={pending} onClick={() => save(null)}>
          Remover meta
        </Button>
      )}
    </form>
  );
}
