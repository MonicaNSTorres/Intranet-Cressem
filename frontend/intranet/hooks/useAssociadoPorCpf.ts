"use client";

import { useState } from "react";
import { cpf as cpfValidator } from "cpf-cnpj-validator";
import { buscarFuncionarioPorCpf } from "@/services/associado.service";
import { onlyDigits } from "@/utils/br";

export type AssociadoData = {
  nome: string;
  matricula?: string;
  cpf?: string;
  rg?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  empresa?: string;
  endereco?: string;
};

type BuscarResult =
  | { found: false; data: null }
  | { found: true; data: AssociadoData };

export function useAssociadoPorCpf() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function buscar(cpf: string): Promise<BuscarResult> {
    setErro(null);
    setInfo(null);

    const clean = onlyDigits(cpf);

    if (clean.length !== 11 || !cpfValidator.isValid(clean)) {
      setErro("CPF inválido. Digite os 11 números.");
      return { found: false, data: null };
    }

    setLoading(true);

    try {
      const data = await buscarFuncionarioPorCpf(clean);

      if (!data?.found) {
        setInfo(
          "Nenhum associado encontrado para este CPF. Você pode preencher os campos manualmente."
        );
        return { found: false, data: null };
      }

      setInfo(
        "Dados carregados com sucesso. Você pode ajustar manualmente se necessário."
      );

      const mapped: AssociadoData = {
        nome: data.nome || "",
        matricula: data.matricula || "",
        cpf: data.cpf || clean,
        rg: data.rg || "",

        rua: data.rua || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.cidade || "",
        uf: data.uf || "",
        cep: data.cep || "",

        empresa: data.empresa || "",
      };

      return { found: true, data: mapped };
    } catch (e: any) {
      setErro(e?.message || "Erro ao consultar o CPF.");
      return { found: false, data: null };
    } finally {
      setLoading(false);
    }
  }

  return { loading, erro, info, buscar };
}