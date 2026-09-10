"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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

const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

const textareaClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

const accentButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-fourth/40 hover:bg-fourth/10 hover:text-fourth disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

export function GerenciamentoPosicaoForm() {
  const salvarActionRef = useRef(false);
  const statusActionRef = useRef<Set<number>>(new Set());

  const [busca, setBusca] = useState("");
  const [posicoes, setPosicoes] = useState<PosicaoItem[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

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

  async function carregarPosicoes(page = 1, pageLimit = limit) {
    try {
      setLoadingTabela(true);
      setErro("");
      setInfo("");

      const response = await buscarPosicoesPaginadas({
        nome: busca || " ",
        page,
        limit: pageLimit,
      });

      setPosicoes(response.items || []);
      setTotalItems(response.total_items || 0);
      setTotalPages(response.total_pages || 1);
      setPaginaAtual(page);

      await carregarTotais();
    } catch (e) {
      console.error(e);
      setPosicoes([]);
      setTotalItems(0);
      setErro("Posição não encontrada ou falha ao carregar a listagem.");
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
    setTotalItems(0);
    setErro("");
    setInfo("");
  }

  function pesquisarComEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    carregarPosicoes(1);
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
    if (salvarActionRef.current) return;
    if (!validarCampos()) return;

    try {
      salvarActionRef.current = true;
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
      salvarActionRef.current = false;
      setLoading(false);
    }
  }

  async function alternarStatus(posicao: PosicaoItem) {
    if (statusActionRef.current.has(posicao.ID_POSICAO)) return;

    try {
      statusActionRef.current.add(posicao.ID_POSICAO);
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
    } finally {
      statusActionRef.current.delete(posicao.ID_POSICAO);
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
                  onChange={(e) => setBusca(e.target.value)}
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
              <div className="mt-6 overflow-x-auto rounded-xl border">
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

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {paginaAtual > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => carregarPosicoes(1)}
                      className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      1
                    </button>

                    <button
                      type="button"
                      onClick={() => carregarPosicoes(paginaAtual - 1)}
                      className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Anterior
                    </button>
                  </>
                )}

                {paginasVisiveis.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => carregarPosicoes(page)}
                    className={`rounded px-3 py-1.5 text-sm ${page === paginaAtual
                        ? "bg-emerald-600 text-white"
                        : "border text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {paginaAtual < totalPages && (
                  <>
                    <button
                      type="button"
                      onClick={() => carregarPosicoes(paginaAtual + 1)}
                      className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Próxima
                    </button>

                    <button
                      type="button"
                      onClick={() => carregarPosicoes(totalPages)}
                      className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-title">
                  {modalModo === "cadastrar"
                    ? "Cadastro de posição"
                    : "Edição de posição"}
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  Informe os dados da posição e salve para atualizar a consulta.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-full p-2 text-red-600 transition hover:bg-red-50 cursor-pointer"
                aria-label="Fechar"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Código Sicoob
                </label>
                <input
                  value={inputCodigo}
                  onChange={(e) => setInputCodigo(e.target.value)}
                  className={inputClass}
                  placeholder="Digite o código"
                  maxLength={7}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Atuação
                </label>
                <textarea
                  value={inputAtuacao}
                  onChange={(e) => setInputAtuacao(e.target.value)}
                  className={textareaClass}
                  placeholder="Digite a atuação"
                  rows={3}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Posição
                </label>
                <input
                  value={inputPosicao}
                  onChange={(e) => setInputPosicao(e.target.value)}
                  className={inputClass}
                  placeholder="Digite a posição"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Descrição
                </label>
                <textarea
                  value={inputDescricao}
                  onChange={(e) => setInputDescricao(e.target.value)}
                  className={textareaClass}
                  placeholder="Digite a descrição"
                  rows={6}
                  maxLength={700}
                />
              </div>

              {(erro || info) && (
                <div>
                  {erro ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {erro}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      {info}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={fecharModal}
                className={secondaryButtonClass}
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarModal}
                disabled={loading}
                className={`rounded px-4 py-2 font-semibold text-white ${modalModo === "cadastrar"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {loading
                  ? "Salvando..."
                  : modalModo === "cadastrar"
                    ? "Cadastrar"
                    : "Editar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
