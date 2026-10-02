"use client";

import { useEffect, useState } from "react";
import { CloudUpload, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useData } from "@/providers/data-provider";
import { ApiError, importLocalData } from "@/services";
import {
  isSnapshotEmpty,
  localImportDecision,
  readLocalSnapshot,
  setLocalImportDecision,
  type LocalSnapshot,
} from "@/services/local/snapshot";

/** Disparado pelo Perfil para oferecer a importação de novo. */
export const OFFER_IMPORT_EVENT = "kmreal:offer-import";

/**
 * Após o login, se o aparelho tem dados da versão de testes (localStorage),
 * oferece importá-los para a conta. Pergunta uma vez por aparelho.
 */
export function LocalImportSheet() {
  const { reload, isLoading } = useData();
  const [snapshot, setSnapshot] = useState<LocalSnapshot | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    const check = () => {
      if (localImportDecision()) return;
      const found = readLocalSnapshot();
      if (!isSnapshotEmpty(found)) setSnapshot(found);
    };
    check();
    window.addEventListener(OFFER_IMPORT_EVENT, check);
    return () => window.removeEventListener(OFFER_IMPORT_EVENT, check);
  }, [isLoading]);

  async function handleImport() {
    if (!snapshot) return;
    setPending(true);
    try {
      const result = await importLocalData(snapshot);
      setLocalImportDecision("imported");
      setSnapshot(null);
      await reload();
      toast.success(`Importado: ${result.trips} viagens, ${result.vehicles} veículos e ${result.maintenances} manutenções.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Já importado antes (outro aparelho/aba): não pergunta mais.
        setLocalImportDecision("imported");
        setSnapshot(null);
        toast.info(error.message);
      } else {
        toast.error(error instanceof ApiError ? error.message : "Não foi possível importar. Tente de novo.");
      }
    } finally {
      setPending(false);
    }
  }

  function handleDismiss() {
    setLocalImportDecision("dismissed");
    setSnapshot(null);
  }

  const counts = snapshot && [
    snapshot.trips.length && `${snapshot.trips.length} viagens`,
    snapshot.vehicles.length && `${snapshot.vehicles.length} veículos`,
    snapshot.maintenances.length && `${snapshot.maintenances.length} manutenções`,
  ].filter(Boolean);

  return (
    <Sheet open={snapshot !== null} onOpenChange={(open) => !open && !pending && setSnapshot(null)}>
      <SheetContent>
        <span className="bg-muted flex size-12 items-center justify-center rounded-2xl">
          <Smartphone className="size-6" />
        </span>
        <SheetTitle>Dados encontrados neste aparelho</SheetTitle>
        <SheetDescription>
          Você usou a versão de testes do KmReal aqui: {counts?.join(", ")}. Quer levar tudo para a sua conta?
        </SheetDescription>
        <p className="text-muted-foreground text-xs">
          Os dados passam a ficar salvos na sua conta e aparecem em qualquer aparelho. Uma cópia de segurança fica neste
          celular.
        </p>
        <Button size="lg" onClick={handleImport} disabled={pending}>
          <CloudUpload /> {pending ? "Importando..." : "Importar para minha conta"}
        </Button>
        <Button variant="ghost" onClick={handleDismiss} disabled={pending}>
          Não importar
        </Button>
      </SheetContent>
    </Sheet>
  );
}
