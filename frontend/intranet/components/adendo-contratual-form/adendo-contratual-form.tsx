﻿"use client";

import { useState, useMemo } from "react";
import { formatCpfView } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfAdendoContratual } from "@/lib/pdf/gerarPdfAdendoContratual";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

const sectionClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const labelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
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
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

      <div className="space-y-5 p-5 md:p-6">
        <section className={sectionClass}>
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-title">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Consulta do associado
            </h2>
            <p className="mt-1 text-sm text-paragraph">
              Busque pelo CPF para carregar os dados do associado e complete as informações do adendo.
            </p>
          </div>

          <SearchForm onSearch={onBuscarAssociado}>
            <div>
              <label className={labelClass}>CPF do associado</label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <SearchInput
                  value={formatCpfView(cpfAssociado)}
                  onChange={(e) => {
                    setCpfAssociado(e.target.value);
                    setErroLocal("");
                  }}
                  placeholder="CPF do associado"
                  className={fieldClass}
                  inputMode="numeric"
                  maxLength={14}
                />

                <SearchButton loading={loading} label="Pesquisar" />

                <button
                  type="button"
                  onClick={gerar}
                  disabled={!formularioValido}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${formularioValido
                    ? "cursor-pointer bg-primary hover:bg-fourth"
                    : "cursor-not-allowed bg-slate-300"
                    }`}
                >
                  Gerar PDF
                </button>
              </div>

              {erro && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              {info && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {info}
                </div>
              )}
            </div>
          </SearchForm>
        </section>

        <section className={sectionClass}>
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-title">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Dados do associado
            </h2>
            <p className="mt-1 text-sm text-paragraph">
              Confira os dados carregados e informe a empresa e o número da CCB.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nome do associado</label>
              <input
                value={nomeAssociado}
                onChange={(e) => {
                  setNomeAssociado(e.target.value);
                  setErroLocal("");
                }}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Empresa</label>
              <input
                value={empresa}
                onChange={(e) => {
                  setEmpresa(e.target.value);
                  setErroLocal("");
                }}
                className={fieldClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Número da CCB</label>
              <input
                value={ccb}
                onChange={(e) => {
                  setCcb(e.target.value);
                  setErroLocal("");
                }}
                className={fieldClass}
                placeholder="Digite o número da CCB"
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-title">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Dados do cônjuge
            </h2>
            <p className="mt-1 text-sm text-paragraph">
              Busque o CPF do cônjuge ou preencha o nome manualmente.
            </p>
          </div>

          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[0.8fr_auto_1.2fr]">
            <div>
              <label className={labelClass}>CPF do cônjuge</label>
              <input
                value={formatCpfView(cpfConjugue)}
                onChange={(e) => {
                  setCpfConjugue(e.target.value);
                  setErroLocal("");
                }}
                placeholder="CPF do cônjuge"
                className={fieldClass}
                inputMode="numeric"
                maxLength={14}
              />
            </div>

            <button
              type="button"
              onClick={onBuscarConjugue}
              disabled={loading}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {conjugueHook.loading ? "Buscando..." : "Pesquisar"}
            </button>

            <div>
              <label className={labelClass}>Nome do cônjuge</label>
              <input
                value={nomeConjugue}
                onChange={(e) => {
                  setNomeConjugue(e.target.value);
                  setErroLocal("");
                }}
                className={fieldClass}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}