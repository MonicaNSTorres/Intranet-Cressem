import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

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

  const response = await api.post("/v1/converter-arquivos", formData, {
    responseType: "blob",
  });

  return response.data;
}