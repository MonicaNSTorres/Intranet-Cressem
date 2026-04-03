import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
    timeout: 30000,
});

export type SetorFuncionarioItem = {
    ID_SETOR: number;
    NM_SETOR: string;
    NM_ENDERECO?: string;
    NR_RAMAL?: string;
    SN_ATIVO: number;
};

export type CargoFuncionarioItem = {
    ID_CARGO: number;
    NM_CARGO: string;
    NM_NIVEL?: string;
    SN_ATIVO: number;
    ID_POSICAO?: number | null;
};

export type GerenciaFuncionarioItem = {
    ID_FUNCIONARIO: number;
    NM_FUNCIONARIO: string;
    SN_ATIVO: number;
};

export type FuncionarioItem = {
    ID_FUNCIONARIO: number;
    NM_FUNCIONARIO: string;
    DT_NASCIMENTO?: string | null;
    ID_SETOR: number;
    ID_CARGO?: number | null;
    NR_RAMAL?: string | null;
    SN_ATIVO?: number | null;
    CD_GERENCIA?: number | null;
    EMAIL?: string | null;
    NR_CPF?: string | null;
    NR_RG?: string | null;
    NR_CELULAR?: string | null;
    SEXO?: string | null;
    DT_ADMISSAO?: string | null;
    DT_DESLIGAMENTO?: string | null;
    NR_MATRICULA?: string | null;
    NR_CONTA_CORRENTE?: string | null;
    DOC_INDENTIDADE?: string | null;
    COMP_ENDERECO?: string | null;
    FICHA_RH?: string | null;
    CERT_NASCIMENTO?: string | null;
    CERT_CASAMENTO?: string | null;
    DOC_IDENTIDADE_CONJ?: string | null;
    FICHA_DESIMPEDIMENTO?: string | null;
    SETOR?: {
        ID_SETOR: number;
        NM_SETOR: string;
    } | null;
    CARGO?: {
        ID_CARGO: number;
        NM_CARGO: string;
    } | null;
};

export type FuncionarioPaginadoResponse = {
    items: FuncionarioItem[];
    total_pages: number;
    total?: number;
};

export async function buscarFuncionariosPaginados(params: {
    nome?: string;
    page?: number;
    limit?: number;
}) {
    const response = await api.get<FuncionarioPaginadoResponse>(
        "/v1/funcionarios_sicoob_cressem_paginado",
        { params }
    );

    return response.data;
}

export async function buscarTodosFuncionarios() {
    const response = await api.get<FuncionarioItem[]>("/v1/funcionarios_sicoob_cressem");
    return response.data;
}

export async function buscarSetoresFuncionario() {
    const response = await api.get<SetorFuncionarioItem[]>("/v1/setor_sicoob_cressem");
    return response.data;
}

export async function buscarCargosFuncionario() {
    const response = await api.get<CargoFuncionarioItem[]>("/v1/cargo_gerentes_sicoob_cressem");
    return response.data;
}

export async function buscarGerenciasFuncionario() {
    const response = await api.get<GerenciaFuncionarioItem[]>(
        "/v1/funcionarios_sicoob_cressem_gerencia"
    );
    return response.data;
}

