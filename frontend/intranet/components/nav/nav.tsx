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
    FaWarehouse,
    FaChartBar,
    FaMoneyCheck
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
    ESTOQUE: "GG_USERS_ALMO",
    GERENCIA_DIRETORIA: "GG_USERS_GERENCIA_DIRETORIA",
    TODO_MUNDO: "GG_INTRANET_FULL",
    CHEQUE_ESPCIAL: "GG_INTRANET_CHEQUE_ESPECIAL",
    CONSULTA_ANALISE_LIMITE: "GG_INTRANET_CONSULTA_ANALISE",
    CADASTRO_CONVENIADA: "GG_INTRANET_EMPRESA_CONVENIADA",
    NOTIFICACAO: "GG_INTRANET_MKT_NOTIFICACAO",
    META_PA: "GG_INTRANET_META_PA",
    DESEMPEDIMENTO: "GG_INTRANET_FICHA_DESEMPEDIMENTO",
    CONVENIO_ODONTO: "GG_INTRANET_CADASTRO_ODONTO",
    GERENCIAR_CONVENIO_ODONTO: "GG_INTRANET_GERENCIADOR_ODONTO",
    FINANCEIRO_CADASTRO: "GG_INTRANET_CADASTRO_FIN",
    RH_INTRANET: "GG_INTRANET_RH",
    MIGRACAO_CONTRATO: "GG_INTRANET_MIGRACAO_CONTRATO",
} as const;

