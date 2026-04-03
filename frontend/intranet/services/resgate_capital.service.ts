const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type EmprestimoInput = {
  DESC_TIPO?: string;
  NR_CONTRATO?: string;
  VL_SALDO_DEVEDOR?: number;
  VL_SALDO_AMORTIZADO: number;
};

export type ContaCorrenteInput = {
  NR_CONTA?: string;
  VL_SALDO_DEVEDOR?: number;
  VL_SALDO_AMORTIZADO: number;
};

export type CartaoInput = {
  NR_CARTAO?: string;
  VL_SALDO_DEVEDOR?: number;
  VL_SALDO_AMORTIZADO: number;
};

export type ParcelaInput = {
  DT_PARCELA: string;
  DT_PAGAMENTO?: string | null;
  VL_PARCELA_RESGATE: number;
  SN_PAGO?: number;
  NM_ATENDENTE?: string;
};

export type DepositoInput = {
  CD_BANCO?: string;
  CD_AGENCIA?: string;
  CD_CONTA_CORRENTE?: string;
  parcelas: ParcelaInput[];
};

export type ResgateCapitalCreatePayload = {
  resgate: {
    ID_CLIENTE?: number;
    NR_CPF_CNPJ: string;
    NM_CLIENTE: string;
    CD_MATRICULA?: string;
    NM_EMPRESA?: string;
    VL_CAPITAL_ATUAL: number;
    VL_CAPITAL_AMORTIZACAO: number;
    VL_SALDO_RESTANTE: number;
    DESC_MOTIVO?: string;
    NM_AUTORIZADO?: string;
    DT_CARENCIA?: string;
    DT_RESGATE_PARCIAL_CAPITAL: string;
    NM_ATENDENTE: string;
    NM_CIDADE?: string;
  };
  emprestimos?: EmprestimoInput[];
  contaCorrente?: ContaCorrenteInput;
  cartao?: CartaoInput;
  deposito?: DepositoInput;
};

export type ResgateCapitalCreateResponse = {
  success: boolean;
  idResgate: number;
  idContaDeposito?: number | null;
};

function ensureApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL nao definido no .env do front");
  }
}

export async function criarResgateCapital(
  payload: ResgateCapitalCreatePayload
): Promise<ResgateCapitalCreateResponse> {
  ensureApiUrl();

  const res = await fetch(`${API_URL}/v1/resgate-capital/criar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.details || json?.error || "Falha ao criar resgate capital.");
  }

  return json as ResgateCapitalCreateResponse;
}

