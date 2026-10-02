import "server-only";

/** Erros de domínio convertidos em status HTTP por src/server/api.ts. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Registro") => new HttpError(404, `${what} não encontrado`);
export const conflict = (message: string) => new HttpError(409, message);
export const badRequest = (message: string) => new HttpError(400, message);
