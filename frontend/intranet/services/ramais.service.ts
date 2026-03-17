const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type RamalRow = {
  ID: number | string;
  RAMAL: string | number | null;
  NOME: string | null;
  DEPARTAMENTO: string | null;
  EMAIL: string | null;
  LOGIN: string | null;
};

export type BuscarRamaisResponse = {
  data: RamalRow[];
};

export async function buscarRamais(q?: string): Promise<BuscarRamaisResponse> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const url = new URL(`${API_URL}/v1/ramais`);

  if (q?.trim()) {
    url.searchParams.set("q", q.trim());
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "Falha na consulta.");
  }

  return json as BuscarRamaisResponse;
}