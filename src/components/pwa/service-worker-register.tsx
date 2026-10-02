"use client";

import { useEffect } from "react";

/** Registra o service worker apenas em produção, para não cachear o ambiente de dev. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Falha no registro não deve afetar o uso do app.
    });
  }, []);

  return null;
}
