import axios from "axios";
import { registrarErroTela } from "./error_log.service";

export type LoginResponse = {
  access_token: string;
  username?: string;
  nome_completo?: string;
  department?: string;
  physicalDeliveryOfficeName?: string;
  email?: string;
  ramal?: string;
  grupos?: string[];
};

export type MeResponse = {
  username?: string;
  nome_completo?: string;
  department?: string;
  physicalDeliveryOfficeName?: string;
  email?: string;
  ramal?: string;
  grupos?: string[];
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      const url = error?.config?.url || "";

      const ignorarRotas = [
        "/v1/me",
        "/v1/login_sem_automatico",
        "/v1/logout",
        "/v1/error-logs",
      ];

      const deveIgnorar = ignorarRotas.some((rota) =>
        String(url).includes(rota)
      );

      if (!deveIgnorar) {
        await registrarErroTela({
          PAGE_URL:
            typeof window !== "undefined"
              ? window.location.href
              : null,

          ERROR_MESSAGE:
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
            "Erro no service de autenticação",

          ERROR_STACK: error?.stack || null,

          ERROR_DETAIL: {
            status: error?.response?.status,
            url,
            method: error?.config?.method,
            responseData: error?.response?.data,
          },

          SOURCE: "AUTH_AXIOS",
        });
      }
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export async function loginAdUser(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await api.post("/v1/login_sem_automatico", null, {
    params: {
      username,
      password,
    },
  });

  return response.data;
}

export async function getMeAdUser(): Promise<MeResponse> {
  const response = await api.get("/v1/me");
  return response.data;
}

export async function logoutAdUser() {
  const response = await api.post("/v1/logout");
  return response.data;
}

export function userHasGroup(
  userGroups: string[] | undefined,
  allowedGroups: string[]
): boolean {
  if (!Array.isArray(userGroups) || userGroups.length === 0) return false;

  return allowedGroups.some((group) =>
    userGroups.includes(group)
  );
}

export function userHasAnyGroup(
  me: MeResponse | undefined,
  allowedGroups: string[]
): boolean {
  return userHasGroup(me?.grupos, allowedGroups);
}