/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export type FatorAjusteOdontoItem = {
  ID_CONVENIO_FATOR_AJUSTE: number;
  ID_OPERADORA?: number;
  CONVENIO_FATOR_AJUSTE_HISTORICO?: number;
  NM_FATOR_AJUSTE: string;
  VL_AJUSTE: number;
  DT_VIGENCIA: string;
};

export async function listarFatoresAjusteOdonto() {
  const { data } = await api.get<FatorAjusteOdontoItem[]>("/v1/fator_ajuste");
  return data || [];
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
    payload
  );

  return data;
}