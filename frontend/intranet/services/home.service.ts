const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { registrarErroTela } from "./error_log.service";

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

async function registrarErroHome(
  error: any,
  detail: Record<string, any>,
  source: string
) {
  await registrarErroTela({
    PAGE_URL:
      typeof window !== "undefined" ? window.location.href : null,

    ERROR_MESSAGE:
      error?.message || "Erro no service da home",

    ERROR_STACK: error?.stack || null,

    ERROR_DETAIL: detail,

    SOURCE: source,
  });
}

export async function buscarResumoKpis(): Promise<KpisResumoResponse> {
  try {
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
  } catch (error: any) {
    await registrarErroHome(
      error,
      {
        endpoint: "/v1/kpis/resumo",
        method: "GET",
      },
      "HOME_BUSCAR_RESUMO_KPIS"
    );

    throw error;
  }
}

export async function buscarAniversariantesHoje(): Promise<AniversariantesHojeResponse> {
  try {
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
  } catch (error: any) {
    await registrarErroHome(
      error,
      {
        endpoint: "/v1/aniversariantes/hoje",
        method: "GET",
      },
      "HOME_BUSCAR_ANIVERSARIANTES_HOJE"
    );

    throw error;
  }
}