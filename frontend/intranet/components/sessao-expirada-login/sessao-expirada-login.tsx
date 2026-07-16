"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, logoutAdUser } from "@/services/auth.service";

const PUBLIC_ROUTES = ["/login", "/forget_password"];
const INTERVALO_VALIDACAO = 60_000;

export function SessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  const validandoRef = useRef(false);
  const redirecionandoRef = useRef(false);

  const rotaPublica = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const encerrarSessao = useCallback(() => {
    if (redirecionandoRef.current) return;

    redirecionandoRef.current = true;

    //redireciona imediatamente sem depender da resposta do logout
    router.replace("/login");

    //tenta limpar a sessao no backend mas nao bloqueia o redirecionamento
    void logoutAdUser().catch(() => {
      //a sessão ja esta invalida nao e necessario impedir o redirecionamento
    });
  }, [router]);

  const validarSessao = useCallback(async () => {
    if (validandoRef.current || redirecionandoRef.current) return;

    validandoRef.current = true;

    try {
      await api.get("/v1/me");
    } catch (error: any) {
      if (error?.response?.status === 401) {
        encerrarSessao();
      }
    } finally {
      validandoRef.current = false;
    }
  }, [encerrarSessao]);

  useEffect(() => {
    if (rotaPublica) return;

    //valida imediatamente ao carregar uma pagina protegida
    void validarSessao();

    const interval = window.setInterval(() => {
      void validarSessao();
    }, INTERVALO_VALIDACAO);

    //valida quando o usuario volta para a aba
    const validarAoVoltarParaAba = () => {
      if (document.visibilityState === "visible") {
        void validarSessao();
      }
    };

    //valida quando a janela recebe foco novamente
    const validarAoReceberFoco = () => {
      void validarSessao();
    };

    document.addEventListener("visibilitychange", validarAoVoltarParaAba);
    window.addEventListener("focus", validarAoReceberFoco);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        validarAoVoltarParaAba
      );
      window.removeEventListener("focus", validarAoReceberFoco);
    };
  }, [rotaPublica, validarSessao]);

  return null;
}