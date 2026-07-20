/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";

export type NotebookRow = {
  ID_NOTEBOOKS_SICOOB: number | string;
  NM_NOTEBOOK: string | null;
  NM_MODELO: string | null;
  DT_INICIO_OPERACAO: string | null;
  DT_GARANTIA: string | null;
  NR_MAC: string | null;
  CD_PATRIMONIO: number | string | null;
  NR_IP: string | null;
  NR_BITLOCKER: string | null;
  OBS_NOTEBOOKS_SICOOB: string | null;
  ID_FUNCIONARIO: number | string | null;
  NM_FUNCIONARIO_TI: string | null;
  NM_FUNCIONARIO_RECEBEU: string | null;
  DIR_TERMO_ASSINADO?: string | null;
  DESC_SITUACAO: string | null;
};

export type BuscarNotebooksResponse = {
  data: NotebookRow[];
};

export type FuncionarioOption = {
  ID_FUNCIONARIO: number | string | null;
  NM_FUNCIONARIO: string | null;
};

export type BuscarFuncionariosResponse = {
  data: FuncionarioOption[];
};

export type AtualizarNotebookPayload = {
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

export type AtualizarNotebookResponse = {
  success: boolean;
  message: string;
};

export async function buscarNotebooks(
  q?: string
): Promise<BuscarNotebooksResponse> {
  const response = await api.get<BuscarNotebooksResponse>(
    "/v1/consulta-notebook",
    {
      params: q?.trim()
        ? {
            q: q.trim(),
          }
        : undefined,
    }
  );

  return response.data;
}

export async function buscarFuncionariosNotebook(
  q?: string
): Promise<BuscarFuncionariosResponse> {
  const response = await api.get<BuscarFuncionariosResponse>(
    "/v1/funcionarios-notebook",
    {
      params: q?.trim()
        ? {
            q: q.trim(),
          }
        : undefined,
    }
  );

  return response.data;
}

export async function atualizarNotebook(
  id: string,
  payload: AtualizarNotebookPayload
): Promise<AtualizarNotebookResponse> {
  const telaOrigem =
    typeof window !== "undefined"
      ? window.location.href
      : "";

  const response = await api.put<AtualizarNotebookResponse>(
    `/v1/consulta-notebook/${id}`,
    payload,
    {
      headers: {
        "x-tela-origem": telaOrigem,
      },
    }
  );

  return response.data;
}