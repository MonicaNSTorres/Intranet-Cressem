"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaAddressBook,
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

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

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
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-emerald-200 bg-linear-to-r from-[#79B729] to-[#8ED12F] px-5 py-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
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
      <label className="block text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition ${page === currentPage
              ? "bg-primary text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Próxima
      </button>
    </div>
  );
}

export function ConsultaContratosForm() {
  const router = useRouter();

  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

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

  const limit = 10;
  const totaisContratos = useMemo(
    () => calcularTotaisContratos(contratosResumo),
    [contratosResumo]
  );

  function montarParamsBase(): ConsultaContratosParams {
    return {
      NM_EMPRESA: empresa.trim() || undefined,
      NR_CNPJ: onlyCpfCnpjChars(cnpj) || undefined,
      NM_CIDADE: cidade.trim() || undefined,
      NM_TIPO_CONTRATO: tipoContrato.trim() || undefined,
      NM_SISTEMA_CONSIG: sistema.trim() || undefined,
      SN_ATIVO: status === "" ? undefined : status === "1" ? 1 : 0,
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

  function aplicarPagina(lista: ContratoEmpresaItem[], page = 1) {
    const total = lista.length;
    const totalCalculado = Math.max(Math.ceil(total / limit), 1);
    const paginaSegura = Math.min(Math.max(page, 1), totalCalculado);
    const inicio = (paginaSegura - 1) * limit;

    setItems(lista.slice(inicio, inicio + limit));
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
    try {
      setErro("");
      setInfo("");
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

  async function abrirContatos(item: ContratoEmpresaItem) {
    try {
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
    try {
      setErro("");
      setInfo("");
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
      setLoadingRelatorio(false);
    }
  }

  function fecharModalEdicao() {
    setModalEdicaoAberta(false);
    setContratoEdicaoId(null);
    setStatusEdicaoModal(null);
  }

  async function handleSalvouEdicao() {
    try {
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
        <p className="text-sm text-slate-500">Carregando filtros e contratos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full min-w-225 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Filtros da consulta
              </h2>
              <p className="text-sm text-slate-500">
                Use os filtros abaixo para localizar contratos cadastrados.
              </p>
            </div>

            <button
              type="button"
              onClick={abrirCadastro}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
            >
              <FaPlus />
              Novo Contrato
            </button>
          </div>

          {(erro || info) && (
            <div className="mb-4">
              {erro ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {erro}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
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
                  disabled={loadingBuscar}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSearch />
                  {loadingBuscar ? "Buscando..." : "Buscar"}
                </button>

                <button
                  type="button"
                  onClick={limparFiltros}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white cursor-pointer px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Limpar
                </button>

                <button
                  type="button"
                  onClick={baixarRelatorio}
                  disabled={loadingBuscar || loadingRelatorio}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaDownload />
                  {loadingRelatorio ? "Baixando..." : "Baixar relatório"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Section title="Contratos encontrados">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhum contrato para exibir.
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                  Ativo
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                  Próximo do vencimento
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-800">
                  Ativo vencido
                </span>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
                  Inativo
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[1180px] border-separate border-spacing-0 overflow-hidden rounded-2xl text-[13px]">
                  <thead>
                    <tr className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.03em] text-slate-600">
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
                          {formatCpfCnpj(item.NR_CNPJ || "")}
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
                              title="Ver contatos"
                              aria-label="Ver contatos"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 shadow-sm transition hover:bg-sky-100"
                            >
                              <FaAddressBook size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEdicao(Number(item.ID_CONTRATOS_EMPRESAS))}
                              title="Editar contrato"
                              aria-label="Editar contrato"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-white shadow-sm transition hover:bg-third cursor-pointer"
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
                  onChange={mudarPagina}
                />
              </div>
            </>
          )}
        </Section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {totaisContratos.total}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-emerald-700">
              Ativos
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {totaisContratos.ativos}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-red-700">
              Inativos
            </p>
            <p className="mt-1 text-2xl font-bold text-red-700">
              {totaisContratos.inativos}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-sky-700">
              Ativos vencidos
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-800">
              {totaisContratos.vencidos}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-amber-700">
              Próx. 30 dias
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-800">
              {totaisContratos.proximos}
            </p>
          </div>
        </div>
      </div>

      {modalEdicaoAberta && contratoEdicaoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Editar Contrato
                </h3>
                <p className="text-sm text-slate-500">
                  Atualize os dados do contrato sem sair da consulta.
                </p>
                {statusEdicaoModal ? (
                  <div
                    className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      statusEdicaoModal.tipo === "sucesso"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
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
          <div className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Contatos do Convênio
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {contratoContatos.NM_EMPRESA || "Empresa"} -{" "}
                  {contratoContatos.NM_TIPO_CONTRATO || "Contrato"}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalContatos}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
