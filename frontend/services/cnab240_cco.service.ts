import { api } from "./api.service";

const CNAB_CCO_TIMEOUT_MS = 30000;

export type CnabCco = {
  ID_CCO: number;
  CHAVE_CPF_ATIVA?: string | null;
  CPF: string;
  CONTA?: string | null;
  ATIVA?: string | null;
  CREATED_AT?: string | null;
};

export type CnabCcoPayload = {
  CPF: string;
  CONTA?: string | null;
  ATIVA?: string | null;
};

export type ListarCcoParams = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type ListarCcoResponse = {
  data: CnabCco[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  resumo: {
    totalCco: number;
    totalAtivas: number;
    totalInativas: number;
  };
};

export type CnabCcoImportarLinha = {
  CPF: string;
  CONTA?: string | null;
  ATIVA?: string | null;
};

export type ImportarCcoDetalhe = {
  linha: number;
  cpf: string;
  conta: string | null;
  ativa: string;
  status: "INSERIDO" | "ERRO";
  mensagem: string;
};

export type ImportarCcoMassaResponse = {
  success: boolean;
  message: string;
  processados: number;
  inseridos: number;
  erros: number;
  detalhes: ImportarCcoDetalhe[];
};

export type CnabCcoOperacaoResponse = {
  success?: boolean;
  message?: string;
  data?: CnabCco;
};

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function importarCcoEmMassa(
  linhas: CnabCcoImportarLinha[]
): Promise<ImportarCcoMassaResponse> {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    throw new Error(
      "Nenhum registro de CCO foi informado para importação."
    );
  }

  const linhasNormalizadas = linhas.map((item) => ({
    CPF: onlyDigits(item.CPF),
    CONTA: item.CONTA
      ? String(item.CONTA).trim()
      : null,
    ATIVA: item.ATIVA
      ? String(item.ATIVA).trim()
      : null,
  }));

  const response = await api.post<ImportarCcoMassaResponse>(
    "/v1/cnab240/cco/importar-massa",
    {
      linhas: linhasNormalizadas,
    },
    {
      timeout: CNAB_CCO_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function listarCco(
  params: ListarCcoParams = {}
): Promise<ListarCcoResponse> {
  const response = await api.get<ListarCcoResponse>(
    "/v1/cnab240/cco",
    {
      params: {
        busca: String(params.busca || "").trim(),
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
      timeout: CNAB_CCO_TIMEOUT_MS,
    }
  );

  return {
    data: Array.isArray(response.data?.data)
      ? response.data.data
      : [],

    total: Number(response.data?.total || 0),

    page: Number(response.data?.page || 1),

    limit: Number(response.data?.limit || 20),

    totalPages: Number(response.data?.totalPages || 1),

    resumo: {
      totalCco: Number(
        response.data?.resumo?.totalCco || 0
      ),

      totalAtivas: Number(
        response.data?.resumo?.totalAtivas || 0
      ),

      totalInativas: Number(
        response.data?.resumo?.totalInativas || 0
      ),
    },
  };
}

export async function criarCco(
  payload: CnabCcoPayload
): Promise<CnabCcoOperacaoResponse> {
  const cpfLimpo = onlyDigits(payload.CPF);

  if (!cpfLimpo) {
    throw new Error("CPF não informado.");
  }

  const response = await api.post<CnabCcoOperacaoResponse>(
    "/v1/cnab240/cco",
    {
      ...payload,
      CPF: cpfLimpo,
      CONTA: payload.CONTA
        ? String(payload.CONTA).trim()
        : null,
      ATIVA: payload.ATIVA
        ? String(payload.ATIVA).trim()
        : null,
    },
    {
      timeout: CNAB_CCO_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function atualizarCco(
  id: number,
  payload: CnabCcoPayload
): Promise<CnabCcoOperacaoResponse> {
  if (!id) {
    throw new Error("ID do registro CCO não informado.");
  }

  const cpfLimpo = onlyDigits(payload.CPF);

  if (!cpfLimpo) {
    throw new Error("CPF não informado.");
  }

  const response = await api.put<CnabCcoOperacaoResponse>(
    `/v1/cnab240/cco/${id}`,
    {
      ...payload,
      CPF: cpfLimpo,
      CONTA: payload.CONTA
        ? String(payload.CONTA).trim()
        : null,
      ATIVA: payload.ATIVA
        ? String(payload.ATIVA).trim()
        : null,
    },
    {
      timeout: CNAB_CCO_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function excluirCco(
  id: number
): Promise<CnabCcoOperacaoResponse> {
  if (!id) {
    throw new Error("ID do registro CCO não informado.");
  }

  const response = await api.delete<CnabCcoOperacaoResponse>(
    `/v1/cnab240/cco/${id}`,
    {
      timeout: CNAB_CCO_TIMEOUT_MS,
    }
  );

  return response.data;
}