export async function cadastrarFuncionario(payload: {
    NM_FUNCIONARIO: string;
    DT_NASCIMENTO: string;
    ID_SETOR: number;
    ID_CARGO: number | null;
    NR_RAMAL?: string;
    CD_GERENCIA: number | null;
    EMAIL?: string;
    NR_CPF: string;
    NR_RG: string;
    NR_CELULAR: string;
    SEXO: string;
    DT_ADMISSAO: string;
    DT_DESLIGAMENTO?: string | null;
    NR_MATRICULA?: string;
    NR_CONTA_CORRENTE?: string;
    DOC_INDENTIDADE?: File | null;
    COMP_ENDERECO?: File | null;
    FICHA_RH?: File | null;
    CERT_NASCIMENTO?: File | null;
    CERT_CASAMENTO?: File | null;
    DOC_IDENTIDADE_CONJ?: File | null;
    FICHA_DESIMPEDIMENTO?: File | null;
    ENVIAR_EMAIL_ADMISSAO?: number;
}) {
    const formData = new FormData();

    formData.append("NM_FUNCIONARIO", payload.NM_FUNCIONARIO);
    formData.append("DT_NASCIMENTO", payload.DT_NASCIMENTO);
    formData.append("ID_SETOR", String(payload.ID_SETOR));
    if (payload.ID_CARGO !== null) formData.append("ID_CARGO", String(payload.ID_CARGO));
    formData.append("NR_RAMAL", payload.NR_RAMAL || " ");
    if (payload.CD_GERENCIA !== null) formData.append("CD_GERENCIA", String(payload.CD_GERENCIA));
    formData.append("EMAIL", payload.EMAIL || " ");
    formData.append("NR_CPF", payload.NR_CPF);
    formData.append("NR_RG", payload.NR_RG);
    formData.append("NR_CELULAR", payload.NR_CELULAR);
    formData.append("SEXO", payload.SEXO);
    formData.append("DT_ADMISSAO", payload.DT_ADMISSAO);
    if (payload.DT_DESLIGAMENTO) formData.append("DT_DESLIGAMENTO", payload.DT_DESLIGAMENTO);
    formData.append("NR_MATRICULA", payload.NR_MATRICULA || " ");
    formData.append("NR_CONTA_CORRENTE", payload.NR_CONTA_CORRENTE || "0000000000");
    formData.append("ENVIAR_EMAIL_ADMISSAO", String(payload.ENVIAR_EMAIL_ADMISSAO || 0));

    if (payload.DOC_INDENTIDADE) formData.append("DOC_INDENTIDADE", payload.DOC_INDENTIDADE);
    if (payload.COMP_ENDERECO) formData.append("COMP_ENDERECO", payload.COMP_ENDERECO);
    if (payload.FICHA_RH) formData.append("FICHA_RH", payload.FICHA_RH);
    if (payload.CERT_NASCIMENTO) formData.append("CERT_NASCIMENTO", payload.CERT_NASCIMENTO);
    if (payload.CERT_CASAMENTO) formData.append("CERT_CASAMENTO", payload.CERT_CASAMENTO);
    if (payload.DOC_IDENTIDADE_CONJ) formData.append("DOC_IDENTIDADE_CONJ", payload.DOC_IDENTIDADE_CONJ);
    if (payload.FICHA_DESIMPEDIMENTO) formData.append("FICHA_DESIMPEDIMENTO", payload.FICHA_DESIMPEDIMENTO);

    const response = await api.post("/v1/funcionarios_sicoob_cressem", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
}

export async function editarFuncionario(payload: {
  id: number;
  NM_FUNCIONARIO: string;
  DT_NASCIMENTO: string;
  ID_SETOR: number;
  ID_CARGO: number | null;
  NR_RAMAL?: string;
  CD_GERENCIA: number | null;
  EMAIL?: string;
  NR_CPF: string;
  NR_RG: string;
  NR_CELULAR: string;
  SEXO: string;
  DT_ADMISSAO: string;
  DT_DESLIGAMENTO?: string | null;
  NR_MATRICULA?: string;
  NR_CONTA_CORRENTE?: string;
  SN_ATIVO: number;
  DOC_INDENTIDADE?: File | null;
  COMP_ENDERECO?: File | null;
  FICHA_RH?: File | null;
  CERT_NASCIMENTO?: File | null;
  CERT_CASAMENTO?: File | null;
  DOC_IDENTIDADE_CONJ?: File | null;
  FICHA_DESIMPEDIMENTO?: File | null;
}) {
  const formData = new FormData();

  formData.append("NM_FUNCIONARIO", payload.NM_FUNCIONARIO);
  formData.append("DT_NASCIMENTO", payload.DT_NASCIMENTO);
  formData.append("ID_SETOR", String(payload.ID_SETOR));
  formData.append("ID_CARGO", payload.ID_CARGO !== null ? String(payload.ID_CARGO) : "");
  formData.append("NR_RAMAL", payload.NR_RAMAL || " ");
  formData.append(
    "CD_GERENCIA",
    payload.CD_GERENCIA !== null ? String(payload.CD_GERENCIA) : ""
  );
  formData.append("EMAIL", payload.EMAIL || " ");
  formData.append("NR_CPF", payload.NR_CPF);
  formData.append("NR_RG", payload.NR_RG);
  formData.append("NR_CELULAR", payload.NR_CELULAR);
  formData.append("SEXO", payload.SEXO);
  formData.append("DT_ADMISSAO", payload.DT_ADMISSAO);
  formData.append("DT_DESLIGAMENTO", payload.DT_DESLIGAMENTO || "");
  formData.append("NR_MATRICULA", payload.NR_MATRICULA || " ");
  formData.append("NR_CONTA_CORRENTE", payload.NR_CONTA_CORRENTE || "0000000000");
  formData.append("SN_ATIVO", String(payload.SN_ATIVO));

  if (payload.DOC_INDENTIDADE) {
    formData.append("DOC_INDENTIDADE", payload.DOC_INDENTIDADE);
  }
  if (payload.COMP_ENDERECO) {
    formData.append("COMP_ENDERECO", payload.COMP_ENDERECO);
  }
  if (payload.FICHA_RH) {
    formData.append("FICHA_RH", payload.FICHA_RH);
  }
  if (payload.CERT_NASCIMENTO) {
    formData.append("CERT_NASCIMENTO", payload.CERT_NASCIMENTO);
  }
  if (payload.CERT_CASAMENTO) {
    formData.append("CERT_CASAMENTO", payload.CERT_CASAMENTO);
  }
  if (payload.DOC_IDENTIDADE_CONJ) {
    formData.append("DOC_IDENTIDADE_CONJ", payload.DOC_IDENTIDADE_CONJ);
  }
  if (payload.FICHA_DESIMPEDIMENTO) {
    formData.append("FICHA_DESIMPEDIMENTO", payload.FICHA_DESIMPEDIMENTO);
  }

  const response = await api.put(
    `/v1/funcionarios_sicoob_cressem/${payload.id}`,
    formData
  );

  return response.data;
}

export async function alterarStatusFuncionario(payload: {
    id: number;
    SN_ATIVO: number;
    DT_DESLIGAMENTO?: string | null;
    FICHA_DESIMPEDIMENTO?: File | null;
}) {
    const formData = new FormData();
    formData.append("SN_ATIVO", String(payload.SN_ATIVO));

    if (payload.DT_DESLIGAMENTO) {
        formData.append("DT_DESLIGAMENTO", payload.DT_DESLIGAMENTO);
    }

    if (payload.FICHA_DESIMPEDIMENTO) {
        formData.append("FICHA_DESIMPEDIMENTO", payload.FICHA_DESIMPEDIMENTO);
    }

    const response = await api.put(
        `/v1/funcionarios_sicoob_cressem/ativar_desativar/${payload.id}`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
}

export async function baixarRelatorioFuncionarios() {
    const response = await api.get("/v1/download_funcionarios", {
        responseType: "blob",
    });

    return response.data;
}

export async function baixarArquivoFuncionario(caminho: string) {
  const response = await api.post(
    "/v1/funcionarios_sicoob_cressem_download",
    { caminho },
    {
      responseType: "blob",
    }
  );

  return response;
}