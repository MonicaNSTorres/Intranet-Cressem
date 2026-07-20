/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";
import { getHeadersPerfilTesteSubsidioFuneral } from "@/lib/subsidio-funeral-perfil-teste";

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

export type SubsidioFuneralPaginadoResponse = {
  rows: SubsidioFuneralListaItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function buscarSolicitacoesSubsidioFuneralPaginado(params: {
  pesquisa?: string;
  status?: string;
  cpfSolicitante?: string;
  cpfAssociado?: string;
  page: number;
  limit: number;
}): Promise<SubsidioFuneralPaginadoResponse> {
  const { data } = await api.get<SubsidioFuneralPaginadoResponse>(
    "/v1/solicitacao_subsidio_funeral_paginado",
    {
      params,
      headers: getHeadersPerfilTesteSubsidioFuneral(),
    }
  );

  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    page: Number(data?.page || params.page),
    limit: Number(data?.limit || params.limit),
    total: Number(data?.total || 0),
    totalPages: Number(data?.totalPages || 0),
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
      headers: {
        ...getAuditoriaHeaders(),
        ...getHeadersPerfilTesteSubsidioFuneral(),
      },
    }
  );

  return data;
}