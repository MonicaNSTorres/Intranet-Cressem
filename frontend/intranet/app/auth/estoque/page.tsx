"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBarcode,
  FaBoxes,
  FaCube,
  FaDesktop,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaUserCog,
  FaCalendarAlt,
} from "react-icons/fa";
import { listarEstoqueGlpi } from "@/services/glpi_estoque.service";

function getInitials(text?: string) {
  if (!text) return "PC";

  const parts = String(text).trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function containsText(value: any, term: string) {
  return String(value || "").toLowerCase().includes(term.toLowerCase());
}

export default function EstoquePage() {
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [filtroRapido, setFiltroRapido] = useState<
    "todos" | "comSerial" | "comContato" | "comLocalizacao"
  >("todos");
  const [itemSelecionado, setItemSelecionado] = useState<any | null>(null);

  async function carregar() {
    try {
      setLoading(true);
      const response = await listarEstoqueGlpi(busca);
      const lista = Array.isArray(response?.items) ? response.items : [];
      setItems(lista);

      if (itemSelecionado) {
        const atualizado = lista.find(
          (item: any) => String(item?.id) === String(itemSelecionado?.id)
        );
        setItemSelecionado(atualizado || null);
      }
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
      setItems([]);
      setItemSelecionado(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const itemsFiltrados = useMemo(() => {
    let base = [...items];

    if (busca.trim()) {
      base = base.filter((item) => {
        return (
          containsText(item?.name, busca) ||
          containsText(item?.serial, busca) ||
          containsText(item?.contact, busca) ||
          containsText(item?.id, busca) ||
          containsText(item?.comment, busca)
        );
      });
    }

    if (filtroRapido === "comSerial") {
      base = base.filter((item) => String(item?.serial || "").trim() !== "");
    }

    if (filtroRapido === "comContato") {
      base = base.filter((item) => String(item?.contact || "").trim() !== "");
    }

    if (filtroRapido === "comLocalizacao") {
      base = base.filter(
        (item) =>
          item?.locations_id !== null &&
          item?.locations_id !== undefined &&
          String(item?.locations_id) !== "0" &&
          item?.locations_id !== ""
      );
    }

    return base;
  }, [items, busca, filtroRapido]);

  const totalItens = useMemo(() => items.length, [items]);

  const totalComSerial = useMemo(() => {
    return items.filter((item) => String(item?.serial || "").trim() !== "").length;
  }, [items]);

  const totalComContato = useMemo(() => {
    return items.filter((item) => String(item?.contact || "").trim() !== "").length;
  }, [items]);

  const totalComLocalizacao = useMemo(() => {
    return items.filter(
      (item) =>
        item?.locations_id !== null &&
        item?.locations_id !== undefined &&
        String(item?.locations_id) !== "0" &&
        item?.locations_id !== ""
    ).length;
  }, [items]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    carregar();
  }

  function abrirDetalhes(item: any) {
    setItemSelecionado(item);
  }

  function fecharDetalhes() {
    setItemSelecionado(null);
  }

  return (
    <div className="mx-auto w-full min-w-225 space-y-6 rounded-[28px] border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,174,157,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(121,183,41,0.16),_transparent_28%)]" />
        <div className="relative space-y-6 p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br from-primary to-secondary text-white shadow-xl shadow-[#00AE9D]/20">
                <FaBoxes className="text-[26px]" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-[#00AE9D]/15 bg-[#00AE9D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#00AE9D]">
                  GLPI • Inventário de Equipamentos
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                    Sistema de Estoque
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                    Visualize os equipamentos cadastrados no GLPI com uma experiência
                    moderna, centralizada e integrada à intranet.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-3 xl:max-w-180 xl:flex-row"
            >
              <div className="relative flex-1">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por equipamento, serial, contato ou ID..."
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-[#00AE9D]/10"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition-all hover:-translate-y-0.5 hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaSearch className="text-xs" />
                  {loading ? "Buscando..." : "Buscar"}
                </button>

                <button
                  type="button"
                  onClick={carregar}
                  disabled={loading}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaSyncAlt className={`${loading ? "animate-spin" : ""} text-xs`} />
                  Atualizar
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Total de Equipamentos
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalItens}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                  <FaCube className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Quantidade total carregada da integração com o GLPI.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Com Serial
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalComSerial}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#79B729]/10 text-[#79B729]">
                  <FaBarcode className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Equipamentos com número de série preenchido.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Com Contato
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalComContato}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FaUserCog className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Equipamentos com usuário ou contato associado.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Com Localização
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalComLocalizacao}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C7D300]/15 text-[#8E9B00]">
                  <FaDesktop className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Equipamentos vinculados a uma localização válida.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Inventário de Equipamentos</h2>
              <p className="text-sm text-slate-500">
                Visualização consolidada e interativa dos equipamentos do GLPI.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFiltroRapido("todos")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  filtroRapido === "todos"
                    ? "bg-[#00AE9D] text-white shadow-md shadow-[#00AE9D]/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#00AE9D] hover:text-[#00AE9D]"
                }`}
              >
                Todos
              </button>

              <button
                type="button"
                onClick={() => setFiltroRapido("comSerial")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  filtroRapido === "comSerial"
                    ? "bg-[#79B729] text-white shadow-md shadow-[#79B729]/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#79B729] hover:text-[#79B729]"
                }`}
              >
                Com serial
              </button>

              <button
                type="button"
                onClick={() => setFiltroRapido("comContato")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  filtroRapido === "comContato"
                    ? "bg-slate-800 text-white shadow-md shadow-slate-300"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
                }`}
              >
                Com contato
              </button>

              <button
                type="button"
                onClick={() => setFiltroRapido("comLocalizacao")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  filtroRapido === "comLocalizacao"
                    ? "bg-[#C7D300] text-slate-800 shadow-md shadow-[#C7D300]/25"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#C7D300] hover:text-slate-800"
                }`}
              >
                Com localização
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs font-medium text-slate-500 sm:px-6">
            {loading
              ? "Atualizando dados..."
              : `${itemsFiltrados.length} ${
                  itemsFiltrados.length === 1 ? "equipamento encontrado" : "equipamentos encontrados"
                }`}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/80">
                <tr className="text-left">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Equipamento
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Serial
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Contato
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Última atualização
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
                          <div className="space-y-2">
                            <div className="h-3 w-40 animate-pulse rounded-full bg-slate-200" />
                            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 w-24 animate-pulse rounded-2xl bg-slate-200" />
                      </td>
                    </tr>
                  ))
                ) : itemsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-[#00AE9D]/10 to-[#79B729]/10 text-[#00AE9D]">
                          <FaBoxes className="text-3xl" />
                        </div>

                        <h3 className="mt-5 text-xl font-bold text-slate-800">
                          Nenhum equipamento encontrado
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                          Não localizamos equipamentos com os filtros aplicados no momento.
                          Tente ajustar a busca ou atualizar a listagem.
                        </p>

                        <button
                          type="button"
                          onClick={carregar}
                          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition-all hover:-translate-y-0.5 hover:bg-[#009688]"
                        >
                          <FaSyncAlt className="text-xs" />
                          Atualizar listagem
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  itemsFiltrados.map((item, index) => {
                    const ativo = String(itemSelecionado?.id || "") === String(item?.id || "");

                    return (
                      <tr
                        key={item.id}
                        className={`group border-t border-slate-100 transition-all hover:bg-[#00AE9D]/3 ${
                          ativo ? "bg-[#00AE9D]/5" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => abrirDetalhes(item)}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#00AE9D] to-[#79B729] text-sm font-bold text-white shadow-md shadow-[#00AE9D]/15">
                              {getInitials(item?.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {formatValue(item?.name)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                ID #{formatValue(item?.id)} • Registro {index + 1}
                              </p>
                            </div>
                          </button>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            {formatValue(item?.serial)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {formatValue(item?.contact)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {formatValue(item?.last_inventory_update || item?.date_mod)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => abrirDetalhes(item)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-[#00AE9D] hover:text-[#00AE9D]"
                          >
                            Ver detalhes
                            <FaArrowRight className="text-[10px]" />
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

        <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Detalhes do Equipamento</h2>
              <p className="text-sm text-slate-500">
                Clique em um registro para visualizar mais informações.
              </p>
            </div>

            {itemSelecionado && (
              <button
                type="button"
                onClick={fecharDetalhes}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-red-200 hover:text-red-500"
              >
                <FaTimes className="text-sm" />
              </button>
            )}
          </div>

          {!itemSelecionado ? (
            <div className="flex min-h-130 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-[#00AE9D]/10 to-[#79B729]/10 text-[#00AE9D]">
                <FaBoxes className="text-3xl" />
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-800">
                Nenhum equipamento selecionado
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                Selecione um item da tabela para abrir o painel lateral com os dados
                detalhados do cadastro retornado pelo GLPI.
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="rounded-3xl bg-linear-to-br from-[#00AE9D] to-[#79B729] p-5 text-white shadow-lg shadow-[#00AE9D]/20">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold backdrop-blur-sm">
                    {getInitials(itemSelecionado?.name)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                      Equipamento selecionado
                    </p>
                    <h3 className="mt-2 truncate text-xl font-bold">
                      {formatValue(itemSelecionado?.name)}
                    </h3>
                    <p className="mt-1 text-sm text-white/85">
                      ID #{formatValue(itemSelecionado?.id)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Serial
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatValue(itemSelecionado?.serial)}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Contato
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatValue(itemSelecionado?.contact)}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Localização
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatValue(itemSelecionado?.locations_id)}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Usuário ID
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatValue(itemSelecionado?.users_id)}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Última atualização
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatValue(itemSelecionado?.last_inventory_update || itemSelecionado?.date_mod)}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Observação
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatValue(itemSelecionado?.comment)}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#00AE9D]/15 bg-[#00AE9D]/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00AE9D]">
                  Observação de Integração
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Este painel está consumindo o inventário do GLPI pelo itemtype
                  <span className="font-semibold"> Computer</span>, que foi o tipo com
                  retorno real de registros no seu ambiente.
                </p>
              </div>

              <button
                type="button"
                onClick={carregar}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition-all hover:-translate-y-0.5 hover:bg-[#009688] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FaSyncAlt className={`${loading ? "animate-spin" : ""} text-xs`} />
                Atualizar item
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}