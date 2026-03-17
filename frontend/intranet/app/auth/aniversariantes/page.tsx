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
};

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

function normalizeItem(p: any): Aniversariante {
    //aceita tanto {nome,setor,ramal} quanto {NOME,SETOR,RAMAL}
    const nome = (p?.nome ?? p?.NOME ?? "").toString();
    const setor = (p?.setor ?? p?.SETOR ?? "").toString();
    const ramal = (p?.ramal ?? p?.RAMAL ?? "").toString();

    const diaRaw = p?.dia ?? p?.DIA ?? p?.DT_NASCIMENTO_DIA ?? null;
    const dia = Number(diaRaw);

    return {
        nome,
        setor,
        ramal,
        dia: Number.isFinite(dia) ? dia : undefined,
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
                .filter((x: Aniversariante) => x.nome?.trim());

            // ordena por dia (se existir), senão por nome
            normalized.sort((a: any, b: any) => {
                const ad = a.dia ?? 999;
                const bd = b.dia ?? 999;
                if (ad !== bd) return ad - bd;
                return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
            });

            setItems(normalized);
        } catch (e: any) {
            setErro(e?.message || "Erro ao carregar aniversariantes");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAniversariantes(mes);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mes]);

    const filtrados = useMemo(() => {
        const q = busca.trim().toLowerCase();
        if (!q) return items;

        return items.filter((p) => {
            const nome = (p.nome || "").toLowerCase();
            const setor = (p.setor || "").toLowerCase();
            const ramal = (p.ramal || "").toLowerCase();
            return nome.includes(q) || setor.includes(q) || ramal.includes(q);
        });
    }, [items, busca]);

    const mesLabel = useMemo(
        () => MESES_BR.find((m) => m.value === mes)?.label ?? `Mês ${mes}`,
        [mes]
    );

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <BackButton />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#C7D300] border-[#C7D300] border flex items-center justify-center text-emerald-700">
                            <FaBirthdayCake size={16} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold text-gray-900 truncate">
                                Aniversariantes
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Consulte os aniversariantes por mês e filtre por nome, setor ou
                                ramal.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-1">
                        <label className="block text-[11px] font-medium text-gray-500">
                            Mês
                        </label>
                        <select
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                            className="mt-1 w-60 max-w-full bg-transparent outline-none text-sm text-gray-900"
                        >
                            {MESES_BR.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-2">
                        <Search size={16} className="text-gray-400" />
                        <input
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por nome, setor, ramal..."
                            className="w-72 max-w-full text-sm outline-none bg-transparent"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FaBirthdayCake className="text-gray-700" />
                            <h2 className="text-base font-semibold text-gray-900">
                                Aniversariantes de {mesLabel}
                            </h2>
                        </div>
                        <span className="text-xs text-gray-500">
                            {loading ? "Carregando..." : `${filtrados.length} encontrado(s)`}
                        </span>
                    </div>

                    <div className="mt-4">
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
                                        className="h-16 rounded-xl border border-gray-200 bg-gray-50 animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : filtrados.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <FaBirthdayCake className="text-gray-300 mb-3" size={52} />
                                <p className="text-lg text-gray-600 font-medium">
                                    Nenhum aniversariante para este mês
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Tente outro mês ou ajuste a busca.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtrados.map((p, idx) => (
                                    <div
                                        key={`${p.nome}-${p.ramal}-${idx}`}
                                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3"
                                    >
                                        <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                                            {initialsFromName(p.nome)}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {p.nome}
                                                </p>
                                                {typeof p.dia === "number" && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-primary border border-primary/20">
                                                        Dia {pad2(p.dia)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 truncate">
                                                {p.setor || "—"}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500">Ramal</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {p.ramal || "—"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-base font-semibold text-gray-900">Resumo</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Visão rápida dos aniversariantes no mês selecionado.
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <MiniKpi title="Mês" value={mesLabel} />
                            <MiniKpi title="Total" value={String(items.length)} />
                        </div>

                        <button
                            onClick={() => fetchAniversariantes(mes)}
                            className="mt-4 w-full px-4 py-2 rounded-xl bg-secondary text-white text-md hover:bg-primary cursor-pointer"
                            disabled={loading}
                        >
                            {loading ? "Atualizando..." : "Atualizar"}
                        </button>

                        <div className="mt-4 text-xs text-gray-500">
                            * Dados retornados da API.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniKpi({ title, value }: { title: string; value: string }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-3">
            <p className="text-[11px] font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                {value}
            </p>
        </div>
    );
}