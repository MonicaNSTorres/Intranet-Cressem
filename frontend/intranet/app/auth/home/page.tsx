"use client";

import { FaBirthdayCake, FaUsers, FaUserTie, FaBuilding, FaPhoneAlt, FaArrowRight } from "react-icons/fa";
import HomeScreenSearch from "@/components/search-home/search-home";
import { SCREENS } from "@/config/screens";
import { useEffect, useState } from "react";
import { buscarAniversariantesHoje, buscarResumoKpis } from "@/services/home.service";
import UserInfo from "@/components/user-info/user-info";


export default function HomePage() {
    {/*const aniversariantesHojeMock = [
        { nome: "Ana Paula", setor: "RH", ramal: "214" },
        { nome: "Carlos Henrique", setor: "TI", ramal: "312" },
        { nome: "Mariana Souza", setor: "Atendimento", ramal: "198" },
    ];*/}

    const [aniversariantesHoje, setAniversariantesHoje] = useState<any[]>([]);

    const [kpis, setKpis] = useState({
        totalCooperados: "—",
        totalFuncionarios: "—",
        totalPAs: "—",
        totalRamal: "-"
    });

    useEffect(() => {
        const load = async () => {
            try {
                const data = await buscarResumoKpis();

                setKpis({
                    totalCooperados: Number(data.totalCooperados || 0).toLocaleString("pt-BR"),
                    totalFuncionarios: Number(data.totalFuncionarios || 0).toLocaleString("pt-BR"),
                    totalPAs: Number(data.totalPAs || 0).toLocaleString("pt-BR"),
                    totalRamal: Number(data.totalRamal || 0).toLocaleString("pt-BR"),
                });
            } catch {
                setKpis({ totalCooperados: "0", totalFuncionarios: "0", totalPAs: "0", totalRamal: "0" });
            }
        };

        load();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await buscarAniversariantesHoje();

                const lista = Array.isArray(data.data) ? data.data : [];

                setAniversariantesHoje(
                    lista.map((p: any) => ({
                        nome: p.nome ?? p.NOME ?? "",
                        setor: p.setor ?? p.SETOR ?? "",
                        ramal: p.ramal ?? p.RAMAL ?? "",
                    }))
                );
            } catch (err) {
                console.error("Erro ao carregar aniversariantes", err);
                setAniversariantesHoje([]);
            }
        };

        load();
    }, []);

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-4 mb-10 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Intranet (Protótipo)</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Central de acesso rápido aos módulos.
                    </p>
                </div>

                <UserInfo />

                {/*<div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50">
                        Ver comunicados
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-primary text-white shadow-sm hover:opacity-95">
                        Novo contato
                    </button>
                </div>*/}
            </div>

            <HomeScreenSearch screens={SCREENS} />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/*<KpiCard title="Solicitações em aberto" value="8" hint="despesas/viagens, marketing, etc." />*/}
                <KpiCard
                    title="Total de Cooperados"
                    value={kpis.totalCooperados}
                    hint="último mês"
                    icon={<FaUsers className="h-6 w-6 text-secondary group-hover:text-white" />}
                />
                <KpiCard
                    title="Quantidade de Funcionários"
                    value={kpis.totalFuncionarios}
                    hint="último mês"
                    icon={<FaUserTie className="h-6 w-6 text-secondary group-hover:text-white" />}
                />
                <KpiCard
                    title="Quantidade de PA's"
                    value={kpis.totalPAs}
                    hint="último mês"
                    icon={<FaBuilding className="h-6 w-6 text-secondary group-hover:text-white" />}
                />
                {/*<KpiCard title="Formulários mais usados" value="12" hint="cadastro/RH/empréstimos" />*/}
                <KpiCard
                    title="Ramais cadastrados"
                    value={kpis.totalRamal}
                    hint="últimos 7 dias"
                    icon={<FaPhoneAlt className="h-6 w-6 text-secondary group-hover:text-white" />}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">Acesso rápido</h2>
                        <span className="text-xs text-gray-500">telas</span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <QuickAction title="Ramal" desc="Consultar ramais internos." href="/auth/ramais" badge="rápido" />
                        <QuickAction title="Aniversariantes" desc="Ver aniversariantes do dia." href="/auth/aniversariantes" />
                        <QuickAction title="Despesas/Viagens" desc="Solicitar ou gerenciar reembolsos." href="/auth/cadastro_reembolso_despesa" />
                        <QuickAction title="Gerenciador de Arquivos" desc="Marca d’água, converter e juntar PDF." href="/auth/conversor_arquivos" />
                        <QuickAction title="Convênios" desc="Consulta e gerenciamento." href="/auth/gerenciamento_convenio_odonto" />
                        {/*<QuickAction title="Relação de Faturamento" desc="Acesso ao relatório." href="/auth/relacao_faturamento" />*/}
                        <QuickAction title="Ficha de Desimpedimento" desc="Cadastrar e consultar." href="/auth/ficha_desimpedimento" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                            <FaBirthdayCake size={16} />
                            <h2 className="text-base font-semibold text-gray-900">Aniversariantes do dia</h2>
                            <a
                                href="/auth/aniversariantes"
                                className="text-xs text-secondary hover:underline"
                            >
                                Ver todos
                            </a>
                        </div>

                        <div className="mt-4 space-y-3">
                            {aniversariantesHoje.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <FaBirthdayCake className="text-gray-300 mb-2" size={45} />
                                    <p className="text-lg text-gray-500 font-medium">
                                        Nenhum aniversariante hoje 🎉
                                    </p>
                                    <p className="text-md text-gray-400">
                                        Volte amanhã para conferir!
                                    </p>
                                </div>
                            ) : (
                                aniversariantesHoje.map((p) => (
                                    <div
                                        key={p.nome}
                                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                                            {String(p.nome || "")
                                                .trim()
                                                .split(" ")
                                                .filter(Boolean)
                                                .slice(0, 2)
                                                .map((x: string) => x[0])
                                                .join("")
                                                .toUpperCase()}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{p.nome}</p>
                                            <p className="text-xs text-gray-600 truncate">{p.setor}</p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500">Ramal</p>
                                            <p className="text-sm font-semibold text-gray-900">{p.ramal}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Atividades */}
                    {/*<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900">Atividades recentes</h2>

            <ul className="mt-4 space-y-3">
              <ActivityItem title="Solicitação criada" meta="Hoje • Despesas/Viagens" />
              <ActivityItem title="Documento atualizado" meta="Ontem • Procedimento interno" />
              <ActivityItem title="Convênio consultado" meta="Ontem • Odonto" />
              <ActivityItem title="Ramal acessado" meta="Ontem • Unidade Centro" />
            </ul>

            <button className="mt-4 w-full px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-95">
              Ver tudo
            </button>
          </div>*/}
                </div>
            </div>

            <div className="mt-8 text-xs text-gray-500">
                * Dados reais — integrados ao backend via API.
            </div>
        </div>
    );
}

