"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
    FaHome,
    FaMoneyBillWave,
    FaFileInvoiceDollar,
    FaFileAlt,
    FaFolderOpen,
    FaHandshake,
    FaUsersCog,
    FaUmbrellaBeach,
    FaLaptop,
    FaChartLine,
    FaBars,
    FaCashRegister,
    FaPenSquare,
    FaIdCard,
    FaAddressBook,
    FaBullhorn,
    FaUserFriends,
} from "react-icons/fa";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import styles from "./nav.module.css";

export const AD_GROUPS = {
    SUPORTE: "GG_USERS_SUPORTE",
    CADASTRO: "GG_USERS_CAD",
    RH: "GG_USERS_RH",
    FINANCEIRO: "GG_USERS_FIN",
    AGENCIA: "GG_USERS_AGE",
    COBRANCA: "GG_USERS_COB",
    TI: "GG_USERS_TI",
    MARKETING: "GG_USERS_MKT",
    AUDITORIA: "GG_USERS_ANTEC",
    DOCUSIGN: "GG_USERS_DOCUSIGN",
} as const;

const ALL_AD_GROUPS = Object.values(AD_GROUPS);

type MenuChild = {
    label: string;
    href: string;
    allowedGroups?: string[];
};

type MenuGroup = {
    key: string;
    label: string;
    icon: IconType;
    section: string;
    children: MenuChild[];
};

function hasAnyGroup(userGroups: string[], allowedGroups?: string[]) {
    if (!allowedGroups?.length) return true;
    return allowedGroups.some((group) => userGroups.includes(group));
}

function getInitials(name?: string) {
    const clean = String(name || "").trim();
    if (!clean) return "SC";

    const parts = clean.split(" ").filter(Boolean);
    const initials = parts
        .slice(0, 2)
        .map((part) => part[0])
        .join("");

    return initials.toUpperCase();
}

