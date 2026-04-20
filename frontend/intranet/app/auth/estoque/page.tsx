"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import {
  FaBoxes,
  FaSearch,
  FaSyncAlt,
  FaMapMarkerAlt,
  FaUserCog,
  FaBarcode,
  FaCube,
} from "react-icons/fa";
import { listarConsumiveisGlpi } from "@/services/glpi_estoque.service";

function getInitials(text?: string) {
  if (!text) return "IT";

  const parts = String(text).trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function EstoquePage() {
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  async function carregar() {
    try {
      setLoading(true);
      const response = await listarConsumiveisGlpi(busca);
      setItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      console.error("Erro ao carregar consumíveis:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const totalItens = useMemo(() => items.length, [items]);

  const totalComReferencia = useMemo(() => {
    return items.filter((item) => String(item?.reference || "").trim() !== "").length;
  }, [items]);

  const totalComLocalizacao = useMemo(() => {
    return items.filter((item) => item?.locations_id !== null && item?.locations_id !== undefined && item?.locations_id !== "").length;
  }, [items]);

  const totalComTecnico = useMemo(() => {
    return items.filter((item) => item?.users_id_tech !== null && item?.users_id_tech !== undefined && item?.users_id_tech !== "").length;
  }, [items]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    carregar();
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 rounded-[28px] border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,174,157,0.14),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(121,183,41,0.14),_transparent_28%)]" />
        <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#00AE9D] to-[#79B729] text-white shadow-lg shadow-[#00AE9D]/20">
                <FaBoxes className="text-[26px]" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-[#00AE9D]/15 bg-[#00AE9D]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#00AE9D]">
                  GLPI • Estoque Integrado
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                    Sistema de Estoque
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                    Gerencie consumíveis integrados ao GLPI com uma visualização
                    moderna, rápida e centralizada dentro da intranet.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-3 xl:max-w-[620px] xl:flex-row"
            >
              <div className="relative flex-1">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, referência ou identificador..."
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#00AE9D] focus:ring-4 focus:ring-[#00AE9D]/10"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#00AE9D] px-5 text-sm font-semibold text-white shadow-lg shadow-[#00AE9D]/20 transition-all hover:-translate-y-0.5 hover:bg-[#009688] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaSearch className="text-xs" />
                  {loading ? "Buscando..." : "Buscar"}
                </button>

                <button
                  type="button"
                  onClick={carregar}
                  disabled={loading}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-[#79B729] hover:text-[#79B729] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaSyncAlt className={`${loading ? "animate-spin" : ""} text-xs`} />
                  Atualizar
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Total de Itens
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalItens}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                  <FaCube className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Quantidade total retornada pela integração do GLPI.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Com Referência
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalComReferencia}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#79B729]/10 text-[#79B729]">
                  <FaBarcode className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Itens já identificados com código ou referência cadastrada.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Com Localização
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalComLocalizacao}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C7D300]/15 text-[#98A600]">
                  <FaMapMarkerAlt className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Itens vinculados a uma localização informada no GLPI.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Com Técnico
                  </p>
                  <h3 className="mt-2 text-3xl font-bold text-slate-800">{totalComTecnico}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FaUserCog className="text-lg" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Itens com técnico responsável associado no cadastro.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Inventário de Consumíveis</h2>
            <p className="text-sm text-slate-500">
              Visualização consolidada dos itens retornados pela integração com o GLPI.
            </p>
          </div>

          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            {loading
              ? "Atualizando dados..."
              : `${items.length} ${items.length === 1 ? "item encontrado" : "itens encontrados"}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80">
              <tr className="text-left">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Item
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Referência
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Localização
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Técnico
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  ID
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
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
                      <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3 w-12 animate-pulse rounded-full bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#00AE9D]/10 to-[#79B729]/10 text-[#00AE9D]">
                        <FaBoxes className="text-3xl" />
                      </div>

                      <h3 className="mt-5 text-xl font-bold text-slate-800">
                        Nenhum item encontrado
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Não localizamos consumíveis para o filtro informado. Tente
                        realizar uma nova busca com outro termo ou atualize a listagem.
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
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="group border-t border-slate-100 transition-colors hover:bg-[#00AE9D]/[0.03]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00AE9D] to-[#79B729] text-sm font-bold text-white shadow-md shadow-[#00AE9D]/15">
                          {getInitials(item?.name)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {formatValue(item?.name)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Registro #{index + 1}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        {formatValue(item?.reference)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {formatValue(item?.locations_id)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {formatValue(item?.users_id_tech)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-[#79B729]/10 px-3 py-1 text-xs font-semibold text-[#5D8D17]">
                        #{formatValue(item?.id)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}