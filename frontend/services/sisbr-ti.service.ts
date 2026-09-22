import { api } from "./api.service";

export type SisbrRow = {
  FW: string | number | null;
  LOCAL: string | null;
  IP: string | null;
  PROVEDOR: string | null;
  ANTIGO_PA: string | null;
  CNPJ: string | null;
};

export type BuscarTabelaSisbrTiResponse = SisbrRow[];

export async function buscarTabelaSisbrTi(): Promise<BuscarTabelaSisbrTiResponse> {
  const { data } = await api.get<SisbrRow[]>(
    "/v1/tabela-sisbr-ti"
  );

  return Array.isArray(data) ? data : [];
}