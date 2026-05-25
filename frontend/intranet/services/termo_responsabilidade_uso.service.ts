import axios from "axios";
import { registrarErroTela } from "./error_log.service";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
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
          "Erro no service de termo responsabilidade uso",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          params: error?.config?.params,
          responseData: error?.response?.data,
        },

        SOURCE: "TERMO_RESPONSABILIDADE_USO_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type AssociadoPorCpfResponse = {
  found: boolean;
  nome?: string;
  matricula?: string;
  nascimento?: string;
  empresa?: string;
  cpf?: string;
  bairro?: string;
  cidade?: string;
  rua?: string;
  uf?: string;
  cep?: string;
};

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function buscarFuncionarioPorCpfTermo(cpf: string) {
  const cpfLimpo = onlyDigits(cpf);

  const response = await api.get<AssociadoPorCpfResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: {
        cpf: cpfLimpo,
      },
    }
  );

  return response.data;
}