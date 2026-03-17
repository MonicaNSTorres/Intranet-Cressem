import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

export type FuncionarioResponse = {
  NM_FUNCIONARIO?: string;
  NR_MATRICULA?: string | number;
  NM_MATRICULA?: string | number;
  SETOR?: {
    NM_SETOR?: string;
  };
  CARGO?: {
    NM_CARGO?: string;
  };
  NM_SETOR?: string;
  NM_CARGO?: string;
  CD_GERENCIA?: string | number;
};

export type DiretorOption = {
  NM_FUNCIONARIO: string;
};

export async function buscarFuncionarioPorNome(
  nome: string
): Promise<FuncionarioResponse> {
  const response = await api.get(
    `/v1/reembolso-convenio-medico/funcionario/nome/${encodeURIComponent(nome)}`
  );
  return response.data;
}

export async function buscarDiretoria(): Promise<DiretorOption[]> {
  const response = await api.get(`/v1/reembolso-convenio-medico/diretoria`);
  return response.data || [];
}

export async function buscarDiretorPorNome(
  nome: string
): Promise<FuncionarioResponse> {
  const response = await api.get(
    `/v1/reembolso-convenio-medico/diretor/nome/${encodeURIComponent(nome)}`
  );
  return response.data;
}