function KpiCard({
    title,
    value,
    hint,
    icon,
}: {
    title: string;
    value: string;
    hint: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:bg-secondary">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-third/50 transition group-hover:border-white/30 group-hover:bg-white/20">
                    {icon}
                </div>

                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-600 transition group-hover:text-white">
                        {title}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900 transition group-hover:text-white">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 transition group-hover:text-white/90">
                        {hint}
                    </p>
                </div>
            </div>
        </div>
    );
}

function QuickAction({
    title,
    desc,
    href,
    badge,
}: {
    title: string;
    desc: string;
    href: string;
    badge?: string;
}) {
    return (
        <a
            href={href}
            className="group block rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-secondary/20 hover:shadow-sm transition p-4"
        >
            <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                {badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-primary border border-primary/20">
                        {badge}
                    </span>
                )}
            </div>
            <p className="mt-2 text-xs text-gray-600">{desc}</p>
            <p className="mt-3 text-xs text-gray-500 group-hover:text-gray-700 flex items-center gap-1">
                Abrir <FaArrowRight className="text-xs" />
            </p>
        </a>
    );
}

function ActivityItem({ title, meta }: { title: string; meta: string }) {
    return (
        <li className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary/70" />
            <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{title}</p>
                <p className="text-xs text-gray-500 truncate">{meta}</p>
            </div>
        </li>
    );
}