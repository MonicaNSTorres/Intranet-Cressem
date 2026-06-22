/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";
import { getHeadersPerfilTesteSubsidioAuditivo } from "@/lib/subsidio-auditivo-perfil-teste";

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
            "Erro no service de gerenciamento de subsídio auditivo",
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
          SOURCE: "GERENCIAMENTO_SUBSIDIO_AUDITIVO_AXIOS",
        });
      }
    } catch {
      // evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type SubsidioAuditivoListaItem = {
  ID_SUBSIDIO_AUDITIVO: number;
  ST_SOLICITACAO: string;
  DT_SOLICITACAO?: string;
  NM_ASSOCIADO: string;
  NM_USUARIO_ABERTURA?: string;
  LOGIN_USUARIO_ABERTURA?: string;
  NR_CPF_ASSOCIADO?: string;
  NR_MATRICULA_ASSOCIADO?: string;
  DS_FUNCAO_ASSOCIADO?: string;
  NM_ORGAO_ASSOCIADO?: string;
  NR_CELULAR?: string;
  VL_CUSTO_APARELHO?: number;
  VL_SUBSIDIO_APROVADO?: number;
  NM_PRESTADOR_SERVICO?: string;
  NM_RESP_DIRETORIA?: string;
  NM_RESP_FINANCEIRO?: string;
  DT_APROVACAO_DIRETORIA?: string;
  DS_MOTIVO_DEVOLUCAO?: string;
  PERMISSOES?: {
    isSolicitanteAtual?: boolean;
    isFinanceiro?: boolean;
    isDiretoria?: boolean;
    isSuporte?: boolean;
    podeEditarCadastro?: boolean;
  };
};

export async function buscarSolicitacoesSubsidioAuditivoPaginado(params: {
  pesquisa?: string;
  status?: string;
  cpfAssociado?: string;
  page: number;
  limit: number;
}) {
  const { data } = await api.get("/v1/solicitacao_subsidio_auditivo_paginado", {
    params,
    headers: getHeadersPerfilTesteSubsidioAuditivo(),
  });
  return data as {
    rows: SubsidioAuditivoListaItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function atualizarStatusSubsidioAuditivo(params: {
  id: number | string;
  acao: string;
  observacao?: string;
  nomeResponsavel?: string;
  loginResponsavel?: string;
}) {
  const { data } = await api.put(
    `/v1/solicitacao_subsidio_auditivo/${params.id}/status`,
    {
      acao: params.acao,
      observacao: params.observacao,
      nomeResponsavel: params.nomeResponsavel,
      loginResponsavel: params.loginResponsavel,
    },
    {
      headers: {
        ...getAuditoriaHeaders(),
        ...getHeadersPerfilTesteSubsidioAuditivo(),
      },
    }
  );

  return data;
}
