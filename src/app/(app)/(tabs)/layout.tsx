import { BottomNav } from "@/components/layout/bottom-nav";

/** Telas com menu inferior. */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
