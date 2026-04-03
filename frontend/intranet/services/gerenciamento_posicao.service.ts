import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

export type PosicaoItem = {
  ID_POSICAO: number;
  CD_SICOOB: string;
  DESC_ATUACAO: string;
  NM_POSICAO: string;
  DESC_POSICAO: string;
  SN_ATIVO: number;
};

export type PosicoesPaginadasResponse = {
  items: PosicaoItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export async function buscarPosicoesPaginadas(params: {
  nome?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<PosicoesPaginadasResponse>(
    "/v1/posicao_sicoob_paginado",
    {
      params,
    }
  );

  return response.data;
}

export async function buscarTodasPosicoes() {
  const response = await api.get<PosicaoItem[]>("/v1/posicao_sicoob");
  return response.data;
}

export async function cadastrarPosicao(payload: {
  CD_SICOOB: string;
  DESC_ATUACAO: string;
  NM_POSICAO: string;
  DESC_POSICAO: string;
}) {
  const response = await api.post("/v1/posicao_sicoob", payload);
  return response.data;
}

export async function editarPosicao(payload: {
  id: number;
  CD_SICOOB: string;
  DESC_ATUACAO: string;
  NM_POSICAO: string;
  DESC_POSICAO: string;
  SN_ATIVO: number;
}) {
  const response = await api.put(`/v1/posicao_sicoob/${payload.id}`, {
    CD_SICOOB: payload.CD_SICOOB,
    DESC_ATUACAO: payload.DESC_ATUACAO,
    NM_POSICAO: payload.NM_POSICAO,
    DESC_POSICAO: payload.DESC_POSICAO,
    SN_ATIVO: payload.SN_ATIVO,
  });

  return response.data;
}

export async function baixarRelatorioPosicoes() {
  const response = await api.get("/v1/download_posicoes", {
    responseType: "blob",
  });

  return response.data;
}