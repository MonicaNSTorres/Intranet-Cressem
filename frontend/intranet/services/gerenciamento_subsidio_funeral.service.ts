/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

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
      const url = error?.config?.url || "";
      const deveIgnorar = String(url).includes("/v1/me");

      if (!deveIgnorar) {
        await registrarErroTela({
          PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
          ERROR_MESSAGE:
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.response?.data?.details ||
            error?.message ||
            "Erro no service de gerenciamento de subsídio funeral",
          ERROR_STACK: error?.stack || null,
          ERROR_DETAIL: {
            status: error?.response?.status,
            url,
            baseURL: error?.config?.baseURL,
            method: error?.config?.method,
            params: error?.config?.params,
            data: error?.config?.data,
            responseData: error?.response?.data,
          },
          SOURCE: "GERENCIAMENTO_SUBSIDIO_FUNERAL_AXIOS",
        });
      }
    } catch {
      // evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type SubsidioFuneralListaItem = {
  ID_SUBSIDIO_FUNERAL: number;
  ST_SOLICITACAO: string;
  DT_SOLICITACAO?: string;
  DT_OBITO?: string;
  NM_SOLICITANTE: string;
  LOGIN_USUARIO_ABERTURA?: string;
  NR_CPF_SOLICITANTE?: string;
  TP_PARENTESCO?: string;
  NM_ASSOCIADO: string;
  NR_CPF_ASSOCIADO?: string;
  NM_LOCAL_TRABALHO?: string;
  DS_CARGO_ASSOCIADO?: string;
  VL_CUSTO_SERVICO?: number;
  VL_SUBSIDIO_APROVADO?: number;
  NM_PRESTADOR_SERVICO?: string;
  NM_TITULAR_CONTA?: string;
  NM_RESP_DIRETORIA?: string;
  NM_RESP_FINANCEIRO?: string;
  DT_APROVACAO_DIRETORIA?: string;
  DS_MOTIVO_DEVOLUCAO?: string;
};

export async function buscarSolicitacoesSubsidioFuneralPaginado(params: {
  pesquisa?: string;
  status?: string;
  cpfSolicitante?: string;
  cpfAssociado?: string;
  page: number;
  limit: number;
}) {
  const { data } = await api.get("/v1/solicitacao_subsidio_funeral_paginado", {
    params,
  });
  return data as {
    rows: SubsidioFuneralListaItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function atualizarStatusSubsidioFuneral(params: {
  id: number | string;
  acao: string;
  observacao?: string;
  nomeResponsavel?: string;
  loginResponsavel?: string;
}) {
  const { data } = await api.put(
    `/v1/solicitacao_subsidio_funeral/${params.id}/status`,
    {
      acao: params.acao,
      observacao: params.observacao,
      nomeResponsavel: params.nomeResponsavel,
      loginResponsavel: params.loginResponsavel,
    },
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}
