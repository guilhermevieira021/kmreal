"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Crown,
  Calculator,
  ChevronRight,
  Cloud,
  CloudOff,
  CloudUpload,
  HeartPulse,
  LogOut,
  Medal,
  Palette,
  Target,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Money } from "@/components/shared/money";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSheet } from "@/features/appearance/theme-sheet";
import { GoalSheet } from "@/features/goal/goal-sheet";
import { getTheme } from "@/lib/themes";
import { useTheme } from "@/providers/theme-provider";
import { ProBadge } from "@/features/subscription/pro-lock";
import { formatDate } from "@/lib/format";
import { summarizeReal } from "@/lib/calculations/real-cost";
import { formatCurrency, formatCurrencyPerKm, formatKm, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { authService, syncService } from "@/services";
import { clearLocalImportDecision, isSnapshotEmpty, localImportDecision, readLocalSnapshot } from "@/services/local/snapshot";
import { OFFER_IMPORT_EVENT } from "@/features/migration/local-import-sheet";
import type { UserProfile } from "@/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const rowClass =
  "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium transition-colors active:bg-accent";

function MenuIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg", className)}>
      <Icon className="size-[18px]" />
    </span>
  );
}

function MenuLink({ href, icon, label, locked }: { href: string; icon: LucideIcon; label: string; locked?: boolean }) {
  return (
    <Link href={href} className={rowClass}>
      <MenuIcon icon={icon} />
      <span className="flex flex-1 items-center gap-2">
        {label}
        {locked && <ProBadge />}
      </span>
      <ChevronRight className="text-muted-foreground size-5" />
    </Link>
  );
}

export function ProfileView() {
  const router = useRouter();
  const { trips, costRates, settings, isLoading, isPro, account } = useData();
  const expiresAt = account?.subscription.expiresAt;
  const [profile, setProfile] = useState<UserProfile>();
  const [goalOpen, setGoalOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme } = useTheme();
  const totals = summarizeReal(trips, costRates);
  const [sync, setSync] = useState(syncService.getState);
  const [canImport, setCanImport] = useState(false);
  const goal = settings?.monthlyProfitGoal ?? null;

  useEffect(() => {
    authService.getSession().then((session) => setProfile(session?.user));
    // Dados da versão de testes que o motorista preferiu não importar na hora.
    setCanImport(localImportDecision() === "dismissed" && !isSnapshotEmpty(readLocalSnapshot()));
    return syncService.subscribe(setSync);
  }, []);

  function offerImport() {
    clearLocalImportDecision();
    setCanImport(false);
    window.dispatchEvent(new Event(OFFER_IMPORT_EVENT));
  }

  async function handleSignOut() {
    await authService.signOut();
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="Perfil" />

      <div className="flex items-center gap-4 px-1">
        {profile ? (
          <>
            <div className="bg-primary text-primary-foreground flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold">
              {initials(profile.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{profile.name}</p>
              <p className="text-muted-foreground truncate text-sm">{profile.email}</p>
            </div>
          </>
        ) : (
          <>
            <Skeleton className="size-16 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-3">
          <Skeleton className="h-[132px] rounded-3xl" />
          <Skeleton className="h-[84px] rounded-2xl" />
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          <section className="bg-hero text-hero-foreground rounded-3xl p-5 shadow-lg" aria-label="Lucro acumulado">
            <p className="text-sm font-medium opacity-80">{isPro ? "Lucro real acumulado" : "Lucro acumulado"}</p>
            <Money value={totals.realProfit} size="xl" className={cn("mt-2", totals.realProfit < 0 && "text-hero-negative")} />
            <p className="mt-3 text-sm tabular-nums opacity-70">
              {formatCurrencyPerKm(totals.realProfitPerKm)} · margem {isPro && "real "}
              {formatPercent(totals.realMargin)}
            </p>
          </section>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total de viagens" value={totals.tripCount} />
            <StatCard label="Total de KM" value={formatKm(totals.km)} />
          </div>
        </div>
      )}

      <div className="bg-card mt-6 divide-y overflow-hidden rounded-2xl border shadow-xs">
        <Link href="/upgrade" className={rowClass}>
          <MenuIcon icon={Crown} className={isPro ? "bg-primary text-primary-foreground" : undefined} />
          <span className="flex-1">Plano</span>
          <span className={cn("text-sm", isPro ? "text-positive font-semibold" : "text-primary-strong font-semibold")}>
            {account?.subscription.lifetime
              ? "PRO vitalício"
              : isPro
              ? `PRO${expiresAt ? ` até ${formatDate(expiresAt.slice(0, 10))}` : ""}${account?.subscription.canceledAt ? " · cancelada" : ""}`
              : "FREE · Assinar PRO"}
          </span>
          <ChevronRight className="text-muted-foreground size-5" />
        </Link>
        <button type="button" className={rowClass} onClick={() => setGoalOpen(true)}>
          <MenuIcon icon={Target} />
          <span className="flex-1">Meta de lucro mensal</span>
          <span className="text-muted-foreground text-sm tabular-nums">{goal ? formatCurrency(goal) : "Definir"}</span>
          <ChevronRight className="text-muted-foreground size-5" />
        </button>
        <button type="button" className={rowClass} onClick={() => setThemeOpen(true)}>
          <MenuIcon icon={Palette} />
          <span className="flex-1">Aparência</span>
          <span className="text-muted-foreground text-sm">{getTheme(theme).name}</span>
          <ChevronRight className="text-muted-foreground size-5" />
        </button>
        <MenuLink href="/saude" icon={HeartPulse} label="Saúde financeira" locked={!isPro} />
        <MenuLink href="/veiculos/ranking" icon={Medal} label="Ranking de veículos" locked={!isPro} />
        <MenuLink href="/simulador" icon={Calculator} label="Simulador de frete" />
        <MenuLink href="/veiculos" icon={Truck} label="Meus veículos" />
      </div>

      <p className="text-muted-foreground mt-3 flex items-start gap-2 px-1 text-xs">
        {sync.status === "offline" ? (
          <>
            <CloudOff className="mt-px size-4 shrink-0" />
            Sem internet. Conecte-se para ver e salvar seus dados.
          </>
        ) : (
          <>
            <Cloud className="mt-px size-4 shrink-0" />
            Seus dados ficam salvos na sua conta e aparecem em qualquer aparelho.
          </>
        )}
      </p>

      <div className="bg-card mt-6 divide-y overflow-hidden rounded-2xl border shadow-xs">
        {canImport && (
          <button type="button" className={rowClass} onClick={offerImport}>
            <MenuIcon icon={CloudUpload} />
            <span className="flex-1">Importar dados deste aparelho</span>
          </button>
        )}
        <ConfirmDialog
          title="Sair da conta?"
          confirmLabel="Sair"
          pendingLabel="Saindo..."
          onConfirm={handleSignOut}
          trigger={
            <button type="button" className={cn(rowClass, "text-destructive")}>
              <MenuIcon icon={LogOut} className="bg-destructive/10" />
              <span className="flex-1">Sair</span>
            </button>
          }
        />
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs">KmReal · v1.0</p>
      <GoalSheet open={goalOpen} onOpenChange={setGoalOpen} />
      <ThemeSheet open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  );
}
