"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { gerarPdfAssociado } from "@/lib/pdf/gerarPdf";
import { formatCpfView, monetizarDigitacao } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

type Associado = {
  nome: string;
  cpf: string;
  matricula: string;
  empresa: string;
};

export function ConsultaAssociadoForm() {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState<Associado | null>(null);
  const [valorAnterior, setValorAnterior] = useState("");
  const [valorNovo, setValorNovo] = useState("");
  const [atendente, setAtendente] = useState("");
  const [dataPrimeiroDesconto, setDataPrimeiroDesconto] = useState("");
  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    setData(null);

    const r = await buscar(cpf);
    if (r.found) {
      setData({
        nome: r.data.nome || "",
        cpf: r.data.cpf || cpf,
        matricula: r.data.matricula || "",
        empresa: r.data.empresa || "",
      });
    }
  };

  const onGerarPdf = async () => {
    if (!data) return;

    await gerarPdfAssociado({
      nome: data.nome,
      cpf: data.cpf,
      matricula: data.matricula,
      empresa: data.empresa,
      atendente,
      dataPrimeiroDesconto,
      valorAnterior,
      valorNovo,
    });
  };

  return (
    <div className="min-w-225 mx-auto p-6 bg-white rounded-xl shadow">
      <SearchForm onSearch={onBuscar}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CPF do associado(a)
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <SearchInput
              value={formatCpfView(cpf)}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="CPF (somente números)"
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

      {data && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome completo
              </label>
              <input
                readOnly
                value={data.nome}
                className="w-full border px-3 py-2 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                CPF
              </label>
              <input
                readOnly
                value={formatCpfView(data.cpf)}
                className="w-full border px-3 py-2 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Matrícula
              </label>
              <input
                readOnly
                value={data.matricula}
                className="w-full border px-3 py-2 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Empresa
              </label>
              <input
                readOnly
                value={data.empresa}
                className="w-full border px-3 py-2 rounded bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Atendente
              </label>
              <input
                value={atendente}
                onChange={(e) => setAtendente(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                placeholder="Nome do atendente"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Data 1º Desconto
              </label>
              <input
                type="date"
                value={dataPrimeiroDesconto}
                onChange={(e) => setDataPrimeiroDesconto(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Valor Anterior
              </label>
              <input
                type="text"
                value={valorAnterior}
                onChange={(e) =>
                  setValorAnterior(monetizarDigitacao(e.target.value))
                }
                className="w-full border px-3 py-2 rounded"
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Valor Novo
              </label>
              <input
                type="text"
                value={valorNovo}
                onChange={(e) =>
                  setValorNovo(monetizarDigitacao(e.target.value))
                }
                className="w-full border px-3 py-2 rounded"
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex items-center justify-end">
            <button
              onClick={onGerarPdf}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer text-white font-semibold px-5 py-2 rounded shadow"
            >
              Gerar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}