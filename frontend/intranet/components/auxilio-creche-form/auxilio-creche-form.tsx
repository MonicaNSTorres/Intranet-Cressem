"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { gerarPdfAuxilioCreche } from "@/lib/pdf/gerarPdfAuxilioCreche";
import { AUXILIO_CRECHE_TETO } from "@/config/auxilio-creche";
import { fmtBRL, formatCpfView, hojeBR, monetizarDigitacao, parseBRL } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

export function AuxilioCrecheForm() {
  const [cpf, setCpf] = useState("");

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [descritivo, setDescritivo] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [dataEntrega, setDataEntrega] = useState(hojeBR());

  const totalReembolsar = useMemo(() => AUXILIO_CRECHE_TETO, []);
  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    const r = await buscar(cpf);
    if (r.found) {
      setNome(r.data.nome || "");
      setMatricula(r.data.matricula || "");
    }
  };

  const gerar = async () => {
    const valorPagoNum = parseBRL(valorPago);

    await gerarPdfAuxilioCreche({
      nome,
      matricula,
      instituicao,
      descritivo,
      valorPago: valorPagoNum,
      valorFixo: AUXILIO_CRECHE_TETO,
      totalReembolsar: AUXILIO_CRECHE_TETO,
      dataEntrega,
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

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Creche/Instituição
          </label>
          <input
            value={instituicao}
            onChange={(e) => setInstituicao(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Nome da creche/instituição"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Descritivo
        </label>
        <textarea
          value={descritivo}
          onChange={(e) => setDescritivo(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          rows={3}
          placeholder="Observações sobre o pagamento/beneficiário"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Valor total pago
          </label>
          <input
            value={valorPago}
            onChange={(e) => setValorPago(monetizarDigitacao(e.target.value))}
            className="w-full border px-3 py-2 rounded text-right"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Total a reembolsar
          </label>
          <input
            readOnly
            value={fmtBRL(totalReembolsar)}
            className="w-full border px-3 py-2 rounded bg-gray-50 text-right"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Data de entrega
          </label>
          <input
            value={dataEntrega}
            onChange={(e) => setDataEntrega(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="dd/mm/aaaa"
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