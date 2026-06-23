import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
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
          error?.response?.data?.details ||
          error?.message ||
          "Erro desconhecido",
        ERROR_STACK: error?.stack || null,
        SOURCE: "cnab240_agencias.service.ts",
      });
    } catch (e) {
      console.error("Erro ao registrar log:", e);
    }

    return Promise.reject(error);
  }
);

export type CnabAgencia = {
  ID_AGENCIA: number;
  BANCOAGENCIA: string;
  NUMBANCO: string;
  NUMAGENCIA: string;
  DESCAGENCIA?: string | null;
  NUMCAMARACOMP?: string | null;
  CGCCOMPLETO?: string | null;
  CODMUNICIPIO?: string | null;
  NOMEMUNICIPIO?: string | null;
  UF?: string | null;
  CREATED_AT?: string | null;
};

export type CnabAgenciaPayload = {
  NUMBANCO: string;
  NUMAGENCIA: string;
  DESCAGENCIA?: string | null;
  NUMCAMARACOMP?: string | null;
  CGCCOMPLETO?: string | null;
  CODMUNICIPIO?: string | null;
  NOMEMUNICIPIO?: string | null;
  UF?: string | null;
};

export type ListarAgenciasParams = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type ListarAgenciasResponse = {
  data: CnabAgencia[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  resumo: {
    totalAgencias: number;
    totalBancos: number;
    totalMunicipios: number;
  };
};

export type CnabAgenciaImportarLinha = CnabAgenciaPayload;

export type ImportarAgenciasResponse = {
  success: boolean;
  message: string;
  processados: number;
  inseridos: number;
  erros: number;
  detalhes: {
    linha: number;
    bancoagencia: string;
    numbanco: string;
    numagencia: string;
    descagencia: string | null;
    status: "INSERIDO" | "ERRO";
    mensagem: string;
  }[];
};

export async function listarAgencias(
  params: ListarAgenciasParams = {}
): Promise<ListarAgenciasResponse> {
  const response = await api.get("/v1/cnab240/agencias", {
    params: {
      busca: params.busca || "",
      page: params.page || 1,
      limit: params.limit || 20,
    },
  });

  return {
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    total: Number(response.data?.total || 0),
    page: Number(response.data?.page || 1),
    limit: Number(response.data?.limit || 20),
    totalPages: Number(response.data?.totalPages || 1),
    resumo: {
      totalAgencias: Number(response.data?.resumo?.totalAgencias || 0),
      totalBancos: Number(response.data?.resumo?.totalBancos || 0),
      totalMunicipios: Number(response.data?.resumo?.totalMunicipios || 0),
    },
  };
}

export async function criarAgencia(
  payload: CnabAgenciaPayload
): Promise<any> {
  const response = await api.post("/v1/cnab240/agencias", payload);

  return response.data;
}

export async function atualizarAgencia(
  id: number,
  payload: CnabAgenciaPayload
): Promise<any> {
  const response = await api.put(
    `/v1/cnab240/agencias/${id}`,
    payload
  );

  return response.data;
}

export async function excluirAgencia(
  id: number
): Promise<any> {
  const response = await api.delete(
    `/v1/cnab240/agencias/${id}`
  );

  return response.data;
}

export async function importarAgenciasEmMassa(
  linhas: CnabAgenciaImportarLinha[]
): Promise<ImportarAgenciasResponse> {
  const response = await api.post(
    "/v1/cnab240/agencias/importar-massa",
    linhas
  );

  return response.data;
}