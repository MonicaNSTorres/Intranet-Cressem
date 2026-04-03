import { onlyDigits } from "@/utils/br";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getJson<T>(path: string): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || json?.detail || "Falha na consulta.");
  }

  return json as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não definido no .env do front");
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || json?.detail || "Falha no processamento.");
  }

  return json as T;
}

export type AssociadoSimuladorResponse = {
  ID_CLIENTE?: number | null;
  NM_CLIENTE?: string;
  NR_CPF_CNPJ?: string;
  NR_MATRICULA?: string;
  NM_EMPRESA?: string;
  NR_CPF_CNPJ_EMPREGADOR?: string;
  NM_CARGO?: string;
  SL_CONTA_CAPITAL?: number;
  NR_CONTA_CAPITAL?: string;
  DT_NASCIMENTO?: string;
  DS_ENDERECO?: string;
  NM_BAIRRO?: string;
  NM_CIDADE?: string;
  SG_ESTADO?: string;
  NR_CEP?: string;
  NR_DOCUMENTO?: string;
  NM_ORGAO?: string;
  DS_EMAIL?: string;
  NR_IAP?: number | null;
  NR_CONSORCIO?: number | null;
  NR_ANO_ASSOCIADO?: number | null;
  NR_ANO_CORRENTISTA?: number | null;
  NR_MESES_PORTABILIDADE?: number | null;
  SL_DEVEDOR_DIA?: number | null;
  NR_SEGUROS?: number | null;
  NR_CARTAO?: number | null;
  SL_HONRA_SAVAIS?: number | null;
  SL_PREJUIZO?: number | null;
  SL_LIMITE_CHEQUE?: number | null;
  NR_LIMITE_CARTAO?: number | null;
  ST_INTEGRALIZACAO?: string;
  NR_TELEFONE?: string;
  NM_MAE?: string;
  DT_ADMISSA?: string;
  VL_RENDA_BRUTA?: number | null;
  SN_VINCULO_EMPREGATICIO?: number | null;
};

export type AnosAssociadoOption = {
  ID_ANOS_ASSOCIADO: number;
  DESC_ANOS_ASSOCIADO: string;
  VL_ANOS_ASSOCIADO: number;
};

export type AnosCorrentistaOption = {
  ID_ANOS_CORRENTISTA: number;
  DESC_CORRENTISTA: string;
  VL_CORRENTISTA: number;
};

export type CidadeOption = {
  ID_CIDADES: number;
  ID_UF: number;
  NM_CIDADE: string;
};

export type ClassificacaoRiscoOption = {
  ID_CLASSIFICACAO_RISCO: number;
  DESC_CLASSIFICACAO: string;
  VL_CLASSIFICACAO_RISCO: number;
};

export type CorrentistaOption = {
  ID_CORRENTISTA: number;
  DESC_TEXTO: string;
  VL_CORRENTISTA: number;
};

export type OutrosProdutosOption = {
  ID_OUTROS_PRODUTOS: number;
  NM_PRODUTO: string;
  VL_PRODUTO: number;
};

export type PortabilidadeSalarioOption = {
  ID_PORTABILIDADE_SALARIO: number;
  DESC_PORTABILIDADE_SALARIO: string;
  VL_PORTABILIDADE_SALARIO: number;
};

export type TaxaTrabalhadorOption = {
  ID_TAXA: number;
  NR_PARCELA: string;
  TX_PARCELA: number;
};

export type TaxaParcelaOption = {
  ID_TAXA_PARCELA_SIMULADOR: number;
  NR_PARCELA: string;
  PERC_TAXA_PARCELA: number;
};

export type TempoRegimeOption = {
  ID_TEMPO_REGIME: number;
  DESC_TEMPO_REGIME: string;
  VL_TEMPO_REGIME: number;
};

export type UsuarioLogadoResponse = {
  username?: string;
  nome_completo?: string;
  department?: string;
  physicalDeliveryOfficeName?: string;
  grupos?: string[];
};

export type SimulacaoPayload = {
  NM_TIPO_EMPRESTIMO: string;
  VL_EMPRESTIMO: number;
  VL_DIVIDA: number;
  VL_CAPITAL: number;
  VL_DESCONTO_TOTAL: string;
  PERC_TAXA_PARCELA: string;
  DESC_NUMERO_PARCELA: string;
  NR_TAXA_FINAL: string;
  NM_CLASSIFICACAO_RISCO: string;
  SN_SEGURO: string;
  SN_AVALISTA: string;
  SN_OUTRAS_GARANTIAS: string;
  NM_CIDADE: string;
  NM_ATENDENTE: string;
  NM_ASSOCIADO: string;
  NR_CPF_CNPJ: string;
};

export async function buscarAssociadoAnaliticoSimulador(
  cpf: string
): Promise<AssociadoSimuladorResponse | null> {
  const clean = onlyDigits(cpf);
  if (!clean) return null;

  return await getJson<AssociadoSimuladorResponse>(
    `/v1/associado_analitico/${clean}`
  );
}

export async function listarAnosAssociado() {
  return await getJson<AnosAssociadoOption[]>(`/v1/simulador/anos-associado`);
}

export async function listarAnosCorrentista() {
  return await getJson<AnosCorrentistaOption[]>(
    `/v1/simulador/anos-correntista`
  );
}

export async function listarCidades() {
  return await getJson<CidadeOption[]>(`/v1/simulador/cidades`);
}

export async function listarClassificacaoRisco() {
  return await getJson<ClassificacaoRiscoOption[]>(
    `/v1/simulador/classificacao-risco`
  );
}

export async function listarCorrentista() {
  return await getJson<CorrentistaOption[]>(`/v1/simulador/correntista`);
}

export async function listarOutrosProdutos() {
  return await getJson<OutrosProdutosOption[]>(`/v1/simulador/outros-produtos`);
}

export async function listarPortabilidadeSalario() {
  return await getJson<PortabilidadeSalarioOption[]>(
    `/v1/simulador/portabilidade-salario`
  );
}

export async function listarTaxaTrabalhador() {
  return await getJson<TaxaTrabalhadorOption[]>(
    `/v1/simulador/taxa-trabalhador`
  );
}

export async function listarTaxaParcela() {
  return await getJson<TaxaParcelaOption[]>(`/v1/simulador/taxa-parcela`);
}

export async function buscarTaxaParcelaPorNumero(parcela: string) {
  const clean = String(parcela || "").trim();
  if (!clean) return null;

  return await getJson<TaxaParcelaOption>(
    `/v1/simulador/taxa-parcela/${clean}`
  );
}

export async function listarTempoRegime() {
  return await getJson<TempoRegimeOption[]>(`/v1/simulador/tempo-regime`);
}

export async function buscarUsuarioLogado(): Promise<UsuarioLogadoResponse> {
  return await getJson<UsuarioLogadoResponse>(`/v1/me`);
}

export async function salvarSimulacaoDesconto(payload: SimulacaoPayload) {
  return await postJson<{ success: boolean; message: string }>(
    `/v1/simulacao`,
    payload
  );
}