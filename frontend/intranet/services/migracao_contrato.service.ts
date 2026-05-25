import { onlyDigits } from "@/utils/br";
import { registrarErroTela } from "./error_log.service";

export type BuscarMigracaoContratoResponse =
  | { found: false }
  | {
      found: true;
      nascimento: string;
      cargo: string;
      salario: number;
      admissao?: string;
      cpf: string;
      situacao: string;
      matricula: string;
    };

export type MigracaoContratoLinhaPayload = {
  DT_NASCIMENTO: string;
  NM_CARGO: string;
  VL_RENDA_BRUTA: number | null;
  DT_ADMISSAO: string;
  NR_CPF_CNPJ: string;
  DESC_SITUACAO: string;
  NR_MATRICULA: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function registrarErroMigracaoContrato(
  error: any,
  detail: Record<string, any>,
  source: string
) {
  await registrarErroTela({
    PAGE_URL:
      typeof window !== "undefined" ? window.location.href : null,

    ERROR_MESSAGE:
      error?.message || "Erro no service de migração de contrato",

    ERROR_STACK: error?.stack || null,

    ERROR_DETAIL: detail,

    SOURCE: source,
  });
}

export async function buscarMigracaoContratoPorCpf(
  cpf: string
): Promise<BuscarMigracaoContratoResponse> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const clean = onlyDigits(cpf);

    const res = await fetch(`${API_URL}/v1/migracao-contrato/cpf/${clean}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha na consulta.");
    }

    return json as BuscarMigracaoContratoResponse;
  } catch (error: any) {
    await registrarErroMigracaoContrato(
      error,
      {
        endpoint: "/v1/migracao-contrato/cpf",
        method: "GET",
        cpf,
      },
      "MIGRACAO_CONTRATO_BUSCAR_CPF"
    );

    throw error;
  }
}

export async function gerarArquivoMigracaoContrato(
  payload: MigracaoContratoLinhaPayload[]
): Promise<Blob> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const res = await fetch(`${API_URL}/v1/migracao-contrato/gerar-arquivo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMessage = "Falha ao gerar arquivo.";
      try {
        const json = await res.json();
        errorMessage = json?.error || errorMessage;
      } catch {
        
      }
      throw new Error(errorMessage);
    }

    return await res.blob();
  } catch (error: any) {
    await registrarErroMigracaoContrato(
      error,
      {
        endpoint: "/v1/migracao-contrato/gerar-arquivo",
        method: "POST",
        payload,
      },
      "MIGRACAO_CONTRATO_GERAR_ARQUIVO"
    );

    throw error;
  }
}