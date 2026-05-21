import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

export type ErrorLogPayload = {
  USERNAME?: string | null;
  NOME_COMPLETO?: string | null;
  EMAIL?: string | null;
  DEPARTMENT?: string | null;
  PAGE_URL?: string | null;
  ERROR_MESSAGE: string;
  ERROR_STACK?: string | null;
  ERROR_DETAIL?: unknown;
  SOURCE?: string;
};

export async function registrarErroTela(payload: ErrorLogPayload) {
  try {
    await api.post("/v1/error-logs", payload);
  } catch {
  }
}

export async function buscarUsuarioLogadoParaErro() {
  try {
    const response = await api.get("/v1/me");
    return response.data || null;
  } catch {
    return null;
  }
}