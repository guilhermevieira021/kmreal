import { daysInMonth } from "@/lib/dates";
import { round2 } from "./trip";

/** Antes deste dia do mês o ritmo ainda não diz nada: não sinaliza atraso. */
const PACE_MIN_DAY = 5;

export interface GoalProgress {
  target: number;
  current: number;
  remaining: number;
  /** 0–100, para a barra */
  percent: number;
  achieved: boolean;
  daysLeft: number;
  /** Lucro diário necessário nos dias restantes (incluindo hoje) */
  dailyNeeded: number;
  /** Lucro esperado até hoje num ritmo linear */
  expectedByNow: number;
  onTrack: boolean;
}

export function calculateGoalProgress(target: number, monthProfit: number, now: Date = new Date()): GoalProgress {
  const totalDays = daysInMonth(now);
  const day = now.getDate();
  const remaining = round2(Math.max(0, target - monthProfit));
  const daysLeft = totalDays - day + 1;
  const expectedByNow = round2((target * day) / totalDays);

  return {
    target,
    current: monthProfit,
    remaining,
    percent: target > 0 ? Math.min(100, Math.max(0, (monthProfit / target) * 100)) : 0,
    achieved: monthProfit >= target,
    daysLeft,
    dailyNeeded: round2(remaining / daysLeft),
    expectedByNow,
    onTrack: day < PACE_MIN_DAY || monthProfit >= expectedByNow * 0.9,
  };
}
