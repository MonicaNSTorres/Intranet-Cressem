const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ListarAnalisesParams = {
  page?: number;
  limit?: number;
  cpf?: string;
  nome?: string;
  funcionario?: string;
};

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function buildQuery(params: Record<string, any>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.append(key, String(value));
    }
  });

  return search.toString();
}

export async function salvarAnaliseLimite(payload: any) {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não definido");

  const res = await fetch(`${API_URL}/v1/analise_limite_cheque_cartao`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || json?.details || "Erro ao salvar análise.");
  }

  return json;
}

export async function listarAnalisesLimite(
  params: ListarAnalisesParams = {}
) {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não definido");

  const query = buildQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    cpf: params.cpf ? onlyDigits(params.cpf) : "",
    nome: params.nome || "",
    funcionario: params.funcionario || "",
  });

  const res = await fetch(
    `${API_URL}/v1/analise_limite_cheque_cartao?${query}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || json?.details || "Erro ao listar análises.");
  }

  return json;
}

export async function buscarAnaliseLimitePorId(id: number | string) {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não definido");
  if (!id) throw new Error("ID da análise não informado.");

  const res = await fetch(`${API_URL}/v1/analise_limite_cheque_cartao/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || json?.details || "Erro ao buscar análise.");
  }

  return json;
}

export async function uploadAssinaturaAnaliseLimite({
  idAnalise,
  cpfCnpj,
  arquivo,
}: {
  idAnalise: number | string;
  cpfCnpj: string;
  arquivo: File;
}) {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não definido");

  const formData = new FormData();
  formData.append("ID_ANALISE", String(idAnalise));
  formData.append("NR_CPF_CNPJ_ASSOCIADO", cpfCnpj);
  formData.append("OFICIO", arquivo);

  const res = await fetch(`${API_URL}/v1/analise_limite_cheque_cartao_upload`, {
    method: "PUT",
    body: formData,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      json?.error || json?.details || "Erro ao salvar assinatura."
    );
  }

  return json;
}

export async function downloadAssinaturaAnaliseLimite(caminho: string) {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não definido");

  const res = await fetch(`${API_URL}/v1/analise_limite_cheque_cartao_download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ oficio: caminho }),
  });

  if (!res.ok) {
    let json: any = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }

    throw new Error(
      json?.error || json?.details || "Erro ao baixar assinatura."
    );
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition") || "";

  const nomeArquivo = contentDisposition.includes("filename=")
    ? contentDisposition.split("filename=")[1].replace(/"/g, "")
    : caminho.split("/").pop() || "assinatura.pdf";

  return {
    blob,
    nomeArquivo,
  };
}