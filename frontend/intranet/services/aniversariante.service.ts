import { api } from "./api.service";

export type AniversarianteResponseItem = {
  nome: string;
  setor: string;
  ramal: string;
  dia?: number;
};

export type BuscarAniversariantesResponse = {
  data: AniversarianteResponseItem[];
};

export async function buscarAniversariantesPorMes(
  mes: number
): Promise<BuscarAniversariantesResponse> {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("Mês inválido. Informe um valor entre 1 e 12.");
  }

  const response = await api.get<BuscarAniversariantesResponse>(
    "/v1/aniversariantes",
    {
      params: {
        mes,
      },
    }
  );

  return response.data;
}