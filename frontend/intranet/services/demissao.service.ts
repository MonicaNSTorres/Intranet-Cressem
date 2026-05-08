import axios from "axios";

export type DemissaoAssociadoResponse = {
  NOME?: string;
  MATRICULA?: string;
  EMPRESA?: string;
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

export async function buscarMotivosDemissao(): Promise<{ value: string; label: string }[]> {
  const response = await api.get("/v1/demissao/motivo-demissao");
  const lista = Array.isArray(response.data) ? response.data : [];

  return lista.map((c: { NM_MOTIVO?: string }) => {
    const nome = String(c.NM_MOTIVO || "").trim();
    return { value: nome, label: nome };
  }).filter((c) => c.value.length > 0);
}

export async function buscarCidadesDemissao(): Promise<{ value: string; label: string }[]> {
  const response = await api.get("/v1/cidade");
  const lista = Array.isArray(response.data) ? response.data : [];

  return lista.map((c: { NM_CIDADE?: string }) => {
    const nome = String(c.NM_CIDADE || "").trim();
    return { value: nome, label: nome };
  }).filter((c) => c.value.length > 0);
}
