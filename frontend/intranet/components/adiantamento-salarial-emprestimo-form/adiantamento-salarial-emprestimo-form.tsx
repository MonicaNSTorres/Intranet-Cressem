"use client";

import { useEffect, useState, useMemo } from "react";
import { formatCpfView, hojeBR } from "@/utils/br";
import { useAssociadoPorCpf } from "@/hooks/useAssociadoPorCpf";
import { gerarPdfAdiantamentoSalarialEmprestimo } from "@/lib/pdf/gerarPdfAdiantamentoSalarialEmprestimo";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";
import { getMeAdUser } from "@/services/auth.service";

const EMPRESAS_CANCELAMENTO = ["IPSM", "PMSJC", "URBAM"] as const;

const EMPRESAS_RETORNO = [
  "PREFEITURA-SJCAMPOS",
  "CAMARA-SJCAMPOS",
  "URBAM",
  "CRESSEM",
  "IPSM",
  "FUNDHAS",
  "FCCR",
  "SINDICATO",
  "ESTADO",
  "ASSEM",
  "PREFEITURA-CAMPOS DO JORDAO",
  "PREFEITURA-ILHABELA",
  "INSTITUTO-ILHABELA",
  "CAMARA-JACAREI",
  "PREFEITURA-JACAREI",
  "PREFEITURA-SANTO ANTONIO",
  "PROVISAO",
] as const;

const MOTIVOS_RETORNO = [
  "NAO POSSUI EMPRESTIMO NA CRESSEM",
  "DEIXOU DE SER ASSOCIADO DA CRESSEM",
  "DIMINUIU O VALOR DA PARCELA DO EMPRESTIMO",
  "TEVE MELHORIA NA SUA CONDICAO SALARIAL",
] as const;

function toBrFromIso(value: string) {
  if (!value) return "";
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return "";
  return `${dia}/${mes}/${ano}`;
}

