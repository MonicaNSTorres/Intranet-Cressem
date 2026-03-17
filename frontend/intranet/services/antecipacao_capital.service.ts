import axios from "axios";

export type AssociadoAntecipacaoResponse = {
  NOME?: string;
  MATRICULA?: string;
  EMPRESA?: string;
  CPF?: string;
};

export type CidadeOption = {
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

export async function buscarAssociadoAntecipacaoPorCpf(
  cpf: string
): Promise<AssociadoAntecipacaoResponse | null> {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11) return null;

  const response = await api.get(
    `/v1/antecipacao-capital/associado/${cpfLimpo}`
  );

  return response.data || null;
}

export async function buscarCidadesAntecipacao(): Promise<CidadeOption[]> {
  const response = await api.get("/v1/antecipacao-capital/cidades");
  return response.data || [];
}