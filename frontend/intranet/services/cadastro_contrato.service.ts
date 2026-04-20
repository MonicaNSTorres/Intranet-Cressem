/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001/v1";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export type ContratoEmpresaPayload = {
  NR_CNPJ: string;
  NM_EMPRESA: string;
  NM_CIDADE: string;
  NM_TIPO_TEMPO_CONTRATO: string;
  CD_CONTA_CAPITAL: string;
  NM_TIPO_CONTRATO: string;
  NM_SISTEMA_CONSIG: string;
  DT_INICIO: string;
  DT_FIM: string | null;
  OBS_CONTRATO: string;
  SN_ATIVO?: number;
};

export type ContratoEmpresaResponse = {
  ID_CONTRATOS_EMPRESAS: number;
  NR_CNPJ: string;
  NM_EMPRESA: string;
  NM_CIDADE: string;
  NM_TIPO_CONTRATO: string;
  NM_SISTEMA_CONSIG: string;
  DT_INICIO: string;
  DT_FIM: string | null;
  SN_ATIVO: number;
  CD_CONTA_CAPITAL: string;
  NM_TIPO_TEMPO_CONTRATO: string;
  OBS_CONTRATO: string;
};

export type FuncionarioEmail = {
  ID_FUNCIONARIO: number;
  NM_FUNCIONARIO?: string;
  EMAIL: string;
};

export type EmailContratoPayload = {
  ID_FUNCIONARIO: number;
  ID_CONTRATO: number;
};

export type EmailContratoItem = {
  ID_CONTRATO_EMAIL: number;
  ID_CONTRATO: number;
  ID_FUNCIONARIO: number;
  FUNCIONARIO?: {
    ID_FUNCIONARIO: number;
    NM_FUNCIONARIO?: string;
    EMAIL: string;
  };
};

export async function cadastrarContratoEmpresa(
  payload: ContratoEmpresaPayload
) {
  const { data } = await api.post("/v1/contratos_empresas", payload);
  return data;
}

export async function editarContratoEmpresa(
  id: number,
  payload: ContratoEmpresaPayload
) {
  const { data } = await api.put(`/v1/contratos_empresas/${id}`, payload);
  return data;
}

export async function buscarContratoPorId(id: number) {
  const { data } = await api.get<ContratoEmpresaResponse>(
    `/v1/contratos_empresas/${id}`
  );
  return data;
}

export async function carregarCidadesContrato() {
  const { data } = await api.get<string[]>("/v1/contratos_empresas_cidades");
  return data || [];
}

export async function carregarTiposContrato() {
  const { data } = await api.get<string[]>("/v1/contratos_empresas_tipo");
  return data || [];
}

export async function carregarSistemasConsignados() {
  const { data } = await api.get<string[]>("/v1/contratos_empresas_sistema");
  return data || [];
}

export async function carregarEmailsFuncionarios() {
  const { data } = await api.get<FuncionarioEmail[]>(
    "/v1/funcionarios_simples_email_sicoob_cressem"
  );

  return (data || [])
    .map((item) => String(item.EMAIL || "").trim())
    .filter(Boolean);
}

export async function buscarFuncionarioPorEmail(email: string) {
  const { data } = await api.get<FuncionarioEmail>(
    `/v1/funcionarios_sicoob_cressem/email/${encodeURIComponent(email)}`
  );
  return data;
}

export async function criarEmailContrato(payload: EmailContratoPayload) {
  const { data } = await api.post("/v1/email_contrato", payload);
  return data;
}

export async function listarEmailContratoPorContrato(idContrato: number) {
  const { data } = await api.get<EmailContratoItem[]>(
    `/v1/email_contrato/contrato/${idContrato}`
  );
  return data || [];
}

export async function listarEmailContratoPorFuncionario(idFuncionario: number) {
  const { data } = await api.get<EmailContratoItem>(
    `/v1/email_contrato/funcionario/${idFuncionario}`
  );
  return data;
}

export async function removerEmailContrato(idContratoEmail: number) {
  const { data } = await api.delete(`/v1/email_contrato/${idContratoEmail}`);
  return data;
}

export async function buscarEmailsDoContratoSeparados(idContrato: number) {
  const data = await listarEmailContratoPorContrato(idContrato);

  return (data || [])
    .map((item) => String(item?.FUNCIONARIO?.EMAIL || "").trim())
    .filter(Boolean)
    .join("/");
}