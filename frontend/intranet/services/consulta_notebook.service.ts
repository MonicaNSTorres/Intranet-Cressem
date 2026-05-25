import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type NotebookRow = {
  ID_NOTEBOOKS_SICOOB: number | string;
  NM_NOTEBOOK: string | null;
  NM_MODELO: string | null;
  DT_INICIO_OPERACAO: string | null;
  DT_GARANTIA: string | null;
  NR_MAC: string | null;
  CD_PATRIMONIO: number | string | null;
  NR_IP: string | null;
  NR_BITLOCKER: string | null;
  OBS_NOTEBOOKS_SICOOB: string | null;
  ID_FUNCIONARIO: number | string | null;
  NM_FUNCIONARIO_TI: string | null;
  NM_FUNCIONARIO_RECEBEU: string | null;
  DIR_TERMO_ASSINADO?: string | null;
  DESC_SITUACAO: string | null;
};

export type BuscarNotebooksResponse = {
  data: NotebookRow[];
};

export type FuncionarioOption = {
  ID_FUNCIONARIO: number | string | null;
  NM_FUNCIONARIO: string | null;
};

export type BuscarFuncionariosResponse = {
  data: FuncionarioOption[];
};

export type AtualizarNotebookPayload = {
  NM_NOTEBOOK: string;
  NM_MODELO: string | null;
  DT_INICIO_OPERACAO: string | null;
  DT_GARANTIA: string | null;
  NR_MAC: string | null;
  CD_PATRIMONIO: number | null;
  NR_IP: string | null;
  NR_BITLOCKER: string | null;
  OBS_NOTEBOOKS_SICOOB: string | null;
  ID_FUNCIONARIO: number | null;
  NM_FUNCIONARIO_TI: string | null;
  DESC_SITUACAO: string | null;
};

export type AtualizarNotebookResponse = {
  success: boolean;
  message: string;
};

export async function buscarNotebooks(
  q?: string
): Promise<BuscarNotebooksResponse> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const url = new URL(`${API_URL}/v1/consulta-notebook`);

    if (q?.trim()) {
      url.searchParams.set("q", q.trim());
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha na consulta.");
    }

    return json as BuscarNotebooksResponse;
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
      ERROR_MESSAGE: error?.message || "Erro ao buscar notebooks",
      ERROR_STACK: error?.stack || null,
      ERROR_DETAIL: {
        endpoint: "/v1/consulta-notebook",
        method: "GET",
        query: q,
      },
      SOURCE: "BUSCAR_NOTEBOOKS",
    });

    throw error;
  }
}

export async function buscarFuncionariosNotebook(
  q?: string
): Promise<BuscarFuncionariosResponse> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const url = new URL(`${API_URL}/v1/funcionarios-notebook`);

    if (q?.trim()) {
      url.searchParams.set("q", q.trim());
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha ao buscar funcionários.");
    }

    return json as BuscarFuncionariosResponse;
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
      ERROR_MESSAGE: error?.message || "Erro ao buscar funcionários notebook",
      ERROR_STACK: error?.stack || null,
      ERROR_DETAIL: {
        endpoint: "/v1/funcionarios-notebook",
        method: "GET",
        query: q,
      },
      SOURCE: "BUSCAR_FUNCIONARIOS_NOTEBOOK_CONSULTA",
    });

    throw error;
  }
}

export async function atualizarNotebook(
  id: string,
  payload: AtualizarNotebookPayload
): Promise<AtualizarNotebookResponse> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const res = await fetch(`${API_URL}/v1/consulta-notebook/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha ao atualizar notebook.");
    }

    return json as AtualizarNotebookResponse;
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
      ERROR_MESSAGE: error?.message || "Erro ao atualizar notebook",
      ERROR_STACK: error?.stack || null,
      ERROR_DETAIL: {
        endpoint: `/v1/consulta-notebook/${id}`,
        method: "PUT",
        id,
        payload,
      },
      SOURCE: "ATUALIZAR_NOTEBOOK",
    });

    throw error;
  }
}