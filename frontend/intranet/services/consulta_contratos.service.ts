/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";

export type ContratoEmpresaItem = {
  ID_CONTRATOS_EMPRESAS: number;
  NR_CNPJ: string;
  NM_EMPRESA: string;
  NM_CIDADE: string;
  NM_TIPO_CONTRATO: string;
  NM_SISTEMA_CONSIG: string;
  DT_INICIO: string;
  DT_FIM: string | null;
  SN_ATIVO: number;
  CD_CONTA_CAPITAL?: string;
  NM_TIPO_TEMPO_CONTRATO?: string;
  OBS_CONTRATO?: string;
};

export type ContatoContratoItem = {
  ID_RH_CONTATO?: number;
  ID_CONTRATO?: number;
  NM_RESPONSAVEL?: string;
  NR_TELEFONE?: string;
  DESC_EMAIL?: string;
};

export type ConsultaContratosParams = {
  page?: number;
  limit?: number;
  NM_EMPRESA?: string;
  NR_CNPJ?: string;
  NM_CIDADE?: string;
  NM_TIPO_CONTRATO?: string;
  NM_SISTEMA_CONSIG?: string;
  SN_ATIVO?: number;
};

export async function consultarContratosEmpresas(
  params: ConsultaContratosParams
) {
  const { data } = await api.get("/v1/contratos_empresas", {
    params,
  });

  return data;
}

export async function carregarCidadesContratoConsulta() {
  const { data } = await api.get<string[]>(
    "/v1/contratos_empresas_cidades"
  );

  return data || [];
}

export async function carregarTiposContratoConsulta() {
  const { data } = await api.get<string[]>(
    "/v1/contratos_empresas_tipo"
  );

  return data || [];
}

export async function carregarSistemasConsignadosConsulta() {
  const { data } = await api.get<string[]>(
    "/v1/contratos_empresas_sistema"
  );

  return data || [];
}

export async function listarContatosContratoConsulta(
  idContrato: number
) {
  const { data } = await api.get<ContatoContratoItem[]>(
    `/v1/rh_contato_contrato_lista/${idContrato}`
  );

  return data || [];
}