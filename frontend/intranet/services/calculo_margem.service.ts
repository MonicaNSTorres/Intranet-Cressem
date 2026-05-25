import { onlyDigits } from "@/utils/br";
import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getJson<T>(path: string): Promise<T> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "include",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        json?.error || json?.detail || "Falha na consulta."
      );
    }

    return json as T;
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL:
        typeof window !== "undefined"
          ? window.location.href
          : null,

      ERROR_MESSAGE:
        error?.message || "Erro no service de cálculo de margem",

      ERROR_STACK: error?.stack || null,

      ERROR_DETAIL: {
        endpoint: path,
        method: "GET",
      },

      SOURCE: "CALCULO_MARGEM",
    });

    throw error;
  }
}

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

  if (!clean) return null;

  return await getJson<AssociadoMargemResponse>(
    `/v1/associados/buscar-por-cpf?cpf=${clean}`
  );
}