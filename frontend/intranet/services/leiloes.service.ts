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
        SOURCE: "leiloes.service.ts",
      });
    } catch (e) {
      console.error("Erro ao registrar log:", e);
    }

    return Promise.reject(error);
  }
);

export type Leilao = {
  ID_LEILAO: number;
  NM_PRODUTO: string;
  DS_PRODUTO?: string | null;
  NR_SERIE_EQUIPAMENTO?: string | null;
  VL_INICIAL: number;
  VL_INCREMENTO_MINIMO: number;
  DT_INICIO: string;
  DT_FIM: string;
  ST_STATUS: string;
  DS_REGRAS?: string | null;
  IMAGEM_BASE64?: string | null;
  NM_USUARIO_CRIACAO?: string | null;
  DT_CRIACAO?: string | null;
  DT_ATUALIZACAO?: string | null;
  VL_LANCE_ATUAL?: number | null;
  NM_USUARIO_GANHANDO?: string | null;
  SN_EXIBIR_HISTORICO?: string | null;
};

export type LeilaoPayload = {
  NM_PRODUTO: string;
  DS_PRODUTO?: string | null;
  NR_SERIE_EQUIPAMENTO?: string | null;
  VL_INICIAL: number | string;
  VL_INCREMENTO_MINIMO: number | string;
  DT_INICIO: string;
  DT_FIM: string;
  ST_STATUS: string;
  DS_REGRAS?: string | null;
  IMAGEM_BASE64?: string | null;
  NM_USUARIO_CRIACAO?: string | null;
  SN_EXIBIR_HISTORICO?: string;
};

export type Lance = {
  ID_LANCE: number;
  ID_LEILAO: number;
  VL_LANCE: number;
  NM_USUARIO: string;
  DS_LOGIN?: string | null;
  DS_EMAIL?: string | null;
  NR_IP?: string | null;
  DT_LANCE: string;
};

export type ListarLeiloesParams = {
  busca?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type ListarLeiloesResponse = {
  data: Leilao[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  resumo: {
    totalLeiloes: number;
    totalEmAndamento: number;
    totalAgendados: number;
    totalFinalizados: number;
  };
};

export type VencedorLeilao = {
  ID_LEILAO: number;
  NM_PRODUTO: string;
  ST_STATUS: string;
  DT_FIM: string;
  possuiVencedor: boolean;
  vencedor: {
    ID_LANCE: number;
    NM_USUARIO: string;
    DS_LOGIN?: string | null;
    DS_EMAIL?: string | null;
    VL_LANCE: number;
    DT_LANCE: string;
  } | null;
  message: string;
};

export type LeilaoFinalizado = {
  ID_LEILAO: number;
  NM_PRODUTO: string;
  DS_PRODUTO?: string | null;
  NR_SERIE_EQUIPAMENTO?: string | null;
  VL_INICIAL: number;
  VL_INCREMENTO_MINIMO: number;
  DT_INICIO: string;
  DT_FIM: string;
  ST_STATUS: string;
  DT_ATUALIZACAO?: string | null;
  ID_LANCE?: number | null;
  VL_LANCE_VENCEDOR?: number | null;
  NM_USUARIO_VENCEDOR?: string | null;
  DS_LOGIN_VENCEDOR?: string | null;
  DS_EMAIL_VENCEDOR?: string | null;
  DT_LANCE_VENCEDOR?: string | null;
  TOTAL_LANCES: number;
};

export async function listarLeiloesFinalizados(params: {
  busca?: string;
  page?: number;
  limit?: number;
} = {}) {
  const response = await api.get("/v1/leiloes-finalizados", {
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
  };
}

export async function buscarVencedorLeilao(
  id: number
): Promise<VencedorLeilao> {
  const response = await api.get(`/v1/leiloes/${id}/vencedor`);
  return response.data;
}

export async function listarLeiloes(
  params: ListarLeiloesParams = {}
): Promise<ListarLeiloesResponse> {
  const response = await api.get("/v1/leiloes", {
    params: {
      busca: params.busca || "",
      status: params.status || "",
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
      totalLeiloes: Number(response.data?.resumo?.totalLeiloes || 0),
      totalEmAndamento: Number(response.data?.resumo?.totalEmAndamento || 0),
      totalAgendados: Number(response.data?.resumo?.totalAgendados || 0),
      totalFinalizados: Number(response.data?.resumo?.totalFinalizados || 0),
    },
  };
}

export async function buscarLeilaoPorId(id: number): Promise<Leilao> {
  const response = await api.get(`/v1/leiloes/${id}`);
  return response.data;
}

export async function criarLeilao(payload: LeilaoPayload): Promise<any> {
  const response = await api.post("/v1/leiloes", payload);
  return response.data;
}

export async function atualizarLeilao(
  id: number,
  payload: LeilaoPayload
): Promise<any> {
  const response = await api.put(`/v1/leiloes/${id}`, payload);
  return response.data;
}

export async function excluirLeilao(id: number): Promise<any> {
  const response = await api.delete(`/v1/leiloes/${id}`);
  return response.data;
}

export async function listarLances(idLeilao: number): Promise<Lance[]> {
  const response = await api.get(`/v1/leiloes/${idLeilao}/lances`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function darLance(
  idLeilao: number,
  payload: {
    VL_LANCE: number | string;
    NM_USUARIO: string;
    DS_LOGIN?: string | null;
    DS_EMAIL?: string | null;
  }
): Promise<any> {
  const response = await api.post(`/v1/leiloes/${idLeilao}/lances`, payload);
  return response.data;
}

export async function buscarDashboardLeiloes() {
  const response = await api.get("/v1/leiloes-dashboard");

  return response.data;
}