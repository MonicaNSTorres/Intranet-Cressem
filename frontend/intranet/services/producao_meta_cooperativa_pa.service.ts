import { api } from "./api.service";

import type {
  ChaveRelatorioPA,
  RelatorioDataInfo,
  RelatorioItem,
} from "@/config/producao_meta_cooperativa_pa";

export async function buscarProducaoMetaRelatorioPA(params: {
  tema: ChaveRelatorioPA;
  periodo: string;
}) {
  const { data } = await api.get<RelatorioItem[]>(
    "/v1/producao-meta-cooperativa-pa",
    {
      params: {
        tema: params.tema,
        data: params.periodo,
      },
      timeout: 30000,
    }
  );

  return Array.isArray(data) ? data : [];
}

export async function buscarUltimaAtualizacaoMetaPA() {
  const { data } = await api.get<RelatorioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas",
    {
      timeout: 30000,
    }
  );

  return Array.isArray(data) ? data : [];
}

export async function buscarDatasRelatorioMetaPA() {
  const { data } = await api.get<RelatorioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas",
    {
      timeout: 30000,
    }
  );

  return Array.isArray(data) ? data : [];
}