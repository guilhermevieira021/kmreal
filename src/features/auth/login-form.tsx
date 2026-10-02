"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TextField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { DEMO_CREDENTIALS } from "@/lib/constants";
import { ApiError, authService } from "@/services";
import { validateEmail, validatePassword } from "./validation";

type Errors = Partial<Record<"email" | "password" | "form", string>>;

/** Botão de conta demo só quando habilitado (ambiente de testes com seed). */
const DEMO_LOGIN = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

/** Evita redirecionamento aberto: só caminhos internos. */
const safeCallback = (value: string | null) => (value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard");

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const notice =
    params.get("senha") === "redefinida"
      ? "Senha alterada. Entre com a nova senha."
      : params.get("expired") === "1"
        ? "Sua sessão expirou. Entre novamente."
        : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const nextErrors: Errors = { email: validateEmail(email), password: validatePassword(password) };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    await enter(email, password);
  }

  async function enter(email: string, password: string) {
    setPending(true);
    try {
      await authService.signIn(email.trim().toLowerCase(), password);
      router.replace(safeCallback(params.get("callbackUrl")));
      router.refresh();
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : "Não foi possível entrar. Tente de novo." });
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {errors.form ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-medium">
          {errors.form}
        </p>
      ) : (
        notice && <p className="bg-muted rounded-xl px-4 py-3 text-sm">{notice}</p>
      )}
      <TextField id="email" label="E-mail" type="email" autoComplete="email" inputMode="email" error={errors.email} />
      <TextField
        id="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />
      <Link href="/recuperar-senha" className="text-muted-foreground -my-1 justify-self-end py-2 text-sm hover:underline">
        Esqueci minha senha
      </Link>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      {DEMO_LOGIN && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => enter(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password)}
        >
          Entrar com conta de demonstração
        </Button>
      )}
    </form>
  );
}
