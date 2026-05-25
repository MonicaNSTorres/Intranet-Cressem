/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001";

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
          typeof window !== "undefined"
            ? window.location.href
            : null,

        ERROR_MESSAGE:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Erro no service de consulta de contratos",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "CONSULTA_CONTRATOS_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type ContratoEmpresaItem = {
  ID_CONTRATOS_EMPRESAS: number;
  NR_CNPJ: string;
  NM_EMPRESA: string;
  NM_CIDADE: string;
  NM_TIPO_CONTRATO: string;
  NM_SISTEMA_CONSIG: string;
  DT_INICIO: string;
  DT_FIM: string | null;
  SN_ATIVO: number;
  CD_CONTA_CAPITAL?: string;
  NM_TIPO_TEMPO_CONTRATO?: string;
  OBS_CONTRATO?: string;
};

export type ConsultaContratosParams = {
  page?: number;
  limit?: number;
  NM_EMPRESA?: string;
  NR_CNPJ?: string;
  NM_CIDADE?: string;
  NM_TIPO_CONTRATO?: string;
  NM_SISTEMA_CONSIG?: string;
  SN_ATIVO?: number;
};

export async function consultarContratosEmpresas(params: ConsultaContratosParams) {
  const { data } = await api.get("/v1/contratos_empresas", {
    params,
  });
  return data;
}

export async function carregarCidadesContratoConsulta() {
  const { data } = await api.get<string[]>("/v1/contratos_empresas_cidades");
  return data || [];
}

export async function carregarTiposContratoConsulta() {
  const { data } = await api.get<string[]>("/v1/contratos_empresas_tipo");
  return data || [];
}

export async function carregarSistemasConsignadosConsulta() {
  const { data } = await api.get<string[]>("/v1/contratos_empresas_sistema");
  return data || [];
}