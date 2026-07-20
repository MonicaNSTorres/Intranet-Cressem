import { api } from "./api.service";

export type BuscarAcessosSemanaResponse = {
  DIA: string;
  ACESSOS: number;
};

export type AcessosSemanaItem = {
  dia: string;
  acessos: number;
};

export type PaginaMaisAcessada = {
  href: string;
  quantidadeAcessos: number;
};

type BuscarPaginasMaisAcessadasResponse = {
  success: boolean;
  data: PaginaMaisAcessada[];
};

export async function buscarAcessosSemana(): Promise<AcessosSemanaItem[]> {
  const { data } = await api.get<BuscarAcessosSemanaResponse[]>(
    "/v1/dashboard/acessos"
  );

  const acessos = Array.isArray(data) ? data : [];

  return acessos.map((item) => ({
    dia: item.DIA,
    acessos: Number(item.ACESSOS || 0),
  }));
}

export async function registrarPaginaAcessada(
  pagina: string
): Promise<void> {
  await api.post("/v1/dashboard/paginas/acesso", {
    pagina,
  });
}

export async function buscarPaginasMaisAcessadas(
  limit = 6
): Promise<PaginaMaisAcessada[]> {
  const { data } =
    await api.get<BuscarPaginasMaisAcessadasResponse>(
      "/v1/dashboard/paginas/mais-acessadas",
      {
        params: {
          limit,
        },
      }
    );

  return Array.isArray(data?.data)
    ? data.data
    : [];
}