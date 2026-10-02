"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TextField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, authService } from "@/services";
import { validateEmail, validatePassword } from "./validation";

type Errors = Partial<Record<"name" | "email" | "password" | "form", string>>;

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const nextErrors: Errors = {
      name: name ? undefined : "Informe seu nome",
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setPending(true);
    try {
      await authService.signUp(name, email.trim().toLowerCase(), password);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Não foi possível criar a conta. Tente de novo.";
      setErrors(error instanceof ApiError && error.status === 409 ? { email: message } : { form: message });
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {errors.form && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-medium">
          {errors.form}
        </p>
      )}
      <TextField id="name" label="Nome" autoComplete="name" error={errors.name} />
      <TextField id="email" label="E-mail" type="email" autoComplete="email" inputMode="email" error={errors.email} />
      <TextField
        id="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 6 caracteres"
        error={errors.password}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
