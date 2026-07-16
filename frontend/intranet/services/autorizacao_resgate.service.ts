import { api } from "./api.service";

export type AutorizacaoOption = {
  value: string;
  label: string;
};

type AutorizacaoResgateItem = {
  NM_AUTORIZADO?: string;
};

type ListarAutorizacaoResgateResponse = {
  data?: AutorizacaoResgateItem[];
};

export async function listarAutorizacaoResgate(): Promise<
  AutorizacaoOption[]
> {
  const response = await api.get<ListarAutorizacaoResgateResponse>(
    "/v1/autorizacao-resgate"
  );

  const rows = Array.isArray(response.data?.data)
    ? response.data.data
    : [];

  return rows
    .map((item) => {
      const texto = String(item.NM_AUTORIZADO || "").trim();

      return {
        value: texto,
        label: texto,
      };
    })
    .filter((item) => item.value !== "");
}