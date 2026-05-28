import { AD_GROUPS } from "@/config/ad-groups";

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

export function hasAnyGroup(
    user: AuthUserLike | null | undefined,
    groups?: string[]
) {
    if (!groups?.length) return false;

    const userGroups = Array.isArray(user?.grupos) ? user.grupos : [];

    return groups.some((group) => userGroups.includes(group));
}

export function isAllowedUser(
    user: AuthUserLike | null | undefined,
    users?: string[]
) {
    if (!users?.length) return false;

    const nome = normalizeName(user?.nome_completo || user?.nome);

    return users.some((allowed) => normalizeName(allowed) === nome);
}

export function isManagerOrDirector(user: AuthUserLike | null | undefined) {
    if (!user) return false;

    if (typeof user.isManagerOrDirector === "boolean") {
        return user.isManagerOrDirector;
    }

    if (typeof user.ehGerenteOuDiretor === "boolean") {
        return user.ehGerenteOuDiretor;
    }

    const nivel = normalizeName(
        user.cargo_nivel ||
        user.nm_nivel ||
        user.nivel ||
        user.role_level
    );

    return nivel === "GERENCIA" || nivel === "DIRETORIA";
}

export function canAccess(
    user: AuthUserLike | null | undefined,
    rule?: AccessRule
) {
    if (!rule) return true;

    const hasRules =
        Boolean(rule.allowedGroups?.length) ||
        Boolean(rule.allowedUsers?.length) ||
        Boolean(rule.requiresManagerOrDirector);

    if (!hasRules) return true;

    const byGroup = hasAnyGroup(user, rule.allowedGroups);
    const byUser = isAllowedUser(user, rule.allowedUsers);
    const byManager = rule.requiresManagerOrDirector
        ? isManagerOrDirector(user)
        : false;

    return byGroup || byUser || byManager;
}

export const PAGE_ACCESS = {
    calculadoraJurosCartao: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    simuladorInvestimento: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.AGENCIA,
            AD_GROUPS.TODO_MUNDO,
        ],
    },

    chequeEspecial: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CHEQUE_ESPCIAL],
    },

    analiseLimite: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.AGENCIA,
        ],
    },

    consultaAnaliseLimite: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CONSULTA_ANALISE_LIMITE],
    },

    auditoria: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.SOLICITACAO_CREDITO,
        ],
    },

    estoque: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },

    balancoEstoque: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.ESTOQUE,
        ],
    },

    migracaoContrato: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.MIGRACAO_CONTRATO],
    },

    fichaDesimpedimento: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.DESEMPEDIMENTO,
        ],
    },

    convenioCadastro: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.CADASTRO_CONVENIADA,
        ],
    },

    convenioOdonto: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.CONVENIO_ODONTO,
        ],
    },

    gerenciarConvenioOdonto: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.GERENCIAR_CONVENIO_ODONTO,
        ],
    },

    funcionarios: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.RH,
            AD_GROUPS.RH_INTRANET,
        ],
    },

    ferias: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.RH,
            AD_GROUPS.RH_INTRANET,
        ],
    },

    contratos: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.GERENCIA_DIRETORIA,
        ],
    },

    relatorios: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.GERENCIA_DIRETORIA,
        ],
    },

    marketing: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.MARKETING,
        ],
    },

    popupAviso: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.NOTIFICACAO],
    },

    termoResponsabilidadeTI: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },

    tabelaSisbrTi: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },

    notebook: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.TI,
        ],
    },

    recibosFinanceiros: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.FINANCEIRO,
            AD_GROUPS.COBRANCA,
            AD_GROUPS.FINANCEIRO_CADASTRO,
        ],
    },

    docusign: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.DOCUSIGN,
        ],
    },

    metaPa: {
        allowedGroups: [
            AD_GROUPS.SUPORTE,
            AD_GROUPS.META_PA,
        ],
    },

    cadastroNotebook: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },

    adendoContratual: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    adiantamentoSalarial: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    adiantamentoSalarialEmprestimo: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    alteracaoCapital: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    antecipacaoCapital: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    autorizacaoDebito: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    auxilioCreche: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    balanco: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },

    bolsaEstudo: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    cadastroAnaliseLimite: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    cadastroContrato: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO_CONVENIADA],
    },

    cadastroConvenioOdonto: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CONVENIO_ODONTO],
    },

    cadastroFerias: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
    },

    cadastroReciboFinanceiro: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.FINANCEIRO_CADASTRO],
    },

    cadastroReembolsoDespesa: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    consultaContrato: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO_CONVENIADA],
    },

    consultaFichaDesempedimento: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.DESEMPEDIMENTO],
    },

    consultaNotebook: {
        allowedGroups: [AD_GROUPS.SUPORTE],
    },

    consultaReciboFinanceiro: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.FINANCEIRO_CADASTRO],
    },

    gerenciamentoCargo: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
    },

    gerenciamentoConvenioOdonto: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CONVENIO_ODONTO],
    },

    gerenciamentoFerias: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
    },

    gerenciamentoFuncionario: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
    },

    gerenciamentoParticipacao: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.TODO_MUNDO],
    },

    gerenciamentoPosicao: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
    },

    gerenciamentoSetor: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH_INTRANET],
    },

    gerenciamentoValorConvenioOdonto: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.GERENCIAR_CONVENIO_ODONTO],
    },

    producaoMetaCooperativaPa: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.META_PA],
    },

    producaoMetaFuncionario: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.META_PA],
    },

    relatorioConvenioOdonto: {
        allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.GERENCIAR_CONVENIO_ODONTO],
    },

    termosMensaisCaixa: {
        allowedGroups: [AD_GROUPS.TERMOS_MENSAIS_CAIXA, AD_GROUPS.SUPORTE]
    }


} satisfies Record<string, AccessRule>;