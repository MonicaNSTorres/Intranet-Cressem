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
            "Erro no service de cadastro de subsídio auditivo",
          ERROR_STACK: error?.stack || null,
          ERROR_DETAIL: {
            status: error?.response?.status,
            url,
            baseURL: error?.config?.baseURL,
            method: error?.config?.method,
            responseType: error?.config?.responseType,
            responseData:
              error?.config?.responseType === "blob"
                ? "Resposta em blob não registrada"
                : error?.response?.data,
          },
          SOURCE: "CADASTRO_SUBSIDIO_AUDITIVO_AXIOS",
        });
      }
    } catch {
      // evita loop infinito
    }

    return Promise.reject(error);
  }
);

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

export type SubsidioAuditivoDetalhe = SubsidioAuditivoPayload & {
  ID_SUBSIDIO_AUDITIVO: number;
  DT_CRIACAO?: string;
  DT_ATUALIZACAO?: string;
  DT_ENVIO_DIRETORIA?: string;
  DT_APROVACAO_DIRETORIA?: string;
  DT_ENVIO_FINANCEIRO?: string;
  DT_FINALIZACAO?: string;
  NM_RESP_DIRETORIA?: string;
  NM_RESP_FINANCEIRO?: string;
  HISTORICO?: any[];
  PERMISSOES?: {
    isSolicitanteAtual?: boolean;
    isFinanceiro?: boolean;
    isDiretoria?: boolean;
    isSuporte?: boolean;
    podeEditarCadastro?: boolean;
  };
};

export async function cadastrarSubsidioAuditivo(payload: SubsidioAuditivoPayload) {
  const { data } = await api.post("/v1/solicitacao_subsidio_auditivo", payload, {
    headers: getAuditoriaHeaders(),
  });
  return data;
}

export async function editarSubsidioAuditivo(payload: SubsidioAuditivoPayload) {
  const { data } = await api.put("/v1/solicitacao_subsidio_auditivo", payload, {
    headers: {
      ...getAuditoriaHeaders(),
      ...getHeadersPerfilTesteSubsidioAuditivo(),
    },
  });
  return data;
}

export async function salvarAnexoFluxoSubsidioAuditivo(params: {
  id: number | string;
  tipo: string;
  nomeArquivo: string;
  tamanhoBytes?: number;
  mimeType?: string | null;
  arquivo: string;
}) {
  const { data } = await api.put(
    `/v1/solicitacao_subsidio_auditivo/${params.id}/anexo-fluxo`,
    {
      TP_ANEXO: params.tipo,
      NM_ARQUIVO_ORIGINAL: params.nomeArquivo,
      NR_TAMANHO_BYTES: params.tamanhoBytes,
      DS_MIME_TYPE: params.mimeType,
      ARQUIVO: params.arquivo,
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

export async function buscarSubsidioAuditivoPorId(id: number | string) {
  const { data } = await api.get<SubsidioAuditivoDetalhe>(
    `/v1/solicitacao_subsidio_auditivo/${id}`,
    {
      headers: getHeadersPerfilTesteSubsidioAuditivo(),
    }
  );
  return data;
}

export async function baixarAnexoSubsidioAuditivo(caminho: string) {
  const { data } = await api.post(
    "/v1/solicitacao_subsidio_auditivo/download",
    { caminho },
    { responseType: "blob" }
  );
  return data;
}
