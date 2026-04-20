"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfAdiantamentoSalarialEmprestimo } from "@/lib/pdf/gerarPdfAdiantamentoSalarialEmprestimo";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

const EMPRESAS_CANCELAMENTO = ["IPSM", "PMSJC", "URBAM"] as const;

const EMPRESAS_RETORNO = [
  "Prefeitura-SJCampos",
  "Câmara-SJCampos",
  "Urbam",
  "Cressem",
  "Ipsm",
  "Fundhas",
  "FCCR",
  "Sindicato",
  "Estado",
  "Assem",
  "Prefeitura-Campos do Jordão",
  "Prefeitura-llhabela",
  "Instituto-llhabela",
  "Câmara-Jacareí",
  "Prefeitura-Jacareí",
  "Prefeitura-Santo Antonio",
  "Próvisão",
] as const;

const MOTIVOS_RETORNO = [
  "NÃO POSSUI EMPRÉSTIMO NA CRESSEM",
  "DEIXOU DE SER ASSOCIADO DA CRESSEM",
  "DIMINUIU O VALOR DA PARCELA DO EMPRÉSTIMO",
  "TEVE MELHORIA NA SUA CONDIÇÃO SALARIAL",
] as const;

function toIsoFromBr(value: string) {
  if (!value) return "";
  const [dia, mes, ano] = value.split("/");
  if (!dia || !mes || !ano) return "";
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function toBrFromIso(value: string) {
  if (!value) return "";
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return "";
  return `${dia}/${mes}/${ano}`;
}

export function AdiantamentoSalarialEmprestimoForm() {
  const [cpf, setCpf] = useState("");
  const [tipoFormulario, setTipoFormulario] = useState("");
  const [empresaCancelamento, setEmpresaCancelamento] = useState("");
  const [solicita, setSolicita] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [empresaRetorno, setEmpresaRetorno] = useState("");
  const [motivoRetorno, setMotivoRetorno] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [documento, setDocumento] = useState("");
  const [reativacaoMeses, setReativacaoMeses] = useState("");

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    const r = await buscar(cpf);
    if (r.found) {
      setNome(r.data.nome || "");
      setMatricula(r.data.matricula || "");
    }
  };

  const isCancelamento = tipoFormulario === "CANCELAMENTO";
  const isRetorno = tipoFormulario === "RETORNO";
  const isIpsm = empresaCancelamento === "IPSM";
  const isUrbam = empresaCancelamento === "URBAM";
  const isPmsjc = empresaCancelamento === "PMSJC";

  const gerar = async () => {
    await gerarPdfAdiantamentoSalarialEmprestimo({
      tipoFormulario: tipoFormulario as "CANCELAMENTO" | "RETORNO",
      empresaCancelamento,
      solicita,
      nome,
      matricula,
      cpf: formatCpfView(cpf),
      empresaRetorno,
      motivoRetorno,
      dataInicio: toBrFromIso(dataInicio),
      dataFim: toBrFromIso(dataFim),
      documento,
      reativacaoMeses,
      dataHoje: hojeBR(),
      atendente: "Atendente",
    });
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <SearchForm onSearch={onBuscar}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CPF do associado
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <SearchInput
              value={formatCpfView(cpf)}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="CPF (somente números)"
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

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tipo de formulário
          </label>
          <select
            value={tipoFormulario}
            onChange={(e) => {
              setTipoFormulario(e.target.value);
              setEmpresaCancelamento("");
              setSolicita("");
              setEmpresaRetorno("");
              setMotivoRetorno("");
              setDataInicio("");
              setDataFim("");
              setDocumento("");
              setReativacaoMeses("");
            }}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Selecione</option>
            <option value="CANCELAMENTO">Cancelamento</option>
            <option value="RETORNO">Retorno</option>
          </select>
        </div>

        {isCancelamento && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Empresa
            </label>
            <select
              value={empresaCancelamento}
              onChange={(e) => setEmpresaCancelamento(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Selecione</option>
              {EMPRESAS_CANCELAMENTO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        )}

        {(isRetorno || isUrbam) && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Solicita
            </label>
            <select
              value={solicita}
              onChange={(e) => setSolicita(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Selecione</option>
              <option value="CANCELAR">Cancelar</option>
              <option value="REATIVAR">Reativar</option>
            </select>
          </div>
        )}
      </div>

      {(isCancelamento || isRetorno) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nome do associado
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Matrícula
            </label>
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>
      )}

      {isRetorno && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Empresa
            </label>
            <select
              value={empresaRetorno}
              onChange={(e) => setEmpresaRetorno(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Selecione</option>
              {EMPRESAS_RETORNO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Motivo
            </label>
            <select
              value={motivoRetorno}
              onChange={(e) => setMotivoRetorno(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Selecione</option>
              {MOTIVOS_RETORNO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isCancelamento && (isIpsm || isUrbam || isPmsjc) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {(isUrbam || isPmsjc) && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Documento
              </label>
              <input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                placeholder={isPmsjc ? "RG" : "Documento"}
              />
            </div>
          )}
        </div>
      )}

      {isCancelamento && (isUrbam || isPmsjc) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Reativação em meses
            </label>
            <input
              value={reativacaoMeses}
              onChange={(e) => setReativacaoMeses(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="Ex.: 12"
            />
          </div>
        </div>
      )}

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