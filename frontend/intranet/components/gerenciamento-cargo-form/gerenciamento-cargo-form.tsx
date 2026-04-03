"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
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

function capitalizeWords(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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
    if (!validarCampos()) return;

    try {
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
      <div className="min-w-225 mx-auto rounded-xl bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Digite o cargo
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite o nome do cargo"
                className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />

              <button
                type="button"
                onClick={() => carregarCargos(1)}
                className="inline-flex items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary cursor-pointer"
              >
                <FaSearch />
                Buscar
              </button>

              <button
                type="button"
                onClick={limparBusca}
                className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-third px-5 py-2 font-semibold text-white shadow hover:bg-primary lg:w-auto cursor-pointer"
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

        {(cargos.length > 0 || loadingTabela) && (
          <>
            <div className="mt-6 overflow-x-auto rounded-xl border">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Cargo
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Posição
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Nível
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
                        <tr key={cargo.ID_CARGO} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {capitalizeWords(cargo.NM_CARGO)}
                          </td>
                          <td className="px-4 py-3">{codigo}</td>
                          <td className="px-4 py-3">
                            {capitalizeWords(posicao)}
                          </td>
                          <td className="px-4 py-3">
                            {capitalizeWords(cargo.NM_NIVEL)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => abrirEdicao(cargo)}
                              className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                            >
                              <FaEdit />
                              Editar
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => alternarStatus(cargo)}
                              className={`inline-flex min-w-21 items-center justify-center rounded px-3 py-1.5 text-xs font-semibold ${
                                Number(cargo.SN_ATIVO) === 1
                                  ? "bg-secondary text-white hover:bg-third"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
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

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {paginaAtual > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => carregarCargos(1)}
                    className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarCargos(paginaAtual - 1)}
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
                  onClick={() => carregarCargos(page)}
                  className={`rounded px-3 py-1.5 text-sm ${
                    page === paginaAtual
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
                    onClick={() => carregarCargos(paginaAtual + 1)}
                    className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Próxima
                  </button>

                  <button
                    type="button"
                    onClick={() => carregarCargos(totalPages)}
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-semibold text-white shadow hover:bg-primary md:w-auto cursor-pointer"
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
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalModo === "cadastrar" ? "Cadastro Cargo" : "Edita Cargo"}
              </h2>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Cargo
                </label>
                <input
                  value={inputCargo}
                  onChange={(e) => setInputCargo(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Digite o cargo"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Nível
                </label>
                <select
                  value={secNivel}
                  onChange={(e) => setSecNivel(e.target.value)}
                  className="w-full rounded border px-3 py-2"
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
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Posição
                </label>
                <select
                  value={secPosicao}
                  onChange={(e) => setSecPosicao(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value=""></option>
                  {posicoes.map((posicao) => (
                    <option key={posicao.ID_POSICAO} value={posicao.ID_POSICAO}>
                      {posicao.CD_SICOOB}, {capitalizeWords(posicao.NM_POSICAO)}
                    </option>
                  ))}
                </select>
              </div>

              {(erro || info) && (
                <div>
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

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={fecharModal}
                className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarModal}
                disabled={loading}
                className={`rounded px-4 py-2 font-semibold text-white ${
                  modalModo === "cadastrar"
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