import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type ParcelaItem = {
  NR_CONTRATO: string;
  NM_CATEGORIA: string;
  SN_QUITACAO: number;
  DT_PERIODO: string;
  NR_PARCELA: string;
  VL_PARCELA_CRM: number;
};

export type PagamentoItem = {
  NM_FORMA_PAGAMENTO: string;
  VL_PAGAMENTO: number;
};

export type ReciboFinanceiroPayload = {
  NR_CPF_CNPJ: string;
  NM_ASSOCIADO: string;
  NR_MATRICULA?: string;
  NM_EMPRESA?: string;
  DT_DIA: string;
  CIDADE: string;
  TP_ATENDIMENTO: string;
  OBSERVACAO?: string;
  NM_FUNCIONARIO?: string;
  PARCELAS: ParcelaItem[];
  PAGAMENTOS: PagamentoItem[];
};

export type ReciboFinanceiroResponse = {
  ID_RECIBO_CRM?: number;
  NR_CPF_CNPJ: string;
  NM_ASSOCIADO: string;
  NR_MATRICULA?: string;
  NM_EMPRESA?: string;
  DT_DIA: string;
  CIDADE: string;
  TP_ATENDIMENTO: string;
  OBSERVACAO?: string;
  NM_FUNCIONARIO?: string;
  PARCELAS: ParcelaItem[];
  PAGAMENTOS: PagamentoItem[];
};

export type OptionItem = {
  NM_ATENDIMENTO?: string;
  NM_CATEGORIA?: string;
  NM_PAGAMENTO?: string;
  nome?: string;
  NM_CIDADE?: string;
  DSC_CIDADE?: string;
  label?: string;
  value?: string;
};

export type AssociadoResponse = {
  found?: boolean;
  nome?: string;
  matricula?: string;
  empresa?: string;
  cpf?: string;
  bairro?: string;
  cidade?: string;
  rua?: string;
  uf?: string;
  cep?: string;
};

export type AuthMeResponse = {
  nome?: string;
  username?: string;
  nome_completo?: string;
};

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function carregarCidadesRecibo(): Promise<string[]> {
  const response = await api.get<Array<OptionItem | string>>(
    "/v1/cidades"
  );

  const cidades = Array.isArray(response.data)
    ? response.data
    : [];

  return cidades
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      return String(
        item.nome ||
          item.NM_CIDADE ||
          item.DSC_CIDADE ||
          item.label ||
          item.value ||
          ""
      ).trim();
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function carregarTipoAtendimentoRecibo(): Promise<
  string[]
> {
  const response = await api.get<OptionItem[]>(
    "/v1/tipo_atendimento_recibo"
  );

  const atendimentos = Array.isArray(response.data)
    ? response.data
    : [];

  return atendimentos
    .map((item) =>
      String(item.NM_ATENDIMENTO || "").trim()
    )
    .filter(Boolean);
}

export async function carregarCategoriaContratoRecibo(): Promise<
  string[]
> {
  const response = await api.get<OptionItem[]>(
    "/v1/categoria_contrato_recibo"
  );

  const categorias = Array.isArray(response.data)
    ? response.data
    : [];

  return categorias
    .map((item) =>
      String(item.NM_CATEGORIA || "").trim()
    )
    .filter(Boolean);
}

export async function carregarFormaPagamentoRecibo(): Promise<
  string[]
> {
  const response = await api.get<OptionItem[]>(
    "/v1/forma_pagamento_recibo"
  );

  const formasPagamento = Array.isArray(response.data)
    ? response.data
    : [];

  return formasPagamento
    .map((item) =>
      String(item.NM_PAGAMENTO || "").trim()
    )
    .filter(Boolean);
}

export async function buscarReciboFinanceiroPorId(
  id: number
): Promise<ReciboFinanceiroResponse> {
  if (!id) {
    throw new Error("ID do recibo financeiro não informado.");
  }

  const response = await api.get<ReciboFinanceiroResponse>(
    `/v1/recibo_crm/${id}`
  );

  return response.data;
}

export async function cadastrarReciboFinanceiro(
  payload: ReciboFinanceiroPayload
): Promise<ReciboFinanceiroResponse> {
  const response = await api.post<ReciboFinanceiroResponse>(
    "/v1/recibo_crm",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function editarReciboFinanceiro(
  id: number,
  payload: ReciboFinanceiroPayload
): Promise<ReciboFinanceiroResponse> {
  if (!id) {
    throw new Error("ID do recibo financeiro não informado.");
  }

  const response = await api.put<ReciboFinanceiroResponse>(
    `/v1/recibo_crm/${id}`,
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function buscarAssociadoReciboPorCpfCnpj(
  documento: string
): Promise<AssociadoResponse> {
  const documentoLimpo = onlyDigits(documento);

  if (!documentoLimpo) {
    throw new Error("CPF/CNPJ não informado.");
  }

  const response = await api.get<AssociadoResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: {
        cpf: documentoLimpo,
      },
    }
  );

  return response.data;
}

export async function buscarUsuarioLogadoRecibo(): Promise<AuthMeResponse> {
  const response = await api.get<AuthMeResponse>("/v1/me");

  return response.data;
}
