import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type ContratoEmpresaPayload = {
  NR_CNPJ: string;
  NM_EMPRESA: string;
  NM_CIDADE: string;
  NM_TIPO_TEMPO_CONTRATO: string;
  CD_CONTA_CAPITAL: string;
  NM_TIPO_CONTRATO: string;
  NM_SISTEMA_CONSIG: string;
  DT_INICIO: string;
  DT_FIM: string | null;
  OBS_CONTRATO: string;
  SN_ATIVO?: number;
};

export type ContratoEmpresaResponse = {
  ID_CONTRATOS_EMPRESAS: number;
  NR_CNPJ: string;
  NM_EMPRESA: string;
  NM_CIDADE: string;
  NM_TIPO_CONTRATO: string;
  NM_SISTEMA_CONSIG: string;
  DT_INICIO: string;
  DT_FIM: string | null;
  SN_ATIVO: number;
  CD_CONTA_CAPITAL: string;
  NM_TIPO_TEMPO_CONTRATO: string;
  OBS_CONTRATO: string;
};

export type FuncionarioEmail = {
  ID_FUNCIONARIO: number;
  NM_FUNCIONARIO?: string;
  EMAIL: string;
};

export type EmailContratoPayload = {
  ID_FUNCIONARIO: number;
  ID_CONTRATO: number;
};

export type EmailContratoItem = {
  ID_CONTRATO_EMAIL: number;
  ID_CONTRATO: number;
  ID_FUNCIONARIO: number;
  FUNCIONARIO?: {
    ID_FUNCIONARIO: number;
    NM_FUNCIONARIO?: string;
    EMAIL: string;
  };
};

export type ContatoContratoPayload = {
  NM_RESPONSAVEL: string;
  NR_TELEFONE: string;
  DESC_EMAIL: string;
};

export type ContatoContratoItem = {
  ID_RH_CONTATO?: number;
  ID_CONTRATO?: number;
  NM_RESPONSAVEL?: string;
  NR_TELEFONE?: string;
  DESC_EMAIL?: string;
};

