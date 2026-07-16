import axios, { AxiosError } from "axios";
import { registrarErroTela } from "./error_log.service";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

let redirecionandoParaLogin = false;

function rotaContem(url: string, rotas: string[]) {
  return rotas.some((rota) => url.includes(rota));
}

api.interceptors.response.use(
  (response) => response,

  (error: AxiosError<any>) => {
    const url = String(error?.config?.url || "");
    const status = error?.response?.status;

    const ignorarRegistroErro = rotaContem(url, [
      "/v1/me",
      "/v1/login_sem_automatico",
      "/v1/logout",
      "/v1/error-logs",
    ]);

    if (!ignorarRegistroErro) {
      void registrarErroTela({
        PAGE_URL:
          typeof window !== "undefined"
            ? window.location.href
            : null,

        ERROR_MESSAGE:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          "Erro inesperado no frontend",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status,
          url,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "FRONTEND_AXIOS",
      }).catch(() => {});
    }

    const ignorarRedirecionamento = rotaContem(url, [
      "/v1/login_sem_automatico",
      "/v1/logout",
    ]);

    if (
      typeof window !== "undefined" &&
      status === 401 &&
      !ignorarRedirecionamento &&
      window.location.pathname !== "/login" &&
      !redirecionandoParaLogin
    ) {
      redirecionandoParaLogin = true;

      window.location.replace("/login");
    }

    return Promise.reject(error);
  }
);