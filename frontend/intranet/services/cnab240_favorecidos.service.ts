import { api } from "./api.service";

const CNAB_FAVORECIDOS_TIMEOUT_MS = 30000;

export type CnabFavorecido = {
  ID_FAVORECIDO: number;
  CPF: string;
  IDCLIENTE?: string | null;
  BANCO?: string | null;
  AGENCIA?: string | null;
  CONTA?: string | null;
  DV_CONTA?: string | null;
  NOME: string;
  ENDERECO?: string | null;
  NUMERO?: string | null;
  COMPLEMENTO?: string | null;
  BAIRRO?: string | null;
  CEP?: string | null;
  CEP_COMPLEMENTO?: string | null;
  CIDADE?: string | null;
  UF?: string | null;
  CREATED_AT?: string | null;
  UPDATED_AT?: string | null;
};

export type CnabFavorecidoPayload = Omit<
  CnabFavorecido,
  "ID_FAVORECIDO" | "CREATED_AT" | "UPDATED_AT"
>;

export type CnabFavorecidoLotePayload =
  CnabFavorecidoPayload & {
    LINHA?: number;
  };

export type ImportarFavorecidoErro = {
  linha: number;
  cpf?: string;
  nome?: string;
  erro: string;
};

export type ImportarFavorecidosEmMassaResponse = {
  success: boolean;
  message: string;
  totalRecebidos: number;
  inseridos: number;
  atualizados: number;
  rejeitados: number;
  erros: ImportarFavorecidoErro[];
};

export type ListarFavorecidosParams = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type ListarFavorecidosResponse = {
  data: CnabFavorecido[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  resumo: {
    totalFavorecidos: number;
    totalBancos: number;
    totalCidades: number;
  };
};

export type CnabFavorecidoOperacaoResponse = {
  success?: boolean;
  message?: string;
  data?: CnabFavorecido;
};

function onlyDigits(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarTexto(
  value: string | null | undefined
): string | null {
  const texto = String(value || "").trim();

  return texto || null;
}

function normalizarFavorecidoPayload(
  payload: CnabFavorecidoPayload
): CnabFavorecidoPayload {
  return {
    ...payload,
    CPF: onlyDigits(payload.CPF),
    NOME: String(payload.NOME || "").trim(),
    IDCLIENTE: normalizarTexto(payload.IDCLIENTE),
    BANCO: normalizarTexto(payload.BANCO),
    AGENCIA: normalizarTexto(payload.AGENCIA),
    CONTA: normalizarTexto(payload.CONTA),
    DV_CONTA: normalizarTexto(payload.DV_CONTA),
    ENDERECO: normalizarTexto(payload.ENDERECO),
    NUMERO: normalizarTexto(payload.NUMERO),
    COMPLEMENTO: normalizarTexto(payload.COMPLEMENTO),
    BAIRRO: normalizarTexto(payload.BAIRRO),
    CEP: payload.CEP
      ? onlyDigits(payload.CEP)
      : null,
    CEP_COMPLEMENTO: normalizarTexto(
      payload.CEP_COMPLEMENTO
    ),
    CIDADE: normalizarTexto(payload.CIDADE),
    UF: normalizarTexto(payload.UF)?.toUpperCase() || null,
  };
}

export async function listarFavorecidos(
  params: ListarFavorecidosParams = {}
): Promise<ListarFavorecidosResponse> {
  const response = await api.get<ListarFavorecidosResponse>(
    "/v1/cnab240/favorecidos",
    {
      params: {
        busca: String(params.busca || "").trim(),
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
      timeout: CNAB_FAVORECIDOS_TIMEOUT_MS,
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
      totalFavorecidos: Number(
        response.data?.resumo?.totalFavorecidos || 0
      ),

      totalBancos: Number(
        response.data?.resumo?.totalBancos || 0
      ),

      totalCidades: Number(
        response.data?.resumo?.totalCidades || 0
      ),
    },
  };
}

export async function criarFavorecido(
  payload: CnabFavorecidoPayload
): Promise<CnabFavorecidoOperacaoResponse> {
  const payloadNormalizado =
    normalizarFavorecidoPayload(payload);

  if (!payloadNormalizado.CPF) {
    throw new Error("CPF do favorecido não informado.");
  }

  if (!payloadNormalizado.NOME) {
    throw new Error("Nome do favorecido não informado.");
  }

  const response =
    await api.post<CnabFavorecidoOperacaoResponse>(
      "/v1/cnab240/favorecidos",
      payloadNormalizado,
      {
        timeout: CNAB_FAVORECIDOS_TIMEOUT_MS,
      }
    );

  return response.data;
}

export async function atualizarFavorecido(
  id: number,
  payload: CnabFavorecidoPayload
): Promise<CnabFavorecidoOperacaoResponse> {
  if (!id) {
    throw new Error("ID do favorecido não informado.");
  }

  const payloadNormalizado =
    normalizarFavorecidoPayload(payload);

  if (!payloadNormalizado.CPF) {
    throw new Error("CPF do favorecido não informado.");
  }

  if (!payloadNormalizado.NOME) {
    throw new Error("Nome do favorecido não informado.");
  }

  const response =
    await api.put<CnabFavorecidoOperacaoResponse>(
      `/v1/cnab240/favorecidos/${id}`,
      payloadNormalizado,
      {
        timeout: CNAB_FAVORECIDOS_TIMEOUT_MS,
      }
    );

  return response.data;
}

export async function importarFavorecidosEmMassa(
  favorecidos: CnabFavorecidoLotePayload[]
): Promise<ImportarFavorecidosEmMassaResponse> {
  if (
    !Array.isArray(favorecidos) ||
    favorecidos.length === 0
  ) {
    throw new Error(
      "Nenhum favorecido foi informado para importação."
    );
  }

  const favorecidosNormalizados = favorecidos.map(
    (item) => ({
      ...normalizarFavorecidoPayload(item),
      LINHA: item.LINHA,
    })
  );

  const response =
    await api.post<ImportarFavorecidosEmMassaResponse>(
      "/v1/cnab240/favorecidos/importar-massa",
      {
        favorecidos: favorecidosNormalizados,
      },
      {
        timeout: CNAB_FAVORECIDOS_TIMEOUT_MS,
      }
    );

  return {
    success: Boolean(response.data?.success),

    message:
      response.data?.message ||
      "Importação de favorecidos concluída.",

    totalRecebidos: Number(
      response.data?.totalRecebidos || 0
    ),

    inseridos: Number(
      response.data?.inseridos || 0
    ),

    atualizados: Number(
      response.data?.atualizados || 0
    ),

    rejeitados: Number(
      response.data?.rejeitados || 0
    ),

    erros: Array.isArray(response.data?.erros)
      ? response.data.erros
      : [],
  };
}

export async function excluirFavorecido(
  id: number
): Promise<CnabFavorecidoOperacaoResponse> {
  if (!id) {
    throw new Error("ID do favorecido não informado.");
  }

  const response =
    await api.delete<CnabFavorecidoOperacaoResponse>(
      `/v1/cnab240/favorecidos/${id}`,
      {
        timeout: CNAB_FAVORECIDOS_TIMEOUT_MS,
      }
    );

  return response.data;
}
