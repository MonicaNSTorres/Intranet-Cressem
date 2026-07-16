import { api } from "./api.service";

export type CadastrarNotebookPayload = {
  NM_NOTEBOOK: string;
  NM_MODELO: string | null;
  DT_INICIO_OPERACAO: string | null;
  DT_GARANTIA: string | null;
  NR_MAC: string | null;
  CD_PATRIMONIO: number | null;
  NR_IP: string | null;
  NR_BITLOCKER: string | null;
  OBS_NOTEBOOKS_SICOOB: string | null;
  ID_FUNCIONARIO: number | null;
  NM_FUNCIONARIO_TI: string | null;
  DESC_SITUACAO: string | null;
};

export type CadastrarNotebookResponse = {
  success: boolean;
  message: string;
};

export type FuncionarioOption = {
  ID_FUNCIONARIO: number | string | null;
  NM_FUNCIONARIO: string | null;
};

export type BuscarFuncionariosResponse = {
  data: FuncionarioOption[];
};

export async function cadastrarNotebook(
  payload: CadastrarNotebookPayload
): Promise<CadastrarNotebookResponse> {
  const response = await api.post<CadastrarNotebookResponse>(
    "/v1/cadastro-notebook",
    payload
  );

  return response.data;
}

export async function buscarFuncionariosNotebook(
  q?: string
): Promise<BuscarFuncionariosResponse> {
  const busca = String(q || "").trim();

  const response = await api.get<BuscarFuncionariosResponse>(
    "/v1/funcionarios-notebook",
    {
      params: busca
        ? {
            q: busca,
          }
        : undefined,
    }
  );

  return {
    data: Array.isArray(response.data?.data)
      ? response.data.data
      : [],
  };
}