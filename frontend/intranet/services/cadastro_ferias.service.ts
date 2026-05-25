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
          "Erro no service de cadastro de férias",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          status: error?.response?.status,
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          responseData: error?.response?.data,
        },

        SOURCE: "CADASTRO_FERIAS_AXIOS",
      });
    } catch {
      //evita loop infinito
    }

    return Promise.reject(error);
  }
);

export type FeriasFuncionarioItem = {
  ID_FERIAS_FUNCIONARIOS?: number;
  DT_DIA_INICIO: string;
  DT_DIA_FIM: string;
  DT_DIAS_TOTAIS?: number;
  SN_EFETUADO?: number;
  ID_FUNCIONARIO: number;
};

export type FuncionarioFeriasResponse = {
  ID_FUNCIONARIO: number;
  NM_FUNCIONARIO: string;
  NR_CPF: string;
  DT_ADMISSAO?: string;
  FERIAS?: FeriasFuncionarioItem[];
};

export type PeriodoFeriasPayload = {
  DT_DIA_INICIO: string;
  DT_DIA_FIM: string;
  ID_FUNCIONARIO: number;
  ID_FERIAS_FUNCIONARIOS?: number;
};

export async function buscarFuncionarioFeriasPorCpf(cpf: string) {
  const response = await api.get<FuncionarioFeriasResponse>(
    `/v1/funcionarios_sicoob_cressem_unico/cpf/${cpf}`
  );

  return response.data;
}

export async function buscarFuncionarioFeriasPorId(id: string | number) {
  const response = await api.get<FuncionarioFeriasResponse>(
    `/v1/funcionarios_sicoob_cressem/ferias/${id}`
  );

  return response.data;
}

export async function cadastrarFeriasFuncionario(payload: PeriodoFeriasPayload[]) {
  const response = await api.post("/v1/ferias_funcionarios", payload);
  return response.data;
}

export async function editarFeriasFuncionario(
  idFuncionario: number,
  payload: PeriodoFeriasPayload[]
) {
  const response = await api.put(
    `/v1/ferias_funcionarios/${idFuncionario}`,
    payload
  );

  return response.data;
}