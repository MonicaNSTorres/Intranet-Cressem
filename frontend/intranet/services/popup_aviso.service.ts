/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type PopupAviso = {
  ID_POPUP: number;
  TITULO: string;
  MENSAGEM: string;
  BOTAO_ACEITAR: string;
  BOTAO_RECUSAR: string;
  OBRIGATORIO: "S" | "N";
  ST_ATIVO?: "S" | "N";
  EXIBIR_APOS_LOGIN?: "S" | "N";
  DT_INICIO?: string | null;
  DT_FIM?: string | null;
  IMAGEM_BASE64?: string | null;
  DS_LINK?: string | null;
};

export type PopupPendenteResponse = {
  temPopupPendente: boolean;
  popup: PopupAviso | null;
};

export async function buscarPopupPendenteMe(): Promise<PopupPendenteResponse> {
  const { data } = await api.get<PopupPendenteResponse>(
    "/v1/popup-aviso/pendente/me"
  );

  return {
    temPopupPendente: Boolean(data?.temPopupPendente),
    popup: data?.popup || null,
  };
}

export async function responderPopupAviso(payload: {
  idPopup: number;
  resposta: "ACEITO" | "RECUSADO";
}) {
  const { data } = await api.post(
    "/v1/popup-aviso/responder",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}

export async function listarPopupsAviso(): Promise<PopupAviso[]> {
  const { data } = await api.get<PopupAviso[]>(
    "/v1/popup-aviso"
  );

  return Array.isArray(data) ? data : [];
}

export async function buscarPopupAvisoPorId(
  id: number
): Promise<PopupAviso> {
  const { data } = await api.get<PopupAviso>(
    `/v1/popup-aviso/${id}`
  );

  return data;
}

export async function criarPopupAviso(payload: any) {
  const { data } = await api.post(
    "/v1/popup-aviso",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}

export async function editarPopupAviso(
  id: number,
  payload: any
) {
  const { data } = await api.put(
    `/v1/popup-aviso/${id}`,
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}

export async function ativarPopupAviso(
  id: number,
  stAtivo: "S" | "N"
) {
  const { data } = await api.patch(
    `/v1/popup-aviso/${id}/ativar`,
    {
      stAtivo,
    },
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}