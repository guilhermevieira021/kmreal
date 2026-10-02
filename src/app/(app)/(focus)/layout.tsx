/** Fluxos em tela cheia (sem menu inferior), para foco total na tarefa. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">{children}</div>;
}
