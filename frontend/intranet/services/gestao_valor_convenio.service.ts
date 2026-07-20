/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type FatorAjusteOdontoItem = {
  ID_CONVENIO_FATOR_AJUSTE: number;
  ID_OPERADORA?: number;
  CONVENIO_FATOR_AJUSTE_HISTORICO?: number;
  NM_FATOR_AJUSTE: string;
  VL_AJUSTE: number;
  DT_VIGENCIA: string;
};

export async function listarFatoresAjusteOdonto() {
  const { data } = await api.get<FatorAjusteOdontoItem[]>(
    "/v1/fator_ajuste"
  );

  return Array.isArray(data) ? data : [];
}

export async function atualizarFatorAjusteOdonto(
  id: number,
  payload: {
    ID_CONVENIO_FATOR_AJUSTE: number;
    NM_FATOR_AJUSTE: string;
    VL_AJUSTE: number;
    DT_VIGENCIA: string;
  }
) {
  const nomeUsuario = "INTRANET";

  const { data } = await api.put(
    `/v1/fator_ajuste/${id}/usuario/${encodeURIComponent(nomeUsuario)}`,
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}