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
  FaNetworkWired
} from "react-icons/fa";
import { Circle } from "lucide-react";
import styles from "./nav.module.css";


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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  if (!isClient) return null;//evita mismatch no ssr

  const pathname = (typeof window !== "undefined" ? window.location.pathname : "") as string;

  const isActive = (path: string) => {
    const active = pathname === path || (path !== "/auth/home" && pathname?.startsWith(path));
    return active ? "bg-secondary text-white" : "text-gray-400";
  };

  const isAnyActive = (paths: string[]) => paths.some((p) => pathname === p || pathname?.startsWith(p));

  return (
    <div
      className={`${isOpen ? "w-84" : "w-20"} bg-gray-900 text-gray-400 flex flex-col transition-all duration-300 h-screen`}
    >
      <div className="flex justify-center items-center p-4">
        {isOpen ? (
          <div className={`${styles.logoCressem} justify-center text-center items-center flex`} />
        ) : (
          <div className={`${styles.logoCressemIcon} justify-center text-center items-center flex`} />
        )}
      </div>

      {/*toggle*/}
      <button onClick={toggleSidebar} className="flex items-center justify-center h-15 cursor-pointer">
        {isOpen ? "Menu" : <FaBars size={20} color="#9B9B9B" />}
      </button>

      <div
        className={
          `flex-1 min-h-0 ` + //min-h-0 e importante pra flex permitir scroll
          (isOpen ? "overflow-y-auto" : "overflow-y-visible")
        }
      >
        <ul className="space-y-2 p-4">
          {/*Home*/}
          <li>
            <Link href="/auth/home" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/home"
                )}`}
              >
                <FaHome className="text-2xl" />
                {isOpen && <span>Home</span>}
              </a>
            </Link>
          </li>

          {/*Analise de Limite (grupo) - enabled false no seu menu (manteve escondido)*/}
          {/*para mostrar, é só remover o "hidden"*/}
          <li className="hidden">
            <button
              type="button"
              onClick={() => setIsAnaliseLimiteOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/cadastro_analise_limite", "/auth/consulta_analise_limite"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaChartLine className="text-2xl" />
              {isOpen && <span>Analise de Limite</span>}
            </button>

            {isOpen && isAnaliseLimiteOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/cadastro_analise_limite" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/cadastro_analise_limite"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cadastro</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/consulta_analise_limite" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/consulta_analise_limite"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consulta</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Aniversariantes*/}
          <li>
            <Link href="/auth/aniversariantes" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/aniversariantes"
                )}`}
              >
                <FaBirthdayCake className="text-2xl" />
                {isOpen && <span>Aniversariantes</span>}
              </a>
            </Link>
          </li>

          {/*Auditoria*/}
          <li>
            <Link href="/auth/auditoria" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/auditoria"
                )}`}
              >
                <FaClipboardCheck className="text-2xl" />
                {isOpen && <span>Auditoria</span>}
              </a>
            </Link>
          </li>

          {/*Antecipação de Capital*/}
          <li>
            <Link href="/auth/antecipacao_capital" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/antecipacao_capital"
                )}`}
              >
                <FaMoneyBillWave className="text-2xl" />
                {isOpen && <span>Antecipação de Capital</span>}
              </a>
            </Link>
          </li>

          {/*Assinatura E-mail*/}
          <li>
            <Link href="/auth/assinatura_email" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/assinatura_email"
                )}`}
              >
                <FaSignature className="text-2xl" />
                {isOpen && <span>Assinatura E-mail</span>}
              </a>
            </Link>
          </li>

          {/*Calculadora de Juros Cartão*/}
          <li>
            <Link href="/auth/calculadora_juros_cartao" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/calculadora_juros_cartao"
                )}`}
              >
                <FaCalculator className="text-2xl" />
                {isOpen && <span>Calculadora de Juros Cartão</span>}
              </a>
            </Link>
          </li>

          {/*Simulador de investimento*/}
          <li>
            <Link href="/auth/simulador_investimento" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/simulador_investimento"
                )}`}
              >
                <FaCashRegister className="text-2xl" />
                {isOpen && <span>Simulador de Investimento</span>}
              </a>
            </Link>
          </li>

          {/*Cheque Especial className="hidden"*/}
          <li>
            <Link href="/auth/cheque_especial" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/cheque_especial"
                )}`}
              >
                <FaFileInvoiceDollar className="text-2xl" />
                {isOpen && <span>Cheque Especial</span>}
              </a>
            </Link>
          </li>

          {/*Declaração de Rendimentos*/}
          <li>
            <Link href="/auth/declaracao_rendimentos" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/declaracao_rendimentos"
                )}`}
              >
                <FaFileAlt className="text-2xl" />
                {isOpen && <span>Declaração de Rendimentos</span>}
              </a>
            </Link>
          </li>

          {/*Demissão*/}
          <li>
            <Link href="/auth/demissao" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/demissao"
                )}`}
              >
                <FaUserSlash className="text-2xl" />
                {isOpen && <span>Demissão</span>}
              </a>
            </Link>
          </li>

          {/*Ficha de Desimpedimento*/}
          <li>
            <Link href="/auth/ficha_desimpedimento" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/ficha_desimpedimento"
                )}`}
              >
                <FaPenSquare className="text-2xl" />
                {isOpen && <span>Ficha de Desimpedimento</span>}
              </a>
            </Link>
          </li>

          {/*Despesas/Viagens (grupo)*/}
          <li>
            <button
              type="button"
              onClick={() => setIsDespesasViagensOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/cadastro_reembolso_despesa", "/auth/gerenciamento_reembolso_despesa"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaPlaneDeparture className="text-2xl" />
              {isOpen && <span>Despesas/Viagens</span>}
            </button>

            {isOpen && isDespesasViagensOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/cadastro_reembolso_despesa" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/cadastro_reembolso_despesa"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Solicitação</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/gerenciamento_reembolso_despesa" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_reembolso_despesa"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Gerenciamento</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Docusign*/}
          <li>
            <Link href="/auth/docusign" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/docusign"
                )}`}
              >
                <FaArchive className="text-2xl" />
                {isOpen && <span>Docusign</span>}
              </a>
            </Link>
          </li>

          {/*Empréstimo Consignado*/}
          <li>
            <Link href="/auth/emprestimo_consignado" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/emprestimo_consignado"
                )}`}
              >
                <FaFileInvoiceDollar className="text-2xl" />
                {isOpen && <span>Empréstimo Consignado</span>}
              </a>
            </Link>
          </li>

          {/*Formulários de Cadastro (grupo)*/}
          <li>
            <button
              type="button"
              onClick={() => setIsFormsCadastroOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive([
                "/auth/capital",
                "/auth/declaracao_residencia",
                "/auth/ficha_desimpedimento",
                "/auth/procuracao_ortugante",
                "/auth/renuncia_procurador",
                "/auth/tabela_integralizacao",
              ])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaIdCard className="text-2xl" />
              {isOpen && <span>Formulários de Cadastro</span>}
            </button>

            {isOpen && isFormsCadastroOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/alteracao_capital" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/alteracao_capital"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Alteração de Capital</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/declaracao_residencia" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/declaracao_residencia"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Declaração de Residência</span>
                    </a>
                  </Link>
                </li>

                {/*Ficha de Desimpedimento*/}
                <li>
                  <Link href="/auth/ficha_desimpedimento" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/ficha_desimpedimento"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Ficha de Desimpedimento</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/procuracao_ortugante" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/procuracao_ortugante"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Procuração Ortugante PF/PJ</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/renuncia_procurador" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/renuncia_procurador"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Renúncia de Procurador</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/tabela_integralizacao" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/tabela_integralizacao"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Tabela de integralização</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Formulários de Empréstimos (grupo)*/}
          <li>
            <button
              type="button"
              onClick={() => setIsFormsEmprestimosOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive([
                "/auth/adendo_contratual",
                "/auth/adiantamento_salarial",
                "/auth/autorizacao_debito",
                "/auth/margem_consignavel",
                "/auth/formulario_dps",
                "/auth/previsul",
                "/auth/simulador",
                "/auth/termo_garantia",
              ])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaFileAlt className="text-2xl" />
              {isOpen && <span>Formulários de Empréstimos</span>}
            </button>

            {isOpen && isFormsEmprestimosOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/adendo_contratual" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/adendo_contratual"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Adendo Contratual</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/adiantamento_salarial_emprestimo" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/adiantamento_salarial_emprestimo"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Adiantamento Salarial</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/autorizacao_debito" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/autorizacao_debito"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Autorização de Débito</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/margem_consignavel" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/margem_consignavel"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cálculo de Margem</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/formulario_dps" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/formulario_dps"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Formulário DPS</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/previsul" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/previsul"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Formulário Previsul</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/simulador_desconto" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/simulador_desconto"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Simulador de desconto</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/termo_garantia" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/termo_garantia"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Termo de Garantia</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Formulários de RH (grupo)*/}
          <li>
            <button
              type="button"
              onClick={() => setIsFormsRhOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive([
                "/auth/adiantamento_salarial",
                "/auth/auxilio_cheche_baba",
                "/auth/bolsa_estudo",
                "/auth/reembolso_convenio_medico",
              ])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaUsersCog className="text-2xl" />
              {isOpen && <span>Formulários de RH</span>}
            </button>

            {isOpen && isFormsRhOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/adiantamento_salarial" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/adiantamento_salarial_rh"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Adiatamento Salarial</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/auxilio_creche" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/auxilio_creche"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Auxílio Creche/Babá</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/bolsa_estudo" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/bolsa_estudo"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Bolsa de Estudo</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/reembolso_convenio_medico" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/reembolso_convenio_medico"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Reembolso Convênio Médico</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Gerenciador de Arquivos (grupo)*/}
          <li>
            <button
              type="button"
              onClick={() => setIsGerArqOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/aplica_marca_dagua", "/auth/conversor_arquivos", "/auth/juntar_pdf"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaFolderOpen className="text-2xl" />
              {isOpen && <span>Gerenciador de Arquivos</span>}
            </button>

            {isOpen && isGerArqOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/aplica_marca_dagua" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/aplica_marca_dagua"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Aplica marca d'agua</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/conversor_arquivos" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/conversor_arquivos"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Conversor Arquivos</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/juntar_pdf" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/juntar_pdf"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Juntar PDF</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Gerenciador de Contratos (enabled manteve escondido)*/}
          <li className="hidden">
            <button
              type="button"
              onClick={() => setIsGerContratosOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/cadastro_contratos", "/auth/consulta_contratos"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaHandshake className="text-2xl" />
              {isOpen && <span>Gerenciador de Contratos</span>}
            </button>

            {isOpen && isGerContratosOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/cadastro_contratos" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/cadastro_contratos"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cadastro</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/consulta_contratos" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/consulta_contratos"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consulta</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Gerenciador de Convênios (grupo)*/}
          <li>
            <button
              type="button"
              onClick={() => setIsGerConveniosOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive([
                "/auth/cadastro_convenio_odonto",
                "/auth/gerenciamento_convenio_odonto",
                "/auth/gerenciamento_valor_convenio_odonto",
                "/auth/relatorio_convenio_odonto",
              ])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaUserFriends className="text-2xl" />
              {isOpen && <span>Gerenciador de Convênios</span>}
            </button>

            {isOpen && isGerConveniosOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                {/*Cadastro (enabled manteve escondido)*/}
                <li className="hidden">
                  <Link href="/auth/cadastro_convenio_odonto" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/cadastro_convenio_odonto"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cadastro</span>
                    </a>
                  </Link>
                </li>

                <li>
                  <Link href="/auth/gerenciamento_convenio_odonto" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_convenio_odonto"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consulta</span>
                    </a>
                  </Link>
                </li>

                {/*Gerenciar Valores (enabled manteve escondido)*/}
                <li className="hidden">
                  <Link href="/auth/gerenciamento_valor_convenio_odonto" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_valor_convenio_odonto"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Gerenciar Valores</span>
                    </a>
                  </Link>
                </li>

                {/*Relatórios (enabled manteve escondido)*/}
                <li className="hidden">
                  <Link href="/auth/relatorio_convenio_odonto" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/relatorio_convenio_odonto"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Relatórios</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Gerenciador de Funcionários (enabled manteve escondido) -> className="hidden"*/}
          <li>
            <button
              type="button"
              onClick={() => setIsGerFuncionariosOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive([
                "/auth/gerenciamento_cargo",
                "/auth/gerenciamento_funcionario",
                "/auth/gerenciamento_posicao",
                "/auth/gerenciamento_setor",
              ])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaUsersCog className="text-2xl" />
              {isOpen && <span>Gerenciador de Funcionários</span>}
            </button>

            {isOpen && isGerFuncionariosOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/gerenciamento_cargo" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_cargo"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cargos</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/gerenciamento_funcionario" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_funcionario"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Funcionários</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/gerenciamento_posicao" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_posicao"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Posições</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/gerenciamento_setor" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_setor"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Setores</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Gerenciador de Férias (enabled menteve escondido) className="hidden"*/}
          <li>
            <button
              type="button"
              onClick={() => setIsGerFeriasOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/cadastro_ferias", "/auth/gerenciamento_ferias"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaUmbrellaBeach className="text-2xl" />
              {isOpen && <span>Gerenciador de Férias</span>}
            </button>

            {isOpen && isGerFeriasOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/cadastro_ferias" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/cadastro_ferias"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cadastro</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/gerenciamento_ferias" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_ferias"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consulta</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Gerenciador de Notebook*/}
          <li>
            <button
              type="button"
              onClick={() => setIsGerNotebookOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/cadastro_notebook", "/auth/consulta_notebook"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaLaptop className="text-2xl" />
              {isOpen && <span>Gerenciador de Notebook</span>}
            </button>

            {isOpen && isGerNotebookOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/cadastro_notebook" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/cadastro_notebook"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cadastro</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/consulta_notebook" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/consulta_notebook"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consulta</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Gerenciador de Participação de Marketing*/}
          <li>
            <button
              type="button"
              onClick={() => setIsGerMarketingOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/solicitacao_participacao", "/auth/gerenciamento_participacao"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaBullhorn className="text-2xl" />
              {isOpen && <span>Gerenciador de Marketing</span>}
            </button>

            {isOpen && isGerMarketingOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/solicitacao_participacao" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/solicitacao_participacao"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Solicitações</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/gerenciamento_participacao" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/gerenciamento_participacao"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consulta</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Migração Contratos className="hidden"*/}
          <li>
            <Link href="/auth/migracao_contrato" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/migracao_contrato"
                )}`}
              >
                <FaFileAlt className="text-2xl" />
                {isOpen && <span>Migração Contratos</span>}
              </a>
            </Link>
          </li>

          {/*Processos GED*/}
          <li>
            <button
              type="button"
              onClick={() => setIsProcessosGedOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/assinatura_eletronica", "/auth/senha_sicoobnet"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaFolderOpen className="text-2xl" />
              {isOpen && <span>Processos GED</span>}
            </button>

            {isOpen && isProcessosGedOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/assinatura_eletronica" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/assinatura_eletronica"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>GED no App</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/senha_sicoobnet" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/senha_sicoobnet"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Senha não correntista App</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Ramal*/}
          <li>
            <Link href="/auth/ramais" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/ramais"
                )}`}
              >
                <FaUsersCog className="text-2xl" />
                {isOpen && <span>Ramal</span>}
              </a>
            </Link>
          </li>

          {/*RCO*/}
          <li>
            <Link href="/auth/rco" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/rco"
                )}`}
              >
                <FaChartLine className="text-2xl" />
                {isOpen && <span>RCO</span>}
              </a>
            </Link>
          </li>

          {/*Recibos Financeiros (enabled manteve escondido)*/}
          <li className="hidden">
            <button
              type="button"
              onClick={() => setIsRecibosOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/cadastro_recibo_financeiro", "/auth/consulta_recibo_financeiro"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaFileInvoiceDollar className="text-2xl" />
              {isOpen && <span>Recibos Financeiros</span>}
            </button>

            {isOpen && isRecibosOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                <li>
                  <Link href="/auth/cadastro_recibo_financeiro" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/cadastro_recibo_financeiro"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Cadastro</span>
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/auth/consulta_recibo_financeiro" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/consulta_recibo_financeiro"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consulta</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Relação de Faturamento*/}
          <li>
            <Link href="/auth/relacao_faturamento" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/relacao_faturamento"
                )}`}
              >
                <FaChartBar className="text-2xl" />
                {isOpen && <span>Relação de Faturamento</span>}
              </a>
            </Link>
          </li>

          {/*Relatórios (grupo)*/}
          <li>
            <button
              type="button"
              onClick={() => setIsRelatoriosOpen((v) => !v)}
              className={`w-full flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isAnyActive(["/auth/producao_meta_cooperativa_pa", "/auth/producao_meta_cooperativa_macro"])
                ? "bg-secondary text-white"
                : "text-gray-400"
                }`}
            >
              <FaChartBar className="text-2xl" />
              {isOpen && <span>Relatórios</span>}
            </button>

            {isOpen && isRelatoriosOpen && (
              <ul className="mt-1 ml-10 space-y-1">
                {/*ambos enabled false no seu menu - escondidos*/}
                <li className="hidden">
                  <Link href="/auth/producao_meta_cooperativa_pa" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/producao_meta_cooperativa_pa"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consolidado/Meta/PA</span>
                    </a>
                  </Link>
                </li>

                <li className="hidden">
                  <Link href="/auth/producao_meta_cooperativa_macro" legacyBehavior>
                    <a
                      onClick={closeSidebar}
                      className={`flex items-center space-x-2 hover:text-white transition-colors duration-200 py-2 px-3 rounded-md ${isActive(
                        "/auth/producao_meta_cooperativa_macro"
                      )}`}
                    >
                      <span className="text-base"><Circle size={14} /></span>
                      <span>Consolidado/Meta/Macro</span>
                    </a>
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/*Reset de Senha e-mail Sicoob (externo)*/}
          <li>
            <a
              href="https://sistemas.sisbr.coop.br/mtse/login"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md text-gray-400"
              title="Reset de Senha e-mail Sicoob"
            >
              <FaKey className="text-2xl" />
              {isOpen && <span>Reset de Senha e-mail Sicoob</span>}
            </a>
          </li>

          {/*Resgate Capital*/}
          <li>
            <Link href="/auth/formulario_resgate_parcial_capital" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/formulario_resgate_parcial_capital"
                )}`}
              >
                <FaMoneyBillWave className="text-2xl" />
                {isOpen && <span>Resgate Capital</span>}
              </a>
            </Link>
          </li>

          {/*Simulador de Investimento (enabled manteve escondido)*/}
          <li className="hidden">
            <Link href="/auth/simulador_investimento" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/simulador_investimento"
                )}`}
              >
                <FaChartLine className="text-2xl" />
                {isOpen && <span>Simulador de Investimento</span>}
              </a>
            </Link>
          </li>

          {/*Termo de Responsabilidade TI (enabled manteve escondido) className="hidden"*/}
          <li>
            <Link href="/auth/termo_responsabilidade_uso" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/termo_responsabilidade_uso"
                )}`}
              >
                <FaFileAlt className="text-2xl" />
                {isOpen && <span>Termo de Responsabilidade TI</span>}
              </a>
            </Link>
          </li>

          {/*Tabela Sisbr TI (enabled manteve escondido)*/}
          <li>
            <Link href="/auth/tabela_sisbr_ti" legacyBehavior>
              <a
                onClick={closeSidebar}
                className={`flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md ${isActive(
                  "/auth/tabela_sisbr_ti"
                )}`}
              >
                <FaNetworkWired className="text-2xl" />
                {isOpen && <span>Tabela Sisbr TI</span>}
              </a>
            </Link>
          </li>

          {/*Placeholder (enabled)*/}
          <li className="hidden pt-2">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center space-x-4 hover:text-white transition-colors duration-200 p-3 rounded-md text-gray-400"
              title="Sistemas Externos (placeholder)"
            >
              <FaExternalLinkAlt className="text-2xl" />
              {isOpen && <span>Sistemas Externos</span>}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;