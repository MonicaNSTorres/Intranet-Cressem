import { api } from "./api.service";

const CNAB_AGENCIAS_TIMEOUT_MS = 30000;

export type CnabAgencia = {
  ID_AGENCIA: number;
  BANCOAGENCIA: string;
  NUMBANCO: string;
  NUMAGENCIA: string;
  DESCAGENCIA?: string | null;
  NUMCAMARACOMP?: string | null;
  CGCCOMPLETO?: string | null;
  CODMUNICIPIO?: string | null;
  NOMEMUNICIPIO?: string | null;
  UF?: string | null;
  CREATED_AT?: string | null;
};

export type CnabAgenciaPayload = {
  NUMBANCO: string;
  NUMAGENCIA: string;
  DESCAGENCIA?: string | null;
  NUMCAMARACOMP?: string | null;
  CGCCOMPLETO?: string | null;
  CODMUNICIPIO?: string | null;
  NOMEMUNICIPIO?: string | null;
  UF?: string | null;
};

export type ListarAgenciasParams = {
  busca?: string;
  page?: number;
  limit?: number;
};

export type ListarAgenciasResponse = {
  data: CnabAgencia[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  resumo: {
    totalAgencias: number;
    totalBancos: number;
    totalMunicipios: number;
  };
};

export type CnabAgenciaImportarLinha = CnabAgenciaPayload;

export type ImportarAgenciaDetalhe = {
  linha: number;
  bancoagencia: string;
  numbanco: string;
  numagencia: string;
  descagencia: string | null;
  status: "INSERIDO" | "ERRO";
  mensagem: string;
};

export type ImportarAgenciasResponse = {
  success: boolean;
  message: string;
  processados: number;
  inseridos: number;
  erros: number;
  detalhes: ImportarAgenciaDetalhe[];
};

export type CnabAgenciaOperacaoResponse = {
  success?: boolean;
  message?: string;
  data?: CnabAgencia;
};

export async function listarAgencias(
  params: ListarAgenciasParams = {}
): Promise<ListarAgenciasResponse> {
  const response = await api.get<ListarAgenciasResponse>(
    "/v1/cnab240/agencias",
    {
      params: {
        busca: String(params.busca || "").trim(),
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
      timeout: CNAB_AGENCIAS_TIMEOUT_MS,
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
      totalAgencias: Number(
        response.data?.resumo?.totalAgencias || 0
      ),

      totalBancos: Number(
        response.data?.resumo?.totalBancos || 0
      ),

      totalMunicipios: Number(
        response.data?.resumo?.totalMunicipios || 0
      ),
    },
  };
}

export async function criarAgencia(
  payload: CnabAgenciaPayload
): Promise<CnabAgenciaOperacaoResponse> {
  const response = await api.post<CnabAgenciaOperacaoResponse>(
    "/v1/cnab240/agencias",
    payload,
    {
      timeout: CNAB_AGENCIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function atualizarAgencia(
  id: number,
  payload: CnabAgenciaPayload
): Promise<CnabAgenciaOperacaoResponse> {
  if (!id) {
    throw new Error("ID da agência não informado.");
  }

  const response = await api.put<CnabAgenciaOperacaoResponse>(
    `/v1/cnab240/agencias/${id}`,
    payload,
    {
      timeout: CNAB_AGENCIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function excluirAgencia(
  id: number
): Promise<CnabAgenciaOperacaoResponse> {
  if (!id) {
    throw new Error("ID da agência não informado.");
  }

  const response = await api.delete<CnabAgenciaOperacaoResponse>(
    `/v1/cnab240/agencias/${id}`,
    {
      timeout: CNAB_AGENCIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function importarAgenciasEmMassa(
  linhas: CnabAgenciaImportarLinha[]
): Promise<ImportarAgenciasResponse> {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    throw new Error(
      "Nenhuma agência foi informada para importação."
    );
  }

  const response = await api.post<ImportarAgenciasResponse>(
    "/v1/cnab240/agencias/importar-massa",
    linhas,
    {
      timeout: CNAB_AGENCIAS_TIMEOUT_MS,
    }
  );

  return response.data;
}