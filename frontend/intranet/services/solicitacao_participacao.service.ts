const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CidadeResponse = {
  ID_CIDADES: number;
  ID_UF: number;
  NM_CIDADE: string;
};

export async function listarCidades(): Promise<CidadeResponse[]> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}/v1/cidades`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const json = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error("Falha ao carregar cidades.");
  }

  return json as CidadeResponse[];
}

export async function cadastrarSolicitacaoParticipacao(
  formData: FormData
): Promise<any> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}/v1/patrocinio_cressem`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "Falha ao cadastrar solicitação.");
  }

  return json;
}

export async function dispararEmailGerencia(opts: {
  funcionario: string;
  empresa: string;
  patrocinioId: string | number;
}) {
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
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Falha ao enviar e-mail informativo para gerência.");
  }

  return true;
}