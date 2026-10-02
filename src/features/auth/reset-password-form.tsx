"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { TextField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, authService } from "@/services";
import { validateEmail } from "./validation";

export function ResetPasswordForm() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const validation = validateEmail(email);
    setError(validation);
    if (validation) return;

    setPending(true);
    try {
      await authService.requestPasswordReset(email.trim().toLowerCase());
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border p-6 text-center">
        <MailCheck className="text-positive size-10" />
        <p className="text-sm">
          Se existir uma conta para <strong>{sentTo}</strong>, você receberá um link para redefinir a senha. Confira também a caixa de spam.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Voltar para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <TextField id="email" label="E-mail" type="email" autoComplete="email" inputMode="email" error={error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link"}
      </Button>
    </form>
  );
}
