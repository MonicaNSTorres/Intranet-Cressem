"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    FaSearch,
    FaFileInvoiceDollar,
    FaIdCard,
    FaFileAlt,
    FaUsersCog,
    FaFolderOpen,
    FaHandshake,
    FaUserFriends,
    FaUmbrellaBeach,
    FaLaptop,
    FaBullhorn,
    FaArrowRight,
    FaChevronDown,
    FaChevronUp,
    FaCircle,
    FaPhoneAlt,
    FaAddressBook,
    FaBirthdayCake,
    FaArchive,
    FaDesktop
} from "react-icons/fa";
import { useMe } from "@/hooks/use-me";

const AD_GROUPS = {
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
} as const;

const SECRETARIA = [
    "JANAINA GABRIELA",
    "VITORIA BEATRIZ FONTOURA CAVALHEIRO DOS SANTOS",
];

const DIRETORIA = [
    "ADRIANA BATISTA DENARI DOS SANTOS",
    "TIAGO FERREIRA TEIXEIRA",
    "PAULO DE TARSO DOS SANTOS CUNHA",
    "ADRIANO CASTRO SPEGIORIN",
];

const CHEQUE_ESPECIAL = [
    "ADRIANO CASTRO SPEGIORIN",
    "AMANDA DE ASSIS TEIXEIRA",
    "ANA CAROLINA MOTA HESPANHA RODRIGUES",
    "ANA KARINA SANTOS COELHO SENADOR",
    "CLEIDIANA DA SILVA",
    "GABRIELLE ALVES DOS SANTOS",
    "HEITOR PEIXOTO DE SOUZA",
    "ISIS GRASIELA SANCHES RONDON",
    "MATHEUS GUILHERME COSTA SANT ANA",
    "PATRICIA HASSMAN CHENA DINIZ ALMEIDA",
    "VANDERLEIA MARIA DA SILVA MEDEIROS",
    "CAROLINA BIANCA ALVARENGA DAUANNY",
];

const ACESSO_DOCUSIGN = [
    "JANAINA GABRIELA",
    "LUCAS ITNER ANDRADE",
    "THAIS YUMI HASHIMOTO SANTOS",
    "PAULO DE TARSO DOS SANTOS CUNHA",
    "TIAGO FERREIRA TEIXEIRA",
    "DIEGO ADRIANO DE SOUZA",
    "VITORIA BEATRIZ FONTOURA CAVALHEIRO DOS SANTOS",
    "JENNYFFER HELENA RODRIGUES DE JESUS",
];

type AccessRule = {
    allowedGroups?: string[];
    allowedUsers?: string[];
    requiresManagerOrDirector?: boolean;
};

type LinkChild = {
    title: string;
    href: string;
    allowedGroups?: string[];
    allowedUsers?: string[];
    requiresManagerOrDirector?: boolean;
};

type LinkItem = {
    title: string;
    description: string;
    href?: string;
    icon: any;
    category: string;
    children?: LinkChild[];
    allowedGroups?: string[];
    allowedUsers?: string[];
    requiresManagerOrDirector?: boolean;
};

function normalizeName(name?: string) {
    return String(name || "").trim().toUpperCase();
}

function hasAnyGroup(user: any, groups?: string[]) {
    if (!groups?.length) return false;
    const userGroups = Array.isArray(user?.grupos) ? user.grupos : [];
    return groups.some((group) => userGroups.includes(group));
}

function isAllowedUser(user: any, users?: string[]) {
    if (!users?.length) return false;
    const nome = normalizeName(user?.nome_completo || user?.nome);
    return users.some((allowed) => normalizeName(allowed) === nome);
}

function isManagerOrDirector(user: any) {
    if (!user) return false;

    if (typeof user?.isManagerOrDirector === "boolean") return user.isManagerOrDirector;
    if (typeof user?.ehGerenteOuDiretor === "boolean") return user.ehGerenteOuDiretor;

    const nivel = normalizeName(
        user?.cargo_nivel ||
        user?.nm_nivel ||
        user?.nivel ||
        user?.role_level
    );

    return nivel === "GERENCIA" || nivel === "DIRETORIA";
}

