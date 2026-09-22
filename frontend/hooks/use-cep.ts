"use client";

import { useState } from "react";
import { buscarEnderecoPorCep, type EnderecoCep } from "@/services/cep.service";

export function useCep() {
  const [loadingCep, setLoadingCep] = useState(false);
  const [erroCep, setErroCep] = useState("");
  const [infoCep, setInfoCep] = useState("");

  async function buscar(cep: string): Promise<{ found: boolean; data?: EnderecoCep }> {
    try {
      setLoadingCep(true);
      setErroCep("");
      setInfoCep("");

      const data = await buscarEnderecoPorCep(cep);

      setInfoCep("Endereço carregado pelo CEP.");
      return { found: true, data };
    } catch (error: any) {
      setErroCep(error?.message || "Erro ao consultar CEP.");
      return { found: false };
    } finally {
      setLoadingCep(false);
    }
  }

  function limparMensagens() {
    setErroCep("");
    setInfoCep("");
  }

  return {
    loadingCep,
    erroCep,
    infoCep,
    buscar,
    limparMensagens,
  };
}