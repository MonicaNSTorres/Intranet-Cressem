/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";
import { api } from "./api.service";

export type StatusTermoMensalCaixa =
  | "RASCUNHO"
  | "PREENCHIDO"
  | "PDF_GERADO"
  | "ASSINADO_ANEXADO"
  | "CONCLUIDO";

export type PAOption = {
  ID_PA_ATUALIZADA: number;
  NR_PA: number;
  NM_PA: string;
  NM_FANTASIA: string;
};

export type TermoMensalCaixa = {
  ID_TERMOS_MENSAIS_CAIXA: number;
  DT_COMPETENCIA: string;
  NM_PA: string;
  DS_DADOS_FORMULARIO?: any;
  SN_STATUS: StatusTermoMensalCaixa;
  NM_ARQUIVO_GERADO?: string;
  NM_CAMINHO_ARQUIVO_GERADO?: string;
  NM_ARQUIVO_ASSINADO?: string;
  NM_CAMINHO_ARQUIVO_ASSINADO?: string;
  DT_UPLOAD_ASSINADO?: string;
  NM_USUARIO_CRIACAO?: string;
  DT_CRIACAO?: string;
  NM_USUARIO_ATUALIZACAO?: string;
  DT_ATUALIZACAO?: string;
};

export type SalvarTermoMensalCaixaPayload = {
  competencia: string;
  pa: string;
  dadosFormulario: any;
  status?: StatusTermoMensalCaixa;
  usuarioCriacao?: string;
  usuarioAtualizacao?: string;
};

export type ListarPAsTermoMensalCaixaResponse = {
  success: boolean;
  data: PAOption[];
};

export type ListarTermosMensaisCaixaResponse = {
  success: boolean;
  data: TermoMensalCaixa[];
};

export type ObterTermoMensalCaixaResponse = {
  success: boolean;
  data: TermoMensalCaixa;
};

function obterMensagemErro(
  error: any,
  mensagemPadrao: string
): string {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.details ||
    error?.message ||
    mensagemPadrao
  );
}

function tratarErroDuplicidade(
  error: any,
  mensagemPadrao: string
): never {
  const detalhes =
    error?.response?.data?.details ||
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "";

  if (String(detalhes).includes("ORA-00001")) {
    throw new Error(
      "Já existe um termo mensal cadastrado para essa competência e PA."
    );
  }

  throw new Error(
    obterMensagemErro(error, mensagemPadrao)
  );
}

export async function listarPAsTermoMensalCaixa(): Promise<ListarPAsTermoMensalCaixaResponse> {
  const { data } =
    await api.get<ListarPAsTermoMensalCaixaResponse>(
      "/v1/termos-mensais-caixa/pas"
    );

  return {
    success: Boolean(data?.success),
    data: Array.isArray(data?.data) ? data.data : [],
  };
}

export async function listarTermosMensaisCaixa(params?: {
  competencia?: string;
  pa?: string;
  status?: string;
}): Promise<ListarTermosMensaisCaixaResponse> {
  const { data } =
    await api.get<ListarTermosMensaisCaixaResponse>(
      "/v1/termos-mensais-caixa",
      {
        params: {
          competencia: params?.competencia || undefined,
          pa: params?.pa || undefined,
          status: params?.status || undefined,
        },
      }
    );

  return {
    success: Boolean(data?.success),
    data: Array.isArray(data?.data) ? data.data : [],
  };
}

export async function obterTermoMensalCaixaPorId(
  id: number
): Promise<ObterTermoMensalCaixaResponse> {
  const { data } =
    await api.get<ObterTermoMensalCaixaResponse>(
      `/v1/termos-mensais-caixa/${id}`
    );

  return data;
}

export async function criarTermoMensalCaixa(
  payload: SalvarTermoMensalCaixaPayload
) {
  try {
    const { data } = await api.post(
      "/v1/termos-mensais-caixa",
      payload,
      {
        headers: getAuditoriaHeaders(),
      }
    );

    return data;
  } catch (error: any) {
    tratarErroDuplicidade(
      error,
      "Erro ao criar termo mensal caixa."
    );
  }
}

export async function atualizarTermoMensalCaixa(
  id: number,
  payload: SalvarTermoMensalCaixaPayload
) {
  try {
    const { data } = await api.put(
      `/v1/termos-mensais-caixa/${id}`,
      payload,
      {
        headers: getAuditoriaHeaders(),
      }
    );

    return data;
  } catch (error: any) {
    tratarErroDuplicidade(
      error,
      "Erro ao atualizar termo mensal caixa."
    );
  }
}

export async function alterarStatusTermoMensalCaixa(data: {
  id: number;
  status: StatusTermoMensalCaixa;
  usuarioAtualizacao?: string;
}) {
  const response = await api.patch(
    `/v1/termos-mensais-caixa/${data.id}/status`,
    {
      status: data.status,
      usuarioAtualizacao:
        data.usuarioAtualizacao || "INTRANET",
    },
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function uploadTermoMensalCaixaAssinado(data: {
  id: number;
  arquivo: File;
  usuarioAtualizacao?: string;
}) {
  const formData = new FormData();

  formData.append("arquivo", data.arquivo);
  formData.append(
    "usuarioAtualizacao",
    data.usuarioAtualizacao || "INTRANET"
  );

  const response = await api.post(
    `/v1/termos-mensais-caixa/${data.id}/assinado`,
    formData,
    {
      headers: getAuditoriaHeaders(),
      timeout: 60000,
    }
  );

  return response.data;
}

export function getDownloadTermoMensalCaixaAssinadoUrl(
  id: number
): string {
  const baseURL = String(
    api.defaults.baseURL || ""
  ).replace(/\/$/, "");

  return `${baseURL}/v1/termos-mensais-caixa/${id}/assinado/download`;
}

export async function excluirTermoMensalCaixa(
  id: number
) {
  const { data } = await api.delete(
    `/v1/termos-mensais-caixa/${id}`,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}