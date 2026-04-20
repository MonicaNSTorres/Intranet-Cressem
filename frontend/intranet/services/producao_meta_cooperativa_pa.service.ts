import axios from "axios";
import type {
  ChaveRelatorioPA,
  RelatorioDataInfo,
  RelatorioItem,
} from "@/config/producao_meta_cooperativa_pa";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  withCredentials: true,
});

export async function buscarProducaoMetaRelatorioPA(params: {
  tema: ChaveRelatorioPA;
  periodo: string;
}) {
  const { data } = await api.get<RelatorioItem[]>("/v1/producao-meta-cooperativa-pa", {
    params: {
      tema: params.tema,
      data: params.periodo,
    },
  });

  return data;
}

export async function buscarUltimaAtualizacaoMetaPA() {
  const { data } = await api.get<RelatorioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas"
  );
  return data;
}

export async function buscarDatasRelatorioMetaPA() {
  const { data } = await api.get<RelatorioDataInfo[]>(
    "/v1/producao-meta-cooperativa-pa/datas"
  );
  return data;
}