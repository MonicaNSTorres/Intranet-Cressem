"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useState } from "react";
import { gerarPdfAdiantamentoSalarial } from "@/lib/pdf/gerarPdfAdiantamentoSalarial";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function hojeBRComHora() {
  const d = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

export function AdiantamentoSalarialForm() {
  const [cpf, setCpf] = useState("");

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [prontuario, setProntuario] = useState("");

  const [percentual, setPercentual] = useState<20 | 30>(30);
  const [acao, setAcao] = useState<"Ativar" | "Cancelar">("Ativar");

  const [dataLocal, setDataLocal] = useState(hojeBRComHora());

  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    const r = await buscar(cpf);
    if (r.found) {
      setNome(r.data.nome || "");
      setMatricula(r.data.matricula || "");
    }
  };

  const gerar = async () => {
    await gerarPdfAdiantamentoSalarial({
      nome: nome || "_________________________",
      matricula: matricula || "",
      prontuario: prontuario || "",
      percentual,
      dataCabecalho: dataLocal,
      cidade: "São José dos Campos",
      acao,
    });
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <SearchForm onSearch={onBuscar}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CPF do empregado(a)
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

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nome do empregado(a)
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

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Ação
          </label>
          <select
            value={acao}
            onChange={(e) => setAcao(e.target.value as "Ativar" | "Cancelar")}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="Ativar">Ativar</option>
            <option value="Cancelar">Cancelar</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Percentual
          </label>
          <select
            value={percentual}
            onChange={(e) => setPercentual(Number(e.target.value) as 20 | 30)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value={20}>20%</option>
            <option value={30}>30%</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Data e hora (cabeçalho)
          </label>
          <input
            value={dataLocal}
            onChange={(e) => setDataLocal(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="dd/mm/aaaa hh:mm"
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