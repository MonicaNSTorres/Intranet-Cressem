import { api } from "./api.service";

export async function listarEstoqueGlpi(busca = "") {
  const { data } = await api.get(
    "/v1/glpi/estoque",
    {
      params: {
        busca,
      },
      timeout: 30000,
    }
  );

  return data;
}