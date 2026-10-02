import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Bem-vindo de volta"
      description="Entre para ver o lucro real das suas viagens"
      footer={
        <>
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-foreground font-medium hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      {/* O formulário lê ?callbackUrl e ?expired da URL */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
