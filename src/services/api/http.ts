/** Erro de API com mensagem pronta para exibir ao motorista. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues?: { path: string; message: string }[],
    /** Código do servidor (ex.: PRO_REQUIRED) */
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Sessão expirou em outro lugar: volta para o login guardando onde estava. */
function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname === "/login") return;
  const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?expired=1&callbackUrl=${callbackUrl}`;
}

/** fetch JSON para /api, com erros traduzidos. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      cache: "no-store",
      credentials: "same-origin",
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, "Sem conexão com a internet. Tente de novo.");
  }

  if (response.status === 401 && !path.startsWith("/account")) {
    redirectToLogin();
    throw new ApiError(401, "Sua sessão expirou. Entre novamente.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      issues?: ApiError["issues"];
      code?: string;
    };
    throw new ApiError(response.status, body.error ?? "Algo deu errado. Tente de novo.", body.issues, body.code);
  }
  if (response.status === 202 || response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
