import {
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
  FaAddressBook,
} from "react-icons/fa";

import { AD_GROUPS } from "@/config/ad-groups";
import { ACCESS_LISTS } from "@/lib/authorization";

export const links = [
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
    allowedUsers: ACCESS_LISTS.CHEQUE_ESPECIAL,
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
    allowedUsers: [...ACCESS_LISTS.SECRETARIA, ...ACCESS_LISTS.DIRETORIA],
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