"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
} from "react-icons/fa";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
  icon: any;
  children: MenuChild[];
};

function hasAnyGroup(userGroups: string[], allowedGroups?: string[]) {
  if (!allowedGroups?.length) return true;
  return allowedGroups.some((group) => userGroups.includes(group));
}

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedMenuKey, setSelectedMenuKey] = useState<string | null>(null);

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

  useEffect(() => {
    setSelectedMenuKey(null);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedMenuKey(null);
      }
      return next;
    });
  };

  const closeSidebar = () => {
    setIsOpen(false);
    setSelectedMenuKey(null);
  };

  const toggleMenu = (key: string) => {
    if (!isOpen) return;

    setSelectedMenuKey((prev) => (prev === key ? null : key));
  };

  const userGroups = Array.isArray(usuarioLogado?.grupos)
    ? usuarioLogado.grupos
    : [];

  const isActive = (path: string) => {
    const active =
      pathname === path || (path !== "/auth/home" && pathname?.startsWith(path));
    return active ? "bg-secondary text-white" : "text-gray-400";
  };

  const isAnyActive = (paths: string[]) =>
    paths.some((p) => pathname === p || pathname?.startsWith(p));

  const itemClass = (path: string) =>
    `flex items-center rounded-md hover:text-white transition-colors duration-200 ${
      isOpen
        ? `space-x-4 p-3 justify-start ${isActive(path)}`
        : `justify-center p-3 ${isActive(path)}`
    }`;

  const groupButtonClass = (active: boolean) =>
    `w-full flex items-center rounded-md hover:text-white transition-colors duration-200 ${
      isOpen
        ? `space-x-4 p-3 justify-start ${
            active ? "bg-secondary text-white" : "text-gray-400"
          }`
        : `justify-center p-3 ${
            active ? "bg-secondary text-white" : "text-gray-400"
          }`
    }`;

  const panelItemClass = (path: string) =>
    `flex items-center justify-between gap-3 py-2 px-3 rounded-md transition-colors duration-200 ${
      pathname === path || pathname?.startsWith(path)
        ? "bg-secondary text-white"
        : "text-gray-400 hover:text-white hover:bg-white/10"
    }`;

  const menuGroups: MenuGroup[] = [
    {
      key: "agencia",
      label: "Agência",
      icon: FaCashRegister,
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
      ],
    },
    {
      key: "arquivos",
      label: "Arquivos",
      icon: FaFolderOpen,
      children: [
        {
          label: "Gerenciador de Arquivo",
          href: "/auth/juntar_pdf",
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
      children: [
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
      children: [
        {
          label: "Ficha de Desimpedimento",
          href: "/auth/ficha_desimpedimento",
          allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
        },
        {
          label: "Gerenciador de Convênios",
          href: "/auth/gerenciamento_convenio_odonto",
          allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.CADASTRO],
        },
      ],
    },
    {
      key: "consulta",
      label: "Consulta",
      icon: FaUsersCog,
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
      ],
    },
    {
      key: "formularios-capital",
      label: "Formulários Capital",
      icon: FaMoneyBillWave,
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
      ],
    },
    {
      key: "formularios-rh",
      label: "Formulários RH",
      icon: FaUsersCog,
      children: [
        {
          label: "Formulários de RH",
          href: "/auth/adiantamento_salarial",
          allowedGroups: [AD_GROUPS.SUPORTE, AD_GROUPS.RH],
        },
      ],
    },
    {
      key: "formularios-financeiro",
      label: "Formulários Financeiro",
      icon: FaFileInvoiceDollar,
      children: [
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
      ],
    },
    {
      key: "rh",
      label: "RH",
      icon: FaUmbrellaBeach,
      children: [
        {
          label: "Gerenciador de Funcionários",
          href: "/auth/gerenciamento_funcionario",
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
          label: "Tabela Sisbr TI",
          href: "/auth/tabela_sisbr_ti",
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

  const selectedMenu = useMemo(() => {
    if (!selectedMenuKey) return null;
    return visibleMenuGroups.find((group) => group.key === selectedMenuKey) ?? null;
  }, [selectedMenuKey, visibleMenuGroups]);

  if (!isClient || loadingPermissions) return null;

  return (
    <>
      <aside
        className={`${
          isOpen ? "w-80" : "w-20"
        } sticky top-0 self-start h-screen shrink-0 overflow-hidden bg-gray-900 text-gray-400 flex flex-col transition-all duration-300`}
      >
        <div className={`flex justify-center items-center ${isOpen ? "p-4" : "p-3"}`}>
          <Link
            href="/auth/home"
            onClick={closeSidebar}
            className="flex justify-center items-center w-full p-1"
            title="Ir para a Home"
          >
            {isOpen ? (
              <div className={`${styles.logoCressem} flex justify-center items-center w-full h-10`} />
            ) : (
              <div className={`${styles.logoCressemIcon} flex justify-center items-center w-10 h-10`} />
            )}
          </Link>
        </div>

        <button
          onClick={toggleSidebar}
          className="mx-2 mb-2 flex items-center justify-center h-12 rounded-md cursor-pointer transition-colors duration-200 hover:bg-white/10"
          title={isOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isOpen ? (
            <span className="text-sm text-gray-300">Menu</span>
          ) : (
            <FaBars size={20} color="#9B9B9B" />
          )}
        </button>

        <div
          className={`flex-1 min-h-0 ${
            isOpen ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
          }`}
        >
          <ul className={`${isOpen ? "space-y-2 p-4" : "space-y-3 px-2 py-4"}`}>
            <li>
              <Link
                href="/auth/home"
                onClick={closeSidebar}
                className={itemClass("/auth/home")}
                title={!isOpen ? "Home" : undefined}
              >
                <FaHome className="text-2xl shrink-0" />
                {isOpen && <span>Home</span>}
              </Link>
            </li>

            {visibleMenuGroups.map((group) => {
              const GroupIcon = group.icon;
              const groupPaths = group.children.map((child) => child.href);
              const isGroupActive = isAnyActive(groupPaths);
              const isGroupSelected = selectedMenuKey === group.key;

              return (
                <li key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleMenu(group.key)}
                    className={groupButtonClass(isGroupActive || isGroupSelected)}
                    title={!isOpen ? group.label : undefined}
                  >
                    <GroupIcon className="text-2xl shrink-0" />

                    {isOpen ? (
                      <>
                        <span className="whitespace-nowrap flex-1 text-left">
                          {group.label}
                        </span>
                        <ChevronRight
                          size={16}
                          className={`shrink-0 transition-transform duration-200 ${
                            isGroupSelected ? "rotate-90" : ""
                          }`}
                        />
                      </>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {isOpen && selectedMenu && (
        <div
          className="fixed top-0 left-70 z-50 h-screen w-70 bg-gray-900 text-white shadow-xl border-l border-white/10"
        >
          <div className="flex h-full flex-col py-6 px-4">
            <button
              type="button"
              onClick={() => setSelectedMenuKey(null)}
              className="mb-6 flex items-center gap-2 text-left text-white hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-base font-semibold">{selectedMenu.label}</span>
            </button>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <ul className="space-y-2">
                {selectedMenu.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      onClick={closeSidebar}
                      className={panelItemClass(child.href)}
                    >
                      <span className="text-sm">{child.label}</span>
                      <ChevronRight size={16} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;