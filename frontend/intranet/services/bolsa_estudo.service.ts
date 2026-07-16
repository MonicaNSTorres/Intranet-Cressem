import { api } from "./api.service";

export type FuncionarioBolsa = {
  NM_FUNCIONARIO: string;
  DT_ADMISSAO: string;
  CD_GERENCIA: string | number;
};

export type GerenciaBolsa = {
  NM_FUNCIONARIO: string;
};

export type CidadeOption = {
  id?: string | number;
  value?: string;
  label?: string;
  nome?: string;
  NM_CIDADE?: string;
  DSC_CIDADE?: string;
};

export async function buscarFuncionarioPorNome(
  nome: string
): Promise<FuncionarioBolsa> {
  const nomeLimpo = String(nome || "").trim();

  if (!nomeLimpo) {
    throw new Error("Nome do funcionário não informado.");
  }

  const response = await api.get<FuncionarioBolsa>(
    `/v1/funcionarios_sicoob_cressem/nome/${encodeURIComponent(nomeLimpo)}`
  );

  return response.data;
}

export async function buscarGerenciaPorCodigo(
  codigo: string | number
): Promise<GerenciaBolsa> {
  if (
    codigo === undefined ||
    codigo === null ||
    String(codigo).trim() === ""
  ) {
    throw new Error("Código da gerência não informado.");
  }

  const response = await api.get<GerenciaBolsa>(
    `/v1/funcionarios_sicoob_cressem_unico/${encodeURIComponent(
      String(codigo)
    )}`
  );

  return response.data;
}

export async function listarCidades(): Promise<string[]> {
  const response = await api.get<Array<CidadeOption | string>>(
    "/v1/cidades"
  );

  const data = response.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      return String(
        item.nome ||
          item.NM_CIDADE ||
          item.DSC_CIDADE ||
          item.label ||
          item.value ||
          ""
      ).trim();
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}