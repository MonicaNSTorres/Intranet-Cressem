import axios from "axios";
import { registrarErroTela } from "./error_log.service";

export type AssociadoAntecipacaoResponse = {
  NOME?: string;
  MATRICULA?: string;
  EMPRESA?: string;
  CPF?: string;
};

export type CidadeOption = {
  value: string;
  label: string;
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
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
          error?.message ||
          "Erro no service de antecipação capital",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "ANTECIPACAO_CAPITAL_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export async function buscarAssociadoAntecipacaoPorCpf(
  cpf: string
): Promise<AssociadoAntecipacaoResponse | null> {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11) return null;

  const response = await api.get(
    `/v1/antecipacao-capital/associado/${cpfLimpo}`
  );

  return response.data || null;
}

export async function buscarCidadesAntecipacao(): Promise<CidadeOption[]> {
  const response = await api.get("/v1/antecipacao-capital/cidades");
  return response.data || [];
}