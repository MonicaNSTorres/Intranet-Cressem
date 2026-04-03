import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

export type PeriodoFeriasListItem = {
  ID_FERIAS_FUNCIONARIOS: number;
  DT_DIA_INICIO: string;
  DT_DIA_FIM: string;
  DT_DIAS_TOTAIS?: number;
  SN_EFETUADO: number;
  ID_FUNCIONARIO: number;
};

export type FuncionarioFeriasListItem = {
  ID_FUNCIONARIO: number;
  NM_FUNCIONARIO: string;
  NR_CPF?: string;
  SETOR?: {
    ID_SETOR?: number;
    NM_SETOR: string;
  } | null;
  FERIAS?: PeriodoFeriasListItem[];
};

export type FeriasPaginadasResponse = {
  items: FuncionarioFeriasListItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export async function buscarFeriasPaginado(params: {
  nome?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<FeriasPaginadasResponse>("/v1/ferias_paginado", {
    params,
  });

  return response.data;
}

export async function excluirPeriodoFerias(idPeriodo: number) {
  const response = await api.delete(`/v1/ferias_funcionarios/${idPeriodo}`);
  return response.data;
}