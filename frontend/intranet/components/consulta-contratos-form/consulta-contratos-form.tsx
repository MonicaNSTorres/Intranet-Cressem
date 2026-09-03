"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaAddressBook,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import {
  consultarContratosEmpresas,
  carregarCidadesContratoConsulta,
  carregarTiposContratoConsulta,
  carregarSistemasConsignadosConsulta,
  listarContatosContratoConsulta,
  type ContatoContratoItem,
  type ContratoEmpresaItem,
  type ConsultaContratosParams,
} from "@/services/consulta_contratos.service";
import { CadastroContratoForm } from "@/components/cadastro-contrato-form/cadastro-contrato-form";

function onlyCpfCnpjChars(value: string) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function formatCpfCnpj(value: string) {
  const chars = onlyCpfCnpjChars(value).slice(0, 14);

  if (chars.length <= 11 && !/[A-Z]/.test(chars)) {
    return chars
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return chars
    .replace(/^(.{2})(.)/, "$1.$2")
    .replace(/^(.{2})\.(.{3})(.)/, "$1.$2.$3")
    .replace(/\.(.{3})(.)/, ".$1/$2")
    .replace(/(.{4})(.)$/, "$1-$2");
}

function formatCpfCnpjTabela(value: string) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length >= 12) {
    return digits
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }

  return value || "";
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function parseDateLocal(value?: string | null) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}

function diasAteVencimento(value?: string | null) {
  const dataFim = parseDateLocal(value);
  if (!dataFim) return null;
  return Math.ceil((dataFim.getTime() - startOfToday().getTime()) / 86400000);
}

function isAtivo(item: ContratoEmpresaItem) {
  return Number(item.SN_ATIVO || 0) === 1;
}

function descricaoVencimento(item: ContratoEmpresaItem) {
  if (!item.DT_FIM) return "Sem data final";
  const dias = diasAteVencimento(item.DT_FIM);
  if (dias === null) return "";
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje";
  return `Vence em ${dias} dia(s)`;
}

function renderTipoConvenio(value?: string | null) {
  const text = String(value || "").trim();
  if (!text.includes(" - ")) return text;

  const [primeiraParte, ...restante] = text.split(" - ");
  const segundaLinha = restante.join(" - ").trim();

  if (!segundaLinha) return text;

  return (
    <>
      <span className="block whitespace-nowrap">{primeiraParte} -</span>
      <span className="block">{segundaLinha}</span>
    </>
  );
}

type FiltroVencimento =
  | ""
  | "vencidos"
  | "1-30"
  | "31-60"
  | "61-90"
  | "outros"
  | "sem_data"
  | "inativos";

function filtrarPorVencimento(
  lista: ContratoEmpresaItem[],
  filtro: FiltroVencimento
) {
  if (!filtro) return lista;

  return lista.filter((item) => {
    const ativo = isAtivo(item);
    const dias = diasAteVencimento(item.DT_FIM);

    if (filtro === "inativos") return !ativo;
    if (filtro === "sem_data") return !item.DT_FIM;
    if (filtro === "vencidos") return ativo && dias !== null && dias < 0;
    if (!ativo || dias === null) return false;
    if (filtro === "1-30") return dias >= 0 && dias <= 30;
    if (filtro === "31-60") return dias >= 31 && dias <= 60;
    if (filtro === "61-90") return dias >= 61 && dias <= 90;
    if (filtro === "outros") return dias > 90;
    return true;
  });
}

function calcularTotaisContratos(lista: ContratoEmpresaItem[]) {
  return lista.reduce(
    (acc, item) => {
      const ativo = isAtivo(item);
      const dias = diasAteVencimento(item.DT_FIM);

      acc.total += 1;
      if (ativo) acc.ativos += 1;
      if (!ativo) acc.inativos += 1;
      if (ativo && dias !== null && dias < 0) acc.vencidos += 1;
      if (ativo && dias !== null && dias >= 0 && dias <= 30) {
        acc.proximos += 1;
      }

      return acc;
    },
    { total: 0, ativos: 0, inativos: 0, vencidos: 0, proximos: 0 }
  );
}

