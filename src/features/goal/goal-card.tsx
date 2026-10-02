"use client";

import { useState } from "react";
import { PartyPopper, Pencil, Target } from "lucide-react";
import { Money } from "@/components/shared/money";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Button } from "@/components/ui/button";
import { calculateGoalProgress } from "@/lib/calculations/goal";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GoalSheet } from "./goal-sheet";

interface GoalCardProps {
  goal: number | null;
  monthProfit: number;
}

export function GoalCard({ goal, monthProfit }: GoalCardProps) {
  const [open, setOpen] = useState(false);

  if (!goal) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-card flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left active:scale-[0.99]"
        >
          <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Target className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Defina sua meta mensal</span>
            <span className="text-muted-foreground block text-sm">Acompanhe quanto falta para chegar lá.</span>
          </span>
        </button>
        <GoalSheet open={open} onOpenChange={setOpen} />
      </>
    );
  }

  const progress = calculateGoalProgress(goal, monthProfit);

  return (
    <section aria-label="Meta mensal" className="bg-card rounded-2xl border p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <Target className="size-3.5" /> Meta do mês
        </p>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="-mr-2">
          <Pencil /> Editar
        </Button>
      </div>

      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <Money value={progress.current} size="md" className={cn(progress.current < 0 && "text-destructive")} />
        <span className="text-muted-foreground text-sm font-medium tabular-nums">/ {formatCurrency(progress.target)}</span>
      </p>

      <ProgressBar
        className="mt-3"
        value={progress.percent}
        marker={(progress.expectedByNow / progress.target) * 100}
        label="Progresso da meta mensal"
        indicatorClassName={progress.achieved ? "bg-positive" : undefined}
      />

      <p className="mt-3 text-sm">
        {progress.achieved ? (
          <span className="text-positive flex items-center gap-1.5 font-semibold">
            <PartyPopper className="size-4" /> Meta atingida! Tudo agora é lucro extra.
          </span>
        ) : (
          <>
            Faltam <strong className="tabular-nums">{formatCurrency(progress.remaining)}</strong> para atingir sua meta
            <span className="text-muted-foreground block text-xs tabular-nums">
              ≈ {formatCurrency(progress.dailyNeeded)}/dia nos {progress.daysLeft}{" "}
              {progress.daysLeft === 1 ? "dia restante" : "dias restantes"}
              {!progress.onTrack && " · abaixo do ritmo esperado"}
            </span>
          </>
        )}
      </p>
      <GoalSheet open={open} onOpenChange={setOpen} />
    </section>
  );
}
