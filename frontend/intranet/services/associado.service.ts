import { onlyDigits } from "@/utils/br";

export type BuscarPorCpfResponse =
  | { found: false }
  | {
      found: true;
      nome: string;
      matricula: string;
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
      endereco?: string;
      saldo_capital?: number;
    };

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function buscarFuncionarioPorCpf(
  cpf: string
): Promise<BuscarPorCpfResponse> {
  if (!API_URL)
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");

  const clean = onlyDigits(cpf);

  const res = await fetch(
    `${API_URL}/v1/associados/buscar-por-cpf?cpf=${clean}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "Falha na consulta.");
  }

  return json as BuscarPorCpfResponse;
}

