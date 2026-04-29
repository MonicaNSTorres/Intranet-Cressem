"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { FaBell, FaBoxes, FaCheckCircle, FaClock, FaExclamationTriangle, FaSyncAlt, FaTv } from "react-icons/fa";
import { buscarPainelGlpiEstoque } from "@/services/estoque_consumiveis.service";

export default function PainelGlpiEstoquePage() {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
    const [somAtivo, setSomAtivo] = useState(false);
    const [novoChamado, setNovoChamado] = useState(false);

    const idsAnterioresRef = useRef<Set<string>>(new Set<string>());
    const primeiraCargaRef = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const totalAbertos = items.length;

    const itemNaoCadastrado = useMemo(() => {
        return items.filter((item) => item.ST_SOLICITACAO === "ITEM_NAO_CADASTRADO").length;
    }, [items]);

    async function carregarPainel() {
        try {
            setLoading(true);

            const resp = await buscarPainelGlpiEstoque();
            const novosItems = Array.isArray(resp?.items) ? resp.items : [];

            const novosIds = new Set<string>(
                novosItems.map((item: any) => String(item.ID_CHAMADO_GLPI))
            );

            if (!primeiraCargaRef.current) {
                const chegouNovo = novosItems.some(
                    (item: any) => !idsAnterioresRef.current.has(String(item.ID_CHAMADO_GLPI))
                );

                if (chegouNovo) {
                    setNovoChamado(true);

                    if (somAtivo && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(() => null);
                    }

                    setTimeout(() => setNovoChamado(false), 8000);
                }
            }

            primeiraCargaRef.current = false;
            idsAnterioresRef.current = novosIds;

            setItems(novosItems);
            setUltimaAtualizacao(resp?.ultimaAtualizacao || new Date().toISOString());
        } catch (error) {
            console.error("Erro ao carregar painel GLPI:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarPainel();

        const interval = setInterval(() => {
            carregarPainel();
        }, 10000); //atualiza a cada 10 segundos

        return () => clearInterval(interval);
    }, [somAtivo]);

    function formatarData(value: string | null) {
        if (!value) return "-";

        try {
            return new Date(value).toLocaleString("pt-BR");
        } catch {
            return "-";
        }
    }

    function getStatusStyle(status: string) {
        if (status === "ABERTA") return "bg-emerald-100 text-emerald-700 border-emerald-200";
        if (status === "EM_ANALISE") return "bg-amber-100 text-amber-700 border-amber-200";
        if (status === "ITEM_NAO_CADASTRADO") return "bg-red-100 text-red-700 border-red-200";

        return "bg-slate-100 text-slate-700 border-slate-200";
    }

    return (
        <div className="min-h-screen bg-[#07111f] p-6 text-white">
            <audio ref={audioRef}>
                <source src="/sounds/notification.mp3" type="audio/mpeg" />
            </audio>

            <div className="mx-auto flex max-w-400 flex-col gap-6">
                <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,174,157,0.35),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(121,183,41,0.26),_transparent_34%)]" />

                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-5">
                            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-[#00AE9D] to-[#79B729] text-white shadow-xl shadow-[#00AE9D]/30">
                                <FaTv className="text-4xl" />
                            </div>

                            <div>
                                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#7fffe9]">
                                    Painel GLPI
                                </div>

                                <h1 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
                                    Chamados de Estoque
                                </h1>

                                <p className="mt-2 text-base text-slate-300">
                                    Monitoramento automático dos chamados abertos no GLPI para almoxarifado.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => setSomAtivo((prev) => !prev)}
                                className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${somAtivo
                                    ? "bg-[#00AE9D] text-white"
                                    : "border border-white/15 bg-white/10 text-white"
                                    }`}
                            >
                                <FaBell className="mr-2 inline" />
                                {somAtivo ? "Som ativado" : "Ativar som"}
                            </button>

                            <button
                                onClick={carregarPainel}
                                className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                            >
                                <FaSyncAlt className={loading ? "mr-2 inline animate-spin" : "mr-2 inline"} />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>

                {novoChamado && (
                    <div className="animate-pulse rounded-[28px] border border-amber-300 bg-amber-400 px-8 py-5 text-center text-3xl font-black text-amber-950 shadow-xl">
                        <FaBell className="mr-3 inline" />
                        Novo chamado recebido no GLPI!
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                                Chamados abertos
                            </p>
                            <FaBoxes className="text-[#7fffe9]" />
                        </div>
                        <h2 className="mt-4 text-6xl font-black">{totalAbertos}</h2>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                                Item não cadastrado
                            </p>
                            <FaExclamationTriangle className="text-red-300" />
                        </div>
                        <h2 className="mt-4 text-6xl font-black text-red-300">{itemNaoCadastrado}</h2>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                                Última atualização
                            </p>
                            <FaClock className="text-[#C7D300]" />
                        </div>
                        <h2 className="mt-4 text-2xl font-black">{formatarData(ultimaAtualizacao)}</h2>
                    </div>
                </div>

                <div className="rounded-[34px] border border-white/10 bg-white p-5 text-slate-900 shadow-2xl">
                    {loading && !items.length ? (
                        <div className="py-20 text-center text-xl font-bold text-slate-500">
                            Carregando chamados...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <FaCheckCircle className="text-4xl" />
                            </div>
                            <h2 className="mt-5 text-3xl font-black text-slate-800">
                                Nenhum chamado aberto no momento
                            </h2>
                            <p className="mt-2 text-slate-500">
                                O painel continuará monitorando automaticamente.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[26px] border border-slate-200">
                            <table className="min-w-full text-left">
                                <thead className="bg-slate-100">
                                    <tr className="text-sm uppercase tracking-[0.14em] text-slate-500">
                                        <th className="px-6 py-5">Chamado</th>
                                        <th className="px-6 py-5">Produto</th>
                                        <th className="px-6 py-5">Qtd.</th>
                                        <th className="px-6 py-5">Solicitante</th>
                                        <th className="px-6 py-5">Setor</th>
                                        <th className="px-6 py-5">Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.ID_SOLICITACAO} className="border-t border-slate-100">
                                            <td className="px-6 py-5 text-2xl font-black text-[#00AE9D]">
                                                #{item.ID_CHAMADO_GLPI}
                                            </td>

                                            <td className="px-6 py-5 text-xl font-bold text-slate-800">
                                                {item.NM_ITEM_SOLICITADO || "-"}
                                            </td>

                                            <td className="px-6 py-5 text-xl font-black">
                                                {item.QT_SOLICITADA || 0}
                                            </td>

                                            <td className="px-6 py-5 text-base font-semibold text-slate-700">
                                                {item.NM_SOLICITANTE || "-"}
                                            </td>

                                            <td className="px-6 py-5 text-base font-semibold text-slate-700">
                                                {item.NM_SETOR || "-"}
                                            </td>

                                            <td className="px-6 py-5">
                                                <span
                                                    className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${getStatusStyle(
                                                        item.ST_SOLICITACAO
                                                    )}`}
                                                >
                                                    {item.ST_SOLICITACAO === "ABERTA"
                                                        ? "Aberta"
                                                        : item.ST_SOLICITACAO === "EM_ANALISE"
                                                            ? "Pendente"
                                                            : "Item não cadastrado"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}