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
              onClick={gerar}
              disabled={!formularioValido}
              className={`inline-flex items-center gap-2 text-white font-semibold px-5 py-2 rounded shadow transition
    ${formularioValido
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
        </div>
      </SearchForm>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de formulário</label>
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
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Selecione</option>
            <option value="CANCELAMENTO">Cancelamento</option>
            <option value="RETORNO">Retorno</option>
          </select>
        </div>

        {isCancelamento && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
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

        {isUrbam && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Solicita</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome do associado</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Matrícula</label>
            <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
        </div>
      )}

      {isRetorno && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>

          {(isUrbam || isPmsjc) && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Documento</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Reativação em meses</label>
            <input
              value={reativacaoMeses}
              onChange={(e) => setReativacaoMeses(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="Ex.: 12"
            />
          </div>
        </div>
      )}
    </div>
  );
}
