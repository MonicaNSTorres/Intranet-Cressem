import axios from "axios";
import type {
  ChaveRelatorioFuncionario,
  RelatorioFuncionarioDataInfo,
  RelatorioFuncionarioItem,
} from "@/config/producao_meta_funcionario";
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
          "Erro no service de produção meta funcionário",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "PRODUCAO_META_FUNCIONARIO_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type AuthMeResponse = {
  username: string;
  nome_completo: string;
  department: string;
  physicalDeliveryOfficeName: string;
  grupos: string[];
};

export type AvisoMetaNaoRetornada = {
  nome: string;
  mensagem: string;
};

export type ProducaoMetaFuncionarioResponse = {
  rows: RelatorioFuncionarioItem[];
  avisos_meta_nao_retornada: AvisoMetaNaoRetornada[];
};

export async function buscarUsuarioLogadoMetaFuncionario() {
  const { data } = await api.get<AuthMeResponse>("/v1/me");
  return data;
}

export async function buscarProducaoMetaRelatorioFuncionario(params: {
  tema: ChaveRelatorioFuncionario;
  periodo: string;
}) {
  const { data } = await api.get<
    RelatorioFuncionarioItem[] | Partial<ProducaoMetaFuncionarioResponse>
  >(
    "/v1/producao-meta-funcionario",
    {
      params: {
        tema: params.tema,
        data: params.periodo,
      },
    }
  );

  if (Array.isArray(data)) {
    return {
      rows: data,
      avisos_meta_nao_retornada: [],
    };
  }

  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    avisos_meta_nao_retornada: Array.isArray(data?.avisos_meta_nao_retornada)
      ? data.avisos_meta_nao_retornada
      : [],
  };
}

export async function buscarUltimaAtualizacaoMetaFuncionario() {
  const { data } = await api.get<RelatorioFuncionarioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas"
  );
  return data;
}

export async function buscarDatasRelatorioMetaFuncionario() {
  const { data } = await api.get<RelatorioFuncionarioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas"
  );
  return data;
}
