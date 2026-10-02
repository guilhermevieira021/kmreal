import "server-only";

/** URL pública do app, para links enviados por e-mail. */
export function appUrl(): string {
  const explicit = process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envio de e-mail via API HTTP da Resend (sem SDK). Sem RESEND_API_KEY, o conteúdo
 * vai para o log do servidor — suficiente em desenvolvimento, nunca em produção.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "KmReal <onboarding@resend.dev>";

  if (!apiKey) {
    const level = process.env.NODE_ENV === "production" ? "warn" : "info";
    console[level](`[mailer] RESEND_API_KEY ausente — e-mail não enviado.\nPara: ${mail.to}\n${mail.text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao enviar e-mail (${response.status}): ${await response.text()}`);
  }
}

export function passwordResetMail(to: string, name: string, link: string): Mail {
  const text =
    `Olá, ${name}!\n\nRecebemos um pedido para redefinir sua senha do KmReal.\n` +
    `Abra o link abaixo (válido por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail.`;
  const html = `<p>Olá, ${escapeHtml(name)}!</p>
<p>Recebemos um pedido para redefinir sua senha do <strong>KmReal</strong>.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#047857;color:#fff;border-radius:10px;text-decoration:none">Criar nova senha</a></p>
<p style="color:#737373;font-size:13px">O link vale por 1 hora. Se não foi você, ignore este e-mail.</p>`;
  return { to, subject: "Redefinir sua senha do KmReal", html, text };
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
