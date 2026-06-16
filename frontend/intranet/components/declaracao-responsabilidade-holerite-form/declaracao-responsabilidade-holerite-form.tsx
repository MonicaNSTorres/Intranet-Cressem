"use client";

import { useMemo, useState } from "react";
import { SearchButton } from "@/components/ui/search-button";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfDeclaracaoResponsabilidadeHolerite } from "@/lib/pdf/gerarPdfDeclaracaoResponsabilidadeHolerite";
import { formatCpfView, monetizarDigitacao, onlyDigits } from "@/utils/br";

function hojeIso() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mesAtualBR() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${mes}/${ano}`;
}

function formatarMesAnoBR(value: string) {
  const digitos = value.replace(/\D/g, "").slice(0, 6);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

export function DeclaracaoResponsabilidadeHoleriteForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [rg, setRg] = useState("");
  const [mesReferencia, setMesReferencia] = useState(mesAtualBR());
  const [valor, setValor] = useState("");
  const [prazoMeses, setPrazoMeses] = useState("");
  const [local, setLocal] = useState("São José dos Campos");
  const [dataDeclaracao, setDataDeclaracao] = useState(hojeIso());
  const [erroLocal, setErroLocal] = useState("");
  const [infoLocal, setInfoLocal] = useState("");
  const [modoManual, setModoManual] = useState(false);

  const { loading, erro, info, buscar } = useAssociadoPorCpf();
  const erroAtual = erroLocal || erro;
  const infoAtual = erroAtual ? "" : infoLocal || info;

  const onBuscar = async () => {
    setErroLocal("");
    setInfoLocal("");

    const result = await buscar(cpf);

    if (!result.found) {
      setNome("");
      setRg("");
      setModoManual(true);
      setInfoLocal("Associado não encontrado. Preencha os dados manualmente.");
      return;
    }

    setNome(result.data.nome || "");
    setCpf(result.data.cpf || cpf);
    setRg("");
    setModoManual(false);
  };

  const formularioCompleto = useMemo(() => {
    return (
      onlyDigits(cpf).length === 11 &&
      !!nome.trim() &&
      !!rg.trim() &&
      !!mesReferencia &&
      !!valor.trim() &&
      !!prazoMeses.trim() &&
      !!local.trim() &&
      !!dataDeclaracao
    );
  }, [cpf, nome, rg, mesReferencia, valor, prazoMeses, local, dataDeclaracao]);

  const onGerarPdf = async () => {
    if (!formularioCompleto) {
      setErroLocal("Preencha todos os campos obrigatórios para gerar o PDF.");
      setInfoLocal("");
      return;
    }

    setErroLocal("");
    setInfoLocal("Gerando PDF...");

    await gerarPdfDeclaracaoResponsabilidadeHolerite({
      nome: nome.trim(),
      cpf: formatCpfView(cpf),
      rg: rg.trim(),
      mesReferencia,
      valor,
      prazoMeses,
      local: local.trim(),
      dataDeclaracao,
    });

    setInfoLocal("PDF gerado com sucesso.");
  };

  return (
    <div className="min-w-225 mx-auto space-y-6">
      <div className="rounded-xl bg-white p-6 shadow">
        <SearchForm onSearch={onBuscar}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              CPF do cooperado
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => {
                  setCpf(e.target.value);
                  setErroLocal("");
                  setInfoLocal("");
                }}
                placeholder="CPF (somente números)"
                className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                inputMode="numeric"
                maxLength={14}
              />
              <SearchButton loading={loading} label="Pesquisar" />
              <button
                type="button"
                onClick={onGerarPdf}
                disabled={!formularioCompleto}
                className={`inline-flex items-center justify-center rounded px-5 py-2 font-semibold text-white shadow transition ${
                  formularioCompleto
                    ? "cursor-pointer bg-secondary hover:bg-primary"
                    : "cursor-not-allowed bg-gray-300"
                }`}
              >
                Gerar PDF
              </button>
            </div>

            {erroAtual && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erroAtual}
              </div>
            )}
            {infoAtual && (
              <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {infoAtual}
              </div>
            )}
            {modoManual && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Modo manual ativo: revise nome, CPF e RG antes de gerar o documento.
              </div>
            )}
          </div>
        </SearchForm>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900">
          Dados do cooperado
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          As informações podem ser carregadas pela busca e ajustadas manualmente.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nome completo
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Nome do cooperado"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              RG
            </label>
            <input
              value={rg}
              onChange={(e) => setRg(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="RG do cooperado"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Local
            </label>
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Cidade"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900">
          Dados do desconto
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Estes campos preenchem o texto da declaração e a impressão do PDF.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Mês de referência
            </label>
            <input
              value={mesReferencia}
              onChange={(e) => setMesReferencia(formatarMesAnoBR(e.target.value))}
              className="w-full rounded border px-3 py-2"
              placeholder="MM/AAAA"
              inputMode="numeric"
              maxLength={7}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Valor
            </label>
            <input
              value={valor}
              onChange={(e) => setValor(monetizarDigitacao(e.target.value))}
              className="w-full rounded border px-3 py-2"
              placeholder="R$ 0,00"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Prazo total (meses)
            </label>
            <input
              value={prazoMeses}
              onChange={(e) => setPrazoMeses(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded border px-3 py-2"
              placeholder="Ex.: 24"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Data
            </label>
            <input
              type="date"
              value={dataDeclaracao}
              onChange={(e) => setDataDeclaracao(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
