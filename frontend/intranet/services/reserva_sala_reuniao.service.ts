/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";
import type { MeResponse } from "./auth.service";

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

      if (!String(url).includes("/v1/me")) {
        await registrarErroTela({
          PAGE_URL:
            typeof window !== "undefined" ? window.location.href : null,
          ERROR_MESSAGE:
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
            "Erro no service de reserva de sala",
          ERROR_STACK: error?.stack || null,
          ERROR_DETAIL: {
            status: error?.response?.status,
            url,
            method: error?.config?.method,
            responseData: error?.response?.data,
          },
          SOURCE: "RESERVA_SALA_REUNIAO_AXIOS",
        });
      }
    } catch {}

    return Promise.reject(error);
  }
);

export type TipoEspacoReserva = "SALA_REUNIAO" | "AUDITORIO";

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

export async function cadastrarReservaSala(payload: ReservaSalaPayload) {
  const { data } = await api.post("/v1/reserva_sala_reuniao", payload, {
    headers: getAuditoriaHeaders(),
  });

  return data;
}

export async function listarReservasSala(params?: {
  inicio?: string;
  fim?: string;
  tipoEspaco?: string;
  nomeEspaco?: string;
}) {
  const { data } = await api.get("/v1/reserva_sala_reuniao", { params });
  return data;
}

export async function cancelarReservaSala(id: number) {
  const { data } = await api.delete(`/v1/reserva_sala_reuniao/${id}`, {
    headers: getAuditoriaHeaders(),
  });

  return data;
}