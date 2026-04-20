import { AD_GROUPS } from "@/config/ad-groups";

export const SECRETARIA = [
    "JANAINA GABRIELA",
    "VITORIA BEATRIZ FONTOURA CAVALHEIRO DOS SANTOS",
];

export const DIRETORIA = [
    "ADRIANA BATISTA DENARI DOS SANTOS",
    "TIAGO FERREIRA TEIXEIRA",
    "PAULO DE TARSO DOS SANTOS CUNHA",
    "ADRIANO CASTRO SPEGIORIN",
];

export const CHEQUE_ESPECIAL = [
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

export const ACESSO_DOCUSIGN = [
    "JANAINA GABRIELA",
    "LUCAS ITNER ANDRADE",
    "THAIS YUMI HASHIMOTO SANTOS",
    "PAULO DE TARSO DOS SANTOS CUNHA",
    "TIAGO FERREIRA TEIXEIRA",
    "DIEGO ADRIANO DE SOUZA",
    "VITORIA BEATRIZ FONTOURA CAVALHEIRO DOS SANTOS",
    "JENNYFFER HELENA RODRIGUES DE JESUS",
];

export type AccessRule = {
    allowedGroups?: string[];
    allowedUsers?: string[];
    requiresManagerOrDirector?: boolean;
};

export type AuthUserLike = {
    nome?: string;
    nome_completo?: string;
    grupos?: string[];
    isManagerOrDirector?: boolean;
    ehGerenteOuDiretor?: boolean;
    cargo_nivel?: string;
    nm_nivel?: string;
    nivel?: string;
    role_level?: string;
};

function normalizeName(name?: string) {
    return String(name || "").trim().toUpperCase();
}

export function hasAnyGroup(user: AuthUserLike | null | undefined, groups?: string[]) {
    if (!groups?.length) return false;
    const userGroups = Array.isArray(user?.grupos) ? user!.grupos! : [];
    return groups.some((group) => userGroups.includes(group));
}

export function isAllowedUser(user: AuthUserLike | null | undefined, users?: string[]) {
    if (!users?.length) return false;
    const nome = normalizeName(user?.nome_completo || user?.nome);
    return users.some((allowed) => normalizeName(allowed) === nome);
}

export function isManagerOrDirector(user: AuthUserLike | null | undefined) {
    if (!user) return false;

    if (typeof user.isManagerOrDirector === "boolean") return user.isManagerOrDirector;
    if (typeof user.ehGerenteOuDiretor === "boolean") return user.ehGerenteOuDiretor;

    const nivel = normalizeName(
        user.cargo_nivel ||
        user.nm_nivel ||
        user.nivel ||
        user.role_level
    );

    return nivel === "GERENCIA" || nivel === "DIRETORIA";
}

export function canAccess(user: AuthUserLike | null | undefined, rule?: AccessRule) {
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

export const PAGE_ACCESS = {
    migracaoContrato: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
    },
    fichaDesimpedimento: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
    },
    chequeEspecial: {
        allowedGroups: [AD_GROUPS.SUPORTE],
        allowedUsers: CHEQUE_ESPECIAL,
    },
    auditoria: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AUDITORIA],
    },
    popupAviso: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MARKETING],
    },
    simuladorInvestimento: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
    },
    termoResponsabilidadeTI: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },
    tabelaSisbrTi: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },
    recibosFinanceiros: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.FINANCEIRO, AD_GROUPS.COBRANCA],
    },
    analiseLimite: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.AGENCIA],
    },
    contratos: {
        allowedGroups: [AD_GROUPS.SUPORTE],
        allowedUsers: [...SECRETARIA, ...DIRETORIA],
    },
    relatorios: {
        allowedGroups: [AD_GROUPS.SUPORTE],
        requiresManagerOrDirector: true,
    },
    convenioCadastro: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
    },
    funcionarios: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
    },
    ferias: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
    },
    notebook: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },
    marketing: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MARKETING],
    },
    docusign: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.DOCUSIGN],
        allowedUsers: ACESSO_DOCUSIGN,
    },
} satisfies Record<string, AccessRule>;