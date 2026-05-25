import axios from "axios";
import { registrarErroTela } from "./error_log.service";

export type ChequeEspecialItem = {
  ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL: number;
  NR_CONTA_CORRENTE: number | string;
  NR_CPF_CNPJ: string;
  NM_ASSOCIADO: string;
  VL_PERC_TAXA_ADICIONAL_LIM_CRED: number;
  VL_LIMITE: number;
  NM_ALTERACAO: string;
  SN_FEITO?: string | number | null;
  NM_ATENDENTE?: string | null;
  DT_ALTERACAO?: string | null;
};

export type PaginatedChequeEspecialResponse = {
  items: ChequeEspecialItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export type BuscarChequeEspecialParams = {
  nome: string;
  page?: number;
  limit?: number;
};

export type UsuarioLogadoChequeEspecial = {
  username?: string;
  nome_completo?: string;
  department?: string;
  grupos?: string[];
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      const url = error?.config?.url || "";

      const deveIgnorar = String(url).includes("/v1/me");

      if (!deveIgnorar) {
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
            "Erro no service de cheque especial",

          ERROR_STACK: error?.stack || null,

          ERROR_DETAIL: {
            status: error?.response?.status,
            url,
            baseURL: error?.config?.baseURL,
            method: error?.config?.method,
            responseType: error?.config?.responseType,
            responseData:
              error?.config?.responseType === "blob"
                ? "Resposta blob não registrada"
                : error?.response?.data,
          },

          SOURCE: "CHEQUE_ESPECIAL_AXIOS",
        });
      }
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export async function buscarChequeEspecialPaginado(
  params: BuscarChequeEspecialParams
): Promise<PaginatedChequeEspecialResponse> {
  const response = await api.get("/v1/atualizacao_cheque_especial/paginado", {
    params,
  });

  return response.data;
}

export async function buscarChequeEspecialTotais(): Promise<
  ChequeEspecialItem[]
> {
  const response = await api.get("/v1/atualizacao_cheque_especial");
  return response.data;
}

export async function atualizarChequeEspecial(
  id: number,
  atendente: string,
  data: string
) {
  const response = await api.put(
    `/v1/atualizacao_cheque_especial/${id}/${encodeURIComponent(atendente)}/${data}`
  );

  return response.data;
}

export async function baixarRelatorioChequeEspecial(): Promise<Blob> {
  const response = await api.get("/v1/download_alteracao_cheque_especial", {
    responseType: "blob",
  });

  return response.data;
}

export async function buscarUsuarioLogadoChequeEspecial(): Promise<UsuarioLogadoChequeEspecial> {
  const response = await api.get("/v1/me");
  return response.data;
}