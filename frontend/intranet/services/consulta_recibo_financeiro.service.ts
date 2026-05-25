/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

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
          "Erro no service de consulta de recibo financeiro",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "CONSULTA_RECIBO_FINANCEIRO_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type ParcelaItem = {
  NR_CONTRATO: string;
  NM_CATEGORIA: string;
  SN_QUITACAO: number;
  DT_PERIODO: string;
  NR_PARCELA: string | number;
  VL_PARCELA_CRM: number;
};

export type PagamentoItem = {
  NM_FORMA_PAGAMENTO: string;
  VL_PAGAMENTO: number;
};

export type ReciboFinanceiroResumo = {
  ID_RECIBO_CRM: number;
  NR_CPF_CNPJ: string;
  NM_ASSOCIADO: string;
  NR_MATRICULA?: string;
  NM_EMPRESA?: string;
  DT_DIA: string;
  CIDADE: string;
  TP_ATENDIMENTO: string;
  OBSERVACAO?: string;
  NM_FUNCIONARIO?: string;
};

export type ReciboFinanceiroResponse = ReciboFinanceiroResumo & {
  PARCELAS: ParcelaItem[];
  PAGAMENTOS: PagamentoItem[];
};

export type ReciboFinanceiroPaginadoResponse = {
  items: ReciboFinanceiroResumo[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export async function listarRecibosFinanceiros(params: {
  page?: number;
  limit?: number;
  nome?: string;
  dia?: string;
}) {
  const { data } = await api.get<ReciboFinanceiroPaginadoResponse>(
    "/v1/recibo_crm_paginado",
    { params }
  );
  return data;
}

export async function buscarReciboFinanceiroPorId(id: number) {
  const { data } = await api.get<ReciboFinanceiroResponse>(`/v1/recibo_crm/${id}`);
  return data;
}

export async function excluirReciboFinanceiro(id: number) {
  const { data } = await api.delete(`/v1/recibo_crm/${id}`);
  return data;
}