function canAccess(user: any, rule?: AccessRule) {
    if (!rule) return true;

    const hasRules =
        Boolean(rule.allowedGroups?.length) ||
        Boolean(rule.allowedUsers?.length) ||
        Boolean(rule.requiresManagerOrDirector);

    if (!hasRules) return true;

    const byGroup = hasAnyGroup(user, rule.allowedGroups);
    const byUser = isAllowedUser(user, rule.allowedUsers);
    const byManager = rule.requiresManagerOrDirector ? isManagerOrDirector(user) : false;

    return byGroup || byUser || byManager;
}

const links: LinkItem[] = [
    {
        title: "Empréstimo Consignado",
        description: "Acesse rapidamente a tela de empréstimo consignado.",
        href: "/auth/emprestimo_consignado",
        icon: FaFileInvoiceDollar,
        category: "Financeiro",
    },
    {
        title: "RCO",
        description: "Acesse rapidamente a tela de RCO.",
        href: "/auth/rco",
        icon: FaFileInvoiceDollar,
        category: "Financeiro",
    },
    {
        title: "Relação de Faturamento",
        description: "Acesse rapidamente a tela de relação de faturamento.",
        href: "/auth/relacao_faturamento",
        icon: FaFileInvoiceDollar,
        category: "Financeiro",
    },
    {
        title: "Declaração de Rendimentos",
        description: "Acesse rapidamente a tela de declaração de rendimentos.",
        href: "/auth/declaracao_rendimentos",
        icon: FaIdCard,
        category: "Cadastro",
    },
    {
        title: "Estoque de Consumíveis",
        description: "Acesse rapidamente a tela de estoque de consumíveis.",
        href: "/auth/estoque_consumiveis",
        icon: FaArchive,
        category: "Estoque",
        allowedGroups: [AD_GROUPS.ESTOQUE, AD_GROUPS.SUPORTE],
    },
    {
        title: "Painel GLPI",
        description: "Acesse rapidamente e acompanhe os chamados que chegam para o estoque.",
        href: "/auth/painel_glpi_estoque",
        icon: FaDesktop,
        category: "Estoque",
        allowedGroups: [AD_GROUPS.ESTOQUE, AD_GROUPS.SUPORTE],
    },
    {
        title: "Resgate Parcial de Capital",
        description: "Acesse rapidamente a tela de resgate de capital.",
        href: "/auth/resgate_capital",
        icon: FaIdCard,
        category: "Cadastro",
    },
    {
        title: "Migração de Contrato",
        description: "Acesse rapidamente a tela de migração de contrato.",
        href: "/auth/migracao_contrato",
        icon: FaIdCard,
        category: "Cadastro",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
    },
    {
        title: "Demissão",
        description: "Acesse rapidamente a tela de formulário de demissão.",
        href: "/auth/demissao",
        icon: FaIdCard,
        category: "Cadastro",
    },
    {
        title: "Ficha de Desimpedimento",
        description: "Acesse rapidamente a tela da ficha de desimpedimento.",
        href: "/auth/ficha_desimpedimento",
        icon: FaIdCard,
        category: "Cadastro",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
    },
    {
        title: "Cheque Especial",
        description: "Acesse rapidamente a tela de alteração benefício cheque especial.",
        href: "/auth/cheque_especial",
        icon: FaIdCard,
        category: "Cadastro",
        allowedGroups: [AD_GROUPS.SUPORTE],
        allowedUsers: CHEQUE_ESPECIAL,
    },
    {
        title: "Auditoria",
        description: "Acesse rapidamente a tela de formulário de solicitação de crédito.",
        href: "/auth/auditoria",
        icon: FaIdCard,
        category: "Cadastro",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AUDITORIA],
    },
    {
        title: "Docusign",
        description: "Acesse rapidamente a tela da docusign.",
        href: "/auth/docusign",
        icon: FaArchive,
        category: "Cadastro",
        allowedGroups: [AD_GROUPS.DOCUSIGN],
    },
    {
        title: "Antecipação de Capital",
        description: "Acesse rapidamente a tela de solicitação de antecipação de capital.",
        href: "/auth/antecipacao_capital",
        icon: FaIdCard,
        category: "Cadastro",
    },
    {
        title: "Termo de Responsabilidade TI",
        description: "Acesse rapidamente a tela de termo de responsabilidade de uso.",
        href: "/auth/termo_responsabilidade_uso",
        icon: FaIdCard,
        category: "Cadastro",
        allowedGroups: [AD_GROUPS.SUPORTE],
    },
    {
        title: "Aniversariantes",
        description: "Acesse rapidamente a tela aniversariantes.",
        href: "/auth/aniversariantes",
        icon: FaBirthdayCake,
        category: "Informativo",
        //allowedGroups: [AD_GROUPS.SUPORTE],
    },
    {
        title: "Ramais",
        description: "Acesse rapidamente a tela ramais.",
        href: "/auth/ramais",
        icon: FaPhoneAlt,
        category: "Informativo",
        //allowedGroups: [AD_GROUPS.SUPORTE],
    },
    {
        title: "Tabela SISBR TI",
        description: "Acesse rapidamente a tela tabela sisbr.",
        href: "/auth/tabela_sisbr_ti",
        icon: FaAddressBook,
        category: "Informativo",
        allowedGroups: [AD_GROUPS.SUPORTE],
    },
    {
        title: "Formulários de Cadastro",
        description: "Encontre formulários e documentos usados em processos de cadastro.",
        icon: FaIdCard,
        category: "Cadastro",
        children: [
            {
                title: "Alteração de Capital",
                href: "/auth/alteracao_capital",
            },
            {
                title: "Declaração de Residência",
                href: "/auth/declaracao_residencia",
            },
            {
                title: "Ficha de Desimpedimento",
                href: "/auth/ficha_desimpedimento",
                allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
            },
            {
                title: "Procuração Ortugante PF/PJ",
                href: "/auth/procuracao_ortugante",
            },
            {
                title: "Renúncia de Procurador",
                href: "/auth/renuncia_procurador",
            },
            {
                title: "Tabela de integralização",
                href: "/auth/tabela_integralizacao",
            },
        ],
    },
    {
        title: "Formulários de Empréstimos",
        description: "Acesse os formulários relacionados a empréstimos e garantias.",
        icon: FaFileAlt,
        category: "Empréstimos",
        children: [
            {
                title: "Adendo Contratual",
                href: "/auth/adendo_contratual",
            },
            {
                title: "Adiantamento Salarial",
                href: "/auth/adiantamento_salarial_emprestimo",
            },
            {
                title: "Autorização de Débito",
                href: "/auth/autorizacao_debito",
            },
            {
                title: "Cálculo de Margem",
                href: "/auth/margem_consignavel",
            },
            {
                title: "Formulário DPS",
                href: "/auth/formulario_dps",
            },
            {
                title: "Formulário Previsul",
                href: "/auth/previsul",
            },
            {
                title: "Simulador de desconto",
                href: "/auth/simulador_desconto",
            },
            {
                title: "Termo de Garantia",
                href: "/auth/termo_garantia",
            },
        ],
    },
    {
        title: "Formulários de RH",
        description: "Documentos e solicitações ligadas ao RH.",
        icon: FaUsersCog,
        category: "RH",
        children: [
            {
                title: "Adiantamento Salarial",
                href: "/auth/adiantamento_salarial",
            },
            {
                title: "Auxílio Creche / Babá",
                href: "/auth/auxilio_creche",
            },
            {
                title: "Bolsa de Estudo",
                href: "/auth/bolsa_estudo",
            },
            {
                title: "Reembolso Convênio Médico",
                href: "/auth/reembolso_convenio_medico",
            },
        ],
    },
    {
        title: "Gerenciador de Arquivos",
        description: "Ferramentas para juntar PDF, converter arquivos e aplicar marca d’água.",
        icon: FaFolderOpen,
        category: "Utilidades",
        children: [
            {
                title: "Aplicar marca d'água",
                href: "/auth/aplica_marca_dagua",
            },
            {
                title: "Conversor de Arquivos",
                href: "/auth/conversor_arquivos",
            },
            {
                title: "Juntar PDF",
                href: "/auth/juntar_pdf",
            },
        ],
    },
    {
        title: "Recibos Financeiros",
        description: "Ferramentas com recibos para cadastro e consulta.",
        icon: FaFolderOpen,
        category: "Financeiro",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.FINANCEIRO, AD_GROUPS.COBRANCA],
        children: [
            {
                title: "Cadastro de Recibo Financeiro",
                href: "/auth/cadastro_recibo_financeiro",
            },
            {
                title: "Consulta de Recibos Financeiros",
                href: "/auth/consulta_recibo_financeiro",
            },
        ],
    },
    {
        title: "Despesas e Viagens",
        description: "Ferramentas para cadastro e gerenciamento de despesas e viagens.",
        icon: FaFolderOpen,
        category: "Financeiro",
        children: [
            {
                title: "Cadastro de Despesas e Viagens",
                href: "/auth/cadastro_reembolso_despesa",
            },
            {
                title: "Gerenciamento de Despesas e Viagens",
                href: "/auth/gerenciamento_reembolso_despesa",
            },
        ],
    },
    {
        title: "Análise de Limite",
        description: "Ferramentas para cadastro e consulta de análise de limite.",
        icon: FaIdCard,
        category: "Cadastro",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
        children: [
            {
                title: "Cadastro de Concessão de Limites",
                href: "/auth/cadastro_analise_limite",
            },
            {
                title: "Consulta de Análise de Novos Limites",
                href: "/auth/consulta_analise_limite",
            },
        ],
    },
    {
        title: "Gerenciador de Contratos",
        description: "Cadastre e consulte contratos em um só lugar.",
        icon: FaHandshake,
        category: "Contratos",
        allowedGroups: [AD_GROUPS.SUPORTE],
        allowedUsers: [...SECRETARIA, ...DIRETORIA],
        children: [
            {
                title: "Cadastro",
                href: "/auth/cadastro_contrato",
            },
            {
                title: "Consulta",
                href: "/auth/consulta_contratos",
            },
        ],
    },
    {
        title: "Relatórios",
        description: "Consulte o relatório de metricas.",
        icon: FaHandshake,
        category: "Dados",
        allowedGroups: [AD_GROUPS.SUPORTE],
        requiresManagerOrDirector: true,
        children: [
            {
                title: "Consolidado/Meta/PA",
                href: "/auth/producao_meta_cooperativa_pa",
            },
            {
                title: "Meta Funcionários",
                href: "/auth/producao_meta_funcionario",
            },
        ],
    },
    {
        title: "Gerenciador de Convênios",
        description: "Acesse cadastros, consultas, valores e relatórios de convênios.",
        icon: FaUserFriends,
        category: "Convênios",
        children: [
            {
                title: "Cadastro",
                href: "/auth/cadastro_convenio_odonto",
                allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
            },
            {
                title: "Consulta",
                href: "/auth/gerenciamento_convenio_odonto",
            },
            {
                title: "Gerenciar Valores",
                href: "/auth/gerenciamento_valor_convenio_odonto",
                allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
            },
            {
                title: "Relatórios",
                href: "/auth/relatorio_convenio_odonto",
                allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
            },
        ],
    },
    {
        title: "Gerenciador de Funcionários",
        description: "Consulte e administre cargos, funcionários, posições e setores.",
        icon: FaUsersCog,
        category: "Funcionários",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
        children: [
            {
                title: "Cargos",
                href: "/auth/gerenciamento_cargo",
            },
            {
                title: "Funcionários",
                href: "/auth/gerenciamento_funcionario",
            },
            {
                title: "Posições",
                href: "/auth/gerenciamento_posicao",
            },
            {
                title: "Setores",
                href: "/auth/gerenciamento_setor",
            },
        ],
    },
    {
        title: "Gerenciador de Férias",
        description: "Solicitações, consultas e controle de férias.",
        icon: FaUmbrellaBeach,
        category: "RH",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
        children: [
            {
                title: "Cadastro",
                href: "/auth/cadastro_ferias",
            },
            {
                title: "Consulta",
                href: "/auth/gerenciamento_ferias",
            },
        ],
    },
    {
        title: "Gerenciador de Notebook",
        description: "Cadastre e consulte notebooks de forma prática.",
        icon: FaLaptop,
        category: "TI",
        allowedGroups: [AD_GROUPS.SUPORTE],
        children: [
            {
                title: "Cadastro",
                href: "/auth/cadastro_notebook",
            },
            {
                title: "Consulta",
                href: "/auth/consulta_notebook",
            },
        ],
    },
    {
        title: "Gerenciador de Marketing",
        description: "Solicitações e acompanhamento de participações de marketing.",
        icon: FaBullhorn,
        category: "Marketing",
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MARKETING],
        children: [
            {
                title: "Solicitações",
                href: "/auth/solicitacao_participacao",
            },
            {
                title: "Consulta",
                href: "/auth/gerenciamento_participacao",
            },
        ],
    },
];

