"use client";

import { useEffect, useMemo, useState } from "react";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { formatCpfView, onlyDigits } from "@/utils/br";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { getMeAdUser } from "@/services/auth.service";
import { gerarPdfDeclaracaoPresencaEmprestimo } from "@/lib/pdf/gerarPdfDeclaracaoPresencaEmprestimo";

export function DeclaracaoPresencaEmprestimoForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatrícula] = useState("");
  const [dataPresenca, setDataPresenca] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [funcionarioLogado, setFuncionárioLogado] = useState("Funcionário");
  const [erroLocal, setErroLocal] = useState("");
  const [infoLocal, setInfoLocal] = useState("");
  const [modoManual, setModoManual] = useState(false);

  const { loading, erro, info, buscar } = useAssociadoPorCpf();
  const erroAtual = erroLocal || erro;
  const infoAtual = erroAtual ? "" : infoLocal || info;

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        const me = await getMeAdUser();
        const nomeUser = String(me?.nome_completo || me?.username || "").trim();
        if (ativo && nomeUser) setFuncionárioLogado(nomeUser);
      } catch {
        // fallback: mantém valor padrão
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  const onBuscar = async () => {
    setErroLocal("");
    setInfoLocal("");

    const result = await buscar(cpf);

    if (!result.found) {
      setNome("");
      setMatrícula("");
      setModoManual(true);
      setInfoLocal("Associado não encontrado. Preencha nome e matrícula manualmente.");
      return;
    }

    setNome(result.data.nome || "");
    setMatrícula(result.data.matricula || "");
    setModoManual(false);
  };

  const formularioCompleto = useMemo(() => {
    return (
      onlyDigits(cpf).length === 11 &&
      !!nome.trim() &&
      !!matricula.trim() &&
      !!dataPresenca &&
      !!horaInicio &&
      !!horaFim
    );
  }, [cpf, nome, matricula, dataPresenca, horaInicio, horaFim]);

  const onGerarPdf = async () => {
    if (!formularioCompleto) {
      setErroLocal("Preencha todos os campos obrigatórios para gerar o PDF.");
      setInfoLocal("");
      return;
    }

    setErroLocal("");
    setInfoLocal("Gerando PDF...");

    await gerarPdfDeclaracaoPresencaEmprestimo({
      nome: nome.trim(),
      matricula: matricula.trim(),
      cpf: formatCpfView(cpf),
      dataPresenca,
      horaInicio,
      horaFim,
      funcionarioLogado,
    });

    setInfoLocal("PDF gerado com sucesso.");
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <SearchForm onSearch={onBuscar}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CPF do associado</label>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <SearchInput
              value={formatCpfView(cpf)}
              onChange={(e) => {
                setCpf(e.target.value);
                setErroLocal("");
                setInfoLocal("");
              }}
              placeholder="CPF (somente números)"
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300"
              inputMode="numeric"
              maxLength={14}
            />
            <SearchButton loading={loading} label="Pesquisar" />
            <button
              type="button"
              onClick={onGerarPdf}
              disabled={!formularioCompleto}
              className={`inline-flex items-center gap-2 text-white font-semibold px-5 py-2 rounded shadow transition ${
                formularioCompleto
                  ? "bg-secondary hover:bg-primary cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Gerar PDF
            </button>
          </div>

          {erroAtual && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {erroAtual}
            </div>
          )}
          {infoAtual && (
            <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3">
              {infoAtual}
            </div>
          )}
          {modoManual && (
            <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
              Modo manual ativo: informe os campos para continuar.
            </div>
          )}
        </div>
      </SearchForm>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome do associado</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Matrícula</label>
          <input
            value={matricula}
            onChange={(e) => setMatrícula(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      <div className="mt-6 border-t pt-5">
        <label className="block text-xs font-medium text-gray-600 mb-3">Período de presença</label>
        <div className="grid grid-cols-1 gap-3 rounded border p-3 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Data</label>
            <input
              type="date"
              value={dataPresenca}
              onChange={(e) => setDataPresenca(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Hora Inicial</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Hora Final</label>
            <input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
