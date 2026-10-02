export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm items-center px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
