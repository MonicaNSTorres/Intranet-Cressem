"use client";

import { api } from "./api.service";

export async function juntarEComprimirPdfs(
  files: File[]
): Promise<Blob> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await api.post<Blob>(
      "/v1/juntar-pdf",
      formData,
      {
        responseType: "blob",
        timeout: 120000,
      }
    );

    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;

    if (data instanceof Blob) {
      const text = await data.text();

      try {
        const parsed = JSON.parse(text);

        throw new Error(
          parsed?.error ||
            parsed?.details ||
            parsed?.message ||
            "Erro ao processar os PDFs."
        );
      } catch (parseError) {
        if (
          parseError instanceof Error &&
          parseError.message !== "Erro ao processar os PDFs." &&
          !parseError.message.includes("JSON")
        ) {
          throw parseError;
        }

        if (text) {
          throw new Error(text);
        }

        throw new Error("Erro ao processar os PDFs.");
      }
    }

    throw error;
  }
}