/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export type AuthMeResponse = {
  nome?: string;
  username?: string;
  nome_completo?: string;
};

export type FuncionarioResponse = {
  ID_FUNCIONARIO?: number;
  NM_FUNCIONARIO?: string;
};

export type SolicitaoListaItem = {
  ID_SOLICITACAO_REEMBOLSO_DESPESA: number;
  NM_FUNCIONARIO: string;
  NR_CPF_FUNCIONARIO: string;
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
  page: number;
  limit: number;
}) {
  const { data } = await api.get("/v1/solicitacao_reembolso_despesa_paginado", {
    params,
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
  const { data } = await api.put(`/v1/solicitacao_reembolso_despesa_final/${id}`);
  return data;
}

export async function atualizarDiretoriaSolicitacaoReembolso(params: {
  idSolicitacao: number | string;
  nomeDiretoria: string;
  idDiretoria: number | string;
}) {
  const { data } = await api.put(
    `/v1/solicitacao_reembolso_despesa/solicitacao/${params.idSolicitacao}/nome_diretoria/${encodeURIComponent(
      params.nomeDiretoria
    )}/id_diretoria/${params.idDiretoria}`
  );
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