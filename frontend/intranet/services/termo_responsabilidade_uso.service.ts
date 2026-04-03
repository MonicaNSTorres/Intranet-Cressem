import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

export type AssociadoPorCpfResponse = {
  found: boolean;
  nome?: string;
  matricula?: string;
  nascimento?: string;
  empresa?: string;
  cpf?: string;
  bairro?: string;
  cidade?: string;
  rua?: string;
  uf?: string;
  cep?: string;
};

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function buscarFuncionarioPorCpfTermo(cpf: string) {
  const cpfLimpo = onlyDigits(cpf);

  const response = await api.get<AssociadoPorCpfResponse>(
    "/v1/associados/buscar-por-cpf",
    {
      params: {
        cpf: cpfLimpo,
      },
    }
  );

  return response.data;
}