"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { getMeAdUser } from "@/services/auth.service";
import { VALORES_INTEGRALIZACAO, valorIntegralizacaoComMoeda } from "@/config/integralizacao";
import { formatCpfView, fmtBRL, onlyDigits, parseBRL } from "@/utils/br";
import { gerarPdfAutorizacaoDescontoTaxaIntegralizacao } from "@/lib/pdf/gerarPdfAutorizacaoDescontoTaxaIntegralizacao";

const TAXA_MANUTENCAO = 12.7;

export function AutorizacaoDescontoTaxaIntegralizacaoForm() {
  const [cpfBusca, setCpfBusca] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [atendente, setAtendente] = useState("");
  const [integralizacao, setIntegralizacao] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const [infoLocal, setInfoLocal] = useState("");

  const erroRef = useRef<HTMLDivElement | null>(null);
  const { loading, erro, info, buscar } = useAssociadoPorCpf();

  const total = useMemo(() => TAXA_MANUTENCAO + parseBRL(integralizacao), [integralizacao]);

  useEffect(() => {
    async function carregarUsuario() {
      try {
        const me = await getMeAdUser();
        setAtendente(me?.nome_completo || me?.username || "");
      } catch {
        setAtendente("");
      }
    }

    carregarUsuario();
  }, []);

  useEffect(() => {
    if (erroLocal || erro) {
      erroRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [erroLocal, erro]);

  async function onBuscar() {
    setErroLocal("");
    setInfoLocal("");

    const r = await buscar(cpfBusca);
    const cpfDigitado = onlyDigits(cpfBusca);

    if (r.found && r.data) {
      setNome(r.data.nome || "");
      setCpf(r.data.cpf || cpfDigitado);
      setInfoLocal("Dados carregados com sucesso. Ajuste manualmente se necessário.");
      return;
    }

    setNome("");
    setCpf(cpfDigitado);
    setInfoLocal("Associado não encontrado. Preencha o nome manualmente para gerar a autorização.");
  }

  function validar() {
    if (onlyDigits(cpf || cpfBusca).length !== 11) return "Informe um CPF válido.";
    if (!nome.trim()) return "Informe o nome do associado.";
    if (!atendente.trim()) return "Informe o atendente.";
    if (parseBRL(integralizacao) <= 0) return "Informe o valor de integralização.";
    return "";
  }

  async function onGerarPdf() {
    const msg = validar();
    setErroLocal(msg);

    if (msg) return;

    await gerarPdfAutorizacaoDescontoTaxaIntegralizacao({
      nome,
      cpf: cpf || cpfBusca,
      atendente,
      taxaManutencao: TAXA_MANUTENCAO,
      integralizacao: parseBRL(integralizacao),
    });
  }

  const inputClass =
    "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100";
  const labelClass = "text-xs font-bold uppercase tracking-wide text-slate-600";
  const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const sectionTitleClass =
    "flex items-center gap-2 text-base font-bold text-title before:block before:h-2 before:w-2 before:rounded-full before:bg-primary";

  return (
    <div className="mx-auto min-w-225 space-y-5">
      <SearchForm onSearch={onBuscar} className={`${cardClass} space-y-3`}>
        <div>
          <h2 className={sectionTitleClass}>Pesquisa do associado</h2>
          <p className="mt-1 text-sm text-paragraph">
            Digite o CPF para buscar o nome automaticamente.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className={labelClass}>CPF do associado</label>
            <SearchInput
              value={formatCpfView(cpfBusca)}
              onChange={(e) => setCpfBusca(formatCpfView(e.target.value))}
              placeholder="Digite o CPF"
              inputMode="numeric"
              maxLength={14}
              className="mt-1 h-10"
            />
          </div>
          <SearchButton loading={loading} />
        </div>

        {(erroLocal || erro || infoLocal || info) && (
          <div
            ref={erroRef}
            className={`rounded-xl border px-4 py-3 text-sm ${
              erroLocal || erro
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {erroLocal || erro || infoLocal || info}
          </div>
        )}
      </SearchForm>

      <section className={cardClass}>
        <h2 className={sectionTitleClass}>Dados da autorização</h2>
        <p className="mt-1 text-sm text-paragraph">
          A taxa de manutenção fica fixa em R$ 12,70 e o total é calculado automaticamente.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className={labelClass}>Nome do associado</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              className={`${inputClass} mt-1`}
              placeholder="Nome preenchido pela busca ou manualmente"
            />
          </div>
          <div>
            <label className={labelClass}>CPF</label>
            <input
              value={formatCpfView(cpf || cpfBusca)}
              onChange={(e) => {
                setCpf(formatCpfView(e.target.value));
                setCpfBusca(formatCpfView(e.target.value));
              }}
              className={`${inputClass} mt-1`}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
            />
          </div>
          <div>
            <label className={labelClass}>Atendente</label>
            <input
              value={atendente}
              onChange={(e) => setAtendente(e.target.value.toUpperCase())}
              className={`${inputClass} mt-1`}
              placeholder="Nome do atendente"
            />
          </div>
          <div>
            <label className={labelClass}>Taxa manutenção</label>
            <input value={fmtBRL(TAXA_MANUTENCAO)} className={`${inputClass} mt-1`} readOnly />
          </div>
          <div>
            <label className={labelClass}>Integralização</label>
            <select
              value={integralizacao}
              onChange={(e) => setIntegralizacao(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">Selecione</option>
              {VALORES_INTEGRALIZACAO.map(({ nivel, valor }) => (
                <option key={nivel} value={valorIntegralizacaoComMoeda(valor)}>
                  Nível {nivel} - {valorIntegralizacaoComMoeda(valor)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Total do desconto autorizado
            </p>
            <p className="mt-1 text-3xl font-bold text-title">{fmtBRL(total)}</p>
            <p className="mt-1 text-sm text-paragraph">
              Integralização + taxa de manutenção fixa.
            </p>
          </div>
          <button
            type="button"
            onClick={onGerarPdf}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <FileText size={16} />
            Gerar PDF
          </button>
        </div>
      </section>
    </div>
  );
}
