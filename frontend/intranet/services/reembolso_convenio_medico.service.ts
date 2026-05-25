import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
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
          "Erro no service de reembolso convênio médico",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "REEMBOLSO_CONVENIO_MEDICO_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type FuncionarioResponse = {
  NM_FUNCIONARIO?: string;
  NR_MATRICULA?: string | number;
  NM_MATRICULA?: string | number;
  SETOR?: {
    NM_SETOR?: string;
  };
  CARGO?: {
    NM_CARGO?: string;
  };
  NM_SETOR?: string;
  NM_CARGO?: string;
  CD_GERENCIA?: string | number;
};

export type DiretorOption = {
  NM_FUNCIONARIO: string;
};

export async function buscarFuncionarioPorNome(
  nome: string
): Promise<FuncionarioResponse> {
  const response = await api.get(
    `/v1/reembolso-convenio-medico/funcionario/nome/${encodeURIComponent(nome)}`
  );
  return response.data;
}

export async function buscarDiretoria(): Promise<DiretorOption[]> {
  const response = await api.get(`/v1/reembolso-convenio-medico/diretoria`);
  return response.data || [];
}

export async function buscarDiretorPorNome(
  nome: string
): Promise<FuncionarioResponse> {
  const response = await api.get(
    `/v1/reembolso-convenio-medico/diretor/nome/${encodeURIComponent(nome)}`
  );
  return response.data;
}