"use client";

import { useEffect, useMemo, useState } from "react";
import { FaBirthdayCake } from "react-icons/fa";
import { Search } from "lucide-react";
import BackButton from "@/components/back-button/back-button";
import { buscarAniversariantesPorMes } from "@/services/aniversariante.service";
import { MESES_BR } from "@/constants/date";

type Aniversariante = {
    nome: string;
    setor: string;
    ramal: string;
    dia?: number;
    mes?: number;
};

type AniversarianteRaw = Partial<{
    nome: string | number;
    NOME: string | number;
    setor: string | number;
    SETOR: string | number;
    ramal: string | number;
    RAMAL: string | number;
    dia: string | number;
    DIA: string | number;
    DT_NASCIMENTO_DIA: string | number;
    mes: string | number;
    MES: string | number;
    DT_NASCIMENTO_MES: string | number;
}>;

function normalizeSearch(value: string) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function isUsuarioOculto(value?: string) {
    const nome = normalizeSearch(value || "");
    return nome === "externo" || nome === "sala ti" || nome === "monica teste";
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function initialsFromName(nome: string) {
    const clean = String(nome || "").trim();
    if (!clean) return "??";
    const parts = clean.split(" ").filter(Boolean);
    const ini = parts
        .slice(0, 2)
        .map((p) => p[0])
        .join("");
    return (ini || clean[0] || "?").toUpperCase();
}

function normalizeItem(p: AniversarianteRaw): Aniversariante {
    const nome = (p?.nome ?? p?.NOME ?? "").toString();
    const setor = (p?.setor ?? p?.SETOR ?? "").toString();
    const ramal = (p?.ramal ?? p?.RAMAL ?? "").toString();

    const diaRaw = p?.dia ?? p?.DIA ?? p?.DT_NASCIMENTO_DIA ?? null;
    const mesRaw = p?.mes ?? p?.MES ?? p?.DT_NASCIMENTO_MES ?? null;

    const dia = Number(diaRaw);
    const mes = Number(mesRaw);

    return {
        nome,
        setor,
        ramal,
        dia: Number.isFinite(dia) ? dia : undefined,
        mes: Number.isFinite(mes) ? mes : undefined,
    };
}

export default function AniversariantesPage() {
    const now = useMemo(() => new Date(), []);
    const mesAtual = now.getMonth() + 1;

    const [mes, setMes] = useState<number>(mesAtual);
    const [busca, setBusca] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [erro, setErro] = useState<string | null>(null);
    const [items, setItems] = useState<Aniversariante[]>([]);

    async function fetchAniversariantes(mesSelecionado: number) {
        setLoading(true);
        setErro(null);

        try {
            const data = await buscarAniversariantesPorMes(mesSelecionado);

            const lista = Array.isArray(data?.data) ? data.data : [];

            const normalized = lista
                .map(normalizeItem)
                .filter(
                    (x: Aniversariante) =>
                        x.nome?.trim() &&
                        !isUsuarioOculto(x.nome) &&
                        !isUsuarioOculto(x.setor)
                );

            // ordena por dia (se existir), senão por nome
            normalized.sort((a: Aniversariante, b: Aniversariante) => {
                const ad = a.dia ?? 999;
                const bd = b.dia ?? 999;
                if (ad !== bd) return ad - bd;
                return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
            });

            setItems(normalized);
        } catch (e: unknown) {
            setErro(e instanceof Error ? e.message : "Erro ao carregar aniversariantes");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTodosAniversariantes() {
        setLoading(true);
        setErro(null);

        try {
            const resultados = await Promise.all(
                MESES_BR.map((m) => buscarAniversariantesPorMes(m.value))
            );

            const lista = resultados.flatMap((res) =>
                Array.isArray(res?.data) ? res.data : []
            );

            const normalized = lista
                .map(normalizeItem)
                .filter(
                    (x: Aniversariante) =>
                        x.nome?.trim() &&
                        !isUsuarioOculto(x.nome) &&
                        !isUsuarioOculto(x.setor)
                );

            normalized.sort((a: Aniversariante, b: Aniversariante) => {
                const ad = a.dia ?? 999;
                const bd = b.dia ?? 999;
                if (ad !== bd) return ad - bd;
                return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
            });

            setItems(normalized);
        } catch (e: unknown) {
            setErro(e instanceof Error ? e.message : "Erro ao carregar aniversariantes");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (busca.trim()) {
            fetchTodosAniversariantes();
            return;
        }

        fetchAniversariantes(mes);

    }, [mes, busca]);

    const filtrados = useMemo(() => {
        const q = normalizeSearch(busca);

        if (!q) return items;

        return items.filter((p) => {
            const nome = normalizeSearch(p.nome);
            const setor = normalizeSearch(p.setor);
            const ramal = normalizeSearch(p.ramal);

            return nome.includes(q) || setor.includes(q) || ramal.includes(q);
        });
    }, [items, busca]);


    const mesLabel = useMemo(
        () => MESES_BR.find((m) => m.value === mes)?.label ?? `Mês ${mes}`,
        [mes]
    );

    return (
        <div className="p-5 lg:p-8">
            <div className="mb-6">
                <div className="mb-4">
                    <BackButton />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-third text-primary shadow-sm">
                        <FaBirthdayCake size={22} />
                    </div>

                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-bold text-[var(--title)]">
                            Aniversariantes
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm text-[var(--paragraph)]">
                            Consulte os aniversariantes por mês e filtre por nome, setor ou ramal.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                    <div>
                        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.04em] text-slate-600">
                            Mês
                        </label>
                        <select
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
                        >
                            {MESES_BR.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.04em] text-slate-600">
                            Pesquisa
                        </label>
                        <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition hover:border-slate-300 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                            <Search size={16} className="text-primary" />
                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por nome, setor, ramal..."
                                className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <FaBirthdayCake />
                            </div>
                            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
                                Aniversariantes
                            </h2>
                        </div>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            {loading ? "Carregando..." : `${filtrados.length} encontrado(s)`}
                        </span>
                    </div>

                    <div className="p-5">
                        {erro ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                <p className="text-sm font-semibold text-red-700">
                                    Não foi possível carregar.
                                </p>
                                <p className="text-sm text-red-700/80 mt-1">{erro}</p>
                            </div>
                        ) : loading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                                    />
                                ))}
                            </div>
                        ) : filtrados.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <FaBirthdayCake className="mb-3 text-slate-300" size={52} />
                                <p className="text-lg font-semibold text-slate-600">
                                    Nenhum aniversariante para este mês
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                    Tente outro mês ou ajuste a busca.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtrados.map((p, idx) => {

                                    const ramal = String(p.ramal || "").trim();
                                    const semRamal = !ramal || ramal === "0";

                                    return (

                                        <div
                                            key={`${p.nome}-${p.ramal}-${idx}`}
                                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm">

                                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary">
                                                {initialsFromName(p.nome)}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-bold text-slate-950">{p.nome}</p>

                                                </div>
                                                <p className="truncate text-xs font-medium text-slate-600">
                                                    {p.setor || "—"}
                                                </p>
                                            </div>

                                            <div className="flex w-[220px] shrink-0 flex-col items-end gap-2">
                                                <span className="inline-flex w-[100px] justify-center rounded-full bg-primary px-3 py-1 text-sm font-bold leading-none text-white">
                                                    Data{" "}
                                                    {typeof p.dia === "number" && typeof p.mes === "number"
                                                        ? `${pad2(p.dia)}/${pad2(p.mes)}`
                                                        : "--/--"}
                                                </span>

                                                <span
                                                    className={`inline-flex w-[100px] justify-center rounded-full px-3 py-1 text-sm font-semibold leading-none ${semRamal
                                                        ? "border border-fourth/20 bg-fourth/10 text-fourth"
                                                        : "border border-secondary/20 bg-secondary/10 text-[#4f7f14]"
                                                        }`}
                                                >
                                                    {semRamal ? "Sem ramal" : `Ramal ${ramal}`}
                                                </span>

                                            </div>
                                        </div>
                                    )
                                }
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div>
                        <h3 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">Resumo</h3>
                        <p className="mt-1 text-sm text-[var(--paragraph)]">
                            Visão rápida dos aniversariantes no mês selecionado.
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <MiniKpi title="Mês" value={mesLabel} />
                            <MiniKpi title="Total" value={String(items.length)} />
                        </div>

                        <button
                            onClick={() => fetchAniversariantes(mes)}
                            className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={loading}
                        >
                            {loading ? "Atualizando..." : "Atualizar"}
                        </button>

                        <div className="mt-4 text-xs font-medium text-slate-500">
                            * Dados retornados da API.
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

function MiniKpi({ title, value }: { title: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">{title}</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--title)]">
                {value}
            </p>
        </div>
    );
}
