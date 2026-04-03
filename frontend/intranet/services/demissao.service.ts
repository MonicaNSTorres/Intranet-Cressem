import axios from "axios";

export type DemissaoAssociadoResponse = {
  NOME?: string;
  MATRICULA?: string;
  EMPRESA?: string;
  CPF?: string;
  SL_CONTA_CAPITAL?: number;
};

export type MotivoDemissaoOption = {
  value: string;
  label: string;
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

  if (cpfLimpo.length !== 11) return null;

  const response = await api.get(`/v1/demissao/associado/${cpfLimpo}`);
  return response.data || null;
}

export async function buscarMotivosDemissao(): Promise<MotivoDemissaoOption[]> {
  const response = await api.get("/v1/demissao/motivos");
  return response.data || [];
}

export async function buscarCidadesDemissao(): Promise<
  { value: string; label: string }[]
> {
  const response = await api.get("/v1/demissao/cidades");
  return response.data || [];
}