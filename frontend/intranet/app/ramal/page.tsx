"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/back-button/back-button";
import { FaPhone } from "react-icons/fa";
import { buscarRamais } from "@/services/ramais.service";

type RamalRow = {
    ID: number | string;
    RAMAL: string | number | null;
    NOME: string | null;
    DEPARTAMENTO: string | null;
    EMAIL: string | null;
    LOGIN: string | null;
};

function normalizeField(value: string | number | null | undefined) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function isMissing(value: string | number | null | undefined) {
    const v = normalizeField(value).toLowerCase();

    return (
        v === "" ||
        v === "-" ||
        v === "--" ||
        v === "null" ||
        v === "undefined"
    );
}

export default function RamaisPage() {
    const [q, setQ] = useState("");
    const [nome, setNome] = useState("");
    const [departamento, setDepartamento] = useState("");
    const [sortBy, setSortBy] = useState<"nome" | "ramal" | "departamento">("nome");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<RamalRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    const debouncedQ = useDebouncedValue(q, 300);
    const debouncedNome = useDebouncedValue(nome, 300);
    const debouncedDepartamento = useDebouncedValue(departamento, 300);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await buscarRamais({
                    q: debouncedQ,
                    nome: debouncedNome,
                    departamento: debouncedDepartamento,
                    sortBy,
                    sortOrder,
                });

                setRows(Array.isArray(data.data) ? data.data : []);
            } catch (e: any) {
                setError(String(e?.message || "Erro ao carregar"));
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [
        debouncedQ,
        debouncedNome,
        debouncedDepartamento,
        sortBy,
        sortOrder,
    ]);

    const total = useMemo(() => rows.length, [rows]);

    function limparFiltros() {
        setQ("");
        setNome("");
        setDepartamento("");
        setSortBy("nome");
        setSortOrder("asc");
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-white via-[#F8FBF8] to-white p-6 lg:p-8">
            <div className="mx-auto min-w-225">
                <div className="mb-6">
                    <BackButton />
                </div>

                <div className="overflow-hidden rounded-[28px] border border-[#DDE7DD] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
                    <div
                        className="relative px-6 py-7 lg:px-8 lg:py-8"
                        style={{
                            background:
                                "linear-gradient(135deg, rgba(0,174,157,0.10) 0%, rgba(121,183,41,0.10) 50%, rgba(199,211,0,0.10) 100%)",
                        }}
                    >
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_35%)]" />

                        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#C7D300]/40 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                                    <span className="h-2 w-2 rounded-full bg-secondary" />
                                    Consulta rápida de contatos internos
                                </div>

                                <div className="mt-4 flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700 shadow-sm">
                                        <FaPhone size={22} />
                                    </div>

                                    <div className="min-w-0">
                                        <h1 className="truncate text-3xl font-bold tracking-tight text-gray-800 lg:text-4xl">
                                            Ramais
                                        </h1>
                                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 lg:text-base">
                                            Encontre rapidamente o contato que precisa pesquisando por nome,
                                            departamento, e-mail, login ou número do ramal.
                                        </p>

                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                                                Busca simples
                                            </div>
                                            <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                                                Filtros avançados
                                            </div>
                                            <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                                                Ordenação
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:max-w-md">
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Busca geral
                                </label>

                                <div className="rounded-2xl border border-white/70 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 transition focus-within:border-secondary focus-within:bg-white">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                                            <FaPhone size={14} />
                                        </div>

                                        <input
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                            placeholder="Ex: Ana, TI, 214, email@..., login..."
                                            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                                        />

                                        {q ? (
                                            <button
                                                onClick={() => setQ("")}
                                                className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-secondary hover:text-secondary"
                                            >
                                                Limpar
                                            </button>
                                        ) : null}
                                    </div>

                                    <p className="px-2 pt-2 text-xs leading-5 text-gray-500">
                                        Dica: use a busca geral para uma pesquisa ampla, ou refine pelos filtros abaixo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/*<div className="border-t border-[#EDF2ED] bg-[#FCFDFC] px-6 py-4 lg:px-8">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-[#E6ECE6] bg-white px-4 py-3 shadow-sm">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Registros
                                </p>
                                <p className="mt-1 text-2xl font-bold text-gray-800">
                                    {loading ? "..." : total}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E6ECE6] bg-white px-4 py-3 shadow-sm">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Status
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-800">
                                    {loading ? "Buscando informações..." : "Consulta disponível"}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E6ECE6] bg-white px-4 py-3 shadow-sm">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Ordenação
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-800">
                                    {sortBy} · {sortOrder === "asc" ? "crescente" : "decrescente"}
                                </p>
                            </div>
                        </div>
                    </div>*/}

                    <div className="px-6 pt-6 lg:px-8">
                        <div className="rounded-3xl border border-[#E7ECE7] bg-[#FAFCFA] p-4 shadow-sm">
                            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-gray-800">
                                        Filtros avançados
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Refine a busca por nome e departamento.
                                    </p>
                                </div>

                                <button
                                    onClick={limparFiltros}
                                    className="self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-secondary hover:text-secondary"
                                >
                                    Limpar filtros
                                </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        Nome
                                    </label>
                                    <input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Buscar por nome"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-secondary"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        Departamento
                                    </label>
                                    <input
                                        value={departamento}
                                        onChange={(e) => setDepartamento(e.target.value)}
                                        placeholder="Buscar por departamento"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-secondary"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        Ordenar por
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as "nome" | "ramal" | "departamento")}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-secondary"
                                    >
                                        <option value="nome">Nome</option>
                                        <option value="ramal">Ramal</option>
                                        <option value="departamento">Departamento</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        Ordem
                                    </label>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-secondary"
                                    >
                                        <option value="asc">Crescente</option>
                                        <option value="desc">Decrescente</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-6 lg:px-8 lg:py-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">
                                    Lista de Ramais
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Confira abaixo os contatos encontrados na pesquisa.
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#DDE7DD] bg-[#F7FAF7] px-3 py-2 text-xs font-medium text-gray-600">
                                <span
                                    className={`h-2.5 w-2.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-secondary"
                                        }`}
                                />
                                {loading ? "Carregando resultados..." : `${total} encontrados`}
                            </div>
                        </div>

                        {error ? (
                            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm">
                                <div className="font-semibold">Não foi possível carregar os ramais.</div>
                                <div className="mt-1">{error}</div>
                            </div>
                        ) : null}

                        {!loading && !error && rows.length === 0 ? (
                            <div className="mt-6 rounded-3xl border border-dashed border-[#D8E2D8] bg-[#FAFCFA] px-6 py-12 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                                    <FaPhone size={22} />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-800">
                                    Nenhum ramal encontrado
                                </h3>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                                    Tente pesquisar com menos palavras, apenas parte do nome,
                                    o setor, o login ou o número do ramal.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 overflow-hidden rounded-3xl border border-[#E7ECE7] bg-white shadow-sm">
                                <div className="overflow-auto">
                                    <table className="min-w-295 w-full text-sm">
                                        <thead className="bg-[#F6FAF6]">
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                <th className="px-4 py-4">Ramal</th>
                                                <th className="px-4 py-4">Nome</th>
                                                <th className="px-4 py-4">Departamento</th>
                                                <th className="px-4 py-4">E-mail</th>
                                                <th className="px-4 py-4">Login</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.map((r, index) => {
                                                const ramalValue = normalizeField(r.RAMAL);
                                                const nomeValue = normalizeField(r.NOME);
                                                const departamentoValue = normalizeField(r.DEPARTAMENTO);
                                                const emailValue = normalizeField(r.EMAIL);
                                                const loginValue = normalizeField(r.LOGIN);

                                                return (
                                                    <tr
                                                        key={String(r.ID)}
                                                        className={`border-t border-gray-100 transition hover:bg-[#F8FCF8] ${index % 2 === 0 ? "bg-white" : "bg-[#FCFDFC]"
                                                            }`}
                                                    >
                                                        <td className="px-4 py-4 align-middle">
                                                            <div className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-sm font-semibold text-secondary">
                                                                {isMissing(r.RAMAL) ? "Sem ramal" : ramalValue}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4 align-middle">
                                                            <div className="font-semibold text-gray-900">
                                                                {isMissing(r.NOME) ? "Sem nome" : nomeValue}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4 align-middle text-gray-700">
                                                            {isMissing(r.DEPARTAMENTO) ? (
                                                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                                                                    Sem departamento
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-full bg-[#EEF7EE] px-3 py-1 text-xs font-medium text-[#4D6B4D]">
                                                                    {departamentoValue}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 align-middle text-gray-700">
                                                            {isMissing(r.EMAIL) ? (
                                                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500">
                                                                    Sem e-mail
                                                                </span>
                                                            ) : (
                                                                <a
                                                                    className="font-medium text-secondary underline-offset-4 transition hover:underline"
                                                                    href={`mailto:${emailValue}`}
                                                                >
                                                                    {emailValue}
                                                                </a>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 align-middle text-gray-700">
                                                            {isMissing(r.LOGIN) ? (
                                                                <span className="text-gray-400">Sem login</span>
                                                            ) : (
                                                                <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                                                                    {loginValue}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#E8EDE8] bg-[#FAFCFA] px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                * Dados carregados do Oracle via intranet-api.
                            </span>
                            <span>
                                Utilize a busca para localizar contatos de forma mais rápida.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function useDebouncedValue<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);

    return debounced;
}