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
  alterarStatusCargo,
  baixarRelatorioCargos,
  buscarCargosPaginados,
  buscarPosicoes,
  buscarTodosCargos,
  cadastrarCargo,
  editarCargo,
  type CargoItem,
  type PosicaoCargo,
} from "@/services/gerenciamento_cargo.service";

type ModalModo = "cadastrar" | "editar";

const NIVEIS = [
  { value: "DIRETORIA", label: "Diretoria" },
  { value: "GERENCIA", label: "Gerência" },
  { value: "FUNCIONARIO", label: "Funcionário" },
  { value: "ESTAGIO", label: "Estagiário" },
  { value: "MENORAPRENDIZ", label: "Menor Aprendiz" },
];

const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

const readonlyInputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-700 shadow-sm outline-none";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

const accentButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-fourth/40 hover:bg-fourth/10 hover:text-fourth disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

export function GerenciamentoCargoForm() {
  const [busca, setBusca] = useState("");
  const [cargos, setCargos] = useState<CargoItem[]>([]);
  const [posicoes, setPosicoes] = useState<PosicaoCargo[]>([]);
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
  const [cargoSelecionado, setCargoSelecionado] = useState<CargoItem | null>(null);

  const [inputCargo, setInputCargo] = useState("");
  const [secNivel, setSecNivel] = useState("");
  const [secPosicao, setSecPosicao] = useState("");
  const salvarActionRef = useRef(false);

  async function carregarTotais() {
    try {
      const lista = await buscarTodosCargos();

      let total = 0;
      let ativos = 0;
      let inativos = 0;

      lista.forEach((cargo) => {
        total += 1;
        if (Number(cargo.SN_ATIVO) === 1) ativos += 1;
        if (Number(cargo.SN_ATIVO) === 0) inativos += 1;
      });

      setTotais({ total, ativos, inativos });
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarPosicoesSelect() {
    try {
      const lista = await buscarPosicoes();

      const ordenadas = [...lista]
        .filter((item) => Number(item.SN_ATIVO) === 1)
        .sort((a, b) => String(a.CD_SICOOB).localeCompare(String(b.CD_SICOOB)));

      setPosicoes(ordenadas);
    } catch (e) {
      console.error(e);
      setErro("Falha ao carregar as posições.");
    }
  }

  async function carregarCargos(page = 1) {
    try {
      setLoadingTabela(true);
      setErro("");
      setInfo("");

      const response = await buscarCargosPaginados({
        nome: busca || " ",
        page,
        limit: 10,
      });

      setCargos(response.items || []);
      setTotalPages(response.total_pages || 1);
      setPaginaAtual(page);

      await carregarTotais();
    } catch (e) {
      console.error(e);
      setCargos([]);
      setErro("Cargo não encontrado ou falha ao carregar a listagem.");
    } finally {
      setLoadingTabela(false);
    }
  }

  useEffect(() => {
    carregarPosicoesSelect();
  }, []);

  function limparBusca() {
    setBusca("");
    setCargos([]);
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
    carregarCargos(1);
  }

  function abrirCadastro() {
    setModalModo("cadastrar");
    setCargoSelecionado(null);
    setInputCargo("");
    setSecNivel("");
    setSecPosicao("");
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function abrirEdicao(cargo: CargoItem) {
    setModalModo("editar");
    setCargoSelecionado(cargo);
    setInputCargo(cargo.NM_CARGO || "");
    setSecNivel(cargo.NM_NIVEL || "");
    setSecPosicao(cargo.ID_POSICAO ? String(cargo.ID_POSICAO) : "");
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function fecharModal() {
    if (loading) return;
    setModalOpen(false);
    setCargoSelecionado(null);
    setInputCargo("");
    setSecNivel("");
    setSecPosicao("");
  }

  function validarCampos() {
    if (!inputCargo.trim()) {
      setErro("Preencha o cargo.");
      return false;
    }

    if (!secNivel) {
      setErro("Preencha o nível.");
      return false;
    }

    if (!secPosicao) {
      setErro("Preencha a posição.");
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
        await cadastrarCargo({
          NM_CARGO: inputCargo.trim().toUpperCase(),
          NM_NIVEL: secNivel,
          ID_POSICAO: Number(secPosicao),
        });

        setInfo("Cargo cadastrado com sucesso.");
      }

      if (modalModo === "editar" && cargoSelecionado) {
        await editarCargo({
          id: cargoSelecionado.ID_CARGO,
          NM_CARGO: inputCargo.trim().toUpperCase(),
          SN_ATIVO: Number(cargoSelecionado.SN_ATIVO),
          NM_NIVEL: secNivel,
          ID_POSICAO: Number(secPosicao),
        });

        setInfo("Cargo atualizado com sucesso.");
      }

      await carregarCargos(modalModo === "editar" ? paginaAtual : 1);
      await carregarTotais();

      setTimeout(() => {
        fecharModal();
      }, 600);
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Não foi possível salvar o cargo."
      );
    } finally {
      salvarActionRef.current = false;
      setLoading(false);
    }
  }

  async function alternarStatus(cargo: CargoItem) {
    try {
      setErro("");
      setInfo("");

      const novoStatus = Number(cargo.SN_ATIVO) === 1 ? 0 : 1;

      await alterarStatusCargo({
        id: cargo.ID_CARGO,
        NM_CARGO: cargo.NM_CARGO,
        SN_ATIVO: novoStatus,
        NM_NIVEL: cargo.NM_NIVEL,
        ID_POSICAO: Number(cargo.ID_POSICAO),
      });

      setInfo(
        novoStatus === 1
          ? "Cargo ativado com sucesso."
          : "Cargo inativado com sucesso."
      );

      await carregarCargos(paginaAtual);
      await carregarTotais();
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Erro ao alterar o status do cargo."
      );
    }
  }

  async function baixarCsv() {
    try {
      setErro("");
      setInfo("Preparando relatório para download...");

      const blob = await baixarRelatorioCargos();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "cargos_gestores.csv";
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
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Filtros
            </p>
            <h2 className="mt-1 text-lg font-semibold text-title">
              Consulta de cargos
            </h2>
            <p className="mt-1 text-sm text-paragraph">
              Pesquise cargos cadastrados, edite informações e acompanhe o status.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCadastro}
            className={accentButtonClass}
          >
            <FaPlus />
            Cadastrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Cargo
            </label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={pesquisarComEnter}
              placeholder="Digite o nome do cargo"
              className={inputClass}
            />
          </div>

          <button
            type="button"
            onClick={() => carregarCargos(1)}
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

        {(cargos.length > 0 || loadingTabela) && (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                      Cargo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                      Posição
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-700">
                      Nível
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
                        colSpan={6}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Carregando cargos...
                      </td>
                    </tr>
                  ) : cargos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Nenhum cargo encontrado.
                      </td>
                    </tr>
                  ) : (
                    cargos.map((cargo) => {
                      const codigo = cargo.POSICAO?.CD_SICOOB || "";
                      const posicao = cargo.POSICAO?.NM_POSICAO || "";

                      return (
                        <tr key={cargo.ID_CARGO} className="transition hover:bg-primary/5">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {String(cargo.NM_CARGO).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{codigo}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {String(posicao).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {String(cargo.NM_NIVEL).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => abrirEdicao(cargo)}
                              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white cursor-pointer"
                            >
                              <FaEdit />
                              Editar
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => alternarStatus(cargo)}
                              className={`inline-flex h-8 min-w-24 items-center justify-center rounded-full px-3 text-xs font-semibold transition cursor-pointer ${
                                Number(cargo.SN_ATIVO) === 1
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              }`}
                            >
                              {Number(cargo.SN_ATIVO) === 1 ? "Ativo" : "Inativo"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
                    onClick={() => carregarCargos(1)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarCargos(paginaAtual - 1)}
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
                  onClick={() => carregarCargos(page)}
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
                    onClick={() => carregarCargos(paginaAtual + 1)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    Próxima
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarCargos(totalPages)}
                    className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Total
                </label>
                <input
                  readOnly
                  value={totais.total}
                  className={readonlyInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Ativos
                </label>
                <input
                  readOnly
                  value={totais.ativos}
                  className={readonlyInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Inativos
                </label>
                <input
                  readOnly
                  value={totais.inativos}
                  className={readonlyInputClass}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={baixarCsv}
                  className={`${accentButtonClass} w-full md:w-auto`}
                >
                  <FaDownload />
                  Baixar Relatório
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-title">
                {modalModo === "cadastrar" ? "Cadastrar Cargo" : "Editar Cargo"}
              </h2>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-full p-2 text-red-600 transition hover:bg-red-50"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Cargo
                </label>
                <input
                  value={inputCargo}
                  onChange={(e) => setInputCargo(e.target.value)}
                  className={inputClass}
                  placeholder="Digite o cargo"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Nível
                </label>
                <select
                  value={secNivel}
                  onChange={(e) => setSecNivel(e.target.value)}
                  className={inputClass}
                >
                  <option value=""></option>
                  {NIVEIS.map((nivel) => (
                    <option key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Posição
                </label>
                <select
                  value={secPosicao}
                  onChange={(e) => setSecPosicao(e.target.value)}
                  className={inputClass}
                >
                  <option value=""></option>
                  {posicoes.map((posicao) => (
                    <option key={posicao.ID_POSICAO} value={posicao.ID_POSICAO}>
                      {posicao.CD_SICOOB}, {String(posicao.NM_POSICAO).toUpperCase()}
                    </option>
                  ))}
                </select>
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
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  modalModo === "cadastrar"
                    ? "bg-secondary hover:bg-primary"
                    : "bg-primary hover:bg-fourth"
                }`}
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
