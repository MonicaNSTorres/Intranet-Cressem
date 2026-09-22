"use client";

import { useEffect, useRef, useState } from "react";
import {
  buscarUsuarioLogadoParaErro,
  registrarErroTela,
} from "@/services/error_log.service";

type UserMe = {
  username?: string;
  nome_completo?: string;
  email?: string;
  department?: string;
};

export function ErrorLoggerProvider() {
  const [user, setUser] = useState<UserMe | null>(null);
  const sentRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    async function carregarUsuario() {
      const usuario = await buscarUsuarioLogadoParaErro();
      setUser(usuario);
    }

    carregarUsuario();
  }, []);

  useEffect(() => {
    function enviarErro(data: {
      message: string;
      stack?: string | null;
      detail?: unknown;
      source: string;
    }) {
      if (typeof window === "undefined") return;

      const pageUrl = window.location.href;
      const key = `${data.source}-${data.message}-${pageUrl}`;

      if (sentRef.current[key]) return;
      sentRef.current[key] = true;

      registrarErroTela({
        USERNAME: user?.username || null,
        NOME_COMPLETO: user?.nome_completo || null,
        EMAIL: user?.email || null,
        DEPARTMENT: user?.department || null,
        PAGE_URL: pageUrl,
        ERROR_MESSAGE: data.message,
        ERROR_STACK: data.stack || null,
        ERROR_DETAIL: data.detail,
        SOURCE: data.source,
      });
    }

    function handleError(event: ErrorEvent) {
      enviarErro({
        message: event.message || "Erro JavaScript não tratado",
        stack: event.error?.stack || null,
        detail: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        source: "WINDOW_ERROR",
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;

      enviarErro({
        message:
          reason?.message ||
          String(reason) ||
          "Promise rejeitada sem tratamento",
        stack: reason?.stack || null,
        detail: {
          reason:
            typeof reason === "object"
              ? JSON.stringify(reason)
              : String(reason),
        },
        source: "UNHANDLED_REJECTION",
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [user]);

  return null;
}