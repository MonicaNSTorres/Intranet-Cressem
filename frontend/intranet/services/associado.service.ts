import { onlyCpfCnpjChars } from "@/utils/br";
import { api } from "@/services/api.service";

export type BuscarPorCpfResponse =
  | { found: false }
  | {
      found: true;
      nome: string;
      matricula: string;
      nascimento?: string;
      cpf?: string;
      rg?: string;
      rua?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
      empresa?: string;
      cargo?: string;
      data_matricula_cooperativa?: string;
      endereco?: string;
      telefone?: string;
      email?: string;
      documento?: string;
      orgao?: string;
      iap?: string;
      portabilidade?: string;
      cartao?: string;
      limite_chque?: string;
      limite_cartao?: string;
      saldo_capital?: string;
      conta_corrente?: string;
      nr_conta_corrente?: string;
    };

export async function buscarFuncionarioPorCpf(
  cpf: string
): Promise<BuscarPorCpfResponse> {
  const clean = onlyCpfCnpjChars(cpf);

  if (!clean) {
    throw new Error("CPF não informado.");
  }

  const response = await api.get<BuscarPorCpfResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: {
        cpf: clean,
      },
    }
  );

  return response.data;
}