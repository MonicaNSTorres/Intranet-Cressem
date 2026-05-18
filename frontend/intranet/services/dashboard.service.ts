export type BuscarAcessosSemanaResponse = {
  DIA: string;
  ACESSOS: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function buscarAcessosSemana() {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL não definido no .env do front"
    );
  }

  const res = await fetch(
    `${API_URL}/v1/dashboard/acessos`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const json = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(
      json?.error || "Falha ao buscar acessos."
    );
  }

  return (json as BuscarAcessosSemanaResponse[]).map(
    (item) => ({
      dia: item.DIA,
      acessos: Number(item.ACESSOS || 0),
    })
  );
}