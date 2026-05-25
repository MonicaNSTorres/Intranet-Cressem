import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type AniversarianteResponseItem = {
  nome: string;
  setor: string;
  ramal: string;
  dia?: number;
};

export type BuscarAniversariantesResponse = {
  data: AniversarianteResponseItem[];
};

export async function buscarAniversariantesPorMes(
  mes: number
): Promise<BuscarAniversariantesResponse> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const res = await fetch(
      `${API_URL}/v1/aniversariantes?mes=${mes}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha na consulta.");
    }

    return json as BuscarAniversariantesResponse;
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL:
        typeof window !== "undefined" ? window.location.href : null,

      ERROR_MESSAGE:
        error?.message || "Erro ao buscar aniversariantes",

      ERROR_STACK: error?.stack || null,

      ERROR_DETAIL: {
        endpoint: "/v1/aniversariantes",
        method: "GET",
        mes,
      },

      SOURCE: "BUSCAR_ANIVERSARIANTES",
    });

    throw error;
  }
}