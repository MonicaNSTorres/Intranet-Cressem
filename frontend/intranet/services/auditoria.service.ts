import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

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

export async function buscarAssociadoAuditoria(
  cpfCnpj: string
): Promise<AssociadoAuditoriaResponse> {
  const response = await api.get(`/v1/auditoria/associado/${cpfCnpj}`);
  return response.data;
}

export async function buscarDadosAuditoria(
  cpfCnpj: string
): Promise<AuditoriaResponse> {
  const response = await api.get(`/v1/auditoria/${cpfCnpj}`);
  return response.data;
}