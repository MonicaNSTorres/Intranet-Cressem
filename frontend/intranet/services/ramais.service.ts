import { api } from "./api.service";

export type RamalRow = {
  ID: number | string;
  RAMAL: string | number | null;
  NOME: string | null;
  DEPARTAMENTO: string | null;
  EMAIL: string | null;
  LOGIN: string | null;
  CIDADE?: string | null;
};

export type BuscarRamaisResponse = {
  data: RamalRow[];
};

export type BuscarRamaisParams = {
  q?: string;
  nome?: string;
  ramal?: string;
  departamento?: string;
  cidade?: string;
  login?: string;
  email?: string;
  sortBy?: "nome" | "ramal" | "departamento";
  sortOrder?: "asc" | "desc";
};

export async function buscarRamais(
  params: BuscarRamaisParams = {}
): Promise<BuscarRamaisResponse> {
  const paramsNormalizados = {
    q: params.q?.trim() || undefined,
    nome: params.nome?.trim() || undefined,
    ramal: params.ramal?.trim() || undefined,
    departamento: params.departamento?.trim() || undefined,
    cidade: params.cidade?.trim() || undefined,
    login: params.login?.trim() || undefined,
    email: params.email?.trim() || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: params.sortOrder || undefined,
  };

  const { data } = await api.get<BuscarRamaisResponse>(
    "/v1/ramais",
    {
      params: paramsNormalizados,
    }
  );

  return {
    data: Array.isArray(data?.data)
      ? data.data
      : [],
  };
}