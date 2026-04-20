/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { buscarFuncionarioPorCpf } from "./associado.service";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

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

export async function carregarCidadesRecibo() {
  const { data } = await api.get<OptionItem[] | string[]>("/v1/cidades");

  return (data || [])
    .map((item: any) =>
      typeof item === "string" ? item : String(item?.nome || "").trim()
    )
    .filter(Boolean);
}

export async function carregarTipoAtendimentoRecibo() {
  const { data } = await api.get<OptionItem[]>("/v1/tipo_atendimento_recibo");

  return (data || [])
    .map((item) => String(item.NM_ATENDIMENTO || "").trim())
    .filter(Boolean);
}

export async function carregarCategoriaContratoRecibo() {
  const { data } = await api.get<OptionItem[]>("/v1/categoria_contrato_recibo");

  return (data || [])
    .map((item) => String(item.NM_CATEGORIA || "").trim())
    .filter(Boolean);
}

export async function carregarFormaPagamentoRecibo() {
  const { data } = await api.get<OptionItem[]>("/v1/forma_pagamento_recibo");

  return (data || [])
    .map((item) => String(item.NM_PAGAMENTO || "").trim())
    .filter(Boolean);
}

export async function buscarReciboFinanceiroPorId(id: number) {
  const { data } = await api.get<ReciboFinanceiroResponse>(`/v1/recibo_crm/${id}`);
  return data;
}

export async function cadastrarReciboFinanceiro(
  payload: ReciboFinanceiroPayload
) {
  const { data } = await api.post("/v1/recibo_crm", payload);
  return data;
}

export async function editarReciboFinanceiro(
  id: number,
  payload: ReciboFinanceiroPayload
) {
  const { data } = await api.put(`/v1/recibo_crm/${id}`, payload);
  return data;
}

export async function buscarAssociadoReciboPorCpfCnpj(documento: string) {
  const { data } = await api.get<AssociadoResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: { cpf: documento },
    }
  );
  return data;
}

export async function buscarUsuarioLogadoRecibo() {
  const { data } = await api.get<AuthMeResponse>("/v1/me");
  return data;
}