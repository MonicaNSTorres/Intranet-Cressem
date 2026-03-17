const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SisbrRow = {
  FW: string | number | null;
  LOCAL: string | null;
  SISBR: string | null;
  IP: string | null;
  PROVEDOR: string | null;
  LINK_SISBR: string | null;
};

export type BuscarTabelaSisbrTiResponse = SisbrRow[];

export async function buscarTabelaSisbrTi(): Promise<BuscarTabelaSisbrTiResponse> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}/v1/tabela-sisbr-ti`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const json = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(json?.error || "Falha na consulta.");
  }

  return Array.isArray(json) ? (json as BuscarTabelaSisbrTiResponse) : [];
}