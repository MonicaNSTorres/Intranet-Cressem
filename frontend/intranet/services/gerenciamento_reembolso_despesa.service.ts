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
      const url = error?.config?.url || "";

      const deveIgnorar = String(url).includes("/v1/me");

      if (!deveIgnorar) {
        await registrarErroTela({
          PAGE_URL:
            typeof window !== "undefined" ? window.location.href : null,

          ERROR_MESSAGE:
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.response?.data?.details ||
            error?.message ||
            "Erro no service de gerenciamento de reembolso de despesa",

          ERROR_STACK: error?.stack || null,

          ERROR_DETAIL: {
            status: error?.response?.status,
            url,
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

          SOURCE: "GERENCIAMENTO_REEMBOLSO_DESPESA_AXIOS",
        });
      }
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type AuthMeResponse = {
  nome?: string;
  username?: string;
  nome_completo?: string;
  grupos?: string[];
};

export type FuncionarioResponse = {
  ID_FUNCIONARIO?: number;
  NM_FUNCIONARIO?: string;
};

export type SolicitaoListaItem = {
  ID_SOLICITACAO_REEMBOLSO_DESPESA: number;
  NM_FUNCIONARIO: string;
  NR_CPF_FUNCIONARIO: string;
  DT_ABERTURA?: string;
  DT_IDA: string;
  DT_VOLTA: string;
  NM_CIDADE: string;
  DESC_ANDAMENTO: string;
  SN_FINALIZADO?: number;
  TIPO_USUARIO?: string;
  DESC_JTF_EVENTO?: string;
  DESC_PRC_FINANCEIRO?: string;
  NM_FNC_FINANCEIRO?: string;
  DESC_PRC_GERENCIA?: string;
  NM_FNC_GERENCIA?: string;
  DESC_PRC_GERENCIA_SUP?: string;
  NM_FNC_GERENCIA_SUP?: string;
  DESC_PRC_DIRETORIA?: string;
  NM_FNC_DIRETORIA?: string;
  ID_SOLICITANTE?: number;
  ID_APROV_GERENCIA?: number;
  ID_APROV_GERENCIA_SUP?: number;
  ID_APROV_DIRETORIA?: number;
  NR_BANCO?: string;
  CD_AGENCIA?: string;
  NR_CONTA?: string;
  DESPESAS?: any[];
  COMPROVANTES?: any[];
  HAS_GERENCIA?: number | boolean;
  HAS_GERENCIA_SUP?: number | boolean;
  APROV_GERENCIA_NOME?: string;
  APROV_GERENCIA_SUP_NOME?: string;
  APROV_DIRETORIA_NOME?: string;
};

export type SolicitacaoDetalheItem = SolicitaoListaItem & {
  despesas?: any[];
  tipo?: string;
};

export async function buscarUsuarioLogadoGerenciamentoReembolso() {
  const { data } = await api.get<AuthMeResponse>("/v1/me");
  return data;
}

export async function buscarFuncionarioPorNomeGerenciamento(nome: string) {
  const { data } = await api.get<FuncionarioResponse>(
    `/v1/funcionarios_sicoob_cressem/nome/${encodeURIComponent(nome)}`
  );
  return data;
}

export async function buscarSolicitacoesReembolsoPaginado(params: {
  nome: string;
  pesquisa: string;
  cpf?: string;
  cidade?: string;
  status?: string;
  verTodos?: boolean;
  page: number;
  limit: number;
}) {
  const { verTodos, ...rest } = params;
  const queryParams = {
    ...rest,
    ver_todos: verTodos ? "1" : "0",
  };

  const { data } = await api.get("/v1/solicitacao_reembolso_despesa_paginado", {
    params: queryParams,
  });
  return data;
}

export async function decidirSolicitacaoReembolso(params: {
  id: number | string;
  nomeResponsavel: string;
  acao: string;
  parecer: string;
}) {
  const { data } = await api.put(
    `/v1/solicitacao_reembolso_despesa/${params.id}/decisao/name/${encodeURIComponent(
      params.nomeResponsavel
    )}`,
    {
      acao: params.acao,
      parecer: params.parecer,
    }
  );
  return data;
}

export async function concluirSolicitacaoReembolso(id: number | string) {
  const { data } = await api.put(`/v1/solicitacao_reembolso_despesa/${id}/concluir`);
  return data;
}

export async function baixarComprovanteGerenciamentoReembolso(oficio: string) {
  const { data } = await api.post(
    "/v1/solicitacao_reembolso_despesa/download",
    { oficio },
    { responseType: "blob" }
  );
  return data;
}

