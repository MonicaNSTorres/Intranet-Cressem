import { registrarErroTela } from "./error_log.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type PatrocinioDia = {
  DT_DIA: string;
  HR_INICIO: string;
  HR_FIM: string;
};

export type PatrocinioItem = {
  ID_PATROCINIO: number;
  NM_SOLICITANTE: string;
  NR_CPF_CNPJ: string;
  NM_CIDADE: string;
  NM_FUNCIONARIO: string;
  DT_SOLICITACAO: string;
  NM_ANDAMENTO: string;
  CD_CONTA_COOPERATIVA: number;
  VL_SALDO_MEDCIOCC: number;
  DESC_SERVICOS: string;
  DESC_VINCULO: string;
  DESC_RETORNO_ULTIMO_EVENTO: string;
  VL_RENTABILIDADE_MAQUININHA: number;
  DESC_SOLICITACAO: string;
  DESC_RESUMO_EVENTO: string;
  CD_MOTORISTA: number;
  CD_FUNCIONARIOS: number;
  VL_MONETARIO: number;
  VL_PATROCINIO: number;
  VL_ESTIMATIVA: number;
  QTD_INSUMO: number;
  CD_AUDITORIO_CENTRO: number;
  CD_AUDITORIO_SEDE: number;
  DIR_OFICIO: string;
  DIR_DOC_SEM_FINS_LUCRATIVO: string;
  NM_GERENCIA: string;
  DESC_PARECER_GERENCIA: string;
  NM_DIRETORIA: string;
  DESC_PARECER_ESCRITO_DIRETORIA: string;
  NM_PARECER_CONSELHO: string;
  DESC_PARECER_ESCRITO_CONSELHO: string;
  NM_GERENTE_EVENTO: string;
  NM_SUGESTAO_PARTICIPANTES: string;
  DIAS: PatrocinioDia[];
};

export type PatrocinioPaginadoResponse = {
  items: PatrocinioItem[];
  total_pages: number;
  page: number;
  total?: number;
};

export type FuncionarioTipoResponse = {
  NM_FUNCIONARIO: string;
  TIPO: "funcionario" | "gerencia" | "diretoria" | "conselho";
};

function ensureApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }
  return API_URL;
}

async function registrarErroGerenciamentoParticipacao(
  error: any,
  detail: Record<string, any>,
  source: string
) {
  await registrarErroTela({
    PAGE_URL: typeof window !== "undefined" ? window.location.href : null,
    ERROR_MESSAGE:
      error?.message || "Erro no service de gerenciamento de participação",
    ERROR_STACK: error?.stack || null,
    ERROR_DETAIL: detail,
    SOURCE: source,
  });
}

export async function buscarPatrociniosPaginado(params: {
  nome: string;
  pesquisa: string;
  page?: number;
  limit?: number;
}): Promise<PatrocinioPaginadoResponse> {
  try {
    const api = ensureApiUrl();

    const url = new URL(`${api}/v1/funcionarios_sicoob_cressem_patrocinio_paginado`);
    url.searchParams.set("nome", params.nome);
    url.searchParams.set("pesquisa", params.pesquisa || " ");
    url.searchParams.set("page", String(params.page || 1));
    url.searchParams.set("limit", String(params.limit || 10));

    const res = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha ao buscar patrocínios.");
    }

    return json as PatrocinioPaginadoResponse;
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: "/v1/funcionarios_sicoob_cressem_patrocinio_paginado",
        method: "GET",
        params,
      },
      "GERENCIAMENTO_PARTICIPACAO_LISTAR"
    );

    throw error;
  }
}

export async function buscarFuncionarioTipo(nome: string): Promise<FuncionarioTipoResponse> {
  try {
    const api = ensureApiUrl();

    const res = await fetch(
      `${api}/v1/funcionarios_sicoob_cressem/nome_tipo/${encodeURIComponent(nome)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha ao buscar tipo do funcionário.");
    }

    return json as FuncionarioTipoResponse;
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: "/v1/funcionarios_sicoob_cressem/nome_tipo",
        method: "GET",
        nome,
      },
      "GERENCIAMENTO_PARTICIPACAO_FUNCIONARIO_TIPO"
    );

    throw error;
  }
}

export async function buscarPatrocinioPorId(id: number): Promise<PatrocinioItem> {
  try {
    const api = ensureApiUrl();

    const res = await fetch(`${api}/v1/patrocinio_cressem/${id}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha ao buscar solicitação.");
    }

    return json as PatrocinioItem;
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: `/v1/patrocinio_cressem/${id}`,
        method: "GET",
        id,
      },
      "GERENCIAMENTO_PARTICIPACAO_BUSCAR_ID"
    );

    throw error;
  }
}

