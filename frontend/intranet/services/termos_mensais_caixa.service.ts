const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type StatusTermoMensalCaixa =
  | "RASCUNHO"
  | "PREENCHIDO"
  | "PDF_GERADO"
  | "ASSINADO_ANEXADO"
  | "CONCLUIDO";

export type PAOption = {
  ID_PA_ATUALIZADA: number;
  NR_PA: number;
  NM_PA: string;
  NM_FANTASIA: string;
};

export type TermoMensalCaixa = {
  ID_TERMOS_MENSAIS_CAIXA: number;
  DT_COMPETENCIA: string;
  NM_PA: string;
  DS_DADOS_FORMULARIO?: any;
  SN_STATUS: StatusTermoMensalCaixa;
  NM_ARQUIVO_GERADO?: string;
  NM_CAMINHO_ARQUIVO_GERADO?: string;
  NM_ARQUIVO_ASSINADO?: string;
  NM_CAMINHO_ARQUIVO_ASSINADO?: string;
  DT_UPLOAD_ASSINADO?: string;
  NM_USUARIO_CRIACAO?: string;
  DT_CRIACAO?: string;
  NM_USUARIO_ATUALIZACAO?: string;
  DT_ATUALIZACAO?: string;
};

export type SalvarTermoMensalCaixaPayload = {
  competencia: string;
  pa: string;
  dadosFormulario: any;
  status?: StatusTermoMensalCaixa;
  usuarioCriacao?: string;
  usuarioAtualizacao?: string;
};

export async function listarPAsTermoMensalCaixa() {
  const res = await fetch(`${API_URL}/v1/termos-mensais-caixa/pas`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "Erro ao listar PAs.");
  }

  return json as {
    success: boolean;
    data: PAOption[];
  };
}

export async function listarTermosMensaisCaixa(params?: {
  competencia?: string;
  pa?: string;
  status?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.competencia) searchParams.append("competencia", params.competencia);
  if (params?.pa) searchParams.append("pa", params.pa);
  if (params?.status) searchParams.append("status", params.status);

  const res = await fetch(
    `${API_URL}/v1/termos-mensais-caixa?${searchParams.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "Erro ao listar termos mensais caixa.");
  }

  return json as {
    success: boolean;
    data: TermoMensalCaixa[];
  };
}

export async function obterTermoMensalCaixaPorId(id: number) {
  const res = await fetch(`${API_URL}/v1/termos-mensais-caixa/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "Erro ao buscar termo mensal caixa.");
  }

  return json as {
    success: boolean;
    data: TermoMensalCaixa;
  };
}

export async function criarTermoMensalCaixa(
  payload: SalvarTermoMensalCaixaPayload
) {
  const res = await fetch(`${API_URL}/v1/termos-mensais-caixa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      String(json?.details || "").includes("ORA-00001")
        ? "Já existe um termo mensal cadastrado para essa competência e PA."
        : json?.error || "Erro ao criar termo mensal caixa."
    );
  }

  return json;
}

export async function atualizarTermoMensalCaixa(
  id: number,
  payload: SalvarTermoMensalCaixaPayload
) {
  const res = await fetch(`${API_URL}/v1/termos-mensais-caixa/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      String(json?.details || "").includes("ORA-00001")
        ? "Já existe um termo mensal cadastrado para essa competência e PA."
        : json?.error || "Erro ao atualizar termo mensal caixa."
    );
  }

  return json;
}

export async function alterarStatusTermoMensalCaixa(data: {
  id: number;
  status: StatusTermoMensalCaixa;
  usuarioAtualizacao?: string;
}) {
  const res = await fetch(`${API_URL}/v1/termos-mensais-caixa/${data.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: data.status,
      usuarioAtualizacao: data.usuarioAtualizacao || "INTRANET",
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "Erro ao alterar status do termo.");
  }

  return json;
}

export async function uploadTermoMensalCaixaAssinado(data: {
  id: number;
  arquivo: File;
  usuarioAtualizacao?: string;
}) {
  const formData = new FormData();

  formData.append("arquivo", data.arquivo);
  formData.append("usuarioAtualizacao", data.usuarioAtualizacao || "INTRANET");

  const res = await fetch(
    `${API_URL}/v1/termos-mensais-caixa/${data.id}/assinado`,
    {
      method: "POST",
      body: formData,
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "Erro ao anexar termo assinado.");
  }

  return json;
}

export function getDownloadTermoMensalCaixaAssinadoUrl(id: number) {
  return `${API_URL}/v1/termos-mensais-caixa/${id}/assinado/download`;
}