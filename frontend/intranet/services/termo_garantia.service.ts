import { onlyDigits } from "@/utils/br";
import { api } from "./api.service";

export type AssociadoTermoGarantiaResponse = {
  ID_CLIENTE?: number | null;
  NM_CLIENTE?: string;
  NR_CPF_CNPJ?: string;
  NM_CIDADE?: string;
};

export type CidadeOption = {
  ID_CIDADES: number;
  ID_UF: number;
  NM_CIDADE: string;
};

export async function buscarAssociadoAnaliticoTermoGarantia(
  cpf: string
): Promise<AssociadoTermoGarantiaResponse | null> {
  const clean = onlyDigits(cpf);

  if (!clean) {
    return null;
  }

  const { data } = await api.get<AssociadoTermoGarantiaResponse>(
    `/v1/associado_analitico/${clean}`
  );

  return data || null;
}

export async function listarCidadesTermoGarantia(): Promise<CidadeOption[]> {
  const { data } = await api.get<CidadeOption[]>(
    "/v1/simulador/cidades"
  );

  return Array.isArray(data) ? data : [];
}