export async function atualizarPatrocinio(id: number, payload: Record<string, any>) {
  try {
    const api = ensureApiUrl();

    const res = await fetch(`${api}/v1/patrocinio_cressem/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || "Falha ao atualizar solicitação.");
    }

    return json;
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: `/v1/patrocinio_cressem/${id}`,
        method: "PUT",
        id,
        payload,
      },
      "GERENCIAMENTO_PARTICIPACAO_ATUALIZAR"
    );

    throw error;
  }
}

export async function baixarArquivoPatrocinio(caminho: string): Promise<Blob> {
  try {
    const api = ensureApiUrl();

    const res = await fetch(`${api}/v1/patrocinio/download`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ oficio: caminho }),
    });

    if (!res.ok) {
      throw new Error("Falha ao baixar arquivo.");
    }

    return await res.blob();
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: "/v1/patrocinio/download",
        method: "POST",
        caminho,
      },
      "GERENCIAMENTO_PARTICIPACAO_BAIXAR_ARQUIVO"
    );

    throw error;
  }
}

export async function baixarRelatorioPatrocinios(): Promise<Blob> {
  try {
    const api = ensureApiUrl();

    const res = await fetch(`${api}/v1/download_patrocinios`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Falha ao baixar relatório.");
    }

    return await res.blob();
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: "/v1/download_patrocinios",
        method: "GET",
      },
      "GERENCIAMENTO_PARTICIPACAO_BAIXAR_RELATORIO"
    );

    throw error;
  }
}

export async function enviarEmailGerencia(funcionario: string, empresa: string, id: number) {
  try {
    const api = ensureApiUrl();
    const res = await fetch(
      `${api}/v1/email_informativo_gerencia/funcionario/${encodeURIComponent(funcionario)}/empresa/${encodeURIComponent(empresa)}/patrocinio/${id}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Falha ao enviar email para gerência.");
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: "/v1/email_informativo_gerencia",
        method: "GET",
        funcionario,
        empresa,
        id,
      },
      "GERENCIAMENTO_PARTICIPACAO_EMAIL_GERENCIA"
    );

    throw error;
  }
}

export async function enviarEmailDiretoria(funcionario: string, empresa: string, id: number) {
  try {
    const api = ensureApiUrl();
    const res = await fetch(
      `${api}/v1/email_informativo_diretoria/funcionario/${encodeURIComponent(funcionario)}/empresa/${encodeURIComponent(empresa)}/patrocinio/${id}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Falha ao enviar email para diretoria.");
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: "/v1/email_informativo_diretoria",
        method: "GET",
        funcionario,
        empresa,
        id,
      },
      "GERENCIAMENTO_PARTICIPACAO_EMAIL_DIRETORIA"
    );

    throw error;
  }
}

export async function enviarEmailConselho(id: number) {
  try {
    const api = ensureApiUrl();
    const res = await fetch(`${api}/v1/email_informativo_conselho/patrocinio/${id}`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Falha ao enviar email para conselho.");
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: `/v1/email_informativo_conselho/patrocinio/${id}`,
        method: "GET",
        id,
      },
      "GERENCIAMENTO_PARTICIPACAO_EMAIL_CONSELHO"
    );

    throw error;
  }
}

export async function enviarEmailParecerFinal(tipo: string, id: number) {
  try {
    const api = ensureApiUrl();
    const res = await fetch(
      `${api}/v1/email_informativo_parecer_final/tipo_funcionario/${encodeURIComponent(tipo)}/patrocinio/${id}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Falha ao enviar email final.");
  } catch (error: any) {
    await registrarErroGerenciamentoParticipacao(
      error,
      {
        endpoint: "/v1/email_informativo_parecer_final",
        method: "GET",
        tipo,
        id,
      },
      "GERENCIAMENTO_PARTICIPACAO_EMAIL_PARECER_FINAL"
    );

    throw error;
  }
}