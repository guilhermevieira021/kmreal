import { LocalImportSheet } from "@/features/migration/local-import-sheet";
import { DataProvider } from "@/providers/data-provider";

/**
 * Área logada (protegida pelo middleware): o estado de dados é compartilhado entre abas
 * e o fluxo em tela cheia. Oferece importar dados do protótipo salvos no aparelho.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      {children}
      <LocalImportSheet />
    </DataProvider>
  );
}
