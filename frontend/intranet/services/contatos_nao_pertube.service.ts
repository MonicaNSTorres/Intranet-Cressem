import { api } from "./api.service";

export type ContatoNaoPertubeItem = {
  ID_CONTATO_BLIP_NAO_PERTUBE: number;
  NM_CONTATO?: string | null;
  NR_CPF_CNPJ?: string | null;
  DIA_REGISTRO?: string | null;
  NR_CONTATO?: string | null;
  NR_PA?: string | null;
  NM_EMPRESA?: string | null;
  CIDADE?: string | null;
};

export type ContatosNaoPertubeParams = {
  q?: string;
  nome?: string;
  cpfCnpj?: string;
  contato?: string;
  pa?: string;
  empresa?: string;
  cidade?: string;
  page?: number;
  limit?: number;
};

export type ContatosNaoPertubeResponse = {
  items: ContatoNaoPertubeItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export async function listarContatosNaoPertube(
  params: ContatosNaoPertubeParams
) {
  const response = await api.get<ContatosNaoPertubeResponse>(
    "/v1/contatos-nao-pertube",
    { params }
  );

  return response.data;
}
