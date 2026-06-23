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
        PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
        ERROR_MESSAGE:
          error?.response?.data?.error ||
          error?.response?.data?.details ||
          error?.message ||
          "Erro desconhecido",
        ERROR_STACK: error?.stack || null,
        SOURCE: "cnab240_cco.service.ts",
      });
    } catch (e) {
      console.error("Erro ao registrar log:", e);
    }

    return Promise.reject(error);
  }
);

export type CnabCco = {
  ID_CCO: number;
  CHAVE_CPF_ATIVA?: string | null;
  CPF: string;
  CONTA?: string | null;
  ATIVA?: string | null;
  CREATED_AT?: string | null;
};

export type CnabCcoPayload = {
  CPF: string;
  CONTA?: string | null;
  ATIVA?: string | null;
};

export type ListarCcoParams = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type ListarCcoResponse = {
  data: CnabCco[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  resumo: {
    totalCco: number;
    totalAtivas: number;
    totalInativas: number;
  };
};

export type CnabCcoImportarLinha = {
  CPF: string;
  CONTA?: string | null;
  ATIVA?: string | null;
};

export type ImportarCcoMassaResponse = {
  success: boolean;
  message: string;
  processados: number;
  inseridos: number;
  erros: number;
  detalhes: {
    linha: number;
    cpf: string;
    conta: string | null;
    ativa: string;
    status: "INSERIDO" | "ERRO";
    mensagem: string;
  }[];
};

export async function importarCcoEmMassa(
  linhas: CnabCcoImportarLinha[]
): Promise<ImportarCcoMassaResponse> {
  const response = await api.post("/v1/cnab240/cco/importar-massa", {
    linhas,
  });

  return response.data;
}

export async function listarCco(
  params: ListarCcoParams = {}
): Promise<ListarCcoResponse> {
  const response = await api.get("/v1/cnab240/cco", {
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
      totalCco: Number(response.data?.resumo?.totalCco || 0),
      totalAtivas: Number(response.data?.resumo?.totalAtivas || 0),
      totalInativas: Number(response.data?.resumo?.totalInativas || 0),
    },
  };
}

export async function criarCco(payload: CnabCcoPayload): Promise<any> {
  const response = await api.post("/v1/cnab240/cco", payload);

  return response.data;
}

export async function atualizarCco(
  id: number,
  payload: CnabCcoPayload
): Promise<any> {
  const response = await api.put(`/v1/cnab240/cco/${id}`, payload);

  return response.data;
}

export async function excluirCco(id: number): Promise<any> {
  const response = await api.delete(`/v1/cnab240/cco/${id}`);

  return response.data;
}