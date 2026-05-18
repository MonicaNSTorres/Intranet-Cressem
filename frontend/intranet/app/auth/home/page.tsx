"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FaArrowRight,
    FaBirthdayCake,
    FaBell,
    FaFileInvoiceDollar,
    FaFolderOpen,
    FaHandshake,
    FaHistory,
    FaPhoneAlt,
    FaShieldAlt,
    FaStar,
    FaBolt,
    FaCheckCircle,
    FaEye,
    FaMapSigns,
    FaDesktop
} from "react-icons/fa";
import HomeScreenSearch from "@/components/search-home/search-home";
import { SCREENS } from "@/config/screens";
import { buscarAniversariantesHoje } from "@/services/home.service";
import { buscarAcessosSemana } from "@/services/dashboard.service";
import UserInfo from "@/components/user-info/user-info";
import {
    buscarPopupPendenteMe,
    responderPopupAviso,
    type PopupAviso,
} from "@/services/popup_aviso.service";
import { getMeAdUser } from "@/services/auth.service";
import { filterScreensByGroups } from "@/utils/permissions";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

type Aniversariante = {
    nome: string;
    setor: string;
    ramal: string;
};

type QuickAccessItem = {
    title: string;
    desc: string;
    href: string;
    icon: React.ReactNode;
    badge?: string;
};

type PopupAvisoComImagem = PopupAviso & {
    IMAGEM_BASE64?: string | null;
};

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

