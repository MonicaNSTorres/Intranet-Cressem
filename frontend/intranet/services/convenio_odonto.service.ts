/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export type FatorAjuste = {
  ID_CONVENIO_FATOR_AJUSTE: number;
  ID_OPERADORA: number;
  NM_FATOR_AJUSTE: string;
  VL_AJUSTE: number;
  DT_VIGENCIA?: string | null;
};

export type Parentesco = {
  ID_PARENTESCO?: number;
  NM_PARENTESCO: string;
};

export type EmpresaAssociado = {
  NR_MATRICULA: string;
  NM_EMPRESA: string;
  NR_CPF_CNPJ_EMPREGADOR: string;
};

export type AssociadoBase = {
  CD_ASSOCIADO?: number;
  NR_MATRICULA?: number;
  NM_EMPRESA?: string;
  NR_CPF_CNPJ_EMPREGADOR?: number;
  NM_CLIENTE?: string;
  NM_MAE?: string;
  DT_NASCIMENTO?: string;
  NR_CPF_CNPJ?: string;
  NR_TELEFONE?: string;
};

export type PessoaOdonto = {
  ID_CONVENIO_PESSOAS?: number;
  ID_OPERADORA: number;
  CD_PLANO?: number | null;
  CD_CARTAO?: string | null;
  CD_ASSOCIADO?: number | null;
  CD_USUARIO?: number | null;
  NR_CPF_TITULAR: string;
  CD_MATRICULA?: string | null;
  NM_EMPRESA?: string | null;
  NR_CNPJ_EMPRESA?: string | null;
  NM_USUARIO: string;
  NR_CPF_USUARIO?: string | null;
  DT_INCLUSAO?: string | null;
  DT_EXCLUSAO?: string | null;
  DESC_PARENTESCO: string;
  ID_CONVENIO_FATOR_AJUSTE: number;
  SN_ATIVO?: number;
  NM_ATENDENTE_CADASTRO?: string | null;
  NM_ATENDENTE_EDICAO?: string | null;
  NM_MAE?: string | null;
  DT_NASCIMENTO?: string | null;
  NM_CIDADE?: string | null;
  ID_CONVENIO_OPERADORA?: number;
  DESC_CONVENIO?: string;
  NM_FATOR_AJUSTE?: string;
  VL_AJUSTE?: number;
};

export type PessoaOdontoHistorico = {
  CD_PLANO?: number | null;
  NR_CPF_TITULAR?: string | null;
  CD_MATRICULA?: string | null;
  NM_EMPRESA?: string | null;
  NR_CNPJ_EMPRESA?: string | null;
  NM_USUARIO?: string | null;
  NR_CPF_USUARIO?: string | null;
  DT_INCLUSAO?: string | null;
  DT_EXCLUSAO?: string | null;
  NM_PARENTESCO?: string | null;
  SN_ATIVO?: number | null;
  NM_ATENDENTE_CADASTRO?: string | null;
  NM_ATENDENTE_EDICAO?: string | null;
  DT_NASCIMENTO?: string | null;
  NM_MAE?: string | null;
  NM_CIDADE?: string | null;
  VL_FATOR_AJUSTE?: number | null;
  NM_PLANO_FATOR_AJUSTE?: string | null;
  NM_OPERADORA?: string | null;
};

export async function listarFatorAjuste() {
  const { data } = await api.get<FatorAjuste[]>("/v1/fator_ajuste");
  return data || [];
}

export async function listarParentesco() {
  const { data } = await api.get<Parentesco[]>("/v1/parentesco");
  return data || [];
}

export async function buscarConvenioPorCpfTitular(cpf: string) {
  const { data } = await api.get<PessoaOdonto[]>(
    `/v1/pessoa_odontologica/cpf_titular/${onlyDigits(cpf)}`
  );
  return data || [];
}

export async function buscarConvenioTitularUnico(cpf: string) {
  const { data } = await api.get<PessoaOdonto>(
    `/v1/pessoa_odontologica/cpf_titular_unico/${onlyDigits(cpf)}`
  );
  return data;
}

