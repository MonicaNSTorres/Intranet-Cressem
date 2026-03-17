const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type KpisResumoResponse = {
  totalCooperados?: number;
  totalFuncionarios?: number;
  totalPAs?: number;
  totalRamal?: number;
};

export type AniversarianteHojeRow = {
  nome?: string;
  setor?: string;
  ramal?: string;
  NOME?: string;
  SETOR?: string;
  RAMAL?: string;
};

export type AniversariantesHojeResponse = {
  data: AniversarianteHojeRow[];
};

export async function buscarResumoKpis(): Promise<KpisResumoResponse> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}/v1/kpis/resumo`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "Falha na consulta.");
  }

  return json as KpisResumoResponse;
}

export async function buscarAniversariantesHoje(): Promise<AniversariantesHojeResponse> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}/v1/aniversariantes/hoje`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "Falha na consulta.");
  }

  return json as AniversariantesHojeResponse;
}