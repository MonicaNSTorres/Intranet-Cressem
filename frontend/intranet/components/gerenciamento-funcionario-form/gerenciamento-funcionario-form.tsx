"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUserSlash,
  FaUsers,
} from "react-icons/fa";
import {
  alterarStatusFuncionario,
  baixarArquivoFuncionario,
  baixarRelatorioFuncionarios,
  buscarCargosFuncionario,
  buscarGerenciasFuncionario,
  buscarSetoresFuncionario,
  buscarTodosFuncionarios,
  cadastrarFuncionario,
  editarFuncionario,
  type CargoFuncionarioItem,
  type FuncionarioItem,
  type GerenciaFuncionarioItem,
  type SetorFuncionarioItem,
} from "@/services/gerenciamento_funcionario.service";

type ModalModo = "cadastrar" | "editar";
type FiltroStatus = "ativos" | "inativos" | "todos";

const LABEL_CLASS =
  "mb-1.5 block text-xs font-semibold text-slate-600";
const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10";
const READONLY_INPUT_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 shadow-sm outline-none";
const FILE_INPUT_CLASS =
  "block min-h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 shadow-sm transition file:mr-3 file:border-0 file:bg-primary/10 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-primary hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";
const BUTTON_PRIMARY_CLASS =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_SECONDARY_CLASS =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_AUXILIARY_CLASS =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_INFO_COMPACT_CLASS =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary shadow-sm transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_EDIT_COMPACT_CLASS =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-3 text-xs font-bold text-secondary shadow-sm transition hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_DANGER_CLASS =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_CLOSE_ICON_DANGER_CLASS =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

function formatarDataInput(data?: string | null) {
  if (!data) return "";
  return String(data).slice(0, 10);
}

function formatarNascimentoTabela(data?: string | null) {
  if (!data) return "";
  const somenteData = String(data).slice(0, 10);
  const [ano, mes, dia] = somenteData.split("-");
  if (!ano || !mes || !dia) return "";
  return `${dia}/${mes}`;
}

function formatPhone(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
    .slice(0, 15);
}

function removerEspacoInicial(value: string) {
  return String(value || "").replace(/^\s+/, "");
}

function limparTexto(value: string) {
  return removerEspacoInicial(value).trim();
}

function getNomeArquivo(caminho?: string | null) {
  if (!caminho) return "Nenhum arquivo salvo!";
  const normalizado = String(caminho).replaceAll("\\", "/");
  const partes = normalizado.split("/");
  return partes[partes.length - 1] || "Nenhum arquivo salvo!";
}

function baixarBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

type SummaryCardTone = "total" | "ativos" | "inativos";

