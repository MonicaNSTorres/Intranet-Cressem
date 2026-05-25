import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
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
          "Erro no service de marca d’água",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "MARCA_DAGUA_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

function getApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL nao definido no .env do front");
  }

  return API_URL;
}

export async function aplicarMarcaDagua(file: File) {
  const apiUrl = getApiUrl();

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await api.post("/v1/marca_dagua", formData, {
      responseType: "blob",
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: any) {
    let mensagem = "Falha ao processar o PDF. Tente novamente.";

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
      }
    } catch {
      // mantem mensagem padrao
    }

    throw new Error(mensagem);
  }
}