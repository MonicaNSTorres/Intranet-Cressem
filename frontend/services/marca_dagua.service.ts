/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";

export async function aplicarMarcaDagua(
  file: File
): Promise<Blob> {
  const formData = new FormData();

  formData.append("file", file);

  try {
    const response = await api.post<Blob>(
      "/v1/marca_dagua",
      formData,
      {
        responseType: "blob",
        timeout: 120000,
      }
    );

    return response.data;
  } catch (error: any) {
    let mensagem =
      "Falha ao processar o PDF. Tente novamente.";

    try {
      const data = error?.response?.data;

      if (data instanceof Blob) {
        const text = await data.text();

        if (text) {
          try {
            const parsed = JSON.parse(text);

            mensagem =
              parsed?.error ||
              parsed?.details ||
              parsed?.message ||
              text;
          } catch {
            mensagem = text;
          }
        }
      } else {
        mensagem =
          data?.error ||
          data?.details ||
          data?.message ||
          error?.message ||
          mensagem;
      }
    } catch {
      // mantém a mensagem padrão
    }

    throw new Error(mensagem);
  }
}