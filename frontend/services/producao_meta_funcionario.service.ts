import { api } from "./api.service";

import type {
  ChaveRelatorioFuncionario,
  RelatorioFuncionarioDataInfo,
  RelatorioFuncionarioItem,
} from "@/config/producao_meta_funcionario";

export type AuthMeResponse = {
  username: string;
  nome_completo: string;
  department: string;
  physicalDeliveryOfficeName: string;
  grupos: string[];
};

export type AvisoMetaNaoRetornada = {
  nome: string;
  mensagem: string;
};

export type ProducaoMetaFuncionarioResponse = {
  rows: RelatorioFuncionarioItem[];
  avisos_meta_nao_retornada: AvisoMetaNaoRetornada[];
};

export async function buscarUsuarioLogadoMetaFuncionario() {
  const { data } = await api.get<AuthMeResponse>(
    "/v1/me"
  );

  return data;
}

export async function buscarProducaoMetaRelatorioFuncionario(params: {
  tema: ChaveRelatorioFuncionario;
  periodo: string;
}): Promise<ProducaoMetaFuncionarioResponse> {
  const { data } = await api.get<
    RelatorioFuncionarioItem[] |
    Partial<ProducaoMetaFuncionarioResponse>
  >(
    "/v1/producao-meta-funcionario",
    {
      params: {
        tema: params.tema,
        data: params.periodo,
      },
      timeout: 30000,
    }
  );

  if (Array.isArray(data)) {
    return {
      rows: data,
      avisos_meta_nao_retornada: [],
    };
  }

  return {
    rows: Array.isArray(data?.rows)
      ? data.rows
      : [],

    avisos_meta_nao_retornada: Array.isArray(
      data?.avisos_meta_nao_retornada
    )
      ? data.avisos_meta_nao_retornada
      : [],
  };
}

export async function buscarUltimaAtualizacaoMetaFuncionario() {
  const { data } = await api.get<
    RelatorioFuncionarioDataInfo[]
  >(
    "/v1/producao-meta-cooperativa-pa/datas",
    {
      timeout: 30000,
    }
  );

  return Array.isArray(data)
    ? data
    : [];
}

export async function buscarDatasRelatorioMetaFuncionario() {
  const { data } = await api.get<
    RelatorioFuncionarioDataInfo[]
  >(
    "/v1/producao-meta-cooperativa-pa/datas",
    {
      timeout: 30000,
    }
  );

  return Array.isArray(data)
    ? data
    : [];
}