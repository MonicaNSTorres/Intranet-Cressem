const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type RamalRow = {
  ID: number | string;
  RAMAL: string | number | null;
  NOME: string | null;
  DEPARTAMENTO: string | null;
  EMAIL: string | null;
  LOGIN: string | null;
  CIDADE?: string | null;
};

export type BuscarRamaisResponse = {
  data: RamalRow[];
};

export type BuscarRamaisParams = {
  q?: string;
  nome?: string;
  ramal?: string;
  departamento?: string;
  cidade?: string;
  login?: string;
  email?: string;
  sortBy?: "nome" | "ramal" | "departamento";
  sortOrder?: "asc" | "desc";
};

export async function buscarRamais(
  params: BuscarRamaisParams = {}
): Promise<BuscarRamaisResponse> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const url = new URL(`${API_URL}/v1/ramais`);

  if (params.q?.trim()) {
    url.searchParams.set("q", params.q.trim());
  }

  if (params.nome?.trim()) {
    url.searchParams.set("nome", params.nome.trim());
  }

  if (params.ramal?.trim()) {
    url.searchParams.set("ramal", params.ramal.trim());
  }

  if (params.departamento?.trim()) {
    url.searchParams.set("departamento", params.departamento.trim());
  }

  if (params.cidade?.trim()) {
    url.searchParams.set("cidade", params.cidade.trim());
  }

  if (params.login?.trim()) {
    url.searchParams.set("login", params.login.trim());
  }

  if (params.email?.trim()) {
    url.searchParams.set("email", params.email.trim());
  }

  if (params.sortBy?.trim()) {
    url.searchParams.set("sortBy", params.sortBy.trim());
  }

  if (params.sortOrder?.trim()) {
    url.searchParams.set("sortOrder", params.sortOrder.trim());
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