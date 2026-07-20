/* eslint-disable @typescript-eslint/no-explicit-any */
import { onlyCpfCnpjChars } from "@/utils/br";
import { api } from "./api.service";

export type BuscarMigracaoContratoResponse =
  | {
    found: false;
  }
  | {
    found: true;
    nascimento: string;
    cargo: string;
    salario: number;
    admissao?: string;
    cpf: string;
    situacao: string;
    matricula: string;
  };

export type MigracaoContratoLinhaPayload = {
  DT_NASCIMENTO: string;
  NM_CARGO: string;
  VL_RENDA_BRUTA: number | null;
  DT_ADMISSAO: string;
  NR_CPF_CNPJ: string;
  DESC_SITUACAO: string;
  NR_MATRICULA: string;
};

// Usado de fato na tela de migração de contrato
export type BuscarMigracaoContratoAssociadoResponse =
  | {
    found: false;
  }
  | {
    found: true;
    DT_NASCIMENTO: string;
    NM_CARGO: string;
    VL_RENDA_BRUTA: number;
    DT_ADMISSAO: string;
    NR_CPF_CNPJ: string;
    DESC_SITUACAO: string;
    NR_MATRICULA: string;
  };

export async function buscarMigracaoContratoPorCpf(
  cpf: string
): Promise<BuscarMigracaoContratoResponse> {
  const clean = onlyCpfCnpjChars(cpf);

  const { data } =
    await api.get<BuscarMigracaoContratoResponse>(
      `/v1/migracao-contrato/buscar-cpf/${encodeURIComponent(clean)}`
    );

  return data;
}

export async function gerarArquivoMigracaoContrato(
  payload: MigracaoContratoLinhaPayload[]
): Promise<Blob> {
  try {
    const response = await api.post<Blob>(
      "/v1/migracao-contrato/gerar-arquivo",
      payload,
      {
        responseType: "blob",
        timeout: 60000,
      }
    );

    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;

    if (data instanceof Blob) {
      const text = await data.text();

      if (text) {
        try {
          const parsed = JSON.parse(text);

          throw new Error(
            parsed?.error ||
            parsed?.details ||
            parsed?.message ||
            "Falha ao gerar arquivo."
          );
        } catch (parseError) {
          if (
            parseError instanceof Error &&
            parseError.message !==
            "Unexpected end of JSON input" &&
            !parseError.message.includes(
              "is not valid JSON"
            ) &&
            !parseError.message.includes(
              "Unexpected token"
            )
          ) {
            throw parseError;
          }

          throw new Error(text);
        }
      }

      throw new Error("Falha ao gerar arquivo.");
    }

    throw error;
  }
}

// Consulta correta usada na tela de migração de contrato
export async function buscarMigracaoContratoAssociadoPorCpf(
  cpf: string
): Promise<BuscarMigracaoContratoAssociadoResponse> {
  const clean = String(cpf || "")
    .replace(/[^A-Za-z0-9/-]/g, "")
    .toUpperCase();

  const { data } =
    await api.get<BuscarMigracaoContratoAssociadoResponse>(
      `/v1/migracao-contrato/buscar-cpf/${encodeURIComponent(clean)}`
    );

  return data;
}