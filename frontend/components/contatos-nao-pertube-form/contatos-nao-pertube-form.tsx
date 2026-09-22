"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, type ReactNode } from "react";
import {
  FaBan,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEraser,
  FaHashtag,
  FaIdCard,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSearch,
  FaUser,
} from "react-icons/fa";
import {
  listarContatosNaoPertube,
  type ContatoNaoPertubeItem,
  type ContatosNaoPertubeParams,
} from "@/services/contatos_nao_pertube.service";

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function removerEspacoInicial(value: string) {
  return String(value || "").replace(/^\s+/, "");
}

function formatCpfCnpj(value?: string | null) {
  const digits = onlyDigits(String(value || "")).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value?: string | null) {
  const digits = onlyDigits(String(value || "")).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const [datePart, timePart = ""] = String(value).split(" ");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) return String(value);

  return `${day}/${month}/${year}${timePart ? ` ${timePart.slice(0, 5)}` : ""}`;
}

function emptyText(value?: string | null) {
  const text = String(value || "").trim();
  return text || "-";
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n|\r/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function baixarCsv(filename: string, rows: unknown[][]) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10";

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.03em] text-slate-600">
        {icon}
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
            contato(s)
          </p>

          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaChevronLeft />
            Anterior
          </button>

          <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Página {currentPage} de {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages || loading}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContatosNaoPertubeForm() {
  const [items, setItems] = useState<ContatoNaoPertubeItem[]>([]);
  const [q, setQ] = useState("");
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [pa, setPa] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cidade, setCidade] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [baixandoCsv, setBaixandoCsv] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  function montarParams(page = 1, limite = limit): ContatosNaoPertubeParams {
    return {
      q: q.trim() || undefined,
      nome: nome.trim() || undefined,
      cpfCnpj: onlyDigits(cpfCnpj) || undefined,
      contato: onlyDigits(contato) || undefined,
      pa: pa.trim() || undefined,
      empresa: empresa.trim() || undefined,
      cidade: cidade.trim() || undefined,
      page,
      limit: limite,
    };
  }

  async function carregarContatos(
    page = 1,
    paramsOverride?: ContatosNaoPertubeParams
  ) {
    try {
      setLoading(true);
      setErro("");
      setInfo("");

      const response = await listarContatosNaoPertube(
        paramsOverride || montarParams(page)
      );

      setItems(response.items || []);
      setTotalItems(Number(response.total_items || 0));
      setTotalPages(Number(response.total_pages || 1));
      setPaginaAtual(Number(response.current_page || page));

      if (!response.items?.length) {
        setInfo("Nenhum contato encontrado para os filtros informados.");
      }
    } catch (error: any) {
      console.error(error);
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setErro(
        error?.response?.data?.error ||
          error?.response?.data?.details ||
          "Não foi possível listar os contatos."
      );
    } finally {
      setLoading(false);
    }
  }

  function limparFiltros() {
    setQ("");
    setNome("");
    setCpfCnpj("");
    setContato("");
    setPa("");
    setEmpresa("");
    setCidade("");
    setErro("");
    setInfo("");
    setPaginaAtual(1);
    carregarContatos(1, { page: 1, limit });
  }

  async function baixarRelatorioCsv() {
    try {
      setBaixandoCsv(true);
      setErro("");
      setInfo("");

      const limiteCsv = 100;
      const primeiraPagina = await listarContatosNaoPertube(
        montarParams(1, limiteCsv)
      );
      const totalPaginasCsv = Math.max(
        Number(primeiraPagina.total_pages || 1),
        1
      );
      const registros = [...(primeiraPagina.items || [])];

      for (let pageCsv = 2; pageCsv <= totalPaginasCsv; pageCsv += 1) {
        const paginaData = await listarContatosNaoPertube(
          montarParams(pageCsv, limiteCsv)
        );
        registros.push(...(paginaData.items || []));
      }

      baixarCsv("contatos_nao_perturbe.csv", [
        [
          "Nome",
          "CPF/CNPJ",
          "Telefone",
          "PA",
          "Empresa",
          "Cidade",
          "Data de registro",
        ],
        ...registros.map((item) => [
          emptyText(item.NM_CONTATO),
          formatCpfCnpj(item.NR_CPF_CNPJ),
          formatPhone(item.NR_CONTATO),
          emptyText(item.NR_PA),
          emptyText(item.NM_EMPRESA),
          emptyText(item.CIDADE),
          formatDateBR(item.DIA_REGISTRO),
        ]),
      ]);

      setInfo(`${registros.length} contato(s) exportado(s) para CSV.`);
    } catch (error: any) {
      console.error(error);
      setErro(
        error?.response?.data?.error ||
          error?.response?.data?.details ||
          "Não foi possível baixar o relatório CSV."
      );
    } finally {
      setBaixandoCsv(false);
    }
  }

  useEffect(() => {
    carregarContatos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--title)] before:h-2 before:w-2 before:rounded-full before:bg-primary">
              Filtros da consulta
            </h2>
            <p className="mt-1 text-sm text-[var(--paragraph)]">
              Localize contatos cadastrados na lista de Não Perturbe do Blip.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-[#006f65]">
            <FaBan />
            {totalItems} contato(s)
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Field label="Pesquisa geral" icon={<FaSearch size={11} />}>
              <input
                value={q}
                onChange={(event) => setQ(removerEspacoInicial(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") carregarContatos(1);
                }}
                className={inputBase}
                placeholder="Nome, CPF/CNPJ, telefone, PA, empresa ou cidade"
              />
            </Field>
          </div>

          <div className="lg:col-span-3">
            <Field label="Nome" icon={<FaUser size={11} />}>
              <input
                value={nome}
                onChange={(event) => setNome(removerEspacoInicial(event.target.value))}
                className={inputBase}
                placeholder="Nome do contato"
              />
            </Field>
          </div>

          <div className="lg:col-span-3">
            <Field label="CPF/CNPJ" icon={<FaIdCard size={11} />}>
              <input
                value={cpfCnpj}
                onChange={(event) => setCpfCnpj(formatCpfCnpj(event.target.value))}
                className={inputBase}
                placeholder="CPF ou CNPJ"
              />
            </Field>
          </div>

          <div className="lg:col-span-3">
            <Field label="Telefone" icon={<FaPhoneAlt size={11} />}>
              <input
                value={contato}
                onChange={(event) => setContato(formatPhone(event.target.value))}
                className={inputBase}
                placeholder="Contato"
              />
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label="PA" icon={<FaHashtag size={11} />}>
              <input
                value={pa}
                onChange={(event) =>
                  setPa(onlyDigits(event.target.value).slice(0, 3))
                }
                className={inputBase}
                placeholder="Ex.: 431"
              />
            </Field>
          </div>

          <div className="lg:col-span-4">
            <Field label="Empresa" icon={<FaBuilding size={11} />}>
              <input
                value={empresa}
                onChange={(event) =>
                  setEmpresa(removerEspacoInicial(event.target.value))
                }
                className={inputBase}
                placeholder="Empresa"
              />
            </Field>
          </div>

          <div className="lg:col-span-3">
            <Field label="Cidade" icon={<FaMapMarkerAlt size={11} />}>
              <input
                value={cidade}
                onChange={(event) =>
                  setCidade(removerEspacoInicial(event.target.value))
                }
                className={inputBase}
                placeholder="Cidade"
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--text-darken-placeholder)] bg-white px-4 text-sm font-semibold text-[var(--title)] shadow-sm transition hover:border-primary hover:bg-primary/10"
          >
            <FaEraser />
            Limpar
          </button>

          <button
            type="button"
            onClick={() => carregarContatos(1)}
            disabled={loading}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSearch />
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {erro}
        </div>
      )}

      {info && !erro && (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-[#006f65]">
          {info}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-primary/20 bg-primary/10 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#006f65] before:h-2 before:w-2 before:rounded-full before:bg-primary">
            Contatos cadastrados
          </h3>
        </div>

        <div className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Total localizado:{" "}
              <strong className="text-slate-900">{totalItems}</strong>
            </div>

            <button
              type="button"
              onClick={baixarRelatorioCsv}
              disabled={baixandoCsv || loading || totalItems === 0}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaDownload size={13} />
              {baixandoCsv ? "Baixando..." : "Baixar CSV"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1050px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.03em] text-slate-600">
                  <th className="px-4 py-3 font-bold">Contato</th>
                  <th className="px-4 py-3 font-bold">CPF/CNPJ</th>
                  <th className="px-4 py-3 font-bold">Telefone</th>
                  <th className="px-4 py-3 font-bold">PA</th>
                  <th className="px-4 py-3 font-bold">Empresa</th>
                  <th className="px-4 py-3 font-bold">Cidade</th>
                  <th className="px-4 py-3 font-bold">Registro</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Carregando contatos...
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((item) => (
                    <tr
                      key={item.ID_CONTATO_BLIP_NAO_PERTUBE}
                      className="border-b border-slate-100 transition last:border-b-0 hover:bg-primary/5"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {emptyText(item.NM_CONTATO)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatCpfCnpj(item.NR_CPF_CNPJ) || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatPhone(item.NR_CONTATO) || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-[#006f65]">
                          {emptyText(item.NR_PA)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {emptyText(item.NM_EMPRESA)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {emptyText(item.CIDADE)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDateBR(item.DIA_REGISTRO)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Nenhum contato encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <Pagination
              currentPage={paginaAtual}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              loading={loading}
              onChange={carregarContatos}
              onLimitChange={(novoLimit) => {
                setLimit(novoLimit);
                carregarContatos(1, montarParams(1, novoLimit));
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
