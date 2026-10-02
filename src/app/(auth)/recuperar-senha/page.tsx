import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      description="Enviaremos um link para você criar uma nova senha"
      footer={
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
