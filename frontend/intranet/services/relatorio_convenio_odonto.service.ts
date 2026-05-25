/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      await registrarErroTela({
        PAGE_URL:
          typeof window !== "undefined" ? window.location.href : null,

        ERROR_MESSAGE:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Erro no service de relatórios odontológicos",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "RELATORIOS_ODONTO_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

async function baixarBlob(url: string, filename: string) {
  const response = await api.get(url, {
    responseType: "blob",
  });

  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  const href = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(href);
}

export async function downloadCsvContratantesOdonto() {
  await baixarBlob("/v1/download_pessoas_odontologicas", "convenio_odontologico.csv");
}

export async function downloadCsvHistoricoCustoOdonto() {
  await baixarBlob("/v1/download_custo_odonto", "custo_odontologico.csv");
}

export async function downloadCsvMaiorIdadeOdonto() {
  await baixarBlob(
    "/v1/download_pessoas_odontologicas_maior_idade",
    "maior_idade_odontologico.csv"
  );
}

export async function downloadCsvFolhaOdonto() {
  await baixarBlob(
    "/v1/download_pessoas_odontologicas_folha",
    "convenio_odonto_folha.csv"
  );
}