"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaCalendarPlus, FaEdit, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import {
  buscarFuncionarioFeriasPorCpf,
  buscarFuncionarioFeriasPorId,
  cadastrarFeriasFuncionario,
  editarFeriasFuncionario,
  type FuncionarioFeriasResponse,
  type PeriodoFeriasPayload,
} from "@/services/cadastro_ferias.service";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

type LinhaFerias = {
  id?: number | string;
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

export function CadastroFeriasForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [funcionarioBuscado, setFuncionarioBuscado] =
    useState<FuncionarioFeriasResponse | null>(null);

  const [ferias, setFerias] = useState<LinhaFerias[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [loadingSalvar, setLoadingSalvar] = useState(false);

  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);
  const [inputInicio, setInputInicio] = useState("");
  const [inputVolta, setInputVolta] = useState("");

  const idSolicitacao = searchParams.get("id") || "";

  const totalDias = useMemo(() => {
    return ferias.reduce((acc, item) => {
      const inicio = parseDateBR(formatarDataBrasil(item.dataInicio));
      const fim = parseDateBR(formatarDataBrasil(item.dataFim));
      return acc + diferencaEmDias(inicio, fim, true);
    }, 0);
  }, [ferias]);

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
      setLoadingSalvar(false);
    }
  }

  return (
    <>
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => router.push("./gerenciamento_ferias")}
            className="inline-flex cursor-pointer items-center justify-center rounded bg-primary px-5 py-2 font-semibold text-white shadow hover:bg-secondary md:w-auto"
          >
            Consultar Férias
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
          <SearchForm onSearch={buscarFuncionario}>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                CPF
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <SearchInput
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfView(e.target.value))}
                  maxLength={14}
                  className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />

                <SearchButton loading={loadingBusca} label="Pesquisar" />
              </div>
            </div>
          </SearchForm>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nome
            </label>
            <input
              value={nome}
              readOnly
              className="w-full rounded border bg-gray-50 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={abrirModal}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded bg-third px-5 py-2 font-semibold text-white shadow hover:bg-primary"
          >
            <FaCalendarPlus />
            Adicionar Férias
          </button>
        </div>

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

        <div className="mt-6 overflow-x-auto rounded-xl border">
          <div className="border-b bg-slate-50 px-4 py-3">
            <h5 className="font-semibold text-slate-700">Férias</h5>
          </div>

          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Data Início
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
                        className="inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <FaEdit />
                        Editar
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removerPeriodo(index)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
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

        <div className="mt-6 grid grid-cols-1 gap-3 border-t pt-5 md:grid-cols-[1fr_auto]">
          <div className="max-w-xs">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Total de Dias
            </label>
            <input
              readOnly
              value={String(totalDias)}
              className="w-full rounded border bg-gray-50 px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={salvarSolicitacao}
              disabled={loadingSalvar}
              className="inline-flex w-full cursor-pointer items-center justify-center rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {loadingSalvar ? "Enviando..." : "Enviar Solicitação"}
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
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
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Dia Início
                </label>
                <input
                  type="date"
                  value={inputInicio}
                  onChange={(e) => setInputInicio(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Dia Volta
                </label>
                <input
                  type="date"
                  value={inputVolta}
                  onChange={(e) => setInputVolta(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModoEdicao(false);
                  setIndiceEditando(null);
                  limparCamposModal();
                }}
                className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarPeriodoFerias}
                className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
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