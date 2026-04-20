/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export type DespesaPayload = {
  TP_DESPESA: string;
  DESC_DESPESA: string;
  VALOR: number;
  COMPROVANTE: string | null;
  COMPROVANTE_NOME: string | null;
};

export type SolicitacaoReembolsoPayload = {
  ID_SOLICITACAO_REEMBOLSO_DESPESA?: string | number;
  NM_FUNCIONARIO: string;
  NR_CPF_FUNCIONARIO: string;
  DT_IDA: string;
  DT_VOLTA: string;
  DESC_JTF_EVENTO: string;
  NM_CIDADE: string;
  NR_BANCO: string;
  CD_AGENCIA: string;
  NR_CONTA: string;
  DESC_ANDAMENTO: string;
  DESPESAS: DespesaPayload[];
};

export type DespesaResponse = {
  ID_DESPESA_SOLICITADA?: string | number;
  TP_DESPESA: string;
  DESC_DESPESA: string;
  VALOR: number;
  COMPROVANTE?: string | null;
  COMPROVANTE_NOME?: string | null;
};

export type SolicitacaoReembolsoResponse = {
  ID_SOLICITACAO_REEMBOLSO_DESPESA?: string | number;
  NM_FUNCIONARIO: string;
  NR_CPF_FUNCIONARIO: string;
  DT_IDA: string;
  DT_VOLTA: string;
  DESC_JTF_EVENTO: string;
  NM_CIDADE: string;
  NR_BANCO: string;
  CD_AGENCIA: string;
  NR_CONTA: string;
  DESC_ANDAMENTO: string;
  DESPESAS: DespesaResponse[];
};

export type FuncionarioReembolso = {
  NM_FUNCIONARIO: string;
  NR_CPF: string;
  NR_CONTA_CORRENTE: string;
};

export type TipoDespesaItem = {
  NM_TIPO_DESPESA?: string;
  nome?: string;
};

export type CidadeItem = {
  NM_CIDADE?: string;
  nome?: string;
};

export type AuthMeResponse = {
  nome?: string;
  username?: string;
  nome_completo?: string;
};

export async function carregarCidadesReembolso() {
  const { data } = await api.get<CidadeItem[] | string[]>("/v1/cidades");

  return (data || [])
    .map((item: any) =>
      typeof item === "string" ? item : String(item?.NM_CIDADE || item?.nome || "").trim()
    )
    .filter(Boolean);
}

export async function carregarTiposDespesaReembolso() {
  const { data } = await api.get<TipoDespesaItem[]>("/v1/tipo_despesa");

  return (data || [])
    .map((item) => String(item.NM_TIPO_DESPESA || item.nome || "").trim())
    .filter(Boolean);
}

export async function buscarSolicitacaoReembolsoPorId(id: number | string) {
  const { data } = await api.get<SolicitacaoReembolsoResponse>(
    `/v1/solicitacao_reembolso_despesa/${id}`
  );
  return data;
}

export async function cadastrarSolicitacaoReembolso(
  payload: SolicitacaoReembolsoPayload
) {
  const { data } = await api.post("/v1/solicitacao_reembolso_despesa", payload);
  return data;
}

export async function editarSolicitacaoReembolso(
  payload: SolicitacaoReembolsoPayload
) {
  const { data } = await api.put("/v1/solicitacao_reembolso_despesa", payload);
  return data;
}

export async function buscarFuncionarioPorNome(nome: string) {
  const { data } = await api.get<FuncionarioReembolso>(
    `/v1/funcionarios_sicoob_cressem/nome/${encodeURIComponent(nome)}`
  );
  return data;
}

export async function buscarUsuarioLogadoReembolso() {
  const { data } = await api.get<AuthMeResponse>("/v1/me");
  return data;
}

export async function baixarComprovanteReembolso(oficio: string) {
  const { data } = await api.post(
    "/v1/solicitacao_reembolso_despesa/download",
    { oficio },
    { responseType: "blob" }
  );

  return data;
}

export async function enviarEmailInformativoFinanceiroReembolso(
  funcionario: string,
  idSolicitacao: string | number
) {
  const { data } = await api.get(
    `/v1/email_informativo_financeiro/funcionario/${encodeURIComponent(
      funcionario
    )}/solicitacao/${idSolicitacao}`
  );

  return data;
}