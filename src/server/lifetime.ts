import "server-only";

/**
 * PRO vitalício (cortesia/equipe). A lista fica na variável LIFETIME_PRO_EMAILS
 * (e-mails separados por vírgula) — nunca no código, porque o repositório é público.
 */
export const LIFETIME_EXPIRES_AT = new Date("2099-12-31T23:59:59.000Z");

function lifetimeEmails(): Set<string> {
  return new Set(
    (process.env.LIFETIME_PRO_EMAILS ?? "")
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const isLifetimeEmail = (email: string | null | undefined) =>
  Boolean(email) && lifetimeEmails().has(email!.trim().toLowerCase());
