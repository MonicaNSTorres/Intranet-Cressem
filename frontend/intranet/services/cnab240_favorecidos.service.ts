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
        SOURCE: "cnab240-favorecidos.service.ts",
      });
    } catch (e) {
      console.error("Erro ao registrar log:", e);
    }

    return Promise.reject(error);
  }
);

export type CnabFavorecido = {
  ID_FAVORECIDO: number;
  CPF: string;
  IDCLIENTE?: string | null;
  BANCO?: string | null;
  AGENCIA?: string | null;
  CONTA?: string | null;
  DV_CONTA?: string | null;
  NOME: string;
  ENDERECO?: string | null;
  NUMERO?: string | null;
  COMPLEMENTO?: string | null;
  BAIRRO?: string | null;
  CEP?: string | null;
  CEP_COMPLEMENTO?: string | null;
  CIDADE?: string | null;
  UF?: string | null;
  CREATED_AT?: string | null;
  UPDATED_AT?: string | null;
};

export type CnabFavorecidoPayload = Omit<
  CnabFavorecido,
  "ID_FAVORECIDO" | "CREATED_AT" | "UPDATED_AT"
>;

export type CnabFavorecidoLotePayload = CnabFavorecidoPayload & {
  LINHA?: number;
};

export type ImportarFavorecidosEmMassaResponse = {
  success: boolean;
  message: string;
  totalRecebidos: number;
  inseridos: number;
  atualizados: number;
  rejeitados: number;
  erros: Array<{
    linha: number;
    cpf?: string;
    nome?: string;
    erro: string;
  }>;
};

export type ListarFavorecidosParams = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type ListarFavorecidosResponse = {
  data: CnabFavorecido[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  resumo: {
    totalFavorecidos: number;
    totalBancos: number;
    totalCidades: number;
  };
};

export async function listarFavorecidos(
  params: ListarFavorecidosParams = {}
): Promise<ListarFavorecidosResponse> {
  const response = await api.get("/v1/cnab240/favorecidos", {
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
      totalFavorecidos: Number(response.data?.resumo?.totalFavorecidos || 0),
      totalBancos: Number(response.data?.resumo?.totalBancos || 0),
      totalCidades: Number(response.data?.resumo?.totalCidades || 0),
    },
  };
}

export async function criarFavorecido(
  payload: CnabFavorecidoPayload
): Promise<any> {
  const response = await api.post("/v1/cnab240/favorecidos", payload);

  return response.data;
}

export async function atualizarFavorecido(
  id: number,
  payload: CnabFavorecidoPayload
): Promise<any> {
  const response = await api.put(`/v1/cnab240/favorecidos/${id}`, payload);

  return response.data;
}

export async function importarFavorecidosEmMassa(
  favorecidos: CnabFavorecidoLotePayload[]
): Promise<ImportarFavorecidosEmMassaResponse> {
  const response = await api.post(
    "/v1/cnab240/favorecidos/importar-massa",
    { favorecidos }
  );

  return {
    success: Boolean(response.data?.success),
    message:
      response.data?.message || "Importação de favorecidos concluída.",
    totalRecebidos: Number(response.data?.totalRecebidos || 0),
    inseridos: Number(response.data?.inseridos || 0),
    atualizados: Number(response.data?.atualizados || 0),
    rejeitados: Number(response.data?.rejeitados || 0),
    erros: Array.isArray(response.data?.erros) ? response.data.erros : [],
  };
}

export async function excluirFavorecido(id: number): Promise<any> {
  const response = await api.delete(`/v1/cnab240/favorecidos/${id}`);

  return response.data;
}