import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

export type PosicaoCargo = {
  ID_POSICAO: number;
  CD_SICOOB: string;
  NM_POSICAO: string;
  DESC_ATUACAO?: string;
  DESC_POSICAO?: string;
  SN_ATIVO: number;
};

export type CargoItem = {
  ID_CARGO: number;
  NM_CARGO: string;
  SN_ATIVO: number;
  NM_NIVEL: string;
  ID_POSICAO: number | null;
  POSICAO?: {
    ID_POSICAO: number;
    CD_SICOOB: string;
    NM_POSICAO: string;
  } | null;
};

export type CargosPaginadosResponse = {
  items: CargoItem[];
  total_pages: number;
  total?: number;
};

export async function buscarCargosPaginados(params: {
  nome?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<CargosPaginadosResponse>(
    "/v1/cargo_gerentes_sicoob_cressem_paginado",
    {
      params,
    }
  );

  return response.data;
}

export async function buscarTodosCargos() {
  const response = await api.get<CargoItem[]>("/v1/cargo_gerentes_sicoob_cressem");
  return response.data;
}

export async function buscarPosicoes() {
  const response = await api.get<PosicaoCargo[]>("/v1/posicao_sicoob");
  return response.data;
}

export async function cadastrarCargo(payload: {
  NM_CARGO: string;
  NM_NIVEL: string;
  ID_POSICAO: number;
}) {
  const response = await api.post("/v1/cargo_gerentes_sicoob_cressem", payload);
  return response.data;
}

export async function editarCargo(payload: {
  id: number;
  NM_CARGO: string;
  SN_ATIVO: number;
  NM_NIVEL: string;
  ID_POSICAO: number;
}) {
  const response = await api.put(
    `/v1/cargo_gerentes_sicoob_cressem/${payload.id}`,
    {
      NM_CARGO: payload.NM_CARGO,
      SN_ATIVO: payload.SN_ATIVO,
      NM_NIVEL: payload.NM_NIVEL,
      ID_POSICAO: payload.ID_POSICAO,
    }
  );

  return response.data;
}

export async function alterarStatusCargo(payload: {
  id: number;
  NM_CARGO: string;
  SN_ATIVO: number;
  NM_NIVEL: string;
  ID_POSICAO: number;
}) {
  const response = await api.put(
    `/v1/cargo_gerentes_sicoob_cressem/${payload.id}`,
    {
      NM_CARGO: payload.NM_CARGO,
      SN_ATIVO: payload.SN_ATIVO,
      NM_NIVEL: payload.NM_NIVEL,
      ID_POSICAO: payload.ID_POSICAO,
    }
  );

  return response.data;
}

export async function baixarRelatorioCargos() {
  const response = await api.get("/v1/download_cargos", {
    responseType: "blob",
  });

  return response.data;
}