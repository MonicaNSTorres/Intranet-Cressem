import { onlyDigits } from "@/utils/br";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getJson<T>(path: string): Promise<T> {
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