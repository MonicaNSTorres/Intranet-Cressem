import { api } from "./api.service";
import { onlyDigits } from "@/utils/br";

export type AssociadoPorCpfResponse = {
  found: boolean;
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

export async function buscarFuncionarioPorCpfTermo(
  cpf: string
): Promise<AssociadoPorCpfResponse> {
  const cpfLimpo = onlyDigits(cpf);

  const { data } = await api.get<AssociadoPorCpfResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: {
        cpf: cpfLimpo,
      },
      timeout: 30000,
    }
  );

  return data;
}