function SummaryCard({
  label,
  value,
  tone,
  active,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  tone: SummaryCardTone;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  const styles: Record<SummaryCardTone, string> = {
    total: "border-slate-200 bg-slate-50 text-slate-900",
    ativos: "border-secondary/30 bg-secondary/10 text-[#4f7f14]",
    inativos: "border-fourth/25 bg-fourth/5 text-fourth",
  };

  const labelStyles: Record<SummaryCardTone, string> = {
    total: "text-slate-500",
    ativos: "text-[#4f7f14]",
    inativos: "text-fourth",
  };

  const iconStyles: Record<SummaryCardTone, string> = {
    total: "bg-primary/10 text-primary",
    ativos: "bg-secondary/20 text-[#5f941d]",
    inativos: "bg-fourth/10 text-fourth",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles[tone]} ${
        active ? "ring-2 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.04em] ${labelStyles[tone]}`}
          >
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-[var(--title)]">{value}</p>
        </div>

        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconStyles[tone]}`}
        >
          {icon}
        </span>
      </div>
    </button>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  loading,
  onChange,
  onLimitChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  loading: boolean;
  onChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const primeiroRegistro = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const ultimoRegistro = Math.min(currentPage * limit, totalItems);

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-700">
              {primeiroRegistro}
            </span>{" "}
            até{" "}
            <span className="font-semibold text-slate-700">
              {ultimoRegistro}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span>{" "}
            funcionário(s)
          </p>

          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1 || loading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70"
          >
            <FaChevronLeft size={12} />
            Anterior
          </button>

          <span className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-semibold text-slate-700">
            Página {currentPage} de {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages || loading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70"
          >
            Próxima
            <FaChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function GerenciamentoFuncionarioForm() {
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("ativos");
  const [todosFuncionarios, setTodosFuncionarios] = useState<FuncionarioItem[]>([]);
  const [setores, setSetores] = useState<SetorFuncionarioItem[]>([]);
  const [cargos, setCargos] = useState<CargoFuncionarioItem[]>([]);
  const [gerencias, setGerencias] = useState<GerenciaFuncionarioItem[]>([]);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limite, setLimite] = useState(10);

  const [loading, setLoading] = useState(false);
  const [loadingTabela, setLoadingTabela] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [totais, setTotais] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalModo, setModalModo] = useState<ModalModo>("cadastrar");
  const [funcionarioSelecionado, setFuncionarioSelecionado] =
    useState<FuncionarioItem | null>(null);
  const [modalStatusOpen, setModalStatusOpen] = useState(false);
  const [funcionarioStatus, setFuncionarioStatus] =
    useState<FuncionarioItem | null>(null);
  const [statusDataDesligamento, setStatusDataDesligamento] = useState("");
  const [statusFichaDesimpedimento, setStatusFichaDesimpedimento] =
    useState<File | null>(null);
  const [statusEnviarEmails, setStatusEnviarEmails] = useState(true);
  const [statusEnviarEmailGeral, setStatusEnviarEmailGeral] = useState(false);
  const [statusEfetivacaoEstagiario, setStatusEfetivacaoEstagiario] =
    useState(false);
  const [statusEnviarAssem, setStatusEnviarAssem] = useState(false);
  const [statusEnviarGremio, setStatusEnviarGremio] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusErro, setStatusErro] = useState("");

  const [inputNome, setInputNome] = useState("");
  const [inputCPF, setInputCPF] = useState("");
  const [inputRG, setInputRG] = useState("");
  const [inputCelular, setInputCelular] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputNascimento, setInputNascimento] = useState("");
  const [inputCC, setInputCC] = useState("");
  const [inputRamal, setInputRamal] = useState("");
  const [inputMatricula, setInputMatricula] = useState("");
  const [inputAdmissao, setInputAdmissao] = useState("");
  const [inputDemissao, setInputDemissao] = useState("");

  const [secSexo, setSecSexo] = useState("");
  const [secSetor, setSecSetor] = useState("");
  const [secCargo, setSecCargo] = useState("");
  const [secGerencia, setSecGerencia] = useState("");

  const [enviarEmailAdmissao, setEnviarEmailAdmissao] = useState(false);

  const [arquivoDocIdentidade, setArquivoDocIdentidade] = useState<File | null>(null);
  const [arquivoCompEndereco, setArquivoCompEndereco] = useState<File | null>(null);
  const [arquivoFichaRh, setArquivoFichaRh] = useState<File | null>(null);
  const [arquivoCertNascimento, setArquivoCertNascimento] = useState<File | null>(null);
  const [arquivoCertCasamento, setArquivoCertCasamento] = useState<File | null>(null);
  const [arquivoDocConjuge, setArquivoDocConjuge] = useState<File | null>(null);
  const [arquivoFichaDesimpedimento, setArquivoFichaDesimpedimento] =
    useState<File | null>(null);

  const [anexarCertNascimento, setAnexarCertNascimento] = useState(false);
  const [anexarCertCasamento, setAnexarCertCasamento] = useState(false);
  const [anexarDocConjuge, setAnexarDocConjuge] = useState(false);

  function atualizarTotais(lista: FuncionarioItem[]) {
    const ativos = lista.filter(
      (funcionario) => Number(funcionario.SN_ATIVO) === 1
    ).length;
    const inativos = lista.filter(
      (funcionario) => Number(funcionario.SN_ATIVO) === 0
    ).length;

    setTotais({
      total: lista.length,
      ativos,
      inativos,
    });
  }

  async function carregarCombos() {
    try {
      const [listaSetores, listaCargos, listaGerencias] = await Promise.all([
        buscarSetoresFuncionario(),
        buscarCargosFuncionario(),
        buscarGerenciasFuncionario(),
      ]);

      setSetores(
        [...listaSetores]
          .filter((item) => Number(item.SN_ATIVO) === 1)
          .sort((a, b) => String(a.NM_SETOR).localeCompare(String(b.NM_SETOR)))
      );

      setCargos(
        [...listaCargos]
          .filter((item) => Number(item.SN_ATIVO) === 1)
          .sort((a, b) => String(a.NM_CARGO).localeCompare(String(b.NM_CARGO)))
      );

      setGerencias(
        [...listaGerencias]
          .filter((item) => Number(item.SN_ATIVO) === 1)
          .sort((a, b) =>
            String(a.NM_FUNCIONARIO).localeCompare(String(b.NM_FUNCIONARIO))
          )
      );
    } catch (e) {
      console.error(e);
      setErro("Falha ao carregar os dados auxiliares.");
    }
  }

  async function carregarFuncionarios(page = 1) {
    try {
      setLoadingTabela(true);
      setErro("");

      const lista = await buscarTodosFuncionarios();
      const listaOrdenada = [...lista].sort((a, b) =>
        String(a.NM_FUNCIONARIO || "").localeCompare(
          String(b.NM_FUNCIONARIO || ""),
          "pt-BR"
        )
      );

      setTodosFuncionarios(listaOrdenada);
      atualizarTotais(listaOrdenada);
      setPaginaAtual(page);
    } catch (e) {
      console.error(e);
      setTodosFuncionarios([]);
      setTotais({ total: 0, ativos: 0, inativos: 0 });
      setErro("Falha ao carregar a listagem de funcionários.");
    } finally {
      setLoadingTabela(false);
    }
  }

  useEffect(() => {
    void Promise.all([carregarCombos(), carregarFuncionarios(1)]);
  }, []);

  function aplicarFiltros() {
    setBuscaAplicada(limparTexto(busca));
    setPaginaAtual(1);
    setErro("");
    setInfo("");
  }

  function alterarFiltroStatus(status: FiltroStatus) {
    setFiltroStatus(status);
    setPaginaAtual(1);
    setErro("");
    setInfo("");
  }

  function limparBusca() {
    setBusca("");
    setBuscaAplicada("");
    setFiltroStatus("ativos");
    setLimite(10);
    setPaginaAtual(1);
    setErro("");
    setInfo("");
  }

  function alterarLimite(novoLimite: number) {
    setLimite(novoLimite);
    setPaginaAtual(1);
  }

  function limparModal() {
    setFuncionarioSelecionado(null);
    setInputNome("");
    setInputCPF("");
    setInputRG("");
    setInputCelular("");
    setInputEmail("");
    setInputNascimento("");
    setInputCC("");
    setInputRamal("");
    setInputMatricula("");
    setInputAdmissao("");
    setInputDemissao("");
    setSecSexo("");
    setSecSetor("");
    setSecCargo("");
    setSecGerencia("");
    setEnviarEmailAdmissao(false);

    setArquivoDocIdentidade(null);
    setArquivoCompEndereco(null);
    setArquivoFichaRh(null);
    setArquivoCertNascimento(null);
    setArquivoCertCasamento(null);
    setArquivoDocConjuge(null);
    setArquivoFichaDesimpedimento(null);

    setAnexarCertNascimento(false);
    setAnexarCertCasamento(false);
    setAnexarDocConjuge(false);
  }

  function abrirCadastro() {
    setModalModo("cadastrar");
    limparModal();
    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function abrirEdicao(funcionario: FuncionarioItem) {
    setModalModo("editar");
    setFuncionarioSelecionado(funcionario);

    setInputNome(removerEspacoInicial(funcionario.NM_FUNCIONARIO || ""));
    setInputCPF(funcionario.NR_CPF || "");
    setInputRG(removerEspacoInicial(funcionario.NR_RG || ""));
    setInputCelular(removerEspacoInicial(funcionario.NR_CELULAR || ""));
    setInputEmail(removerEspacoInicial(funcionario.EMAIL || ""));
    setInputNascimento(formatarDataInput(funcionario.DT_NASCIMENTO));
    setInputCC(removerEspacoInicial(funcionario.NR_CONTA_CORRENTE || ""));
    setInputRamal(removerEspacoInicial(funcionario.NR_RAMAL || ""));
    setInputMatricula(removerEspacoInicial(funcionario.NR_MATRICULA || ""));
    setInputAdmissao(formatarDataInput(funcionario.DT_ADMISSAO));
    setInputDemissao(formatarDataInput(funcionario.DT_DESLIGAMENTO));
    setSecSexo(funcionario.SEXO || "");
    setSecSetor(funcionario.ID_SETOR ? String(funcionario.ID_SETOR) : "");
    setSecCargo(funcionario.ID_CARGO ? String(funcionario.ID_CARGO) : "");
    setSecGerencia(funcionario.CD_GERENCIA ? String(funcionario.CD_GERENCIA) : "");

    setEnviarEmailAdmissao(false);

    setArquivoDocIdentidade(null);
    setArquivoCompEndereco(null);
    setArquivoFichaRh(null);
    setArquivoCertNascimento(null);
    setArquivoCertCasamento(null);
    setArquivoDocConjuge(null);
    setArquivoFichaDesimpedimento(null);

    setAnexarCertNascimento(Boolean(funcionario.CERT_NASCIMENTO));
    setAnexarCertCasamento(Boolean(funcionario.CERT_CASAMENTO));
    setAnexarDocConjuge(Boolean(funcionario.DOC_IDENTIDADE_CONJ));

    setErro("");
    setInfo("");
    setModalOpen(true);
  }

  function fecharModal() {
    if (loading) return;
    setModalOpen(false);
    limparModal();
  }

  function validarCampos() {
    if (!inputNome.trim()) {
      setErro("Preencha o nome.");
      return false;
    }

    if (!inputCPF.trim()) {
      setErro("Preencha o CPF.");
      return false;
    }

    if (!inputRG.trim()) {
      setErro("Preencha o RG.");
      return false;
    }

    if (!inputCelular.trim()) {
      setErro("Preencha o celular.");
      return false;
    }

    if (!secSexo) {
      setErro("Preencha o sexo.");
      return false;
    }

    if (!inputNascimento) {
      setErro("Preencha a data de nascimento.");
      return false;
    }

    if (!inputAdmissao) {
      setErro("Preencha a data de admissão.");
      return false;
    }

    if (!secSetor) {
      setErro("Preencha o setor.");
      return false;
    }

    if (!secCargo) {
      setErro("Preencha o cargo.");
      return false;
    }

    if (!secGerencia) {
      setErro("Preencha a gerência.");
      return false;
    }

    if (modalModo === "cadastrar" && !arquivoDocIdentidade) {
      setErro("Anexe o documento pessoal com foto.");
      return false;
    }

    if (modalModo === "cadastrar" && !arquivoCompEndereco) {
      setErro("Anexe o comprovante de endereço.");
      return false;
    }

    if (modalModo === "cadastrar" && !arquivoFichaRh) {
      setErro("Anexe a ficha cadastral do RH.");
      return false;
    }

    if (anexarCertNascimento && !arquivoCertNascimento && !funcionarioSelecionado?.CERT_NASCIMENTO) {
      setErro("Você marcou certidão de nascimento, mas não anexou o arquivo.");
      return false;
    }

    if (anexarCertCasamento && !arquivoCertCasamento && !funcionarioSelecionado?.CERT_CASAMENTO) {
      setErro("Você marcou certidão de casamento, mas não anexou o arquivo.");
      return false;
    }

    if (anexarDocConjuge && !arquivoDocConjuge && !funcionarioSelecionado?.DOC_IDENTIDADE_CONJ) {
      setErro("Você marcou documento do cônjuge, mas não anexou o arquivo.");
      return false;
    }

    return true;
  }

  async function salvarModal() {
    if (!validarCampos()) return;

    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const payload = {
        NM_FUNCIONARIO: limparTexto(inputNome).toUpperCase(),
        DT_NASCIMENTO: inputNascimento,
        ID_SETOR: Number(secSetor),
        ID_CARGO: secCargo ? Number(secCargo) : null,
        NR_RAMAL: limparTexto(inputRamal),
        CD_GERENCIA: secGerencia ? Number(secGerencia) : null,
        EMAIL: limparTexto(inputEmail),
        NR_CPF: inputCPF,
        NR_RG: limparTexto(inputRG),
        NR_CELULAR: limparTexto(inputCelular),
        SEXO: secSexo,
        DT_ADMISSAO: inputAdmissao,
        DT_DESLIGAMENTO: inputDemissao || null,
        NR_MATRICULA: limparTexto(inputMatricula),
        NR_CONTA_CORRENTE: limparTexto(inputCC) || "0000000000",
        DOC_INDENTIDADE: arquivoDocIdentidade,
        COMP_ENDERECO: arquivoCompEndereco,
        FICHA_RH: arquivoFichaRh,
        CERT_NASCIMENTO: anexarCertNascimento ? arquivoCertNascimento : null,
        CERT_CASAMENTO: anexarCertCasamento ? arquivoCertCasamento : null,
        DOC_IDENTIDADE_CONJ: anexarDocConjuge ? arquivoDocConjuge : null,
        FICHA_DESIMPEDIMENTO: arquivoFichaDesimpedimento,
        ENVIAR_EMAIL_ADMISSAO: enviarEmailAdmissao ? 1 : 0,
      };

      if (modalModo === "cadastrar") {
        await cadastrarFuncionario(payload);
        setInfo("Funcionário cadastrado com sucesso.");
      }

      if (modalModo === "editar" && funcionarioSelecionado) {
        await editarFuncionario({
          id: Number(funcionarioSelecionado.ID_FUNCIONARIO),
          ...payload,
          SN_ATIVO: Number(funcionarioSelecionado.SN_ATIVO ?? 1),
        });

        setInfo("Funcionário atualizado com sucesso.");
      }

      await carregarFuncionarios(modalModo === "editar" ? paginaSegura : 1);

      setTimeout(() => {
        fecharModal();
      }, 600);
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Não foi possível salvar o funcionário."
      );
    } finally {
      setLoading(false);
    }
  }

  function abrirModalStatus(funcionario: FuncionarioItem) {
    const vaiInativar = Number(funcionario.SN_ATIVO) === 1;

    setFuncionarioStatus(funcionario);
    setStatusDataDesligamento(
      vaiInativar ? formatarDataInput(funcionario.DT_DESLIGAMENTO) : ""
    );
    setStatusFichaDesimpedimento(null);
    setStatusEnviarEmails(vaiInativar);
    setStatusEnviarEmailGeral(false);
    setStatusEfetivacaoEstagiario(false);
    setStatusEnviarAssem(false);
    setStatusEnviarGremio(false);
    setStatusErro("");
    setErro("");
    setInfo("");
    setModalStatusOpen(true);
  }

  function fecharModalStatus() {
    if (statusLoading) return;

    setModalStatusOpen(false);
    setFuncionarioStatus(null);
    setStatusDataDesligamento("");
    setStatusFichaDesimpedimento(null);
    setStatusEnviarEmails(true);
    setStatusEnviarEmailGeral(false);
    setStatusEfetivacaoEstagiario(false);
    setStatusEnviarAssem(false);
    setStatusEnviarGremio(false);
    setStatusErro("");
  }

  async function confirmarStatus() {
    if (!funcionarioStatus) return;

    try {
      setErro("");
      setInfo("");
      setStatusErro("");

      const novoStatus = Number(funcionarioStatus.SN_ATIVO) === 1 ? 0 : 1;

      if (novoStatus === 0 && !statusDataDesligamento) {
        setStatusErro("Preencha a data de desligamento antes de inativar.");
        return;
      }

      if (
        novoStatus === 0 &&
        !statusFichaDesimpedimento &&
        !funcionarioStatus.FICHA_DESIMPEDIMENTO
      ) {
        setStatusErro("Anexe a ficha de desimpedimento antes de inativar.");
        return;
      }

      setStatusLoading(true);

      await alterarStatusFuncionario({
        id: Number(funcionarioStatus.ID_FUNCIONARIO),
        SN_ATIVO: novoStatus,
        DT_DESLIGAMENTO: novoStatus === 0 ? statusDataDesligamento : null,
        FICHA_DESIMPEDIMENTO:
          novoStatus === 0 ? statusFichaDesimpedimento : null,
        ENVIAR_EMAIL_DESLIGAMENTO:
          novoStatus === 0 && statusEnviarEmails ? 1 : 0,
        ENVIAR_EMAIL_DESLIGAMENTO_GERAL:
          novoStatus === 0 && statusEnviarEmails && statusEnviarEmailGeral
            ? 1
            : 0,
        ENVIAR_EMAIL_ASSEM:
          novoStatus === 0 && statusEnviarEmails && statusEnviarAssem ? 1 : 0,
        ENVIAR_EMAIL_GREMIO:
          novoStatus === 0 && statusEnviarEmails && statusEnviarGremio ? 1 : 0,
        EFETIVACAO_ESTAGIARIO:
          novoStatus === 0 && statusEnviarEmails && statusEfetivacaoEstagiario
            ? 1
            : 0,
      });

      setInfo(
        novoStatus === 1
          ? "Funcionário ativado com sucesso."
          : "Funcionário inativado com sucesso."
      );

      await carregarFuncionarios(paginaSegura);
      fecharModalStatus();
    } catch (e: any) {
      console.error(e);
      setStatusErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Erro ao alterar o status do funcionário."
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function baixarCsv() {
    try {
      setErro("");
      setInfo("Preparando relatório para download...");

      const blob = await baixarRelatorioFuncionarios();
      baixarBlob(blob, "funcionarios.csv");

      setInfo("Download do relatório iniciado com sucesso.");
    } catch (e: any) {
      console.error(e);
      setErro(
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Falha ao baixar o relatório."
      );
    }
  }

  async function baixarArquivo(caminho: string) {
    try {
      const response = await baixarArquivoFuncionario(caminho);
      const fileName =
        response.headers["content-disposition"]
          ?.split("filename=")?.[1]
          ?.replace(/"/g, "") || getNomeArquivo(caminho);

      baixarBlob(response.data, fileName);
    } catch (e: any) {
      console.error(e);
      setErro("Falha ao baixar o arquivo.");
    }
  }

  const funcionariosFiltrados = useMemo(() => {
    const termo = buscaAplicada.trim().toLocaleLowerCase("pt-BR");

    return todosFuncionarios.filter((funcionario) => {
      const ativo = Number(funcionario.SN_ATIVO) === 1;
      const correspondeStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativos" && ativo) ||
        (filtroStatus === "inativos" && !ativo);

      if (!correspondeStatus) return false;
      if (!termo) return true;

      return String(funcionario.NM_FUNCIONARIO || "")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });
  }, [buscaAplicada, filtroStatus, todosFuncionarios]);

  const totalPages = Math.max(
    1,
    Math.ceil(funcionariosFiltrados.length / limite)
  );

  const paginaSegura = Math.min(paginaAtual, totalPages);

  const funcionarios = useMemo(() => {
    const inicio = (paginaSegura - 1) * limite;
    return funcionariosFiltrados.slice(inicio, inicio + limite);
  }, [funcionariosFiltrados, limite, paginaSegura]);

  return (
    <>
      <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#006f65] via-[#00AE9D] to-[#79B729]" />
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
              Consulta de funcionários
            </h2>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Pesquise pelo nome e escolha quais vínculos deseja visualizar.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCadastro}
            className={`${BUTTON_AUXILIARY_CLASS} w-full lg:w-auto`}
          >
            <FaPlus />
            Cadastrar funcionário
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px_auto_auto] lg:items-end">
          <div>
            <label className={LABEL_CLASS}>Nome do funcionário</label>
            <input
              value={busca}
              onChange={(e) => setBusca(removerEspacoInicial(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") aplicarFiltros();
              }}
              placeholder="Digite o nome do funcionário"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Status do funcionário</label>
            <select
              value={filtroStatus}
              onChange={(e) =>
                alterarFiltroStatus(e.target.value as FiltroStatus)
              }
              className={INPUT_CLASS}
            >
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
              <option value="todos">Ativos e inativos</option>
            </select>
          </div>

          <button
            type="button"
            onClick={aplicarFiltros}
            className={`${BUTTON_PRIMARY_CLASS} w-full lg:w-auto`}
          >
            <FaSearch />
            Pesquisar
          </button>

          <button
            type="button"
            onClick={limparBusca}
            className={`${BUTTON_SECONDARY_CLASS} w-full lg:w-auto`}
          >
            <FaTimes />
            Limpar
          </button>
        </div>

        {(erro || info) && (
          <div className="mt-4">
            {erro ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erro}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {info}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Total cadastrado"
            value={totais.total}
            tone="total"
            active={filtroStatus === "todos"}
            icon={<FaUsers />}
            onClick={() => alterarFiltroStatus("todos")}
          />

          <SummaryCard
            label="Ativos"
            value={totais.ativos}
            tone="ativos"
            active={filtroStatus === "ativos"}
            icon={<FaCheckCircle />}
            onClick={() => alterarFiltroStatus("ativos")}
          />

          <SummaryCard
            label="Inativos"
            value={totais.inativos}
            tone="inativos"
            active={filtroStatus === "inativos"}
            icon={<FaUserSlash />}
            onClick={() => alterarFiltroStatus("inativos")}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--title)]">
              Funcionários encontrados
            </h3>
            <p className="text-xs text-slate-500">
              {funcionariosFiltrados.length} registro(s) no filtro selecionado.
            </p>
          </div>

          <button
            type="button"
            onClick={baixarCsv}
            className={`${BUTTON_AUXILIARY_CLASS} w-full sm:w-auto`}
          >
            <FaDownload />
            Baixar relatório
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Nascimento
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Ramal
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Setor
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Cargo
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Editar
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loadingTabela ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Carregando funcionários...
                  </td>
                </tr>
              ) : funcionarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Nenhum funcionário encontrado com os filtros informados.
                  </td>
                </tr>
              ) : (
                funcionarios.map((funcionario) => (
                  <tr
                    key={funcionario.ID_FUNCIONARIO}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {funcionario.NM_FUNCIONARIO}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatarNascimentoTabela(funcionario.DT_NASCIMENTO)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {funcionario.NR_RAMAL || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {funcionario.SETOR?.NM_SETOR || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {funcionario.CARGO?.NM_CARGO || "Sem cargo"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(funcionario)}
                        className={BUTTON_EDIT_COMPACT_CLASS}
                        title="Editar funcionário"
                      >
                        <FaEdit size={12} />
                        Editar
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => abrirModalStatus(funcionario)}
                        className={`inline-flex h-9 min-w-24 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold shadow-sm transition ${
                          Number(funcionario.SN_ATIVO) === 1
                            ? "border-primary/30 bg-primary/10 text-[#007f73] hover:border-primary hover:bg-primary hover:text-white"
                            : "border-fourth/30 bg-fourth/10 text-fourth hover:border-fourth hover:bg-fourth hover:text-white"
                        }`}
                        title={
                          Number(funcionario.SN_ATIVO) === 1
                            ? "Inativar funcionário"
                            : "Ativar funcionário"
                        }
                      >
                        {Number(funcionario.SN_ATIVO) === 1 ? (
                          <FaCheckCircle size={12} />
                        ) : (
                          <FaUserSlash size={12} />
                        )}
                        {Number(funcionario.SN_ATIVO) === 1 ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loadingTabela && funcionariosFiltrados.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Pagination
              currentPage={paginaSegura}
              totalPages={totalPages}
              totalItems={funcionariosFiltrados.length}
              limit={limite}
              loading={loadingTabela}
              onChange={setPaginaAtual}
              onLimitChange={alterarLimite}
            />
          </div>
        )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
              <h2 className="text-lg font-bold text-[var(--title)]">
                {modalModo === "cadastrar"
                  ? "Cadastro Funcionário"
                  : "Editar Funcionário"}
              </h2>

              <button
                type="button"
                onClick={fecharModal}
                aria-label="Fechar modal"
                className={BUTTON_CLOSE_ICON_DANGER_CLASS}
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>
                    Nome
                  </label>
                  <input
                    value={inputNome}
                    onChange={(e) => setInputNome(removerEspacoInicial(e.target.value))}
                    className={INPUT_CLASS}
                    placeholder="Digite o nome"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    CPF
                  </label>
                  <input
                    value={inputCPF}
                    onChange={(e) => setInputCPF(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    className={INPUT_CLASS}
                    placeholder="Digite o CPF"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    RG
                  </label>
                  <input
                    value={inputRG}
                    onChange={(e) => setInputRG(removerEspacoInicial(e.target.value))}
                    className={INPUT_CLASS}
                    placeholder="Digite o RG"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Celular
                  </label>
                  <input
                    value={inputCelular}
                    onChange={(e) =>
                      setInputCelular(formatPhone(removerEspacoInicial(e.target.value)))
                    }
                    className={INPUT_CLASS}
                    placeholder="Digite o celular"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Sexo
                  </label>
                  <select
                    value={secSexo}
                    onChange={(e) => setSecSexo(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value=""></option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Email
                  </label>
                  <input
                    value={inputEmail}
                    onChange={(e) => setInputEmail(removerEspacoInicial(e.target.value))}
                    className={INPUT_CLASS}
                    placeholder="Digite o email"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Nascimento
                  </label>
                  <input
                    type="date"
                    value={inputNascimento}
                    onChange={(e) => setInputNascimento(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Conta Corrente
                  </label>
                  <input
                    value={inputCC}
                    onChange={(e) => setInputCC(removerEspacoInicial(e.target.value))}
                    className={INPUT_CLASS}
                    placeholder="Digite a conta corrente"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Ramal
                  </label>
                  <input
                    value={inputRamal}
                    onChange={(e) => setInputRamal(removerEspacoInicial(e.target.value))}
                    className={INPUT_CLASS}
                    placeholder="Digite o ramal"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Matrícula
                  </label>
                  <input
                    value={inputMatricula}
                    onChange={(e) =>
                      setInputMatricula(removerEspacoInicial(e.target.value))
                    }
                    className={INPUT_CLASS}
                    placeholder="Digite a matrícula"
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Admissão
                  </label>
                  <input
                    type="date"
                    value={inputAdmissao}
                    onChange={(e) => setInputAdmissao(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Demissão
                  </label>
                  <input
                    type="date"
                    value={inputDemissao}
                    onChange={(e) => setInputDemissao(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>
                    Setor
                  </label>
                  <select
                    value={secSetor}
                    onChange={(e) => setSecSetor(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value=""></option>
                    {setores.map((setor) => (
                      <option key={setor.ID_SETOR} value={setor.ID_SETOR}>
                        {setor.NM_SETOR}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>
                    Cargo
                  </label>
                  <select
                    value={secCargo}
                    onChange={(e) => setSecCargo(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value=""></option>
                    {cargos.map((cargo) => (
                      <option key={cargo.ID_CARGO} value={cargo.ID_CARGO}>
                        {cargo.NM_CARGO}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>
                    Gerência
                  </label>
                  <select
                    value={secGerencia}
                    onChange={(e) => setSecGerencia(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value=""></option>
                    <option value="0">Sem Gerência</option>
                    {gerencias.map((gerencia) => (
                      <option
                        key={gerencia.ID_FUNCIONARIO}
                        value={gerencia.ID_FUNCIONARIO}
                      >
                        {gerencia.NM_FUNCIONARIO}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800 before:h-2 before:w-2 before:rounded-full before:bg-primary">
                  Documentos
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLASS}>
                      Documento pessoal com foto
                    </label>
                    {modalModo === "editar" && (
                      <div className="mb-2 flex gap-2">
                        <input
                          readOnly
                          value={getNomeArquivo(funcionarioSelecionado?.DOC_INDENTIDADE)}
                          className={READONLY_INPUT_CLASS}
                        />
                        {funcionarioSelecionado?.DOC_INDENTIDADE && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(funcionarioSelecionado.DOC_INDENTIDADE!)
                            }
                            className={BUTTON_INFO_COMPACT_CLASS}
                          >
                            Consultar
                          </button>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setArquivoDocIdentidade(e.target.files?.[0] || null)
                      }
                      className={FILE_INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>
                      Comprovante de Endereço
                    </label>
                    {modalModo === "editar" && (
                      <div className="mb-2 flex gap-2">
                        <input
                          readOnly
                          value={getNomeArquivo(funcionarioSelecionado?.COMP_ENDERECO)}
                          className={READONLY_INPUT_CLASS}
                        />
                        {funcionarioSelecionado?.COMP_ENDERECO && (
                          <button
                            type="button"
                            onClick={() =>
                              baixarArquivo(funcionarioSelecionado.COMP_ENDERECO!)
                            }
                            className={BUTTON_INFO_COMPACT_CLASS}
                          >
                            Consultar
                          </button>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setArquivoCompEndereco(e.target.files?.[0] || null)
                      }
                      className={FILE_INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>
                      Ficha cadastral do RH
                    </label>
                    {modalModo === "editar" && (
                      <div className="mb-2 flex gap-2">
                        <input
                          readOnly
                          value={getNomeArquivo(funcionarioSelecionado?.FICHA_RH)}
                          className={READONLY_INPUT_CLASS}
                        />
                        {funcionarioSelecionado?.FICHA_RH && (
                          <button
                            type="button"
                            onClick={() => baixarArquivo(funcionarioSelecionado.FICHA_RH!)}
                            className={BUTTON_INFO_COMPACT_CLASS}
                          >
                            Consultar
                          </button>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setArquivoFichaRh(e.target.files?.[0] || null)}
                      className={FILE_INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={anexarCertNascimento}
                        onChange={(e) => setAnexarCertNascimento(e.target.checked)}
                      />
                      Certidão de Nascimento
                    </label>

                    {anexarCertNascimento && (
                      <>
                        {modalModo === "editar" && (
                          <div className="mb-2 flex gap-2">
                            <input
                              readOnly
                              value={getNomeArquivo(funcionarioSelecionado?.CERT_NASCIMENTO)}
                              className={READONLY_INPUT_CLASS}
                            />
                            {funcionarioSelecionado?.CERT_NASCIMENTO && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(funcionarioSelecionado.CERT_NASCIMENTO!)
                                }
                                className={BUTTON_INFO_COMPACT_CLASS}
                              >
                                Consultar
                              </button>
                            )}
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoCertNascimento(e.target.files?.[0] || null)
                          }
                          className={FILE_INPUT_CLASS}
                        />
                      </>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={anexarCertCasamento}
                        onChange={(e) => setAnexarCertCasamento(e.target.checked)}
                      />
                      Certidão de Casamento
                    </label>

                    {anexarCertCasamento && (
                      <>
                        {modalModo === "editar" && (
                          <div className="mb-2 flex gap-2">
                            <input
                              readOnly
                              value={getNomeArquivo(funcionarioSelecionado?.CERT_CASAMENTO)}
                              className={READONLY_INPUT_CLASS}
                            />
                            {funcionarioSelecionado?.CERT_CASAMENTO && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(funcionarioSelecionado.CERT_CASAMENTO!)
                                }
                                className={BUTTON_INFO_COMPACT_CLASS}
                              >
                                Consultar
                              </button>
                            )}
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoCertCasamento(e.target.files?.[0] || null)
                          }
                          className={FILE_INPUT_CLASS}
                        />
                      </>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={anexarDocConjuge}
                        onChange={(e) => setAnexarDocConjuge(e.target.checked)}
                      />
                      Documento do cônjuge com foto e CPF
                    </label>

                    {anexarDocConjuge && (
                      <>
                        {modalModo === "editar" && (
                          <div className="mb-2 flex gap-2">
                            <input
                              readOnly
                              value={getNomeArquivo(funcionarioSelecionado?.DOC_IDENTIDADE_CONJ)}
                              className={READONLY_INPUT_CLASS}
                            />
                            {funcionarioSelecionado?.DOC_IDENTIDADE_CONJ && (
                              <button
                                type="button"
                                onClick={() =>
                                  baixarArquivo(funcionarioSelecionado.DOC_IDENTIDADE_CONJ!)
                                }
                                className={BUTTON_INFO_COMPACT_CLASS}
                              >
                                Consultar
                              </button>
                            )}
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoDocConjuge(e.target.files?.[0] || null)
                          }
                          className={FILE_INPUT_CLASS}
                        />
                      </>
                    )}
                  </div>

                  {modalModo === "editar" && (
                      <div>
                        <label className={LABEL_CLASS}>
                          Ficha de Desimpedimento
                        </label>
                        <div className="mb-2 flex gap-2">
                          <input
                            readOnly
                            value={getNomeArquivo(funcionarioSelecionado?.FICHA_DESIMPEDIMENTO)}
                            className={READONLY_INPUT_CLASS}
                          />
                          {funcionarioSelecionado?.FICHA_DESIMPEDIMENTO && (
                            <button
                              type="button"
                              onClick={() =>
                                baixarArquivo(funcionarioSelecionado.FICHA_DESIMPEDIMENTO!)
                              }
                              className={BUTTON_INFO_COMPACT_CLASS}
                            >
                              Consultar
                            </button>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setArquivoFichaDesimpedimento(e.target.files?.[0] || null)
                          }
                          className={FILE_INPUT_CLASS}
                        />
                      </div>
                    )}
                </div>
              </div>

              {modalModo === "cadastrar" && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">
                    Deseja enviar e-mail às partes responsáveis?
                  </label>

                  <div className="flex gap-6 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        className="h-4 w-4 accent-primary"
                        checked={enviarEmailAdmissao === true}
                        onChange={() => setEnviarEmailAdmissao(true)}
                      />
                      Sim
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        className="h-4 w-4 accent-primary"
                        checked={enviarEmailAdmissao === false}
                        onChange={() => setEnviarEmailAdmissao(false)}
                      />
                      Não
                    </label>
                  </div>
                </div>
              )}

              {(erro || info) && (
                <div>
                  {erro ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {erro}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      {info}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={fecharModal}
                className={BUTTON_SECONDARY_CLASS}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvarModal}
                disabled={loading}
                className={BUTTON_PRIMARY_CLASS}
              >
                {loading
                  ? "Salvando..."
                  : modalModo === "cadastrar"
                    ? "Cadastrar"
                    : "Editar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalStatusOpen && funcionarioStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--title)]">
                  {Number(funcionarioStatus.SN_ATIVO) === 1
                    ? "Confirmar inativação"
                    : "Confirmar ativação"}
                </h2>
                <p className="text-sm text-slate-500">
                  {funcionarioStatus.NM_FUNCIONARIO}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalStatus}
                aria-label="Fechar modal"
                className={BUTTON_CLOSE_ICON_DANGER_CLASS}
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  Number(funcionarioStatus.SN_ATIVO) === 1
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                {Number(funcionarioStatus.SN_ATIVO) === 1 ? (
                  <p>
                    Para inativar, informe a data de desligamento e anexe a
                    ficha de desimpedimento. Se o envio de e-mail estiver
                    marcado, o sistema avisará automaticamente os destinatários
                    configurados do RH e a gerência vinculada.
                  </p>
                ) : (
                  <p>
                    Ao confirmar, o funcionário será reativado e a data de
                    desligamento será limpa.
                  </p>
                )}
              </div>

              {Number(funcionarioStatus.SN_ATIVO) === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLASS}>
                      Data de desligamento
                    </label>
                    <input
                      type="date"
                      value={statusDataDesligamento}
                      onChange={(e) => setStatusDataDesligamento(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>
                      Ficha de desimpedimento
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setStatusFichaDesimpedimento(e.target.files?.[0] || null)
                      }
                      className={FILE_INPUT_CLASS}
                    />
                    {funcionarioStatus.FICHA_DESIMPEDIMENTO && (
                      <p className="mt-1 text-xs text-slate-500">
                        Arquivo salvo atualmente:{" "}
                        {getNomeArquivo(funcionarioStatus.FICHA_DESIMPEDIMENTO)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      Deseja enviar e-mail às partes responsáveis?
                    </label>

                    <div className="flex flex-wrap gap-5 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          className="h-4 w-4 accent-primary"
                          checked={statusEnviarEmails === true}
                          onChange={() => setStatusEnviarEmails(true)}
                        />
                        Sim
                      </label>

                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          className="h-4 w-4 accent-primary"
                          checked={statusEnviarEmails === false}
                          onChange={() => setStatusEnviarEmails(false)}
                        />
                        Não
                      </label>
                    </div>

                    {statusEnviarEmails && (
                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={statusEfetivacaoEstagiario}
                            onChange={(e) =>
                              setStatusEfetivacaoEstagiario(e.target.checked)
                            }
                          />
                          Efetivação de estagiário
                        </label>

                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={statusEnviarEmailGeral}
                            onChange={(e) =>
                              setStatusEnviarEmailGeral(e.target.checked)
                            }
                          />
                          Avisar lista geral
                        </label>

                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={statusEnviarAssem}
                            onChange={(e) => setStatusEnviarAssem(e.target.checked)}
                          />
                          ASSEM
                        </label>

                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={statusEnviarGremio}
                            onChange={(e) =>
                              setStatusEnviarGremio(e.target.checked)
                            }
                          />
                          Grêmio
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {statusErro && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {statusErro}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={fecharModalStatus}
                className={BUTTON_SECONDARY_CLASS}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarStatus}
                disabled={statusLoading}
                className={
                  Number(funcionarioStatus.SN_ATIVO) === 1
                    ? BUTTON_DANGER_CLASS
                    : BUTTON_PRIMARY_CLASS
                }
              >
                {statusLoading
                  ? "Processando..."
                  : Number(funcionarioStatus.SN_ATIVO) === 1
                    ? "Inativar funcionário"
                    : "Ativar funcionário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
