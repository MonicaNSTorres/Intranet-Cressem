/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type DemissaoAssociadoResponse = {
  NOME?: string;
  MATRICULA?: string;
  EMPRESA?: string;
  CIDADE?: string;
  TELEFONE?: string;
  CPF?: string;
  SL_CONTA_CAPITAL?: number;
};

export type CidadeResgateItem = {
  ID_CIDADES: number;
  ID_UF: number;
  NM_CIDADE: string;
};

export type MotivoDemissaoOption = {
  value: string;
  label: string;
};

export type RegistrarDemissaoPayload = {
  cpf: string;
  nome: string;
  matricula: string;
  empresa: string;
  telefone: string;
  credito: number;
  debito: number;
  total: number;
  tipo: "CREDOR" | "DEVEDOR";
  motivo: string;
  dataCarencia: string;
  dataDemissao: string;
  atendente: string;
  cidade: string;
  inativarConvenioOdontologico?: boolean;
};

export async function registrarDemissao(payload: RegistrarDemissaoPayload) {
  const { data } = await api.post<{
    success: boolean;
    idDemissao: number;
    notificacaoConvenioAtivoEnviada?: boolean;
    erroNotificacaoConvenioAtivo?: string;
  }>(
    "/v1/demissao",
    payload,
    { headers: getAuditoriaHeaders() }
  );
  return data;
}

export type ConvenioStatusResponse = {
  situacao:
  | "ATIVO"
  | "INATIVO"
  | "NAO_ENCONTRADO";

  titular_ativo?: boolean;
  eh_titular?: boolean;
  total_custo?: number;
  idBeneficiario?: number;
  tipoBeneficiario?: string;
  nomeTipoBeneficiario?: string;
  idOperadora?: number;
  operadora?: string;
  idPlano?: number;
  plano?: string;

  tipoCobranca?:
  | "POR_PESSOA"
  | "POR_PLANO";

  valorMensalidade?: number | null;

  dataInicioVigenciaValor?:
  | string
  | null;

  dataFimVigenciaValor?:
  | string
  | null;

  dataInclusaoPlano?:
  | string
  | null;

  dataExclusaoPlano?:
  | string
  | null;
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function onlyCpfCnpjChars(value: string) {
  return (value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

export async function buscarAssociadoDemissaoPorCpf(
  cpf: string
): Promise<DemissaoAssociadoResponse | null> {
  const cpfLimpo = onlyCpfCnpjChars(cpf);

  if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
    return null;
  }

  const response = await api.get<DemissaoAssociadoResponse>(
    `/v1/demissao/associado/${cpfLimpo}`
  );

  return response.data || null;
}

export async function buscarMotivosDemissao(): Promise<
  MotivoDemissaoOption[]
> {
  const response = await api.get("/v1/demissao/motivos");

  const itens = Array.isArray(response.data)
    ? response.data
    : [];

  return itens.map((item: any) => ({
    value:
      item.value ||
      item.VALUE ||
      item.NM_MOTIVO ||
      "",

    label:
      item.label ||
      item.LABEL ||
      item.NM_MOTIVO ||
      "",
  }));
}

export async function buscarCidadesDemissao(): Promise<
  { value: string; label: string }[]
> {
  const response = await api.get("/v1/demissao/cidades");

  const itens = Array.isArray(response.data)
    ? response.data
    : [];

  return itens.map((item: any) => ({
    value:
      item.value ||
      item.VALUE ||
      item.NM_CIDADE ||
      "",

    label:
      item.label ||
      item.LABEL ||
      item.NM_CIDADE ||
      "",
  }));
}

export async function buscarConvenioDemissaoPorCpf(
  cpf: string
): Promise<ConvenioStatusResponse | null> {
  const cpfLimpo = onlyCpfCnpjChars(cpf);

  if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
    return null;
  }

  try {
    const response = await api.get<ConvenioStatusResponse>(
      `/v1/demissao/convenio/${cpfLimpo}`
    );

    return response.data || null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function desativarConvenioDemissao(
  idBeneficiario: number,
  dados: {
    nomeUsuario: string;
    loginUsuario: string;
    observacao?: string | null;
    origem?: "DEMISSAO";
  }
) {
  if (
    !Number.isInteger(idBeneficiario) ||
    idBeneficiario <= 0
  ) {
    throw new Error(
      "Beneficiário inválido para inativação do convênio."
    );
  }

  const response = await api.patch(
    `/v1/convenio-odontologico/beneficiarios/${idBeneficiario}/inativar`,
    dados,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}