export async function buscarPessoaOdontoPorCpfUsuario(cpf: string) {
  const { data } = await api.get<PessoaOdonto>(
    `/v1/pessoa_odontologica/cpf_usuario/${onlyDigits(cpf)}`
  );
  return data;
}

export async function buscarPessoaOdontoPorCpfUsuarioLista(cpf: string) {
  const { data } = await api.get<PessoaOdonto[]>(
    `/v1/pessoa_odontologica/cpf_usuario/lista/${onlyDigits(cpf)}`
  );
  return data || [];
}

export async function buscarPessoaOdontoSemCpf(nome: string) {
  const { data } = await api.get<PessoaOdonto>(
    `/v1/pessoa_odontologica/cpf_usuario/sem_cpf/${encodeURIComponent(nome)}`
  );
  return data;
}

export async function buscarPessoaOdontoTodosCpfUsuario(cpf: string) {
  const { data } = await api.get<PessoaOdonto>(
    `/v1/pessoa_odontologica/todos_cpf_usuario/${onlyDigits(cpf)}`
  );
  return data;
}

export async function buscarPessoaOdontoPorCodAssociado(cod: string) {
  const { data } = await api.get<PessoaOdonto[]>(
    `/v1/pessoa_odontologica/cod_associado/${encodeURIComponent(String(cod || "").trim())}`
  );
  return data || [];
}

export async function verificarCodCartaoOdonto(
  cod: string,
  cpfUsuario: string,
  cpfTitular: string,
  nome: string
) {
  const { data } = await api.get(
    `/v1/pessoa_odontologica/cod_cartao/${encodeURIComponent(
      String(cod || "").trim()
    )}/cpf_usuario/${onlyDigits(cpfUsuario)}/cpf_titular/${onlyDigits(
      cpfTitular
    )}/nome/${encodeURIComponent(nome)}`
  );
  return data;
}

export async function buscarTotalCustoEStatus(cpf: string) {
  const { data } = await api.get(
    `/v1/pessoa_odontologica/total_custo_e_status/${onlyDigits(cpf)}`
  );
  return data;
}

export async function criarPessoaOdonto(payload: PessoaOdonto) {
  const { data } = await api.post("/v1/pessoa_odontologica", payload);
  return data;
}

export async function editarPessoaOdonto(id: number, payload: Partial<PessoaOdonto>) {
  const { data } = await api.put(`/v1/pessoa_odontologica/id/${id}`, payload);
  return data;
}

export async function criarHistoricoConvenioOdonto(payload: PessoaOdontoHistorico) {
  const { data } = await api.post("/v1/pessoa_odontologica_historico", payload);
  return data;
}

export async function desativarConvenioPorCpfTitular(cpf: string) {
  const { data } = await api.put(
    `/v1/pessoa_odontologica/desativar/cpf_titular/${onlyDigits(cpf)}`
  );
  return data;
}

/**
 * Endpoints já existentes no seu backend antigo / atual
 * usados pela lógica da tela antiga
 */
export async function buscarAssociadoBasePorCpf(cpf: string) {
  const { data } = await api.get<AssociadoBase>(
    `/v1/associado_analitico/${onlyDigits(cpf)}`
  );
  return data;
}

export async function listarEmpresasDoAssociado(cpf: string): Promise<EmpresaAssociado[]> {
  const data = await buscarAssociadoBasePorCpf(cpf);

  if (!data) return [];

  const matricula = String(data.NR_MATRICULA || "").trim();
  const empresa = String(data.NM_EMPRESA || "").trim();
  const cnpj = String(data.NR_CPF_CNPJ_EMPREGADOR || "").trim();

  if (!matricula && !empresa && !cnpj) {
    return [];
  }

  return [
    {
      NR_MATRICULA: matricula,
      NM_EMPRESA: empresa,
      NR_CPF_CNPJ_EMPREGADOR: cnpj,
    },
  ];
}

export async function downloadCsvPessoasOdontologicasTitular(cpf: string) {
  const response = await api.get(
    `/v1/download_pessoas_odontologicas_titular/${onlyDigits(cpf)}`,
    {
      responseType: "blob",
    }
  );

  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "convenio_odontologico.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}