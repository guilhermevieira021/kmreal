import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { NewPasswordForm } from "@/features/auth/new-password-form";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Criar nova senha" description="Escolha uma senha nova para sua conta">
      <NewPasswordForm token={token ?? null} />
    </AuthShell>
  );
}
