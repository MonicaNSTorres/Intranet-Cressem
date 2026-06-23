/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

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
            "Erro no service de cadastro de subsídio funeral",
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
          SOURCE: "CADASTRO_SUBSIDIO_FUNERAL_AXIOS",
        });
      }
    } catch {
      // evita loop infinito
    }

    return Promise.reject(error);
  }
);

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
  HISTORICO?: any[];
};

export async function cadastrarSubsidioFuneral(payload: SubsidioFuneralPayload) {
  const { data } = await api.post("/v1/solicitacao_subsidio_funeral", payload, {
    headers: getAuditoriaHeaders(),
  });
  return data;
}

export async function editarSubsidioFuneral(payload: SubsidioFuneralPayload) {
  const { data } = await api.put("/v1/solicitacao_subsidio_funeral", payload, {
    headers: getAuditoriaHeaders(),
  });
  return data;
}

export async function buscarSubsidioFuneralPorId(id: number | string) {
  const { data } = await api.get<SubsidioFuneralDetalhe>(
    `/v1/solicitacao_subsidio_funeral/${id}`
  );
  return data;
}

export async function baixarAnexoSubsidioFuneral(caminho: string) {
  const { data } = await api.post(
    "/v1/solicitacao_subsidio_funeral/download",
    { caminho },
    { responseType: "blob" }
  );
  return data;
}