export type ContratoEmpresaItem = {
  ID_CONTRATOS_EMPRESAS: number;
  NR_CNPJ: string;
  NM_EMPRESA: string;
  NM_CIDADE: string;
  NM_TIPO_CONTRATO: string;
  NM_SISTEMA_CONSIG: string;
  DT_INICIO: string;
  DT_FIM: string | null;
  SN_ATIVO?: number;
  CD_CONTA_CAPITAL?: string;
  NM_TIPO_TEMPO_CONTRATO?: string;
  OBS_CONTRATO?: string;
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

export async function cadastrarContratoEmpresa(
  payload: ContratoEmpresaPayload
): Promise<ContratoEmpresaResponse> {
  const response = await api.post<ContratoEmpresaResponse>(
    "/v1/contratos_empresas",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function editarContratoEmpresa(
  id: number,
  payload: ContratoEmpresaPayload
): Promise<ContratoEmpresaResponse> {
  if (!id) {
    throw new Error("ID do contrato não informado.");
  }

  const response = await api.put<ContratoEmpresaResponse>(
    `/v1/contratos_empresas/${id}`,
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function buscarContratoPorId(
  id: number
): Promise<ContratoEmpresaResponse> {
  if (!id) {
    throw new Error("ID do contrato não informado.");
  }

  const response = await api.get<ContratoEmpresaResponse>(
    `/v1/contratos_empresas/${id}`
  );

  return response.data;
}

export async function carregarCidadesContrato(): Promise<string[]> {
  const response = await api.get<string[]>(
    "/v1/contratos_empresas_cidades"
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function carregarTiposContrato(): Promise<string[]> {
  const response = await api.get<string[]>(
    "/v1/contratos_empresas_tipo"
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function carregarSistemasConsignados(): Promise<string[]> {
  const response = await api.get<string[]>(
    "/v1/contratos_empresas_sistema"
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function carregarEmailsFuncionarios(): Promise<string[]> {
  const response = await api.get<FuncionarioEmail[]>(
    "/v1/funcionarios_simples_email_sicoob_cressem"
  );

  const funcionarios = Array.isArray(response.data)
    ? response.data
    : [];

  return funcionarios
    .map((item) => String(item.EMAIL || "").trim())
    .filter(Boolean);
}

export async function buscarFuncionarioPorEmail(
  email: string
): Promise<FuncionarioEmail> {
  const emailLimpo = String(email || "").trim();

  if (!emailLimpo) {
    throw new Error("E-mail do funcionário não informado.");
  }

  const response = await api.get<FuncionarioEmail>(
    `/v1/funcionarios_sicoob_cressem/email/${encodeURIComponent(
      emailLimpo
    )}`
  );

  return response.data;
}

export async function criarEmailContrato(
  payload: EmailContratoPayload
): Promise<EmailContratoItem> {
  const response = await api.post<EmailContratoItem>(
    "/v1/email_contrato",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function listarEmailContratoPorContrato(
  idContrato: number
): Promise<EmailContratoItem[]> {
  if (!idContrato) {
    throw new Error("ID do contrato não informado.");
  }

  const response = await api.get<EmailContratoItem[]>(
    `/v1/email_contrato/contrato/${idContrato}`
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function listarEmailContratoPorFuncionario(
  idFuncionario: number
): Promise<EmailContratoItem> {
  if (!idFuncionario) {
    throw new Error("ID do funcionário não informado.");
  }

  const response = await api.get<EmailContratoItem>(
    `/v1/email_contrato/funcionario/${idFuncionario}`
  );

  return response.data;
}

export async function removerEmailContrato(
  idContratoEmail: number
): Promise<unknown> {
  if (!idContratoEmail) {
    throw new Error("ID do vínculo de e-mail não informado.");
  }

  const response = await api.delete(
    `/v1/email_contrato/${idContratoEmail}`,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function buscarEmailsDoContratoSeparados(
  idContrato: number
): Promise<string> {
  const emailsContrato =
    await listarEmailContratoPorContrato(idContrato);

  return emailsContrato
    .map((item) =>
      String(item.FUNCIONARIO?.EMAIL || "").trim()
    )
    .filter(Boolean)
    .join("/");
}

export async function listarContatosContratoPorContrato(
  idContrato: number
): Promise<ContatoContratoItem[]> {
  if (!idContrato) {
    throw new Error("ID do contrato não informado.");
  }

  const response = await api.get<ContatoContratoItem[]>(
    `/v1/rh_contato_contrato_lista/${idContrato}`
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function cadastrarContatosContratoLote(
  idContrato: number,
  contatos: ContatoContratoPayload[]
): Promise<unknown> {
  if (!idContrato) {
    throw new Error("ID do contrato não informado.");
  }

  const response = await api.post(
    "/v1/rh_contato/lote",
    {
      ID_CONTRATO: idContrato,
      CONTATOS: contatos,
    },
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function editarContatosContratoLote(
  idContrato: number,
  contatos: ContatoContratoPayload[]
): Promise<unknown> {
  if (!idContrato) {
    throw new Error("ID do contrato não informado.");
  }

  const response = await api.put(
    `/v1/rh_contato/lote/${idContrato}`,
    {
      ID_CONTRATO: idContrato,
      CONTATOS: contatos,
    },
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function consultarContratosEmpresas(
  params: ConsultaContratosParams
): Promise<unknown> {
  const response = await api.get(
    "/v1/contratos_empresas",
    {
      params,
    }
  );

  return response.data;
}

export async function carregarCidadesContratoConsulta(): Promise<string[]> {
  return carregarCidadesContrato();
}

export async function carregarTiposContratoConsulta(): Promise<string[]> {
  return carregarTiposContrato();
}

export async function carregarSistemasConsignadosConsulta(): Promise<string[]> {
  return carregarSistemasConsignados();
}