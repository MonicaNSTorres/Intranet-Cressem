import { api } from "./api.service";

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

function buildQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      search.append(key, String(value));
    }
  });

  return search.toString();
}


export async function salvarAnaliseLimite(payload: unknown) {
  const response = await api.post(
    "/v1/analise_limite_cheque_cartao",
    payload
  );

  return response.data;
}


export async function listarAnalisesLimite(
  params: ListarAnalisesParams = {}
) {
  const query = buildQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    cpf: params.cpf ? onlyDigits(params.cpf) : "",
    nome: params.nome || "",
    funcionario: params.funcionario || "",
  });

  const response = await api.get(
    `/v1/analise_limite_cheque_cartao?${query}`
  );

  return response.data;
}


export async function buscarAnaliseLimitePorId(
  id: number | string
) {
  if (!id) {
    throw new Error("ID da análise não informado.");
  }

  const response = await api.get(
    `/v1/analise_limite_cheque_cartao/${id}`
  );

  return response.data;
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
  if (!idAnalise) {
    throw new Error("ID da análise não informado.");
  }

  if (!cpfCnpj) {
    throw new Error("CPF/CNPJ do associado não informado.");
  }

  if (!arquivo) {
    throw new Error("Arquivo da assinatura não informado.");
  }

  const formData = new FormData();

  formData.append("ID_ANALISE", String(idAnalise));
  formData.append(
    "NR_CPF_CNPJ_ASSOCIADO",
    onlyDigits(cpfCnpj)
  );
  formData.append("OFICIO", arquivo);

  const response = await api.put(
    "/v1/analise_limite_cheque_cartao_upload",
    formData
  );

  return response.data;
}


export async function downloadAssinaturaAnaliseLimite(
  caminho: string
) {
  if (!caminho) {
    throw new Error("Caminho da assinatura não informado.");
  }

  const response = await api.post<Blob>(
    "/v1/analise_limite_cheque_cartao_download",
    {
      oficio: caminho,
    },
    {
      responseType: "blob",
    }
  );

  const contentDisposition =
    response.headers["content-disposition"] || "";

  const nomeArquivo =
    extrairNomeArquivoContentDisposition(contentDisposition) ||
    extrairNomeArquivoCaminho(caminho) ||
    "assinatura.pdf";

  return {
    blob: response.data,
    nomeArquivo,
  };
}

function extrairNomeArquivoContentDisposition(
  contentDisposition: string
) {
  if (!contentDisposition) {
    return null;
  }


  const filenameUtf8Match = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i
  );

  if (filenameUtf8Match?.[1]) {
    try {
      return decodeURIComponent(
        filenameUtf8Match[1].replace(/["']/g, "")
      );
    } catch {
      return filenameUtf8Match[1].replace(/["']/g, "");
    }
  }


  const filenameMatch = contentDisposition.match(
    /filename="?([^";]+)"?/i
  );

  return filenameMatch?.[1]?.trim() || null;
}

function extrairNomeArquivoCaminho(caminho: string) {
  return caminho.split(/[\\/]/).pop() || null;
}