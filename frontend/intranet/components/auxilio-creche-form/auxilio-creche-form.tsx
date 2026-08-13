"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { gerarPdfAuxilioCreche } from "@/lib/pdf/gerarPdfAuxilioCreche";
import { AUXILIO_CRECHE_TETO } from "@/config/auxilio-creche";
import { fmtBRL, formatCpfView, hojeBR, monetizarDigitacao, parseBRL } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { FaFilePdf } from "react-icons/fa";

export function AuxilioCrecheForm() {
  const [cpf, setCpf] = useState("");

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [descritivo, setDescritivo] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [dataEntrega, setDataEntrega] = useState(hojeBR());
  const [erroFormulario, setErroFormulario] = useState("");

  const totalReembolsar = useMemo(() => {
    const valorPagoNum = parseBRL(valorPago);
    return valorPagoNum <= AUXILIO_CRECHE_TETO ? valorPagoNum : AUXILIO_CRECHE_TETO;
  }, [valorPago]);
  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const onBuscar = async () => {
    const r = await buscar(cpf);
    if (r.found) {
      setNome(r.data.nome || "");
      setMatricula(r.data.matricula || "");
    }
  };

  const validarCampos = () => {
    if (!nome.trim()) return "Preencha o nome do empregado(a).";
    if (!matricula.trim()) return "Preencha a matrícula.";
    if (!instituicao.trim()) return "Preencha a creche/instituição.";
    if (!descritivo.trim()) return "Preencha o descritivo.";
    if (!valorPago.trim()) return "Preencha o valor total pago.";
    if (!dataEntrega.trim()) return "Preencha a data de entrega.";

    const valorPagoNum = parseBRL(valorPago);

    if (valorPagoNum <= 0) {
      return "O valor total pago deve ser maior que zero.";
    }

    return null;
  };

  const formularioValido = useMemo(() => {
    const cpfValido = cpf.replace(/\D/g, "").length === 11;

    if (!cpfValido) return false;

    if (!nome.trim()) return false;

    if (!matricula.trim()) return false;

    if (!instituicao.trim()) return false;

    if (!descritivo.trim()) return false;

    if (!valorPago.trim()) return false;

    if (!dataEntrega.trim()) return false;

    const valorPagoNum = parseBRL(valorPago);

    if (valorPagoNum <= 0) return false;

    return true;
  }, [
    cpf,
    nome,
    matricula,
    instituicao,
    descritivo,
    valorPago,
    dataEntrega,
  ]);

  const gerar = async () => {
    const erroValidacao = validarCampos();

    if (erroValidacao) {
      setErroFormulario(erroValidacao);
      return;
    }

    setErroFormulario("");

    const valorPagoNum = parseBRL(valorPago);

    await gerarPdfAuxilioCreche({
      nome,
      matricula,
      instituicao,
      descritivo,
      valorPago: valorPagoNum,
      valorFixo: AUXILIO_CRECHE_TETO,
      totalReembolsar,
      dataEntrega,
    });
  };

  const mensagem = erroFormulario || erro || info;

  const classeMensagem =
    erroFormulario || erro
      ? "mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3"
      : "mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3";

  return (
    <div className="mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-t-4 border-t-[#00AE9D] p-5">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#00AE9D]">
            Consulta
          </p>
          <h2 className="text-lg font-bold text-slate-950">
            Dados do empregado
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pesquise por CPF para preencher os dados e gerar a solicitação.
          </p>
        </div>

        <SearchForm onSearch={onBuscar}>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
              CPF do empregado(a)
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Digite o CPF"
                inputMode="numeric"
                maxLength={14}
              />

              <SearchButton loading={loading} label="Pesquisar" />
            </div>

            {mensagem && <div className={classeMensagem}>{mensagem}</div>}
          </div>
        </SearchForm>
      </div>

      <div className="border-t border-slate-100 p-5">
        <SectionTitle title="Informações principais" />

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome do empregado(a)">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Matrícula">
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Creche/Instituição" className="md:col-span-2">
            <input
              value={instituicao}
              onChange={(e) => setInstituicao(e.target.value)}
              className={inputClass}
              placeholder="Nome da creche/instituição"
            />
          </Field>

          <Field label="Descritivo" className="md:col-span-2">
            <textarea
              value={descritivo}
              onChange={(e) => setDescritivo(e.target.value)}
              className={`${inputClass} min-h-24 resize-y py-3`}
              rows={3}
              placeholder="Observações sobre o pagamento/beneficiário"
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100 p-5">
        <SectionTitle title="Valores e entrega" />

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Valor total pago">
            <input
              value={valorPago}
              onChange={(e) => setValorPago(monetizarDigitacao(e.target.value))}
              className={inputClass}
              placeholder="R$ 0,00"
            />
          </Field>

          <Field label="Total a reembolsar">
            <input
              readOnly
              value={fmtBRL(totalReembolsar)}
              className={`${inputClass} bg-slate-50 font-bold`}
            />
          </Field>

          <Field label="Data de entrega">
            <input
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              className={inputClass}
              placeholder="dd/mm/aaaa"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/70 p-5">
        <button
          type="button"
          onClick={gerar}
          disabled={!formularioValido}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition ${
            formularioValido
              ? "bg-[#00AE9D] text-white hover:bg-[#49479D]"
              : "cursor-not-allowed bg-slate-300 text-white"
          }`}
        >
          <FaFilePdf size={14} />
          Gerar PDF
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/15";

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950">
      <span className="h-2 w-2 rounded-full bg-[#00AE9D]" />
      {title}
    </h3>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

