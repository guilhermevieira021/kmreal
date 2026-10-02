import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** Wrapper de label + controle + mensagem, para qualquer tipo de campo. */
export function Field({ id, label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<ComponentProps<typeof Input>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Texto fixo antes do valor, ex.: "R$" */
  prefix?: string;
  /** Texto fixo depois do valor, ex.: "km" */
  suffix?: string;
  fieldClassName?: string;
}

export function TextField({ id, label, error, hint, prefix, suffix, fieldClassName, className, ...props }: TextFieldProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} className={fieldClassName}>
      <div className="relative">
        {prefix && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          name={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(prefix && "pl-10", suffix && "pr-12", className)}
          {...props}
        />
        {suffix && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

/** Campo numérico otimizado para teclado do celular (aceita vírgula). */
export function NumberField(props: TextFieldProps) {
  return <TextField type="text" inputMode="decimal" autoComplete="off" placeholder="0" {...props} />;
}
