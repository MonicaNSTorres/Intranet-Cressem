import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

const CHEQUE_ESPECIAL_TIMEOUT_MS = 20000;

export type ChequeEspecialItem = {
  ID_ATUALIZACAO_BENEFICIO_CHEQUE_ESPECIAL: number;
  NR_CONTA_CORRENTE: number | string;
  NR_CPF_CNPJ: string;
  NM_ASSOCIADO: string;
  VL_PERC_TAXA_ADICIONAL_LIM_CRED: number;
  VL_LIMITE: number;
  NM_ALTERACAO: string;
  SN_FEITO?: string | number | null;
  NM_ATENDENTE?: string | null;
  DT_ALTERACAO?: string | null;
};

export type PaginatedChequeEspecialResponse = {
  items: ChequeEspecialItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export type BuscarChequeEspecialParams = {
  nome: string;
  page?: number;
  limit?: number;
  status?: string;
  tipoAlteracao?: string;
};

export type UsuarioLogadoChequeEspecial = {
  username?: string;
  nome_completo?: string;
  department?: string;
  grupos?: string[];
};

export async function buscarChequeEspecialPaginado(
  params: BuscarChequeEspecialParams
): Promise<PaginatedChequeEspecialResponse> {
  const response = await api.get<PaginatedChequeEspecialResponse>(
    "/v1/atualizacao_cheque_especial/paginado",
    {
      params: {
        nome: String(params.nome || "").trim(),
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        status: params.status || undefined,
        tipoAlteracao: params.tipoAlteracao || undefined,
      },
      timeout: CHEQUE_ESPECIAL_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function buscarChequeEspecialTotais(): Promise<
  ChequeEspecialItem[]
> {
  const response = await api.get<ChequeEspecialItem[]>(
    "/v1/atualizacao_cheque_especial",
    {
      timeout: CHEQUE_ESPECIAL_TIMEOUT_MS,
    }
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

export async function atualizarChequeEspecial(
  id: number,
  atendente: string,
  data: string
): Promise<unknown> {
  if (!id) {
    throw new Error("ID do cheque especial não informado.");
  }

  const atendenteLimpo = String(atendente || "").trim();
  const dataLimpa = String(data || "").trim();

  if (!atendenteLimpo) {
    throw new Error("Nome do atendente não informado.");
  }

  if (!dataLimpa) {
    throw new Error("Data da alteração não informada.");
  }

  const response = await api.put(
    `/v1/atualizacao_cheque_especial/${id}/${encodeURIComponent(
      atendenteLimpo
    )}/${encodeURIComponent(dataLimpa)}`,
    {},
    {
      headers: getAuditoriaHeaders(),
      timeout: CHEQUE_ESPECIAL_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function baixarRelatorioChequeEspecial(): Promise<Blob> {
  const response = await api.get<Blob>(
    "/v1/download_alteracao_cheque_especial",
    {
      responseType: "blob",
      timeout: CHEQUE_ESPECIAL_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function buscarUsuarioLogadoChequeEspecial(): Promise<
  UsuarioLogadoChequeEspecial
> {
  const response = await api.get<UsuarioLogadoChequeEspecial>(
    "/v1/me",
    {
      timeout: CHEQUE_ESPECIAL_TIMEOUT_MS,
    }
  );

  return response.data;
}