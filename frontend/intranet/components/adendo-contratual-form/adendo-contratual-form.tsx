"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { formatCpfView } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfAdendoContratual } from "@/lib/pdf/gerarPdfAdendoContratual";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function hojeBR() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export function AdendoContratualForm() {
  const [cpfAssociado, setCpfAssociado] = useState("");
  const [nomeAssociado, setNomeAssociado] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [ccb, setCcb] = useState("");

  const [cpfConjugue, setCpfConjugue] = useState("");
  const [nomeConjugue, setNomeConjugue] = useState("");

  const associadoHook = useAssociadoPorCpf();
  const conjugueHook = useAssociadoPorCpf();

  const erro = associadoHook.erro || conjugueHook.erro;
  const info = associadoHook.info || conjugueHook.info;
  const loading = associadoHook.loading || conjugueHook.loading;

  const onBuscarAssociado = async () => {
    const r = await associadoHook.buscar(cpfAssociado);

    if (r.found) {
      setNomeAssociado(r.data.nome || "");
      setEmpresa(r.data.empresa || "");
    }
  };

  const onBuscarConjugue = async () => {
    const r = await conjugueHook.buscar(cpfConjugue);

    if (r.found) {
      setNomeConjugue(r.data.nome || "");
    }
  };

  const gerar = async () => {
    await gerarPdfAdendoContratual({
      dataHoje: hojeBR(),
      ccb,
      nomeAssociado,
      cpfAssociado: formatCpfView(cpfAssociado),
      empresa,
      nomeConjugue,
      cpfConjugue: formatCpfView(cpfConjugue),
    });
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <SearchForm onSearch={onBuscarAssociado}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CPF do associado
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <SearchInput
              value={formatCpfView(cpfAssociado)}
              onChange={(e) => setCpfAssociado(e.target.value)}
              placeholder="CPF do associado"
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
              inputMode="numeric"
              maxLength={14}
            />

            <SearchButton loading={loading} label="Pesquisar" />
          </div>

          {erro && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {erro}
            </div>
          )}

          {info && (
            <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
              {info}
            </div>
          )}
        </div>
      </SearchForm>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nome do associado
          </label>
          <input
            value={nomeAssociado}
            onChange={(e) => setNomeAssociado(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Empresa
          </label>
          <input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Número da CCB
          </label>
          <input
            value={ccb}
            onChange={(e) => setCcb(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Digite o número da CCB"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          CPF do cônjuge
        </label>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={formatCpfView(cpfConjugue)}
            onChange={(e) => setCpfConjugue(e.target.value)}
            placeholder="CPF do cônjuge"
            className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />

          <button
            onClick={onBuscarConjugue}
            disabled={loading}
            className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md"
          >
            {conjugueHook.loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nome do cônjuge
          </label>
          <input
            value={nomeConjugue}
            onChange={(e) => setNomeConjugue(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      <div className="pt-5 border-t mt-6 flex items-center justify-end">
        <button
          onClick={gerar}
          className="inline-flex items-center gap-2 bg-secondary hover:bg-primary cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}