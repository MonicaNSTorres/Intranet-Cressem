/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";
import type { MeResponse } from "./auth.service";

export type TipoEspacoReserva =
  | "SALA_REUNIAO"
  | "AUDITORIO";

export type ReservaSalaPayload = {
  TP_ESPACO: TipoEspacoReserva;
  NM_ESPACO: string;
  DS_TITULO: string;
  DS_OBSERVACAO?: string;
  DT_INICIO: string;
  DT_FIM: string;
  USUARIO: MeResponse;
  CHECKLIST_AUDITORIO?: any;
};

export type ReservaSalaItem = {
  ID_RESERVA_SALA: number;
  TP_ESPACO: TipoEspacoReserva;
  NM_ESPACO: string;
  DS_TITULO: string;
  DS_OBSERVACAO?: string;
  DT_INICIO: string;
  DT_FIM: string;
  NM_USUARIO?: string;
  DS_LOGIN?: string;
  DS_EMAIL?: string;
  DS_DEPARTAMENTO?: string;
  ST_RESERVA: string;
};

export async function cadastrarReservaSala(
  payload: ReservaSalaPayload
) {
  const { data } = await api.post(
    "/v1/reserva_sala_reuniao",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}

export async function listarReservasSala(params?: {
  inicio?: string;
  fim?: string;
  tipoEspaco?: string;
  nomeEspaco?: string;
}) {
  const { data } = await api.get<{
    items: ReservaSalaItem[];
  }>(
    "/v1/reserva_sala_reuniao",
    {
      params,
    }
  );

  return Array.isArray(data?.items) ? data.items : [];
}

export async function cancelarReservaSala(
  id: number
) {
  const { data } = await api.delete(
    `/v1/reserva_sala_reuniao/${id}`,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return data;
}