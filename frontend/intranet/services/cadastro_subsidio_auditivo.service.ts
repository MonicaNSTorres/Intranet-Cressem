import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";
import { getHeadersPerfilTesteSubsidioAuditivo } from "@/lib/subsidio-auditivo-perfil-teste";

export type SubsidioAuditivoAnexoPayload = {
  TP_ANEXO: string;
  NM_ARQUIVO_ORIGINAL: string;
  NR_TAMANHO_BYTES?: number;
  DS_MIME_TYPE?: string | null;
  DS_CAMINHO_ARQUIVO?: string | null;
  ARQUIVO?: string | null;
};

export type SubsidioAuditivoPayload = {
  ID_SUBSIDIO_AUDITIVO?: number | string;
  ST_SOLICITACAO?: string;
  DT_SOLICITACAO?: string;
  NM_USUARIO_ABERTURA?: string;
  LOGIN_USUARIO_ABERTURA?: string;
  ID_ASSOCIADO?: number | string | null;
  NR_CPF_ASSOCIADO: string;
  NM_ASSOCIADO: string;
  NR_MATRICULA_ASSOCIADO?: string;
  DS_FUNCAO_ASSOCIADO?: string;
  NM_ORGAO_ASSOCIADO?: string;
  DT_ASSOCIACAO?: string;
  NR_CELULAR?: string;
  NR_TELEFONE_RESIDENCIAL?: string;
  VL_NIVEL_INTEGRALIZACAO?: number;
  VL_CAPITAL?: number;
  DS_ORCAMENTOS?: string;
  VL_CUSTO_APARELHO: number;
  VL_SUBSIDIO_APROVADO: number;
  NM_PRESTADOR_SERVICO?: string;
  NR_CPF_CNPJ_PRESTADOR?: string;
  DS_INFORMACOES_ADICIONAIS?: string;
  DT_LIMITE_NOTA_FISCAL?: string;
  CD_BANCO?: string;
  NM_BANCO?: string;
  CD_AGENCIA?: string;
  NR_CONTA?: string;
  TP_CONTA?: string;
  DS_MOTIVO_DEVOLUCAO?: string;
  ANEXOS: SubsidioAuditivoAnexoPayload[];
};

export type SubsidioAuditivoHistoricoItem = Record<
  string,
  unknown
>;

export type SubsidioAuditivoPermissoes = {
  isSolicitanteAtual?: boolean;
  isFinanceiro?: boolean;
  isDiretoria?: boolean;
  isSuporte?: boolean;
  podeEditarCadastro?: boolean;
};

export type SubsidioAuditivoDetalhe =
  SubsidioAuditivoPayload & {
    ID_SUBSIDIO_AUDITIVO: number;
    DT_CRIACAO?: string;
    DT_ATUALIZACAO?: string;
    DT_ENVIO_DIRETORIA?: string;
    DT_APROVACAO_DIRETORIA?: string;
    DT_ENVIO_FINANCEIRO?: string;
    DT_FINALIZACAO?: string;
    NM_RESP_DIRETORIA?: string;
    NM_RESP_FINANCEIRO?: string;
    HISTORICO?: SubsidioAuditivoHistoricoItem[];
    PERMISSOES?: SubsidioAuditivoPermissoes;
  };

export type SalvarSubsidioAuditivoResponse = {
  id?: number;
  status?: string;
  motivoDevolucao?: string | null;
  message?: string;
  data?: SubsidioAuditivoDetalhe;
};

export type SalvarAnexoFluxoSubsidioAuditivoParams = {
  id: number | string;
  tipo: string;
  nomeArquivo: string;
  tamanhoBytes?: number;
  mimeType?: string | null;
  arquivo: string;
};

function validarIdSubsidio(id: number | string) {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error("ID do subsídio auditivo não informado.");
  }
}

export async function cadastrarSubsidioAuditivo(
  payload: SubsidioAuditivoPayload
): Promise<SalvarSubsidioAuditivoResponse> {
  const response = await api.post<SalvarSubsidioAuditivoResponse>(
    "/v1/solicitacao_subsidio_auditivo",
    payload,
    {
      headers: {
        ...getAuditoriaHeaders(),
        ...getHeadersPerfilTesteSubsidioAuditivo(),
      },
    }
  );

  return response.data;
}

export async function editarSubsidioAuditivo(
  payload: SubsidioAuditivoPayload
): Promise<SalvarSubsidioAuditivoResponse> {
  if (!payload.ID_SUBSIDIO_AUDITIVO) {
    throw new Error(
      "ID do subsídio auditivo não informado para edição."
    );
  }

  const response = await api.put<SalvarSubsidioAuditivoResponse>(
    "/v1/solicitacao_subsidio_auditivo",
    payload,
    {
      headers: {
        ...getAuditoriaHeaders(),
        ...getHeadersPerfilTesteSubsidioAuditivo(),
      },
    }
  );

  return response.data;
}

export async function salvarAnexoFluxoSubsidioAuditivo(
  params: SalvarAnexoFluxoSubsidioAuditivoParams
): Promise<SubsidioAuditivoDetalhe> {
  validarIdSubsidio(params.id);

  const tipo = String(params.tipo || "").trim();
  const nomeArquivo = String(
    params.nomeArquivo || ""
  ).trim();
  const arquivo = String(params.arquivo || "").trim();

  if (!tipo) {
    throw new Error("Tipo do anexo não informado.");
  }

  if (!nomeArquivo) {
    throw new Error("Nome do arquivo não informado.");
  }

  if (!arquivo) {
    throw new Error("Conteúdo do arquivo não informado.");
  }

  const response = await api.put<SubsidioAuditivoDetalhe>(
    `/v1/solicitacao_subsidio_auditivo/${encodeURIComponent(
      String(params.id)
    )}/anexo-fluxo`,
    {
      TP_ANEXO: tipo,
      NM_ARQUIVO_ORIGINAL: nomeArquivo,
      NR_TAMANHO_BYTES: params.tamanhoBytes,
      DS_MIME_TYPE: params.mimeType,
      ARQUIVO: arquivo,
    },
    {
      headers: {
        ...getAuditoriaHeaders(),
        ...getHeadersPerfilTesteSubsidioAuditivo(),
      },
    }
  );

  return response.data;
}

export async function buscarSubsidioAuditivoPorId(
  id: number | string
): Promise<SubsidioAuditivoDetalhe> {
  validarIdSubsidio(id);

  const response = await api.get<SubsidioAuditivoDetalhe>(
    `/v1/solicitacao_subsidio_auditivo/${encodeURIComponent(
      String(id)
    )}`,
    {
      headers: getHeadersPerfilTesteSubsidioAuditivo(),
    }
  );

  return response.data;
}

export async function baixarAnexoSubsidioAuditivo(
  caminho: string
): Promise<Blob> {
  const caminhoLimpo = String(caminho || "").trim();

  if (!caminhoLimpo) {
    throw new Error("Caminho do anexo não informado.");
  }

  const response = await api.post<Blob>(
    "/v1/solicitacao_subsidio_auditivo/download",
    {
      caminho: caminhoLimpo,
    },
    {
      responseType: "blob",
      headers: getHeadersPerfilTesteSubsidioAuditivo(),
    }
  );

  return response.data;
}
