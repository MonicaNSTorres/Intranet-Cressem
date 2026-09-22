import { api } from "./api.service";

export type KpisResumoResponse = {
  totalCooperados?: number;
  totalFuncionarios?: number;
  totalPAs?: number;
  totalRamal?: number;
};

export type AniversarianteHojeRow = {
  nome?: string;
  setor?: string;
  ramal?: string;
  NOME?: string;
  SETOR?: string;
  RAMAL?: string;
};

export type AniversariantesHojeResponse = {
  data: AniversarianteHojeRow[];
};

export async function buscarResumoKpis(): Promise<KpisResumoResponse> {
  const { data } = await api.get<KpisResumoResponse>(
    "/v1/kpis/resumo"
  );

  return data;
}

export async function buscarAniversariantesHoje(): Promise<AniversariantesHojeResponse> {
  const { data } = await api.get<AniversariantesHojeResponse>(
    "/v1/aniversariantes/hoje"
  );

  return {
    data: Array.isArray(data?.data)
      ? data.data
      : [],
  };
}