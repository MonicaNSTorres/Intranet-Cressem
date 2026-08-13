"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
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

  async function carregarPosicoes(page = 1) {
    try {
      setLoadingTabela(true);
      setErro("");
      setInfo("");

      const response = await buscarPosicoesPaginadas({
        nome: busca || " ",
        page,
        limit: 10,
      });

      setPosicoes(response.items || []);
      setTotalPages(response.total_pages || 1);
      setPaginaAtual(page);

      await carregarTotais();
    } catch (e) {
      console.error(e);
      setPosicoes([]);
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
    setErro("");
    setInfo("");
    setTotais({
      total: 0,
      ativos: 0,
      inativos: 0,
    });
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

  const paginasVisiveis = useMemo(() => {
    const range = 2;
    const inicio = Math.max(1, paginaAtual - range);
    const fim = Math.min(totalPages, paginaAtual + range);

    const paginas: number[] = [];
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    return paginas;
  }, [paginaAtual, totalPages]);

  return (
    <>
      <div className="mx-auto w-full rounded-2xl border border-slate-200 border-t-4 border-t-primary bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Filtros
            </p>
            <h2 className="mt-1 text-lg font-semibold text-title">
              Consulta de posições
            </h2>
            <p className="mt-1 text-sm text-paragraph">
              Pesquise posições cadastradas, edite dados e acompanhe o status.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCadastro}
            className={`${accentButtonClass} w-full lg:w-auto`}
          >
            <FaPlus />
            Cadastrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Código, atuação ou posição
            </label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={pesquisarComEnter}
              placeholder="Digite o código, atuação ou posição"
              className={inputClass}
            />
          </div>

          <button
            type="button"
            onClick={() => carregarPosicoes(1)}
            className={primaryButtonClass}
          >
            <FaSearch />
            Buscar
          </button>

          <button
            type="button"
            onClick={limparBusca}
            className={secondaryButtonClass}
          >
            <FaTimes />
            Limpar
          </button>

          <button
            type="button"
            onClick={baixarCsv}
            className={accentButtonClass}
          >
            <FaDownload />
            Baixar Relatório
          </button>
        </div>

        {(erro || info) && (
          <div className="mt-4">
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

        {(posicoes.length > 0 || loadingTabela) && (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                        Código
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                        Atuação
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                        Posição
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-700">
                        Editar
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-700">
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
                        <tr
                          key={posicao.ID_POSICAO}
                          className="transition hover:bg-primary/5"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {posicao.CD_SICOOB}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {String(posicao.DESC_ATUACAO).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {String(posicao.NM_POSICAO).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => abrirEdicao(posicao)}
                              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white cursor-pointer"
                            >
                              <FaEdit />
                              Editar
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => alternarStatus(posicao)}
                              className={`inline-flex h-8 min-w-[5.25rem] items-center justify-center rounded-lg px-3 text-xs font-semibold transition cursor-pointer ${
                                Number(posicao.SN_ATIVO) === 1
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
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
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {paginaAtual > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => carregarPosicoes(1)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarPosicoes(paginaAtual - 1)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
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
                  className={`h-9 min-w-9 rounded-xl px-3 text-sm font-semibold shadow-sm transition ${
                    page === paginaAtual
                      ? "bg-primary text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
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
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    Próxima
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarPosicoes(totalPages)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Total</p>
                <p className="mt-2 text-2xl font-bold text-title">{totais.total}</p>
                <p className="mt-1 text-xs text-paragraph">posições cadastradas</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase text-emerald-700">Ativos</p>
                <p className="mt-2 text-2xl font-bold text-emerald-800">
                  {totais.ativos}
                </p>
                <p className="mt-1 text-xs text-emerald-700">posições disponíveis</p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase text-red-700">Inativos</p>
                <p className="mt-2 text-2xl font-bold text-red-800">
                  {totais.inativos}
                </p>
                <p className="mt-1 text-xs text-red-700">posições indisponíveis</p>
              </div>
            </div>
          </>
        )}
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
                className={primaryButtonClass}
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
