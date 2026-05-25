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
          typeof window !== "undefined"
            ? window.location.href
            : null,

        ERROR_MESSAGE:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Erro no service de conversão de arquivos",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseType: error?.config?.responseType,
          responseData:
            error?.config?.responseType === "blob"
              ? "Resposta blob não registrada"
              : error?.response?.data,
        },

        SOURCE: "CONVERSOR_ARQUIVOS_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

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