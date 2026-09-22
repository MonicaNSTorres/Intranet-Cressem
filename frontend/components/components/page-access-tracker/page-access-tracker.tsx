"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { registrarPaginaAcessada } from "@/services/dashboard.service";

const TEMPO_MINIMO_NOVO_REGISTRO = 30_000;

export function PageAccessTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (!pathname.startsWith("/auth/")) {
      return;
    }

    if (
      pathname === "/auth" ||
      pathname === "/auth/home"
    ) {
      return;
    }

    const chave = `acesso-pagina:${pathname}`;
    const ultimoRegistro = Number(
      sessionStorage.getItem(chave) || 0
    );

    const agora = Date.now();

    if (
      agora - ultimoRegistro <
      TEMPO_MINIMO_NOVO_REGISTRO
    ) {
      return;
    }

    sessionStorage.setItem(
      chave,
      String(agora)
    );

    registrarPaginaAcessada(pathname).catch(
      (error) => {
        console.error(
          "[PageAccessTracker] erro ao registrar página:",
          error
        );

        sessionStorage.removeItem(chave);
      }
    );
  }, [pathname]);

  return null;
}