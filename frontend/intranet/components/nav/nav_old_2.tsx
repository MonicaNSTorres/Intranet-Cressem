"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    FaHome,
    FaBirthdayCake,
    FaClipboardCheck,
    FaMoneyBillWave,
    FaSignature,
    FaCalculator,
    FaFileInvoiceDollar,
    FaUserSlash,
    FaPlaneDeparture,
    FaFileAlt,
    FaFolderOpen,
    FaHandshake,
    FaUsersCog,
    FaUmbrellaBeach,
    FaLaptop,
    FaBullhorn,
    FaChartBar,
    FaKey,
    FaIdCard,
    FaChartLine,
    FaUserFriends,
    FaExternalLinkAlt,
    FaBars,
    FaCashRegister,
    FaArchive,
    FaPenSquare,
    FaNetworkWired,
    FaFilePdf
} from "react-icons/fa";
import { Circle } from "lucide-react";
import styles from "./nav.module.css";
import { useMe } from "@/hooks/use-me";
import { PAGE_ACCESS, canAccess } from "@/lib/access-control";

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isAnaliseLimiteOpen, setIsAnaliseLimiteOpen] = useState(false);
    const [isDespesasViagensOpen, setIsDespesasViagensOpen] = useState(false);
    const [isFormsCadastroOpen, setIsFormsCadastroOpen] = useState(false);
    const [isFormsEmprestimosOpen, setIsFormsEmprestimosOpen] = useState(false);
    const [isFormsRhOpen, setIsFormsRhOpen] = useState(false);
    const [isGerArqOpen, setIsGerArqOpen] = useState(false);
    const [isGerContratosOpen, setIsGerContratosOpen] = useState(false);
    const [isGerConveniosOpen, setIsGerConveniosOpen] = useState(false);
    const [isGerFuncionariosOpen, setIsGerFuncionariosOpen] = useState(false);
    const [isGerFeriasOpen, setIsGerFeriasOpen] = useState(false);
    const [isGerNotebookOpen, setIsGerNotebookOpen] = useState(false);
    const [isGerMarketingOpen, setIsGerMarketingOpen] = useState(false);
    const [isProcessosGedOpen, setIsProcessosGedOpen] = useState(false);
    const [isRecibosOpen, setIsRecibosOpen] = useState(false);
    const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);

    const meResult = useMe() as any;

    const usuarioLogado =
        meResult?.user ??
        meResult?.me ??
        meResult?.data ??
        meResult?.usuario ??
        null;

    const loadingPermissions = Boolean(
        meResult?.loading ??
        meResult?.isLoading ??
        meResult?.pending
    );

    useEffect(() => {
        setIsClient(true);
    }, []);

    const toggleSidebar = () => setIsOpen(!isOpen);
    const closeSidebar = () => setIsOpen(false);

    if (!isClient || loadingPermissions) return null;

    const pathname = (typeof window !== "undefined" ? window.location.pathname : "") as string;

    const isActive = (path: string) => {
        const active = pathname === path || (path !== "/auth/home" && pathname?.startsWith(path));
        return active ? "bg-secondary text-white" : "text-gray-400";
    };

    const isAnyActive = (paths: string[]) =>
        paths.some((p) => pathname === p || pathname?.startsWith(p));

    const itemClass = (path: string) =>
        `flex items-center rounded-md hover:text-white transition-colors duration-200 ${isOpen
            ? `space-x-4 p-3 justify-start ${isActive(path)}`
            : `justify-center p-3 ${isActive(path)}`
        }`;

    const groupButtonClass = (active: boolean) =>
        `w-full flex items-center rounded-md hover:text-white transition-colors duration-200 ${isOpen
            ? `space-x-4 p-3 justify-start ${active ? "bg-secondary text-white" : "text-gray-400"}`
            : `justify-center p-3 ${active ? "bg-secondary text-white" : "text-gray-400"}`
        }`;

    const subItemClass = (path: string) =>
        `flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(path)}`;

    const externalItemClass =
        `flex items-center rounded-md hover:text-white transition-colors duration-200 ${isOpen ? "space-x-4 p-3 justify-start text-gray-400" : "justify-center p-3 text-gray-400"
        }`;

    const canViewDocusign = canAccess(usuarioLogado, PAGE_ACCESS.docusign);
    const canViewAnaliseLimite = canAccess(usuarioLogado, PAGE_ACCESS.analiseLimite);
    const canViewAuditoria = canAccess(usuarioLogado, PAGE_ACCESS.auditoria);
    const canViewChequeEspecial = canAccess(usuarioLogado, PAGE_ACCESS.chequeEspecial);
    const canViewMigracaoContrato = canAccess(usuarioLogado, PAGE_ACCESS.migracaoContrato);
    const canViewFichaDesimpedimento = canAccess(usuarioLogado, PAGE_ACCESS.fichaDesimpedimento);
    const canViewRecibos = canAccess(usuarioLogado, PAGE_ACCESS.recibosFinanceiros);
    const canViewContratos = canAccess(usuarioLogado, PAGE_ACCESS.contratos);
    const canViewConvenioCadastro = canAccess(usuarioLogado, PAGE_ACCESS.convenioCadastro);
    const canViewFuncionarios = canAccess(usuarioLogado, PAGE_ACCESS.funcionarios);
    const canViewFerias = canAccess(usuarioLogado, PAGE_ACCESS.ferias);
    const canViewNotebook = canAccess(usuarioLogado, PAGE_ACCESS.notebook);
    const canViewMarketing = canAccess(usuarioLogado, PAGE_ACCESS.marketing);
    const canViewRelatorios = canAccess(usuarioLogado, PAGE_ACCESS.relatorios);
    const canViewTermoTI = canAccess(usuarioLogado, PAGE_ACCESS.termoResponsabilidadeTI);
    const canViewTabelaSisbr = canAccess(usuarioLogado, PAGE_ACCESS.tabelaSisbrTi);
    const canViewPopupAviso = canAccess(usuarioLogado, PAGE_ACCESS.popupAviso);
    const canViewSimuladorInvestimento = canAccess(usuarioLogado, PAGE_ACCESS.simuladorInvestimento);

    return (
        <aside
            className={`${isOpen ? "w-[280px]" : "w-20"
                } sticky top-0 self-start h-screen shrink-0 overflow-hidden bg-gray-900 text-gray-400 flex flex-col transition-all duration-300`}
        >
            <div className={`flex justify-center items-center ${isOpen ? "p-4" : "p-3"}`}>
                {/*isOpen ? (
                    <div className={`${styles.logoCressem} justify-center text-center items-center flex`} />
                ) : (
                    <div className={`${styles.logoCressemIcon} justify-center text-center items-center flex`} />
                )*/}
                <Link
                    href="/auth/home"
                    onClick={closeSidebar}
                    className={`flex justify-center items-center ${isOpen ? "p-1" : "p-1"} w-full`}
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
                className={`flex-1 min-h-0 ${isOpen ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
                    }`}
            >
                <ul className={`${isOpen ? "space-y-2 p-4" : "space-y-3 px-2 py-4"}`}>
                    {/*Home*/}
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

                    {/*Telas Intranet*/}
                    <li>
                        <Link
                            href="/auth/links_uteis"
                            onClick={closeSidebar}
                            className={itemClass("/auth/links_uteis")}
                            title={!isOpen ? "Telas Intranet" : undefined}
                        >
                            <FaExternalLinkAlt className="text-2xl shrink-0" />
                            {isOpen && <span>Telas Intranet</span>}
                        </Link>
                    </li>

                    {/*Popup aviso*/}
                    {canViewPopupAviso && (
                        <li>
                            <Link
                                href="/auth/popup_aviso"
                                onClick={closeSidebar}
                                className={itemClass("/auth/popup_aviso")}
                                title={!isOpen ? "Popup Cadastro" : undefined}
                            >
                                <FaBullhorn className="text-2xl shrink-0" />
                                {isOpen && <span>Popup Cadastro</span>}
                            </Link>
                        </li>
                    )}

                    {/*Analise de Limite
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsAnaliseLimiteOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/cadastro_analise_limite", "/auth/consulta_analise_limite"])
                            )}
                            title={!isOpen ? "Analise de Limite" : undefined}
                        >
                            <FaChartLine className="text-2xl shrink-0" />
                            {isOpen && <span>Analise de Limite</span>}
                        </button>

                        {isOpen && isAnaliseLimiteOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/cadastro_analise_limite"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/cadastro_analise_limite")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cadastro</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/consulta_analise_limite"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/consulta_analise_limite")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consulta</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Aniversariantes*/}
                    <li>
                        <Link
                            href="/auth/aniversariantes"
                            onClick={closeSidebar}
                            className={itemClass("/auth/aniversariantes")}
                            title={!isOpen ? "Aniversariantes" : undefined}
                        >
                            <FaBirthdayCake className="text-2xl shrink-0" />
                            {isOpen && <span>Aniversariantes</span>}
                        </Link>
                    </li>

                    <li>
                        <Link
                            href="/auth/juntar_pdf"
                            onClick={closeSidebar}
                            className={itemClass("/auth/juntar_pdf")}
                            title={!isOpen ? "Juntar PDF" : undefined}
                        >
                            <FaFilePdf className="text-2xl shrink-0" />
                            {isOpen && <span>Juntar PDF</span>}
                        </Link>
                    </li>


                    {/*Auditoria
                    <li>
                        <Link
                            href="/auth/auditoria"
                            onClick={closeSidebar}
                            className={itemClass("/auth/auditoria")}
                            title={!isOpen ? "Auditoria" : undefined}
                        >
                            <FaClipboardCheck className="text-2xl shrink-0" />
                            {isOpen && <span>Auditoria</span>}
                        </Link>
                    </li>*/}

                    {/*Antecipação de Capital
                    <li>
                        <Link
                            href="/auth/antecipacao_capital"
                            onClick={closeSidebar}
                            className={itemClass("/auth/antecipacao_capital")}
                            title={!isOpen ? "Antecipação de Capital" : undefined}
                        >
                            <FaMoneyBillWave className="text-2xl shrink-0" />
                            {isOpen && <span>Antecipação de Capital</span>}
                        </Link>
                    </li>*/}

                    {/*Assinatura E-mail*/}
                    <li>
                        <Link
                            href="/auth/assinatura_email"
                            onClick={closeSidebar}
                            className={itemClass("/auth/assinatura_email")}
                            title={!isOpen ? "Assinatura E-mail" : undefined}
                        >
                            <FaSignature className="text-2xl shrink-0" />
                            {isOpen && <span>Assinatura E-mail</span>}
                        </Link>
                    </li>

                    {/*Calculadora de Juros Cartão*/}
                    <li>
                        <Link
                            href="/auth/calculadora_juros_cartao"
                            onClick={closeSidebar}
                            className={itemClass("/auth/calculadora_juros_cartao")}
                            title={!isOpen ? "Calculadora de Juros Cartão" : undefined}
                        >
                            <FaCalculator className="text-2xl shrink-0" />
                            {isOpen && <span>Calculadora de Juros Cartão</span>}
                        </Link>
                    </li>

                    {/*Simulador de investimento*/}
                    {canViewSimuladorInvestimento && (
                        <li>
                            <Link
                                href="/auth/simulador_investimento"
                                onClick={closeSidebar}
                                className={itemClass("/auth/simulador_investimento")}
                                title={!isOpen ? "Simulador de Investimento" : undefined}
                            >
                                <FaCashRegister className="text-2xl shrink-0" />
                                {isOpen && <span>Simulador de Investimento</span>}
                            </Link>
                        </li>
                    )}

                    {/*Cheque Especial
                    <li>
                        <Link
                            href="/auth/cheque_especial"
                            onClick={closeSidebar}
                            className={itemClass("/auth/cheque_especial")}
                            title={!isOpen ? "Cheque Especial" : undefined}
                        >
                            <FaFileInvoiceDollar className="text-2xl shrink-0" />
                            {isOpen && <span>Cheque Especial</span>}
                        </Link>
                    </li>*/}

                    {/*Declaração de Rendimentos
                    <li>
                        <Link
                            href="/auth/declaracao_rendimentos"
                            onClick={closeSidebar}
                            className={itemClass("/auth/declaracao_rendimentos")}
                            title={!isOpen ? "Declaração de Rendimentos" : undefined}
                        >
                            <FaFileAlt className="text-2xl shrink-0" />
                            {isOpen && <span>Declaração de Rendimentos</span>}
                        </Link>
                    </li>*/}

                    {/*Demissão
                    <li>
                        <Link
                            href="/auth/demissao"
                            onClick={closeSidebar}
                            className={itemClass("/auth/demissao")}
                            title={!isOpen ? "Demissão" : undefined}
                        >
                            <FaUserSlash className="text-2xl shrink-0" />
                            {isOpen && <span>Demissão</span>}
                        </Link>
                    </li>*/}

                    {/*Ficha de Desimpedimento
                    <li>
                        <Link
                            href="/auth/ficha_desimpedimento"
                            onClick={closeSidebar}
                            className={itemClass("/auth/ficha_desimpedimento")}
                            title={!isOpen ? "Ficha de Desimpedimento" : undefined}
                        >
                            <FaPenSquare className="text-2xl shrink-0" />
                            {isOpen && <span>Ficha de Desimpedimento</span>}
                        </Link>
                    </li>*/}

                    {/*Despesas/Viagens
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsDespesasViagensOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/cadastro_reembolso_despesa", "/auth/gerenciamento_reembolso_despesa"])
                            )}
                            title={!isOpen ? "Despesas/Viagens" : undefined}
                        >
                            <FaPlaneDeparture className="text-2xl shrink-0" />
                            {isOpen && <span>Despesas/Viagens</span>}
                        </button>

                        {isOpen && isDespesasViagensOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/cadastro_reembolso_despesa"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/cadastro_reembolso_despesa")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Solicitação</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/gerenciamento_reembolso_despesa"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_reembolso_despesa")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Gerenciamento</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Docusign*/}
                    {canViewDocusign && (
                        <li>
                            <Link
                                href="/auth/docusign"
                                onClick={closeSidebar}
                                className={itemClass("/auth/docusign")}
                                title={!isOpen ? "Docusign" : undefined}
                            >
                                <FaArchive className="text-2xl shrink-0" />
                                {isOpen && <span>Docusign</span>}
                            </Link>
                        </li>
                    )}

                    {/*Empréstimo Consignado
                    <li>
                        <Link
                            href="/auth/emprestimo_consignado"
                            onClick={closeSidebar}
                            className={itemClass("/auth/emprestimo_consignado")}
                            title={!isOpen ? "Empréstimo Consignado" : undefined}
                        >
                            <FaFileInvoiceDollar className="text-2xl shrink-0" />
                            {isOpen && <span>Empréstimo Consignado</span>}
                        </Link>
                    </li>*/}

                    {/*Formulários de Cadastro
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsFormsCadastroOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive([
                                    "/auth/capital",
                                    "/auth/declaracao_residencia",
                                    "/auth/ficha_desimpedimento",
                                    "/auth/procuracao_ortugante",
                                    "/auth/renuncia_procurador",
                                    "/auth/tabela_integralizacao",
                                ])
                            )}
                            title={!isOpen ? "Formulários de Cadastro" : undefined}
                        >
                            <FaIdCard className="text-2xl shrink-0" />
                            {isOpen && <span>Formulários de Cadastro</span>}
                        </button>

                        {isOpen && isFormsCadastroOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/alteracao_capital"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/alteracao_capital")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Alteração de Capital</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/declaracao_residencia"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/declaracao_residencia")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Declaração de Residência</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/ficha_desimpedimento"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/ficha_desimpedimento")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Ficha de Desimpedimento</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/procuracao_ortugante"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/procuracao_ortugante")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Procuração Ortugante PF/PJ</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/renuncia_procurador"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/renuncia_procurador")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Renúncia de Procurador</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/tabela_integralizacao"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/tabela_integralizacao")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Tabela de integralização</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Formulários de Empréstimos
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsFormsEmprestimosOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive([
                                    "/auth/adendo_contratual",
                                    "/auth/adiantamento_salarial",
                                    "/auth/autorizacao_debito",
                                    "/auth/margem_consignavel",
                                    "/auth/formulario_dps",
                                    "/auth/previsul",
                                    "/auth/simulador",
                                    "/auth/termo_garantia",
                                ])
                            )}
                            title={!isOpen ? "Formulários de Empréstimos" : undefined}
                        >
                            <FaFileAlt className="text-2xl shrink-0" />
                            {isOpen && <span>Formulários de Empréstimos</span>}
                        </button>

                        {isOpen && isFormsEmprestimosOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/adendo_contratual"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/adendo_contratual")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Adendo Contratual</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/adiantamento_salarial_emprestimo"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/adiantamento_salarial_emprestimo")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Adiantamento Salarial</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/autorizacao_debito"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/autorizacao_debito")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Autorização de Débito</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/margem_consignavel"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/margem_consignavel")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cálculo de Margem</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/formulario_dps"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/formulario_dps")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Formulário DPS</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/previsul"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/previsul")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Formulário Previsul</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/simulador_desconto"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/simulador_desconto")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Simulador de desconto</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/termo_garantia"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/termo_garantia")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Termo de Garantia</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Formulários de RH
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsFormsRhOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive([
                                    "/auth/adiantamento_salarial",
                                    "/auth/auxilio_cheche_baba",
                                    "/auth/bolsa_estudo",
                                    "/auth/reembolso_convenio_medico",
                                ])
                            )}
                            title={!isOpen ? "Formulários de RH" : undefined}
                        >
                            <FaUsersCog className="text-2xl shrink-0" />
                            {isOpen && <span>Formulários de RH</span>}
                        </button>

                        {isOpen && isFormsRhOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/adiantamento_salarial"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/adiantamento_salarial_rh")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Adiatamento Salarial</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/auxilio_creche"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/auxilio_creche")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Auxílio Creche/Babá</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/bolsa_estudo"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/bolsa_estudo")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Bolsa de Estudo</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/reembolso_convenio_medico"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/reembolso_convenio_medico")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Reembolso Convênio Médico</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Gerenciador de Arquivos
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsGerArqOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/aplica_marca_dagua", "/auth/conversor_arquivos", "/auth/juntar_pdf"])
                            )}
                            title={!isOpen ? "Gerenciador de Arquivos" : undefined}
                        >
                            <FaFolderOpen className="text-2xl shrink-0" />
                            {isOpen && <span>Gerenciador de Arquivos</span>}
                        </button>

                        {isOpen && isGerArqOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/aplica_marca_dagua"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/aplica_marca_dagua")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Aplica marca d&apos;agua</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/conversor_arquivos"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/conversor_arquivos")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Conversor Arquivos</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/juntar_pdf"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/juntar_pdf")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Juntar PDF</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Gerenciador de Contratos
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsGerContratosOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/cadastro_contratos", "/auth/consulta_contratos"])
                            )}
                            title={!isOpen ? "Gerenciador de Contratos" : undefined}
                        >
                            <FaHandshake className="text-2xl shrink-0" />
                            {isOpen && <span>Gerenciador de Contratos</span>}
                        </button>

                        {isOpen && isGerContratosOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/cadastro_contrato"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/cadastro_contratos")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cadastro</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/consulta_contratos"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/consulta_contratos")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consulta</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Gerenciador de Convênios
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsGerConveniosOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive([
                                    "/auth/cadastro_convenio_odonto",
                                    "/auth/gerenciamento_convenio_odonto",
                                    "/auth/gerenciamento_valor_convenio_odonto",
                                    "/auth/relatorio_convenio_odonto",
                                ])
                            )}
                            title={!isOpen ? "Gerenciador de Convênios" : undefined}
                        >
                            <FaUserFriends className="text-2xl shrink-0" />
                            {isOpen && <span>Gerenciador de Convênios</span>}
                        </button>

                        {isOpen && isGerConveniosOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/cadastro_convenio_odonto"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/cadastro_convenio_odonto")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cadastro</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/gerenciamento_convenio_odonto"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_convenio_odonto")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consulta</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/gerenciamento_valor_convenio_odonto"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_valor_convenio_odonto")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Gerenciar Valores</span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        href="/auth/relatorio_convenio_odonto"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/relatorio_convenio_odonto")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Relatórios</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Gerenciador de Funcionários
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsGerFuncionariosOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive([
                                    "/auth/gerenciamento_cargo",
                                    "/auth/gerenciamento_funcionario",
                                    "/auth/gerenciamento_posicao",
                                    "/auth/gerenciamento_setor",
                                ])
                            )}
                            title={!isOpen ? "Gerenciador de Funcionários" : undefined}
                        >
                            <FaUsersCog className="text-2xl shrink-0" />
                            {isOpen && <span>Gerenciador de Funcionários</span>}
                        </button>

                        {isOpen && isGerFuncionariosOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/gerenciamento_cargo"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_cargo")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cargos</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/gerenciamento_funcionario"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_funcionario")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Funcionários</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/gerenciamento_posicao"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_posicao")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Posições</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/gerenciamento_setor"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_setor")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Setores</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Gerenciador de Férias
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsGerFeriasOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/cadastro_ferias", "/auth/gerenciamento_ferias"])
                            )}
                            title={!isOpen ? "Gerenciador de Férias" : undefined}
                        >
                            <FaUmbrellaBeach className="text-2xl shrink-0" />
                            {isOpen && <span>Gerenciador de Férias</span>}
                        </button>

                        {isOpen && isGerFeriasOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/cadastro_ferias"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/cadastro_ferias")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cadastro</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/gerenciamento_ferias"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_ferias")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consulta</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Gerenciador de Notebook
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsGerNotebookOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/cadastro_notebook", "/auth/consulta_notebook"])
                            )}
                            title={!isOpen ? "Gerenciador de Notebook" : undefined}
                        >
                            <FaLaptop className="text-2xl shrink-0" />
                            {isOpen && <span>Gerenciador de Notebook</span>}
                        </button>

                        {isOpen && isGerNotebookOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/cadastro_notebook"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/cadastro_notebook")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cadastro</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/consulta_notebook"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/consulta_notebook")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consulta</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Gerenciador de Participação de Marketing
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsGerMarketingOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/solicitacao_participacao", "/auth/gerenciamento_participacao"])
                            )}
                            title={!isOpen ? "Gerenciador de Marketing" : undefined}
                        >
                            <FaBullhorn className="text-2xl shrink-0" />
                            {isOpen && <span>Gerenciador de Marketing</span>}
                        </button>

                        {isOpen && isGerMarketingOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/solicitacao_participacao"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/solicitacao_participacao")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Solicitações</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/gerenciamento_participacao"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/gerenciamento_participacao")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consulta</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Migração Contratos
                    <li>
                        <Link
                            href="/auth/migracao_contrato"
                            onClick={closeSidebar}
                            className={itemClass("/auth/migracao_contrato")}
                            title={!isOpen ? "Migração Contratos" : undefined}
                        >
                            <FaFileAlt className="text-2xl shrink-0" />
                            {isOpen && <span>Migração Contratos</span>}
                        </Link>
                    </li>*/}

                    {/*Processos GED
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsProcessosGedOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/assinatura_eletronica", "/auth/senha_sicoobnet"])
                            )}
                            title={!isOpen ? "Processos GED" : undefined}
                        >
                            <FaFolderOpen className="text-2xl shrink-0" />
                            {isOpen && <span>Processos GED</span>}
                        </button>

                        {isOpen && isProcessosGedOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/assinatura_eletronica"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/assinatura_eletronica")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>GED no App</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/senha_sicoobnet"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/senha_sicoobnet")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Senha não correntista App</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Ramal*/}
                    <li>
                        <Link
                            href="/auth/ramais"
                            onClick={closeSidebar}
                            className={itemClass("/auth/ramais")}
                            title={!isOpen ? "Ramal" : undefined}
                        >
                            <FaUsersCog className="text-2xl shrink-0" />
                            {isOpen && <span>Ramal</span>}
                        </Link>
                    </li>

                    {/*RCO
                    <li>
                        <Link
                            href="/auth/rco"
                            onClick={closeSidebar}
                            className={itemClass("/auth/rco")}
                            title={!isOpen ? "RCO" : undefined}
                        >
                            <FaChartLine className="text-2xl shrink-0" />
                            {isOpen && <span>RCO</span>}
                        </Link>
                    </li>*/}

                    {/*Recibos Financeiros
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsRecibosOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/cadastro_recibo_financeiro", "/auth/consulta_recibo_financeiro"])
                            )}
                            title={!isOpen ? "Recibos Financeiros" : undefined}
                        >
                            <FaFileInvoiceDollar className="text-2xl shrink-0" />
                            {isOpen && <span>Recibos Financeiros</span>}
                        </button>

                        {isOpen && isRecibosOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li>
                                    <Link
                                        href="/auth/cadastro_recibo_financeiro"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/cadastro_recibo_financeiro")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Cadastro</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/auth/consulta_recibo_financeiro"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/consulta_recibo_financeiro")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consulta</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Relação de Faturamento
                    <li>
                        <Link
                            href="/auth/relacao_faturamento"
                            onClick={closeSidebar}
                            className={itemClass("/auth/relacao_faturamento")}
                            title={!isOpen ? "Relação de Faturamento" : undefined}
                        >
                            <FaChartBar className="text-2xl shrink-0" />
                            {isOpen && <span>Relação de Faturamento</span>}
                        </Link>
                    </li>*/}

                    {/*Relatórios
                    <li>
                        <button
                            type="button"
                            onClick={() => setIsRelatoriosOpen((v) => !v)}
                            className={groupButtonClass(
                                isAnyActive(["/auth/producao_meta_cooperativa_pa", "/auth/producao_meta_cooperativa_macro"])
                            )}
                            title={!isOpen ? "Relatórios" : undefined}
                        >
                            <FaChartBar className="text-2xl shrink-0" />
                            {isOpen && <span>Relatórios</span>}
                        </button>

                        {isOpen && isRelatoriosOpen && (
                            <ul className="mt-1 ml-10 space-y-1">
                                <li className="hidden">
                                    <Link
                                        href="/auth/producao_meta_cooperativa_pa"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/producao_meta_cooperativa_pa")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consolidado/Meta/PA</span>
                                    </Link>
                                </li>

                                <li className="hidden">
                                    <Link
                                        href="/auth/producao_meta_cooperativa_macro"
                                        onClick={closeSidebar}
                                        className={subItemClass("/auth/producao_meta_cooperativa_macro")}
                                    >
                                        <span className="text-base"><Circle size={14} /></span>
                                        <span>Consolidado/Meta/Macro</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>*/}

                    {/*Reset de Senha e-mail Sicoob*/}
                    <li>
                        <a
                            href="https://sistemas.sisbr.coop.br/mtse/login"
                            target="_blank"
                            rel="noreferrer"
                            className={externalItemClass}
                            title="Reset de Senha e-mail"
                        >
                            <FaKey className="text-2xl shrink-0" />
                            {isOpen && <span>Reset de Senha e-mail</span>}
                        </a>
                    </li>

                    {/*Resgate Capital
                    <li>
                        <Link
                            href="/auth/resgate_capital"
                            onClick={closeSidebar}
                            className={itemClass("/auth/resgate_capital")}
                            title={!isOpen ? "Resgate Capital" : undefined}
                        >
                            <FaMoneyBillWave className="text-2xl shrink-0" />
                            {isOpen && <span>Resgate Capital</span>}
                        </Link>
                    </li>*/}

                    {/*Simulador de Investimento*/}
                    <li className="hidden">
                        <Link
                            href="/auth/simulador_investimento"
                            onClick={closeSidebar}
                            className={itemClass("/auth/simulador_investimento")}
                            title={!isOpen ? "Simulador de Investimento" : undefined}
                        >
                            <FaChartLine className="text-2xl shrink-0" />
                            {isOpen && <span>Simulador de Investimento</span>}
                        </Link>
                    </li>

                    {/*Termo de Responsabilidade TI
                    <li>
                        <Link
                            href="/auth/termo_responsabilidade_uso"
                            onClick={closeSidebar}
                            className={itemClass("/auth/termo_responsabilidade_uso")}
                            title={!isOpen ? "Termo de Responsabilidade TI" : undefined}
                        >
                            <FaFileAlt className="text-2xl shrink-0" />
                            {isOpen && <span>Termo de Responsabilidade TI</span>}
                        </Link>
                    </li>*/}

                    {/*Tabela Sisbr TI
                    <li>
                        <Link
                            href="/auth/tabela_sisbr_ti"
                            onClick={closeSidebar}
                            className={itemClass("/auth/tabela_sisbr_ti")}
                            title={!isOpen ? "Tabela Sisbr TI" : undefined}
                        >
                            <FaNetworkWired className="text-2xl shrink-0" />
                            {isOpen && <span>Tabela Sisbr TI</span>}
                        </Link>
                    </li>*/}

                    {/*Placeholder
                    <li className="hidden pt-2">
                        <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className={externalItemClass}
                            title="Sistemas Externos (placeholder)"
                        >
                            <FaExternalLinkAlt className="text-2xl shrink-0" />
                            {isOpen && <span>Sistemas Externos</span>}
                        </a>
                    </li>*/}
                </ul>
            </div>
        </aside>
    );
};

export default Sidebar;