import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

export type FuncionarioBolsa = {
  NM_FUNCIONARIO: string;
  DT_ADMISSAO: string;
  CD_GERENCIA: string | number;
};

export type GerenciaBolsa = {
  NM_FUNCIONARIO: string;
};

export type CidadeOption = {
  id?: string | number;
  value?: string;
  label?: string;
  nome?: string;
  NM_CIDADE?: string;
  DSC_CIDADE?: string;
};

export async function buscarFuncionarioPorNome(nome: string): Promise<FuncionarioBolsa> {
  const response = await api.get(`/v1/funcionarios_sicoob_cressem/nome/${encodeURIComponent(nome)}`);
  return response.data;
}

export async function buscarGerenciaPorCodigo(codigo: string | number): Promise<GerenciaBolsa> {
  const response = await api.get(`/v1/funcionarios_sicoob_cressem_unico/${codigo}`);
  return response.data;
}

export async function listarCidades(): Promise<string[]> {
  try {
    const response = await api.get(`/v1/cidades`);
    const data = response.data;

    if (Array.isArray(data)) {
      return data
        .map((item: CidadeOption) => {
          if (typeof item === "string") return item;
          return (
            item.nome ||
            item.NM_CIDADE ||
            item.DSC_CIDADE ||
            item.label ||
            item.value ||
            ""
          );
        })
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    return [];
  } catch {
    return [];
  }
}