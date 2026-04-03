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

export async function buscarAssociadoAutorizacaoDebito(
  cpf: string
): Promise<AssociadoAutorizacaoDebitoResponse | null> {
  const clean = onlyDigits(cpf);
  if (!clean) return null;

  return await getJson<AssociadoAutorizacaoDebitoResponse>(
    `/v1/associados/buscar-por-cpf?cpf=${clean}`
  );
}

export async function listarCidadesAutorizacaoDebito() {
  return await getJson<CidadeOption[]>(`/v1/simulador/cidades`);
}