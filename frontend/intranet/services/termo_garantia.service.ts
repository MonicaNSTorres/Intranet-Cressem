import { onlyDigits } from "@/utils/br";
import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function registrarErroTermoGarantia(
  error: any,
  detail: Record<string, any>,
  source: string
) {
  await registrarErroTela({
    PAGE_URL:
      typeof window !== "undefined" ? window.location.href : null,

    ERROR_MESSAGE:
      error?.message || "Erro no service de termo garantia",

    ERROR_STACK: error?.stack || null,

    ERROR_DETAIL: detail,

    SOURCE: source,
  });
}

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
      throw new Error(json?.error || json?.detail || "Falha na consulta.");
    }

    return json as T;
  } catch (error: any) {
    await registrarErroTermoGarantia(
      error,
      {
        endpoint: path,
        method: "GET",
      },
      "TERMO_GARANTIA_GET"
    );

    throw error;
  }
}

export type AssociadoTermoGarantiaResponse = {
  ID_CLIENTE?: number | null;
  NM_CLIENTE?: string;
  NR_CPF_CNPJ?: string;
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

  if (!clean) return null;

  return await getJson<AssociadoTermoGarantiaResponse>(
    `/v1/associado_analitico/${clean}`
  );
}

export async function listarCidadesTermoGarantia() {
  return await getJson<CidadeOption[]>(`/v1/simulador/cidades`);
}