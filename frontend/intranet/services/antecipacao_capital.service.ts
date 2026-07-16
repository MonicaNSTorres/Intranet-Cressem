import { api } from "./api.service";

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

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function buscarAssociadoAntecipacaoPorCpf(
  cpf: string
): Promise<AssociadoAntecipacaoResponse | null> {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11) {
    return null;
  }

  const response = await api.get<AssociadoAntecipacaoResponse | null>(
    `/v1/antecipacao-capital/associado/${cpfLimpo}`
  );

  return response.data || null;
}

export async function buscarCidadesAntecipacao(): Promise<CidadeOption[]> {
  const response = await api.get<CidadeOption[]>(
    "/v1/antecipacao-capital/cidades"
  );

  return response.data || [];
}