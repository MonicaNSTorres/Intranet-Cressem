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

  const response = await api.post<Blob>(
    "/v1/converter-arquivos",
    formData,
    {
      responseType: "blob",
      timeout: 120000,
    }
  );

  return response.data;
}