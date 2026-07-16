import { onlyDigits } from "@/utils/br";
import { api } from "./api.service";

export type AssociadoAutorizacaoDebitoResponse = {
  found?: boolean;
  nome?: string;
  matricula?: string;
  nascimento?: string;
  empresa?: string;
  cpf?: string;
  bairro?: string;
  cidade?: string;
  rua?: string;
  uf?: string;
  cep?: string;
  conta?: string;
};

export type CidadeOption = {
  ID_CIDADES: number;
  ID_UF: number;
  NM_CIDADE: string;
};

export type ContaCorrenteItem = {
  NR_CONTA_CORRENTE: string;
};

export async function buscarAssociadoAutorizacaoDebito(
  cpf: string
): Promise<AssociadoAutorizacaoDebitoResponse | null> {
  const clean = onlyDigits(cpf);

  if (!clean) {
    return null;
  }

  const response = await api.get<AssociadoAutorizacaoDebitoResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: {
        cpf: clean,
      },
    }
  );

  return response.data;
}

export async function buscarContaCorrenteAutorizacaoDebito(
  cpf: string
): Promise<ContaCorrenteItem[]> {
  const clean = onlyDigits(cpf);

  if (!clean) {
    return [];
  }

  const response = await api.get<ContaCorrenteItem[]>(
    "/v1/autorizacao-debito",
    {
      params: {
        cpf: clean,
      },
    }
  );

  return response.data || [];
}

export async function listarCidadesAutorizacaoDebito(): Promise<
  CidadeOption[]
> {
  const response = await api.get<CidadeOption[]>(
    "/v1/simulador/cidades"
  );

  return response.data || [];
}