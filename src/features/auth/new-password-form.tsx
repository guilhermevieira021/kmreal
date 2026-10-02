"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TextField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, authService } from "@/services";
import { validatePassword } from "./validation";

type Errors = Partial<Record<"password" | "confirm" | "form", string>>;

/** Segunda etapa da recuperação: definir a nova senha a partir do link do e-mail. */
export function NewPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm">Este link está incompleto. Peça um novo para redefinir sua senha.</p>
        <Button asChild size="lg">
          <Link href="/recuperar-senha">Pedir novo link</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const nextErrors: Errors = {
      password: validatePassword(password),
      confirm: password === confirm ? undefined : "As senhas não conferem",
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) return;

    setPending(true);
    try {
      await authService.resetPassword(token!, password);
      router.replace("/login?senha=redefinida");
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : "Não foi possível alterar a senha." });
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {errors.form && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-medium">
          {errors.form}{" "}
          <Link href="/recuperar-senha" className="underline">
            Pedir novo link
          </Link>
        </p>
      )}
      <TextField
        id="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 6 caracteres"
        error={errors.password}
      />
      <TextField id="confirm" label="Repita a nova senha" type="password" autoComplete="new-password" error={errors.confirm} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
