import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

const FERIAS_TIMEOUT_MS = 30000;

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

export type ImportacaoFeriasErro = {
  linha: number;
  motivo: string;
  nome?: string;
};

export type ImportacaoFeriasRegistro = {
  NM_FUNCIONARIO: string;
  DT_DIA_INICIO: string;
  DT_DIA_FIM: string;
};

export type ImportacaoFeriasResponse = {
  success: boolean;
  total_linhas: number;
  carregados: number;
  registros: ImportacaoFeriasRegistro[];
  erros: ImportacaoFeriasErro[];
  message: string;
};

export type CadastroLoteFeriasPayload = Array<{
  NM_FUNCIONARIO: string;
  DT_DIA_INICIO: string;
  DT_DIA_FIM: string;
}>;

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function buscarFuncionarioFeriasPorCpf(
  cpf: string
): Promise<FuncionarioFeriasResponse> {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11) {
    throw new Error("CPF inválido. Informe os 11 dígitos.");
  }

  const response = await api.get<FuncionarioFeriasResponse>(
    `/v1/funcionarios_sicoob_cressem_unico/cpf/${cpfLimpo}`,
    {
      timeout: FERIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function buscarFuncionarioFeriasPorId(
  id: string | number
): Promise<FuncionarioFeriasResponse> {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error("ID do funcionário não informado.");
  }

  const response = await api.get<FuncionarioFeriasResponse>(
    `/v1/funcionarios_sicoob_cressem/ferias/${encodeURIComponent(
      String(id)
    )}`,
    {
      timeout: FERIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function cadastrarFeriasFuncionario(
  payload: PeriodoFeriasPayload[]
): Promise<unknown> {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Nenhum período de férias foi informado.");
  }

  const response = await api.post(
    "/v1/ferias_funcionarios",
    payload,
    {
      headers: getAuditoriaHeaders(),
      timeout: FERIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function editarFeriasFuncionario(
  idFuncionario: number,
  payload: PeriodoFeriasPayload[]
): Promise<unknown> {
  if (!idFuncionario) {
    throw new Error("ID do funcionário não informado.");
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Nenhum período de férias foi informado.");
  }

  const response = await api.put(
    `/v1/ferias_funcionarios/${idFuncionario}`,
    payload,
    {
      headers: getAuditoriaHeaders(),
      timeout: FERIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function importarFeriasExcel(
  file: File
): Promise<ImportacaoFeriasResponse> {
  if (!file) {
    throw new Error("Arquivo de férias não informado.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<ImportacaoFeriasResponse>(
    "/v1/ferias_funcionarios/importar-excel",
    formData,
    {
      headers: getAuditoriaHeaders(),
      timeout: FERIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function salvarLoteFerias(
  payload: CadastroLoteFeriasPayload
): Promise<unknown> {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Nenhum registro de férias foi informado.");
  }

  const response = await api.post(
    "/v1/ferias_funcionarios/lote",
    payload,
    {
      headers: getAuditoriaHeaders(),
      timeout: FERIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}
