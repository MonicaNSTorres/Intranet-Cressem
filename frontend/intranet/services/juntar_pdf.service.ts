"use client";

import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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
          "Erro no service de juntar PDF",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "JUNTAR_PDF_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export async function juntarEComprimirPdfs(files: File[]) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await api.post("/v1/juntar-pdf", formData, {
      responseType: "blob",
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;

    if (data instanceof Blob) {
      const text = await data.text();

      try {
        const parsed = JSON.parse(text);
        const msg =
          parsed?.error || parsed?.details || "Erro ao processar os PDFs.";
        throw new Error(msg);
      } catch (parseError) {
        if (text) {
          throw new Error(text);
        }

        throw new Error("Erro ao processar os PDFs.");
      }
    }

    throw error;
  }
}