export default function HomePage() {
    const [aniversariantesHoje, setAniversariantesHoje] = useState<Aniversariante[]>([]);
    const [popupHome, setPopupHome] = useState<PopupAvisoComImagem | null>(null);
    const [ultimoPopupRespondido, setUltimoPopupRespondido] = useState<PopupAvisoComImagem | null>(null);
    const [loadingPopupHome, setLoadingPopupHome] = useState(true);
    const [submittingPopupHome, setSubmittingPopupHome] = useState(false);
    const [statusResposta, setStatusResposta] = useState<"PENDENTE" | "ACEITO" | "RECUSADO">("PENDENTE");
    const [modalPopupAberta, setModalPopupAberta] = useState(false);
    const [userGroups, setUserGroups] = useState<string[]>([]);
    const [erroPopup, setErroPopup] = useState("");
    const [modalErroAberta, setModalErroAberta] = useState(false);

    const popupConteudo = popupHome ?? ultimoPopupRespondido;

    const imagemValidaPopupHome = useMemo(() => {
        const popup = popupConteudo as PopupAvisoComImagem | null;

        if (!popup?.IMAGEM_BASE64) return "";

        return String(popup.IMAGEM_BASE64).trim();
    }, [popupConteudo]);

    const [acessosDiarios, setAcessosDiarios] = useState<
        { dia: string; acessos: number }[]
    >([]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await buscarAniversariantesHoje();
                const lista = Array.isArray(data?.data) ? data.data : [];

                setAniversariantesHoje(
                    lista
                        .map((p: any) => ({
                            nome: p.nome ?? p.NOME ?? "",
                            setor: p.setor ?? p.SETOR ?? "",
                            ramal: p.ramal ?? p.RAMAL ?? "",
                        }))
                        .filter(
                            (p: Aniversariante) =>
                                !isUsuarioOculto(p.nome) &&
                                !isUsuarioOculto(p.setor)
                        )
                );
            } catch (err) {
                console.error("Erro ao carregar aniversariantes", err);
                setAniversariantesHoje([]);
            }
        };

        load();
    }, []);

    useEffect(() => {
        async function loadUserGroups() {
            try {
                const me = await getMeAdUser();
                setUserGroups(Array.isArray(me?.grupos) ? me.grupos : []);
            } catch (error) {
                console.error("Erro ao carregar grupos do usuário:", error);
                setUserGroups([]);
            }
        }

        loadUserGroups();
    }, []);

    useEffect(() => {
        async function loadPopupHome() {
            try {
                setLoadingPopupHome(true);

                const data = await buscarPopupPendenteMe();

                if (data.temPopupPendente && data.popup) {
                    setPopupHome(data.popup);
                    setStatusResposta("PENDENTE");
                } else {
                    setPopupHome(null);
                }
            } catch (error) {
                console.error("Erro ao carregar popup da home:", error);
                setPopupHome(null);
            } finally {
                setLoadingPopupHome(false);
            }
        }

        loadPopupHome();
    }, []);

    useEffect(() => {
        async function loadAcessos() {
            try {
                const data = await buscarAcessosSemana();

                setAcessosDiarios(data);
            } catch (error) {
                console.error(
                    "Erro ao carregar acessos:",
                    error
                );
            }
        }

        loadAcessos();

        const interval = setInterval(() => {
            loadAcessos();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    async function handleResponderPopupHome(resposta: "ACEITO" | "RECUSADO") {
        if (!popupHome) return;

        try {
            setSubmittingPopupHome(true);

            await responderPopupAviso({
                idPopup: popupHome.ID_POPUP,
                resposta,
            });

            setUltimoPopupRespondido(popupHome);
            setStatusResposta(resposta);
            setPopupHome(null);
        } catch (error: any) {
            console.error("Erro ao responder popup da home:", error);

            const mensagem =
                error?.response?.data?.details || "";

            if (mensagem.includes("ORA-00001")) {
                alert("Você já respondeu este comunicado anteriormente.");
                return;
            }

            alert("Não foi possível registrar sua resposta.");
        } finally {
            setSubmittingPopupHome(false);
        }
    }

    const acoesPrincipais = useMemo<QuickAccessItem[]>(
        () => [
            {
                title: "Solicitar reembolso",
                desc: "Abra ou acompanhe solicitações de despesas e viagens.",
                href: "/auth/cadastro_reembolso_despesa",
                icon: <FaFileInvoiceDollar className="h-5 w-5" />,
                badge: "mais usado",
            },
            {
                title: "Consultar telas",
                desc: "Encontre rapidamente todas as telas da intranet em um só lugar.",
                href: "/auth/links_uteis",
                icon: <FaDesktop className="h-5 w-5" />,
            },
            {
                title: "Gerenciar arquivos",
                desc: "Converter, juntar PDFs e aplicar marca d’água.",
                href: "/auth/conversor_arquivos",
                icon: <FaFolderOpen className="h-5 w-5" />,
            },
            {
                title: "Consultar convênios",
                desc: "Acesse as opções de convênio e gerenciamento disponível.",
                href: "/auth/gerenciamento_convenio_odonto",
                icon: <FaHandshake className="h-5 w-5" />,
            },
        ],
        []
    );

    const acessosRapidos = useMemo<QuickAccessItem[]>(
        () => [
            {
                title: "Telas intranet",
                desc: "Veja todas as telas e acesse.",
                href: "/auth/links_uteis",
                icon: <FaMapSigns className="h-5 w-5" />,
                badge: "rápido",
            },
            {
                title: "Aniversariantes",
                desc: "Consulte aniversariantes do dia e do mês.",
                href: "/auth/aniversariantes",
                icon: <FaBirthdayCake className="h-5 w-5" />,
            },
            {
                title: "Reembolso",
                desc: "Solicite, acompanhe ou gerencie reembolsos.",
                href: "/auth/cadastro_reembolso_despesa",
                icon: <FaFileInvoiceDollar className="h-5 w-5" />,
            },
            {
                title: "Arquivos PDF",
                desc: "Ferramentas rápidas para documentos.",
                href: "/auth/conversor_arquivos",
                icon: <FaFolderOpen className="h-5 w-5" />,
            },
            {
                title: "Convênios",
                desc: "Consulta e gerenciamento de convênios.",
                href: "/auth/gerenciamento_convenio_odonto",
                icon: <FaHandshake className="h-5 w-5" />,
            },
            {
                title: "Ramal",
                desc: "Localize contatos internos com rapidez.",
                href: "/auth/ramais",
                icon: <FaPhoneAlt className="h-5 w-5" />,
            },
        ],
        []
    );

    {/*const ultimosAcessos = [
        {
            title: "Reembolso de despesas",
            icon: <FaHistory className="h-4 w-4" />,
            href: "/auth/cadastro_reembolso_despesa",
        },
        {
            title: "Consulta de ramais",
            icon: <FaHistory className="h-4 w-4" />,
            href: "/auth/ramais",
        },
        {
            title: "Convênios odontológicos",
            icon: <FaHistory className="h-4 w-4" />,
            href: "/auth/gerenciamento_convenio_odonto",
        },
    ];*/}

    {/*const acessosDiarios = [
        { dia: "Seg", acessos: 118 },
        { dia: "Ter", acessos: 164 },
        { dia: "Qua", acessos: 142 },
        { dia: "Qui", acessos: 198 },
        { dia: "Sex", acessos: 176 },
        { dia: "Sáb", acessos: 72 },
        { dia: "Dom", acessos: 54 },
    ];*/}

    const screensPermitidas = useMemo(() => {
        return filterScreensByGroups(SCREENS, userGroups);
    }, [userGroups]);

    const totalSemanal = acessosDiarios.reduce(
        (acc, item) => acc + item.acessos,
        0
    );

    const picoDiario = acessosDiarios.length
        ? Math.max(...acessosDiarios.map((item) => item.acessos))
        : 0;

    const mediaDiaria = acessosDiarios.length
        ? Math.round(totalSemanal / acessosDiarios.length)
        : 0;


    return (
        <div className="min-h-full bg-linear-to-b from-white via-white to-[#F6FBFA] p-6 lg:p-8">
            <div className="mx-auto w-full min-w-225 space-y-6">
                <section className="mb-2">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-[var(--title)]">Intranet</h1>
                            <p className="mt-1 text-sm text-[var(--paragraph)]">
                                Central de acesso rápido aos módulos.
                            </p>
                        </div>

                        <UserInfo />
                    </div>

                    {/*<div className="relative mt-5 overflow-hidden rounded-[28px] border border-[#00AE9D]/10 bg-white shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,174,157,0.10)_0%,rgba(121,183,41,0.10)_45%,rgba(199,211,0,0.10)_100%)]" />
                        <div className="relative flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-8">
                            <div className="max-w-3xl">
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00AE9D]/15 bg-[#00AE9D]/8 px-3 py-1 text-xs font-semibold text-[#00AE9D]">
                                    <FaBolt className="h-3.5 w-3.5" />
                                    Central de acesso da intranet
                                </div>

                                <h1 className="text-3xl font-semibold tracking-tight text-[var(--title)] lg:text-4xl">
                                    Tudo o que você precisa, em um só lugar.
                                </h1>

                                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--paragraph)] lg:text-base">
                                    Encontre sistemas, abra solicitações, consulte ramais, acompanhe avisos
                                    importantes e acesse rapidamente as ferramentas mais usadas no seu dia a dia.
                                </p>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <BadgeInfo
                                        icon={<FaBell className="h-3.5 w-3.5" />}
                                        label="Avisos importantes"
                                    />
                                    <BadgeInfo
                                        icon={<FaCheckCircle className="h-3.5 w-3.5" />}
                                        label="Ações rápidas"
                                    />
                                    <BadgeInfo
                                        icon={<FaBirthdayCake className="h-3.5 w-3.5" />}
                                        label="Aniversariantes"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>*/}
                </section>

                <section>
                    <HomeScreenSearch screens={screensPermitidas} />
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="xl:col-span-2 space-y-6">
                        <div className="overflow-hidden rounded-[28px] border border-[#79B729]/15 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                            <div className="border-b border-[#EAECF0] bg-[linear-gradient(135deg,rgba(121,183,41,0.10)_0%,rgba(199,211,0,0.10)_100%)] px-6 py-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#79B729] text-white shadow-sm">
                                            <FaBell className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-[var(--title)]">
                                                Aviso com ciência do usuário
                                            </h2>
                                            <p className="mt-1 text-sm text-[var(--paragraph)]">
                                                Destaque aqui os comunicados que exigem leitura e confirmação.
                                            </p>
                                        </div>
                                    </div>

                                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#79B729]/20 bg-white px-3 py-1 text-xs font-semibold text-[#79B729]">
                                        <FaShieldAlt className="h-3.5 w-3.5" />
                                        Requer ação
                                    </span>
                                </div>
                            </div>

                            <div className="px-6 py-6">
                                <div className="rounded-3xl border border-[#79B729]/15 bg-[#F8FFF1] p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex-1">
                                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#79B729]/10 px-3 py-1 text-xs font-semibold text-[#79B729]">
                                                <FaBell className="h-3.5 w-3.5" />
                                                Comunicado em destaque
                                            </div>

                                            <h3 className="text-lg font-semibold text-[var(--title)]">
                                                {loadingPopupHome
                                                    ? "Carregando comunicado..."
                                                    : popupConteudo?.TITULO || "Nenhum comunicado pendente"}
                                            </h3>

                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--paragraph)]">
                                                {loadingPopupHome
                                                    ? "Buscando informações do aviso..."
                                                    : popupConteudo?.MENSAGEM ||
                                                    "No momento, não há comunicados pendentes para ciência."}
                                            </p>

                                            {popupConteudo && (
                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    {popupHome && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResponderPopupHome("ACEITO")}
                                                            disabled={submittingPopupHome}
                                                            className="inline-flex items-center gap-2 rounded-2xl bg-[#00AE9D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <FaCheckCircle className="h-4 w-4" />
                                                            {popupHome.BOTAO_ACEITAR || "Li e estou ciente"}
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => setModalPopupAberta(true)}
                                                        className="inline-flex items-center gap-2 rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm font-semibold text-[var(--title)] transition hover:border-[#00AE9D]/30 hover:bg-[#00AE9D]/5"
                                                    >
                                                        <FaEye className="h-4 w-4" />
                                                        Ler comunicado
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-55 rounded-[22px] border border-white bg-white p-4 shadow-sm">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                                Status sugerido
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-[var(--title)]">
                                                {loadingPopupHome
                                                    ? "Carregando..."
                                                    : statusResposta === "ACEITO"
                                                        ? "Você aceitou o comunicado"
                                                        : statusResposta === "RECUSADO"
                                                            ? "Você recusou o comunicado"
                                                            : popupHome
                                                                ? "Aguardando ciência"
                                                                : "Sem pendência"}
                                            </p>
                                            <p className="mt-2 text-xs leading-5 text-[var(--paragraph)]">
                                                {loadingPopupHome
                                                    ? "Buscando status do comunicado."
                                                    : statusResposta === "ACEITO"
                                                        ? "Sua resposta de aceite foi registrada com sucesso."
                                                        : statusResposta === "RECUSADO"
                                                            ? "Sua resposta de recusa foi registrada com sucesso."
                                                            : popupHome
                                                                ? "Há um comunicado pendente de resposta para este usuário."
                                                                : "Não há comunicado pendente no momento."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-[#00AE9D]/10 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                            <div className="border-b border-[#EAECF0] px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00AE9D] text-white">
                                        <FaBolt className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--title)]">
                                            O que você pode fazer agora
                                        </h2>
                                        <p className="text-sm text-[var(--paragraph)]">
                                            Atalhos pensados para facilitar o uso da intranet.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                                {acoesPrincipais.map((item) => (
                                    <ActionHighlightCard key={item.title} {...item} />
                                ))}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-[#49479D]/10 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                            <div className="border-b border-[#EAECF0] px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#49479D] text-white">
                                        <FaStar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--title)]">
                                            Acesso rápido
                                        </h2>
                                        <p className="text-sm text-[var(--paragraph)]">
                                            Entradas principais da intranet para navegação mais ágil.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
                                {acessosRapidos.map((item) => (
                                    <QuickAccessCard key={item.title} {...item} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="overflow-hidden rounded-[28px] border border-[#C7D300]/20 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                            <div className="border-b border-[#EAECF0] bg-[linear-gradient(135deg,rgba(199,211,0,0.12)_0%,rgba(121,183,41,0.10)_100%)] px-6 py-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C7D300] text-[#3B3B3B]">
                                            <FaBirthdayCake className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-[var(--title)]">
                                                Aniversariantes do dia
                                            </h2>
                                            <p className="text-sm text-[var(--paragraph)]">
                                                Confira quem está comemorando hoje.
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href="/auth/aniversariantes"
                                        className="text-sm font-semibold text-[#00AE9D] transition hover:opacity-80"
                                    >
                                        Ver todos
                                    </Link>
                                </div>
                            </div>

                            <div className="p-6">
                                {aniversariantesHoje.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-4 py-10 text-center">
                                        <FaBirthdayCake className="mb-3 h-12 w-12 text-[#C7D300]" />
                                        <p className="text-base font-semibold text-[var(--title)]">
                                            Nenhum aniversariante hoje
                                        </p>
                                        <p className="mt-1 text-sm text-[var(--paragraph)]">
                                            Volte amanhã para conferir os próximos aniversariantes.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {aniversariantesHoje.map((p) => (
                                            <div
                                                key={`${p.nome}-${p.ramal}`}
                                                className="flex items-center gap-3 rounded-[22px] border border-[#EAECF0] bg-[#FCFCFD] p-4 transition hover:border-[#00AE9D]/20 hover:bg-[#F6FFFE]"
                                            >
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00AE9D]/10 text-sm font-semibold text-[#00AE9D]">
                                                    {String(p.nome || "")
                                                        .trim()
                                                        .split(" ")
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .map((x) => x[0])
                                                        .join("")
                                                        .toUpperCase()}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-[var(--title)]">
                                                        {p.nome}
                                                    </p>
                                                    <p className="truncate text-xs text-[var(--paragraph)]">
                                                        {p.setor || "Setor não informado"}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-[#00AE9D]/8 px-3 py-2 text-right">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#00AE9D]">
                                                        Ramal
                                                    </p>
                                                    <p className="text-sm font-semibold text-[var(--title)]">
                                                        {p.ramal || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/*<div className="overflow-hidden rounded-[28px] border border-[#00AE9D]/10 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                            <div className="border-b border-[#EAECF0] px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                                        <FaHistory className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-[var(--title)]">
                                            Últimos acessos
                                        </h2>
                                        <p className="text-sm text-[var(--paragraph)]">
                                            Sugestão visual para retomar páginas importantes.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="space-y-2">
                                    {ultimosAcessos.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-[#00AE9D]/15 hover:bg-[#00AE9D]/5"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#00AE9D]">
                                                {item.icon}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-[var(--title)]">
                                                    {item.title}
                                                </p>
                                            </div>
                                            <FaArrowRight className="h-3.5 w-3.5 text-[#98A2B3]" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>*/}

                        <div className="overflow-hidden rounded-[28px] border border-[#00AE9D]/10 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                            <div className="border-b border-[#EAECF0] px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                                        <FaHistory className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <h2 className="text-base font-semibold text-[var(--title)]">
                                            Acessos diários na intranet
                                        </h2>

                                        <p className="text-sm text-[var(--paragraph)]">
                                            Visualização simples da quantidade de acessos por dia.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="mb-4 grid grid-cols-3 gap-3">
                                    <div className="rounded-2xl bg-[#00AE9D]/6 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Total semanal
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-[var(--title)]">
                                            {totalSemanal}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-[#79B729]/8 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Pico diário
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-[var(--title)]">
                                            {picoDiario}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-[#49479D]/8 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-darken)]">
                                            Média diária
                                        </p>

                                        <p className="mt-2 text-2xl font-semibold text-[var(--title)]">
                                            {mediaDiaria}
                                        </p>
                                    </div>
                                </div>

                                <div className="h-[280px] w-full rounded-3xl border border-[#EAECF0] bg-[linear-gradient(180deg,#F8FFFE_0%,#FFFFFF_100%)] p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={acessosDiarios}
                                            margin={{
                                                top: 10,
                                                right: 10,
                                                left: -20,
                                                bottom: 0,
                                            }}
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="colorAcessos"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="0%"
                                                        stopColor="#00AE9D"
                                                        stopOpacity={0.35}
                                                    />

                                                    <stop
                                                        offset="100%"
                                                        stopColor="#00AE9D"
                                                        stopOpacity={0.03}
                                                    />
                                                </linearGradient>
                                            </defs>

                                            <CartesianGrid
                                                strokeDasharray="4 4"
                                                stroke="#E4E7EC"
                                                vertical={false}
                                            />

                                            <XAxis
                                                dataKey="dia"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{
                                                    fill: "#68727D",
                                                    fontSize: 12,
                                                }}
                                            />

                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{
                                                    fill: "#68727D",
                                                    fontSize: 12,
                                                }}
                                            />

                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: 16,
                                                    border: "1px solid #E4E7EC",
                                                    boxShadow:
                                                        "0 10px 30px rgba(16,24,40,0.08)",
                                                }}
                                            />

                                            <Area
                                                type="monotone"
                                                dataKey="acessos"
                                                stroke="#00AE9D"
                                                strokeWidth={3}
                                                fill="url(#colorAcessos)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-[#79B729]/15 bg-[linear-gradient(135deg,#00AE9D_0%,#79B729_100%)] p-6 text-white shadow-[0_12px_30px_rgba(0,174,157,0.18)]">
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/20">
                                    <FaCheckCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Dica rápida para usar a intranet
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-white/90">
                                        Utilize a busca no topo para encontrar qualquer funcionalidade em segundos ou acesse os atalhos sugeridos para agilizar seu dia a dia.
                                        Sempre que houver um aviso importante, sua confirmação será solicitada automaticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="px-1 text-xs text-[var(--text-darken)]">
                    * Dados reais — integrados via API.
                </div>

                {modalPopupAberta && popupConteudo && (
                    <div
                        className="fixed inset-0 z-[99999]"
                        aria-modal="true"
                        role="dialog"
                    >
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[5px]"
                            onClick={() => setModalPopupAberta(false)}
                        />

                        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                            <div
                                className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="max-h-[90vh] overflow-y-auto">
                                    {imagemValidaPopupHome ? (
                                        <div className="relative h-[440px] w-full overflow-hidden bg-slate-100">
                                            <img
                                                src={imagemValidaPopupHome}
                                                alt="Imagem do aviso"
                                                className="h-full w-full object-cover object-center"
                                            />

                                            <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/10 to-transparent" />

                                            <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow">
                                                <FaBell className="text-[#00AE9D]" />
                                                Aviso institucional
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-b border-slate-200 bg-linear-to-r from-[#00AE9D]/10 via-white to-[#79B729]/10 px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D]">
                                                    <FaBell size={22} />
                                                </div>

                                                <div>
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00AE9D]">
                                                        Aviso importante
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Comunicado institucional
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="px-6 py-6">
                                        <div className="flex items-start gap-3">
                                            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C7D300]/25 text-slate-700 md:flex">
                                                <FaBell size={18} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00AE9D]">
                                                    Aviso importante
                                                </p>

                                                <h2 className="text-2xl font-bold leading-tight text-slate-800">
                                                    {popupConteudo.TITULO}
                                                </h2>

                                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                                    <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                                                        {popupConteudo.MENSAGEM}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {popupHome && (
                                            <div className="mt-5 rounded-2xl border border-[#79B729]/20 bg-[#79B729]/10 px-4 py-3">
                                                <div className="flex items-start gap-3 text-sm text-slate-700">
                                                    <FaCheckCircle className="mt-0.5 shrink-0 text-[#79B729]" />
                                                    <span>
                                                        Ao clicar em confirmar ciência, sua resposta será registrada automaticamente.
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-slate-200 bg-white px-6 py-5">
                                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setModalPopupAberta(false)}
                                                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                                            >
                                                Fechar
                                            </button>

                                            {popupHome && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleResponderPopupHome("ACEITO");
                                                        setModalPopupAberta(false);
                                                    }}
                                                    disabled={submittingPopupHome}
                                                    className="inline-flex min-w-42.5 items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                                >
                                                    <FaCheckCircle />
                                                    {popupHome.BOTAO_ACEITAR || "Li e estou ciente"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {modalErroAberta && (
                    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-500">
                                    <FaBell />
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold text-slate-800">
                                        Aviso
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        {erroPopup}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setModalErroAberta(false)}
                                    className="rounded-2xl bg-[#00AE9D] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                                >
                                    Entendi
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function BadgeInfo({
    icon,
    label,
}: {
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-medium text-[var(--title)] shadow-sm">
            <span className="text-[#00AE9D]">{icon}</span>
            {label}
        </span>
    );
}

function ActionHighlightCard({
    title,
    desc,
    href,
    icon,
    badge,
}: QuickAccessItem) {
    return (
        <Link
            href={href}
            className="group rounded-3xl border border-[#EAECF0] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#00AE9D]/20 hover:shadow-[0_14px_30px_rgba(0,174,157,0.08)]"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00AE9D]/10 text-[#00AE9D] transition group-hover:bg-[#00AE9D] group-hover:text-white">
                    {icon}
                </div>

                {badge ? (
                    <span className="rounded-full bg-[#79B729]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#79B729]">
                        {badge}
                    </span>
                ) : null}
            </div>

            <h3 className="mt-4 text-base font-semibold text-[var(--title)]">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-[var(--paragraph)]">
                {desc}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#00AE9D]">
                Abrir
                <FaArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </div>
        </Link>
    );
}

function QuickAccessCard({
    title,
    desc,
    href,
    icon,
    badge,
}: QuickAccessItem) {
    return (
        <Link
            href={href}
            className="group rounded-3xl border border-[#EAECF0] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#49479D]/20 hover:bg-[#FAFAFF] hover:shadow-[0_10px_24px_rgba(73,71,157,0.08)]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#49479D]/10 text-[#49479D]">
                    {icon}
                </div>

                {badge ? (
                    <span className="rounded-full border border-[#00AE9D]/15 bg-[#00AE9D]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#00AE9D]">
                        {badge}
                    </span>
                ) : null}
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[var(--title)]">
                {title}
            </h3>

            <p className="mt-2 text-xs leading-5 text-[var(--paragraph)]">
                {desc}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#49479D]">
                Acessar
                <FaArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </div>
        </Link>
    );
}

