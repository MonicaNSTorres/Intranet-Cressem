/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type CidadeResponse =
  | {
      ID_CIDADES?: number;
      ID_UF?: number;
      NM_CIDADE?: string;
      nome?: string;
    }
  | string;

export async function listarCidades(): Promise<CidadeResponse[]> {
  const { data } = await api.get<CidadeResponse[]>(
    "/v1/cidades"
  );

  return Array.isArray(data) ? data : [];
}

export async function cadastrarSolicitacaoParticipacao(
  formData: FormData
): Promise<any> {
  const { data } = await api.post(
    "/v1/patrocinio_cressem",
    formData,
    {
      headers: getAuditoriaHeaders(),
      timeout: 60000,
    }
  );

  return data;
}

export async function dispararEmailGerencia(opts: {
  funcionario: string;
  empresa: string;
  patrocinioId: string | number;
}): Promise<boolean> {
  const {
    funcionario,
    empresa,
    patrocinioId,
  } = opts;

  await api.get(
    `/v1/email_informativo_gerencia/funcionario/${encodeURIComponent(
      funcionario
    )}/empresa/${encodeURIComponent(
      empresa
    )}/patrocinio/${encodeURIComponent(
      String(patrocinioId)
    )}`
  );

  return true;
}