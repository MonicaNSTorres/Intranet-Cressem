/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      await registrarErroTela({
        PAGE_URL:
          typeof window !== "undefined" ? window.location.href : null,

        ERROR_MESSAGE:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Erro no service de gestão de valor de convênio",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          params: error?.config?.params,
          data: error?.config?.data,
          responseData: error?.response?.data,
        },

        SOURCE: "GESTAO_VALOR_CONVENIO_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type FatorAjusteOdontoItem = {
  ID_CONVENIO_FATOR_AJUSTE: number;
  ID_OPERADORA?: number;
  CONVENIO_FATOR_AJUSTE_HISTORICO?: number;
  NM_FATOR_AJUSTE: string;
  VL_AJUSTE: number;
  DT_VIGENCIA: string;
};

export async function listarFatoresAjusteOdonto() {
  const { data } = await api.get<FatorAjusteOdontoItem[]>("/v1/fator_ajuste");
  return data || [];
}

export async function atualizarFatorAjusteOdonto(
  id: number,
  payload: {
    ID_CONVENIO_FATOR_AJUSTE: number;
    NM_FATOR_AJUSTE: string;
    VL_AJUSTE: number;
    DT_VIGENCIA: string;
  }
) {
  const nomeUsuario = "INTRANET";

  const { data } = await api.put(
    `/v1/fator_ajuste/${id}/usuario/${encodeURIComponent(nomeUsuario)}`,
    payload
  );

  return data;
}