"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaEdit,
  FaEye,
  FaPlus,
  FaPrint,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import {
  buscarReciboFinanceiroPorId,
  excluirReciboFinanceiro,
  listarRecibosFinanceiros,
  type ReciboFinanceiroResponse,
  type ReciboFinanceiroResumo,
} from "@/services/consulta_recibo_financeiro.service";
import { gerarPdfReciboFinanceiro } from "@/lib/pdf/gerarPdfReciboFinanceiro";
import { SearchForm } from "@/components/ui/search-form";
import { SearchInput } from "@/components/ui/search-input";
import { SearchButton } from "@/components/ui/search-button";

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpfCnpj(value?: string | null) {
  const digits = onlyDigits(String(value || ""));

  if (!digits) return "";

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
      .slice(0, 14);
  }

  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDateBR(value?: string | null) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function formatMoneyBR(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function primeiroUltimoNome(nome?: string | null) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return "";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

const inputBase =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const textareaBase =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const buttonPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer";

const buttonSecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
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

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = "max-w-6xl",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div
        className={`relative flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConsultaReciboFinanceiroForm() {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [dia, setDia] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [loadingExcluir, setLoadingExcluir] = useState(false);

  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limite] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [lista, setLista] = useState<ReciboFinanceiroResumo[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [reciboSelecionado, setReciboSelecionado] =
    useState<ReciboFinanceiroResponse | null>(null);

  const totalParcelas = useMemo(
    () =>
      (reciboSelecionado?.PARCELAS || []).reduce(
        (acc, item) => acc + Number(item.VL_PARCELA_CRM || 0),
        0
      ),
    [reciboSelecionado]
  );

  const totalPagamentos = useMemo(
    () =>
      (reciboSelecionado?.PAGAMENTOS || []).reduce(
        (acc, item) => acc + Number(item.VL_PAGAMENTO || 0),
        0
      ),
    [reciboSelecionado]
  );

  async function buscarRecibos(page = 1) {
    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const response = await listarRecibosFinanceiros({
        page,
        limit: limite,
        nome: busca.trim(),
        dia,
      });

      setLista(response.items || []);
      setTotalItems(Number(response.total_items || 0));
      setTotalPages(Number(response.total_pages || 0));
      setPaginaAtual(Number(response.current_page || page));
    } catch (error: any) {
      console.error(error);
      setLista([]);
      setTotalItems(0);
      setTotalPages(0);
      setErro(
        error?.response?.data?.error || "Não foi possível consultar os recibos."
      );
    } finally {
      setLoading(false);
    }
  }

  function limparFiltros() {
    setBusca("");
    setDia("");
    setLista([]);
    setPaginaAtual(1);
    setTotalItems(0);
    setTotalPages(0);
    setErro("");
    setInfo("");
  }

  function irCadastro() {
    router.push("/auth/cadastro_recibo_financeiro");
  }

  async function abrirDetalhes(id: number) {
    try {
      setLoadingDetalhe(true);
      setErro("");
      const recibo = await buscarReciboFinanceiroPorId(id);
      setReciboSelecionado(recibo);
      setModalOpen(true);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
        "Não foi possível carregar os detalhes do recibo."
      );
    } finally {
      setLoadingDetalhe(false);
    }
  }

  function editarRecibo() {
    if (!reciboSelecionado?.ID_RECIBO_CRM) return;
    router.push(`/auth/cadastro_recibo_financeiro?id=${reciboSelecionado.ID_RECIBO_CRM}`);
  }

  async function excluirRecibo() {
    if (!reciboSelecionado?.ID_RECIBO_CRM) return;

    try {
      setLoadingExcluir(true);
      setErro("");
      await excluirReciboFinanceiro(reciboSelecionado.ID_RECIBO_CRM);
      setConfirmDeleteOpen(false);
      setModalOpen(false);
      setReciboSelecionado(null);
      setInfo("Recibo excluído com sucesso.");
      await buscarRecibos(paginaAtual);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error || "Não foi possível excluir o recibo."
      );
    } finally {
      setLoadingExcluir(false);
    }
  }

  async function imprimirRecibo(recibo: ReciboFinanceiroResponse) {
    await gerarPdfReciboFinanceiro(recibo);
  }

  function renderPaginacao() {
    if (!totalPages || totalPages <= 1) return null;

    const pages: number[] = [];
    const range = 2;
    const start = Math.max(1, paginaAtual - range);
    const end = Math.min(totalPages, paginaAtual + range);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {paginaAtual > 1 && (
          <>
            <button onClick={() => buscarRecibos(1)} className={buttonSecondary}>
              1
            </button>
            <button
              onClick={() => buscarRecibos(paginaAtual - 1)}
              className={buttonSecondary}
            >
              Anterior
            </button>
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => buscarRecibos(page)}
            className={
              page === paginaAtual
                ? `${buttonPrimary} min-w-[44px]`
                : `${buttonSecondary} min-w-[44px]`
            }
          >
            {page}
          </button>
        ))}

        {paginaAtual < totalPages && (
          <>
            <button
              onClick={() => buscarRecibos(paginaAtual + 1)}
              className={buttonSecondary}
            >
              Próxima
            </button>
            <button onClick={() => buscarRecibos(totalPages)} className={buttonSecondary}>
              {totalPages}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full min-w-225 space-y-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm sm:p-6 lg:p-8">
        <SearchForm onSearch={buscarRecibos}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Consulta Recibos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Localize recibos por nome, CPF/CNPJ, funcionário ou data.
                </p>
              </div>

              <button type="button" onClick={irCadastro} className={buttonSecondary}>
                <FaPlus />
                Cadastro de Recibos
              </button>
            </div>

            {(erro || info) && (
              <div className="mb-5">
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
              <div className="md:col-span-6">
                <Field label="Nome, CPF/CNPJ ou Funcionário">
                  <SearchInput
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && buscarRecibos(1)}
                    className={inputBase}
                    placeholder="Digite o nome, CPF/CNPJ ou funcionário"
                  />
                </Field>
              </div>

              <div className="md:col-span-3">
                <Field label="Dia">
                  <input
                    type="date"
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className={inputBase}
                  />
                </Field>
              </div>

              <div className="md:col-span-3">
                <Field label="Ações">
                  <div className="flex gap-2">
                    <SearchButton loading={loading} label="Pesquisar" />

                    <button type="button" onClick={limparFiltros} className={buttonSecondary}>
                      Limpar
                    </button>
                  </div>
                </Field>
              </div>
            </div>
          </div>

          <Section
            title="Recibos encontrados"
            subtitle="Visualize os detalhes, edite, exclua ou gere novamente o PDF."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                    <th className="border-b border-slate-200 px-4 py-3">CPF</th>
                    <th className="border-b border-slate-200 px-4 py-3">Dia</th>
                    <th className="border-b border-slate-200 px-4 py-3">Cidade</th>
                    <th className="border-b border-slate-200 px-4 py-3">Atendimento</th>
                    <th className="border-b border-slate-200 px-4 py-3">Funcionário</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center">Informações</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center">PDF</th>
                  </tr>
                </thead>

                <tbody className="bg-white text-sm text-slate-700">
                  {!loading && lista.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="border-b border-slate-100 px-4 py-8 text-center text-slate-400"
                      >
                        Nenhum recibo encontrado.
                      </td>
                    </tr>
                  ) : (
                    lista.map((recibo) => (
                      <tr
                        key={recibo.ID_RECIBO_CRM}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatCpfCnpj(recibo.NR_CPF_CNPJ)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatDateBR(recibo.DT_DIA)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">{recibo.CIDADE}</td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {recibo.TP_ATENDIMENTO}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {primeiroUltimoNome(recibo.NM_FUNCIONARIO)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => abrirDetalhes(recibo.ID_RECIBO_CRM)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
                          >
                            <FaEye size={13} />
                            Visualizar
                          </button>
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              const detalhe = await buscarReciboFinanceiroPorId(recibo.ID_RECIBO_CRM);
                              await imprimirRecibo(detalhe);
                            }}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-third px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-secondary cursor-pointer"
                          >
                            <FaPrint size={13} />
                            Gerar PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <Field label="Total">
                  <input
                    readOnly
                    value={String(totalItems)}
                    className={`${inputBase} bg-slate-50`}
                  />
                </Field>
              </div>
            </div>

            {renderPaginacao()}
          </Section>
        </SearchForm>
      </div>

      <ModalShell
        open={modalOpen}
        title="Recibo e pagamentos"
        subtitle={
          loadingDetalhe
            ? "Carregando detalhes..."
            : "Visualize todas as informações do recibo."
        }
        onClose={() => {
          setModalOpen(false);
          setReciboSelecionado(null);
        }}
      >
        {!reciboSelecionado ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <Field label="CPF/CNPJ">
                  <input
                    readOnly
                    value={formatCpfCnpj(reciboSelecionado.NR_CPF_CNPJ)}
                    className={`${inputBase} bg-slate-50`}
                  />
                </Field>
              </div>

              <div className="md:col-span-8">
                <Field label="Nome">
                  <input
                    readOnly
                    value={reciboSelecionado.NM_ASSOCIADO || ""}
                    className={`${inputBase} bg-slate-50`}
                  />
                </Field>
              </div>

              {onlyDigits(reciboSelecionado.NR_CPF_CNPJ).length !== 14 && (
                <>
                  <div className="md:col-span-4">
                    <Field label="Matrícula">
                      <input
                        readOnly
                        value={reciboSelecionado.NR_MATRICULA || ""}
                        className={`${inputBase} bg-slate-50`}
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-8">
                    <Field label="Empresa">
                      <input
                        readOnly
                        value={reciboSelecionado.NM_EMPRESA || ""}
                        className={`${inputBase} bg-slate-50`}
                      />
                    </Field>
                  </div>
                </>
              )}

              <div className="md:col-span-5">
                <Field label="Data Recibo">
                  <input
                    readOnly
                    value={reciboSelecionado.DT_DIA || ""}
                    className={`${inputBase} bg-slate-50`}
                  />
                </Field>
              </div>

              <div className="md:col-span-7">
                <Field label="Cidade de Atendimento">
                  <input
                    readOnly
                    value={reciboSelecionado.CIDADE || ""}
                    className={`${inputBase} bg-slate-50`}
                  />
                </Field>
              </div>

              <div className="md:col-span-12">
                <Field label="Observação">
                  <textarea
                    readOnly
                    value={reciboSelecionado.OBSERVACAO || ""}
                    className={`${textareaBase} bg-slate-50`}
                    rows={3}
                  />
                </Field>
              </div>
            </div>

            <Section title="Parcelas e valores">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                      <th className="border-b border-slate-200 px-4 py-3">Contrato</th>
                      <th className="border-b border-slate-200 px-4 py-3">Item Pagamento</th>
                      <th className="border-b border-slate-200 px-4 py-3">Quitação</th>
                      <th className="border-b border-slate-200 px-4 py-3">Data</th>
                      <th className="border-b border-slate-200 px-4 py-3">Parcela</th>
                      <th className="border-b border-slate-200 px-4 py-3">Valor</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white text-sm text-slate-700">
                    {(reciboSelecionado.PARCELAS || []).map((parcela, index) => (
                      <tr key={`${parcela.NR_CONTRATO}-${index}`}>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {parcela.NR_CONTRATO}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {parcela.NM_CATEGORIA}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {Number(parcela.SN_QUITACAO) === 1 ? "Sim" : "Não"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatDateBR(parcela.DT_PERIODO)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {parcela.NR_PARCELA}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatMoneyBR(Number(parcela.VL_PARCELA_CRM || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Field label="Total parcelas">
                    <input
                      readOnly
                      value={formatMoneyBR(totalParcelas)}
                      className={`${inputBase} bg-slate-50`}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <Section title="Forma de pagamento">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-[0.03em] text-slate-600">
                      <th className="border-b border-slate-200 px-4 py-3">Forma Pagamento</th>
                      <th className="border-b border-slate-200 px-4 py-3">Valor</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white text-sm text-slate-700">
                    {(reciboSelecionado.PAGAMENTOS || []).map((pagamento, index) => (
                      <tr key={`${pagamento.NM_FORMA_PAGAMENTO}-${index}`}>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {pagamento.NM_FORMA_PAGAMENTO}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          {formatMoneyBR(Number(pagamento.VL_PAGAMENTO || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Field label="Total pagamento">
                    <input
                      readOnly
                      value={formatMoneyBR(totalPagamentos)}
                      className={`${inputBase} bg-slate-50`}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={editarRecibo} className={buttonPrimary}>
                <FaEdit />
                Editar Recibo
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
              >
                <FaTrash />
                Excluir Recibo
              </button>

              <button
                type="button"
                onClick={() => imprimirRecibo(reciboSelecionado)}
                className={buttonSecondary}
              >
                <FaPrint />
                Gerar PDF
              </button>
            </div>
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={confirmDeleteOpen}
        title="Confirmar exclusão"
        subtitle="Essa ação não pode ser desfeita."
        onClose={() => setConfirmDeleteOpen(false)}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir este recibo?
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(false)}
              className={buttonSecondary}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={excluirRecibo}
              disabled={loadingExcluir}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaTrash />
              {loadingExcluir ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}