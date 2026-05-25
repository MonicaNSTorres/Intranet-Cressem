import { onlyDigits } from "@/utils/br";
import { registrarErroTela } from "./error_log.service";

export type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado?: string;
  regiao?: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: true;
};

export type EnderecoCep = {
  cep: string;
  rua: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  ibge?: string;
};

export async function buscarEnderecoPorCep(
  cep: string
): Promise<EnderecoCep> {
  try {
    const clean = onlyDigits(cep);

    if (!/^\d{8}$/.test(clean)) {
      throw new Error("CEP inválido. Digite 8 números.");
    }

    const res = await fetch(
      `https://viacep.com.br/ws/${clean}/json/`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error("Não foi possível consultar o CEP.");
    }

    const json = (await res.json()) as ViaCepResponse;

    if (json.erro) {
      throw new Error("CEP não encontrado.");
    }

    return {
      cep: json.cep || clean,
      rua: json.logradouro || "",
      complemento: json.complemento || "",
      bairro: json.bairro || "",
      cidade: json.localidade || "",
      uf: json.uf || "",
      ibge: json.ibge,
    };
  } catch (error: any) {
    await registrarErroTela({
      PAGE_URL:
        typeof window !== "undefined"
          ? window.location.href
          : null,

      ERROR_MESSAGE:
        error?.message || "Erro ao buscar endereço por CEP",

      ERROR_STACK: error?.stack || null,

      ERROR_DETAIL: {
        endpoint: "https://viacep.com.br/ws",
        method: "GET",
        cep,
      },

      SOURCE: "BUSCAR_CEP",
    });

    throw error;
  }
}