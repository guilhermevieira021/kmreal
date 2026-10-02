import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Criar conta"
      description="Comece a controlar seus fretes em menos de 1 minuto"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
