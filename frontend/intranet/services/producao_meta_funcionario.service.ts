import axios from "axios";
import type {
  ChaveRelatorioFuncionario,
  RelatorioFuncionarioDataInfo,
  RelatorioFuncionarioItem,
} from "@/config/producao_meta_funcionario";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  withCredentials: true,
});

export type AuthMeResponse = {
  username: string;
  nome_completo: string;
  department: string;
  physicalDeliveryOfficeName: string;
  grupos: string[];
};

export async function buscarUsuarioLogadoMetaFuncionario() {
  const { data } = await api.get<AuthMeResponse>("/v1/me");
  return data;
}

export async function buscarProducaoMetaRelatorioFuncionario(params: {
  tema: ChaveRelatorioFuncionario;
  periodo: string;
}) {
  const { data } = await api.get<RelatorioFuncionarioItem[]>(
    "/v1/producao-meta-funcionario",
    {
      params: {
        tema: params.tema,
        data: params.periodo,
      },
    }
  );

  return data;
}

export async function buscarUltimaAtualizacaoMetaFuncionario() {
  const { data } = await api.get<RelatorioFuncionarioDataInfo[]>(
    "/v1/producao-meta-funcionario/datas"
  );
  return data;
}

export async function buscarDatasRelatorioMetaFuncionario() {
  const { data } = await api.get<RelatorioFuncionarioDataInfo[]>(
    "/v1/producao-meta-funcionario/datas"
  );
  return data;
}