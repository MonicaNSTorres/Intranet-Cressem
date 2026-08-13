"use client";

import { useEffect, useMemo, useState } from "react";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { formatCpfView, onlyDigits } from "@/utils/br";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { getMeAdUser } from "@/services/auth.service";
import {
  listarCidadesAutorizacaoDebito,
  type CidadeOption,
} from "@/services/autorizacao_debito.service";
import { gerarPdfDeclaracaoPresencaEmprestimo } from "@/lib/pdf/gerarPdfDeclaracaoPresencaEmprestimo";

const sectionClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
const disabledButtonClass =
  "inline-flex h-10 items-center justify-center rounded-xl bg-slate-200 px-5 text-sm font-semibold text-slate-500 shadow-sm";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary";
const actionButtonClass =
  "inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-fourth";

function getHojeInputDate() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function DeclaracaoPresencaEmprestimoForm() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatrícula] = useState("");
  const [dataPresenca, setDataPresenca] = useState(getHojeInputDate);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [cidade, setCidade] = useState("");
  const [cidades, setCidades] = useState<CidadeOption[]>([]);
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
        const [me, cidadesResp] = await Promise.all([
          getMeAdUser(),
          listarCidadesAutorizacaoDebito(),
        ]);
        const nomeUser = String(me?.nome_completo || me?.username || "").trim();
        if (ativo && nomeUser) setFuncionárioLogado(nomeUser);
        if (ativo) setCidades(cidadesResp || []);
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
      !!horaFim &&
      !!cidade.trim()
    );
  }, [cpf, nome, matricula, dataPresenca, horaInicio, horaFim, cidade]);

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
      cidade,
      funcionarioLogado,
    });

    setInfoLocal("PDF gerado com sucesso.");
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

      <div className="space-y-5 p-5 md:p-6">
        <SearchForm onSearch={onBuscar}>
          <div className={sectionClass}>
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-title">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Pesquisa do associado
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Digite o CPF para buscar os dados do associado ou preencher manualmente.
              </p>
            </div>

            <label className={labelClass}>CPF do associado</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <SearchInput
                value={formatCpfView(cpf)}
                onChange={(e) => {
                  setCpf(e.target.value);
                  setErroLocal("");
                  setInfoLocal("");
                }}
                placeholder="CPF (somente números)"
                className={inputClass}
                inputMode="numeric"
                maxLength={14}
              />
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? "Buscando..." : "Pesquisar"}
              </button>
              <button
                type="button"
                onClick={onGerarPdf}
                disabled={!formularioCompleto}
                className={formularioCompleto ? actionButtonClass : disabledButtonClass}
              >
                Gerar PDF
              </button>
            </div>

            {erroAtual && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erroAtual}
              </div>
            )}
            {infoAtual && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {infoAtual}
              </div>
            )}
            {modoManual && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Modo manual ativo: informe os campos para continuar.
              </div>
            )}
          </div>
        </SearchForm>

        <section className={sectionClass}>
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-title">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Dados do associado
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nome do associado</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Matrícula</label>
              <input
                value={matricula}
                onChange={(e) => setMatrícula(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-title">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Período de presença
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className={labelClass}>Data</label>
              <input
                type="date"
                value={dataPresenca}
                onChange={(e) => setDataPresenca(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Hora inicial</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Hora final</label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Cidade</label>
              <select value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputClass}>
                <option value="">Selecione</option>
                {cidades.map((item) => (
                  <option key={item.ID_CIDADES} value={item.NM_CIDADE}>
                    {item.NM_CIDADE}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