function normalizeSectionLabel(section: string) {
    return section.toUpperCase();
}

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [openGroups, setOpenGroups] = useState<string[]>([]);

    const meResult = useMe() as any;
    const usuarioLogado =
        meResult?.user ??
        meResult?.me ??
        meResult?.data ??
        meResult?.usuario ??
        null;

    const loadingPermissions = Boolean(
        meResult?.loading ?? meResult?.isLoading ?? meResult?.pending
    );

    useEffect(() => {
        setIsClient(true);
    }, []);

    const pathname =
        (typeof window !== "undefined" ? window.location.pathname : "") as string;

    const userGroups = Array.isArray(usuarioLogado?.grupos)
        ? usuarioLogado.grupos
        : [];

    const isActive = (path: string) =>
        pathname === path || (path !== "/auth/home" && pathname?.startsWith(path));

    const isAnyActive = (paths: string[]) =>
        paths.some((p) => pathname === p || pathname?.startsWith(p));

    const toggleSidebar = () => {
        setIsOpen((prev) => !prev);
    };

    const closeSidebar = () => {
        setIsOpen(false);
    };

    const toggleGroup = (key: string) => {
        if (!isOpen) return;

        setOpenGroups((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
        );
    };

    const menuGroups: MenuGroup[] = [
        {
            key: "agencia",
            label: "Agência",
            icon: FaCashRegister,
            section: "Operações",
            children: [
                {
                    label: "Calculadora de Atraso Cartão de Crédito",
                    href: "/auth/calculadora_juros_cartao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
                },
                {
                    label: "Simulador de Investimento",
                    href: "/auth/simulador_investimento",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
                },
            ],
        },
        {
            key: "analises-limites",
            label: "Análises e Limites",
            icon: FaChartLine,
            section: "Operações",
            children: [
                {
                    label: "Cheque Especial",
                    href: "/auth/cheque_especial",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
                },
                {
                    label: "Auditoria",
                    href: "/auth/auditoria",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AUDITORIA],
                },
                {
                    label: "Análise de Limite",
                    href: "/auth/cadastro_analise_limite",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
                },
                {
                    label: "Consulta de Análise de Limite",
                    href: "/auth/consulta_analise_limite",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
                },
            ],
        },
        {
            key: "arquivos",
            label: "Arquivos",
            icon: FaFolderOpen,
            section: "Ferramentas",
            children: [
                {
                    label: "Gerenciador de Arquivo",
                    href: "/auth/juntar_pdf",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI],
                },
                {
                    label: "Aplicar marca d'água",
                    href: "/auth/aplica_marca_dagua",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI],
                },
                {
                    label: "Conversor de Arquivos",
                    href: "/auth/conversor_arquivos",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI],
                },
                {
                    label: "Gerador Assinatura Email",
                    href: "/auth/assinatura_email",
                    allowedGroups: ALL_AD_GROUPS,
                },
                {
                    label: "Docusign",
                    href: "/auth/docusign",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.DOCUSIGN],
                },
            ],
        },
        {
            key: "assessoria",
            label: "Assessoria",
            icon: FaHandshake,
            section: "Gestão e Comunicação",
            children: [
                {
                    label: "Cadastro de Contrato",
                    href: "/auth/cadastro_contrato",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Gerenciador de Contrato",
                    href: "/auth/consulta_contratos",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Relatórios",
                    href: "/auth/producao_meta_cooperativa_pa",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
                },
                {
                    label: "Meta Funcionários",
                    href: "/auth/producao_meta_funcionario",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
                },
            ],
        },
        {
            key: "marketing",
            label: "Marketing",
            icon: FaBullhorn,
            section: "Gestão e Comunicação",
            children: [
                {
                    label: "Solicitações",
                    href: "/auth/solicitacao_participacao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MARKETING],
                },
                {
                    label: "Gerenciador de Marketing",
                    href: "/auth/gerenciamento_participacao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MARKETING],
                },
                {
                    label: "Popup",
                    href: "/auth/popup_aviso",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MARKETING],
                },
            ],
        },
        {
            key: "cadastro",
            label: "Cadastro",
            icon: FaIdCard,
            section: "Cadastros e Consultas",
            children: [
                {
                    label: "Ficha de Desimpedimento",
                    href: "/auth/ficha_desimpedimento",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Declaração de Rendimentos",
                    href: "/auth/declaracao_rendimentos",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.CADASTRO,
                        AD_GROUPS.RH,
                        AD_GROUPS.FINANCEIRO,
                    ],
                },
                {
                    label: "Resgate Parcial de Capital",
                    href: "/auth/resgate_capital",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Migração de Contrato",
                    href: "/auth/migracao_contrato",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Formulário Demissão Espontânea",
                    href: "/auth/demissao",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.RH,
                        AD_GROUPS.CADASTRO,
                    ],
                },
                {
                    label: "Antecipação de Capital",
                    href: "/auth/antecipacao_capital",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
            ],
        },
        {
            key: "convenios",
            label: "Convênios",
            icon: FaUserFriends,
            section: "Cadastros e Consultas",
            children: [
                {
                    label: "Cadastro",
                    href: "/auth/cadastro_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Consulta",
                    href: "/auth/gerenciamento_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Gerenciar Valores",
                    href: "/auth/gerenciamento_valor_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Relatórios",
                    href: "/auth/relatorio_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
            ],
        },
        {
            key: "consulta",
            label: "Consulta",
            icon: FaUsersCog,
            section: "Cadastros e Consultas",
            children: [
                {
                    label: "Empréstimo Consignado",
                    href: "/auth/emprestimo_consignado",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Aniversariantes",
                    href: "/auth/aniversariantes",
                    allowedGroups: ALL_AD_GROUPS,
                },
                {
                    label: "Ramal",
                    href: "/auth/ramais",
                    allowedGroups: ALL_AD_GROUPS,
                },
            ],
        },
        {
            key: "formularios-cadastro",
            label: "Formulários Cadastro",
            icon: FaPenSquare,
            section: "Formulários",
            children: [
                {
                    label: "Relação de Faturamento",
                    href: "/auth/relacao_faturamento",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.CADASTRO,
                        AD_GROUPS.FINANCEIRO,
                    ],
                },
                {
                    label: "Declaração de Rendimentos",
                    href: "/auth/declaracao_rendimentos",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.CADASTRO,
                        AD_GROUPS.RH,
                        AD_GROUPS.FINANCEIRO,
                    ],
                },
                {
                    label: "Formulários Cadastro",
                    href: "/auth/links_uteis",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Alteração de Capital",
                    href: "/auth/alteracao_capital",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Declaração de Residência",
                    href: "/auth/declaracao_residencia",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Procuração Ortugante PF/PJ",
                    href: "/auth/procuracao_ortugante",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Renúncia de Procurador",
                    href: "/auth/renuncia_procurador",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Tabela de integralização",
                    href: "/auth/tabela_integralizacao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
                },
            ],
        },
        {
            key: "formularios-capital",
            label: "Formulários Capital",
            icon: FaMoneyBillWave,
            section: "Formulários",
            children: [
                {
                    label: "Resgate Parcial de Capital",
                    href: "/auth/resgate_capital",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Formulário Demissão Espontânea",
                    href: "/auth/demissao",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.RH,
                        AD_GROUPS.CADASTRO,
                    ],
                },
                {
                    label: "Antecipação de Capital",
                    href: "/auth/antecipacao_capital",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
            ],
        },
        {
            key: "formularios-emprestimo",
            label: "Formulários Empréstimo",
            icon: FaFileAlt,
            section: "Formulários",
            children: [
                {
                    label: "RCO",
                    href: "/auth/rco",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Formulários de Empréstimo",
                    href: "/auth/adendo_contratual",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Adiantamento Salarial",
                    href: "/auth/adiantamento_salarial_emprestimo",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Autorização de Débito",
                    href: "/auth/autorizacao_debito",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Cálculo de Margem",
                    href: "/auth/margem_consignavel",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Formulário DPS",
                    href: "/auth/formulario_dps",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Formulário Previsul",
                    href: "/auth/previsul",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Simulador de desconto",
                    href: "/auth/simulador_desconto",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Termo de Garantia",
                    href: "/auth/termo_garantia",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
            ],
        },
        {
            key: "formularios-rh",
            label: "Formulários RH",
            icon: FaUsersCog,
            section: "Formulários",
            children: [
                {
                    label: "Formulários de RH",
                    href: "/auth/adiantamento_salarial",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Auxílio Creche / Babá",
                    href: "/auth/auxilio_creche",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Bolsa de Estudo",
                    href: "/auth/bolsa_estudo",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Reembolso Convênio Médico",
                    href: "/auth/reembolso_convenio_medico",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
            ],
        },
        {
            key: "formularios-financeiro",
            label: "Formulários Financeiro",
            icon: FaFileInvoiceDollar,
            section: "Formulários",
            children: [
                {
                    label: "Cadastro de Recibo Financeiro",
                    href: "/auth/cadastro_recibo_financeiro",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Recibos Financeiros",
                    href: "/auth/consulta_recibo_financeiro",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.COBRANCA,
                    ],
                },
                {
                    label: "Despesas e Viagens",
                    href: "/auth/cadastro_reembolso_despesa",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.RH,
                    ],
                },
                {
                    label: "Gerenciamento de Despesas e Viagens",
                    href: "/auth/gerenciamento_reembolso_despesa",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE,
                        AD_GROUPS.FINANCEIRO,
                        AD_GROUPS.RH,
                    ],
                },
            ],
        },
        {
            key: "rh",
            label: "RH",
            icon: FaUmbrellaBeach,
            section: "Pessoas",
            children: [
                {
                    label: "Cargos",
                    href: "/auth/gerenciamento_cargo",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Gerenciador de Funcionários",
                    href: "/auth/gerenciamento_funcionario",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Posições",
                    href: "/auth/gerenciamento_posicao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Setores",
                    href: "/auth/gerenciamento_setor",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Cadastro de Férias",
                    href: "/auth/cadastro_ferias",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
                {
                    label: "Gerenciador de Férias",
                    href: "/auth/gerenciamento_ferias",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
                },
            ],
        },
        {
            key: "ti",
            label: "TI",
            icon: FaLaptop,
            section: "Tecnologia",
            children: [
                {
                    label: "Migração de Contrato",
                    href: "/auth/migracao_contrato",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI, AD_GROUPS.CADASTRO],
                },
                {
                    label: "Termo de Responsabilidade TI",
                    href: "/auth/termo_responsabilidade_uso",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI],
                },
                {
                    label: "Tabela SISBR TI",
                    href: "/auth/tabela_sisbr_ti",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI],
                },
                {
                    label: "Cadastro de Notebook",
                    href: "/auth/cadastro_notebook",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI],
                },
                {
                    label: "Gerenciador de Notebook",
                    href: "/auth/consulta_notebook",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TI],
                },
            ],
        },
    ];

    const visibleMenuGroups = useMemo(() => {
        return menuGroups
            .map((group) => ({
                ...group,
                children: group.children.filter((child) =>
                    hasAnyGroup(userGroups, child.allowedGroups)
                ),
            }))
            .filter((group) => group.children.length > 0);
    }, [userGroups]);

    useEffect(() => {
        const activeGroups = visibleMenuGroups
            .filter((group) => isAnyActive(group.children.map((child) => child.href)))
            .map((group) => group.key);

        setOpenGroups((prev) => {
            const merged = new Set([...prev, ...activeGroups]);
            return Array.from(merged);
        });
    }, [pathname, visibleMenuGroups]);

    const sections = useMemo(() => {
        const map = new Map<string, typeof visibleMenuGroups>();

        for (const group of visibleMenuGroups) {
            if (!map.has(group.section)) {
                map.set(group.section, []);
            }

            map.get(group.section)!.push(group);
        }

        return Array.from(map.entries()).map(([section, groups]) => ({
            section,
            groups,
        }));
    }, [visibleMenuGroups]);

    const homeActive = isActive("/auth/home");

    const primaryItemClass = (active: boolean) =>
        [
            "group flex items-center gap-3 rounded-2xl transition-all duration-200",
            isOpen ? "px-4 py-3" : "justify-center px-3 py-3",
            active
                ? "bg-[#0A6DFF1A] text-white shadow-[inset_0_0_0_1px_rgba(10,109,255,0.35)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
        ].join(" ");

    const groupButtonClass = (active: boolean, expanded: boolean) =>
        [
            "w-full group flex items-center rounded-2xl transition-all duration-200",
            isOpen ? "gap-3 px-4 py-3" : "justify-center px-3 py-3",
            active || expanded
                ? "bg-[#0A6DFF14] text-white shadow-[inset_0_0_0_1px_rgba(10,109,255,0.28)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
        ].join(" ");

    const childItemClass = (active: boolean) =>
        [
            "flex items-center gap-3 rounded-xl text-sm transition-all duration-200",
            active
                ? "bg-[#0A6DFF1A] text-white"
                : "text-slate-300 hover:text-white hover:bg-white/5",
            "px-3 py-2.5",
        ].join(" ");

    if (!isClient || loadingPermissions) return null;

    return (
        <aside
            className={`${isOpen ? "w-[320px]" : "w-20"
                } sticky top-0 self-start h-screen shrink-0 overflow-hidden border-r border-white/10 bg-gray-900 text-white transition-all duration-300`}
        >
            <div className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-white/10">
                    <div
                        className={`flex items-center ${isOpen ? "justify-between px-5 py-5" : "justify-center px-3 py-5"
                            }`}
                    >
                        {isOpen ? (
                            <>
                                <Link
                                    href="/auth/home"
                                    onClick={closeSidebar}
                                    className="flex min-w-0 flex-1 items-center"
                                    title="Ir para a Home"
                                >
                                    <div
                                        className={`${styles.logoCressem} flex h-10 w-full items-center justify-start`}
                                    />
                                </Link>

                                <button
                                    onClick={toggleSidebar}
                                    className="ml-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                                    title="Recolher menu"
                                >
                                    <ChevronRight className="rotate-180 text-slate-200" size={18} />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-6">
                                <Link
                                    href="/auth/home"
                                    onClick={closeSidebar}
                                    className="flex items-center justify-center"
                                    title="Ir para a Home"
                                >
                                    <img
                                        src="/logo-icon.png"
                                        alt="Logo Cressem"
                                        className="h-12 w-12 object-contain"
                                    />
                                </Link>

                                <button
                                    onClick={toggleSidebar}
                                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                                    title="Expandir menu"
                                >
                                    <FaBars size={18} className="text-slate-200" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/*isOpen && (
            <div className="px-5 pb-5">
              <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-5">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyan-400/90 bg-slate-200 text-2xl font-bold text-slate-600 shadow-[0_0_0_4px_rgba(255,255,255,0.06)]">
                  {getInitials(
                    usuarioLogado?.nome ||
                      usuarioLogado?.nome_completo ||
                      usuarioLogado?.username
                  )}
                </div>

                <div className="mt-4 text-center">
                  <p className="line-clamp-2 text-lg font-semibold text-white">
                    {usuarioLogado?.nome ||
                      usuarioLogado?.nome_completo ||
                      "Usuário"}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {usuarioLogado?.department ||
                      usuarioLogado?.setor ||
                      usuarioLogado?.physicalDeliveryOfficeName ||
                      "Intranet Cressem"}
                  </p>
                </div>
              </div>
            </div>
          )*/}
                </div>

                <div
                    className={`flex-1 min-h-0 ${isOpen ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
                        }`}
                >
                    <div className={`${isOpen ? "px-4 py-4" : "px-2 py-4"}`}>
                        <div className="space-y-6">
                            <div>
                                {isOpen && (
                                    <p className="mb-2 px-3 text-xs font-bold tracking-[0.08em] text-slate-200/90">
                                        VISÃO GERAL
                                    </p>
                                )}

                                <Link
                                    href="/auth/home"
                                    onClick={closeSidebar}
                                    className={primaryItemClass(homeActive)}
                                    title={!isOpen ? "Home" : undefined}
                                >
                                    <FaHome className="shrink-0 text-[20px]" />
                                    {isOpen && (
                                        <span className="flex-1 text-left font-medium">Home</span>
                                    )}
                                </Link>
                            </div>

                            {sections.map(({ section, groups }) => (
                                <div key={section}>
                                    {isOpen && (
                                        <p className="mb-2 px-3 text-xs font-bold tracking-[0.08em] text-slate-200/90">
                                            {normalizeSectionLabel(section)}
                                        </p>
                                    )}

                                    <div className="space-y-1.5">
                                        {groups.map((group) => {
                                            const GroupIcon = group.icon;
                                            const groupPaths = group.children.map((child) => child.href);
                                            const isGroupActive = isAnyActive(groupPaths);
                                            const isExpanded = openGroups.includes(group.key);

                                            return (
                                                <div key={group.key}>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroup(group.key)}
                                                        className={groupButtonClass(isGroupActive, isExpanded)}
                                                        title={!isOpen ? group.label : undefined}
                                                    >
                                                        <GroupIcon className="shrink-0 text-[20px]" />

                                                        {isOpen && (
                                                            <>
                                                                <span className="flex-1 text-left font-medium">
                                                                    {group.label}
                                                                </span>

                                                                {isExpanded ? (
                                                                    <ChevronDown size={18} className="shrink-0" />
                                                                ) : (
                                                                    <ChevronRight size={18} className="shrink-0" />
                                                                )}
                                                            </>
                                                        )}
                                                    </button>

                                                    {isOpen && isExpanded && (
                                                        <div className="ml-4 mt-1 border-l border-white/10 pl-3">
                                                            <ul className="space-y-1.5">
                                                                {group.children.map((child) => {
                                                                    const childActive = isActive(child.href);

                                                                    return (
                                                                        <li key={child.href}>
                                                                            <Link
                                                                                href={child.href}
                                                                                onClick={closeSidebar}
                                                                                className={childItemClass(childActive)}
                                                                            >
                                                                                <span
                                                                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${childActive
                                                                                            ? "bg-cyan-400"
                                                                                            : "bg-slate-400/70"
                                                                                        }`}
                                                                                />
                                                                                <span className="leading-5">
                                                                                    {child.label}
                                                                                </span>
                                                                            </Link>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;