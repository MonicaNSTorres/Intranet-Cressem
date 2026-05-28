import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SisbrRow = {
  FW: string | number | null;
  LOCAL: string | null;
  IP: string | null;
  PROVEDOR: string | null;
  ANTIGO_PA: string | null;
  CNPJ: string | null;
};

export type BuscarTabelaSisbrTiResponse = SisbrRow[];

export async function buscarTabelaSisbrTi(): Promise<BuscarTabelaSisbrTiResponse> {
  try {
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

    return Array.isArray(json)
      ? (json as BuscarTabelaSisbrTiResponse)
      : [];
  } catch (error: any) {
    try {
      await registrarErroTela({
        PAGE_URL:
          typeof window !== "undefined"
            ? window.location.href
            : null,

        ERROR_MESSAGE:
          error?.message ||
          "Erro no service de SISBR TI",

        ERROR_STACK: error?.stack || null,

        ERROR_DETAIL: {
          endpoint: "/v1/tabela-sisbr-ti",
          method: "GET",
        },

        SOURCE: "SISBR_TI_FETCH",
      });
    } catch {
      //evita loop infinito
    }

    throw error;
  }
}