export function LinksUteis() {
    const [search, setSearch] = useState("");
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const meResult = useMe() as any;
    const usuarioLogado =
        meResult?.user ??
        meResult?.me ??
        meResult?.data ??
        meResult?.usuario ??
        null;

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    };

    const visibleLinks = useMemo(() => {
        return links
            .map((item) => {
                const parentAllowed = canAccess(usuarioLogado, {
                    allowedGroups: item.allowedGroups,
                    allowedUsers: item.allowedUsers,
                    requiresManagerOrDirector: item.requiresManagerOrDirector,
                });

                if (item.children?.length) {
                    const visibleChildren = item.children.filter((child) =>
                        canAccess(usuarioLogado, {
                            allowedGroups: child.allowedGroups,
                            allowedUsers: child.allowedUsers,
                            requiresManagerOrDirector: child.requiresManagerOrDirector,
                        })
                    );

                    if (!parentAllowed && visibleChildren.length === 0) {
                        return null;
                    }

                    if (visibleChildren.length === 0 && !item.href) {
                        return null;
                    }

                    return {
                        ...item,
                        children: visibleChildren,
                    };
                }

                if (!parentAllowed) {
                    return null;
                }

                return item;
            })
            .filter(Boolean) as LinkItem[];
    }, [usuarioLogado]);

    const filteredLinks = useMemo(() => {
        const term = search.toLowerCase().trim();

        if (!term) return visibleLinks;

        return visibleLinks
            .map((item) => {
                const matchMain = [item.title, item.description, item.category].some((field) =>
                    field.toLowerCase().includes(term)
                );

                const filteredChildren = item.children?.filter((child) =>
                    child.title.toLowerCase().includes(term)
                );

                if (matchMain) {
                    return item;
                }

                if (filteredChildren && filteredChildren.length > 0) {
                    return {
                        ...item,
                        children: filteredChildren,
                    };
                }

                return null;
            })
            .filter(Boolean) as LinkItem[];
    }, [search, visibleLinks]);

    return (
        <div className="w-full">
            <div className="mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-[#49479D] via-[#C7D300] to-[#79B729] p-6 shadow-xl md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                        <span className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
                            Central de acessos rápidos
                        </span>

                        <h2 className="text-2xl font-bold text-white md:text-4xl">
                            Telas Intranet
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-white/90 md:text-base">
                            Encontre rapidamente os principais acessos da intranet em um só lugar.
                            Digite o nome do que você procura e clique em <strong>Acessar</strong>.
                        </p>
                    </div>

                    <div className="w-full max-w-xl">
                        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lg">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <FaSearch size={18} />
                            </div>

                            <input
                                type="text"
                                placeholder="Buscar por nome, categoria ou descrição..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 md:text-base"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                        Atalhos disponíveis
                    </h3>
                    <p className="text-sm text-slate-500">
                        {filteredLinks.length} resultado{filteredLinks.length !== 1 ? "s" : ""} encontrado
                        {filteredLinks.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            {filteredLinks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <FaSearch size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">
                        Nenhum link encontrado
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Tente buscar com outro nome, como “RH”, “contratos” ou “marketing”.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredLinks.map((item: any) => {
                        const Icon = item.icon;
                        const hasChildren = item.children && item.children.length > 0;
                        const isOpen = openGroups[item.title] || search.trim().length > 0;

                        if (!hasChildren && item.href) {
                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00AE9D]/30 hover:shadow-xl"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF8F6] text-[#00AE9D] transition-all duration-300 group-hover:scale-105">
                                            <Icon size={24} />
                                        </div>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                            {item.category}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-semibold leading-6 text-slate-800">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                                        {item.description}
                                    </p>

                                    <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-white transition-all duration-300 group-hover:bg-[#00AE9D]">
                                        <span>Acessar</span>
                                        <FaArrowRight size={12} />
                                    </div>
                                </Link>
                            );
                        }

                        return (
                            <div
                                key={item.title}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-[#00AE9D]/30 hover:shadow-xl"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(item.title)}
                                    className="w-full text-left cursor-pointer"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF8F6] text-[#00AE9D] transition-all duration-300">
                                            <Icon size={24} />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                                {item.category}
                                            </span>
                                            <span className="text-slate-500">
                                                {isOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold leading-6 text-slate-800">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {item.description}
                                    </p>
                                </button>

                                {isOpen && (
                                    <div className="mt-5 border-t border-slate-100 pt-4">
                                        <div className="space-y-2">
                                            {item.children.map((child: any) => (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-all duration-200 hover:border-[#00AE9D]/30 hover:bg-[#F7FFFD]"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FaCircle size={8} className="text-secondary" />
                                                        <span>{child.title}</span>
                                                    </div>
                                                    <FaArrowRight size={12} className="text-slate-400" />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}