function rowClassByVencimento(item: ContratoEmpresaItem) {
  if (!isAtivo(item)) return "bg-red-50/70 hover:bg-red-50";

  const dias = diasAteVencimento(item.DT_FIM);
  if (dias !== null && dias < 0) return "bg-sky-50/80 hover:bg-sky-50";
  if (dias !== null && dias >= 0 && dias <= 30) {
    return "bg-amber-50/80 hover:bg-amber-50";
  }

  return "bg-emerald-50 hover:bg-emerald-100/80";
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function baixarCsv(nomeArquivo: string, linhas: string[][]) {
  const csv = `\uFEFF${linhas.map((linha) => linha.map(csvCell).join(";")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const inputBase =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-[#00AE9D] focus:ring-2 focus:ring-[#00AE9D]/15";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-[#00AE9D]/20 bg-gradient-to-r from-[#006f65] via-[#00AE9D] to-[#79B729] px-5 py-3">
        <h3 className="text-sm font-black text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-bold uppercase tracking-[0.04em] text-slate-600">
        {label}
      </label>
      {children}
    </div>
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
            contrato(s)
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

function SummaryCard({
  label,
  value,
  tone = "slate",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "red" | "sky" | "amber";
  active?: boolean;
  onClick?: () => void;
}) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-[#00AE9D]/25 bg-[#00AE9D]/10 text-[#006f65]",
    red: "border-red-200 bg-red-50 text-red-700",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };

  const labelStyles = {
    slate: "text-slate-500",
    emerald: "text-[#006f65]",
    red: "text-red-700",
    sky: "text-sky-700",
    amber: "text-amber-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        styles[tone]
      } ${active ? "ring-2 ring-primary/30" : ""}`}
    >
      <p className={`text-xs font-black uppercase tracking-[0.04em] ${labelStyles[tone]}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </button>
  );
}

export function ConsultaContratosForm() {
  const router = useRouter();

  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const buscarLockRef = useRef(false);
  const relatorioLockRef = useRef(false);
  const contatosLockRef = useRef(false);
  const atualizarEdicaoLockRef = useRef(false);

  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [sistema, setSistema] = useState("");
  const [status, setStatus] = useState("");
  const [filtroVencimento, setFiltroVencimento] =
    useState<FiltroVencimento>("");

  const [cidades, setCidades] = useState<string[]>([]);
  const [tiposContrato, setTiposContrato] = useState<string[]>([]);
  const [sistemas, setSistemas] = useState<string[]>([]);

  const [items, setItems] = useState<ContratoEmpresaItem[]>([]);
  const [contratosFiltrados, setContratosFiltrados] = useState<
    ContratoEmpresaItem[]
  >([]);
  const [contratosResumo, setContratosResumo] = useState<ContratoEmpresaItem[]>(
    []
  );
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
  const [contratoEdicaoId, setContratoEdicaoId] = useState<number | null>(null);
  const [statusEdicaoModal, setStatusEdicaoModal] = useState<{
    tipo: "sucesso" | "erro";
    mensagem: string;
  } | null>(null);
  const [modalContatosAberta, setModalContatosAberta] = useState(false);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [erroContatos, setErroContatos] = useState("");
  const [contratoContatos, setContratoContatos] =
    useState<ContratoEmpresaItem | null>(null);
  const [contatosContrato, setContatosContrato] = useState<
    ContatoContratoItem[]
  >([]);

  const totaisContratos = useMemo(
    () => calcularTotaisContratos(contratosResumo),
    [contratosResumo]
  );

  function montarParamsBase(
    overrides: Partial<{
      status: string;
    }> = {}
  ): ConsultaContratosParams {
    const statusFiltro = overrides.status ?? status;

    return {
      NM_EMPRESA: empresa.trim() || undefined,
      NR_CNPJ: onlyCpfCnpjChars(cnpj) || undefined,
      NM_CIDADE: cidade.trim() || undefined,
      NM_TIPO_CONTRATO: tipoContrato.trim() || undefined,
      NM_SISTEMA_CONSIG: sistema.trim() || undefined,
      SN_ATIVO: statusFiltro === "" ? undefined : statusFiltro === "1" ? 1 : 0,
    };
  }

  async function carregarTodosContratos(params: ConsultaContratosParams) {
    const primeiraPagina = await consultarContratosEmpresas({
      ...params,
      page: 1,
      limit: 1,
    });
    const total = Number(primeiraPagina.total_items || 0);
    if (!total) return [];

    const response = await consultarContratosEmpresas({
      ...params,
      page: 1,
      limit: total,
    });

    return (response.items || []) as ContratoEmpresaItem[];
  }

  function aplicarPagina(
    lista: ContratoEmpresaItem[],
    page = 1,
    pageLimit = limit
  ) {
    const total = lista.length;
    const totalCalculado = Math.max(Math.ceil(total / pageLimit), 1);
    const paginaSegura = Math.min(Math.max(page, 1), totalCalculado);
    const inicio = (paginaSegura - 1) * pageLimit;

    setItems(lista.slice(inicio, inicio + pageLimit));
    setTotalItems(total);
    setTotalPages(totalCalculado);
    setCurrentPage(paginaSegura);
  }

  useEffect(() => {
    async function loadInicial() {
      try {
        const [cidadesResp, tiposResp, sistemasResp, contratosResumoResp] =
          await Promise.all([
            carregarCidadesContratoConsulta(),
            carregarTiposContratoConsulta(),
            carregarSistemasConsignadosConsulta(),
            carregarTodosContratos({}),
          ]);

        setCidades(cidadesResp || []);
        setTiposContrato(tiposResp || []);
        setSistemas(sistemasResp || []);
        setContratosResumo(contratosResumoResp || []);
      } catch (error: any) {
        console.error(error);
        setErro("Não foi possível carregar os filtros da consulta.");
      } finally {
        setLoadingInicial(false);
      }
    }

    loadInicial();
  }, []);

  async function buscar(page = 1) {
    if (loadingBuscar || buscarLockRef.current) return;

    try {
      setErro("");
      setInfo("");
      buscarLockRef.current = true;
      setLoadingBuscar(true);

      const contratos = await carregarTodosContratos(montarParamsBase());
      const filtrados = filtrarPorVencimento(contratos, filtroVencimento);

      setContratosFiltrados(filtrados);
      aplicarPagina(filtrados, page);

      if (!filtrados.length) {
        setInfo("Nenhum contrato encontrado para os filtros informados.");
      }
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Não foi possível consultar os contratos."
      );
    } finally {
      buscarLockRef.current = false;
      setLoadingBuscar(false);
    }
  }

  async function aplicarFiltroResumo(
    novoStatus: string,
    novoFiltroVencimento: FiltroVencimento
  ) {
    if (loadingBuscar || buscarLockRef.current) return;

    try {
      setErro("");
      setInfo("");
      setStatus(novoStatus);
      setFiltroVencimento(novoFiltroVencimento);
      buscarLockRef.current = true;
      setLoadingBuscar(true);

      const contratos = await carregarTodosContratos(
        montarParamsBase({ status: novoStatus })
      );
      const filtrados = filtrarPorVencimento(contratos, novoFiltroVencimento);

      setContratosFiltrados(filtrados);
      aplicarPagina(filtrados, 1);

      if (!filtrados.length) {
        setInfo("Nenhum contrato encontrado para o card selecionado.");
      }
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          "Não foi possível aplicar o filtro do resumo."
      );
    } finally {
      buscarLockRef.current = false;
      setLoadingBuscar(false);
    }
  }

  function limparFiltros() {
    setEmpresa("");
    setCnpj("");
    setCidade("");
    setTipoContrato("");
    setSistema("");
    setStatus("");
    setFiltroVencimento("");
    setContratosFiltrados(contratosResumo);
    aplicarPagina(contratosResumo, 1);
    setErro("");
    setInfo("");
  }

  function abrirCadastro() {
    router.push("/auth/cadastro_contrato");
  }

  function abrirEdicao(id: number) {
    setContratoEdicaoId(id);
    setStatusEdicaoModal(null);
    setModalEdicaoAberta(true);
  }

  function mudarPagina(page: number) {
    aplicarPagina(contratosFiltrados, page);
  }

  function alterarLimite(novoLimit: number) {
    setLimit(novoLimit);
    aplicarPagina(contratosFiltrados, 1, novoLimit);
  }

  async function abrirContatos(item: ContratoEmpresaItem) {
    if (loadingContatos || contatosLockRef.current) return;

    try {
      contatosLockRef.current = true;
      setContratoContatos(item);
      setContatosContrato([]);
      setErroContatos("");
      setModalContatosAberta(true);
      setLoadingContatos(true);

      const contatos = await listarContatosContratoConsulta(
        Number(item.ID_CONTRATOS_EMPRESAS)
      );
      setContatosContrato(contatos || []);
    } catch (error: any) {
      console.error(error);
      setErroContatos(
        error?.response?.data?.error ||
          "Não foi possível carregar os contatos deste contrato."
      );
    } finally {
      contatosLockRef.current = false;
      setLoadingContatos(false);
    }
  }

  function fecharModalContatos() {
    setModalContatosAberta(false);
    setContratoContatos(null);
    setContatosContrato([]);
    setErroContatos("");
  }

  async function baixarRelatorio() {
    if (loadingRelatorio || relatorioLockRef.current) return;

    try {
      setErro("");
      setInfo("");
      relatorioLockRef.current = true;
      setLoadingRelatorio(true);

      const contratos = await carregarTodosContratos(montarParamsBase());
      const lista = filtrarPorVencimento(contratos, filtroVencimento);

      setContratosFiltrados(lista);
      aplicarPagina(lista, 1);

      if (!lista.length) {
        setInfo("Nenhum contrato disponível para baixar com os filtros atuais.");
        return;
      }

      const linhas = [
        [
          "Empresa",
          "CPF/CNPJ",
          "Cidade",
          "Tipo de Convênio",
          "Prazo",
          "Sistema",
          "Conta Capital",
          "Início",
          "Fim",
          "Status",
          "Vencimento",
          "Observação",
        ],
        ...lista.map((item) => [
          item.NM_EMPRESA || "",
          formatCpfCnpj(item.NR_CNPJ || ""),
          item.NM_CIDADE || "",
          item.NM_TIPO_CONTRATO || "",
          item.NM_TIPO_TEMPO_CONTRATO || "",
          item.NM_SISTEMA_CONSIG || "",
          item.CD_CONTA_CAPITAL || "",
          formatDateBR(item.DT_INICIO),
          formatDateBR(item.DT_FIM) || "Indeterminado",
          isAtivo(item) ? "Ativo" : "Inativo",
          descricaoVencimento(item),
          item.OBS_CONTRATO || "",
        ]),
      ];

      baixarCsv("contratos_empresas.csv", linhas);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          "Não foi possível baixar o relatório de contratos."
      );
    } finally {
      relatorioLockRef.current = false;
      setLoadingRelatorio(false);
    }
  }

  function fecharModalEdicao() {
    setModalEdicaoAberta(false);
    setContratoEdicaoId(null);
    setStatusEdicaoModal(null);
  }

  async function handleSalvouEdicao() {
    if (atualizarEdicaoLockRef.current) return;

    try {
      atualizarEdicaoLockRef.current = true;
      await buscar(currentPage);
      const resumo = await carregarTodosContratos({});
      setContratosResumo(resumo);
      setStatusEdicaoModal({
        tipo: "sucesso",
        mensagem: "Edição salva com sucesso.",
      });
    } catch {
      setStatusEdicaoModal({
        tipo: "erro",
        mensagem: "Edição salva, mas não foi possível atualizar a lista agora.",
      });
    } finally {
      atualizarEdicaoLockRef.current = false;
    }
  }

  function handleResultadoEdicao(ok: boolean, mensagem: string) {
    setStatusEdicaoModal({
      tipo: ok ? "sucesso" : "erro",
      mensagem,
    });
  }

  useEffect(() => {
    if (!loadingInicial) {
      buscar(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingInicial]);

  if (loadingInicial) {
    return (
      <div className="mx-auto w-full max-w-225 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Carregando filtros e contratos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full min-w-225 space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#006f65] via-[#00AE9D] to-[#79B729]" />
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-[#00AE9D]/10 via-white to-[#C7D300]/15 p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Filtros da consulta
              </h2>
              <p className="text-sm font-medium text-slate-600">
                Use os filtros abaixo para localizar contratos cadastrados.
              </p>
            </div>

            <button
              type="button"
              onClick={abrirCadastro}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-secondary bg-secondary px-5 text-sm font-bold text-white shadow-sm transition hover:border-primary hover:bg-primary"
            >
              <FaPlus />
              Novo Contrato
            </button>
          </div>

          {(erro || info) && (
            <div className="mb-4">
              {erro ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {erro}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#00AE9D]/25 bg-[#00AE9D]/10 px-4 py-3 text-sm font-semibold text-[#006f65]">
                  {info}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <Field label="Razão Social">
                <input
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className={inputBase}
                />
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="CPF/CNPJ">
                <input
                  value={formatCpfCnpj(cnpj)}
                  onChange={(e) => setCnpj(onlyCpfCnpjChars(e.target.value).slice(0, 14))}
                  className={inputBase}
                  maxLength={18}
                />
              </Field>
            </div>

            <div className="md:col-span-5">
              <Field label="Cidade">
                <input
                  list="cidades-consulta-list"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className={inputBase}
                  placeholder="Selecione ou digite"
                />
                <datalist id="cidades-consulta-list">
                  {cidades.map((item, index) => (
                    <option key={`${item}-${index}`} value={item} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Tipo de Contrato">
                <input
                  list="tipos-consulta-list"
                  value={tipoContrato}
                  onChange={(e) => setTipoContrato(e.target.value)}
                  className={inputBase}
                  placeholder="Selecione ou digite"
                />
                <datalist id="tipos-consulta-list">
                  {tiposContrato.map((item, index) => (
                    <option key={`${item}-${index}`} value={item} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Sistema">
                <input
                  list="sistemas-consulta-list"
                  value={sistema}
                  onChange={(e) => setSistema(e.target.value)}
                  className={inputBase}
                  placeholder="Selecione ou digite"
                />
                <datalist id="sistemas-consulta-list">
                  {sistemas.map((item, index) => (
                    <option key={`${item}-${index}`} value={item} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputBase}
                >
                  <option value=""></option>
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Vencimento">
                <select
                  value={filtroVencimento}
                  onChange={(e) =>
                    setFiltroVencimento(e.target.value as FiltroVencimento)
                  }
                  className={inputBase}
                >
                  <option value="">Todos</option>
                  <option value="vencidos">Vencidos</option>
                  <option value="1-30">A vencer de 1 a 30 dias</option>
                  <option value="31-60">A vencer de 31 a 60 dias</option>
                  <option value="61-90">A vencer de 61 a 90 dias</option>
                  <option value="outros">Outros períodos</option>
                  <option value="sem_data">Sem data final</option>
                  <option value="inativos">Inativos</option>
                </select>
              </Field>
            </div>

            <div className="md:col-span-12">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => buscar(1)}
                  disabled={loadingBuscar || buscarLockRef.current}
                  aria-busy={loadingBuscar}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-secondary bg-secondary px-5 text-sm font-bold text-white shadow-sm transition hover:border-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSearch />
                  {loadingBuscar ? "Buscando..." : "Buscar"}
                </button>

                <button
                  type="button"
                  onClick={limparFiltros}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--text-darken-placeholder)] bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-fourth hover:text-fourth"
                >
                  Limpar
                </button>

                <button
                  type="button"
                  onClick={baixarRelatorio}
                  disabled={loadingBuscar || loadingRelatorio || relatorioLockRef.current}
                  aria-busy={loadingRelatorio}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-5 text-sm font-bold text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaDownload />
                  {loadingRelatorio ? "Baixando..." : "Baixar relatório"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <SummaryCard
            label="Total"
            value={totaisContratos.total}
            active={status === "" && filtroVencimento === ""}
            onClick={() => aplicarFiltroResumo("", "")}
          />
          <SummaryCard
            label="Ativos"
            value={totaisContratos.ativos}
            tone="emerald"
            active={status === "1" && filtroVencimento === ""}
            onClick={() => aplicarFiltroResumo("1", "")}
          />
          <SummaryCard
            label="Inativos"
            value={totaisContratos.inativos}
            tone="red"
            active={status === "0" && filtroVencimento === ""}
            onClick={() => aplicarFiltroResumo("0", "")}
          />
          <SummaryCard
            label="Ativos vencidos"
            value={totaisContratos.vencidos}
            tone="sky"
            active={status === "1" && filtroVencimento === "vencidos"}
            onClick={() => aplicarFiltroResumo("1", "vencidos")}
          />
          <SummaryCard
            label="Próx. 30 dias"
            value={totaisContratos.proximos}
            tone="amber"
            active={status === "1" && filtroVencimento === "1-30"}
            onClick={() => aplicarFiltroResumo("1", "1-30")}
          />
        </div>

        <Section title="Contratos encontrados">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhum contrato para exibir.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
                <table className="w-full min-w-[1180px] border-separate border-spacing-0 overflow-hidden rounded-2xl text-[13px]">
                  <thead>
                    <tr className="bg-slate-100 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-600">
                      <th className="border-b border-slate-200 px-3 py-2.5">Empresa</th>
                      <th className="border-b border-slate-200 px-3 py-2.5 whitespace-nowrap">CPF/CNPJ</th>
                      <th className="border-b border-slate-200 px-3 py-2.5">Cidade</th>
                      <th className="border-b border-slate-200 px-3 py-2.5 whitespace-nowrap">Tipo Convênio</th>
                      <th className="border-b border-slate-200 px-3 py-2.5 whitespace-nowrap">Prazo</th>
                      <th className="border-b border-slate-200 px-3 py-2.5 whitespace-nowrap">Conta Capital</th>
                      <th className="border-b border-slate-200 px-3 py-2.5">Sistema</th>
                      <th className="border-b border-slate-200 px-3 py-2.5 whitespace-nowrap">Início</th>
                      <th className="border-b border-slate-200 px-3 py-2.5 whitespace-nowrap">Fim</th>
                      <th className="border-b border-slate-200 px-3 py-2.5">Vencimento</th>
                      <th className="border-b border-slate-200 px-3 py-2.5 text-center whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white text-[13px] text-slate-700">
                    {items.map((item) => (
                      <tr
                        key={item.ID_CONTRATOS_EMPRESAS}
                        className={rowClassByVencimento(item)}
                      >
                        <td className="border-b border-slate-100 px-3 py-3 align-top">
                          {item.NM_EMPRESA || ""}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top whitespace-nowrap">
                          {formatCpfCnpjTabela(item.NR_CNPJ || "")}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top">
                          {item.NM_CIDADE || ""}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top">
                          {renderTipoConvenio(item.NM_TIPO_CONTRATO)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top whitespace-nowrap">
                          {item.NM_TIPO_TEMPO_CONTRATO || ""}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top whitespace-nowrap">
                          {item.CD_CONTA_CAPITAL || ""}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top">
                          {item.NM_SISTEMA_CONSIG || ""}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top whitespace-nowrap">
                          {formatDateBR(item.DT_INICIO)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top whitespace-nowrap">
                          {formatDateBR(item.DT_FIM) || "Indeterminado"}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top">
                          {descricaoVencimento(item)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-3 align-top">
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => abrirContatos(item)}
                              disabled={loadingContatos || contatosLockRef.current}
                              title="Ver contatos"
                              aria-label="Ver contatos"
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FaAddressBook size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEdicao(Number(item.ID_CONTRATOS_EMPRESAS))}
                              title="Editar contrato"
                              aria-label="Editar contrato"
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-secondary bg-secondary text-white shadow-sm transition hover:border-primary hover:bg-primary"
                            >
                              <FaEdit size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  limit={limit}
                  loading={loadingBuscar || loadingRelatorio}
                  onChange={mudarPagina}
                  onLimitChange={alterarLimite}
                />
              </div>
            </>
          )}
        </Section>
      </div>
      </div>

      {modalEdicaoAberta && contratoEdicaoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Editar Contrato
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Atualize os dados do contrato sem sair da consulta.
                </p>
                {statusEdicaoModal ? (
                  <div
                    className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-bold ${
                      statusEdicaoModal.tipo === "sucesso"
                        ? "border-[#00AE9D]/25 bg-[#00AE9D]/10 text-[#006f65]"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {statusEdicaoModal.mensagem}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={fecharModalEdicao}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-[var(--text-darken-placeholder)] bg-white text-slate-700 shadow-sm transition hover:border-fourth hover:text-fourth"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <CadastroContratoForm
                key={contratoEdicaoId}
                contratoIdProp={contratoEdicaoId}
                isModal
                onClose={fecharModalEdicao}
                onSaved={handleSalvouEdicao}
                onResult={handleResultadoEdicao}
              />
            </div>
          </div>
        </div>
      )}

      {modalContatosAberta && contratoContatos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Contatos do Convênio
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {contratoContatos.NM_EMPRESA || "Empresa"} -{" "}
                  {contratoContatos.NM_TIPO_CONTRATO || "Contrato"}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalContatos}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-[var(--text-darken-placeholder)] bg-white text-slate-700 shadow-sm transition hover:border-fourth hover:text-fourth"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {loadingContatos ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Carregando contatos...
                </div>
              ) : erroContatos ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {erroContatos}
                </div>
              ) : contatosContrato.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Nenhum contato cadastrado para este convênio.
                </div>
              ) : (
                <div className="grid gap-3">
                  {contatosContrato.map((contato, index) => (
                    <div
                      key={`${contato.ID_RH_CONTATO || index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-inner shadow-slate-100"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-slate-800">
                          Contato {index + 1}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                            Responsável
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {contato.NM_RESPONSAVEL || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                            Telefone
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {contato.NR_TELEFONE || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                            E-mail
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                            {contato.DESC_EMAIL || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 px-6 py-4 text-right">
              <button
                type="button"
                onClick={fecharModalContatos}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-2xl border border-[var(--text-darken-placeholder)] bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-fourth hover:text-fourth"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}