const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
const fieldClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
const sectionClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const sectionTitleClass = "flex items-center gap-2 text-base font-semibold text-title";

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
  const [nomeAtendente, setNomeAtendente] = useState("Atendente");
  const [erroLocal, setErroLocal] = useState("");
  const [infoLocal, setInfoLocal] = useState("");

  const { loading, erro, info, buscar } = useAssociadoPorCpf();
  const erroAtual = erroLocal || erro;
  const infoAtual = erroAtual ? "" : infoLocal || info;

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const me = await getMeAdUser();
        const nome = String(me?.nome_completo || me?.username || "").trim();
        if (ativo && nome) setNomeAtendente(nome);
      } catch {
        // fallback mantém "Atendente"
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const onBuscar = async () => {
    setErroLocal("");
    setInfoLocal("");

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

  const validarCamposGeracao = () => {
    if (!cpf.trim()) return "Preencha todos os campos obrigatórios para gerar o PDF.";
    if (!tipoFormulario) return "Preencha todos os campos obrigatórios para gerar o PDF.";
    if (!nome.trim() || !matricula.trim()) {
      return "Preencha todos os campos obrigatórios para gerar o PDF.";
    }

    if (isCancelamento) {
      if (!empresaCancelamento) return "Preencha todos os campos obrigatórios para gerar o PDF.";
      if (isUrbam && !solicita) return "Preencha todos os campos obrigatórios para gerar o PDF.";
      if ((isIpsm || isUrbam || isPmsjc) && (!dataInicio || !dataFim)) {
        return "Preencha todos os campos obrigatórios para gerar o PDF.";
      }
      if (isPmsjc && !documento.trim()) {
        return "Preencha todos os campos obrigatórios para gerar o PDF.";
      }
      if (isPmsjc && !reativacaoMeses.trim()) {
        return "Preencha todos os campos obrigatórios para gerar o PDF.";
      }
    }

    if (isRetorno && (!empresaRetorno || !motivoRetorno)) {
      return "Preencha todos os campos obrigatórios para gerar o PDF.";
    }

    return "";
  };

  const gerar = async () => {
    const erroValidacao = validarCamposGeracao();
    if (erroValidacao) {
      setErroLocal(erroValidacao);
      setInfoLocal("");
      return;
    }

    setErroLocal("");
    setInfoLocal("Todos os campos obrigatórios preenchidos. Gerando PDF...");

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
      atendente: nomeAtendente || "Atendente",
    });
  };

  const formularioValido = useMemo(() => {
    if (cpf.replace(/\D/g, "").length !== 11) return false;
    if (!tipoFormulario) return false;
    if (!nome.trim()) return false;
    if (!matricula.trim()) return false;

    if (isCancelamento) {
      if (!empresaCancelamento) return false;

      if (isUrbam && !solicita) return false;

      if ((isIpsm || isUrbam || isPmsjc) && (!dataInicio || !dataFim)) {
        return false;
      }

      if ((isUrbam || isPmsjc) && !documento.trim()) {
        return false;
      }

      if ((isUrbam || isPmsjc) && !reativacaoMeses.trim()) {
        return false;
      }
    }

    if (isRetorno) {
      if (!empresaRetorno) return false;
      if (!motivoRetorno) return false;
    }

    return true;
  }, [
    cpf,
    tipoFormulario,
    nome,
    matricula,
    isCancelamento,
    isRetorno,
    empresaCancelamento,
    isUrbam,
    isIpsm,
    isPmsjc,
    solicita,
    dataInicio,
    dataFim,
    documento,
    reativacaoMeses,
    empresaRetorno,
    motivoRetorno,
  ]);

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-secondary to-third" />

      <div className="space-y-5 p-5 md:p-6">
        <SearchForm onSearch={onBuscar} className={sectionClass}>
          <div className="mb-4">
            <h2 className={sectionTitleClass}>
              <span className="h-2 w-2 rounded-full bg-primary" />
              Consulta do associado
            </h2>
            <p className="mt-1 text-sm text-paragraph">
              Informe o CPF para carregar nome e matrícula antes de gerar o PDF.
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
              className="h-10 rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary focus:ring-primary/15"
              inputMode="numeric"
              maxLength={14}
            />
            <SearchButton loading={loading} label="Pesquisar" />
            <button
              type="button"
              onClick={gerar}
              disabled={!formularioValido}
              className={`inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition ${
                formularioValido
                  ? "bg-primary hover:bg-fourth"
                  : "cursor-not-allowed bg-slate-300"
              }`}
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
        </SearchForm>

        <section className={sectionClass}>
          <div className="mb-4">
            <h2 className={sectionTitleClass}>
              <span className="h-2 w-2 rounded-full bg-primary" />
              Dados do formulário
            </h2>
            <p className="mt-1 text-sm text-paragraph">
              Selecione se o documento será de cancelamento ou retorno.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Tipo de formulário</label>
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
                  setErroLocal("");
                  setInfoLocal("");
                }}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                <option value="CANCELAMENTO">Cancelamento</option>
                <option value="RETORNO">Retorno</option>
              </select>
            </div>

            {isCancelamento && (
              <div>
                <label className={labelClass}>Empresa</label>
                <select
                  value={empresaCancelamento}
                  onChange={(e) => setEmpresaCancelamento(e.target.value)}
                  className={fieldClass}
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

            {isUrbam && (
              <div>
                <label className={labelClass}>Solicita</label>
                <select
                  value={solicita}
                  onChange={(e) => setSolicita(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Selecione</option>
                  <option value="CANCELAR">Cancelar</option>
                  <option value="REATIVAR">Reativar</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {(isCancelamento || isRetorno) && (
          <section className={sectionClass}>
            <div className="mb-4">
              <h2 className={sectionTitleClass}>
                <span className="h-2 w-2 rounded-full bg-primary" />
                Dados do associado
              </h2>
              <p className="mt-1 text-sm text-paragraph">
                As informações podem ser ajustadas manualmente se necessário.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Nome do associado</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Matrícula</label>
                <input
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </section>
        )}

        {isRetorno && (
          <section className={sectionClass}>
            <div className="mb-4">
              <h2 className={sectionTitleClass}>
                <span className="h-2 w-2 rounded-full bg-primary" />
                Dados do retorno
              </h2>
              <p className="mt-1 text-sm text-paragraph">
                Informe a empresa e o motivo do retorno do desconto.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Empresa</label>
                <select
                  value={empresaRetorno}
                  onChange={(e) => setEmpresaRetorno(e.target.value)}
                  className={fieldClass}
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
                <label className={labelClass}>Motivo</label>
                <select
                  value={motivoRetorno}
                  onChange={(e) => setMotivoRetorno(e.target.value)}
                  className={fieldClass}
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
          </section>
        )}

        {isCancelamento && (isIpsm || isUrbam || isPmsjc) && (
          <section className={sectionClass}>
            <div className="mb-4">
              <h2 className={sectionTitleClass}>
                <span className="h-2 w-2 rounded-full bg-primary" />
                Período do cancelamento
              </h2>
              <p className="mt-1 text-sm text-paragraph">
                Preencha o intervalo e os dados adicionais exigidos pela empresa.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {(isUrbam || isPmsjc) && (
                <div>
                  <label className={labelClass}>Documento</label>
                  <input
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    className={fieldClass}
                    placeholder={isPmsjc ? "RG" : "Documento"}
                  />
                </div>
              )}
            </div>

            {(isUrbam || isPmsjc) && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Reativação em meses</label>
                  <input
                    value={reativacaoMeses}
                    onChange={(e) => setReativacaoMeses(e.target.value)}
                    className={fieldClass}
                    placeholder="Ex.: 12"
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
