import axios from "axios";
import { onlyDigits } from "@/utils/br";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

export type MotivoResgateItem = {
  ID_MOTIVO_RESGATE?: number;
  NM_MOTIVO: string;
  SN_ATIVO?: number;
};

export type AutorizacaoResgateItem = {
  ID_AUTORIZACAO_RESGATE?: number;
  NM_AUTORIZADO: string;
  SN_ATIVO?: number;
};

export type CidadeResgateItem = {
  ID_CIDADES: number;
  ID_UF: number;
  NM_CIDADE: string;
};

export type EmprestimoAssociadoItem = {
  DESC_TIPO?: string;
  NR_CONTRATO?: string;
  SALDODEVEDORDIA?: number;
};

export type BuscarIdAssociadoResponse =
  | { found: false }
  | {
      found: true;
      ID_CLIENTE: number;
      NM_CLIENTE?: string;
      NR_CPF_CNPJ?: string;
    };

export type CriarResgatePayload = {
  ID_CLIENTE?: number | null;
  NR_CPF_CNPJ?: string | null;
  NM_CLIENTE: string;
  CD_MATRICULA?: string | null;
  NM_EMPRESA?: string | null;
  DESC_MOTIVO: string;
  NM_AUTORIZADO: string;
  VL_CAPITAL_ATUAL: number;
  VL_CAPITAL_AMORTIZACAO: number;
  VL_SALDO_RESTANTE: number;
  DT_CARENCIA: string;
  DT_RESGATE_PARCIAL_CAPITAL: string;
  NM_ATENDENTE: string;
  NM_CIDADE: string;
};

export type CriarResgateResponse = {
  success: boolean;
  ID_RESGATE_PARCIAL_CAPITAL: number;
};

export type CriarEmprestimoPayload = {
  ID_RESGATE: number;
  DESC_TIPO: string;
  NR_CONTRATO: string;
  VL_SALDO_DEVEDOR: number;
  VL_SALDO_AMORTIZADO: number;
};

export type CriarContaCorrentePayload = {
  NR_CONTA: string;
  VL_SALDO_DEVEDOR: number;
  VL_SALDO_AMORTIZADO: number;
  ID_RESGATE: number;
};

export type CriarCartaoCreditoPayload = {
  NR_CARTAO: string;
  VL_SALDO_DEVEDOR: number;
  VL_SALDO_AMORTIZADO: number;
  ID_RESGATE: number;
};

export type CriarContaDepositoPayload = {
  CD_BANCO: string;
  CD_AGENCIA: string;
  CD_CONTA_CORRENTE: string;
};

export type CriarContaDepositoResponse = {
  success: boolean;
  ID_CONTA_DEPOSITO_RESGATE: number;
};

export type CriarParcelaPayload = {
  DT_PARCELA: string;
  DT_PAGAMENTO?: string | null;
  SN_PAGO?: number;
  VL_PARCELA_RESGATE: number;
  NM_ATENDENTE?: string | null;
  ID_RESGATE: number;
  ID_CONTA_DEPOSITO: number;
};

export async function buscarMotivosResgate() {
  const response = await api.get<MotivoResgateItem[]>("/v1/resgate-capital/motivos");
  return response.data;
}

export async function buscarAutorizacoesResgate() {
  const response = await api.get<AutorizacaoResgateItem[]>(
    "/v1/resgate-capital/autorizacoes"
  );
  return response.data;
}

export async function buscarCidadesResgate() {
  const response = await api.get<CidadeResgateItem[]>("/v1/resgate-capital/cidades");
  return response.data;
}

export async function buscarEmprestimosPorCpf(cpf: string) {
  const response = await api.get<EmprestimoAssociadoItem[]>(
    "/v1/resgate-capital/emprestimos",
    {
      params: {
        cpf: onlyDigits(cpf),
      },
    }
  );

  return response.data;
}

export async function buscarIdAssociado(cpf: string) {
  const response = await api.get<BuscarIdAssociadoResponse>(
    "/v1/resgate-capital/associado-id",
    {
      params: {
        cpf: onlyDigits(cpf),
      },
    }
  );

  return response.data;
}

export async function buscarDiaUtil(data: string) {
  const response = await api.get<{ diaUtil: boolean }>(
    "/v1/resgate-capital/dia-util",
    {
      params: {
        data,
      },
    }
  );

  return response.data;
}

export async function criarResgate(payload: CriarResgatePayload) {
  const response = await api.post<CriarResgateResponse>(
    "/v1/resgate-capital",
    payload
  );

  return response.data;
}

export async function criarEmprestimo(payload: CriarEmprestimoPayload) {
  const response = await api.post("/v1/resgate-capital/emprestimo", payload);
  return response.data;
}

export async function criarContaCorrente(payload: CriarContaCorrentePayload) {
  const response = await api.post("/v1/resgate-capital/conta-corrente", payload);
  return response.data;
}

export async function criarCartaoCredito(payload: CriarCartaoCreditoPayload) {
  const response = await api.post("/v1/resgate-capital/cartao-credito", {
    ...payload,
    NR_CARTAO: onlyDigits(payload.NR_CARTAO),
  });

  return response.data;
}

export async function criarContaDeposito(payload: CriarContaDepositoPayload) {
  const response = await api.post<CriarContaDepositoResponse>(
    "/v1/resgate-capital/conta-deposito",
    payload
  );

  return response.data;
}

export async function criarParcela(payload: CriarParcelaPayload) {
  const response = await api.post("/v1/resgate-capital/parcela", payload);
  return response.data;
}