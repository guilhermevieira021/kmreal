const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Informe seu e-mail";
  if (!EMAIL_RE.test(email.trim())) return "E-mail inválido";
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Informe sua senha";
  if (password.length < MIN_PASSWORD_LENGTH) return `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`;
}
