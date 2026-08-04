import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export type DespesaPayload = {
  TP_DESPESA: string;
  DESC_DESPESA: string;
  VALOR: number;
  COMPROVANTE: string | null;
  COMPROVANTE_NOME: string | null;
};

export type SolicitacaoReembolsoPayload = {
  ID_SOLICITACAO_REEMBOLSO_DESPESA?: string | number;
  NM_FUNCIONARIO: string;
  NR_CPF_FUNCIONARIO: string;
  DT_IDA: string;
  DT_VOLTA: string;
  DESC_JTF_EVENTO: string;
  NM_CIDADE: string;
  NR_BANCO: string;
  CD_AGENCIA: string;
  NR_CONTA: string;
  DESC_ANDAMENTO: string;
  DESPESAS: DespesaPayload[];
};

export type DespesaResponse = {
  ID_DESPESA_SOLICITADA?: string | number;
  TP_DESPESA: string;
  DESC_DESPESA: string;
  VALOR: number;
  COMPROVANTE?: string | null;
  COMPROVANTE_NOME?: string | null;
};

export type SolicitacaoReembolsoResponse = {
  ID_SOLICITACAO_REEMBOLSO_DESPESA?: string | number;
  NM_FUNCIONARIO: string;
  NR_CPF_FUNCIONARIO: string;
  DT_IDA: string;
  DT_VOLTA: string;
  DESC_JTF_EVENTO: string;
  NM_CIDADE: string;
  NR_BANCO: string;
  CD_AGENCIA: string;
  NR_CONTA: string;
  DESC_ANDAMENTO: string;
  NM_USUARIO_ABERTURA?: string;
  NM_LOGIN_ABERTURA?: string;
  DESPESAS: DespesaResponse[];
};

export type FuncionarioReembolso = {
  NM_FUNCIONARIO: string;
  NR_CPF: string;
  NR_CONTA_CORRENTE: string;
};

export type TipoDespesaItem = {
  NM_TIPO_DESPESA?: string;
  nome?: string;
};

export type CidadeItem = {
  NM_CIDADE?: string;
  nome?: string;
};

export type AuthMeResponse = {
  nome?: string;
  username?: string;
  nome_completo?: string;
};

export type BuscarFuncionarioReembolsoPorCpfResponse =
  | {
      found: false;
    }
  | {
      found: true;
      id_funcionario?: string | number;
      nome: string;
      cpf?: string;
      matricula?: string;
      conta_corrente?: string;
      nr_conta_corrente?: string;
    };

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function carregarCidadesReembolso(): Promise<string[]> {
  const response = await api.get<Array<CidadeItem | string>>(
    "/v1/cidades"
  );

  const cidades = Array.isArray(response.data)
    ? response.data
    : [];

  return cidades
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      return String(
        item.NM_CIDADE ||
          item.nome ||
          ""
      ).trim();
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function carregarTiposDespesaReembolso(): Promise<
  string[]
> {
  const response = await api.get<TipoDespesaItem[]>(
    "/v1/tipo_despesa"
  );

  const tiposDespesa = Array.isArray(response.data)
    ? response.data
    : [];

  return tiposDespesa
    .map((item) =>
      String(
        item.NM_TIPO_DESPESA ||
          item.nome ||
          ""
      ).trim()
    )
    .filter(Boolean);
}

export async function buscarSolicitacaoReembolsoPorId(
  id: number | string
): Promise<SolicitacaoReembolsoResponse> {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error("ID da solicitação de reembolso não informado.");
  }

  const response = await api.get<SolicitacaoReembolsoResponse>(
    `/v1/solicitacao_reembolso_despesa/${encodeURIComponent(
      String(id)
    )}`
  );

  return response.data;
}

export async function cadastrarSolicitacaoReembolso(
  payload: SolicitacaoReembolsoPayload
): Promise<SolicitacaoReembolsoResponse> {
  const response = await api.post<SolicitacaoReembolsoResponse>(
    "/v1/solicitacao_reembolso_despesa",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function editarSolicitacaoReembolso(
  payload: SolicitacaoReembolsoPayload
): Promise<SolicitacaoReembolsoResponse> {
  if (
    payload.ID_SOLICITACAO_REEMBOLSO_DESPESA === undefined ||
    payload.ID_SOLICITACAO_REEMBOLSO_DESPESA === null ||
    String(
      payload.ID_SOLICITACAO_REEMBOLSO_DESPESA
    ).trim() === ""
  ) {
    throw new Error(
      "ID da solicitação de reembolso não informado."
    );
  }

  const response = await api.put<SolicitacaoReembolsoResponse>(
    "/v1/solicitacao_reembolso_despesa",
    payload,
    {
      headers: getAuditoriaHeaders(),
    }
  );

  return response.data;
}

export async function buscarFuncionarioReembolsoPorCpf(
  cpf: string
): Promise<BuscarFuncionarioReembolsoPorCpfResponse> {
  const cpfLimpo = onlyDigits(cpf);

  if (cpfLimpo.length !== 11) {
    return {
      found: false,
    };
  }

  const response =
    await api.get<BuscarFuncionarioReembolsoPorCpfResponse>(
      `/v1/solicitacao_reembolso_despesa/funcionario/cpf/${cpfLimpo}`
    );

  return response.data;
}

export async function buscarFuncionarioPorNome(
  nome: string
): Promise<FuncionarioReembolso> {
  const nomeLimpo = String(nome || "").trim();

  if (!nomeLimpo) {
    throw new Error("Nome do funcionário não informado.");
  }

  const response = await api.get<FuncionarioReembolso>(
    `/v1/funcionarios_sicoob_cressem/nome/${encodeURIComponent(
      nomeLimpo
    )}`
  );

  return response.data;
}

export async function buscarUsuarioLogadoReembolso(): Promise<AuthMeResponse> {
  const response = await api.get<AuthMeResponse>("/v1/me");

  return response.data;
}

export async function baixarComprovanteReembolso(
  oficio: string
): Promise<Blob> {
  const caminho = String(oficio || "").trim();

  if (!caminho) {
    throw new Error("Caminho do comprovante não informado.");
  }

  const response = await api.post<Blob>(
    "/v1/solicitacao_reembolso_despesa/download",
    {
      oficio: caminho,
    },
    {
      responseType: "blob",
    }
  );

  return response.data;
}

export async function enviarEmailInformativoFinanceiroReembolso(
  funcionario: string,
  idSolicitacao: string | number
): Promise<unknown> {
  const funcionarioLimpo = String(funcionario || "").trim();

  if (!funcionarioLimpo) {
    throw new Error("Funcionário não informado.");
  }

  if (
    idSolicitacao === undefined ||
    idSolicitacao === null ||
    String(idSolicitacao).trim() === ""
  ) {
    throw new Error("ID da solicitação não informado.");
  }

  const response = await api.get(
    `/v1/email_informativo_financeiro/funcionario/${encodeURIComponent(
      funcionarioLimpo
    )}/solicitacao/${encodeURIComponent(
      String(idSolicitacao)
    )}`
  );

  return response.data;
}
