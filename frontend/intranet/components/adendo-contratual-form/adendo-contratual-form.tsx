"use client";

import { useState, useMemo } from "react";
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
  const [erroLocal, setErroLocal] = useState("");

  const associadoHook = useAssociadoPorCpf();
  const conjugueHook = useAssociadoPorCpf();

  const erro = erroLocal || associadoHook.erro || conjugueHook.erro;
  const info = erro ? "" : associadoHook.info || conjugueHook.info;
  const loading = associadoHook.loading || conjugueHook.loading;

  const onBuscarAssociado = async () => {
    setErroLocal("");
    const r = await associadoHook.buscar(cpfAssociado);

    if (r.found) {
      setNomeAssociado(r.data.nome || "");
      setEmpresa(r.data.empresa || "");
    }
  };

  const onBuscarConjugue = async () => {
    setErroLocal("");
    const r = await conjugueHook.buscar(cpfConjugue);

    if (r.found) {
      setNomeConjugue(r.data.nome || "");
    }
  };

  const validarCamposGeracao = () => {
    if (!cpfAssociado.trim()) return "Preencha o CPF do associado.";
    if (!nomeAssociado.trim()) return "Preencha o nome do associado.";
    if (!empresa.trim()) return "Preencha a empresa.";
    if (!ccb.trim()) return "Preencha o número da CCB.";
    if (!cpfConjugue.trim()) return "Preencha o CPF do cônjuge.";
    if (!nomeConjugue.trim()) return "Preencha o nome do cônjuge.";
    return "";
  };

  const gerar = async () => {
    const erroValidacao = validarCamposGeracao();
    if (erroValidacao) {
      setErroLocal(erroValidacao);
      return;
    }

    setErroLocal("");
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

  const formularioValido = useMemo(() => {
    return (
      cpfAssociado.replace(/\D/g, "").length === 11 &&
      nomeAssociado.trim() !== "" &&
      empresa.trim() !== "" &&
      ccb.trim() !== "" &&
      cpfConjugue.replace(/\D/g, "").length === 11 &&
      nomeConjugue.trim() !== ""
    );
  }, [
    cpfAssociado,
    nomeAssociado,
    empresa,
    ccb,
    cpfConjugue,
    nomeConjugue,
  ]);

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <SearchForm onSearch={onBuscarAssociado}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CPF do associado
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <SearchInput
              value={formatCpfView(cpfAssociado)}
              onChange={(e) => {
                setCpfAssociado(e.target.value);
                setErroLocal("");
              }}
              placeholder="CPF do associado"
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
              inputMode="numeric"
              maxLength={14}
            />

            <SearchButton loading={loading} label="Pesquisar" />

            <button
              type="button"
              onClick={gerar}
              disabled={!formularioValido}
              className={`inline-flex items-center justify-center gap-2 text-white font-semibold px-5 py-2 rounded shadow whitespace-nowrap transition
    ${formularioValido
                  ? "bg-secondary hover:bg-primary cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
                }`}
            >
              Gerar PDF
            </button>
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
            onChange={(e) => {
              setNomeAssociado(e.target.value);
              setErroLocal("");
            }}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Empresa
          </label>
          <input
            value={empresa}
            onChange={(e) => {
              setEmpresa(e.target.value);
              setErroLocal("");
            }}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Número da CCB
          </label>
          <input
            value={ccb}
            onChange={(e) => {
              setCcb(e.target.value);
              setErroLocal("");
            }}
            className="w-full border px-3 py-2 rounded"
            placeholder="Digite o número da CCB"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[0.8fr_auto_1.2fr] gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CPF do cônjuge
          </label>
          <input
            value={formatCpfView(cpfConjugue)}
            onChange={(e) => {
              setCpfConjugue(e.target.value);
              setErroLocal("");
            }}
            placeholder="CPF do cônjuge"
            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
            inputMode="numeric"
            maxLength={14}
          />
        </div>

        <button
          type="button"
          onClick={onBuscarConjugue}
          disabled={loading}
          className="bg-secondary text-white font-semibold px-6 py-2 rounded hover:bg-primary cursor-pointer hover:shadow-md h-[42px]"
        >
          {conjugueHook.loading ? "Buscando..." : "Pesquisar"}
        </button>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nome do cônjuge
          </label>
          <input
            value={nomeConjugue}
            onChange={(e) => {
              setNomeConjugue(e.target.value);
              setErroLocal("");
            }}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>
    </div>
  );
}
