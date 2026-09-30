import { isAxiosError } from "axios";
import { api } from "./api.service";

export async function converterArquivos(
  files: File[],
  de: string,
  para: string
) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  formData.append("de", de);
  formData.append("para", para);

  try {
    const response = await api.post<Blob>(
      "/v1/converter-arquivos",
      formData,
      {
        responseType: "blob",
        timeout: 300000,
      }
    );

    return response.data;
  } catch (error) {
    const dados = isAxiosError(error) ? error.response?.data : undefined;
    if (dados instanceof Blob) {
      let mensagem = "";
      try {
        const resposta = JSON.parse(await dados.text());
        mensagem = String(resposta?.details || resposta?.error || "").trim();
      } catch {
        // Se o servidor não enviou JSON, preserva o erro original.
      }
      if (mensagem) throw new Error(mensagem);
    }
    throw error;
  }
}
