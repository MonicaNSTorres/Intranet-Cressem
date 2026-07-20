import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type SubsidioFuneralAnexoPayload = {
  TP_ANEXO: string;
  NM_ARQUIVO_ORIGINAL: string;
  NR_TAMANHO_BYTES?: number;
  DS_MIME_TYPE?: string | null;
  DS_CAMINHO_ARQUIVO?: string | null;
  ARQUIVO?: string | null;
};

export type SubsidioFuneralPayload = {
  ID_SUBSIDIO_FUNERAL?: number | string;
  ST_SOLICITACAO?: string;
  DT_SOLICITACAO?: string;
  NM_USUARIO_ABERTURA?: string;
  LOGIN_USUARIO_ABERTURA?: string;
  NM_SOLICITANTE: string;
  NR_CPF_SOLICITANTE: string;
  TP_PARENTESCO: string;
  DS_PARENTESCO_OUTRO?: string;
  DS_PROFISSAO_SOLICITANTE?: string;
  ID_ASSOCIADO?: number | string | null;
  NR_CPF_ASSOCIADO: string;
  NM_ASSOCIADO: string;
  NR_MATRICULA_ASSOCIADO?: string;
  NM_LOCAL_TRABALHO?: string;
  DS_CARGO_ASSOCIADO?: string;
  DT_ASSOCIACAO?: string;
  DT_OBITO: string;
  VL_CUSTO_SERVICO: number;
  VL_SUBSIDIO_APROVADO: number;
  NM_PRESTADOR_SERVICO?: string;
  NR_CPF_CNPJ_PRESTADOR?: string;
  NM_TITULAR_CONTA: string;
  NR_CPF_TITULAR_CONTA?: string;
  CD_BANCO?: string;
  NM_BANCO?: string;
  CD_AGENCIA?: string;
  NR_CONTA?: string;
  TP_CONTA?: string;
  CHAVE_PIX?: string;
  DS_OBSERVACAO?: string;
  DS_MOTIVO_DEVOLUCAO?: string;
  ANEXOS: SubsidioFuneralAnexoPayload[];
};

export type SubsidioFuneralHistoricoItem = Record<string, unknown>;

export type SubsidioFuneralDetalhe = SubsidioFuneralPayload & {
  ID_SUBSIDIO_FUNERAL: number;
  DT_CRIACAO?: string;
  DT_ATUALIZACAO?: string;
  DT_ENVIO_DIRETORIA?: string;
  DT_APROVACAO_DIRETORIA?: string;
  DT_ENVIO_FINANCEIRO?: string;
  DT_FINALIZACAO?: string;
  NM_RESP_DIRETORIA?: string;
  NM_RESP_FINANCEIRO?: string;
  HISTORICO?: SubsidioFuneralHistoricoItem[];
};

export type SalvarSubsidioFuneralResponse = {
  id?: number;
  status?: string;
  motivoDevolucao?: string | null;
  message?: string;
  data?: SubsidioFuneralDetalhe;
};

function validarIdSubsidioFuneral(id: number | string) {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error("ID do subsídio funeral não informado.");
  }
}

export async function cadastrarSubsidioFuneral(
  payload: SubsidioFuneralPayload
): Promise<SalvarSubsidioFuneralResponse> {
  const response = await api.post<SalvarSubsidioFuneralResponse>(
    "/v1/solicitacao_subsidio_funeral",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function editarSubsidioFuneral(
  payload: SubsidioFuneralPayload
): Promise<SalvarSubsidioFuneralResponse> {
  if (
    payload.ID_SUBSIDIO_FUNERAL === undefined ||
    payload.ID_SUBSIDIO_FUNERAL === null ||
    String(payload.ID_SUBSIDIO_FUNERAL).trim() === ""
  ) {
    throw new Error(
      "ID do subsídio funeral não informado para edição."
    );
  }

  const response = await api.put<SalvarSubsidioFuneralResponse>(
    "/v1/solicitacao_subsidio_funeral",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function buscarSubsidioFuneralPorId(
  id: number | string
): Promise<SubsidioFuneralDetalhe> {
  validarIdSubsidioFuneral(id);

  const response = await api.get<SubsidioFuneralDetalhe>(
    `/v1/solicitacao_subsidio_funeral/${encodeURIComponent(
      String(id)
    )}`
  );

  return response.data;
}

export async function baixarAnexoSubsidioFuneral(
  caminho: string
): Promise<Blob> {
  const caminhoLimpo = String(caminho || "").trim();

  if (!caminhoLimpo) {
    throw new Error("Caminho do anexo não informado.");
  }

  const response = await api.post<Blob>(
    "/v1/solicitacao_subsidio_funeral/download",
    {
      caminho: caminhoLimpo,
    },
    {
      responseType: "blob",
    }
  );

  return response.data;
}