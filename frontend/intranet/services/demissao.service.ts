import axios from "axios";

export type DemissaoAssociadoResponse = {
  NOME?: string;
  MATRICULA?: string;
  EMPRESA?: string;
  CIDADE?: string;
  TELEFONE?: string;
  CPF?: string;
  SL_CONTA_CAPITAL?: number;
};

export type CidadeResgateItem = {
  ID_CIDADES: number;
  ID_UF: number;
  NM_CIDADE: string;
};

export type MotivoDemissaoOption = {
  value: string;
  label: string;
};

export type ConvenioStatusResponse = {
  titular_ativo?: boolean;
  total_custo?: number;
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export async function buscarAssociadoDemissaoPorCpf(
  cpf: string
): Promise<DemissaoAssociadoResponse | null> {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) return null;

  const response = await api.get(`/v1/demissao/associado/${cpfLimpo}`);
  return response.data || null;
}

export async function buscarMotivosDemissao(): Promise<MotivoDemissaoOption[]> {
  const response = await api.get("/v1/demissao/motivos");

  return (response.data || []).map((item: any) => ({
    value: item.value || item.VALUE || item.NM_MOTIVO || "",
    label: item.label || item.LABEL || item.NM_MOTIVO || "",
  }));
}

export async function buscarCidadesDemissao(): Promise<
  { value: string; label: string }[]
> {
  const response = await api.get("/v1/demissao/cidades");

  return (response.data || []).map((item: any) => ({
    value: item.value || item.VALUE || item.NM_CIDADE || "",
    label: item.label || item.LABEL || item.NM_CIDADE || "",
  }));
}

export async function buscarConvenioDemissaoPorCpf(
  cpf: string
): Promise<ConvenioStatusResponse | null> {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) return null;

  try {
    const response = await api.get(`/v1/demissao/convenio/${cpfLimpo}`);
    return response.data || null;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function desativarConvenioDemissao(
  cpf: string,
  atendente: string
) {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
    throw new Error("CPF/CNPJ inválido para desativação do convênio.");
  }

  const response = await api.post(
    `/v1/demissao/convenio/${cpfLimpo}/desativacao`,
    { atendente }
  );

  return response.data;
}