const ALL_AD_GROUPS = Object.values(AD_GROUPS);
const EMPTY_GROUPS: string[] = [];

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
        : EMPTY_GROUPS;

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
                    label: "Autorização de Débito",
                    href: "/auth/autorizacao_debito",
                    allowedGroups: [ //todo mundo precisa ter acesso: grupo domain_users, alterar
                        AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO
                    ],
                },
                {
                    label: "Calculadora de Atraso Cartão de Crédito",
                    href: "/auth/calculadora_juros_cartao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO], //cobranca precisa ter acesso tambem
                },
                {
                    label: "Simulador de Investimento",
                    href: "/auth/simulador_investimento",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO], //todo mundo precisa ter acesso - domain_users, alterar
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
                    label: "Alteração de Cheque Especial",
                    href: "/auth/cheque_especial",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CHEQUE_ESPCIAL], //agencia sede e agencia sul precisam ter acesso, remover AD_GROUPS.AGENCIA
                },
                {
                    label: "Análise de Limite",
                    href: "/auth/cadastro_analise_limite",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO], //alterar para domain_users
                },
                {
                    label: "Consulta de Análise de Limite",
                    href: "/auth/consulta_analise_limite",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CONSULTA_ANALISE_LIMITE], //limitar somente para quem criou o seu, pegar o usuario logado. Alterar o grupo agencia para o grupo de analise de limite
                },
                {
                    label: "Solicitação de Crédito",
                    href: "/auth/auditoria",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO], //todo mundo precisa ter acesso, remover o grupo auditoria
                },
            ],
        },
        {
            key: "estoque",
            label: "Estoque",
            icon: FaWarehouse,
            section: "Operações",
            children: [
                {
                    label: "Balanço",
                    href: "/auth/balanco",
                    allowedGroups: [AD_GROUPS.SUPORTE], //limitar apenas para suporte, remover estoque
                },
                {
                    label: "Consumíveis",
                    href: "/auth/estoque_consumiveis",
                    allowedGroups: [AD_GROUPS.SUPORTE], //limitar apenas para suporte, remover estoque
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
                    label: "Aplicar marca d'água",
                    href: "/auth/aplica_marca_dagua",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO], //todo mundo precisa ter acesso, no caso domain_users
                },
                {
                    label: "Conversor de Arquivos",
                    href: "/auth/conversor_arquivos",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],//todo mundo precisa ter acesso, no caso domain_users
                },
                {
                    label: "Docusign",
                    href: "/auth/docusign",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.DOCUSIGN],
                },
                {
                    label: "Gerador Assinatura Email",
                    href: "/auth/assinatura_email",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],//todo mundo precisa ter acesso, no caso domain_users
                },
                {
                    label: "Juntar Arquivo",
                    href: "/auth/juntar_pdf",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],//todo mundo precisa ter acesso, no caso domain_users
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
                    label: "Cadastro de Empresa Conveniada",
                    href: "/auth/cadastro_contrato",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO_CONVENIADA], //remover o grupo cadastro e colocar o grupo GG_USERS_SECRETARIA
                },
                {
                    label: "Gerenciador de Empresa Conveniada",
                    href: "/auth/consulta_contratos",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO_CONVENIADA], //
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
                    label: "Gerenciador de Subsídio",
                    href: "/auth/gerenciamento_participacao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],//todo mundo
                },
                {
                    label: "Notificação",
                    href: "/auth/popup_aviso",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.NOTIFICACAO],//liberar para o diego
                },
                {
                    label: "Solicitação de Subsídio",
                    href: "/auth/solicitacao_participacao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],//todo mundo faz
                },
            ],
        },
        {
            key: "metricas",
            label: "Métricas",
            icon: FaChartBar,
            section: "Gestão e Comunicação",
            children: [
                {
                    label: "Meta PA",
                    href: "/auth/producao_meta_cooperativa_pa",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.META_PA],//a limitacao do que ela precisa ver esta por codigo
                },
                {
                    label: "Meta por Funcionário",
                    href: "/auth/producao_meta_funcionario",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.META_PA],
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
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.DESEMPEDIMENTO],
                },
                {
                    label: "Migração de Contrato",
                    href: "/auth/migracao_contrato",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MIGRACAO_CONTRATO],
                },
            ],
        },
        {
            key: "convenios",
            label: "Convênio Odontológico",
            icon: FaUserFriends,
            section: "Cadastros e Consultas",
            children: [
                {
                    label: "Cadastro",
                    href: "/auth/cadastro_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CONVENIO_ODONTO],//ao inves de cadastro, precisa ser o grupo de desimpedimento
                },
                {
                    label: "Consulta",
                    href: "/auth/gerenciamento_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CONVENIO_ODONTO],
                },
                {
                    label: "Gerenciar Valores",
                    href: "/auth/gerenciamento_valor_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.GERENCIAR_CONVENIO_ODONTO],
                },
                {
                    label: "Relatórios",
                    href: "/auth/relatorio_convenio_odonto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.GERENCIAR_CONVENIO_ODONTO],
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
                    label: "Aniversariantes",
                    href: "/auth/aniversariantes",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Empréstimo Consignado",
                    href: "/auth/emprestimo_consignado",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Links Externos",
                    href: "/auth/links_externos",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Ramal",
                    href: "/auth/ramais",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Telas Intranet",
                    href: "/auth/links_uteis",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Tabela de integralização",
                    href: "/auth/tabela_integralizacao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
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
                    label: "Alteração de Capital",
                    href: "/auth/alteracao_capital",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Declaração de Residência",
                    href: "/auth/declaracao_residencia",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Declaração de Rendimentos",
                    href: "/auth/declaracao_rendimentos",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Procuração Outorgante PF/PJ",
                    href: "/auth/procuracao_ortugante",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Relação de Faturamento",
                    href: "/auth/relacao_faturamento",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Renúncia de Procurador",
                    href: "/auth/renuncia_procurador",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
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
                    label: "Antecipação de Capital",
                    href: "/auth/antecipacao_capital",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Formulário Demissão Espontânea",
                    href: "/auth/demissao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Resgate Parcial de Capital",
                    href: "/auth/resgate_capital",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
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
                    label: "Adendo Contratual",
                    href: "/auth/adendo_contratual",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Adiantamento Salarial",
                    href: "/auth/adiantamento_salarial_emprestimo",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Cálculo de Margem",
                    href: "/auth/margem_consignavel",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Custo de Operação de Portabilidade",
                    href: "/auth/rco",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Formulário DPS",
                    href: "/auth/formulario_dps",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Formulário Previsul",
                    href: "/auth/previsul",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Simulador de desconto",
                    href: "/auth/simulador_desconto",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Termo de Garantia",
                    href: "/auth/termo_garantia",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
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
                    label: "Adiantamento Salarial",
                    href: "/auth/adiantamento_salarial",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Reembolso Bolsa de Estudo",
                    href: "/auth/bolsa_estudo",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Reembolso Creche / Babá",
                    href: "/auth/auxilio_creche",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Reembolso Convênio Médico",
                    href: "/auth/reembolso_convenio_medico",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
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
                    label: "Gerenciamento de Reembolso",
                    href: "/auth/gerenciamento_reembolso_despesa",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
                {
                    label: "Solicitação de Reembolso",
                    href: "/auth/cadastro_reembolso_despesa",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
                },
            ],
        },
        {
            key: "financeiro",
            label: "Financeiro",
            icon: FaMoneyCheck,
            section: "Financeiro",
            children: [
                {
                    label: "Cadastro de Recibo Financeiro",
                    href: "/auth/cadastro_recibo_financeiro",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE, AD_GROUPS.FINANCEIRO_CADASTRO
                    ],
                },
                {
                    label: "Recibos Financeiros",
                    href: "/auth/consulta_recibo_financeiro",
                    allowedGroups: [
                        AD_GROUPS.SUPORTE, AD_GROUPS.FINANCEIRO_CADASTRO
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
                    label: "Cadastro de Férias",
                    href: "/auth/cadastro_ferias",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
                },
                {
                    label: "Cargos",
                    href: "/auth/gerenciamento_cargo",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
                },
                {
                    label: "Gerenciador de Férias",
                    href: "/auth/gerenciamento_ferias",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
                },
                {
                    label: "Gerenciador de Funcionários",
                    href: "/auth/gerenciamento_funcionario",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
                },
                {
                    label: "Posições",
                    href: "/auth/gerenciamento_posicao",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
                },
                {
                    label: "Setores",
                    href: "/auth/gerenciamento_setor",
                    allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
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
                    label: "Cadastro de Notebook",
                    href: "/auth/cadastro_notebook",
                    allowedGroups: [AD_GROUPS.SUPORTE],
                },
                {
                    label: "Gerenciador de Notebook",
                    href: "/auth/consulta_notebook",
                    allowedGroups: [AD_GROUPS.SUPORTE],
                },
                {
                    label: "Tabela SISBR TI",
                    href: "/auth/tabela_sisbr_ti",
                    allowedGroups: [AD_GROUPS.SUPORTE],
                },
                {
                    label: "Termo de Responsabilidade TI",
                    href: "/auth/termo_responsabilidade_uso",
                    allowedGroups: [AD_GROUPS.SUPORTE],
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
            const next = Array.from(merged);

            if (next.length === prev.length && next.every((value, index) => value === prev[index])) {
                return prev;
            }

            return next;
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
