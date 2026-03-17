import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export type TipoFicha = "DEVEDOR" | "CREDOR";

export interface Conta {
  descricao: string;
  valor: string | number;
}

export interface FichaFormData {
  nome: string;
  cpf: string;
  tipo: string;
  prontuario: string;
  empresa: string;
  endereco: string;
  nm_bairro: string;
  nm_cidade: string;
  nr_cep: string;
  telefone: string;
  observacao: string;
  risco: string;
  tempo_associado: string;
  data_ficha: string;
  observacoes_gerais: string;
  responsavel: string;
  total_debitos: string;
  total_creditos: string;
  liquido_devedor: string;
  ds_email: string;
  sequencial: string;
}

export interface FichaRow {
  ID_FICHAS: string;
  TIPO_FICHA: TipoFicha;
  NOME: string;
  CPF: string;
  PRONTUARIO: string;
  EMPRESA: string;
  ENDERECO: string;
  TELEFONE: string;
  OBSERVACAO: string;
  RISCO: string;
  TEMPO_ASSOCIADO: string;
  DATA_FICHA: string;
  OBSERVACOES_GERAIS: string;
  RESPONSAVEL: string;
  TOTAL_DEBITOS: number;
  TOTAL_CREDITOS: number;
  LIQUIDO_DEVEDOR: number;
  DS_EMAIL: string;
  NM_BAIRRO: string;
  NM_CIDADE: string;
  NR_CEP: string;
  SEQUENCIAL: number;
}

export interface AssociadoResponse {
  nome: string;
  cpf: string;
  prontuario: string;
  empresa: string;
  endereco: string;
  nm_bairro: string;
  nm_cidade: string;
  nr_cep: string;
  telefone: string;
  ds_email: string;
}

export interface SalvarFichaPayload {
  id?: string;
  tipo: TipoFicha;
  nome: string;
  cpf: string;
  prontuario: string;
  empresa: string;
  endereco: string;
  nm_bairro: string;
  nm_cidade: string;
  nr_cep: string;
  telefone: string;
  observacao: string;
  risco: string;
  tempo_associado: string;
  data_ficha: string;
  observacoes_gerais: string;
  responsavel: string;
  ds_email: string;
  sequencial?: string | number;
  contasDevedoras: Conta[];
  contasCredoras: Conta[];
  contasBancarias: Conta[];
}

export async function buscarAssociadoPorCpf(cpf: string): Promise<AssociadoResponse> {
  const { data } = await api.get("/v1/ficha-desimpedimento/associado-por-cpf", {
    params: { cpf },
  });
  return data;
}

export async function buscarProximoSequencial(): Promise<number> {
  const { data } = await api.get("/v1/ficha-desimpedimento/proximo-sequencial");
  return Number(data?.sequencial || 10000);
}

export async function listarFichas(): Promise<FichaRow[]> {
  const { data } = await api.get("/v1/ficha-desimpedimento/fichas");
  return data;
}

export async function listarContasDevedoras(idFicha: string): Promise<Conta[]> {
  const { data } = await api.get("/v1/ficha-desimpedimento/contas-devedoras", {
    params: { idFicha },
  });
  return data;
}

export async function listarContasCredoras(idFicha: string): Promise<Conta[]> {
  const { data } = await api.get("/v1/ficha-desimpedimento/contas-credoras", {
    params: { idFicha },
  });
  return data;
}

export async function listarContasBancarias(idFicha: string): Promise<Conta[]> {
  const { data } = await api.get("/v1/ficha-desimpedimento/contas-bancarias", {
    params: { idFicha },
  });
  return data;
}

export async function criarFicha(payload: SalvarFichaPayload) {
  const { data } = await api.post("/v1/ficha-desimpedimento/fichas", payload);
  return data;
}

export async function editarFicha(payload: SalvarFichaPayload & { id: string }) {
  const { data } = await api.put("/v1/ficha-desimpedimento/fichas", payload);
  return data;
}

export async function excluirFicha(id: string) {
  const { data } = await api.delete("/v1/ficha-desimpedimento/fichas", {
    params: { id },
  });
  return data;
}