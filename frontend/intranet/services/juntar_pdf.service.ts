"use client";

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

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
