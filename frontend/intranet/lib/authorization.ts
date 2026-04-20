import { AD_GROUPS } from "@/config/ad-groups";

type UserLike = {
  nome?: string;
  nome_completo?: string;
  grupos?: string[];
  department?: string;
  isManagerOrDirector?: boolean;
};

type AccessRule = {
  allowedGroups?: string[];
  allowedUsers?: string[];
  requiresManagerOrDirector?: boolean;
};

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

export const ACCESS_LISTS = {
  SECRETARIA,
  DIRETORIA,
  CHEQUE_ESPECIAL,
  ACESSO_DOCUSIGN,
};

function normalizeName(name?: string) {
  return String(name || "").trim().toUpperCase();
}

export function hasGroup(user: UserLike | null | undefined, group: string) {
  if (!user?.grupos?.length) return false;
  return user.grupos.includes(group);
}

export function hasAnyGroup(user: UserLike | null | undefined, groups?: string[]) {
  if (!groups?.length) return true;
  if (!user?.grupos?.length) return false;
  return groups.some((group) => user.grupos!.includes(group));
}

export function isAllowedUser(user: UserLike | null | undefined, users?: string[]) {
  if (!users?.length) return false;
  const nome = normalizeName(user?.nome_completo || user?.nome);
  return users.some((allowed) => normalizeName(allowed) === nome);
}

export function canAccess(
  user: UserLike | null | undefined,
  rule?: AccessRule
) {
  if (!rule) return true;

  const byGroup = rule.allowedGroups?.length
    ? hasAnyGroup(user, rule.allowedGroups)
    : false;

  const byUser = rule.allowedUsers?.length
    ? isAllowedUser(user, rule.allowedUsers)
    : false;

  const byManager = rule.requiresManagerOrDirector
    ? Boolean(user?.isManagerOrDirector)
    : false;

  const hasExplicitRules =
    Boolean(rule.allowedGroups?.length) ||
    Boolean(rule.allowedUsers?.length) ||
    Boolean(rule.requiresManagerOrDirector);

  if (!hasExplicitRules) return true;

  return byGroup || byUser || byManager;
}

export { AD_GROUPS };