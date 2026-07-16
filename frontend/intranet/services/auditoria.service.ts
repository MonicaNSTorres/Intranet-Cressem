import { api } from "./api.service";

export type AssociadoAuditoriaResponse = {
  NM_CLIENTE?: string;
  NM_EMPRESA?: string;
  NR_IAP?: string | number;
  DT_ADMISSA?: string;
  NR_ANO_CORRENTISTA?: string | number | null;
  NR_MESES_PORTABILIDADE?: string | number | null;
  NR_CARTAO?: string | number | null;
  SL_CONTA_CAPITAL?: string | number | null;
  SN_VINCULO_EMPREGATICIO?: string | number | boolean | null;
};

export type AuditoriaResponse = {
  VL_VENCIDO?: string | number | null;
  VL_A_VENCER?: string | number | null;
  VL_PREJUIZO?: string | number | null;
  DESC_MV_RSC_BACEN_ATT?: string;
  DSC_NV_RSC_LIMITE?: string;
};

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function buscarAssociadoAuditoria(
  cpfCnpj: string
): Promise<AssociadoAuditoriaResponse> {
  const documento = onlyDigits(cpfCnpj);

  if (!documento) {
    throw new Error("CPF/CNPJ não informado.");
  }

  const response = await api.get<AssociadoAuditoriaResponse>(
    `/v1/auditoria/associado/${documento}`
  );

  return response.data;
}

export async function buscarDadosAuditoria(
  cpfCnpj: string
): Promise<AuditoriaResponse> {
  const documento = onlyDigits(cpfCnpj);

  if (!documento) {
    throw new Error("CPF/CNPJ não informado.");
  }

  const response = await api.get<AuditoriaResponse>(
    `/v1/auditoria/${documento}`
  );

  return response.data;
}