import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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
          error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Erro no service de gerenciamento de setor",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          params: error?.config?.params,
          data: error?.config?.data,
          responseType: error?.config?.responseType,
          responseData:
            error?.config?.responseType === "blob"
              ? "Resposta blob não registrada"
              : error?.response?.data,
        },

        SOURCE: "GERENCIAMENTO_SETOR_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type SetorItem = {
  ID_SETOR: number;
  NM_SETOR: string;
  NM_ENDERECO: string;
  NR_RAMAL?: string;
  SN_ATIVO: number;
};

export type SetoresPaginadosResponse = {
  items: SetorItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export async function buscarSetoresPaginados(params: {
  nome?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<SetoresPaginadosResponse>(
    "/v1/setor_sicoob_cressem_paginado",
    {
      params,
    }
  );

  return response.data;
}

export async function buscarTodosSetores() {
  const response = await api.get<SetorItem[]>("/v1/setor_sicoob_cressem");
  return response.data;
}

export async function cadastrarSetor(payload: {
  NM_SETOR: string;
  NM_ENDERECO: string;
  NR_RAMAL?: string;
}) {
  const response = await api.post("/v1/setor_sicoob_cressem", payload);
  return response.data;
}

export async function editarSetor(payload: {
  id: number;
  NM_SETOR: string;
  NM_ENDERECO: string;
  NR_RAMAL?: string;
  SN_ATIVO: number;
}) {
  const response = await api.put(`/v1/setor_sicoob_cressem/${payload.id}`, {
    NM_SETOR: payload.NM_SETOR,
    NM_ENDERECO: payload.NM_ENDERECO,
    NR_RAMAL: payload.NR_RAMAL || "",
    SN_ATIVO: payload.SN_ATIVO,
  });

  return response.data;
}

export async function baixarRelatorioSetores() {
  const response = await api.get("/v1/download_setor", {
    responseType: "blob",
  });

  return response.data;
}