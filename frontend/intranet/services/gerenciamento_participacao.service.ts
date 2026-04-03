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

export async function buscarPatrociniosPaginado(params: {
  nome: string;
  pesquisa: string;
  page?: number;
  limit?: number;
}): Promise<PatrocinioPaginadoResponse> {
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
}

export async function buscarFuncionarioTipo(nome: string): Promise<FuncionarioTipoResponse> {
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
}

export async function buscarPatrocinioPorId(id: number): Promise<PatrocinioItem> {
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
}

export async function atualizarPatrocinio(id: number, payload: Record<string, any>) {
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
}

export async function baixarArquivoPatrocinio(caminho: string): Promise<Blob> {
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
}

export async function baixarRelatorioPatrocinios(): Promise<Blob> {
  const api = ensureApiUrl();

  const res = await fetch(`${api}/v1/download_patrocinios`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Falha ao baixar relatório.");
  }

  return await res.blob();
}

export async function enviarEmailGerencia(funcionario: string, empresa: string, id: number) {
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
}

export async function enviarEmailDiretoria(funcionario: string, empresa: string, id: number) {
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
}

export async function enviarEmailConselho(id: number) {
  const api = ensureApiUrl();
  const res = await fetch(`${api}/v1/email_informativo_conselho/patrocinio/${id}`, {
    method: "GET",
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Falha ao enviar email para conselho.");
}

export async function enviarEmailParecerFinal(tipo: string, id: number) {
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
}