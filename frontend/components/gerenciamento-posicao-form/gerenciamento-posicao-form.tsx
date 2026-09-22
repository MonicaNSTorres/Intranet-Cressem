"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import {
  baixarRelatorioPosicoes,
  buscarPosicoesPaginadas,
  buscarTodasPosicoes,
  cadastrarPosicao,
  editarPosicao,
  type PosicaoItem,
} from "@/services/gerenciamento_posicao.service";

type ModalModo = "cadastrar" | "editar";

export function GerenciamentoPosicaoForm() {
  const [busca, setBusca] = useState("");
  const [posicoes, setPosicoes] = useState<PosicaoItem[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [loading, setLoading] = useState(false);
  const [loadingTabela, setLoadingTabela] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [totais, setTotais] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalModo, setModalModo] = useState<ModalModo>("cadastrar");
  const [posicaoSelecionada, setPosicaoSelecionada] = useState<PosicaoItem | null>(null);

  const [inputCodigo, setInputCodigo] = useState("");
  const [inputAtuacao, setInputAtuacao] = useState("");
  const [inputPosicao, setInputPosicao] = useState("");
  const [inputDescricao, setInputDescricao] = useState("");

  async function carregarTotais() {
    try {
      const lista = await buscarTodasPosicoes();

      let total = 0;
      let ativos = 0;
      let inativos = 0;

      lista.forEach((posicao) => {
        total += 1;
        if (Number(posicao.SN_ATIVO) === 1) ativos += 1;
        if (Number(posicao.SN_ATIVO) === 0) inativos += 1;
      });

      setTotais({ total, ativos, inativos });
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarPosicoes(
    page = 1,
    limit = itensPorPagina
  ) {
    try {
      setLoadingTabela(true);
      setErro("");
      setInfo("");

      const response = await buscarPosicoesPaginadas({
        nome: busca || " ",
        page,
        limit,
      });

      setPosicoes(response.items || []);
      setTotalPages(response.total_pages || 1);
      setPaginaAtual(page);

      await carregarTotais();
    } catch (e) {
      console.error(e);
      setPosicoes([]);
      setErro(
        "Posição não encontrada ou falha ao carregar a listagem."
      );
    } finally {
      setLoadingTabela(false);
    }
  }

  useEffect(() => {
    carregarTotais();
  }, []);

  function limparBusca() {
    setBusca("");
    setPosicoes([]);
    setPaginaAtual(1);
    setTotalPages(1);
    setErro("");
    setInfo("");
    setTotais({
      total: 0,
      ativos: 0,
      inativos: 0,
    });
  }

  function abrirCadastro() {
    setModalModo("cadastrar");
    setPosicaoSelecionada(null);
    setInputCodigo("");
    setInputAtuacao("");
    setInputPosicao("");
    setInputDescricao("");
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function abrirEdicao(posicao: PosicaoItem) {
    setModalModo("editar");
    setPosicaoSelecionada(posicao);
    setInputCodigo(posicao.CD_SICOOB || "");
    setInputAtuacao(posicao.DESC_ATUACAO || "");
    setInputPosicao(posicao.NM_POSICAO || "");
    setInputDescricao(posicao.DESC_POSICAO || "");
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function fecharModal() {
    if (loading) return;
    setModalOpen(false);
    setPosicaoSelecionada(null);
    setInputCodigo("");
    setInputAtuacao("");
    setInputPosicao("");
    setInputDescricao("");
  }

  function validarCampos() {
    if (!inputCodigo.trim()) {
      setErro("Preencha o código.");
      return false;
    }

    if (!inputAtuacao.trim()) {
      setErro("Preencha a atuação.");
      return false;
    }

    if (!inputPosicao.trim()) {
      setErro("Preencha a posição.");
      return false;
    }

    if (!inputDescricao.trim()) {
      setErro("Preencha a descrição.");
      return false;
    }

    return true;
  }

  async function salvarModal() {
    if (!validarCampos()) return;

    try {
      setLoading(true);
      setErro("");
      setInfo("");

      if (modalModo === "cadastrar") {
        await cadastrarPosicao({
          CD_SICOOB: inputCodigo.trim().toUpperCase(),
          DESC_ATUACAO: inputAtuacao.trim().toUpperCase(),
          NM_POSICAO: inputPosicao.trim().toUpperCase(),
          DESC_POSICAO: inputDescricao.trim().toUpperCase(),
        });

        setInfo("Posição cadastrada com sucesso.");
      }

      if (modalModo === "editar" && posicaoSelecionada) {
        await editarPosicao({
          id: posicaoSelecionada.ID_POSICAO,
          CD_SICOOB: inputCodigo.trim().toUpperCase(),
          DESC_ATUACAO: inputAtuacao.trim().toUpperCase(),
          NM_POSICAO: inputPosicao.trim().toUpperCase(),
          DESC_POSICAO: inputDescricao.trim().toUpperCase(),
          SN_ATIVO: Number(posicaoSelecionada.SN_ATIVO),
        });

        setInfo("Posição atualizada com sucesso.");
      }

      await carregarPosicoes(modalModo === "editar" ? paginaAtual : 1);
      await carregarTotais();

      setTimeout(() => {
        fecharModal();
      }, 600);
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Não foi possível salvar a posição."
      );
    } finally {
      setLoading(false);
    }
  }

  async function alternarStatus(posicao: PosicaoItem) {
    try {
      setErro("");
      setInfo("");

      const novoStatus = Number(posicao.SN_ATIVO) === 1 ? 0 : 1;

      await editarPosicao({
        id: posicao.ID_POSICAO,
        CD_SICOOB: posicao.CD_SICOOB,
        DESC_ATUACAO: posicao.DESC_ATUACAO,
        NM_POSICAO: posicao.NM_POSICAO,
        DESC_POSICAO: posicao.DESC_POSICAO,
        SN_ATIVO: novoStatus,
      });

      setInfo(
        novoStatus === 1
          ? "Posição ativada com sucesso."
          : "Posição inativada com sucesso."
      );

      await carregarPosicoes(paginaAtual);
      await carregarTotais();
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Erro ao alterar o status da posição."
      );
    }
  }

  async function baixarCsv() {
    try {
      setErro("");
      setInfo("Preparando relatório para download...");

      const blob = await baixarRelatorioPosicoes();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "posicoes_sicoob.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setInfo("Download do relatório iniciado com sucesso.");
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Falha ao baixar o relatório."
      );
    }
  }

  const primeiroRegistro =
    totais.total === 0
      ? 0
      : (paginaAtual - 1) * itensPorPagina + 1;

  const ultimoRegistro = Math.min(
    paginaAtual * itensPorPagina,
    totais.total
  );

  return (
    <>
      <div className="min-w-225 mx-auto overflow-hidden rounded-xl bg-white shadow">
        <div className="h-1 bg-linear-to-r from-primary via-secondary to-third" />
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Digite o código, atuação ou posição
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPaginaAtual(1);
                  }}
                  placeholder="Digite o código, atuação ou posição"
                  className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />

                <button
                  type="button"
                  onClick={() => carregarPosicoes(1)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary"
                >
                  <FaSearch />
                  Buscar
                </button>

                <button
                  type="button"
                  onClick={limparBusca}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FaTimes />
                  Limpar
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={abrirCadastro}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-third px-5 py-2 font-semibold text-white shadow hover:bg-primary lg:w-auto"
              >
                <FaPlus />
                Cadastrar
              </button>
            </div>
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

          {(posicoes.length > 0 || loadingTabela) && (
            <>
              <div className="mt-6 flex justify-end">
                <select
                  value={itensPorPagina}
                  onChange={(e) => {
                    const novoLimite = Number(e.target.value);

                    setItensPorPagina(novoLimite);
                    setPaginaAtual(1);
                    carregarPosicoes(1, novoLimite);
                  }}
                  disabled={loadingTabela}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Código
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Atuação
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Posição
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">
                        Editar
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loadingTabela ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          Carregando posições...
                        </td>
                      </tr>
                    ) : posicoes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          Nenhuma posição encontrada.
                        </td>
                      </tr>
                    ) : (
                      posicoes.map((posicao) => (
                        <tr key={posicao.ID_POSICAO} className="hover:bg-slate-50">
                          <td className="px-4 py-3">{posicao.CD_SICOOB}</td>
                          <td className="px-4 py-3">
                            {String(posicao.DESC_ATUACAO).toUpperCase()}
                          </td>
                          <td className="px-4 py-3">
                            {String(posicao.NM_POSICAO).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => abrirEdicao(posicao)}
                              className="inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <FaEdit />
                              Editar
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => alternarStatus(posicao)}
                              className={`inline-flex min-w-21 items-center justify-center rounded px-3 py-1.5 text-xs font-semibold ${Number(posicao.SN_ATIVO) === 1
                                ? "bg-secondary text-white hover:bg-third"
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                }`}
                            >
                              {Number(posicao.SN_ATIVO) === 1 ? "Ativo" : "Inativo"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Mostrando{" "}
                  <span className="font-semibold text-slate-700">
                    {primeiroRegistro}
                  </span>{" "}
                  até{" "}
                  <span className="font-semibold text-slate-700">
                    {ultimoRegistro}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-slate-700">
                    {totais.total}
                  </span>{" "}
                  posições
                </p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      carregarPosicoes(
                        Math.max(paginaAtual - 1, 1)
                      )
                    }
                    disabled={paginaAtual <= 1 || loadingTabela}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaChevronLeft />
                    Anterior
                  </button>

                  <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                    Página {paginaAtual} de {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      carregarPosicoes(
                        Math.min(paginaAtual + 1, totalPages)
                      )
                    }
                    disabled={
                      paginaAtual >= totalPages || loadingTabela
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                    <FaChevronRight />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 border-t pt-5 md:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Total
                  </label>
                  <input
                    readOnly
                    value={totais.total}
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Ativos
                  </label>
                  <input
                    readOnly
                    value={totais.ativos}
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Inativos
                  </label>
                  <input
                    readOnly
                    value={totais.inativos}
                    className="w-full rounded border bg-gray-50 px-3 py-2"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={baixarCsv}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary md:w-auto"
                  >
                    <FaDownload />
                    Baixar Relatório
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Gestão de posições
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-800">
                    {modalModo === "cadastrar"
                      ? "Cadastrar posição"
                      : "Editar posição"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {modalModo === "cadastrar"
                      ? "Preencha as informações abaixo para cadastrar uma nova posição."
                      : "Atualize as informações da posição selecionada."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={loading}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Fechar"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Posição
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Identificação da posição
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Informe o código Sicoob e o nome utilizado para identificar
                    esta posição.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Código Sicoob
                    </label>

                    <input
                      value={inputCodigo}
                      onChange={(e) => setInputCodigo(e.target.value)}
                      placeholder="Digite o código"
                      maxLength={7}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Máximo de 7 caracteres.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Posição
                    </label>

                    <input
                      value={inputPosicao}
                      onChange={(e) => setInputPosicao(e.target.value)}
                      placeholder="Digite a posição"
                      maxLength={30}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Máximo de 30 caracteres.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Estrutura
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Atuação
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Descreva resumidamente a área ou forma de atuação correspondente
                    à posição.
                  </p>
                </div>

                <div className="mt-5">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Atuação
                  </label>

                  <textarea
                    value={inputAtuacao}
                    onChange={(e) => setInputAtuacao(e.target.value)}
                    placeholder="Digite a atuação"
                    maxLength={50}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />

                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                      Informe uma descrição curta da atuação.
                    </p>

                    <p className="text-xs font-medium text-slate-400">
                      {inputAtuacao.length}/50
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Informações adicionais
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Descrição da posição
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Detalhe as responsabilidades, atribuições ou demais informações
                    relacionadas à posição.
                  </p>
                </div>

                <div className="mt-5">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Descrição
                  </label>

                  <textarea
                    value={inputDescricao}
                    onChange={(e) => setInputDescricao(e.target.value)}
                    placeholder="Digite a descrição"
                    rows={6}
                    maxLength={700}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />

                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                      Utilize este campo para detalhar a posição.
                    </p>

                    <p className="text-xs font-medium text-slate-400">
                      {inputDescricao.length}/700
                    </p>
                  </div>
                </div>
              </div>

              {erro && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">
                    {erro}
                  </p>
                </div>
              )}

              {!erro && info && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-800">
                    {info}
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={loading}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={salvarModal}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Salvando..."
                    : modalModo === "cadastrar"
                      ? "Cadastrar posição"
                      : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}