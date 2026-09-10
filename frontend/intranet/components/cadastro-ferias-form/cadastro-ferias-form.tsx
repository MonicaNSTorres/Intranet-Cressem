"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaCalendarPlus, FaEdit, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import {
  buscarFuncionarioFeriasPorCpf,
  buscarFuncionarioFeriasPorId,
  cadastrarFeriasFuncionario,
  editarFeriasFuncionario,
  importarFeriasExcel,
  salvarLoteFerias,
  type ImportacaoFeriasResponse,
  type FuncionarioFeriasResponse,
  type PeriodoFeriasPayload,
} from "@/services/cadastro_ferias.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";

type LinhaFerias = {
  id?: number | string;
  dataInicio: string;
  dataFim: string;
};

type LinhaFeriasLote = {
  nome: string;
  dataInicio: string;
  dataFim: string;
};

function formatCpfView(value: string) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatarDataBrasil(data: string) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function converteDataBrParaAmericano(data: string) {
  if (!data) return "";
  const [dia, mes, ano] = data.split("/");
  if (!dia || !mes || !ano) return data;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function parseDateBR(dataStr: string) {
  if (!dataStr) return null;
  const m = dataStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;

  const dia = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const ano = Number(m[3]);

  return new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
}

function diferencaEmDias(inicio: Date | null, fim: Date | null, inclusivo = true) {
  if (!(inicio instanceof Date) || !(fim instanceof Date)) return 0;

  const msPorDia = 24 * 60 * 60 * 1000;
  const ms = fim.getTime() - inicio.getTime();
  if (ms < 0) return 0;

  const dias = Math.floor(ms / msPorDia);
  return inclusivo ? dias + 1 : dias;
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

const inputReadOnlyClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-left text-sm text-slate-700 shadow-sm outline-none";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600";

const primaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60";

const accentButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-fourth hover:bg-fourth/10 hover:text-fourth";

const dangerButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-600 hover:text-white";

const tableActionButtonClass =
  "inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-600 hover:text-white";

const tableDangerButtonClass =
  "inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-600 hover:text-white";

export function CadastroFeriasForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idSolicitacao = searchParams.get("id") || "";
  const salvarActionRef = useRef(false);

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [modoCadastro, setModoCadastro] = useState<"manual" | "lote">("manual");
  const [funcionarioBuscado, setFuncionarioBuscado] =
    useState<FuncionarioFeriasResponse | null>(null);

  const [ferias, setFerias] = useState<LinhaFerias[]>([]);
  const [feriasLote, setFeriasLote] = useState<LinhaFeriasLote[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [loadingImportacao, setLoadingImportacao] = useState(false);
  const [arquivoImportacao, setArquivoImportacao] = useState<File | null>(null);
  const [resultadoImportacao, setResultadoImportacao] =
    useState<ImportacaoFeriasResponse | null>(null);

  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);
  const [inputInicio, setInputInicio] = useState("");
  const [inputVolta, setInputVolta] = useState("");

  const totalDias = useMemo(() => {
    return ferias.reduce((acc, item) => {
      const inicio = parseDateBR(formatarDataBrasil(item.dataInicio));
      const fim = parseDateBR(formatarDataBrasil(item.dataFim));
      return acc + diferencaEmDias(inicio, fim, true);
    }, 0);
  }, [ferias]);

  const totalDiasLote = useMemo(() => {
    return feriasLote.reduce((acc, item) => {
      const inicio = parseDateBR(formatarDataBrasil(item.dataInicio));
      const fim = parseDateBR(formatarDataBrasil(item.dataFim));
      return acc + diferencaEmDias(inicio, fim, true);
    }, 0);
  }, [feriasLote]);

  function limparCamposModal() {
    setInputInicio("");
    setInputVolta("");
  }

  function validarDadosBasicos() {
    if (!cpf.trim()) {
      setErro("Preencha o CPF do funcionário.");
      return false;
    }

    if (!nome.trim()) {
      setErro("Preencha o nome do funcionário.");
      return false;
    }

    return true;
  }

  function validarCamposFerias() {
    if (!inputInicio) {
      setErro("Preencha a data de início das férias.");
      return false;
    }

    if (!inputVolta) {
      setErro("Preencha a data de volta das férias.");
      return false;
    }

    return true;
  }

  function validarFormulario() {
    if (!cpf.trim()) {
      setErro("Preencha o CPF.");
      return false;
    }

    if (!nome.trim()) {
      setErro("Preencha o nome do funcionário.");
      return false;
    }

    if (ferias.length === 0) {
      setErro("Não há datas de férias na tabela. Adicione pelo menos um período.");
      return false;
    }

    return true;
  }

  async function buscarFuncionario() {
    try {
      setErro("");
      setInfo("");

      const cpfLimpo = onlyDigits(cpf);

      if (!cpfLimpo || cpfLimpo.length !== 11) {
        setErro("Informe um CPF válido.");
        return;
      }

      setLoadingBusca(true);

      const response = await buscarFuncionarioFeriasPorCpf(cpfLimpo);

      setFuncionarioBuscado(response);
      setNome(response.NM_FUNCIONARIO || "");
      setCpf(formatCpfView(response.NR_CPF || cpfLimpo));
      setInfo("Funcionário localizado com sucesso.");
    } catch (error) {
      console.error(error);
      setFuncionarioBuscado(null);
      setNome("");
      setErro("Funcionário não encontrado, entre em contato com o TI.");
    } finally {
      setLoadingBusca(false);
    }
  }

  async function carregarTelaEdicao(id: string) {
    try {
      setErro("");
      setInfo("");
      setLoadingBusca(true);

      const response = await buscarFuncionarioFeriasPorId(id);

      setFuncionarioBuscado(response);
      setCpf(formatCpfView(response.NR_CPF || ""));
      setNome(response.NM_FUNCIONARIO || "");

      const lista = (response.FERIAS || []).map((item) => ({
        id: item.ID_FERIAS_FUNCIONARIOS,
        dataInicio: item.DT_DIA_INICIO,
        dataFim: item.DT_DIA_FIM,
      }));

      setFerias(lista);
      setInfo("Solicitação carregada para edição.");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível carregar a solicitação para edição.");
    } finally {
      setLoadingBusca(false);
    }
  }

  useEffect(() => {
    if (idSolicitacao) {
      setModoCadastro("manual");
      carregarTelaEdicao(idSolicitacao);
    }
  }, [idSolicitacao]);

  function abrirModal() {
    setErro("");
    setInfo("");

    if (!validarDadosBasicos()) return;

    setModoEdicao(false);
    setIndiceEditando(null);
    limparCamposModal();
    setModalOpen(true);
  }

  function abrirModalEdicao(index: number) {
    const item = ferias[index];
    if (!item) return;

    setModoEdicao(true);
    setIndiceEditando(index);
    setInputInicio(item.dataInicio);
    setInputVolta(item.dataFim);
    setModalOpen(true);
  }

  function salvarPeriodoFerias() {
    setErro("");
    setInfo("");

    if (!validarCamposFerias()) return;

    if (modoEdicao && indiceEditando !== null) {
      setFerias((prev) =>
        prev.map((item, index) =>
          index === indiceEditando
            ? {
              ...item,
              dataInicio: inputInicio,
              dataFim: inputVolta,
            }
            : item
        )
      );

      setInfo("Período de férias atualizado com sucesso.");
    } else {
      setFerias((prev) => [
        ...prev,
        {
          dataInicio: inputInicio,
          dataFim: inputVolta,
        },
      ]);

      setInfo("Período de férias adicionado com sucesso.");
    }

    setModalOpen(false);
    setModoEdicao(false);
    setIndiceEditando(null);
    limparCamposModal();
  }

  function removerPeriodo(index: number) {
    setFerias((prev) => prev.filter((_, i) => i !== index));
    setInfo("Período removido com sucesso.");
  }

  async function salvarSolicitacao() {
    if (salvarActionRef.current) return;
    salvarActionRef.current = true;

    try {
      setErro("");
      setInfo("");

      if (!validarFormulario()) return;
      if (!funcionarioBuscado?.ID_FUNCIONARIO) {
        setErro("Funcionário inválido para a solicitação.");
        return;
      }

      setLoadingSalvar(true);

      const payload: PeriodoFeriasPayload[] = ferias.map((item) => ({
        DT_DIA_INICIO: item.dataInicio,
        DT_DIA_FIM: item.dataFim,
        ID_FUNCIONARIO: funcionarioBuscado.ID_FUNCIONARIO!,
        ...(item.id ? { ID_FERIAS_FUNCIONARIOS: Number(item.id) } : {}),
      }));

      if (idSolicitacao) {
        await editarFeriasFuncionario(funcionarioBuscado.ID_FUNCIONARIO, payload);
        setInfo("Férias atualizadas com sucesso.");
      } else {
        await cadastrarFeriasFuncionario(payload);
        setInfo("Férias cadastradas com sucesso.");
        setFerias([]);
        setCpf("");
        setNome("");
        setFuncionarioBuscado(null);
      }
    } catch (error) {
      console.error(error);
      setErro("Falha ao salvar a solicitação. Tente novamente.");
    } finally {
      salvarActionRef.current = false;
      setLoadingSalvar(false);
    }
  }

  async function importarPlanilhaFerias() {
    try {
      setErro("");
      setInfo("");
      setResultadoImportacao(null);

      if (!arquivoImportacao) {
        setErro("Selecione uma planilha Excel para importar.");
        return;
      }

      setLoadingImportacao(true);

      const response = await importarFeriasExcel(arquivoImportacao);
      setResultadoImportacao(response);
      setFeriasLote(
        (response.registros || []).map((item) => ({
          nome: item.NM_FUNCIONARIO,
          dataInicio: item.DT_DIA_INICIO,
          dataFim: item.DT_DIA_FIM,
        }))
      );
      setInfo(response.message || "Planilha carregada.");
      setArquivoImportacao(null);
    } catch (error: any) {
      console.error(error);

      const mensagem =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        "Falha ao importar planilha de férias.";

      setErro(mensagem);
    }
  }

  function atualizarLinhaLote(
    index: number,
    campo: "nome" | "dataInicio" | "dataFim",
    valor: string
  ) {
    setFeriasLote((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
            ...item,
            [campo]: valor,
          }
          : item
      )
    );
  }

  function removerLinhaLote(index: number) {
    setFeriasLote((prev) => prev.filter((_, i) => i !== index));
    setInfo("Linha removida do lote.");
  }

  async function salvarLoteImportado() {
    if (salvarActionRef.current) return;
    salvarActionRef.current = true;

    try {
      setErro("");
      setInfo("");

      if (feriasLote.length === 0) {
        setErro("Não há linhas no lote para salvar.");
        return;
      }

      setLoadingSalvar(true);

      await salvarLoteFerias(
        feriasLote.map((item) => ({
          NM_FUNCIONARIO: item.nome,
          DT_DIA_INICIO: item.dataInicio,
          DT_DIA_FIM: item.dataFim,
        }))
      );

      setInfo("Lote de férias salvo com sucesso.");
      setFeriasLote([]);
      setResultadoImportacao(null);
    } catch (error: any) {
      console.error(error);

      const erros = error?.response?.data?.erros;
      if (Array.isArray(erros) && erros.length > 0) {
        const texto = erros
          .slice(0, 5)
          .map((e: any) => `Linha ${e.linha}: ${e.nome ? `${e.nome} - ` : ""}${e.motivo}`)
          .join(" | ");
        setErro(texto);
      } else {
        setErro(
          error?.response?.data?.error ||
          "Falha ao salvar lote de férias. Revise as linhas e tente novamente."
        );
      }
    } finally {
      salvarActionRef.current = false;
      setLoadingSalvar(false);
    }
  }

  return (
    <>
      <div className="mx-auto rounded-2xl border border-slate-200 border-t-4 border-t-primary bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => router.push("./gerenciamento_ferias")}
            className={accentButtonClass}
          >
            Consultar Férias
          </button>
        </div>

        {!idSolicitacao && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h6 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Modo de Cadastro
            </h6>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModoCadastro("manual")}
                className={`${modoCadastro === "manual"
                  ? primaryButtonClass
                  : secondaryButtonClass
                  }`}
              >
                Inserir Manualmente
              </button>
              <button
                type="button"
                onClick={() => setModoCadastro("lote")}
                className={`${modoCadastro === "lote"
                  ? primaryButtonClass
                  : secondaryButtonClass
                  }`}
              >
                Importar por Planilha
              </button>
            </div>
          </div>
        )}

        {(modoCadastro === "manual" || !!idSolicitacao) && (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_2fr]">
              <SearchForm onSearch={buscarFuncionario}>
                <div>
                  <label className={labelClass}>
                    CPF
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                    <SearchInput
                      value={cpf}
                      onChange={(e) => setCpf(formatCpfView(e.target.value))}
                      maxLength={14}
                      className={inputClass}
                    />

                    <button
                      type="submit"
                      disabled={loadingBusca}
                      className={primaryButtonClass}
                    >
                      <FaSearch />
                      {loadingBusca ? "Pesquisando..." : "Pesquisar"}
                    </button>
                  </div>
                </div>
              </SearchForm>

              <div>
                <label className={labelClass}>
                  Nome
                </label>
                <input
                  value={nome}
                  readOnly
                  className={inputReadOnlyClass}
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={abrirModal}
                className={accentButtonClass}
              >
                <FaCalendarPlus />
                Adicionar Férias
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h5 className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Férias
                </h5>
              </div>

              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Data de Início
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Data Final
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">
                      Editar
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">
                      Remover
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {ferias.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Nenhum período de férias adicionado.
                      </td>
                    </tr>
                  ) : (
                    ferias.map((item, index) => (
                      <tr key={`${item.id || "novo"}-${index}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{formatarDataBrasil(item.dataInicio)}</td>
                        <td className="px-4 py-3">{formatarDataBrasil(item.dataFim)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => abrirModalEdicao(index)}
                            className={tableActionButtonClass}
                          >
                            <FaEdit />
                            Editar
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removerPeriodo(index)}
                            className={tableDangerButtonClass}
                          >
                            <FaTrash />
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 items-end gap-4 border-t border-slate-200 pt-5 md:grid-cols-[1fr_auto]">
              <div className="max-w-xs">
                <label className={labelClass}>
                  Total de Dias
                </label>
                <input
                  readOnly
                  value={String(totalDias)}
                  className={inputReadOnlyClass}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={salvarSolicitacao}
                  disabled={loadingSalvar}
                  className={`${primaryButtonClass} w-full md:w-auto`}
                >
                  {loadingSalvar ? "Salvando..." : "Salvar Solicitação"}
                </button>
              </div>
            </div>
          </>
        )}

        {modoCadastro === "lote" && !idSolicitacao && (
          <>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h6 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Importação em Lote por Planilha
              </h6>
              <p className="mt-1 text-xs text-slate-600">
                Colunas esperadas: <b>nome</b>, <b>início programado</b>, <b>fim programado</b>.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setArquivoImportacao(e.target.files?.[0] || null)}
                  className={inputClass}
                />

                <button
                  type="button"
                  onClick={importarPlanilhaFerias}
                  disabled={loadingImportacao}
                  className={primaryButtonClass}
                >
                  {loadingImportacao ? "Carregando..." : "Carregar Planilha"}
                </button>
              </div>

              {resultadoImportacao && (
                <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-xs text-slate-700">
                  <div>
                    Total de linhas: <b>{resultadoImportacao.total_linhas}</b> | Carregados:{" "}
                    <b>{resultadoImportacao.carregados}</b> | Erros:{" "}
                    <b>{resultadoImportacao.erros?.length || 0}</b>
                  </div>

                  {(resultadoImportacao.erros?.length || 0) > 0 && (
                    <div className="mt-2 max-h-36 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-red-700">
                      {resultadoImportacao.erros.map((item, index) => (
                        <div key={`${item.linha}-${index}`}>
                          Linha {item.linha}: {item.nome ? `${item.nome} - ` : ""}
                          {item.motivo}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h5 className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Prévia do Lote (editável)
                </h5>
              </div>

              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Funcionário</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Data de Início</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Data Final</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {feriasLote.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        Nenhuma linha carregada.
                      </td>
                    </tr>
                  ) : (
                    feriasLote.map((item, index) => (
                      <tr key={`lote-${index}`}>
                        <td className="px-4 py-3">
                          <input
                            value={item.nome}
                            onChange={(e) => atualizarLinhaLote(index, "nome", e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={item.dataInicio}
                            onChange={(e) => atualizarLinhaLote(index, "dataInicio", e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={item.dataFim}
                            onChange={(e) => atualizarLinhaLote(index, "dataFim", e.target.value)}
                            className={inputClass}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removerLinhaLote(index)}
                            className={tableDangerButtonClass}
                          >
                            <FaTrash />
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 items-end gap-4 border-t border-slate-200 pt-5 md:grid-cols-[1fr_auto]">
              <div className="max-w-xs">
                <label className={labelClass}>
                  Total de Dias (Lote)
                </label>
                <input
                  readOnly
                  value={String(totalDiasLote)}
                  className={inputReadOnlyClass}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={salvarLoteImportado}
                  disabled={loadingSalvar}
                  className={`${primaryButtonClass} w-full md:w-auto`}
                >
                  {loadingSalvar ? "Salvando..." : "Salvar Lote"}
                </button>
              </div>
            </div>
          </>
        )}

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Período de Férias
              </h2>

              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModoEdicao(false);
                  setIndiceEditando(null);
                  limparCamposModal();
                }}
                className="rounded-xl p-2 text-red-600 transition hover:bg-red-50"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className={labelClass}>
                  Data de Início
                </label>
                <input
                  type="date"
                  value={inputInicio}
                  onChange={(e) => setInputInicio(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Data de Volta
                </label>
                <input
                  type="date"
                  value={inputVolta}
                  onChange={(e) => setInputVolta(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModoEdicao(false);
                  setIndiceEditando(null);
                  limparCamposModal();
                }}
                className={dangerButtonClass}
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarPeriodoFerias}
                className={primaryButtonClass}
              >
                Salvar Férias
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
