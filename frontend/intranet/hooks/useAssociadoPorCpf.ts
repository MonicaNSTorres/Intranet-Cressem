"use client";

import { useState } from "react";
import { cpf as cpfValidator, cnpj as cnpjValidator } from "cpf-cnpj-validator";
import { buscarFuncionarioPorCpf } from "@/services/associado.service";
import { onlyDigits } from "@/utils/br";

export type AssociadoData = {
  nome: string;
  matricula?: string;
  nascimento?: string;
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
  telefone?: string;
  email?: string;
  documento?: string;
  orgao?: string;
  iap?: string;
  portabilidade?: string;
  cartao?: string;
  limite_chque?: string;
  limite_cartao?: string;
  saldo_capital?: string;

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

    const isCpf = clean.length === 11 && cpfValidator.isValid(clean);
    const isCnpj = clean.length === 14 && cnpjValidator.isValid(clean);

    if (!isCpf && !isCnpj) {
      setErro("CPF/CNPJ inválido. Digite 11 números (CPF) ou 14 números (CNPJ).");
      return { found: false, data: null };
    }

    setLoading(true);

    try {
      const data = await buscarFuncionarioPorCpf(clean);

      if (!data?.found) {
        setInfo(
          "Nenhum associado encontrado para este CPF/CNPJ. Você pode preencher os campos manualmente."
        );
        return { found: false, data: null };
      }

      setInfo(
        "Dados carregados com sucesso. Você pode ajustar manualmente se necessário."
      );

      const mapped: AssociadoData = {
        nome: data.nome || "",
        matricula: data.matricula || "",
        nascimento: data.nascimento || "",
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
        telefone: data.telefone || "",
        email: data.email || "",
        documento: data.documento || "",
        orgao: data.orgao || "",
        iap: data.iap || "",
        portabilidade: data.portabilidade || "",
        cartao: data.cartao || "",
        limite_chque: data.limite_chque || "",
        limite_cartao: data.limite_cartao || "",
        saldo_capital: data.saldo_capital || ""
      };

      return { found: true, data: mapped };
    } catch (e: any) {
      setErro(e?.message || "Erro ao consultar o CPF/CNPJ.");
      return { found: false, data: null };
    } finally {
      setLoading(false);
    }
  }

  return { loading, erro, info, buscar };
}
