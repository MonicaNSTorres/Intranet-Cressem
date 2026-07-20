/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";
import { getHeadersPerfilTesteSubsidioAuditivo } from "@/lib/subsidio-auditivo-perfil-teste";

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

export type SubsidioAuditivoPaginadoResponse = {
  rows: SubsidioAuditivoListaItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function buscarSolicitacoesSubsidioAuditivoPaginado(params: {
  pesquisa?: string;
  status?: string;
  cpfAssociado?: string;
  page: number;
  limit: number;
}): Promise<SubsidioAuditivoPaginadoResponse> {
  const { data } = await api.get<SubsidioAuditivoPaginadoResponse>(
    "/v1/solicitacao_subsidio_auditivo_paginado",
    {
      params,
      headers: getHeadersPerfilTesteSubsidioAuditivo(),
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