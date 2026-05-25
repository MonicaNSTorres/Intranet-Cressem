import axios from "axios";
import type {
  ChaveRelatorioPA,
  RelatorioDataInfo,
  RelatorioItem,
} from "@/config/producao_meta_cooperativa_pa";
import { registrarErroTela } from "./error_log.service";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
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
          "Erro no service de produção meta cooperativa PA",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "PRODUCAO_META_COOPERATIVA_PA_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export async function buscarProducaoMetaRelatorioPA(params: {
  tema: ChaveRelatorioPA;
  periodo: string;
}) {
  const { data } = await api.get<RelatorioItem[]>("/v1/producao-meta-cooperativa-pa", {
    params: {
      tema: params.tema,
      data: params.periodo,
    },
  });

  return data;
}

export async function buscarUltimaAtualizacaoMetaPA() {
  const { data } = await api.get<RelatorioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas"
  );
  return data;
}

export async function buscarDatasRelatorioMetaPA() {
  const { data } = await api.get<RelatorioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas"
  );
  return data;
}