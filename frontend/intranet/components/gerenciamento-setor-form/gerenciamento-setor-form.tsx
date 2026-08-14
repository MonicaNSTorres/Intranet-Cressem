"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
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
  baixarRelatorioSetores,
  buscarSetoresPaginados,
  buscarTodosSetores,
  cadastrarSetor,
  editarSetor,
  type SetorItem,
} from "@/services/gerenciamento_setor.service";

type ModalModo = "cadastrar" | "editar";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10";

const textareaClass =
  "min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10";

const primaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

const auxiliaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

const editButtonClass =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-3 text-xs font-bold text-secondary shadow-sm transition hover:bg-secondary hover:text-white";

export function GerenciamentoSetorForm() {
  const salvarActionRef = useRef(false);
  const statusActionRef = useRef<Set<number>>(new Set());

  const [busca, setBusca] = useState("");
  const [setores, setSetores] = useState<SetorItem[]>([]);
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
  const [setorSelecionado, setSetorSelecionado] = useState<SetorItem | null>(null);

  const [inputSetor, setInputSetor] = useState("");
  const [inputRamal, setInputRamal] = useState("");
  const [inputEndereco, setInputEndereco] = useState("");

  async function carregarTotais() {
    try {
      const lista = await buscarTodosSetores();

      let total = 0;
      let ativos = 0;
      let inativos = 0;

      lista.forEach((setor) => {
        total += 1;
        if (Number(setor.SN_ATIVO) === 1) ativos += 1;
        if (Number(setor.SN_ATIVO) === 0) inativos += 1;
      });

      setTotais({ total, ativos, inativos });
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarSetores(page = 1, pageLimit = limit) {
    try {
      setLoadingTabela(true);
      setErro("");
      setInfo("");

      const response = await buscarSetoresPaginados({
        nome: busca || " ",
        page,
        limit: pageLimit,
      });

      setSetores(response.items || []);
      setTotalItems(response.total_items || 0);
      setTotalPages(response.total_pages || 1);
      setPaginaAtual(page);

      await carregarTotais();
    } catch (e) {
      console.error(e);
      setSetores([]);
      setTotalItems(0);
      setErro("Setor não encontrado ou falha ao carregar a listagem.");
    } finally {
      setLoadingTabela(false);
    }
  }

  useEffect(() => {
    carregarTotais();
  }, []);

  function limparBusca() {
    setBusca("");
    setSetores([]);
    setPaginaAtual(1);
    setTotalPages(1);
    setTotalItems(0);
    setErro("");
    setInfo("");
  }

  function abrirCadastro() {
    setModalModo("cadastrar");
    setSetorSelecionado(null);
    setInputSetor("");
    setInputRamal("");
    setInputEndereco("");
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function abrirEdicao(setor: SetorItem) {
    setModalModo("editar");
    setSetorSelecionado(setor);
    setInputSetor(setor.NM_SETOR || "");
    setInputRamal(setor.NR_RAMAL || "");
    setInputEndereco(setor.NM_ENDERECO || "");
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function fecharModal() {
    if (loading) return;
    setModalOpen(false);
    setSetorSelecionado(null);
    setInputSetor("");
    setInputRamal("");
    setInputEndereco("");
  }

  function validarCampos() {
    if (!inputSetor.trim()) {
      setErro("Preencha o setor.");
      return false;
    }

    if (!inputEndereco.trim()) {
      setErro("Preencha o endereço.");
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
        await cadastrarSetor({
          NM_SETOR: inputSetor.trim().toUpperCase(),
          NM_ENDERECO: inputEndereco.trim().toUpperCase(),
          NR_RAMAL: inputRamal.trim(),
        });

        setInfo("Setor cadastrado com sucesso.");
      }

      if (modalModo === "editar" && setorSelecionado) {
        await editarSetor({
          id: setorSelecionado.ID_SETOR,
          NM_SETOR: inputSetor.trim().toUpperCase(),
          NM_ENDERECO: inputEndereco.trim().toUpperCase(),
          NR_RAMAL: inputRamal.trim(),
          SN_ATIVO: Number(setorSelecionado.SN_ATIVO),
        });

        setInfo("Setor atualizado com sucesso.");
      }

      await carregarSetores(modalModo === "editar" ? paginaAtual : 1);
      await carregarTotais();

      setTimeout(() => {
        fecharModal();
      }, 600);
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Não foi possível salvar o setor."
      );
    } finally {
      salvarActionRef.current = false;
      setLoading(false);
    }
  }

  async function alternarStatus(setor: SetorItem) {
    if (statusActionRef.current.has(setor.ID_SETOR)) return;

    try {
      statusActionRef.current.add(setor.ID_SETOR);
      setErro("");
      setInfo("");

      const novoStatus = Number(setor.SN_ATIVO) === 1 ? 0 : 1;

      await editarSetor({
        id: setor.ID_SETOR,
        NM_SETOR: setor.NM_SETOR,
        NM_ENDERECO: setor.NM_ENDERECO,
        NR_RAMAL: setor.NR_RAMAL || "",
        SN_ATIVO: novoStatus,
      });

      setInfo(
        novoStatus === 1
          ? "Setor ativado com sucesso."
          : "Setor inativado com sucesso."
      );

      await carregarSetores(paginaAtual);
      await carregarTotais();
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Erro ao alterar o status do setor."
      );
    } finally {
      statusActionRef.current.delete(setor.ID_SETOR);
    }
  }

  async function baixarCsv() {
    try {
      setErro("");
      setInfo("Preparando relatório para download...");

      const blob = await baixarRelatorioSetores();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "setores.csv";
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
      <div className="mx-auto w-full rounded-2xl border border-slate-200 border-t-4 border-t-primary bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">
              Filtros
            </p>
            <h2 className="mt-1 text-lg font-bold text-[var(--title)]">
              Consulta de setores
            </h2>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Pesquise por setor ou endereço e acompanhe os registros cadastrados.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCadastro}
            className={`${auxiliaryButtonClass} w-full lg:w-auto`}
          >
            <FaPlus />
            Cadastrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Setor ou endereço
            </label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o setor ou endereço"
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => carregarSetores(1)}
              className={`${primaryButtonClass} w-full lg:w-auto`}
            >
              <FaSearch />
              Buscar
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limparBusca}
              className={`${secondaryButtonClass} w-full lg:w-auto`}
            >
              <FaTimes />
              Limpar
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={baixarCsv}
              className={`${auxiliaryButtonClass} w-full lg:w-auto`}
            >
              <FaDownload />
              Baixar Relatório
            </button>
          </div>
        </div>

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}

        {(setores.length > 0 || loadingTabela) && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Total
                </p>
                <p className="mt-2 text-2xl font-black text-[var(--title)]">
                  {totais.total}
                </p>
                <p className="mt-1 text-xs text-[var(--paragraph)]">
                  setores cadastrados
                </p>
              </div>

              <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-secondary">
                  Ativos
                </p>
                <p className="mt-2 text-2xl font-black text-[var(--title)]">
                  {totais.ativos}
                </p>
                <p className="mt-1 text-xs text-[var(--paragraph)]">
                  setores disponíveis
                </p>
              </div>

              <div className="rounded-2xl border border-fourth/30 bg-fourth/10 p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-fourth">
                  Inativos
                </p>
                <p className="mt-2 text-2xl font-black text-[var(--title)]">
                  {totais.inativos}
                </p>
                <p className="mt-1 text-xs text-[var(--paragraph)]">
                  setores indisponíveis
                </p>
              </div>

            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Setor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Ramal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Endereço
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                      Editar
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
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
                        Carregando setores...
                      </td>
                    </tr>
                  ) : setores.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Nenhum setor encontrado.
                      </td>
                    </tr>
                  ) : (
                    setores.map((setor) => (
                      <tr key={setor.ID_SETOR} className="transition hover:bg-primary/5">
                        <td className="px-4 py-3 font-semibold text-[var(--title)]">
                          {String(setor.NM_SETOR).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{setor.NR_RAMAL || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {String(setor.NM_ENDERECO).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => abrirEdicao(setor)}
                            className={editButtonClass}
                          >
                            <FaEdit />
                            Editar
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => alternarStatus(setor)}
                            className={`inline-flex h-9 min-w-[86px] cursor-pointer items-center justify-center rounded-xl px-3 text-xs font-bold shadow-sm transition ${
                              Number(setor.SN_ATIVO) === 1
                                ? "border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary hover:text-white"
                                : "border border-fourth/30 bg-fourth/10 text-fourth hover:bg-fourth hover:text-white"
                            }`}
                          >
                            {Number(setor.SN_ATIVO) === 1 ? "Ativo" : "Inativo"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-slate-500">
                    Mostrando{" "}
                    <span className="font-semibold text-slate-700">
                      {totalItems === 0 ? 0 : (paginaAtual - 1) * limit + 1}
                    </span>{" "}
                    até{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(paginaAtual * limit, totalItems)}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold text-slate-700">{totalItems}</span>{" "}
                    setor(es)
                  </p>

                  <select
                    value={limit}
                    onChange={(event) => {
                      const novoLimit = Number(event.target.value);
                      setLimit(novoLimit);
                      carregarSetores(1, novoLimit);
                    }}
                    disabled={loadingTabela}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => carregarSetores(Math.max(paginaAtual - 1, 1))}
                    disabled={paginaAtual <= 1 || loadingTabela}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70"
                  >
                    <FaChevronLeft size={12} />
                    Anterior
                  </button>

                  <span className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                    Página {paginaAtual} de {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      carregarSetores(Math.min(paginaAtual + 1, totalPages))
                    }
                    disabled={paginaAtual >= totalPages || loadingTabela}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70"
                  >
                    Próxima
                    <FaChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Setores
                </p>
                <h2 className="mt-1 text-xl font-bold text-[var(--title)]">
                  {modalModo === "cadastrar" ? "Cadastro de setor" : "Editar setor"}
                </h2>
                <p className="mt-1 text-sm text-[var(--paragraph)]">
                  Informe os dados do setor e salve o registro.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 shadow-sm transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                aria-label="Fechar modal"
              >
                <FaTimes />
              </button>
            </div>

            <div className="max-h-[calc(90vh-180px)] space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Setor
                </label>
                <input
                  value={inputSetor}
                  onChange={(e) => setInputSetor(e.target.value)}
                  className={inputClass}
                  placeholder="Digite o setor"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Ramal
                </label>
                <input
                  value={inputRamal}
                  onChange={(e) => setInputRamal(e.target.value)}
                  className={inputClass}
                  placeholder="Digite o ramal"
                  maxLength={4}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Endereço
                </label>
                <textarea
                  value={inputEndereco}
                  onChange={(e) => setInputEndereco(e.target.value)}
                  className={textareaClass}
                  placeholder="Digite o endereço"
                  rows={6}
                />
              </div>

              {(erro || info) && (
                <div>
                  {erro ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                      {erro}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                      {info}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={fecharModal}
                className={`${secondaryButtonClass} w-full sm:w-auto`}
                disabled={loading}
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarModal}
                disabled={loading}
                className={`${primaryButtonClass} w-full sm:w-auto`}
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
