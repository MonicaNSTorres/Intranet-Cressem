import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CidadeResponse = {
  ID_CIDADES?: number;
  ID_UF?: number;
  NM_CIDADE?: string;
  nome?: string;
} | string;

async function registrarErroSolicitacaoParticipacao(
  error: any,
  detail: Record<string, any>,
  source: string
) {
  await registrarErroTela({
    PAGE_URL:
      typeof window !== "undefined" ? window.location.href : null,

    ERROR_MESSAGE:
      error?.message || "Erro no service de solicitação participação",

    ERROR_STACK: error?.stack || null,

    ERROR_DETAIL: detail,

    SOURCE: source,
  });
}

export async function listarCidades(): Promise<CidadeResponse[]> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const res = await fetch(`${API_URL}/v1/cidades`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json().catch(() => []);

    if (!res.ok) {
      throw new Error("Falha ao carregar cidades.");
    }

    return json as CidadeResponse[];
  } catch (error: any) {
    await registrarErroSolicitacaoParticipacao(
      error,
      {
        endpoint: "/v1/cidades",
        method: "GET",
      },
      "SOLICITACAO_PARTICIPACAO_CIDADES"
    );

    throw error;
  }
}

export async function cadastrarSolicitacaoParticipacao(
  formData: FormData
): Promise<any> {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const res = await fetch(`${API_URL}/v1/patrocinio_cressem`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha ao cadastrar solicitação.");
    }

    return json;
  } catch (error: any) {
    await registrarErroSolicitacaoParticipacao(
      error,
      {
        endpoint: "/v1/patrocinio_cressem",
        method: "POST",
      },
      "SOLICITACAO_PARTICIPACAO_CADASTRAR"
    );

    throw error;
  }
}

export async function dispararEmailGerencia(opts: {
  funcionario: string;
  empresa: string;
  patrocinioId: string | number;
}) {
  try {
    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
    }

    const { funcionario, empresa, patrocinioId } = opts;

    const res = await fetch(
      `${API_URL}/v1/email_informativo_gerencia/funcionario/${encodeURIComponent(
        funcionario
      )}/empresa/${encodeURIComponent(empresa)}/patrocinio/${patrocinioId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error("Falha ao enviar e-mail informativo para gerência.");
    }

    return true;
  } catch (error: any) {
    await registrarErroSolicitacaoParticipacao(
      error,
      {
        endpoint: "/v1/email_informativo_gerencia",
        method: "GET",
        opts,
      },
      "SOLICITACAO_PARTICIPACAO_EMAIL_GERENCIA"
    );

    throw error;
  }
}