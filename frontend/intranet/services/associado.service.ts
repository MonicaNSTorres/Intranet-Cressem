import { onlyDigits } from "@/utils/br";
import { registrarErroTela } from "@/services/error_log.service";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function buscarFuncionarioPorCpf(
  cpf: string
): Promise<BuscarPorCpfResponse> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const clean = onlyDigits(cpf);

    const res = await fetch(
      `${API_URL}/associados/buscar-por-cpf?cpf=${clean}`,
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
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL:
        typeof window !== "undefined" ? window.location.href : null,

      ERROR_MESSAGE:
        error?.message || "Erro ao buscar funcionário por CPF",

      ERROR_STACK: error?.stack || null,

      ERROR_DETAIL: {
        cpf,
        apiUrl: `${API_URL}/associados/buscar-por-cpf`,
      },

      SOURCE: "BUSCAR_FUNCIONARIO_CPF",
    });

    throw error;
  }
}