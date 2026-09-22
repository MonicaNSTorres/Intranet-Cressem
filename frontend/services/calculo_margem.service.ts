import { onlyDigits } from "@/utils/br";
import { api } from "./api.service";

export type AssociadoMargemResponse = {
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
};

export async function buscarAssociadoMargemPorCpf(
  cpf: string
): Promise<AssociadoMargemResponse | null> {
  const clean = onlyDigits(cpf);

  if (!clean) {
    return null;
  }

  const response = await api.get<AssociadoMargemResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: {
        cpf: clean,
      },
    }
  );

  return response.data;
}